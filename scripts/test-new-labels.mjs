// Verify the new drawTextAr logic: pure Arabic text should use rtla feature
// to render correctly. Compare to the original approach (no rtla).

import PDFDocument from "pdfkit";
import fs from "fs";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const FONT_AR_REG = `${ROOT}/public/fonts/NotoSansArabic-Regular.ttf`;
const FONT_AR_BOLD = `${ROOT}/public/fonts/NotoSansArabic-Bold.ttf`;

// Mirror the new drawTextAr logic
function isPureArabic(text) {
  const stripped = String(text).replace(/[\u200e\u200f\u200d\u200c]/g, "");
  return /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s\u060C\u061B\u061F\uFD3E\uFD3F:\-()/\\]*$/.test(stripped)
    && /[\u0600-\u06FF]/.test(stripped)
    && !/[0-9A-Za-z]/.test(stripped);
}

function drawTextAr(doc, text, x, y, options = {}) {
  const fontToUse = options.weight === "bold" ? FONT_AR_BOLD : FONT_AR_REG;
  if (options.fontSize) doc.fontSize(options.fontSize);
  if (options.color) doc.fillColor(options.color);
  const opts = { align: "right", ...options };
  if (isPureArabic(text) && !opts.features) {
    opts.features = ["rtla"];
  }
  doc.font(fontToUse).text(text, x, y, opts);
}

const tests = [
  { name: "T1-NEW-رمز الإجازة",       text: "رمز الإجازة" },
  { name: "T2-NEW-مدة الإجازة",       text: "مدة الإجازة" },
  { name: "T3-NEW-تقرير إجازة مرضية", text: "تقرير إجازة مرضية" },
  { name: "T4-NEW-رقم الهوية",        text: "رقم الهوية / الإقامة" },
  { name: "T5-NEW-اسم الممارس",       text: "اسم الممارس" },
  { name: "T6-NEW-المسمى الوظيفي",    text: "المسمى الوظيفي" },
  { name: "T7-NEW-الجنسية",           text: "الجنسية" },
  { name: "T8-NEW-جهة العمل",         text: "جهة العمل" },
  { name: "T9-NEW-تاريخ الدخول",      text: "تاريخ الدخول" },
  { name: "T10-NEW-تاريخ الخروج",     text: "تاريخ الخروج" },
  { name: "T11-NEW-تاريخ الإصدار",    text: "تاريخ إصدار التقرير" },
  { name: "T12-NEW-hospital",         text: "مستشفى الملك فيصل التخصصي" },
  { name: "T13-NEW-for-verify-text",  text: "للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة الرسمي" },
  { name: "T14-NEW-license-label",    text: "رقم الترخيص" },
];

let y = 50;
const doc = new PDFDocument({ size: [800, 100 + tests.length * 70], margins: { top: 40, bottom: 40, left: 40, right: 40 } });
const out = fs.createWriteStream("/tmp/arabic-labels-new.pdf");
doc.pipe(out);

doc.font("Times-Bold").fontSize(12).fillColor("#000");
doc.text("NEW drawTextAr — pure Arabic uses rtla — verify visual order", 40, 20);

for (const t of tests) {
  doc.rect(40, y, 720, 50).stroke("#cccccc");
  doc.font("Times-Roman").fontSize(9).fillColor("#888");
  doc.text(`test: ${t.name}  (isPureArabic=${isPureArabic(t.text)})`, 45, y + 2);
  drawTextAr(doc, t.text, 40, y + 18, { width: 720, align: "center", fontSize: 14 });
  y += 70;
}

doc.end();
out.on("finish", () => {
  console.log("PDF saved to /tmp/arabic-labels-new.pdf");
  execSync("pdftotext -layout /tmp/arabic-labels-new.pdf -", { stdio: "inherit" });
  console.log("\n=== raw (no layout) ===\n");
  execSync("pdftotext /tmp/arabic-labels-new.pdf -", { stdio: "inherit" });
  execSync("pdftoppm -r 150 -png /tmp/arabic-labels-new.pdf /tmp/arabic-labels-new", { stdio: "inherit" });
  console.log("PNG saved.");
});
