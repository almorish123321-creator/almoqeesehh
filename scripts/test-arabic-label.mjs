// Test how pdfkit renders Arabic labels like "رمز الإجازة" — user reports
// they appear reversed as "إجازة رمز".

import PDFDocument from "pdfkit";
import fs from "fs";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const FONT_AR_REG = `${ROOT}/public/fonts/NotoSansArabic-Regular.ttf`;
const FONT_AR_BOLD = `${ROOT}/public/fonts/NotoSansArabic-Bold.ttf`;

console.log("Font reg exists:", fs.existsSync(FONT_AR_REG));
console.log("Font bold exists:", fs.existsSync(FONT_AR_BOLD));

const tests = [
  { name: "label-only-center",   text: "رمز الإجازة",        align: "center", features: undefined },
  { name: "label-only-right",    text: "رمز الإجازة",        align: "right",  features: undefined },
  { name: "label-only-rtla",     text: "رمز الإجازة",        align: "right",  features: ["rtla"] },
  { name: "label-with-colon",    text: "رقم الترخيص:",       align: "right",  features: undefined },
  { name: "license-line",        text: "رقم الترخيص: 1410101201200443", align: "right", features: undefined },
  { name: "hospital-ar",         text: "مستشفى الملك فيصل التخصصي",        align: "center", features: undefined },
  { name: "duration-full",       text: "يوم 1 ( 2026-06-09 إلى 2026-06-09 )", align: "center", features: undefined },
];

let y = 50;
const doc = new PDFDocument({ size: [800, 100 + tests.length * 80], margins: { top: 40, bottom: 40, left: 40, right: 40 } });
const out = fs.createWriteStream("/tmp/arabic-labels-test.pdf");
doc.pipe(out);

doc.font("Times-Bold").fontSize(12).fillColor("#000");
doc.text("Arabic text rendering tests — check visual order of each label", 40, 20);

for (const t of tests) {
  doc.rect(40, y, 720, 60).stroke("#cccccc");
  doc.font("Times-Roman").fontSize(9).fillColor("#888");
  doc.text(`test: ${t.name}  (align=${t.align}, features=${JSON.stringify(t.features || "default")})`, 45, y + 2);
  doc.font(FONT_AR_REG).fontSize(16).fillColor("#000");
  const opts = { align: t.align, width: 720, lineBreak: false };
  if (t.features) opts.features = t.features;
  doc.text(t.text, 40, y + 20, opts);
  y += 80;
}

doc.end();
out.on("finish", () => {
  console.log("PDF saved to /tmp/arabic-labels-test.pdf");
  execSync("pdftoppm -r 150 -png /tmp/arabic-labels-test.pdf /tmp/arabic-labels-test", { stdio: "inherit" });
  console.log("PNG saved.");
});
