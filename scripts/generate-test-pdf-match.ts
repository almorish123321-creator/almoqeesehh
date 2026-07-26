/**
 * Generate a test PDF locally (without running Next.js) and save it for visual comparison.
 * Uses the same logic as /api/generate-pdf/route.ts but with hardcoded test data
 * matching the reference PDF (sickleave (2).pdf).
 */

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import {
  processArabicText,
  safeArabicMixed,
} from "../src/lib/arabic-text";

const ROOT = "/home/z/my-project";
const FONT_AR_REG = path.join(ROOT, "public", "fonts", "NotoSansArabic-Regular.ttf");
const FONT_AR_BOLD = path.join(ROOT, "public", "fonts", "NotoSansArabic-Bold.ttf");
const SEHA_LOGO = path.join(ROOT, "public", "images", "seha-logo.jpg");
const KINGDOM_TEXT = path.join(ROOT, "public", "images", "kingdom-text.jpg");
const GEOMETRIC = path.join(ROOT, "public", "images", "geometric-shape.jpg");
const NATIONAL_INFO = path.join(ROOT, "public", "images", "national-health-info.jpg");

// Test data — extracted from reference PDF
const payload = {
  leaveNumber: "GSL20260269259",
  idNumber: "1152609259",
  name: "تالين مريم عوض القحطاني",
  nameEn: "TALIN MARIE AWAD AL-QAHTANI",
  entryDate: "2026-06-09",
  exitDate: "2026-06-09",
  dayCount: 1,
  doctor: "عبد الله بن محمد القحطاني",
  doctorEn: "ABDULLAH BIN MOHAMMED AL-QAHTANI",
  jobTitle: "طبيب عام",
  jobTitleEn: "General",
  employer: "طالبة",
  employerEn: " ",
  nationality: "السعودية",
  nationalityEn: "Saudi Arabia",
  hospitalName: "مستشفى الأطباء المتحدون",
  hospitalNameEn: "United Doctors Hospital",
  licenseNumber: "",
  time: "07:50 AM",
};

