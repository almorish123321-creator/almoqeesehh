// Test: render "يوم" with presentation forms in LOGICAL order (no BiDi)
// to see if PDFKit reverses them or not.
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import arabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";

const bidiEngine = bidiFactory();

const doc = new PDFDocument({ size: [600, 400], margin: 20 });
const chunks = [];
doc.on("data", (c) => chunks.push(c));
doc.on("end", () => {
  fs.writeFileSync("/tmp/pres-test.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/pres-test.pdf");
});

const fontAr = path.join(
  process.cwd(),
  "node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff",
);

// Test strings
const logical = "يوم";
const reshaped = arabicReshaper.convertArabic(logical); // presentation forms, logical order
const levels = bidiEngine.getEmbeddingLevels(reshaped);
const bidiVisual = bidiEngine.getReorderedString(reshaped, levels); // BiDi-reversed

console.log("Logical:  ", JSON.stringify(logical), "codepoints:", [...logical].map(c => `U+${c.codePointAt(0).toString(16).toUpperCase()}`).join(" "));
console.log("Reshaped: ", JSON.stringify(reshaped), "codepoints:", [...reshaped].map(c => `U+${c.codePointAt(0).toString(16).toUpperCase()}`).join(" "));
console.log("BiDi vis: ", JSON.stringify(bidiVisual), "codepoints:", [...bidiVisual].map(c => `U+${c.codePointAt(0).toString(16).toUpperCase()}`).join(" "));

let y = 20;
const line = (label, text, opts = {}) => {
  doc.font("Helvetica").fontSize(10).text(label, 20, y);
  doc.font(fontAr).fontSize(24).text(text, 350, y, { features: [], align: "left", lineBreak: false, ...opts });
  y += 50;
};

// Test 1: Logical order (basic chars), no rtla
line("1. Logical ي و م, no rtla", logical);

// Test 2: Logical order (basic chars), with rtla
line("2. Logical ي و م, with rtla", logical, { features: ["rtla"] });

// Test 3: Reshaped (presentation forms, logical order), no rtla
line("3. Reshaped ﻳ ﻮ ﻡ (logical), no rtla", reshaped);

// Test 4: Reshaped (presentation forms, logical order), with rtla
line("4. Reshaped ﻳ ﻮ ﻡ (logical), with rtla", reshaped, { features: ["rtla"] });

// Test 5: BiDi visual (presentation forms, reversed), no rtla
line("5. BiDi vis ﻡ ﻮ ﻳ (reversed), no rtla", bidiVisual);

// Test 6: BiDi visual (presentation forms, reversed), with rtla
line("6. BiDi vis ﻡ ﻮ ﻳ (reversed), with rtla", bidiVisual, { features: ["rtla"] });

doc.end();
