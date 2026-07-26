import PDFDocument from "pdfkit";
import fs from "fs";
import { processArabicText } from "../src/lib/arabic-text";

async function main() {
  const doc = new PDFDocument({ size: [600, 400], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";

  // Set the font first
  doc.font(fontArBold);
  
  // Access the underlying fontkit font object
  const wrappedFont = (doc as any)._font;
  
  // Override the _layoutEngine.layout method
  if (wrappedFont && wrappedFont.font && wrappedFont.font._layoutEngine) {
    const le = wrappedFont.font._layoutEngine;
    const origLayout = le.layout.bind(le);
    le.layout = (string: any, features: any, script: any, language: any, direction: any) => {
      // Force direction to 'ltr' to prevent RTL glyph reversal
      return origLayout(string, features, script, language, 'ltr');
    };
    console.log("Patched _layoutEngine.layout to force LTR");
  }
  
  const text = "رمز الإجازة";
  const processed = processArabicText(text);
  console.log("Processed codes:", Array.from(processed).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));
  
  doc.fontSize(20).fillColor("#306db5");
  doc.text(processed, 50, 50, { lineBreak: false });
  doc.end();
  const chunks: Buffer[] = [];
  for await (const chunk of doc) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-monkey3.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-monkey3.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
