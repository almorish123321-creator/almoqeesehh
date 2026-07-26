import PDFDocument from 'pdfkit';
import fs from 'fs';

const fontAr = '/home/z/my-project/public/fonts/NotoSansArabic-Regular.ttf';
const doc = new PDFDocument({ size: [400, 200], margin: 10 });
doc.pipe(fs.createWriteStream('/tmp/paren-test.pdf'));

doc.font(fontAr).fontSize(20).fillColor('black');
doc.text("(", 20, 20, { align: "left", lineBreak: false });
doc.text(")", 50, 20, { align: "left", lineBreak: false });
doc.text("2026-06-09", 80, 20, { align: "left", lineBreak: false });

doc.end();
console.log('Saved');
