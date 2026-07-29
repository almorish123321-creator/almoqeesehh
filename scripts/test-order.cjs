const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const doc = new PDFDocument({ size: "A4", margin: 40 });
const out = fs.createWriteStream("/tmp/test-order.pdf");
doc.pipe(out);

const amiriReg = path.join(process.cwd(), "node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff");
const amiriLatinReg = path.join(process.cwd(), "node_modules/@fontsource/amiri/files/amiri-latin-400-normal.woff");

// Test A: "(dates) 1 يوم" - number BEFORE يوم in string
doc.font(amiriReg).fontSize(20).fillColor("#000000");
doc.text("A: (dates) 1 يوم", 40, 40, { features: ["rtla"], align: "left", width: 500 });

// Test B: "(dates) يوم 1" - يوم BEFORE number in string  
doc.text("B: (dates) يوم 1", 40, 80, { features: ["rtla"], align: "left", width: 500 });

// Now reproduce drawMixedText style for both orders
function drawMixed(text, x, y) {
  const fontSize = 20;
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
  
  // Measure widths
  let totalWidth = 0;
  const widths = runs.map(r => {
    const f = r.isArabic ? amiriReg : amiriLatinReg;
    doc.font(f).fontSize(fontSize);
    const w = doc.widthOfString(r.text);
    totalWidth += w;
    return w;
  });
  
  doc.font(amiriReg).fontSize(fontSize);
  const arabicH = doc.heightOfString("م");
  doc.font(amiriLatinReg).fontSize(fontSize);
  const latinH = doc.heightOfString("0");
  const yOffset = arabicH - latinH;
  
  let curX = x;
  for (let k = 0; k < runs.length; k++) {
    const r = runs[k];
    if (r.isArabic) {
      doc.font(amiriReg).fontSize(fontSize).fillColor("#000000");
      doc.text(r.text, curX, y, { features: ["rtla"], align: "left", lineBreak: false });
    } else {
      doc.font(amiriLatinReg).fontSize(fontSize).fillColor("#000000");
      doc.text(r.text, curX, y + yOffset, { align: "left", lineBreak: false });
    }
    curX += widths[k];
  }
}

// Test 1: "(dates) 1 يوم" — number first in string
drawMixed("(09-06-2026 الى 09-06-2026) 1 يوم", 40, 140);

// Test 2: "(dates) يوم 1" — يوم first in string  
drawMixed("(09-06-2026 الى 09-06-2026) يوم 1", 40, 200);

doc.end();
out.on("finish", () => console.log("PDF saved"));
