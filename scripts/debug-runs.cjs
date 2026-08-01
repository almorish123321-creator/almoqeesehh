// Debug: trace what drawMixedText actually does with the duration string
const LRM = "\u200e";
const startDateFormatted = "09-06-2026";
const endDateFormatted = "10-06-2026";
const durationArLogical =
  `2 يوم ( ${LRM}${startDateFormatted}${LRM} إلى ${LRM}${endDateFormatted}${LRM} )`;

// Strip Cf chars (same as drawMixedText)
const CF_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;
const text = durationArLogical.replace(CF_REGEX, "");

console.log("After Cf-strip:", JSON.stringify(text));
console.log("Chars:");
for (let i = 0; i < text.length; i++) {
  const ch = text[i];
  const cp = ch.codePointAt(0);
  console.log(`  [${i}] U+${cp.toString(16).toUpperCase().padStart(4, "0")}  ${ch}`);
}

// Mimic drawMixedText's run tokenizer
const arabicChar = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
const isArabicChar = (ch) => arabicChar.test(ch);

const runs = [];
let i = 0;
while (i < text.length) {
  const ch = text[i];
  const thisArabic = isArabicChar(ch) || ch === " ";
  let j = i + 1;
  while (j < text.length) {
    const nextArabic = isArabicChar(text[j]) || text[j] === " ";
    if (nextArabic !== thisArabic) break;
    j++;
  }
  runs.push({ text: text.slice(i, j), isArabic: thisArabic });
  i = j;
}

console.log("\n=== Runs ===");
runs.forEach((r, idx) => {
  console.log(`  Run[${idx}] isArabic=${r.isArabic} text=${JSON.stringify(r.text)}`);
});
