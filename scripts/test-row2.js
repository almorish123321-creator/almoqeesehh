// More accurate test: replicate the route.ts logic for Row 2 (Leave Duration)
// and verify that the date-splitting approach works correctly.

const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

function processArabicText(text) {
  if (!text) return "";
  return text.replace(/ /g, "\u00A0");
}

const ROOT = "/home/z/my-project";
const FONT_AR_REG = path.join(ROOT, "public", "fonts", "NotoSansArabic-Regular.ttf");
const FONT_AR_BOLD = path.join(ROOT, "public", "fonts", "NotoSansArabic-Bold.ttf");
const FONT_EN_REG = "Times-Roman";
const FONT_EN_BOLD = "Times-Bold";

const doc = new PDFDocument({
  size: [841.89, 1187.72],
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
});

const outPath = "/home/z/my-project/download/test-row2.pdf";
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

// Replicate drawTextAr from route.ts
function drawTextAr(text, x, y, options = {}) {
  const fontToUse = options.weight === "bold" ? FONT_AR_BOLD : FONT_AR_REG;
  if (options.fontSize) doc.fontSize(options.fontSize);
  if (options.color) doc.fillColor(options.color);
  const processed = processArabicText(text);
  const withNbsp = processed.replace(/ /g, "\u00A0");
  const userAlign = options.align || "center";
  const safeAlign = userAlign === "right" ? "center" : userAlign;
  const opts = { lineBreak: false, ...options, align: safeAlign };
  doc.font(fontToUse).text(withNbsp, x, y, opts);
}

function drawTextEn(text, x, y, options = {}) {
  const fontToUse = options.weight === "bold" ? FONT_EN_BOLD : FONT_EN_REG;
  if (options.fontSize) doc.fontSize(options.fontSize);
  if (options.color) doc.fillColor(options.color);
  doc.font(fontToUse).text(text, x, y, options);
}

// Colors
const COLOR_DURATION_BG = "#2b3d77";
const COLOR_WHITE = "#ffffff";
const COLOR_BORDER = "#d9d9d9";

// Row 2 setup
const COL_X = [35, 200, 435, 670, 806];
const COL_W = [COL_X[1]-COL_X[0], COL_X[2]-COL_X[1], COL_X[3]-COL_X[2], COL_X[4]-COL_X[3]];
const TABLE_LEFT = COL_X[0];
const TABLE_RIGHT = COL_X[4];
const TABLE_WIDTH = TABLE_RIGHT - TABLE_LEFT;
const ROW_H = 42.5;
const TABLE_TOP = 241;
const CELL_FONT_SIZE = 13;
const BORDER_WIDTH = 1.4;

const y = TABLE_TOP;

// Background
doc.save();
doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).fill(COLOR_DURATION_BG);
doc.restore();

// Borders
doc.lineWidth(BORDER_WIDTH).strokeColor(COLOR_BORDER);
doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).stroke();
doc.moveTo(COL_X[1], y).lineTo(COL_X[1], y + ROW_H).stroke();
doc.moveTo(COL_X[2], y).lineTo(COL_X[2], y + ROW_H).stroke();
doc.moveTo(COL_X[3], y).lineTo(COL_X[3], y + ROW_H).stroke();

// Col 1: Leave Duration
doc.font(FONT_EN_BOLD).fontSize(CELL_FONT_SIZE).fillColor(COLOR_WHITE);
const lblEnH = doc.heightOfString("Leave Duration", { width: COL_W[0] - 20 });
const lblEnY = y + (ROW_H - lblEnH) / 2;
drawTextEn("Leave Duration", COL_X[0] + 10, lblEnY, {
  width: COL_W[0] - 20, align: "center", weight: "bold",
  fontSize: CELL_FONT_SIZE, color: COLOR_WHITE,
});

// Col 2: English duration
const enDuration = "1 day ( 09-06-2026 to 15-06-2026 )";
doc.font(FONT_EN_REG).fontSize(CELL_FONT_SIZE).fillColor(COLOR_WHITE);
const valEnH = doc.heightOfString(enDuration, { width: COL_W[1] - 20 });
const valEnY = y + (ROW_H - valEnH) / 2;
drawTextEn(enDuration, COL_X[1] + 10, valEnY, {
  width: COL_W[1] - 20, align: "center",
  fontSize: CELL_FONT_SIZE, color: COLOR_WHITE,
});

