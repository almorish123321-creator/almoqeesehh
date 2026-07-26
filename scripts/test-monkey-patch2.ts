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
  
  if (wrappedFont && wrappedFont.font) {
    // Override the position method of the OTLayoutEngine
    // Actually, override the engine's position to NOT reverse glyphs
    const engine = wrappedFont.font._layoutEngine?.engine;
    if (engine && engine.position) {
      const origPosition = engine.position.bind(engine);
      engine.position = (glyphRun: any) => {
        // Save original direction
        const origDir = glyphRun.direction;
        // Force LTR to prevent reversal
        glyphRun.direction = 'ltr';
        const result = origPosition(glyphRun);
        // Restore
        glyphRun.direction = origDir;
        return result;
      };
      console.log("Patched engine.position to prevent RTL reversal");
    }
  }
  
  const text = "رمز الإجازة";
  const processed = processArabicText(text);
  console.log("Processed codes:", Array.from(processed).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));
  
  doc.fontSize(20).fillColor("#306db5");
  doc.text(processed, 50, 50, { lineBreak: false });
  doc.end();
  const chunks: Buffer[] = [];
  for await (const chunk of doc) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  fs.writeFileSync("/tmp/test-monkey.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/test-monkey.pdf");
}

main().catch(e => { console.error(e); process.exit(1); });