async function generate() {
  const pageWidth = 841.89;
  const pageHeight = 1187.72;
  const doc = new PDFDocument({
    size: [pageWidth, pageHeight],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  const fontArReg = FONT_AR_REG;
  const fontArBold = FONT_AR_BOLD;
  const fontEnReg = "Times-Roman";
  const fontEnBold = "Times-Bold";

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

  const drawTextAr = (text: string, x: number, y: number, options: any = {}) => {
    const fontToUse = options.weight === "bold" ? fontArBold : fontArReg;
    if (options.fontSize) doc.fontSize(options.fontSize);
    if (options.color) doc.fillColor(options.color);
    const processed = processArabicText(text);
    // Replace spaces with non-breaking spaces to prevent pdfkit run splitting
    const withNbsp = processed.replace(/ /g, "\u00A0");
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

  // HEADER LOGOS
  if (fs.existsSync(SEHA_LOGO)) doc.image(SEHA_LOGO, 31, 34, { width: 159 });
  if (fs.existsSync(KINGDOM_TEXT)) doc.image(KINGDOM_TEXT, 283, 37, { width: 266 });
  if (fs.existsSync(GEOMETRIC)) doc.image(GEOMETRIC, 541, 34, { width: 266 });

  // TITLE
  drawTextAr("تقرير إجازة مرضية", 0, 152, {
    align: "center", weight: "bold", fontSize: 22, color: COLOR_TITLE_AR, width: pageWidth,
  });
  drawTextEn("Sick Leave Report", 0, 192, {
    align: "center", weight: "bold", fontSize: 18, color: COLOR_TITLE_EN, width: pageWidth,
  });

  // TABLE
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

  const drawRow = (
    labelEn: string, valueEn: string, valueAr: string, labelAr: string,
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

    doc.font(fontEnBold).fontSize(CELL_FONT_SIZE).fillColor(labelColor);
    const lblEnH = doc.heightOfString(labelEn, { width: COL_W[0] - 20 });
    const lblEnY = y + (ROW_H - lblEnH) / 2;
    drawTextEn(labelEn, COL_X[0] + 10, lblEnY, {
      width: COL_W[0] - 20, align: "center", weight: "bold", fontSize: CELL_FONT_SIZE, color: labelColor,
    });

    doc.font(fontEnReg).fontSize(CELL_FONT_SIZE).fillColor(textColor);
    const valEnH = doc.heightOfString(valueEn || "-", { width: COL_W[1] - 20 });
    const valEnY = y + (ROW_H - valEnH) / 2;
    drawTextEn(valueEn || "-", COL_X[1] + 10, valEnY, {
      width: COL_W[1] - 20, align: "center", fontSize: CELL_FONT_SIZE, color: textColor,
    });

    const cleanArText = String(valueAr || "").replace(/[^0-9A-Za-z\-/]/g, "").trim();
    const isArValueLatinOnly = cleanArText.length > 0 && /^[0-9A-Za-z\-/]+$/.test(cleanArText);
    if (isArValueLatinOnly) {
      doc.font(fontEnReg).fontSize(CELL_FONT_SIZE).fillColor(textColor);
      const valArH = doc.heightOfString(valueAr || "-", { width: COL_W[2] - 20 });
      const valArY = y + (ROW_H - valArH) / 2;
      drawTextEn(valueAr || "-", COL_X[2] + 10, valArY, {
        width: COL_W[2] - 20, align: "center", fontSize: CELL_FONT_SIZE, color: textColor,
      });
    } else {
      doc.font(fontArReg).fontSize(CELL_FONT_SIZE).fillColor(textColor);
      const processed = processArabicText(valueAr || "");
      const withNbsp = processed.replace(/ /g, "\u00A0");
      const valArH = doc.heightOfString(withNbsp || "-", { width: COL_W[2] - 20 });
      const valArY = y + (ROW_H - valArH) / 2;
      if (withNbsp) {
        doc.text(withNbsp, COL_X[2] + 10, valArY, {
          width: COL_W[2] - 20, align: "center", lineBreak: false,
        });
      }
    }

    doc.font(fontArBold).fontSize(CELL_FONT_SIZE).fillColor(labelColor);
    const processedLbl = processArabicText(labelAr);
    const lblArH = doc.heightOfString(processedLbl, { width: COL_W[3] - 20 });
    const lblArY = y + (ROW_H - lblArH) / 2;
    drawTextAr(labelAr, COL_X[3] + 10, lblArY, {
      width: COL_W[3] - 20, align: "center", weight: "bold", fontSize: CELL_FONT_SIZE, color: labelColor,
    });

    currentY += ROW_H;
  };

  // Row 1: Leave ID
  drawRow("Leave ID", payload.leaveNumber, payload.leaveNumber, "رمز الإجازة");

  // Row 2: Duration
  {
    const y = currentY;
    const startDateFormatted = "09-06-2026";
    const endDateFormatted = "09-06-2026";
    const durText = "يوم 1";
    const enDuration = `1 day ( ${startDateFormatted} to ${endDateFormatted} )`;
    const startDateAr = "2026-06-09";
    const endDateAr = "2026-06-09";
    const arDuration = `${durText} ( ${startDateAr} إلى ${endDateAr} )`;

    doc.save();
    doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).fill(COLOR_DURATION_BG);
    doc.restore();
    doc.lineWidth(BORDER_WIDTH).strokeColor(COLOR_BORDER);
    doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).stroke();
    doc.moveTo(COL_X[1], y).lineTo(COL_X[1], y + ROW_H).stroke();
    doc.moveTo(COL_X[2], y).lineTo(COL_X[2], y + ROW_H).stroke();
    doc.moveTo(COL_X[3], y).lineTo(COL_X[3], y + ROW_H).stroke();

    doc.font(fontEnBold).fontSize(CELL_FONT_SIZE).fillColor(COLOR_WHITE);
    const lblEnH = doc.heightOfString("Leave Duration", { width: COL_W[0] - 20 });
    const lblEnY = y + (ROW_H - lblEnH) / 2;
    drawTextEn("Leave Duration", COL_X[0] + 10, lblEnY, {
      width: COL_W[0] - 20, align: "center", weight: "bold", fontSize: CELL_FONT_SIZE, color: COLOR_WHITE,
    });

    let enFontSize = CELL_FONT_SIZE;
    for (let fs = enFontSize; fs >= 9; fs--) {
      doc.font(fontEnReg).fontSize(fs);
      if (doc.widthOfString(enDuration) <= COL_W[1] - 20) { enFontSize = fs; break; }
      if (fs === 9) { enFontSize = 9; break; }
    }
    doc.font(fontEnReg).fontSize(enFontSize).fillColor(COLOR_WHITE);
    const valEnH = doc.heightOfString(enDuration, { width: COL_W[1] - 20 });
    const valEnY = y + (ROW_H - valEnH) / 2;
    drawTextEn(enDuration, COL_X[1] + 10, valEnY, {
      width: COL_W[1] - 20, align: "center", fontSize: enFontSize, color: COLOR_WHITE,
    });

    let arFontSize = CELL_FONT_SIZE;
    const processedArDuration = safeArabicMixed(arDuration);
    const arDurationNbsp = processedArDuration.replace(/ /g, "\u00A0");
    for (let fs = arFontSize; fs >= 9; fs--) {
      doc.font(fontArReg).fontSize(fs);
      if (doc.widthOfString(arDurationNbsp) <= COL_W[2] - 20) { arFontSize = fs; break; }
      if (fs === 9) { arFontSize = 9; break; }
    }
    doc.font(fontArReg).fontSize(arFontSize).fillColor(COLOR_WHITE);
    const valArH = doc.currentLineHeight(true);
    const valArY = y + (ROW_H - valArH) / 2;
    doc.text(arDurationNbsp, COL_X[2] + 10, valArY, {
      width: COL_W[2] - 20, align: "center", lineBreak: false,
    });

    doc.font(fontArBold).fontSize(CELL_FONT_SIZE).fillColor(COLOR_WHITE);
    const lblArH = doc.heightOfString(processArabicText("مدة الإجازة"), { width: COL_W[3] - 20 });
    const lblArY = y + (ROW_H - lblArH) / 2;
    drawTextAr("مدة الإجازة", COL_X[3] + 10, lblArY, {
      width: COL_W[3] - 20, align: "center", weight: "bold", fontSize: CELL_FONT_SIZE, color: COLOR_WHITE,
    });

    currentY += ROW_H;
  }

  // Rows 3-11
  drawRow("Admission Date", "09-06-2026", "09-06-2026", "تاريخ الدخول");
  drawRow("Discharge Date", "09-06-2026", "09-06-2026", "تاريخ الخروج", COLOR_ALT_ROW_BG);
  drawRow("Issue Date", "09-06-2026", "09-06-2026", "تاريخ إصدار التقرير");
  drawRow("Name", payload.nameEn, payload.name, "الاسم", COLOR_ALT_ROW_BG);
  drawRow("National ID / Iqama", payload.idNumber, payload.idNumber, "رقم الهوية / الإقامة");
  drawRow("Nationality", payload.nationalityEn, payload.nationality, "الجنسية", COLOR_ALT_ROW_BG);
  drawRow("Employer", payload.employerEn || " ", payload.employer || " ", "جهة العمل");
  drawRow("Practitioner Name", payload.doctorEn, payload.doctor, "اسم الممارس", COLOR_ALT_ROW_BG);
  drawRow("Position", payload.jobTitleEn, payload.jobTitle, "المسمى الوظيفي");

  // FOOTER
  const FOOTER_DIVIDER_X = 435;
  const FOOTER_TOP = 714;
  const FOOTER_BOTTOM = 950;
  doc.lineWidth(BORDER_WIDTH).strokeColor(COLOR_BORDER);
  doc.moveTo(FOOTER_DIVIDER_X, FOOTER_TOP).lineTo(FOOTER_DIVIDER_X, FOOTER_BOTTOM).stroke();

  // QR code
  try {
    const qrData = `${payload.idNumber} - ${payload.leaveNumber} - 09-06-2026`;
    const qrImage = await QRCode.toDataURL(qrData, { width: 470, margin: 0 });
    doc.image(qrImage, 170, 743, { width: 119 });
  } catch (e) {}

  drawTextAr("للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة", 35, 871, {
    width: 400, align: "center", weight: "bold", fontSize: 10, color: COLOR_BLACK,
  });
  drawTextAr("الرسمي", 35, 888, {
    width: 400, align: "center", weight: "bold", fontSize: 10, color: COLOR_BLACK,
  });
  drawTextEn("To check the report please visit Seha's official website", 35, 909, {
    width: 400, align: "center", weight: "bold", fontSize: 9, color: COLOR_BLACK,
  });
  const inquiryUrl = `https://almoqeesehh.vercel.app/inquiries/slenquiry?gsl=${encodeURIComponent(payload.leaveNumber)}&id=${encodeURIComponent(payload.idNumber)}`;
  doc.fillColor(COLOR_LINK).font(fontEnBold).fontSize(11);
  doc.text("www.seha.sa/#/inquiries/slenquiry", 35, 924, {
    width: 400, align: "center",
    link: inquiryUrl,
    underline: true,
  });

  // Hospital name (right half)
  drawTextAr(payload.hospitalName, 435, 866, {
    width: 371, align: "center", weight: "bold", fontSize: 12, color: COLOR_BLACK,
  });
  drawTextEn(payload.hospitalNameEn, 435, 898, {
    width: 371, align: "center", weight: "bold", fontSize: 12, color: COLOR_BLACK,
  });

  // Bottom strip
  drawTextEn(payload.time, 34, 961, { fontSize: 12, color: COLOR_BLACK, weight: "bold" });
  drawTextEn("Wednesday, 17 June 2026", 34, 983, { fontSize: 12, color: COLOR_BLACK, weight: "bold" });
  if (fs.existsSync(NATIONAL_INFO)) {
    doc.image(NATIONAL_INFO, 655, 952, { width: 153 });
  }

  doc.end();

  const chunks: Buffer[] = [];
  for await (const chunk of doc) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const pdfBuffer = Buffer.concat(chunks);
  const outPath = "/home/z/my-project/download/test-generated.pdf";
  fs.writeFileSync(outPath, pdfBuffer);
  console.log(`Generated: ${outPath} (${pdfBuffer.length} bytes)`);
}

generate().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
