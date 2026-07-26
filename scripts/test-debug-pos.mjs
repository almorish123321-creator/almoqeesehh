// Just check if openParen renders at the computed position
import PDFDocument from 'pdfkit';
import fs from 'fs';
import { arabicReshape } from '/home/z/my-project/src/lib/arabic-text.ts';

const fontAr = '/home/z/my-project/public/fonts/NotoSansArabic-Regular.ttf';
const doc = new PDFDocument({ size: [806, 100], margin: 0 });
doc.pipe(fs.createWriteStream('/tmp/pos-test.pdf'));

// Replicate the cell 3 layout
const COL_X = [35, 200, 435, 670, 806];
const COL_W = [COL_X[1] - COL_X[0], COL_X[2] - COL_X[1], COL_X[3] - COL_X[2], COL_X[4] - COL_X[3]];
const cellX = COL_X[2] + 10;
const cellW = COL_W[2] - 20;
const y = 30;
const cellH = 42.5;

const startDateAr = "2026-06-09";
const endDateAr = "2026-06-09";
const arabicIla = arabicReshape("إلى");
const arabicYawm = arabicReshape("يوم");
const numStr = "1";

doc.font(fontAr).fontSize(11).fillColor('white');
// Background
doc.rect(cellX, y, cellW, cellH).fill('#2b3d77');

const gap = 3;
const wParen = doc.widthOfString("(");
const wDate1 = doc.widthOfString(startDateAr);
const wIla = doc.widthOfString(arabicIla);
const wDate2 = doc.widthOfString(endDateAr);
const wCloseParen = doc.widthOfString(")");
const wNum = doc.widthOfString(numStr);
const wYawm = doc.widthOfString(arabicYawm);

const datesGroupW = wParen + wDate1 + wIla + wDate2 + wCloseParen + gap * 4;
const numberGroupW = wNum + wYawm + gap;
const totalW = datesGroupW + gap * 2 + numberGroupW;
const startX = cellX + (cellW - totalW) / 2;

console.log('cellX:', cellX, 'cellW:', cellW);
console.log('startX:', startX);
console.log('totalW:', totalW);

let cursorX = startX;
const xOpenParen = cursorX;
console.log('xOpenParen:', xOpenParen, 'wParen:', wParen);

doc.fillColor('white');
doc.text("(", xOpenParen, y + 10, { align: "left", lineBreak: false });

doc.end();
console.log('Saved');
