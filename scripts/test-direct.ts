import { processArabicText } from "../src/lib/arabic-text";

const text = "تاريخ الدخول";
const result = processArabicText(text);
console.log("Input:", text);
console.log("Output:", result);
console.log("Codes:", Array.from(result).map(c => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' '));
console.log("Char by char:");
for (const c of result) {
  console.log(`  '${c}' (U+${c.codePointAt(0)!.toString(16).toUpperCase()})`);
}
