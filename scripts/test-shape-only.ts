import PDFDocument from "pdfkit";
import fs from "fs";
import { arabicReshape } from "../src/lib/arabic-text";

async function main() {
  const doc = new PDFDocument({ size: [400, 200], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";

  const text = "رمز الإجازة";
  const reshaped = arabicReshape(text);
  console.log("Original:", text);
  console.log("Reshaped:", reshaped);
  console.log("Reshaped codes:", Array.from(reshaped).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));

  doc.font(fontArBold).fontSize(20).fillColor("#306db5");
  doc.text(reshaped, 50, 50, { align: "left", lineBreak: false });
  doc.end();

  const chunks: Buffer[] = [];
  for await (const chunk of doc) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  fs.writeFileSync("/tmp/test-shape-only.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-shape-only.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
