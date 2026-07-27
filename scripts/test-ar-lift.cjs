// Find the right Arabic "lift" to align with Times-Roman baseline
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
  const out = fs.createWriteStream("/tmp/ar-lift.pdf");
  doc.pipe(out);
  doc.registerFont("NotoArabic", fontArabicRegPath);

  const fontSize = 12; // matches durFontSize - 1

  // Try different lifts
  const lifts = [
    { label: "lift=0 (no shift)", lift: 0 },
    { label: "lift=2", lift: 2 },
    { label: "lift=3", lift: 3 },
    { label: "lift=4", lift: 4 },
    { label: "lift=5", lift: 5 },
    { label: "lift=6", lift: 6 },
    { label: "lift=8", lift: 8 },
  ];

  let yPos = 100;
  for (const t of lifts) {
    // Draw a reference line (English text at this Y)
    doc.font("Times-Roman").fontSize(fontSize).fillColor("#888");
    doc.text("(09-06-2026 ", 100, yPos, { align: "left", lineBreak: false });
    doc.text("1", 280, yPos, { align: "left", lineBreak: false });
    doc.text(")", 310, yPos, { align: "left", lineBreak: false });

    // Draw Arabic word "يوم" lifted UP by t.lift (relative to English Y)
    doc.font("NotoArabic").fontSize(fontSize).fillColor("#000");
    doc.text("يوم", 200, yPos - t.lift, { features: ["rtla"], align: "left", lineBreak: false });

    // Draw Arabic word "الى" lifted UP by t.lift
    doc.font("NotoArabic").fontSize(fontSize).fillColor("#000");
    doc.text("الى", 350, yPos - t.lift, { features: ["rtla"], align: "left", lineBreak: false });

    // Label
    doc.font("Times-Roman").fontSize(10).fillColor("#00f");
    doc.text(t.label, 500, yPos);

    yPos += 50;
  }

  doc.end();
  await new Promise((r) => out.on("finish", r));
  require("child_process").execSync("pdftoppm -r 200 -png /tmp/ar-lift.pdf /tmp/ar-lift", { stdio: "inherit" });
  console.log("Done");
}
main().catch(console.error);
