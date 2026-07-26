/**
 * POST /api/generate-pdf
 * Body: LeaveFormData (JSON)
 * Response: application/pdf (the sick leave report)
 *
 * Generates a bilingual (Arabic/English) Sick Leave Report PDF that EXACTLY
 * matches the reference PDF (sickleave (2).pdf).
 *
 * Arabic text handling mirrors the Python bot's `pdf_generator_updated.py`:
 *   1. `arabicReshape()` — convert base letters to Presentation Forms
 *      (isolated/initial/medial/final) based on context. This makes letters
 *      connect properly in PDFKit (which doesn't ship HarfBuzz).
 *   2. `bidiGetDisplay()` — apply Unicode Bidirectional Algorithm to reorder
 *      characters for visual display.
 *
 * Together this reproduces Python's:
 *   reshaped = arabic_reshaper.reshape(text)
 *   bidi_text = get_display(reshaped)
 *
 * For pure Arabic text (labels, names): use processArabicText()
 * For mixed text (e.g. "1 يوم ( 2026-06-09 إلى 2026-06-09 )"): use safeArabicMixed()
 *   (same pipeline — bidi algorithm handles LTR runs correctly)
 */

import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import {
  LeaveFormData,
  DEFAULTS,
} from "@/lib/leave-form";
import {
  normalizeDateToDDMMYYYY,
  calculateDays,
  generateLeaveId,
  toISODate,
  toTimeDisplay,
} from "@/lib/parser";
import {
  processArabicText,
  safeArabicMixed,
} from "@/lib/arabic-text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Asset paths (resolved from project root at runtime) ---
const ROOT = process.cwd();
const FONT_AR_REG = path.join(ROOT, "public", "fonts", "NotoSansArabic-Regular.ttf");
const FONT_AR_BOLD = path.join(ROOT, "public", "fonts", "NotoSansArabic-Bold.ttf");
const SEHA_LOGO = path.join(ROOT, "public", "images", "seha-logo.jpg");
const KINGDOM_TEXT = path.join(ROOT, "public", "images", "kingdom-text.jpg");
const GEOMETRIC = path.join(ROOT, "public", "images", "geometric-shape.jpg");
const NATIONAL_INFO = path.join(ROOT, "public", "images", "national-health-info.jpg");

export interface ApiPayload {
  leaveNumber: string;
  idNumber: string;
  name: string;
  nameEn: string;
  reportDate: string;
  entryDate: string;
  exitDate: string;
  dayCount: number;
  doctor: string;
  doctorEn: string;
  jobTitle: string;
  jobTitleEn: string;
  employer: string;
  employerEn: string;
  nationality: string;
  nationalityEn: string;
  hospitalName: string;
  hospitalNameEn: string;
  licenseNumber: string;
  leaveType: string;
  time: string;
}

/**
 * Build the API payload (the same shape the Python bot sent to /api/bot/add_leave).
 */
