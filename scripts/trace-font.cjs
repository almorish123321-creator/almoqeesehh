// Mirror the exact code path of pdf-generator.ts to verify Amiri loads
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();

const fontArabicRegPath = path.join(rootDir, "node_modules", "@fontsource", "amiri", "files", "amiri-arabic-400-normal.woff");
const fontArabicBoldPath = path.join(rootDir, "node_modules", "@fontsource", "amiri", "files", "amiri-arabic-700-normal.woff");

console.log("Amiri Reg exists:", fs.existsSync(fontArabicRegPath), "->", fontArabicRegPath);
console.log("Amiri Bold exists:", fs.existsSync(fontArabicBoldPath), "->", fontArabicBoldPath);

let fontArReg = "Helvetica";
let fontArBold = "Helvetica-Bold";
let useArabicFont = false;

if (fs.existsSync(fontArabicRegPath) && fs.existsSync(fontArabicBoldPath)) {
  fontArReg = fontArabicRegPath;
  fontArBold = fontArabicBoldPath;
  useArabicFont = true;
}
console.log("useArabicFont:", useArabicFont);
console.log("fontArReg:", fontArReg);
console.log("fontArBold:", fontArBold);

const doc = new PDFDocument({ size: "A4", margin: 40 });
const out = fs.createWriteStream("/tmp/trace-font-test.pdf");
doc.pipe(out);

// Use the EXACT same code path as drawTextAr default case
doc.font(fontArReg).fontSize(28).fillColor("#000000");
doc.text("نص تجريبي مدة الإجازة", 40, 40, {
  align: "right",
  features: ["rtla"],
  width: 500
});

// Test bold
doc.font(fontArBold).fontSize(28);
doc.text("نص عريض تجريبي", 40, 100, {
  align: "right",
  features: ["rtla"],
  width: 500
});

doc.end();
out.on("finish", () => console.log("PDF saved to /tmp/trace-font-test.pdf"));
