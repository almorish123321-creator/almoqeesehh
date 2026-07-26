import PDFDocument from 'pdfkit';
import fs from 'fs';
import { arabicReshape } from '/home/z/my-project/src/lib/arabic-text.ts';

const fontAr = '/home/z/my-project/public/fonts/NotoSansArabic-Regular.ttf';
const doc = new PDFDocument({ size: [800, 200], margin: 10 });
doc.pipe(fs.createWriteStream('/tmp/nbsp-test.pdf'));

const text = `( 2026-06-09 ${arabicReshape("إلى")} 2026-06-09 )`;
doc.font(fontAr).fontSize(16).fillColor('black');

// Test 1: with regular spaces
doc.text(text, 20, 20, { lineBreak: false });

// Test 2: with NBSP
const textNbsp = text.replace(/ /g, '\u00A0');
doc.text(textNbsp, 20, 60, { lineBreak: false });

doc.end();
console.log('Saved');
