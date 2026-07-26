// Test v4 processArabicText pipeline: arabicReshape + bidiGetDisplay + NBSP
// This should produce visually-correct Arabic text in the PDF.

const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

// Load the new processArabicText implementation
// We'll inline it here to test without TypeScript compilation.
const bidiFactory = require("/home/z/my-project/node_modules/bidi-js");
const bidi = bidiFactory();

// --- Replicate arabic-text.ts v4 ---
const CHARS_MAP = {};
const charsArray = [
  [0x0621, 0xFE80, null, null, null],
  [0x0622, 0xFE81, null, null, 0xFE82],
  [0x0623, 0xFE83, null, null, 0xFE84],
  [0x0624, 0xFE85, null, null, 0xFE86],
  [0x0625, 0xFE87, null, null, 0xFE88],
  [0x0626, 0xFE89, 0xFE8B, 0xFE8C, 0xFE8A],
  [0x0627, 0xFE8D, null, null, 0xFE8E],
  [0x0628, 0xFE8F, 0xFE91, 0xFE92, 0xFE90],
  [0x0629, 0xFE93, null, null, 0xFE94],
  [0x062A, 0xFE95, 0xFE97, 0xFE98, 0xFE96],
  [0x062B, 0xFE99, 0xFE9B, 0xFE9C, 0xFE9A],
  [0x062C, 0xFE9D, 0xFE9F, 0xFEA0, 0xFE9E],
  [0x062D, 0xFEA1, 0xFEA3, 0xFEA4, 0xFEA2],
  [0x062E, 0xFEA5, 0xFEA7, 0xFEA8, 0xFEA6],
  [0x062F, 0xFEA9, null, null, 0xFEAA],
  [0x0630, 0xFEAB, null, null, 0xFEAC],
  [0x0631, 0xFEAD, null, null, 0xFEAE],
  [0x0632, 0xFEAF, null, null, 0xFEB0],
  [0x0633, 0xFEB1, 0xFEB3, 0xFEB4, 0xFEB2],
  [0x0634, 0xFEB5, 0xFEB7, 0xFEB8, 0xFEB6],
  [0x0635, 0xFEB9, 0xFEBB, 0xFEBC, 0xFEBA],
  [0x0636, 0xFEBD, 0xFEBF, 0xFEC0, 0xFEBE],
  [0x0637, 0xFEC1, 0xFEC3, 0xFEC4, 0xFEC2],
  [0x0638, 0xFEC5, 0xFEC7, 0xFEC8, 0xFEC6],
  [0x0639, 0xFEC9, 0xFECB, 0xFECC, 0xFECA],
  [0x063A, 0xFECD, 0xFECF, 0xFED0, 0xFECE],
  [0x0641, 0xFED1, 0xFED3, 0xFED4, 0xFED2],
  [0x0642, 0xFED5, 0xFED7, 0xFED8, 0xFED6],
  [0x0643, 0xFED9, 0xFEDB, 0xFEDC, 0xFEDA],
  [0x0644, 0xFEDD, 0xFEDF, 0xFEE0, 0xFEDE],
  [0x0645, 0xFEE1, 0xFEE3, 0xFEE4, 0xFEE2],
  [0x0646, 0xFEE5, 0xFEE7, 0xFEE8, 0xFEE6],
  [0x0647, 0xFEE9, 0xFEEB, 0xFEEC, 0xFEEA],
  [0x0648, 0xFEED, null, null, 0xFEEE],
  [0x0649, 0xFEEF, null, null, 0xFEF0],
  [0x064A, 0xFEF1, 0xFEF3, 0xFEF4, 0xFEF2],
  [0x0640, 0x0640, 0x0640, 0x0640, 0x0640],
  [0x064B, 0x064B, null, null, null],
  [0x064C, 0x064C, null, null, null],
  [0x064D, 0x064D, null, null, null],
  [0x064E, 0x064E, null, null, null],
  [0x064F, 0x064F, null, null, null],
  [0x0650, 0x0650, null, null, null],
  [0x0651, 0x0651, null, null, null],
  [0x0652, 0x0652, null, null, null],
];
for (const [code, iso, init, med, fin] of charsArray) {
  CHARS_MAP[code] = { isolated: iso, initial: init, medial: med, final: fin };
}
const LAM_ALEF_LIGATURES = {
  "\u0644\u0622": 0xFEF5,
  "\u0644\u0623": 0xFEF7,
  "\u0644\u0625": 0xFEF9,
  "\u0644\u0627": 0xFEFB,
};
const LAM_ALEF_LIGATURES_FINAL = {
  "\u0644\u0622": 0xFEF6,
  "\u0644\u0623": 0xFEF8,
  "\u0644\u0625": 0xFEFA,
  "\u0644\u0627": 0xFEFC,
};
function isArabicLetter(code) {
  return (code >= 0x0621 && code <= 0x064A) || code === 0x0640;
}
function isDiacritic(code) {
  return code >= 0x064B && code <= 0x0652;
}
function getCharRep(current, prevCode, nextCode) {
  const rep = CHARS_MAP[current];
  if (!rep) return current;
  const prevConnectsForward = prevCode !== null
    && CHARS_MAP[prevCode] !== undefined
    && CHARS_MAP[prevCode].initial !== null;
  const nextIsArabicLetter = nextCode !== null && isArabicLetter(nextCode);
  if (prevConnectsForward && nextIsArabicLetter && rep.medial !== null) return rep.medial;
  if (prevConnectsForward && rep.final !== null) return rep.final;
  if (nextIsArabicLetter && rep.initial !== null) return rep.initial;
  return rep.isolated ?? current;
}
function arabicReshape(text) {
  if (!text) return "";
  let cleaned = "";
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code === 0x200d || code === 0x200c) continue;
    cleaned += ch;
  }
  let afterLigatures = "";
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const nextCh = cleaned[i + 1];
    const pair = ch + (nextCh || "");
    if (i < cleaned.length - 1 && LAM_ALEF_LIGATURES[pair]) {
      let prevConnectsForward = false;
      for (let j = i - 1; j >= 0; j--) {
        const pc = cleaned[j].codePointAt(0);
        if (isDiacritic(pc)) continue;
        if (isArabicLetter(pc)) {
          prevConnectsForward = CHARS_MAP[pc] !== undefined && CHARS_MAP[pc].initial !== null;
        }
        break;
      }
      const ligatureCode = prevConnectsForward
        ? LAM_ALEF_LIGATURES_FINAL[pair] || LAM_ALEF_LIGATURES[pair]
        : LAM_ALEF_LIGATURES[pair];
      afterLigatures += String.fromCodePoint(ligatureCode);
      i++;
      continue;
    }
    afterLigatures += ch;
  }
  let result = "";
  for (let i = 0; i < afterLigatures.length; i++) {
    const ch = afterLigatures[i];
    const code = ch.codePointAt(0);
    if (!isArabicLetter(code) && !isDiacritic(code)) { result += ch; continue; }
    let prevCode = null;
    for (let j = i - 1; j >= 0; j--) {
      const pc = afterLigatures[j].codePointAt(0);
      if (isDiacritic(pc)) continue;
      if (isArabicLetter(pc)) prevCode = pc;
      break;
    }
    let nextCode = null;
    for (let j = i + 1; j < afterLigatures.length; j++) {
      const nc = afterLigatures[j].codePointAt(0);
      if (isDiacritic(nc)) continue;
      if (isArabicLetter(nc)) nextCode = nc;
      break;
    }
    if (isDiacritic(code)) { result += ch; continue; }
    const shaped = getCharRep(code, prevCode, nextCode);
    result += String.fromCodePoint(shaped);
  }
  return result;
}
function bidiGetDisplay(text) {
  if (!text) return "";
  try {
    const result = bidi.getEmbeddingLevels(text);
    if (result.paragraphs.length === 0) return text;
    const hasRtl = result.paragraphs.some(p => p.level % 2 === 1);
    if (!hasRtl) return text;
    return bidi.getReorderedString(text, result);
  } catch { return text; }
}
function processArabicText(text) {
  if (!text) return "";
  const reshaped = arabicReshape(text);
  const bidiText = bidiGetDisplay(reshaped);
  return bidiText.replace(/ /g, "\u00A0");
}

