const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const doc = new PDFDocument({ size: "A4", margin: 40 });
const out = fs.createWriteStream("/tmp/test-license.pdf");
doc.pipe(out);

const amiriReg = path.join(process.cwd(), "node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff");
const amiriBold = path.join(process.cwd(), "node_modules/@fontsource/amiri/files/amiri-arabic-700-normal.woff");
const amiriLatinReg = path.join(process.cwd(), "node_modules/@fontsource/amiri/files/amiri-latin-400-normal.woff");
const amiriLatinBold = path.join(process.cwd(), "node_modules/@fontsource/amiri/files/amiri-latin-700-normal.woff");
const notoReg = path.join(process.cwd(), "node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff");
const notoBold = path.join(process.cwd(), "node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-700-normal.woff");

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

const fullLine = `1410101201200443 : رقم الترخيص`;
console.log("=== TEXT:", fullLine);
console.log("=== Runs (placement order, LTR):");
const runs = analyzeRuns(fullLine);
const arFont = notoBold, latFont = "Times-Bold";
let curX = 0;
for (const r of runs) {
  const f = r.isArabic ? arFont : latFont;
  doc.font(f).fontSize(12);
  const w = doc.widthOfString(r.text);
  console.log(`  pos=${curX.toFixed(1)} width=${w.toFixed(1)} type=${r.isArabic ? "AR" : "LT"} text=${JSON.stringify(r.text)}`);
  curX += w;
}
console.log(`  -> rightmost element: ${JSON.stringify(runs[runs.length-1].text)}`);
console.log(`  -> Reading RTL: ${runs.slice().reverse().map(r => r.text.trim()).filter(Boolean).join(" | ")}`);

doc.end();
out.on("finish", () => console.log("done"));
