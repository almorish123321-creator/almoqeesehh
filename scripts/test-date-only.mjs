import PDFDocument from 'pdfkit';
import fs from 'fs';
import { arabicReshape } from '/home/z/my-project/src/lib/arabic-text.ts';

const fontAr = '/home/z/my-project/public/fonts/NotoSansArabic-Regular.ttf';
const doc = new PDFDocument({ size: [800, 300], margin: 10 });
doc.pipe(fs.createWriteStream('/tmp/date-only.pdf'));

const datePart = `( 2026-06-09 ${arabicReshape("إلى")} 2026-06-09 )`;
const datePartNbsp = datePart.replace(/ /g, '\u00A0');
doc.font(fontAr).fontSize(16).fillColor('black');

// Test 1: simple lineBreak:false
doc.text(datePartNbsp, 20, 20, { lineBreak: false });

// Test 2: align:"left" with width
doc.text(datePartNbsp, 20, 60, { width: 300, align: 'left', lineBreak: false });

// Test 3: align:"center" with width
doc.text(datePartNbsp, 20, 100, { width: 300, align: 'center', lineBreak: false });

// Test 4: align:"right" with width
doc.text(datePartNbsp, 20, 140, { width: 300, align: 'right', lineBreak: false });

// Test 5: number part
doc.text(`1 ${arabicReshape("يوم")}`, 20, 180, { lineBreak: false });
doc.text(`1 ${arabicReshape("يوم")}`, 20, 220, { width: 200, align: 'left', lineBreak: false });

doc.end();
console.log('Saved');
