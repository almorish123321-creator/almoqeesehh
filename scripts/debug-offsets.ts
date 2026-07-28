// Debug script to print actual offsets being computed in drawTextAr
import { generateSickLeavePDF } from "../src/lib/pdf-generator";
import fs from "fs";

// Patch console to capture debug prints — actually let's just measure directly
import PDFDocument from "pdfkit";
import path from "path";

const rootDir = process.cwd();
const fontArabicRegPath = path.join(rootDir, "node_modules", "@fontsource", "noto-sans-arabic", "files", "noto-sans-arabic-arabic-400-normal.woff");
const fontArabicBoldPath = path.join(rootDir, "node_modules", "@fontsource", "noto-sans-arabic", "files", "noto-sans-arabic-arabic-700-normal.woff");

const doc = new PDFDocument({ size: "A3", margin: 40 });
doc.registerFont("NotoArabicReg", fontArabicRegPath);
doc.registerFont("NotoArabicBold", fontArabicBoldPath);

const fontSize = 14;

// Bold (used for labels)
doc.font("NotoArabicBold").fontSize(fontSize);
const arabicHBold = doc.heightOfString("م");
const arabicWidthBold = doc.widthOfString("رقم الهوية");
console.log(`BOLD: arabicH(م) = ${arabicHBold}, width(رقم الهوية) = ${arabicWidthBold}`);

doc.font("Times-Bold").fontSize(fontSize);
const slashHBold = doc.heightOfString("/");
const slashWidthBold = doc.widthOfString("/");
console.log(`BOLD: slashH(/) = ${slashHBold}, width(/) = ${slashWidthBold}`);
console.log(`BOLD: offset = arabicH - slashH = ${arabicHBold - slashHBold}`);

// Regular (used for values)
doc.font("NotoArabicReg").fontSize(fontSize);
const arabicHReg = doc.heightOfString("م");
console.log(`REG:  arabicH(م) = ${arabicHReg}`);

doc.font("Times-Roman").fontSize(fontSize);
const slashHReg = doc.heightOfString("/");
console.log(`REG:  slashH(/) = ${slashHReg}`);
console.log(`REG:  offset = arabicH - slashH = ${arabicHReg - slashHReg}`);
