import PDFDocument from "pdfkit";
import fs from "fs";
import { processArabicText } from "../src/lib/arabic-text";

async function main() {
  // Test 1: BIDI-applied text (visual order)
  const doc1 = new PDFDocument({ size: [400, 200], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";

  const text = "رمز الإجازة";
  const processed = processArabicText(text);  // reshape + bidi → visual order
  console.log("Original:", text);
  console.log("Processed (visual):", processed);
  console.log("Codes:", Array.from(processed).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));

  doc1.font(fontArBold).fontSize(20).fillColor("#306db5");
  // Use align: left, no features
  doc1.text(processed, 50, 50, { align: "left", lineBreak: false });
  doc1.end();
  const chunks1: Buffer[] = [];
  for await (const chunk of doc1) chunks1.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-bidi2.pdf", Buffer.concat(chunks1));
  console.log("Saved /tmp/test-bidi2.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
