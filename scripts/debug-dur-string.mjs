// Debug: print the duration Arabic string at each processing step.
import arabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";

const bidiEngine = bidiFactory();

const LRM = "\u200e";
const startDateFormatted = "09-06-2026";
const endDateFormatted = "10-06-2026";

const durationArLogical =
  `2 يوم ( ${LRM}${startDateFormatted}${LRM} إلى ${LRM}${endDateFormatted}${LRM} )`;

console.log("=== Logical input ===");
console.log("Raw    :", JSON.stringify(durationArLogical));
console.log("Visible:", durationArLogical);
console.log("Codepoints:");
for (const ch of durationArLogical) {
  const cp = ch.codePointAt(0);
  console.log(`  U+${cp.toString(16).toUpperCase().padStart(4, "0")}  ${ch}`);
}

const reshaped = arabicReshaper.convertArabic(durationArLogical);
console.log("\n=== After arabic-reshaper ===");
console.log("Raw    :", JSON.stringify(reshaped));
console.log("Codepoints:");
for (const ch of reshaped) {
  const cp = ch.codePointAt(0);
  console.log(`  U+${cp.toString(16).toUpperCase().padStart(4, "0")}  ${ch}`);
}

const levels = bidiEngine.getEmbeddingLevels(reshaped);
const visual = bidiEngine.getReorderedString(reshaped, levels);
console.log("\n=== After bidi-js (final string passed to PDFKit) ===");
console.log("Raw    :", JSON.stringify(visual));
console.log("Visible:", visual);
console.log("Codepoints:");
for (const ch of visual) {
  const cp = ch.codePointAt(0);
  console.log(`  U+${cp.toString(16).toUpperCase().padStart(4, "0")}  ${ch}`);
}
