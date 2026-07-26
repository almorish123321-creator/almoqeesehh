import PDFDocument from "pdfkit";
import fs from "fs";
import { processArabicText } from "../src/lib/arabic-text";

async function main() {
  // Try with features: ["ccmp", "liga"] explicitly to disable rtlm
  const doc = new PDFDocument({ size: [400, 200], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";

  const text = "رمز الإجازة";
  const processed = processArabicText(text);
  console.log("Processed codes:", Array.from(processed).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));

  doc.font(fontArBold).fontSize(20).fillColor("#306db5");
  // Try explicitly disabling features
  doc.text(processed, 50, 50, { 
    align: "left", 
    lineBreak: false,
    features: []  // Disable all features
  });
  doc.end();
  const chunks: Buffer[] = [];
  for await (const chunk of doc) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-bidi3.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-bidi3.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
