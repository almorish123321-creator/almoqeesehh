const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fontArBoldPath = path.join(root, "node_modules", "@fontsource", "noto-sans-arabic", "files", "noto-sans-arabic-arabic-700-normal.woff");

const doc = new PDFDocument({ size: "A4", margin: 40 });
const out = fs.createWriteStream("/tmp/bold-test.pdf");
doc.pipe(out);
doc.registerFont("NotoArabicBold", fontArBoldPath);

// Test 1: Times-Bold slash
doc.font("Times-Bold").fontSize(30).fillColor("#000");
doc.text("/", 100, 100, { align: "left", lineBreak: false });

// Test 2: Times-Roman slash
doc.font("Times-Roman").fontSize(30).fillColor("#000");
doc.text("/", 200, 100, { align: "left", lineBreak: false });

doc.end();
