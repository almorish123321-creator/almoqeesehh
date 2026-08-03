// Debug: check what processArabicBiDi produces for various inputs
// to understand why the LRM-prefixed Arabic-first string still shows
// digits on the left.

import arabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";

const bidiEngine = bidiFactory();

function processArabicBiDi(text) {
  if (!text) return "";
  try {
    const reshaped = arabicReshaper.convertArabic(text);
    const levels = bidiEngine.getEmbeddingLevels(reshaped);
    return bidiEngine.getReorderedString(reshaped, levels);
  } catch (e) {
    return text;
  }
}

const LRM = "\u200e";
const licNum = "1410101201200443";

const tests = [
  { name: "old (digits first)",        input: `${licNum} : رقم الترخيص` },
  { name: "new (arabic first + LRM)",  input: `${LRM}رقم الترخيص : ${licNum}` },
  { name: "arabic first, no LRM",      input: `رقم الترخيص : ${licNum}` },
  { name: "arabic first, RLE wrap",    input: `\u202bرقم الترخيص : ${licNum}\u202c` },
  { name: "digits first, LRE wrap",    input: `\u202a${licNum} : رقم الترخيص\u202c` },
];

const CF_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;

for (const t of tests) {
  const visual = processArabicBiDi(t.input);
  const stripped = visual.replace(CF_REGEX, "");
  // Classify each char position
  const isAr = (ch) => {
    const cp = ch.codePointAt(0) || 0;
    return (cp >= 0x600 && cp <= 0x6ff) || (cp >= 0xfb50 && cp <= 0xfdff) || (cp >= 0xfe70 && cp <= 0xfeff);
  };
  const positions = [];
  for (const ch of stripped) {
    if (ch === " ") positions.push("·");
    else if (/[0-9]/.test(ch)) positions.push("D");
    else if (ch === ":") positions.push(":");
    else if (isAr(ch)) positions.push("A");
    else positions.push(ch);
  }
  console.log("---");
  console.log(`NAME:    ${t.name}`);
  console.log(`INPUT:   ${JSON.stringify(t.input)}`);
  console.log(`VISUAL:  ${JSON.stringify(visual)}`);
  console.log(`STRIPPED:${JSON.stringify(stripped)}`);
  console.log(`L-to-R:  ${positions.join(" ")}`);
  // Print first and last non-space char
  const trimmed = stripped.trim();
  if (trimmed) {
    console.log(`LEFTMOST: ${JSON.stringify(trimmed[0])}  RIGHTMOST: ${JSON.stringify(trimmed[trimmed.length - 1])}`);
  }
}

// Also test the actual bidi base direction detection
console.log("\n=== Base direction detection ===");
const tests2 = [
  { name: "digits first",           input: `${licNum} : رقم الترخيص` },
  { name: "arabic first",           input: `رقم الترخيص : ${licNum}` },
  { name: "LRM + arabic first",     input: `${LRM}رقم الترخيص : ${licNum}` },
  { name: "LRM + digits first",     input: `${LRM}${licNum} : رقم الترخيص` },
];
for (const t of tests2) {
  try {
    const levels = bidiEngine.getEmbeddingLevels(t.input);
    // The base level is in levels.paragraphLevel (0 = LTR, 1 = RTL)
    console.log(`${t.name.padEnd(30)} → paragraphLevel=${levels.paragraphLevel} (${levels.paragraphLevel === 0 ? "LTR" : "RTL"})`);
  } catch (e) {
    console.log(`${t.name} → ERROR: ${e.message}`);
  }
}
