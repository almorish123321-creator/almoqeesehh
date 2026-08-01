// Test: render individual Arabic letters vs. the word, to see what PDFKit does
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const doc = new PDFDocument({ size: [800, 400], margin: 20 });
const chunks = [];
doc.on("data", (c) => chunks.push(c));
doc.on("end", () => {
  fs.writeFileSync("/tmp/letters-test.pdf", Buffer.concat(chunks));
  console.log("Saved /tmp/letters-test.pdf");
});

const fontAr = path.join(
  process.cwd(),
  "node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff",
);

let y = 20;

// Single letters (isolated form)
doc.font("Helvetica").fontSize(10).text("1. Single ي (yeh)", 20, y);
doc.font(fontAr).fontSize(24).text("ي", 200, y, { features: ["rtla"], align: "left", lineBreak: false });
y += 50;

doc.font("Helvetica").fontSize(10).text("2. Single و (waw)", 20, y);
doc.font(fontAr).fontSize(24).text("و", 200, y, { features: ["rtla"], align: "left", lineBreak: false });
y += 50;

doc.font("Helvetica").fontSize(10).text("3. Single م (meem)", 20, y);
doc.font(fontAr).fontSize(24).text("م", 200, y, { features: ["rtla"], align: "left", lineBreak: false });
y += 50;

// The word يوم
doc.font("Helvetica").fontSize(10).text("4. Word يوم (yeh-waw-meem)", 20, y);
doc.font(fontAr).fontSize(24).text("يوم", 200, y, { features: ["rtla"], align: "left", lineBreak: false });
y += 50;

// The word reversed (مو ي)
doc.font("Helvetica").fontSize(10).text("5. Word موي (meem-waw-yeh, reversed)", 20, y);
doc.font(fontAr).fontSize(24).text("موي", 200, y, { features: ["rtla"], align: "left", lineBreak: false });
y += 50;

// Single letters spaced out
doc.font("Helvetica").fontSize(10).text("6. م و ي (with spaces, should be RTL: ي first)", 20, y);
doc.font(fontAr).fontSize(24).text("م و ي", 200, y, { features: ["rtla"], align: "left", lineBreak: false });

doc.end();
