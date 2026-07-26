// Quick test: render mixed Arabic/Latin text in different ways
// and save PDFs to /tmp for visual inspection.

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const FONT_AR_REG = path.join(ROOT, "public", "fonts", "NotoSansArabic-Regular.ttf");
const FONT_AR_BOLD = path.join(ROOT, "public", "fonts", "NotoSansArabic-Bold.ttf");

const tests = [
  {
    name: "test1-single-text-with-rtla",
    text: "1 يوم (2026-06-09 إلى 2026-06-09)",
    options: { features: ["rtla"] },
  },
  {
    name: "test2-single-text-no-rtla",
    text: "1 يوم (2026-06-09 إلى 2026-06-09)",
    options: {},
  },
  {
    name: "test3-bot-style-with-rtla",
    text: "يوم 1 (2026-06-09 إلى 2026-06-09)",
    options: { features: ["rtla"] },
  },
  {
    name: "test4-bot-style-no-rtla",
    text: "يوم 1 (2026-06-09 إلى 2026-06-09)",
    options: {},
  },
  {
    name: "test5-license-with-rtla",
    text: "رقم الترخيص: 1410101201200443",
    options: { features: ["rtla"] },
  },
  {
    name: "test6-license-no-rtla",
    text: "رقم الترخيص: 1410101201200443",
    options: {},
  },
  {
    name: "test7-hospital-name-with-rtla",
    text: "مستشفى الملك فيصل التخصصي",
    options: { features: ["rtla"] },
  },
  {
    name: "test8-hospital-name-no-rtla",
    text: "مستشفى الملك فيصل التخصصي",
    options: {},
  },
];

for (const test of tests) {
  const doc = new PDFDocument({ size: [400, 100], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const outPath = `/tmp/${test.name}.pdf`;
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);
  
  doc.font(FONT_AR_REG).fontSize(14).fillColor("#000000");
  doc.text(test.text, 10, 40, { width: 380, align: "center", lineBreak: false, ...test.options });
  
  doc.end();
  
  await new Promise((resolve) => stream.on("finish", resolve));
  console.log(`Saved: ${outPath}`);
}

console.log("Done.");
