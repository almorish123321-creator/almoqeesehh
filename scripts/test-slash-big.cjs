// Bigger slash test
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
  const out = fs.createWriteStream("/tmp/slash-big.pdf");
  doc.pipe(out);

  doc.registerFont("NotoArabic", fontArabicRegPath);

  // Big Times-Roman slash
  doc.font("Times-Roman").fontSize(120).fillColor("#000").text("/", 100, 100);
  // Big NotoArabic slash with rtla
  doc.font("NotoArabic").fontSize(120).fillColor("#000").text("/", 250, 100, { features: ["rtla"] });
  // Big NotoArabic slash no features
  doc.font("NotoArabic").fontSize(120).fillColor("#000").text("/", 400, 100, { features: [] });

  // Arabic label with Times-Roman slash in the middle
  doc.font("NotoArabic").fontSize(40).fillColor("#000").text("رقم الهوية", 100, 350, { features: ["rtla"] });
  doc.font("Times-Roman").fontSize(40).fillColor("#000").text("/", 350, 350);
  doc.font("NotoArabic").fontSize(40).fillColor("#000").text("الإقامة", 420, 350, { features: ["rtla"] });

  // For comparison: full Arabic label
  doc.font("NotoArabic").fontSize(40).fillColor("#000").text("رقم الهوية / الإقامة", 100, 500, { features: ["rtla"] });

  doc.end();
  await new Promise((r) => out.on("finish", r));
  console.log("Wrote /tmp/slash-big.pdf");
  require("child_process").execSync("pdftoppm -r 150 -png /tmp/slash-big.pdf /tmp/slash-big", { stdio: "inherit" });
  console.log("Wrote /tmp/slash-big-1.png");
}
main().catch((e) => { console.error(e); process.exit(1); });