// === Generate test PDF ===
const ROOT = "/home/z/my-project";
const FONT_AR_REG = path.join(ROOT, "public", "fonts", "NotoSansArabic-Regular.ttf");
const FONT_AR_BOLD = path.join(ROOT, "public", "fonts", "NotoSansArabic-Bold.ttf");
const FONT_EN_REG = "Times-Roman";
const FONT_EN_BOLD = "Times-Bold";

const doc = new PDFDocument({
  size: [841.89, 1187.72],
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
});

const outPath = "/home/z/my-project/download/test-v4.pdf";
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

function drawTextAr(text, x, y, options = {}) {
  const fontToUse = options.weight === "bold" ? FONT_AR_BOLD : FONT_AR_REG;
  if (options.fontSize) doc.fontSize(options.fontSize);
  if (options.color) doc.fillColor(options.color);
  const processed = processArabicText(text);
  const userAlign = options.align || "center";
  const safeAlign = userAlign === "right" ? "center" : userAlign;
  const opts = { lineBreak: false, ...options, align: safeAlign };
  doc.font(fontToUse).text(processed, x, y, opts);
}

function drawTextEn(text, x, y, options = {}) {
  const fontToUse = options.weight === "bold" ? FONT_EN_BOLD : FONT_EN_REG;
  if (options.fontSize) doc.fontSize(options.fontSize);
  if (options.color) doc.fillColor(options.color);
  doc.font(fontToUse).text(text, x, y, options);
}

