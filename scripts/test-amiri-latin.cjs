const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const doc = new PDFDocument({ size: "A4", margin: 40 });
const out = fs.createWriteStream("/home/z/my-project/scripts/test-amiri-latin.pdf");
doc.pipe(out);

const amiriArabicReg = path.join(process.cwd(), "node_modules", "@fontsource", "amiri", "files", "amiri-arabic-400-normal.woff");
const amiriArabicBold = path.join(process.cwd(), "node_modules", "@fontsource", "amiri", "files", "amiri-arabic-700-normal.woff");
const amiriLatinReg = path.join(process.cwd(), "node_modules", "@fontsource", "amiri", "files", "amiri-latin-400-normal.woff");
const amiriLatinBold = path.join(process.cwd(), "node_modules", "@fontsource", "amiri", "files", "amiri-latin-700-normal.woff");

console.log("Files exist:",
  fs.existsSync(amiriArabicReg),
  fs.existsSync(amiriArabicBold),
  fs.existsSync(amiriLatinReg),
  fs.existsSync(amiriLatinBold)
);

// Test 1: Amiri-Latin with digits
doc.font(amiriLatinReg).fontSize(24).fillColor("#000000");
doc.text("Amiri-Latin Reg: 0123456789", 40, 40);

// Test 2: Amiri-Latin Bold with digits
doc.font(amiriLatinBold).fontSize(24);
doc.text("Amiri-Latin Bold: 0123456789", 40, 80);

// Test 3: Amiri-Latin slash
doc.font(amiriLatinReg).fontSize(24);
doc.text("Slash: / ", 40, 120);

// Test 4: Amiri-Latin Bold slash
doc.font(amiriLatinBold).fontSize(24);
doc.text("Slash Bold: / ", 40, 160);

// Test 5: Mixed Arabic + Latin in single line - using Amiri-Latin for digits
doc.font(amiriArabicReg).fontSize(22);
doc.text("Arabic: يوم", 40, 220, { features: ["rtla"], align: "left" });

doc.font(amiriLatinReg).fontSize(22);
doc.text("Latin digits: 13-10-1447", 40, 260);

doc.end();
out.on("finish", () => {
  console.log("PDF saved");
});
