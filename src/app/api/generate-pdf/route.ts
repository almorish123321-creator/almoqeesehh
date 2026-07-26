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
     * Render Arabic text using the v2 pipeline (fontkit-driven shaping).
     *
     * processArabicText() does:
     *   1. bidi → visual word order (each word's characters are reversed)
     *   2. split on whitespace, reverse each word → words back in logical
     *      order, but WORD ORDER is visual
     *
     * fontkit's ArabicShaper then applies GSUB features (init/medi/fina/liga)
     * on each word to produce presentation forms, and reverses the glyphs
     * (because RTL) so each word renders in correct visual order.
     *
     * IMPORTANT: Replace spaces with NBSP before calling doc.text() so PDFKit
     * treats the whole string as ONE run and doesn't split it on spaces and
     * process each word separately. PDFKit's space-splitting would lose the
     * visual word order we established.
     *
     * Use `align: "center"` or `align: "left"` (NOT "right" — pdfkit's
     * align:"right" assumes LTR text and computes width wrong for Arabic).
     * Use `lineBreak: false` to prevent auto-wrapping.
     */
    const drawTextAr = (text: string, x: number, y: number, options: any = {}) => {
      const fontToUse = options.weight === "bold" ? fontArBold : fontArReg;
      if (options.fontSize) doc.fontSize(options.fontSize);
      if (options.color) doc.fillColor(options.color);

      // Process Arabic text: bidi → reverse each word → ready for fontkit
      const processed = processArabicText(text);
      // Replace ASCII spaces with NBSP to prevent pdfkit run splitting
      const withNbsp = processed.replace(/ /g, "\u00A0");
      // Force align to center or left (avoid "right" which pdfkit mishandles)
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
     * Render MIXED Arabic + Latin/digits text — same pipeline as drawTextAr
     * (safeArabicMixed === processArabicText). The bidi algorithm handles
     * LTR runs (digits, Latin letters, brackets) correctly within RTL context.
     *
     * We replace ASCII spaces with NBSP to prevent pdfkit from splitting on
     * spaces and losing the visual word order we established.
     */
    const drawTextMixed = (text: string, x: number, y: number, options: any = {}) => {
      const fontToUse = options.weight === "bold" ? fontArBold : fontArReg;
      if (options.fontSize) doc.fontSize(options.fontSize);
      if (options.color) doc.fillColor(options.color);

      const processed = safeArabicMixed(text);
      const withNbsp = processed.replace(/ /g, "\u00A0");
      const userAlign = options.align || "center";
      const safeAlign = userAlign === "right" ? "center" : userAlign;
      const opts: any = { lineBreak: false, ...options, align: safeAlign };
      doc.font(fontToUse).text(withNbsp, x, y, opts);
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
      // Use Arabic font + fontkit-driven shaping for Arabic text.
      // For dates and IDs (Latin digits only), use Times-Roman directly
      // (avoids fontkit's RTL reversal flipping digits inside dates).
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
        // Value contains Arabic — use NotoSansArabic.
        // processArabicText replaces ASCII spaces with NBSP so PDFKit treats
        // the whole string as one run; fontkit then shapes via GSUB and
        // reverses glyphs (RTL) to produce correct visual order.
        doc.font(fontArReg).fontSize(CELL_FONT_SIZE).fillColor(textColor);
        const withNbsp = processArabicText(valueAr || "");
        if (withNbsp) {
          const valArH = doc.heightOfString(withNbsp, { width: COL_W[2] - 20 });
          const valArY = y + (ROW_H - valArH) / 2;
          doc.text(withNbsp, COL_X[2] + 10, valArY, {
            width: COL_W[2] - 20,
            align: "center",
            lineBreak: false,
          });
        }
      }

      // --- Col 4: Arabic label (centered, bold) ---
      // Use drawTextAr which handles NBSP + fontkit shaping + RTL reversal.
      // We compute height with the processed (NBSP) text for accurate centering.
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
      //
      // IMPORTANT BIDI WORKAROUND:
      // Mixing Arabic letters and Latin digits in a single PDFKit text()
      // call causes PDFKit's internal bidi to reverse digit runs in
      // unpredictable ways. Instead of fighting bidi, we render the Arabic
      // duration as SEPARATE text() calls at fixed X positions:
      //   - "( " + start_date + " إلى " + end_date + " )" on the LEFT half
      //     of the cell (Arabic text rendered via processArabicText which
      //     applies arabicReshape + bidiGetDisplay — but since this part is
      //     pure Arabic + digits, the digit runs come out correct).
      //   - "1 يوم" on the RIGHT half of the cell.
      //
      // Wait — that still has the same problem. The real solution is to
      // render each piece at its own X coordinate so PDFKit's bidi never
      // sees mixed content in a single text() call:
      //   Position 1 (left):  "( 2026-06-09 إلى 2026-06-09 )"
      //   Position 2 (right): "1 يوم"
      const getArabicDuration = (count: number) => {
        return `${count} يوم`;
      };
      // Note: durText is not used directly — the number and "يوم" are rendered
      // as separate text() calls below to avoid PDFKit bidi issues.
      void getArabicDuration; // suppress unused warning
      const enDuration = `${payload.dayCount} day ( ${startDateFormatted} to ${endDateFormatted} )`;

      // Convert DD-MM-YYYY to YYYY-MM-DD for Arabic version (matches Python bot)
      const toArabicDate = (ddmmyyyy: string) => {
        const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(ddmmyyyy);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        return ddmmyyyy;
      };
      const startDateAr = toArabicDate(startDateFormatted);
      const endDateAr = toArabicDate(endDateFormatted);

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

      // Col 3: Arabic duration value — render as MULTIPLE SEPARATE text()
      // calls to fully control visual layout and avoid fontkit reversing
      // digits inside dates (fontkit's blanket RTL reverse flips everything
      // in a run, including digits — that would garble "2026-06-15" into
      // "51-60-6202").
      //
      // Layout (visually, left-to-right in the cell):
      //   ┌──────────────────────────────────────────────────┐
      //   │  ( 2026-06-09 إلى 2026-06-15 )    1 يوم         │
      //   └──────────────────────────────────────────────────┘
      //   ←—— dates part (5 sub-parts) ——→  ←— number part —→
      //
      // Each sub-part is rendered with its OWN doc.text() call:
      //   - Latin/digit parts (parens, dates, count) → fontEnReg (Times-Roman),
      //     rendered LTR as-is, no fontkit RTL reversal because script=latn
      //   - Arabic parts ("إلى", "يوم") → fontArReg (NotoSansArabic),
      //     fontkit detects script=arab → applies GSUB shaping → reverses glyphs
      //     so the visual order is correct
      const cellX = COL_X[2] + 10;
      const cellW = COL_W[2] - 20;
      const cellY = y;
      const cellH = ROW_H;

      let arFontSize = CELL_FONT_SIZE;
      const openParen = "(";
      const closeParen = ")";
      const date1Str = startDateAr; // "2026-06-09" (Latin only)
      const date2Str = endDateAr;   // "2026-06-15" (Latin only)
      const arabicIla = "إلى";       // Arabic word (fontkit will shape it)
      const arabicYawm = "يوم";      // Arabic word (fontkit will shape it)
      const numStr = String(payload.dayCount); // "1"

      // Find a font size where all parts fit within the cell width.
      // Use fontEnReg for Latin/digit parts, fontArReg for Arabic parts.
      const gap = 3; // pt gap between sub-parts
      const computeTotalWidth = (fs: number) => {
        doc.font(fontArReg).fontSize(fs);
        const wIla = doc.widthOfString(arabicIla);
        const wYawm = doc.widthOfString(arabicYawm);
        doc.font(fontEnReg).fontSize(fs);
        return (
          doc.widthOfString(openParen) +
          doc.widthOfString(date1Str) +
          wIla +
          doc.widthOfString(date2Str) +
          doc.widthOfString(closeParen) +
          gap * 4 +
          gap * 2 +
          doc.widthOfString(numStr) +
          wYawm +
          gap
        );
      };
      for (let fs = arFontSize; fs >= 8; fs--) {
        if (computeTotalWidth(fs) <= cellW) {
          arFontSize = fs;
          break;
        }
        if (fs === 8) { arFontSize = 8; break; }
      }
      doc.font(fontArReg).fontSize(arFontSize).fillColor(COLOR_WHITE);

      // Compute widths at the chosen font size
      const wParen = doc.widthOfString(openParen);
      // For date strings and num, use the same font size with fontEnReg
      doc.font(fontEnReg).fontSize(arFontSize);
      const wDate1 = doc.widthOfString(date1Str);
      const wDate2 = doc.widthOfString(date2Str);
      const wCloseParen = doc.widthOfString(closeParen);
      const wNum = doc.widthOfString(numStr);
      doc.font(fontArReg).fontSize(arFontSize);
      const wIla = doc.widthOfString(arabicIla);
      const wYawm = doc.widthOfString(arabicYawm);

      // Total widths
      const datesGroupW = wParen + wDate1 + wIla + wDate2 + wCloseParen + gap * 4;
      const numberGroupW = wNum + wYawm + gap;
      const totalW = datesGroupW + gap * 2 + numberGroupW;
      const startX = cellX + (cellW - totalW) / 2; // center the whole thing

      // Compute X positions for each sub-part (left-to-right visual order)
      let cursorX = startX;
      const xOpenParen = cursorX;       cursorX += wParen + gap;
      const xDate1 = cursorX;            cursorX += wDate1 + gap;
      const xIla = cursorX;              cursorX += wIla + gap;
      const xDate2 = cursorX;            cursorX += wDate2 + gap;
      const xCloseParen = cursorX;       cursorX += wCloseParen + gap * 2;
      const xNum = cursorX;              cursorX += wNum + gap;
      const xYawm = cursorX;

      const valArH = doc.currentLineHeight(true);
      const valArY = cellY + (cellH - valArH) / 2;

      // Render each sub-part as a separate text() call.
      // Latin/digit parts use fontEnReg (Times-Roman) — LTR, no reversal.
      // Arabic parts use fontArReg (NotoSansArabic) — fontkit shapes via GSUB
      // and reverses glyphs (RTL) so the visual order is correct.
      doc.font(fontEnReg).fontSize(arFontSize).fillColor(COLOR_WHITE);
      doc.text(openParen, xOpenParen, valArY, { align: "left", lineBreak: false });
      doc.text(date1Str, xDate1, valArY, { align: "left", lineBreak: false });
      doc.font(fontArReg).fontSize(arFontSize).fillColor(COLOR_WHITE);
      doc.text(arabicIla, xIla, valArY, { align: "left", lineBreak: false });
      doc.font(fontEnReg).fontSize(arFontSize).fillColor(COLOR_WHITE);
      doc.text(date2Str, xDate2, valArY, { align: "left", lineBreak: false });
      doc.text(closeParen, xCloseParen, valArY, { align: "left", lineBreak: false });
      doc.text(numStr, xNum, valArY, { align: "left", lineBreak: false });
      doc.font(fontArReg).fontSize(arFontSize).fillColor(COLOR_WHITE);
      doc.text(arabicYawm, xYawm, valArY, { align: "left", lineBreak: false });

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
    // Build TWO URLs:
    //   - qrUrl: the short inquiry URL (no query params) — encoded into the QR
    //     code so scanning it just opens the inquiry page (matching the user's
    //     request: "الباركود عن مسحه يطلع يكون هذا الرابط حق الاستعلامات
    //     https://almoqeesehh.vercel.app/inquiries/slenquiry")
    //   - clickUrl: the inquiry URL WITH gsl+id params — used for clickable
    //     links inside the PDF so clicking them pre-fills the form and runs
    //     the query automatically
    const qrUrl = "https://almoqeesehh.vercel.app/inquiries/slenquiry";
    const clickUrl = `${qrUrl}?gsl=${encodeURIComponent(payload.leaveNumber)}&id=${encodeURIComponent(payload.idNumber)}`;

    // QR code at x=170, y=743, width=119
    // QR data contains the short inquiry URL (so scanning it opens the
    // inquiry page), matching the user's request:
    // "الباركود عن مسحه يطلع يكون هذا الرابط حق الاستعلامات"
    try {
      const qrImage = await QRCode.toDataURL(qrUrl, { width: 470, margin: 0 });
      doc.image(qrImage, 170, 743, { width: 119 });
      // Make the QR code itself clickable in the PDF — opens the inquiry
      // page (with gsl+id pre-filled so the query runs automatically)
      doc.link(170, 743, 119, 119, clickUrl);
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
    // Display the short inquiry URL as the visible text (matching the
    // user's request to show "https://almoqeesehh.vercel.app/inquiries/slenquiry"
    // in the PDF) but link it to clickUrl (which has gsl+id params) so
    // clicking it pre-fills the form and runs the query automatically.
    // Also add an explicit `doc.link()` rectangle over the whole line so
    // the link works reliably in every PDF viewer.
    doc.fillColor(COLOR_LINK).font(fontEnBold).fontSize(11);
    doc.text(qrUrl, 35, 924, {
      width: 400,
      align: "center",
      link: clickUrl,
      underline: true,
    });
    // Explicit link rectangle over the entire URL line area — guarantees
    // clickability even in PDF viewers that ignore the text-run link option
    doc.link(35, 924, 400, 18, clickUrl);

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

    // License number at y=930 (if present).
    // Format mirrors Python bot: "رقم الترخيص : {license_value}"
    //
    // We split the line into two parts and render each separately:
    //   - "رقم الترخيص :" → fontArBold (Arabic) — fontkit shapes + reverses glyphs
    //   - "{license_value}" (digits) → fontEnReg (Times-Roman) — LTR, no reversal
    // This avoids fontkit's blanket RTL reverse flipping the digits.
    const hasLicense = !!(payload.licenseNumber && !emptyIndicators.has(payload.licenseNumber.trim()));
    if (hasLicense) {
      const labelPart = "رقم الترخيص :";
      const numPart = String(payload.licenseNumber);
      const gap = 4; // pt gap between label and number

      doc.font(fontArBold).fontSize(12);
      const labelW = doc.widthOfString(processArabicText(labelPart));
      doc.font(fontEnReg).fontSize(12);
      const numW = doc.widthOfString(numPart);

      const totalW = labelW + gap + numW;
      const startX = 435 + (371 - totalW) / 2;

      const valArH = doc.currentLineHeight(true);
      const valArY = 930 + (12 - valArH) / 2; // approximate vertical centering

      // Render Arabic label (fontkit will shape + reverse glyphs → visual order)
      doc.font(fontArBold).fontSize(12).fillColor(COLOR_BLACK);
      doc.text(processArabicText(labelPart), startX, valArY, {
        align: "left",
        lineBreak: false,
      });

      // Render digits (LTR, no reversal)
      doc.font(fontEnReg).fontSize(12).fillColor(COLOR_BLACK);
      doc.text(numPart, startX + labelW + gap, valArY, {
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