// Title
drawTextAr("تقرير إجازة مرضية", 0, 152, {
  align: "center", weight: "bold", fontSize: 22, color: "#306db5", width: 841.89,
});
drawTextEn("Sick Leave Report", 0, 192, {
  align: "center", weight: "bold", fontSize: 18, color: "#2c3e77", width: 841.89,
});

// Table
const COL_X = [35, 200, 435, 670, 806];
const COL_W = [COL_X[1]-COL_X[0], COL_X[2]-COL_X[1], COL_X[3]-COL_X[2], COL_X[4]-COL_X[3]];
const TABLE_LEFT = COL_X[0];
const TABLE_WIDTH = COL_X[4] - COL_X[0];
const ROW_H = 42.5;
const TABLE_TOP = 241;
const CELL_FONT_SIZE = 13;
const BORDER_WIDTH = 1.4;

const drawRow = (labelEn, valueEn, valueAr, labelAr, bgColor = null, textColor = "#2c3e77", labelColor = "#366fb5") => {
  const y = TABLE_TOP + (drawRow.count * ROW_H);
  drawRow.count++;
  if (bgColor) {
    doc.save();
    doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).fill(bgColor);
    doc.restore();
  }
  doc.lineWidth(BORDER_WIDTH).strokeColor("#d9d9d9");
  doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).stroke();
  doc.moveTo(COL_X[1], y).lineTo(COL_X[1], y + ROW_H).stroke();
  doc.moveTo(COL_X[2], y).lineTo(COL_X[2], y + ROW_H).stroke();
  doc.moveTo(COL_X[3], y).lineTo(COL_X[3], y + ROW_H).stroke();

  // Col 1: English label
  doc.font(FONT_EN_BOLD).fontSize(CELL_FONT_SIZE).fillColor(labelColor);
  const h1 = doc.heightOfString(labelEn, { width: COL_W[0] - 20 });
  const y1 = y + (ROW_H - h1) / 2;
  drawTextEn(labelEn, COL_X[0] + 10, y1, {
    width: COL_W[0] - 20, align: "center", weight: "bold",
    fontSize: CELL_FONT_SIZE, color: labelColor,
  });

  // Col 2: English value
  doc.font(FONT_EN_REG).fontSize(CELL_FONT_SIZE).fillColor(textColor);
  const h2 = doc.heightOfString(valueEn, { width: COL_W[1] - 20 });
  const y2 = y + (ROW_H - h2) / 2;
  drawTextEn(valueEn, COL_X[1] + 10, y2, {
    width: COL_W[1] - 20, align: "center",
    fontSize: CELL_FONT_SIZE, color: textColor,
  });

  // Col 3: Arabic value
  const cleanArText = String(valueAr || "").replace(/[^0-9A-Za-z\-/]/g, "").trim();
  const isArValueLatinOnly = cleanArText.length > 0 && /^[0-9A-Za-z\-/]+$/.test(cleanArText);
  if (isArValueLatinOnly) {
    doc.font(FONT_EN_REG).fontSize(CELL_FONT_SIZE).fillColor(textColor);
    const h3 = doc.heightOfString(valueAr, { width: COL_W[2] - 20 });
    const y3 = y + (ROW_H - h3) / 2;
    drawTextEn(valueAr, COL_X[2] + 10, y3, {
      width: COL_W[2] - 20, align: "center",
      fontSize: CELL_FONT_SIZE, color: textColor,
    });
  } else {
    doc.font(FONT_AR_REG).fontSize(CELL_FONT_SIZE).fillColor(textColor);
    const processed = processArabicText(valueAr || "");
    if (processed) {
      const h3 = doc.heightOfString(processed, { width: COL_W[2] - 20 });
      const y3 = y + (ROW_H - h3) / 2;
      doc.text(processed, COL_X[2] + 10, y3, {
        width: COL_W[2] - 20, align: "center", lineBreak: false,
      });
    }
  }

  // Col 4: Arabic label
  doc.font(FONT_AR_BOLD).fontSize(CELL_FONT_SIZE).fillColor(labelColor);
  const processedLbl = processArabicText(labelAr);
  const h4 = doc.heightOfString(processedLbl, { width: COL_W[3] - 20 });
  const y4 = y + (ROW_H - h4) / 2;
  drawTextAr(labelAr, COL_X[3] + 10, y4, {
    width: COL_W[3] - 20, align: "center", weight: "bold",
    fontSize: CELL_FONT_SIZE, color: labelColor,
  });
};
drawRow.count = 0;

