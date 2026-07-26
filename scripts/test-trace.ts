import PDFDocument from "pdfkit";
import fs from "fs";
import { processArabicText } from "../src/lib/arabic-text";

async function main() {
  const doc = new PDFDocument({ size: [400, 200], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";

  const text = "تاريخ الدخول";
  const processed = processArabicText(text);
  console.log("Input:", text);
  console.log("Processed codes:", Array.from(processed).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));
  // Replace spaces with NBSP
  const withNbsp = processed.replace(/ /g, "\u00A0");
  console.log("With NBSP codes:", Array.from(withNbsp).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));
  
  doc.font(fontArBold).fontSize(20).fillColor("#306db5");
  doc.text(withNbsp, 50, 50, { lineBreak: false, align: "left" });
  doc.end();
  const chunks: Buffer[] = [];
  for await (const chunk of doc) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-trace.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-trace.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