// Col 3: Arabic duration — split approach (replicate route.ts logic)
const cellX = COL_X[2] + 10;
const cellW = COL_W[2] - 20;
const cellY = y;
const cellH = ROW_H;

const arFontSize = 11;
const openParen = "(";
const closeParen = ")";
const date1Str = "2026-06-09";
const date2Str = "2026-06-15";
const arabicIla = "إلى";
const arabicYawm = "يوم";
const numStr = "1";

const gap = 3;
doc.font(FONT_AR_REG).fontSize(arFontSize);
const wIla = doc.widthOfString(arabicIla);
const wYawm = doc.widthOfString(arabicYawm);
doc.font(FONT_EN_REG).fontSize(arFontSize);
const wOpenParen = doc.widthOfString(openParen);
const wCloseParen = doc.widthOfString(closeParen);
const wDate1 = doc.widthOfString(date1Str);
const wDate2 = doc.widthOfString(date2Str);
const wNum = doc.widthOfString(numStr);

const datesGroupW = wOpenParen + wDate1 + wIla + wDate2 + wCloseParen + gap * 4;
const numberGroupW = wNum + wYawm + gap;
const totalW = datesGroupW + gap * 2 + numberGroupW;
const startX = cellX + (cellW - totalW) / 2;

let cursorX = startX;
const xOpenParen = cursorX;       cursorX += wOpenParen + gap;
const xDate1 = cursorX;            cursorX += wDate1 + gap;
const xIla = cursorX;              cursorX += wIla + gap;
const xDate2 = cursorX;            cursorX += wDate2 + gap;
const xCloseParen = cursorX;       cursorX += wCloseParen + gap * 2;
const xNum = cursorX;              cursorX += wNum + gap;
const xYawm = cursorX;

const valArH = doc.currentLineHeight(true);
const valArY = cellY + (cellH - valArH) / 2;

// Render each piece
doc.font(FONT_EN_REG).fontSize(arFontSize).fillColor(COLOR_WHITE);
doc.text(openParen, xOpenParen, valArY, { align: "left", lineBreak: false });
doc.text(date1Str, xDate1, valArY, { align: "left", lineBreak: false });
doc.font(FONT_AR_REG).fontSize(arFontSize).fillColor(COLOR_WHITE);
doc.text(arabicIla, xIla, valArY, { align: "left", lineBreak: false });
doc.font(FONT_EN_REG).fontSize(arFontSize).fillColor(COLOR_WHITE);
doc.text(date2Str, xDate2, valArY, { align: "left", lineBreak: false });
doc.text(closeParen, xCloseParen, valArY, { align: "left", lineBreak: false });
doc.text(numStr, xNum, valArY, { align: "left", lineBreak: false });
doc.font(FONT_AR_REG).fontSize(arFontSize).fillColor(COLOR_WHITE);
doc.text(arabicYawm, xYawm, valArY, { align: "left", lineBreak: false });

// Col 4: Arabic label "مدة الإجازة"
doc.font(FONT_AR_BOLD).fontSize(CELL_FONT_SIZE).fillColor(COLOR_WHITE);
const lblArH = doc.heightOfString(processArabicText("مدة الإجازة"), { width: COL_W[3] - 20 });
const lblArY = y + (ROW_H - lblArH) / 2;
drawTextAr("مدة الإجازة", COL_X[3] + 10, lblArY, {
  width: COL_W[3] - 20, align: "center", weight: "bold",
  fontSize: CELL_FONT_SIZE, color: COLOR_WHITE,
});

