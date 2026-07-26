import PDFDocument from "pdfkit";
import fs from "fs";
import { arabicReshape, bidiGetDisplay, processArabicText } from "../src/lib/arabic-text";

async function main() {
  const doc = new PDFDocument({ size: [400, 200], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";

  const text = "رمز الإجازة";
  const reshaped = arabicReshape(text);
  const bidi = bidiGetDisplay(reshaped);
  const processed = processArabicText(text);  // reshape + bidi
  
  console.log("Original:", text);
  console.log("Reshaped:", reshaped);
  console.log("Bidi(reshaped):", bidi);
  console.log("Processed (reshape+bidi):", processed);
  
  // Render bidi version
  doc.font(fontArBold).fontSize(20).fillColor("#306db5");
  doc.text(bidi, 50, 50, { align: "left", lineBreak: false });
  doc.end();

  const chunks: Buffer[] = [];
  for await (const chunk of doc) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  fs.writeFileSync("/tmp/test-bidi.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-bidi.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
