// Standalone test script: generate a sample PDF with Arabic text using
// PDFKit + the project's processArabicText pipeline. Saves to /tmp so we
// can inspect the visual output without spinning up Next.js.

const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

// Replicate processArabicText (NBSP only — relies on fontkit shaping + RTL reverse)
function processArabicText(text) {
  if (!text) return "";
  return text.replace(/ /g, "\u00A0");
}

const ROOT = "/home/z/my-project";
const FONT_AR_REG = path.join(ROOT, "public", "fonts", "NotoSansArabic-Regular.ttf");
const FONT_AR_BOLD = path.join(ROOT, "public", "fonts", "NotoSansArabic-Bold.ttf");

console.log("Arabic regular font exists:", fs.existsSync(FONT_AR_REG));
console.log("Arabic bold font exists:", fs.existsSync(FONT_AR_BOLD));

const doc = new PDFDocument({
  size: [600, 800],
  margins: { top: 40, bottom: 40, left: 40, right: 40 },
});

const outPath = "/home/z/my-project/download/test-arabic.pdf";
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

let y = 50;

function drawAr(text, opts = {}) {
  const font = opts.bold ? FONT_AR_BOLD : FONT_AR_REG;
  const size = opts.size || 18;
  const processed = processArabicText(text);
  doc.font(font).fontSize(size).fillColor(opts.color || "#000000");
  doc.text(processed, 40, y, { lineBreak: false, align: "left" });
  y += size + 8;
}

function drawArCenter(text, opts = {}) {
  const font = opts.bold ? FONT_AR_BOLD : FONT_AR_REG;
  const size = opts.size || 18;
  const processed = processArabicText(text);
  doc.font(font).fontSize(size).fillColor(opts.color || "#000000");
  doc.text(processed, 40, y, { lineBreak: false, align: "center", width: 520 });
  y += size + 8;
}

function drawEn(text, opts = {}) {
  const size = opts.size || 14;
  doc.font("Times-Roman").fontSize(size).fillColor("#000000");
  doc.text(text, 40, y, { lineBreak: false });
  y += size + 6;
}

// Test cases
drawEn("--- Test 1: Pure Arabic word ---");
drawAr("إجازة");
drawAr("تقرير");
drawAr("الإجازة");
drawAr("مرضية");

y += 10;
drawEn("--- Test 2: Arabic phrases (centered) ---");
drawArCenter("تقرير إجازة مرضية", { bold: true, size: 22 });
drawArCenter("رمز الإجازة");
drawArCenter("مدة الإجازة");
drawArCenter("تاريخ الدخول");

y += 10;
drawEn("--- Test 3: Arabic with digits (NBSP version) ---");
drawArCenter("1 يوم");
drawArCenter("7 يوم");
drawArCenter("( 2026-06-09 إلى 2026-06-15 )");

y += 10;
drawEn("--- Test 4: Mixed sentences ---");
drawArCenter("للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة");
drawArCenter("الرسمي");

y += 10;
drawEn("--- Test 5: Hospital name ---");
drawArCenter("مستشفى الملك فهد", { bold: true, size: 16 });
drawArCenter("King Fahad Hospital", { size: 14 });

doc.end();
stream.on("finish", () => {
  console.log("PDF written to:", outPath);
  console.log("File size:", fs.statSync(outPath).size, "bytes");
});
