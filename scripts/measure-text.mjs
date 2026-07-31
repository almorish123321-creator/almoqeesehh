// Measure text widths to debug wrapping behavior
import PDFDocument from "pdfkit";

const doc = new PDFDocument({ size: "A3", margin: 40 });
const fontEnReg = "Times-Roman";

const subColW = 440 / 2; // = 220
const cellW = subColW - 30; // = 190
const padding = 4;
const availableWidth = cellW - padding * 2; // = 182

const testNames = [
  "TALIN MARIE AWAD AL-QAHTANI",
  "NABIL HANNA NASR HANNA",
  "NABIL HANNA",
  "AHMED MOHAMMED ALSAEED",
  "TALIN MARIE AWAD",
  "AL-QAHTANI",
];

console.log(`Available width: ${availableWidth}pt (cellW=${cellW}, padding=${padding})`);
console.log("");

for (const name of testNames) {
  doc.font(fontEnReg).fontSize(14);
  const w = doc.widthOfString(name);
  const fits = w <= availableWidth;
  console.log(`"${name}"`);
  console.log(`  width=${w}pt, fits=${fits}, words=${name.split(" ").length}`);
}

doc.end();
