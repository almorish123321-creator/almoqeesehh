import PDFDocument from "pdfkit";
import fs from "fs";
import { arabicReshape, processArabicText } from "../src/lib/arabic-text";

async function main() {
  const doc = new PDFDocument({ size: [600, 400], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";

  const text = "رمز الإجازة";
  
  // Test 1: Reshaped ONLY (logical order, no bidi)
  const reshaped = arabicReshape(text);
  console.log("Test 1 - Reshaped (logical):", reshaped);
  console.log("  codes:", Array.from(reshaped).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));
  
  doc.font(fontArBold).fontSize(30).fillColor("#306db5");
  doc.text(reshaped, 50, 50, { lineBreak: false });
  doc.text("Test 1 ↑", 50, 100);
  doc.end();
  const chunks: Buffer[] = [];
  for await (const chunk of doc) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-logical.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-logical.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
