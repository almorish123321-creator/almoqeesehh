// Force load + test with explicit Amiri to verify it renders
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const doc = new PDFDocument({ size: "A4", margin: 40 });
const out = fs.createWriteStream("/tmp/amiri-direct-test.pdf");
doc.pipe(out);

const amiriReg = path.join(process.cwd(), "node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff");
console.log("Loading:", amiriReg);
console.log("Exists:", fs.existsSync(amiriReg));

// Register the font so we can reference it by name
doc.registerFont("AmiriReg", amiriReg);
console.log("Font registered");

// Use Amiri by registered name
doc.font("AmiriReg").fontSize(28).fillColor("#000000");
doc.text("نص أميري تجريبي - مدة الإجازة", 40, 40, {
  features: ["rtla"],
  align: "left",
  width: 500
});

// Test with file path directly
doc.font(amiriReg).fontSize(28);
doc.text("نص أميري مباشر - يوم", 40, 100, {
  features: ["rtla"],
  align: "left",
  width: 500
});

doc.end();
out.on("finish", () => {
  console.log("PDF saved to /tmp/amiri-direct-test.pdf");
});
