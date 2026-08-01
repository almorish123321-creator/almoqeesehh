// Test: render just the words يوم and إلى in isolation
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const doc = new PDFDocument({ size: [400, 600], margin: 20 });
const chunks = [];
doc.on("data", (c) => chunks.push(c));
doc.on("end", () => {
  fs.writeFileSync("/tmp/word-test.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/word-test.pdf");
});

const fontAr = path.join(
  process.cwd(),
  "node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff",
);

// Test cases - each renders one Arabic word with different approaches
let y = 20;

// Approach 1: doc.text with rtla, logical order
doc.font("Helvetica").fontSize(10).text("1. يوم with rtla, align:left", 20, y);
doc.font(fontAr).fontSize(24).text("يوم", 250, y, {
  features: ["rtla"], align: "left", lineBreak: false
});
y += 50;

// Approach 2: doc.text without rtla, logical order
doc.font("Helvetica").fontSize(10).text("2. يوم no rtla, align:left", 20, y);
doc.font(fontAr).fontSize(24).text("يوم", 250, y, {
  features: [], align: "left", lineBreak: false
});
y += 50;

// Approach 3: doc.text with rtla, align:right
doc.font("Helvetica").fontSize(10).text("3. يوم with rtla, align:right", 20, y);
doc.font(fontAr).fontSize(24).text("يوم", 250, y, {
  features: ["rtla"], align: "right", lineBreak: false, width: 130
});
y += 50;

// Approach 4: إلى with rtla, align:left
doc.font("Helvetica").fontSize(10).text("4. إلى with rtla, align:left", 20, y);
doc.font(fontAr).fontSize(24).text("إلى", 250, y, {
  features: ["rtla"], align: "left", lineBreak: false
});
y += 50;

// Approach 5: إلى without rtla, align:left
doc.font("Helvetica").fontSize(10).text("5. إلى no rtla, align:left", 20, y);
doc.font(fontAr).fontSize(24).text("إلى", 250, y, {
  features: [], align: "left", lineBreak: false
});
y += 50;

// Approach 6: full duration line with rtla
doc.font("Helvetica").fontSize(10).text("6. Full line, no rtla", 20, y);
doc.font(fontAr).fontSize(13).text("2 يوم ( 09-06-2026 إلى 10-06-2026 )", 250, y, {
  features: [], align: "left", lineBreak: false
});
y += 50;

// Approach 7: full duration line with rtla
doc.font("Helvetica").fontSize(10).text("7. Full line, with rtla", 20, y);
doc.font(fontAr).fontSize(13).text("2 يوم ( 09-06-2026 إلى 10-06-2026 )", 250, y, {
  features: ["rtla"], align: "left", lineBreak: false
});

doc.end();
