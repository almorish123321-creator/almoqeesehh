import PDFDocument from 'pdfkit';
import fs from 'fs';
import { arabicReshape } from '/home/z/my-project/src/lib/arabic-text.ts';

const fontAr = '/home/z/my-project/public/fonts/NotoSansArabic-Regular.ttf';
const doc = new PDFDocument({ size: [800, 200], margin: 10 });
doc.pipe(fs.createWriteStream('/tmp/pdfkit-test.pdf'));

// Test 1: date part only, with arabicReshape
const text1 = `( 2026-06-09 ${arabicReshape("إلى")} 2026-06-09 )`;
doc.font(fontAr).fontSize(16).fillColor('black');
doc.text(text1, 20, 20, { lineBreak: false });

// Test 2: number part only
const text2 = `1 ${arabicReshape("يوم")}`;
doc.text(text2, 20, 60, { lineBreak: false });

// Test 3: just dates, no Arabic
doc.text("( 2026-06-09 - 2026-06-09 )", 20, 100, { lineBreak: false });

// Test 4: dates with Arabic ALL through processArabicText
import { processArabicText } from '/home/z/my-project/src/lib/arabic-text.ts';
const text4 = processArabicText("( 2026-06-09 إلى 2026-06-09 )");
doc.text(text4, 20, 140, { lineBreak: false });

doc.end();
console.log('Test PDF saved');
