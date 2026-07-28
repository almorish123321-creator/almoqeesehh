// Empirical slash alignment test - find the right Y offset
// to align Times-Roman '/' with NotoArabic text baseline.
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const fontArabicRegPath = path.join(
  root, "node_modules", "@fontsource", "noto-sans-arabic", "files",
  "noto-sans-arabic-arabic-400-normal.woff"
);

async function main() {
  const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: 0 });
  const out = fs.createWriteStream("/tmp/slash-align.pdf");
  doc.pipe(out);
  doc.registerFont("NotoArabic", fontArabicRegPath);

  const fontSize = 14;

  // Reference: render "رقم الهوية" at y=100
  doc.font("NotoArabic").fontSize(fontSize).fillColor("#000");
  doc.text("رقم الهوية", 100, 100, { features: ["rtla"], align: "left", lineBreak: false });

  // Measure heights
  doc.font("NotoArabic").fontSize(fontSize);
  const arabicH = doc.heightOfString("م");
  doc.font("Times-Roman").fontSize(fontSize);
  const slashH = doc.heightOfString("/");

  console.log(`arabicH = ${arabicH}, slashH = ${slashH}`);
  console.log(`(arabicH - slashH) / 2 = ${(arabicH - slashH) / 2}`);
  console.log(`arabicH - slashH = ${arabicH - slashH}`);

  // Try different Y offsets for the slash
  const offsets = [
    { label: "offset=0 (same Y)", offset: 0 },
    { label: "offset=(ar-s)/2 = 3", offset: (arabicH - slashH) / 2 },
    { label: "offset=(ar-s) = 6", offset: arabicH - slashH },
    { label: "offset=fontSize*0.3 = 4.2", offset: fontSize * 0.3 },
    { label: "offset=fontSize*0.4 = 5.6", offset: fontSize * 0.4 },
    { label: "offset=fontSize*0.5 = 7", offset: fontSize * 0.5 },
  ];

  let yPos = 200;
  for (const t of offsets) {
    // Render: Arabic word | slash | Arabic word at the same Y, slash with offset
    doc.font("NotoArabic").fontSize(fontSize).fillColor("#000");
    doc.text("الهوية", 100, yPos, { features: ["rtla"], align: "left", lineBreak: false });

    doc.font("Times-Roman").fontSize(fontSize).fillColor("#000");
    doc.text("/", 200, yPos + t.offset, { align: "left", lineBreak: false });

    doc.font("NotoArabic").fontSize(fontSize).fillColor("#000");
    doc.text("الإقامة", 230, yPos, { features: ["rtla"], align: "left", lineBreak: false });

    // Label
    doc.font("Times-Roman").fontSize(10).fillColor("#00f");
    doc.text(t.label, 350, yPos);

    yPos += 50;
  }

  doc.end();
  await new Promise((r) => out.on("finish", r));
  require("child_process").execSync("pdftoppm -r 200 -png /tmp/slash-align.pdf /tmp/slash-align", { stdio: "inherit" });
  console.log("Done");
}
main().catch(console.error);
