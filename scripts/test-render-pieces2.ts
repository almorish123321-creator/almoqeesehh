import PDFDocument from "pdfkit";
import fs from "fs";
import { processArabicText } from "../src/lib/arabic-text";

async function main() {
  const doc = new PDFDocument({ size: [600, 400], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";

  const text = "رمز الإجازة";
  const processed = processArabicText(text);
  console.log("Processed:", processed);

  // Render each CHARACTER at computed position
  doc.font(fontArBold).fontSize(20).fillColor("#306db5");
  let x = 50;
  for (const ch of processed) {
    const w = doc.widthOfString(ch);
    console.log(`  char='${ch}' (U+${ch.codePointAt(0)!.toString(16)}) width=${w}`);
    // Use continued:true to chain text
    doc.text(ch, x, 50, { lineBreak: false, features: [] });
    x += w;
  }
  doc.end();
  const chunks: Buffer[] = [];
  for await (const chunk of doc) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-chars.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-chars.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
