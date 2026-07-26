import PDFDocument from "pdfkit";
import fs from "fs";
import { processArabicText } from "../src/lib/arabic-text";

async function main() {
  // Try writing text char-by-char at absolute positions
  const doc = new PDFDocument({ size: [400, 200], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";

  const text = "رمز الإجازة";
  const processed = processArabicText(text);
  console.log("Processed:", processed);
  console.log("Codes:", Array.from(processed).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));

  // Render each character at increasing X positions
  doc.font(fontArBold).fontSize(20).fillColor("#306db5");
  let x = 50;
  for (const ch of processed) {
    const w = doc.widthOfString(ch);
    doc.text(ch, x, 50, { lineBreak: false, features: [] });
    x += w;
  }
  doc.end();
  const chunks: Buffer[] = [];
  for await (const chunk of doc) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-bidi4.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-bidi4.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
