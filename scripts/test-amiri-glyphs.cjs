const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const doc = new PDFDocument({ size: "A4", margin: 40 });
const out = fs.createWriteStream("/home/z/my-project/scripts/test-amiri-glyphs.pdf");
doc.pipe(out);

const amiriReg = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "amiri",
  "files",
  "amiri-arabic-400-normal.woff"
);
const amiriBold = path.join(
  process.cwd(),
  "node_modules",
  "@fontsource",
  "amiri",
  "files",
  "amiri-arabic-700-normal.woff"
);

console.log("Amiri Reg exists:", fs.existsSync(amiriReg));
console.log("Amiri Bold exists:", fs.existsSync(amiriBold));

// Test 1: Arabic text
doc.font(amiriReg).fontSize(24).fillColor("#000000");
doc.text("اميري تجربة - 1 يوم (13-10-1447 إلى 13-10-1447)", 40, 40, {
  features: ["rtla"],
  align: "left",
  width: 500,
});

// Test 2: digits
doc.font(amiriBold).fontSize(24);
doc.text("Digits: 0123456789", 40, 100);

// Test 3: slash
doc.font(amiriReg).fontSize(24);
doc.text("Slash test: رقم الهوية / الإقامة", 40, 160, {
  features: ["rtla"],
  align: "left",
  width: 500,
});

// Test 4: full text
doc.font(amiriReg).fontSize(20);
doc.text("Full Arabic: يوم (13-10-1447 إلى 13-10-1447)", 40, 220, {
  features: ["rtla"],
  align: "left",
  width: 500,
});

doc.end();
out.on("finish", () => {
  console.log("PDF saved to /home/z/my-project/scripts/test-amiri-glyphs.pdf");
});