// Add more test rows below
const drawRow = (labelEn, valueEn, valueAr, labelAr, bgColor = null) => {
  const rowY = TABLE_TOP + ROW_H + 10 + (drawRow.count * (ROW_H + 5));
  drawRow.count++;
  if (bgColor) {
    doc.save();
    doc.rect(TABLE_LEFT, rowY, TABLE_WIDTH, ROW_H).fill(bgColor);
    doc.restore();
  }
  doc.lineWidth(BORDER_WIDTH).strokeColor(COLOR_BORDER);
  doc.rect(TABLE_LEFT, rowY, TABLE_WIDTH, ROW_H).stroke();
  doc.moveTo(COL_X[1], rowY).lineTo(COL_X[1], rowY + ROW_H).stroke();
  doc.moveTo(COL_X[2], rowY).lineTo(COL_X[2], rowY + ROW_H).stroke();
  doc.moveTo(COL_X[3], rowY).lineTo(COL_X[3], rowY + ROW_H).stroke();

  // Col 1: English label
  doc.font(FONT_EN_BOLD).fontSize(CELL_FONT_SIZE).fillColor("#366fb5");
  const h1 = doc.heightOfString(labelEn, { width: COL_W[0] - 20 });
  const y1 = rowY + (ROW_H - h1) / 2;
  drawTextEn(labelEn, COL_X[0] + 10, y1, {
    width: COL_W[0] - 20, align: "center", weight: "bold",
    fontSize: CELL_FONT_SIZE, color: "#366fb5",
  });

  // Col 2: English value
  doc.font(FONT_EN_REG).fontSize(CELL_FONT_SIZE).fillColor("#2c3e77");
  const h2 = doc.heightOfString(valueEn, { width: COL_W[1] - 20 });
  const y2 = rowY + (ROW_H - h2) / 2;
  drawTextEn(valueEn, COL_X[1] + 10, y2, {
    width: COL_W[1] - 20, align: "center",
    fontSize: CELL_FONT_SIZE, color: "#2c3e77",
  });

  // Col 3: Arabic value — same logic as route.ts
  const cleanArText = String(valueAr || "").replace(/[^0-9A-Za-z\-/]/g, "").trim();
  const isArValueLatinOnly = cleanArText.length > 0 && /^[0-9A-Za-z\-/]+$/.test(cleanArText);
  if (isArValueLatinOnly) {
    doc.font(FONT_EN_REG).fontSize(CELL_FONT_SIZE).fillColor("#2c3e77");
    const h3 = doc.heightOfString(valueAr, { width: COL_W[2] - 20 });
    const y3 = rowY + (ROW_H - h3) / 2;
    drawTextEn(valueAr, COL_X[2] + 10, y3, {
      width: COL_W[2] - 20, align: "center",
      fontSize: CELL_FONT_SIZE, color: "#2c3e77",
    });
  } else {
    doc.font(FONT_AR_REG).fontSize(CELL_FONT_SIZE).fillColor("#2c3e77");
    const withNbsp = processArabicText(valueAr);
    if (withNbsp) {
      const h3 = doc.heightOfString(withNbsp, { width: COL_W[2] - 20 });
      const y3 = rowY + (ROW_H - h3) / 2;
      doc.text(withNbsp, COL_X[2] + 10, y3, {
        width: COL_W[2] - 20, align: "center", lineBreak: false,
      });
    }
  }

  // Col 4: Arabic label
  doc.font(FONT_AR_BOLD).fontSize(CELL_FONT_SIZE).fillColor("#366fb5");
  const processedLbl = processArabicText(labelAr);
  const h4 = doc.heightOfString(processedLbl, { width: COL_W[3] - 20 });
  const y4 = rowY + (ROW_H - h4) / 2;
  drawTextAr(labelAr, COL_X[3] + 10, y4, {
    width: COL_W[3] - 20, align: "center", weight: "bold",
    fontSize: CELL_FONT_SIZE, color: "#366fb5",
  });
};
drawRow.count = 0;

// Sample data rows
drawRow("Admission Date", "09-06-2026", "09-06-2026", "تاريخ الدخول");
drawRow("Discharge Date", "15-06-2026", "15-06-2026", "تاريخ الخروج", "#f6f6f6");
drawRow("Issue Date", "09-06-2026", "09-06-2026", "تاريخ إصدار التقرير");
drawRow("Name", "Mohammed Ali", "محمد علي", "الاسم", "#f6f6f6");
drawRow("National ID / Iqama", "1234567890", "1234567890", "رقم الهوية / الإقامة");
drawRow("Nationality", "Saudi", "سعودي", "الجنسية", "#f6f6f6");
drawRow("Employer", "Ministry of Health", "وزارة الصحة", "جهة العمل");
drawRow("Practitioner Name", "Dr. Ahmed Hassan", "د. أحمد حسن", "اسم الممارس", "#f6f6f6");
drawRow("Position", "Doctor", "طبيب", "المسمى الوظيفي");

// Title at top
drawTextAr("تقرير إجازة مرضية", 0, 152, {
  align: "center", weight: "bold", fontSize: 22, color: "#306db5", width: 841.89,
});
drawTextEn("Sick Leave Report", 0, 192, {
  align: "center", weight: "bold", fontSize: 18, color: "#2c3e77", width: 841.89,
});

doc.end();
stream.on("finish", () => {
  console.log("PDF written to:", outPath);
  console.log("File size:", fs.statSync(outPath).size, "bytes");
});