// Row 1: Leave ID
drawRow("Leave ID", "GSL-12345-2026", "GSL-12345-2026", "رمز الإجازة");

// Row 2: Leave Duration (special handling — split for date+number+word)
{
  const y = TABLE_TOP + (1 * ROW_H);
  // Background
  doc.save();
  doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).fill("#2b3d77");
  doc.restore();
  doc.lineWidth(BORDER_WIDTH).strokeColor("#d9d9d9");
  doc.rect(TABLE_LEFT, y, TABLE_WIDTH, ROW_H).stroke();
  doc.moveTo(COL_X[1], y).lineTo(COL_X[1], y + ROW_H).stroke();
  doc.moveTo(COL_X[2], y).lineTo(COL_X[2], y + ROW_H).stroke();
  doc.moveTo(COL_X[3], y).lineTo(COL_X[3], y + ROW_H).stroke();

  // Col 1: "Leave Duration"
  doc.font(FONT_EN_BOLD).fontSize(CELL_FONT_SIZE).fillColor("#ffffff");
  const h1 = doc.heightOfString("Leave Duration", { width: COL_W[0] - 20 });
  const y1 = y + (ROW_H - h1) / 2;
  drawTextEn("Leave Duration", COL_X[0] + 10, y1, {
    width: COL_W[0] - 20, align: "center", weight: "bold",
    fontSize: CELL_FONT_SIZE, color: "#ffffff",
  });

  // Col 2: English duration
  const enDuration = "1 day ( 09-06-2026 to 15-06-2026 )";
  doc.font(FONT_EN_REG).fontSize(11).fillColor("#ffffff");
  const h2 = doc.heightOfString(enDuration, { width: COL_W[1] - 20 });
  const y2 = y + (ROW_H - h2) / 2;
  drawTextEn(enDuration, COL_X[1] + 10, y2, {
    width: COL_W[1] - 20, align: "center", fontSize: 11, color: "#ffffff",
  });

  // Col 3: Arabic duration — split layout
  // Visual goal: "( 2026-06-09 إلى 2026-06-15 )  1 يوم"
  // Layout (left-to-right):
  //   "(" + date1 + "إلى" + date2 + ")" + "1" + "يوم"
  const cellX = COL_X[2] + 10;
  const cellW = COL_W[2] - 20;
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
  const wIla = doc.widthOfString(processArabicText(arabicIla));
  const wYawm = doc.widthOfString(processArabicText(arabicYawm));
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
  const valArY = y + (ROW_H - valArH) / 2;

  doc.font(FONT_EN_REG).fontSize(arFontSize).fillColor("#ffffff");
  doc.text(openParen, xOpenParen, valArY, { align: "left", lineBreak: false });
  doc.text(date1Str, xDate1, valArY, { align: "left", lineBreak: false });
  doc.font(FONT_AR_REG).fontSize(arFontSize).fillColor("#ffffff");
  doc.text(processArabicText(arabicIla), xIla, valArY, { align: "left", lineBreak: false });
  doc.font(FONT_EN_REG).fontSize(arFontSize).fillColor("#ffffff");
  doc.text(date2Str, xDate2, valArY, { align: "left", lineBreak: false });
  doc.text(closeParen, xCloseParen, valArY, { align: "left", lineBreak: false });
  doc.text(numStr, xNum, valArY, { align: "left", lineBreak: false });
  doc.font(FONT_AR_REG).fontSize(arFontSize).fillColor("#ffffff");
  doc.text(processArabicText(arabicYawm), xYawm, valArY, { align: "left", lineBreak: false });

  // Col 4: "مدة الإجازة"
  doc.font(FONT_AR_BOLD).fontSize(CELL_FONT_SIZE).fillColor("#ffffff");
  const processedLbl = processArabicText("مدة الإجازة");
  const h4 = doc.heightOfString(processedLbl, { width: COL_W[3] - 20 });
  const y4 = y + (ROW_H - h4) / 2;
  drawTextAr("مدة الإجازة", COL_X[3] + 10, y4, {
    width: COL_W[3] - 20, align: "center", weight: "bold",
    fontSize: CELL_FONT_SIZE, color: "#ffffff",
  });
}

