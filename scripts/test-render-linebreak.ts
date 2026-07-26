import PDFDocument from "pdfkit";
import fs from "fs";
import { processArabicText } from "../src/lib/arabic-text";

async function main() {
  const doc = new PDFDocument({ size: [600, 400], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";

  const text = "رمز الإجازة";
  const processed = processArabicText(text);
  console.log("Processed:", processed);

  // Test WITHOUT features option
  doc.font(fontArBold).fontSize(20).fillColor("#306db5");
  doc.text(processed, 50, 50, { 
    lineBreak: false,
    // No features option
  });
  doc.end();
  const chunks: Buffer[] = [];
  for await (const chunk of doc) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-nofeat.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-nofeat.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
