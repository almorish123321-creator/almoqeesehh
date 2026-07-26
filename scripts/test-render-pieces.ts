import PDFDocument from "pdfkit";
import fs from "fs";
import { processArabicText, safeArabicMixed } from "../src/lib/arabic-text";

async function main() {
  const doc = new PDFDocument({ size: [600, 400], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";

  const text = "رمز الإجازة";
  const processed = processArabicText(text);
  console.log("Original:", text);
  console.log("Processed (visual):", processed);
  console.log("Codes:", Array.from(processed).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));

  // Split into words at space
  const words = processed.split(' ');
  console.log("Words:", words);

  // Render each word as a single text call (with space between)
  doc.font(fontArBold).fontSize(20).fillColor("#306db5");
  let x = 50;
  let y = 50;
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;
    const w = doc.widthOfString(word);
    console.log(`  Word ${i}: '${word}' width=${w}`);
    doc.text(word, x, y, { lineBreak: false, features: [] });
    x += w + 10; // space between words
  }
  doc.end();
  const chunks: Buffer[] = [];
  for await (const chunk of doc) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-words.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-words.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