// Continue with rows 3-11 (skip row 2)
drawRow.count = 2;
drawRow("Admission Date", "09-06-2026", "09-06-2026", "تاريخ الدخول");
drawRow("Discharge Date", "15-06-2026", "15-06-2026", "تاريخ الخروج", "#f6f6f6");
drawRow("Issue Date", "09-06-2026", "09-06-2026", "تاريخ إصدار التقرير");
drawRow("Name", "Mohammed Ali Hassan", "محمد علي حسن", "الاسم", "#f6f6f6");
drawRow("National ID / Iqama", "1234567890", "1234567890", "رقم الهوية / الإقامة");
drawRow("Nationality", "Saudi", "سعودي", "الجنسية", "#f6f6f6");
drawRow("Employer", "Ministry of Health", "وزارة الصحة", "جهة العمل");
drawRow("Practitioner Name", "Dr. Ahmed Hassan", "د. أحمد حسن", "اسم الممارس", "#f6f6f6");
drawRow("Position", "Doctor", "طبيب", "المسمى الوظيفي");

// Footer text
drawTextAr("للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة", 35, 871, {
  width: 400, align: "center", weight: "bold", fontSize: 10, color: "#000000",
});
drawTextAr("الرسمي", 35, 888, {
  width: 400, align: "center", weight: "bold", fontSize: 10, color: "#000000",
});

// License number — split approach
{
  const labelPart = "رقم الترخيص :";
  const numPart = "12345";
  const gap = 4;
  doc.font(FONT_AR_BOLD).fontSize(12);
  const labelW = doc.widthOfString(processArabicText(labelPart));
  doc.font(FONT_EN_REG).fontSize(12);
  const numW = doc.widthOfString(numPart);
  const totalW = labelW + gap + numW;
  const startX = 435 + (371 - totalW) / 2;
  const valArH = doc.currentLineHeight(true);
  const valArY = 930 + (12 - valArH) / 2;
  doc.font(FONT_AR_BOLD).fontSize(12).fillColor("#000000");
  doc.text(processArabicText(labelPart), startX, valArY, { align: "left", lineBreak: false });
  doc.font(FONT_EN_REG).fontSize(12).fillColor("#000000");
  doc.text(numPart, startX + labelW + gap, valArY, { align: "left", lineBreak: false });
}

// Hospital name
drawTextAr("مستشفى الملك فهد", 435, 866, {
  width: 371, align: "center", weight: "bold", fontSize: 12, color: "#000000",
});

doc.end();
stream.on("finish", () => {
  console.log("PDF written to:", outPath);
  console.log("File size:", fs.statSync(outPath).size, "bytes");
});
