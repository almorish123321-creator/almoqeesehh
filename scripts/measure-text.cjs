const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const FONT_AR_REG = path.join(process.cwd(), "public", "fonts", "NotoSansArabic-Regular.ttf");
const fontArReg = fs.existsSync(FONT_AR_REG) ? FONT_AR_REG : "Helvetica";

const doc = new PDFDocument({ size: [841.89, 1150] });
doc.font(fontArReg);

const text = "يوم 1 ( 2026-06-09 إلى 2026-06-09 )";

// Test at fontSize 12 (which is durFontSize - 1 = 13 - 1 = 12)
doc.fontSize(12);
const w = doc.widthOfString(text);
console.log(`Text: "${text}"`);
console.log(`Font size: 12, Width: ${w}pt`);
console.log(`Cell width (subColW - 20 = 220 - 20): 200pt`);
console.log(`Overflow: ${w > 200 ? 'YES by ' + (w-200) + 'pt' : 'No'}`);
console.log('');

// Try at fontSize 13
doc.fontSize(13);
const w13 = doc.widthOfString(text);
console.log(`Font size: 13, Width: ${w13}pt`);
console.log(`Overflow: ${w13 > 200 ? 'YES by ' + (w13-200) + 'pt' : 'No'}`);
console.log('');

// Also measure without parentheses-spacing
const text2 = "يوم 1 (2026-06-09 إلى 2026-06-09)";
doc.fontSize(12);
const w2 = doc.widthOfString(text2);
console.log(`Text (no spaces in parens): "${text2}"`);
console.log(`Font size: 12, Width: ${w2}pt`);
console.log(`Overflow: ${w2 > 200 ? 'YES by ' + (w2-200) + 'pt' : 'No'}`);
