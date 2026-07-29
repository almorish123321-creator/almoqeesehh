const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const doc = new PDFDocument({ size: "A4", margin: 40 });
const out = fs.createWriteStream("/tmp/test-positions.pdf");
doc.pipe(out);

const amiriReg = path.join(process.cwd(), "node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff");
const amiriLatinReg = path.join(process.cwd(), "node_modules/@fontsource/amiri/files/amiri-latin-400-normal.woff");

function analyzeRuns(text) {
  const arabicChar = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const isArabic = (ch) => arabicChar.test(ch);
  
  const runs = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const thisAr = isArabic(ch) || ch === " ";
    let j = i + 1;
    while (j < text.length) {
      const nextAr = isArabic(text[j]) || text[j] === " ";
      if (nextAr !== thisAr) break;
      j++;
    }
    runs.push({ text: text.slice(i, j), isArabic: thisAr });
    i = j;
  }
  return runs;
}

// Old string (currently in production)
const oldStr = "(09-06-2026 الى 09-06-2026) 1 يوم";
// New string (with swap)
const newStr = "(09-06-2026 الى 09-06-2026) يوم 1";

console.log("=== OLD STRING:", oldStr);
console.log("=== Runs (in placement order, LTR):");
let curX = 0;
const oldRuns = analyzeRuns(oldStr);
for (const r of oldRuns) {
  const f = r.isArabic ? amiriReg : amiriLatinReg;
  doc.font(f).fontSize(20);
  const w = doc.widthOfString(r.text);
  console.log(`  pos=${curX.toFixed(1)} width=${w.toFixed(1)} type=${r.isArabic ? "AR" : "LT"} text=${JSON.stringify(r.text)}`);
  curX += w;
}
console.log(`  -> rightmost element: ${JSON.stringify(oldRuns[oldRuns.length-1].text)}`);
console.log(`  -> Reading RTL (right to left): ${oldRuns.slice().reverse().map(r => r.text.trim()).filter(Boolean).join(" | ")}`);

console.log("\n=== NEW STRING:", newStr);
console.log("=== Runs (in placement order, LTR):");
curX = 0;
const newRuns = analyzeRuns(newStr);
for (const r of newRuns) {
  const f = r.isArabic ? amiriReg : amiriLatinReg;
  doc.font(f).fontSize(20);
  const w = doc.widthOfString(r.text);
  console.log(`  pos=${curX.toFixed(1)} width=${w.toFixed(1)} type=${r.isArabic ? "AR" : "LT"} text=${JSON.stringify(r.text)}`);
  curX += w;
}
console.log(`  -> rightmost element: ${JSON.stringify(newRuns[newRuns.length-1].text)}`);
console.log(`  -> Reading RTL (right to left): ${newRuns.slice().reverse().map(r => r.text.trim()).filter(Boolean).join(" | ")}`);

doc.end();
out.on("finish", () => console.log("\nPDF saved"));