export function buildApiPayload(data: LeaveFormData): ApiPayload {
  const filled: LeaveFormData = { ...DEFAULTS, ...data } as any;

  if (!filled.id_number) filled.id_number = DEFAULTS.id_number;
  if (!filled.patient_name_ar) filled.patient_name_ar = DEFAULTS.patient_name_ar;

  const leaveNumber = generateLeaveId(
    filled.id_number,
    filled.admission_date_gregorian,
    filled.discharge_date_gregorian,
  );
  const dayCount = calculateDays(
    filled.admission_date_gregorian,
    filled.discharge_date_gregorian,
  );
  const reportDate = toISODate(normalizeDateToDDMMYYYY(filled.admission_date_gregorian)) || toISODate(new Date().toISOString().slice(0, 10));
  const entryDate = toISODate(normalizeDateToDDMMYYYY(filled.admission_date_gregorian));
  const exitDate = toISODate(normalizeDateToDDMMYYYY(filled.discharge_date_gregorian));

  return {
    leaveNumber,
    idNumber: filled.id_number,
    name: filled.patient_name_ar,
    nameEn: filled.patient_name_en,
    reportDate,
    entryDate,
    exitDate,
    dayCount,
    doctor: filled.doctor_name_ar,
    doctorEn: filled.doctor_name_en,
    jobTitle: filled.position_ar,
    jobTitleEn: filled.position_en,
    employer: filled.employer_ar,
    employerEn: filled.employer_en,
    nationality: filled.nationality_ar,
    nationalityEn: filled.nationality_en,
    hospitalName: filled.hospital_name_ar,
    hospitalNameEn: filled.hospital_name_en,
    licenseNumber: filled.license_number,
    leaveType: "sick",
    time: toTimeDisplay(filled.time) || filled.time,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LeaveFormData;
    const payload = buildApiPayload(body);

    // ============================================================
    // PAGE SIZE — match reference PDF exactly (841.89 × 1187.72)
    // ============================================================
    const pageWidth = 841.89;
    const pageHeight = 1187.72;
    const doc = new PDFDocument({
      size: [pageWidth, pageHeight],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const arRegExists = fs.existsSync(FONT_AR_REG);
    const arBoldExists = fs.existsSync(FONT_AR_BOLD);
    const fontArReg = arRegExists ? FONT_AR_REG : "Helvetica";
    const fontArBold = arBoldExists ? FONT_AR_BOLD : "Helvetica-Bold";

    const fontEnReg = "Times-Roman";
    const fontEnBold = "Times-Bold";

    // Decode uploaded hospital logo (base64 data URL) into Buffer if present
    let uploadedLogoBuffer: Buffer | null = null;
    if (body.hospital_logo && typeof body.hospital_logo === "string") {
      const matches = body.hospital_logo.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches && matches[2]) {
        try {
          uploadedLogoBuffer = Buffer.from(matches[2], "base64");
        } catch {
          uploadedLogoBuffer = null;
        }
      }
    }

    // ============================================================
    // COLOR CONSTANTS — extracted from reference PDF via PyMuPDF
    // ============================================================
    const COLOR_TITLE_AR = "#306db5";
    const COLOR_TITLE_EN = "#2c3e77";
    const COLOR_LABEL = "#366fb5";
    const COLOR_VALUE_DARK = "#2c3e77";
    const COLOR_DURATION_BG = "#2b3d77";
    const COLOR_ALT_ROW_BG = "#f6f6f6";
    const COLOR_BORDER = "#d9d9d9";
    const COLOR_WHITE = "#ffffff";
    const COLOR_BLACK = "#000000";
    const COLOR_LINK = "#0000ff";

    // ============================================================
    // TEXT RENDERERS
    // ============================================================

    /**
     * Render PURE Arabic text — mirrors Python's process_arabic_text():
     *   reshaped = arabic_reshaper.reshape(text)
     *   bidi_text = get_display(reshaped)
     *
     * The output is in VISUAL order with presentation forms, ready to render
     * directly in PDFKit without pdfkit doing its own BiDi.
     *
     * IMPORTANT: pdfkit splits text at space characters and processes each
     * run separately. For Arabic, this causes incorrect word order because
     * each run is reversed but the runs are positioned left-to-right.
     *
     * Fix: replace regular spaces (U+0020) with non-breaking spaces (U+00A0)
     * so pdfkit treats the entire text as a single run. The non-breaking space
     * is rendered as a regular space visually.
     *
     * To prevent pdfkit's internal BiDi (which would double-reverse visual-
     * order text and produce garbage):
     *   - Use `align: "center"` or `align: "left"` (NOT "right" — triggers RTL)
     *   - Use `lineBreak: false`
     *   - Do NOT use `features: ["rtla"]`
     */
    const drawTextAr = (text: string, x: number, y: number, options: any = {}) => {
      const fontToUse = options.weight === "bold" ? fontArBold : fontArReg;
      if (options.fontSize) doc.fontSize(options.fontSize);
      if (options.color) doc.fillColor(options.color);

      // Process Arabic text: reshape + bidi → visual order
      const processed = processArabicText(text);
      // Replace spaces with non-breaking spaces to prevent pdfkit run splitting
      const withNbsp = processed.replace(/ /g, "\u00A0");
      // Force align to center or left (avoid "right" which triggers RTL bidi)
      const userAlign = options.align || "center";
      const safeAlign = userAlign === "right" ? "center" : userAlign;
      const opts: any = { lineBreak: false, ...options, align: safeAlign };
      doc.font(fontToUse).text(withNbsp, x, y, opts);
    };

    const drawTextEn = (text: string, x: number, y: number, options: any = {}) => {
      const fontToUse = options.weight === "bold" ? fontEnBold : fontEnReg;
      if (options.fontSize) doc.fontSize(options.fontSize);
      if (options.color) doc.fillColor(options.color);
      doc.font(fontToUse).text(text, x, y, options);
    };

    /**
     * Render MIXED Arabic + Latin/digits text — mirrors Python's safe_arabic_mixed():
     * same pipeline as processArabicText but the bidi algorithm correctly
     * handles LTR runs (digits, Latin letters, brackets) within RTL context.
     */
    const drawTextMixed = (text: string, x: number, y: number, options: any = {}) => {
      const fontToUse = options.weight === "bold" ? fontArBold : fontArReg;
      if (options.fontSize) doc.fontSize(options.fontSize);
      if (options.color) doc.fillColor(options.color);

      const processed = safeArabicMixed(text);
      const opts: any = { align: "right", lineBreak: false, ...options };
      doc.font(fontToUse).text(processed, x, y, opts);
    };

    // ============================================================
    // HEADER LOGOS — exact positions from reference PDF
    // Seha:    x=31,  y=34, w=159
    // Kingdom: x=283, y=37, w=266
    // Geometric: x=541, y=34, w=266
    // ============================================================
    if (fs.existsSync(SEHA_LOGO)) doc.image(SEHA_LOGO, 31, 34, { width: 159 });
    if (fs.existsSync(KINGDOM_TEXT)) doc.image(KINGDOM_TEXT, 283, 37, { width: 266 });
    if (fs.existsSync(GEOMETRIC)) doc.image(GEOMETRIC, 541, 34, { width: 266 });

    // ============================================================
    // TITLE — Arabic at y=152, English at y=192
    // Arabic: NotoSansArabicBold, 22pt, #306db5
    // English: Times-Bold, 18pt, #2c3e77
    // ============================================================
    drawTextAr("تقرير إجازة مرضية", 0, 152, {
      align: "center",
      weight: "bold",
      fontSize: 22,
      color: COLOR_TITLE_AR,
      width: pageWidth,
    });
    drawTextEn("Sick Leave Report", 0, 192, {
      align: "center",
      weight: "bold",
      fontSize: 18,
      color: COLOR_TITLE_EN,
      width: pageWidth,
    });

    // ============================================================
    // TABLE — 4 columns, 11 rows, fixed height 42.5pt
    // Column X boundaries: 35, 200, 435, 670, 806
    // Column widths:       165, 235, 235, 136
    // Row Y boundaries:    241, 283.5, 326, 368.5, 411, 453.5,
    //                      496, 538.5, 581, 623.5, 666, 708.5
    // Border: #d9d9d9, width 1.4
    // Font size: 13pt for all cells
    // ============================================================
    const COL_X = [35, 200, 435, 670, 806];
    const COL_W = [COL_X[1] - COL_X[0], COL_X[2] - COL_X[1], COL_X[3] - COL_X[2], COL_X[4] - COL_X[3]];
    const TABLE_LEFT = COL_X[0];
    const TABLE_RIGHT = COL_X[4];
    const TABLE_WIDTH = TABLE_RIGHT - TABLE_LEFT;
    const ROW_H = 42.5;
    const TABLE_TOP = 241;
    const CELL_FONT_SIZE = 13;
    const BORDER_WIDTH = 1.4;

    let currentY = TABLE_TOP;

    /**
     * Draw a single 4-column row with fixed height and proper borders.
     * Layout: [En label | En value | Ar value | Ar label]
     */
    const drawRow = (
      labelEn: string,
      valueEn: string,
      valueAr: string,
      labelAr: string,
      bgColor: string | null = null,
      textColor: string = COLOR_VALUE_DARK,
      labelColor: string = COLOR_LABEL,
    ) => {
      const y = currentY;

      if (bgColor) {
        doc.save();
        doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).fill(bgColor);
        doc.restore();
      }

      doc.lineWidth(BORDER_WIDTH).strokeColor(COLOR_BORDER);
      doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).stroke();
      doc.moveTo(COL_X[1], y).lineTo(COL_X[1], y + ROW_H).stroke();
      doc.moveTo(COL_X[2], y).lineTo(COL_X[2], y + ROW_H).stroke();
      doc.moveTo(COL_X[3], y).lineTo(COL_X[3], y + ROW_H).stroke();

      // --- Col 1: English label (centered) ---
      doc.font(fontEnBold).fontSize(CELL_FONT_SIZE).fillColor(labelColor);
      const lblEnH = doc.heightOfString(labelEn, { width: COL_W[0] - 20 });
      const lblEnY = y + (ROW_H - lblEnH) / 2;
      drawTextEn(labelEn, COL_X[0] + 10, lblEnY, {
        width: COL_W[0] - 20,
        align: "center",
        weight: "bold",
        fontSize: CELL_FONT_SIZE,
        color: labelColor,
      });

      // --- Col 2: English value (centered) ---
      doc.font(fontEnReg).fontSize(CELL_FONT_SIZE).fillColor(textColor);
      const valEnH = doc.heightOfString(valueEn || "-", { width: COL_W[1] - 20 });
      const valEnY = y + (ROW_H - valEnH) / 2;
      drawTextEn(valueEn || "-", COL_X[1] + 10, valEnY, {
        width: COL_W[1] - 20,
        align: "center",
        fontSize: CELL_FONT_SIZE,
        color: textColor,
      });

      // --- Col 3: Arabic value (centered) ---
      // Use Arabic font + reshape + bidi for Arabic text.
      // For dates and IDs (Latin digits only), use Times-Roman directly.
      const cleanArText = String(valueAr || "").replace(/[^0-9A-Za-z\-/]/g, "").trim();
      const isArValueLatinOnly = cleanArText.length > 0 && /^[0-9A-Za-z\-/]+$/.test(cleanArText);

      if (isArValueLatinOnly) {
        // Value is Latin digits/letters (date, ID) — use Times-Roman
        doc.font(fontEnReg).fontSize(CELL_FONT_SIZE).fillColor(textColor);
        const valArH = doc.heightOfString(valueAr || "-", { width: COL_W[2] - 20 });
        const valArY = y + (ROW_H - valArH) / 2;
        drawTextEn(valueAr || "-", COL_X[2] + 10, valArY, {
          width: COL_W[2] - 20,
          align: "center",
          fontSize: CELL_FONT_SIZE,
          color: textColor,
        });
      } else {
        // Value contains Arabic — use NotoSansArabic + reshape + bidi
        // Replace spaces with NBSP to prevent pdfkit run splitting
        doc.font(fontArReg).fontSize(CELL_FONT_SIZE).fillColor(textColor);
        const processed = processArabicText(valueAr || "");
        const withNbsp = processed.replace(/ /g, "\u00A0");
        const valArH = doc.heightOfString(withNbsp || "-", { width: COL_W[2] - 20 });
        const valArY = y + (ROW_H - valArH) / 2;
        if (withNbsp) {
          doc.text(withNbsp, COL_X[2] + 10, valArY, {
            width: COL_W[2] - 20,
            align: "center",
            lineBreak: false,
          });
        }
      }

      // --- Col 4: Arabic label (centered, bold) ---
      doc.font(fontArBold).fontSize(CELL_FONT_SIZE).fillColor(labelColor);
      const processedLbl = processArabicText(labelAr);
      const lblArH = doc.heightOfString(processedLbl, { width: COL_W[3] - 20 });
      const lblArY = y + (ROW_H - lblArH) / 2;
      drawTextAr(labelAr, COL_X[3] + 10, lblArY, {
        width: COL_W[3] - 20,
        align: "center",
        weight: "bold",
        fontSize: CELL_FONT_SIZE,
        color: labelColor,
      });

      currentY += ROW_H;
    };

    // --- Row 1: Leave ID (white bg) ---
    drawRow("Leave ID", payload.leaveNumber, payload.leaveNumber, "رمز الإجازة");

    // --- Row 2: Leave Duration (dark navy bg #2b3d77, white text) ---
    {
      const y = currentY;
      const startDateFormatted = normalizeDateToDDMMYYYY(payload.entryDate);
      const endDateFormatted = normalizeDateToDDMMYYYY(payload.exitDate);

      // Arabic duration word — always use "يوم" after the number
      // (no "يومان" or "أيام") and put the number first (right side in RTL)
      const getArabicDuration = (count: number) => {
        return `${count} يوم`;
      };
      const durText = getArabicDuration(payload.dayCount);
      const enDuration = `${payload.dayCount} day ( ${startDateFormatted} to ${endDateFormatted} )`;

      // Convert DD-MM-YYYY to YYYY-MM-DD for Arabic version (matches Python bot)
      const toArabicDate = (ddmmyyyy: string) => {
        const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmyyyy);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        return ddmmyyyy;
      };
      const startDateAr = toArabicDate(startDateFormatted);
      const endDateAr = toArabicDate(endDateFormatted);
      const arDuration = `${durText} ( ${startDateAr} إلى ${endDateAr} )`;

      // Fill background #2b3d77
      doc.save();
      doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).fill(COLOR_DURATION_BG);
      doc.restore();

      // Borders
      doc.lineWidth(BORDER_WIDTH).strokeColor(COLOR_BORDER);
      doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).stroke();
      doc.moveTo(COL_X[1], y).lineTo(COL_X[1], y + ROW_H).stroke();
      doc.moveTo(COL_X[2], y).lineTo(COL_X[2], y + ROW_H).stroke();
      doc.moveTo(COL_X[3], y).lineTo(COL_X[3], y + ROW_H).stroke();

      // Col 1: "Leave Duration" (Times-Bold, white)
      doc.font(fontEnBold).fontSize(CELL_FONT_SIZE).fillColor(COLOR_WHITE);
      const lblEnH = doc.heightOfString("Leave Duration", { width: COL_W[0] - 20 });
      const lblEnY = y + (ROW_H - lblEnH) / 2;
      drawTextEn("Leave Duration", COL_X[0] + 10, lblEnY, {
        width: COL_W[0] - 20,
        align: "center",
        weight: "bold",
        fontSize: CELL_FONT_SIZE,
        color: COLOR_WHITE,
      });

      // Col 2: English duration value (Times-Roman, white)
      let enFontSize = CELL_FONT_SIZE;
      for (let fs = enFontSize; fs >= 9; fs--) {
        doc.font(fontEnReg).fontSize(fs);
        if (doc.widthOfString(enDuration) <= COL_W[1] - 20) {
          enFontSize = fs;
          break;
        }
        if (fs === 9) { enFontSize = 9; break; }
      }
      doc.font(fontEnReg).fontSize(enFontSize).fillColor(COLOR_WHITE);
      const valEnH = doc.heightOfString(enDuration, { width: COL_W[1] - 20 });
      const valEnY = y + (ROW_H - valEnH) / 2;
      drawTextEn(enDuration, COL_X[1] + 10, valEnY, {
        width: COL_W[1] - 20,
        align: "center",
        fontSize: enFontSize,
        color: COLOR_WHITE,
      });

      // Col 3: Arabic duration value (mixed Arabic + digits) — use safeArabicMixed
      // Replace spaces with NBSP to prevent pdfkit run splitting
      let arFontSize = CELL_FONT_SIZE;
      const processedArDuration = safeArabicMixed(arDuration);
      const arDurationNbsp = processedArDuration.replace(/ /g, "\u00A0");
      for (let fs = arFontSize; fs >= 9; fs--) {
        doc.font(fontArReg).fontSize(fs);
        if (doc.widthOfString(arDurationNbsp) <= COL_W[2] - 20) {
          arFontSize = fs;
          break;
        }
        if (fs === 9) { arFontSize = 9; break; }
      }
      doc.font(fontArReg).fontSize(arFontSize).fillColor(COLOR_WHITE);
      const valArH = doc.currentLineHeight(true);
      const valArY = y + (ROW_H - valArH) / 2;
      doc.text(arDurationNbsp, COL_X[2] + 10, valArY, {
        width: COL_W[2] - 20,
        align: "center",
        lineBreak: false,
      });

      // Col 4: "مدة الإجازة" (NotoSansArabicBold, white)
      doc.font(fontArBold).fontSize(CELL_FONT_SIZE).fillColor(COLOR_WHITE);
      const lblArH = doc.heightOfString(processArabicText("مدة الإجازة"), { width: COL_W[3] - 20 });
      const lblArY = y + (ROW_H - lblArH) / 2;
      drawTextAr("مدة الإجازة", COL_X[3] + 10, lblArY, {
        width: COL_W[3] - 20,
        align: "center",
        weight: "bold",
        fontSize: CELL_FONT_SIZE,
        color: COLOR_WHITE,
      });

      currentY += ROW_H;
    }

    // --- Row 3: Admission Date (white bg) ---
    {
      const startDateFormatted = normalizeDateToDDMMYYYY(payload.entryDate);
      drawRow("Admission Date", startDateFormatted, startDateFormatted, "تاريخ الدخول");
    }

    // --- Row 4: Discharge Date (light grey bg #f6f6f6) ---
    {
      const endDateFormatted = normalizeDateToDDMMYYYY(payload.exitDate);
      drawRow("Discharge Date", endDateFormatted, endDateFormatted, "تاريخ الخروج", COLOR_ALT_ROW_BG);
    }

    // --- Row 5: Issue Date (white bg) ---
    {
      const issueDate = normalizeDateToDDMMYYYY(payload.entryDate);
      drawRow("Issue Date", issueDate, issueDate, "تاريخ إصدار التقرير");
    }

    // --- Row 6: Name (light grey bg) ---
    drawRow("Name", payload.nameEn || "-", payload.name || "-", "الاسم", COLOR_ALT_ROW_BG);

    // --- Row 7: National ID / Iqama (white bg) ---
    drawRow("National ID / Iqama", payload.idNumber, payload.idNumber, "رقم الهوية / الإقامة");

    // --- Row 8: Nationality (light grey bg) ---
    drawRow("Nationality", payload.nationalityEn || "-", payload.nationality || "-", "الجنسية", COLOR_ALT_ROW_BG);

    // --- Row 9: Employer (white bg) ---
    const emptyIndicators = new Set(["", "غير محدد", "فارغ", "-", "None", "none", "null", "NULL", "Not Specified", "N/A", "n/a", "undefined"]);
    const employerAr = emptyIndicators.has((payload.employer || "").trim()) ? " " : payload.employer;
    const employerEn = emptyIndicators.has((payload.employerEn || "").trim()) ? " " : payload.employerEn;
    drawRow("Employer", employerEn || " ", employerAr || " ", "جهة العمل");

    // --- Row 10: Practitioner Name (light grey bg) ---
    drawRow("Practitioner Name", payload.doctorEn || "-", payload.doctor || "-", "اسم الممارس", COLOR_ALT_ROW_BG);

    // --- Row 11: Position (white bg) ---
    drawRow("Position", payload.jobTitleEn || "-", payload.jobTitle || "-", "المسمى الوظيفي");

    // ============================================================
    // FOOTER — divider at x=435
    // Left half (35..435):  QR code + verification text + URL link
    // Right half (435..806): Hospital logo + Arabic name + English name + license
    // ============================================================
    const FOOTER_DIVIDER_X = 435;
    const FOOTER_TOP = 714;
    const FOOTER_BOTTOM = 950;

    // Vertical divider line
    doc.lineWidth(BORDER_WIDTH).strokeColor(COLOR_BORDER);
    doc.moveTo(FOOTER_DIVIDER_X, FOOTER_TOP).lineTo(FOOTER_DIVIDER_X, FOOTER_BOTTOM).stroke();

    // --- LEFT HALF: QR code + verification text ---
    // Build the inquiry URL once — used both for the QR code AND the clickable link
    const inquiryUrl = `https://almoqeesehh.vercel.app/inquiries/slenquiry?gsl=${encodeURIComponent(payload.leaveNumber)}&id=${encodeURIComponent(payload.idNumber)}`;

    // QR code at x=170, y=743, width=119
    // QR data now contains the actual inquiry URL (so scanning it with a phone
    // opens the inquiry page directly), matching the user's request:
    // "اريد اصلاحه ينقلني للاستعلامات"
    try {
      const qrImage = await QRCode.toDataURL(inquiryUrl, { width: 470, margin: 0 });
      doc.image(qrImage, 170, 743, { width: 119 });
      // Make the QR code itself clickable in the PDF (so clicking it on desktop
      // also navigates to the inquiry page)
      doc.link(170, 743, 119, 119, inquiryUrl);
    } catch (e) {
      // ignore QR errors
    }

    // Arabic verification text — two lines
    drawTextAr(
      "للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة",
      35,
      871,
      {
        width: 400,
        align: "center",
        weight: "bold",
        fontSize: 10,
        color: COLOR_BLACK,
      },
    );
    drawTextAr(
      "الرسمي",
      35,
      888,
      {
        width: 400,
        align: "center",
        weight: "bold",
        fontSize: 10,
        color: COLOR_BLACK,
      },
    );

    // English verification text (size 9, Times-Bold)
    drawTextEn(
      "To check the report please visit Seha's official website",
      35,
      909,
      {
        width: 400,
        align: "center",
        weight: "bold",
        fontSize: 9,
        color: COLOR_BLACK,
      },
    );

    // URL link (size 11, Times-Bold, blue #0000ff, underlined)
    // Display the actual inquiry URL (so the visible text matches where the
    // link will navigate) and add an explicit `doc.link()` rectangle over
    // the whole line so the link works reliably in every PDF viewer
    // (Adobe Acrobat, browser viewers, mobile, etc.) — matching the user's
    // request: "اريد اصلاحه ينقلني للاستعلامات"
    doc.fillColor(COLOR_LINK).font(fontEnBold).fontSize(11);
    doc.text(inquiryUrl, 35, 924, {
      width: 400,
      align: "center",
      link: inquiryUrl,
      underline: true,
    });
    // Explicit link rectangle over the entire URL line area — guarantees
    // clickability even in PDF viewers that ignore the text-run link option
    doc.link(35, 924, 400, 18, inquiryUrl);

    // --- RIGHT HALF: Hospital logo + name + license ---
    // Hospital logo at x=575, y=746, width=122
    if (uploadedLogoBuffer) {
      try {
        doc.image(uploadedLogoBuffer, 575, 746, { width: 122 });
      } catch {
        // ignore image errors
      }
    }

    // Arabic hospital name at y=866 (size 12, NotoSansArabicBold, black)
    drawTextAr(
      payload.hospitalName || "",
      435,
      866,
      {
        width: 371,
        align: "center",
        weight: "bold",
        fontSize: 12,
        color: COLOR_BLACK,
      },
    );

    // English hospital name at y=898 (size 12, Times-Bold, black)
    drawTextEn(
      payload.hospitalNameEn || "",
      435,
      898,
      {
        width: 371,
        align: "center",
        weight: "bold",
        fontSize: 12,
        color: COLOR_BLACK,
      },
    );

    // License number at y=930 (if present) — uses safeArabicMixed
    // Format mirrors Python bot: "رقم الترخيص : {license_value}"
    // Replace spaces with NBSP to prevent pdfkit run splitting
    const hasLicense = !!(payload.licenseNumber && !emptyIndicators.has(payload.licenseNumber.trim()));
    if (hasLicense) {
      const licenseLine = `رقم الترخيص : ${payload.licenseNumber}`;
      const processedLine = safeArabicMixed(licenseLine);
      const withNbsp = processedLine.replace(/ /g, "\u00A0");
      doc.font(fontArBold).fontSize(12).fillColor(COLOR_BLACK);
      const lineW = doc.widthOfString(withNbsp);
      const startX = 435 + (371 - lineW) / 2;
      doc.text(withNbsp, startX, 930, {
        align: "left",
        lineBreak: false,
      });
    }

    // ============================================================
    // BOTTOM STRIP — Time + Date on left, National Info logo on right
    // Time at x=34, y=961 (size 12, Times-Bold, black)
    // Date at x=34, y=983 (size 12, Times-Bold, black)
    // National Info logo at x=655, y=952, width=153
    // ============================================================
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = payload.time || now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    drawTextEn(timeStr, 34, 961, {
      fontSize: 12,
      color: COLOR_BLACK,
      weight: "bold",
    });
    drawTextEn(dateStr, 34, 983, {
      fontSize: 12,
      color: COLOR_BLACK,
      weight: "bold",
    });

    if (fs.existsSync(NATIONAL_INFO)) {
      doc.image(NATIONAL_INFO, 655, 952, { width: 153 });
    }

    doc.end();

    const chunks: Buffer[] = [];
    for await (const chunk of doc) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="sick_leave_${payload.leaveNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[generate-pdf] Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "PDF generation failed" },
      { status: 500 },
    );
  }
}
