const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fontArabicBoldPath = path.join(root, "node_modules", "@fontsource", "noto-sans-arabic", "files", "noto-sans-arabic-arabic-700-normal.woff");

const doc = new PDFDocument({ size: "A3", margin: 40 });
const out = fs.createWriteStream("/tmp/lic-test.pdf");
doc.pipe(out);
doc.registerFont("NotoArabicBold", fontArabicBoldPath);

// Test 1: fullLine via drawTextAr equivalent (Arabic font with English digits)
const licNum = "1410101201200443";
const fullLine = `رقم الترخيص : ${licNum}`;
doc.font("NotoArabicBold").fontSize(12);
doc.text(fullLine, 100, 100, { features: ["rtla"], align: "left", lineBreak: false });

// Test 2: same but without rtla
doc.text(fullLine, 100, 200, { align: "left", lineBreak: false });

// Test 3: split — Arabic part with Arabic font, license digits with Times
doc.font("NotoArabicBold").fontSize(12);
doc.text("رقم الترخيص : ", 100, 300, { features: ["rtla"], align: "left", lineBreak: false });
const arabicW = doc.widthOfString("رقم الترخيص : ");
doc.font("Times-Bold").fontSize(12);
doc.text(licNum, 100 + arabicW, 300, { align: "left", lineBreak: false });

doc.end();
