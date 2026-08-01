// Test: does PDFKit reverse pre-shaped Arabic runs?
// We pass the BiDi-processed string and see what visually renders.
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const doc = new PDFDocument({ size: [400, 400], margin: 20 });
const chunks = [];
doc.on("data", (c) => chunks.push(c));
doc.on("end", () => {
  fs.writeFileSync("/tmp/bidi-test.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/bidi-test.pdf");
});

const fontAr = path.join(
  process.cwd(),
  "node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff",
);

// Pre-shaped strings (presentation forms) as produced by arabic-reshaper + bidi-js.
// These are already in visual LTR order: leftmost char in string = leftmost char on page.
// For "يوم" the visual LTR sequence is ﻡ ﻮ ﻳ (final, medial, initial)
// For "إلى" the visual LTR sequence is ﻰ ﻟ ﺇ (final, medial, initial)
const youm_pres = "\uFEE1\uFEEE\uFEF3"; // ﻡﻮﻳ → should display as "يوم" reading RTL
const ila_pres  = "\uFEF0\uFEDF\uFE87"; // ﻰﻟﺇ → should display as "إلى" reading RTL

let y = 20;
const line = (label, s, opts = {}) => {
  doc.font("Helvetica").fontSize(10).text(label, 20, y);
  doc.font(fontAr).fontSize(20).text(s, 200, y, { features: [], align: "left", lineBreak: false, ...opts });
  y += 40;
};

line("1. ﻡﻮﻳ (pres forms, no rtla)", youm_pres);
line("2. ﻡﻮﻳ (pres forms, with rtla)", youm_pres, { features: ["rtla"] });
line("3. ﻰﻟﺇ (pres forms, no rtla)", ila_pres);
line("4. ﻰﻟﺇ (pres forms, with rtla)", ila_pres, { features: ["rtla"] });
// Reverse the pre-shaped string and pass to PDFKit (test if PDFKit reverses it)
line("5. ﻳﻮﻡ reversed-input, no rtla", "\uFEF3\uFEEE\uFEE1");
line("6. ﻳﻮﻡ reversed-input, with rtla", "\uFEF3\uFEEE\uFEE1", { features: ["rtla"] });
// Original logical order (unshaped)
line("7. يوم logical, no rtla", "\u064A\u0648\u0645");
line("8. يوم logical, with rtla", "\u064A\u0648\u0645", { features: ["rtla"] });

doc.end();
