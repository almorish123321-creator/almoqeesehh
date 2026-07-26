import PDFDocument from "pdfkit";
import fs from "fs";
import { arabicReshape, processArabicText } from "../src/lib/arabic-text";

async function main() {
  const text = "رمز الإجازة";
  const reshaped = arabicReshape(text);
  const bidi = processArabicText(text);
  
  console.log("Original:", text);
  console.log("Reshaped:", reshaped);
  console.log("Bidi:", bidi);
  
  // Test all combinations in one PDF
  const doc = new PDFDocument({ size: [800, 600], margins: { top: 20, bottom: 20, left: 20, right: 20 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";
  
  let y = 50;
  const drawText = (label: string, txt: string, opts: any = {}) => {
    doc.font(fontArBold).fontSize(20).fillColor("#000000");
    doc.text(txt, 200, y, { lineBreak: false, ...opts });
    doc.font("Helvetica").fontSize(12).fillColor("#888888");
    doc.text(label, 20, y + 5);
    y += 50;
  };
  
  // Test 1: Reshaped only, align left
  drawText("T1: reshaped, left", reshaped, { align: "left" });
  
  // Test 2: Reshaped only, align right
  drawText("T2: reshaped, right", reshaped, { align: "right" });
  
  // Test 3: Reshaped only, align center
  drawText("T3: reshaped, center", reshaped, { align: "center" });
  
  // Test 4: Bidi, align left
  drawText("T4: bidi, left", bidi, { align: "left" });
  
  // Test 5: Bidi, align right
  drawText("T5: bidi, right", bidi, { align: "right" });
  
  // Test 6: Bidi, align center
  drawText("T6: bidi, center", bidi, { align: "center" });
  
  doc.end();
  const chunks: Buffer[] = [];
  for await (const chunk of doc) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-options.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-options.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
