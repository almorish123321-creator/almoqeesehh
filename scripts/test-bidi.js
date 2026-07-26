// Test bidi-js on mixed Arabic + Latin text to understand the visual order
// it produces. This will inform how we should lay out the pieces in the PDF.

const bidiFactory = require("bidi-js");
const bidi = bidiFactory();

const tests = [
  "1 يوم",
  "( 2026-06-09 إلى 2026-06-15 )",
  "1 يوم ( 2026-06-09 إلى 2026-06-15 )",
  "إلى",
  "يوم",
  "محمد علي",
  "تقرير إجازة مرضية",
  "( 2026-06-09 إلى 2026-06-15 ) 1 يوم",
];

for (const text of tests) {
  console.log("==================================================");
  console.log("Input (logical):", JSON.stringify(text));
  console.log("Code points:", Array.from(text).map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join(' '));

  try {
    const result = bidi.getEmbeddingLevels(text);
    console.log("Paragraph levels:", result.paragraphs.map(p => `level=${p.level}`).join(', '));
    const hasRtl = result.paragraphs.some(p => p.level % 2 === 1);
    console.log("Has RTL:", hasRtl);

    if (hasRtl) {
      const reordered = bidi.getReorderedString(text, result);
      console.log("Visual (reordered):", JSON.stringify(reordered));
      console.log("Visual code points:", Array.from(reordered).map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join(' '));
    } else {
      console.log("(No RTL — string unchanged)");
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}
