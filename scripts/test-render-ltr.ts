import PDFDocument from "pdfkit";
import fs from "fs";
import { processArabicText } from "../src/lib/arabic-text";

async function main() {
  const doc = new PDFDocument({ size: [600, 400], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
  // Use registerFile with a font that doesn't trigger RTL detection
  // Actually let's try monkey-patching the font's layout method
  const fontArBold = "/home/z/my-project/public/fonts/NotoSansArabic-Bold.ttf";
  
  // Register the font
  doc.registerFont('NotoArabic', fontArBold);
  doc.font('NotoArabic');
  
  // Access the underlying font object and override its layout
  const wrappedFont = (doc as any)._font;
  console.log("Font object:", wrappedFont);
  console.log("Font layout:", typeof wrappedFont.font?.layout);
  
  if (wrappedFont.font && wrappedFont.font.layout) {
    const origLayout = wrappedFont.font.layout.bind(wrappedFont.font);
    wrappedFont.font.layout = (text: string, features: any, script?: string, language?: string, direction?: string) => {
      // Force direction to 'ltr' to prevent RTL reversal
      return origLayout(text, features, script, language, 'ltr');
    };
    console.log("Patched font.layout to force LTR direction");
  }
  
  const text = "رمز الإجازة";
  const processed = processArabicText(text);
  console.log("Processed codes:", Array.from(processed).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));
  
  doc.fontSize(20).fillColor("#306db5");
  doc.text(processed, 50, 50, { lineBreak: false });
  doc.end();
  const chunks: Buffer[] = [];
  for await (const chunk of doc) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-ltr.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-ltr.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
