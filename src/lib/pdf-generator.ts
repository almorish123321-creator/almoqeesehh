/**
 * Sick Leave Report PDF Generator (TypeScript port)
 * ================================================
 *
 * Exact TypeScript port of the original Express.js implementation:
 *   website/utils/sickLeaveReportGenerator.js (508 lines)
 *
 * Source repo: github.com/almrysh308-lab/alehtiat-almorish
 *
 * RULE: This is a faithful port. The only changes from the original
 * JavaScript are:
 *   - `var` → `const`/`let`
 *   - `require()` → `import`
 *   - Callback-style stream → async Promise<Buffer>
 *   - TypeScript types on parameters and return values
 *
 * Every numeric value, color, coordinate, font size, table dimension,
 * row order, RTL/LTR layout decision, and edge-case branch from the
 * original is preserved verbatim. Any visual difference between this
 * generator and the original is a bug, not a feature.
 */

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";

// ============================================================
// Types — mirror the shape of `patient`, `hospital`, `doctor`
// objects the original Express route passed in.
// ============================================================

export interface PatientData {
  gsl_code: string;
  identity_number: string;
  name_ar: string;
  name_en: string;
  date_from: string; // ISO date "YYYY-MM-DD"
  date_to: string;
  day_count: number;
  issue_date?: string;
  employer?: string | null;
  employer_en?: string | null;
  doctor_name_ar: string;
  doctor_name_en: string;
  doctor_specialty_ar: string;
  doctor_specialty_en: string;
  nationalityObj?: { name_ar: string; name_en: string } | null;
  time_from?: string;
}

export interface HospitalData {
  name_ar?: string;
  name_en?: string;
  logo?: string; // file path
  license_number?: string | null;
}

export interface DoctorData {
  name_ar?: string;
  name_en?: string;
  specialty_ar?: string;
  specialty_en?: string;
}

// ============================================================
// Generator — returns a Promise<Buffer>
// ============================================================

export async function generateSickLeavePDF(
  patient: PatientData,
  hospital: HospitalData | null,
  doctor: DoctorData | null,
): Promise<Buffer> {
  // Accumulate PDF bytes into a Buffer instead of piping to `res`.
  const chunks: Buffer[] = [];

  // Mirror the original: `new PDFDocument({ size: 'A3', margin: 40 })`
  const doc = new PDFDocument({ size: "A3", margin: 40 });
  const pageWidth = 841.89;
  const pageHeight = 1150;

  // Wire up the data collection BEFORE we start emitting to `doc`.
  // (Mirrors `doc.pipe(res)` in the original — but captures bytes.)
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // ============================================================
  // ASSETS — same path resolution logic as the original
  // ============================================================

  // Original used `path.join(__dirname, '../../')` to reach repo root.
  // In Next.js (Vercel), `process.cwd()` is the project root at runtime.
  const rootDir = process.cwd();

  // Font Paths — original setup: Noto Sans Arabic (primary) + Almarai (fallback).
  // User reverted to original fonts: only cell 2 of row 2 (Arabic duration cell)
  // uses Amiri (loaded below as a separate optional font for that cell only).
  //
  // Fallback chain (for all Arabic text EXCEPT cell 2 of row 2):
  //   1. Noto Sans Arabic (preferred, original)
  //   2. Almarai (fallback)
  //   3. Helvetica (last resort)
  const fontArabicRegPath = path.join(
    rootDir,
    "node_modules",
    "@fontsource",
    "noto-sans-arabic",
    "files",
    "noto-sans-arabic-arabic-400-normal.woff",
  );
  const fontArabicBoldPath = path.join(
    rootDir,
    "node_modules",
    "@fontsource",
    "noto-sans-arabic",
    "files",
    "noto-sans-arabic-arabic-700-normal.woff",
  );

  // Amiri font — used ONLY for cell 2 of row 2 (Arabic duration cell) per
  // user request. Loaded as separate optional fonts so the rest of the PDF
  // keeps using Noto Sans Arabic.
  //
  // Amiri ships two subsets:
  //   - amiri-arabic-*  : Arabic glyphs only (no Latin digits, no slash)
  //   - amiri-latin-*   : Latin + digits + slash (no Arabic)
  // drawMixedText with useAmiri=true uses these for the Arabic and Latin
  // runs respectively, giving the duration cell a fully Amiri-styled look.
  const fontAmiriArabicRegPath = path.join(
    rootDir,
    "node_modules",
    "@fontsource",
    "amiri",
    "files",
    "amiri-arabic-400-normal.woff",
  );
  const fontAmiriArabicBoldPath = path.join(
    rootDir,
    "node_modules",
    "@fontsource",
    "amiri",
    "files",
    "amiri-arabic-700-normal.woff",
  );
  const fontAmiriLatinRegPath = path.join(
    rootDir,
    "node_modules",
    "@fontsource",
    "amiri",
    "files",
    "amiri-latin-400-normal.woff",
  );
  const fontAmiriLatinBoldPath = path.join(
    rootDir,
    "node_modules",
    "@fontsource",
    "amiri",
    "files",
    "amiri-latin-700-normal.woff",
  );
  const amiriAvailable =
    fs.existsSync(fontAmiriArabicRegPath) &&
    fs.existsSync(fontAmiriArabicBoldPath) &&
    fs.existsSync(fontAmiriLatinRegPath) &&
    fs.existsSync(fontAmiriLatinBoldPath);

  const fontEnReg = "Times-Roman";
  const fontEnBold = "Times-Bold";

  let fontArReg: string | Buffer = "Helvetica"; // Fallback
  let fontArBold: string | Buffer = "Helvetica-Bold"; // Fallback
  let useArabicFont = false;

  if (fs.existsSync(fontArabicRegPath) && fs.existsSync(fontArabicBoldPath)) {
    fontArReg = fontArabicRegPath;
    fontArBold = fontArabicBoldPath;
    useArabicFont = true;
  } else {
    // Fallback to Almarai
    const almaraiReg = path.join(
      rootDir,
      "node_modules",
      "@fontsource",
      "almarai",
      "files",
      "almarai-arabic-400-normal.woff",
    );
    const almaraiBold = path.join(
      rootDir,
      "node_modules",
      "@fontsource",
      "almarai",
      "files",
      "almarai-arabic-700-normal.woff",
    );

    if (fs.existsSync(almaraiReg) && fs.existsSync(almaraiBold)) {
      fontArReg = almaraiReg;
      fontArBold = almaraiBold;
      useArabicFont = true;
    }
    // else: keep Helvetica fallback
  }

  // Logo assets — the original used `path.join(rootDir, 'logo_of_seha.png')`
  // and `path.join(rootDir, 'المركز الوطني للمعلومات الصحية.jpg')`. In our
  // Next.js project we put them under `public/images/` and reference by
  // resolved path.
  const sehaLogo = path.join(rootDir, "public", "images", "seha-logo.jpg");
  const nationalLogo = path.join(
    rootDir,
    "public",
    "images",
    "national-health-info.jpg",
  );

  // The original also tried to load `../header_logo.png` and
  // `../header_decoration.png` from `__dirname`. We don't have those exact
  // files in the new project; fall back to the text path (matching original
  // fallback behaviour).
  const headerLogoPath = path.join(rootDir, "public", "images", "kingdom-text.jpg");
  const decoPath = path.join(rootDir, "public", "images", "geometric-shape.jpg");

  // ============================================================
  // Helpers — exact copy of drawTextAr / drawTextEn
  // ============================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type DrawOpts = Record<string, any>;

  const drawTextAr = (
    text: string,
    x: number,
    y: number,
    options: DrawOpts = {},
  ) => {
    const fontToUse = options.weight === "bold" ? fontArBold : fontArReg;
    const fontEnUse = options.weight === "bold" ? fontEnBold : fontEnReg;

    // ============================================================
    // SPECIAL CASE: text contains "/" (forward slash).
    // Noto Sans Arabic does NOT have the U+002F glyph — it renders as
    // tofu (empty box). We split the text on "/" and render each Arabic
    // piece with the Arabic font, the slash itself (with surrounding
    // extra spaces) with Times-Bold.
    //
    // Visual layout: "رقم الهوية  /  الإقامة" — EXTRA space BEFORE and
    // AFTER the slash (two spaces each side, per user request), and the
    // slash is BOLD (Times-Bold) to stand out from the regular Arabic.
    //
    // Vertical alignment: Arabic fonts (Noto Sans Arabic) sit lower on
    // the baseline than Times-Roman at the same font size, so the slash
    // would appear higher than the Arabic text. We measure the actual
    // baseline of each font and offset the slash Y so its baseline
    // matches the Arabic baseline.
    // ============================================================
    if (useArabicFont && String(text).includes("/")) {
      const fontSize = options.fontSize || 12;
      const color = options.color || "#000000";
      const pieces = String(text).split("/");
      const trimmedPieces = pieces.map((p) => p.trim());

      // The visual line: piece0 + "  /  " + piece1 — TWO spaces around
      // the slash for extra breathing room, and the slash is always
      // Times-Bold (regardless of options.weight) per user request.
      const slashWithSpaces = "  /  ";
      const numSlashes = pieces.length - 1;
      const slashFont = fontEnBold; // always bold for the slash

      // Measure each piece with its own font
      doc.font(fontToUse).fontSize(fontSize);
      const arabicWidths = trimmedPieces.map((p) => doc.widthOfString(p));
      const arabicH = doc.heightOfString("م");

      doc.font(slashFont).fontSize(fontSize);
      const slashGroupWidth = doc.widthOfString(slashWithSpaces);
      const slashH = doc.heightOfString("/");

      // Vertical offset: shift the slash group DOWN to align with Arabic baseline
      const yOffset = arabicH - slashH;

      const totalWidth =
        arabicWidths.reduce((s, w) => s + w, 0) +
        slashGroupWidth * numSlashes;

      // Compute start X based on alignment within the optional width
      let startX = x;
      if (options.align === "center" && options.width) {
        startX = x + (options.width - totalWidth) / 2;
      } else if (options.align === "right" && options.width) {
        startX = x + options.width - totalWidth;
      } else if (options.align === "left" || !options.align) {
        startX = x;
      } else if (options.align === "right" && !options.width) {
        startX = x - totalWidth;
      }

      // Render pieces in visual RTL order:
      // pieces[0] is the rightmost (first read in Arabic), then "  /  ",
      // then pieces[1] on the left, etc.
      let curX = startX;

      // pieces[0] is the rightmost (first read in Arabic)
      doc.font(fontToUse).fontSize(fontSize).fillColor(color);
      doc.text(trimmedPieces[0], curX, y, {
        features: ["rtla"],
        align: "left",
        lineBreak: false,
      });
      curX += arabicWidths[0];

      // Then alternating slash-group + next piece
      for (let i = 1; i < trimmedPieces.length; i++) {
        // "  /  " drawn at y + yOffset to align with Arabic baseline
        doc.font(slashFont).fontSize(fontSize).fillColor(color);
        doc.text(slashWithSpaces, curX, y + yOffset, {
          align: "left",
          lineBreak: false,
        });
        curX += slashGroupWidth;

        doc.font(fontToUse).fontSize(fontSize).fillColor(color);
        doc.text(trimmedPieces[i], curX, y, {
          features: ["rtla"],
          align: "left",
          lineBreak: false,
        });
        curX += arabicWidths[i];
      }
      return;
    }

    // ============================================================
    // DEFAULT: single-font rendering (with optional rtla feature)
    // ============================================================
    // rtla GSUB feature breaks ASCII separators (- \ |) into tofu boxes
    // in Noto Sans Arabic. Detect any ASCII separator in the text and
    // disable rtla for that specific text call — Arabic shaping still
    // works correctly without rtla.
    const hasAsciiSep = /[\\|]/.test(String(text));
    const defaultOptions: DrawOpts = {
      align: "right",
      features: hasAsciiSep ? [] : ["rtla"],
    };
    if (!useArabicFont) {
      delete defaultOptions.features;
      options.features = undefined;
    }

    if (options.fontSize) {
      doc.fontSize(options.fontSize);
    }

    if (options.color) {
      doc.fillColor(options.color);
    }

    doc.font(fontToUse).text(text, x, y, { ...defaultOptions, ...options });
  };

  const drawTextEn = (
    text: string,
    x: number,
    y: number,
    options: DrawOpts = {},
  ) => {
    const fontToUse = options.weight === "bold" ? fontEnBold : fontEnReg;
    if (options.color) {
      doc.fillColor(options.color);
    }
    doc.font(fontToUse).text(text, x, y, options);
  };

  // ============================================================
  // drawMixedText — renders mixed Arabic + Latin/digit text on a
  // single visual baseline.
  //
  // Why: Noto Sans Arabic does NOT have glyphs for ASCII digits
  // (0-9), the forward slash '/', or other Latin punctuation. They
  // render as tofu boxes. The original code only handled '/' as a
  // special case; this helper generalizes that approach to ANY
  // text containing both Arabic and Latin/digit characters.
  //
  // Strategy:
  //   - Split the text into runs: Arabic runs (rendered with NotoArabic
  //     + rtla feature for proper shaping + RTL ordering) and Latin/digit
  //     runs (rendered with Times-Roman).
  //   - Measure each run with its own font.
  //   - Place runs in VISUAL RTL order: rightmost run first.
  //   - Apply a vertical Y-offset to the Latin runs so their visual
  //     baseline aligns with the Arabic visual baseline (because the
  //     Arabic line box is ~2x taller than the Times line box).
  // ============================================================
  const drawMixedText = (
    text: string,
    x: number,
    y: number,
    options: DrawOpts = {},
  ) => {
    if (!useArabicFont) {
      drawTextEn(text, x, y, options);
      return;
    }

    const fontSize = options.fontSize || 12;
    const color = options.color || "#000000";
    const weight = options.weight || "regular";

    // Font selection — by default we use the global Arabic font (Noto Sans
    // Arabic) for Arabic runs and Times-Roman for Latin/digit runs.
    // Caller can pass `useAmiri: true` to override BOTH with Amiri
    // (Amiri-Arabic for Arabic runs, Amiri-Latin for Latin/digit runs).
    // Used only for cell 2 of row 2 (Arabic duration cell) per user request.
    const useAmiri = options.useAmiri === true && amiriAvailable;
    const fontArabic = useAmiri
      ? (weight === "bold" ? fontAmiriArabicBoldPath : fontAmiriArabicRegPath)
      : (weight === "bold" ? fontArBold : fontArReg);
    const fontLatin = useAmiri
      ? (weight === "bold" ? fontAmiriLatinBoldPath : fontAmiriLatinRegPath)
      : (weight === "bold" ? fontEnBold : fontEnReg);

    // Split text into runs of Arabic vs Latin/digit/punctuation.
    // Arabic range: \u0600-\u06FF (Arabic), \u0750-\u077F (Arabic Supplement),
    // \uFB50-\uFDFF (Arabic Presentation Forms-A), \uFE70-\uFEFF (Forms-B),
    // plus Arabic comma/semicolon \u060C \u061B and space (treated as Arabic).
    const arabicChar = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const isArabicChar = (ch: string) => arabicChar.test(ch);

    // Tokenize: each run is either all-Arabic-or-space, or all-non-Arabic.
    type Run = { text: string; isArabic: boolean };
    const runs: Run[] = [];
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      const thisArabic = isArabicChar(ch) || ch === " ";
      let j = i + 1;
      while (j < text.length) {
        const nextArabic = isArabicChar(text[j]) || text[j] === " ";
        if (nextArabic !== thisArabic) break;
        j++;
      }
      // Trailing space on a Latin run should be moved to the next Arabic run
      // (or treated as Arabic) — for simplicity we keep runs as parsed but
      // later render them with appropriate fonts.
      runs.push({ text: text.slice(i, j), isArabic: thisArabic });
      i = j;
    }

    // Skip mixed-text rendering if there's only one Arabic run (no digits/Latin).
    // In that case fall back to drawTextAr default.
    const hasMixed = runs.some((r) => r.isArabic) && runs.some((r) => !r.isArabic);
    if (!hasMixed) {
      // All Arabic, or all Latin — fall back to default path
      const defaultOptions: DrawOpts = {
        align: "right",
        features: ["rtla"],
      };
      if (options.fontSize) doc.fontSize(options.fontSize);
      if (options.color) doc.fillColor(options.color);
      doc.font(fontArabic).text(text, x, y, { ...defaultOptions, ...options });
      return;
    }

    // Compute run widths with their respective fonts
    doc.font(fontArabic).fontSize(fontSize);
    const arabicLineH = doc.heightOfString("م");
    const arabicRunWidths = runs.map((r) =>
      r.isArabic ? doc.widthOfString(r.text) : 0,
    );

    doc.font(fontLatin).fontSize(fontSize);
    const latinLineH = doc.heightOfString("0");
    const latinRunWidths = runs.map((r) =>
      !r.isArabic ? doc.widthOfString(r.text) : 0,
    );

    const runWidths = runs.map((r, idx) =>
      r.isArabic ? arabicRunWidths[idx] : latinRunWidths[idx],
    );

    const totalWidth = runWidths.reduce((s, w) => s + w, 0);

    // Compute start X based on alignment
    let startX = x;
    if (options.align === "center" && options.width) {
      startX = x + (options.width - totalWidth) / 2;
    } else if (options.align === "right" && options.width) {
      startX = x + options.width - totalWidth;
    } else if (options.align === "left" || !options.align) {
      startX = x;
    } else if (options.align === "right" && !options.width) {
      startX = x - totalWidth;
    }

    // Vertical offset: shift Latin runs DOWN to align with Arabic baseline
    const yOffset = arabicLineH - latinLineH;

    // Render runs in visual order (left to right in the line).
    // Note: each Arabic run's internal text is already shaped + reordered
    // by NotoArabic + rtla, so it will appear correctly RTL within its run.
    let curX = startX;
    for (let k = 0; k < runs.length; k++) {
      const run = runs[k];
      if (run.isArabic) {
        doc.font(fontArabic).fontSize(fontSize).fillColor(color);
        doc.text(run.text, curX, y, {
          features: ["rtla"],
          align: "left",
          lineBreak: false,
        });
      } else {
        doc.font(fontLatin).fontSize(fontSize).fillColor(color);
        doc.text(run.text, curX, y + yOffset, {
          align: "left",
          lineBreak: false,
        });
      }
      curX += runWidths[k];
    }
  };

  // ============================================================
  // HEADER — identical to original
  // ============================================================

  if (fs.existsSync(sehaLogo)) {
    doc.image(sehaLogo, 40, 40, { width: 150 });
  }

  if (fs.existsSync(headerLogoPath)) {
    doc.image(headerLogoPath, (pageWidth - 260) / 2, 50, {
      width: 260,
      align: "center",
    });
  } else {
    doc
      .font(fontEnBold)
      .fontSize(16)
      .text("Kingdom of Saudi Arabia", 0, 75, { align: "center" });
  }

  if (fs.existsSync(decoPath)) {
    doc.image(decoPath, pageWidth - 180, 40, { width: 170 });
  }

  doc.moveDown(9);

  // ============================================================
  // TITLE — Arabic + English
  // ============================================================

  doc.fillColor("#306db5");
  drawTextAr("تقرير إجازة مرضية", 0, doc.y, {
    align: "center",
    weight: "bold",
    fontSize: 22,
    width: pageWidth,
  });

  doc.moveDown(0.1);

  doc
    .font(fontEnBold)
    .fillColor("#2c3e77")
    .fontSize(19)
    .text("Sick Leave Report", 0, doc.y, {
      align: "center",
      width: pageWidth,
    });

  doc.moveDown(1.5);

  // ============================================================
  // TABLE — exact column widths and row heights as original
  // ============================================================

  const startX = 40;
  const startY = 250;
  const col1W = 160;
  const col3W = 160;
  const tableWidth = 760;
  const col2W = tableWidth - col1W - col3W;

  let currentY = startY;

  // drawRow — faithful port including the `isDoubleValue` branch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawRow = (
    labelEn: string,
    value: any,
    labelAr: string,
    isDoubleValue = false,
    bgColor: string | null = null,
  ) => {
    const labelFontSize = 14;
    const valueFontSize = 14;

    doc.font(fontEnReg).fontSize(valueFontSize);
    let maxTextHeight = 0;
    const padding = 15;

    // Measure English Value
    if (isDoubleValue && typeof value === "object") {
      const subColW = col2W / 2;
      const h1 = doc.heightOfString(value.en || "-", { width: subColW - 20 });

      doc.font(fontArReg);
      const h2 = doc.heightOfString(value.ar || "-", { width: subColW - 20 });

      maxTextHeight = Math.max(h1, h2);
    } else {
      maxTextHeight = doc.heightOfString(value || "-", { width: col2W - 20 });
    }

    doc.font(fontEnBold).fontSize(labelFontSize);
    const labelH1 = doc.heightOfString(labelEn, { width: col1W - 20 });

    doc.font(fontArBold).fontSize(labelFontSize);
    const labelH2 = doc.heightOfString(labelAr, { width: col3W - 20 });

    maxTextHeight = Math.max(maxTextHeight, labelH1, labelH2);

    const dynamicRowH = Math.max(40, maxTextHeight + padding);

    if (bgColor) {
      doc.save();
      doc.rect(startX, currentY, tableWidth, dynamicRowH).fill(bgColor);
      doc.restore();
    }

    doc
      .rect(startX, currentY, tableWidth, dynamicRowH)
      .strokeColor("#e0e0e0")
      .stroke();
    doc
      .moveTo(startX + col1W, currentY)
      .lineTo(startX + col1W, currentY + dynamicRowH)
      .stroke();
    doc
      .moveTo(startX + col1W + col2W, currentY)
      .lineTo(startX + col1W + col2W, currentY + dynamicRowH)
      .stroke();

    // Labels
    doc.font(fontEnBold).fontSize(labelFontSize);
    const lH1 = doc.heightOfString(labelEn, { width: col1W - 30 });
    const y1 = currentY + (dynamicRowH - lH1) / 2;

    doc.font(fontArBold).fontSize(labelFontSize);
    const lH2 = doc.heightOfString(labelAr, { width: col3W - 30 });
    const y2 = currentY + (dynamicRowH - lH2) / 2;

    drawTextEn(labelEn, startX + 15, y1, {
      width: col1W - 30,
      align: "center",
      weight: "bold",
      fontSize: labelFontSize,
      color: "#2b5d88",
    });
    drawTextAr(labelAr, startX + col1W + col2W + 15, y2, {
      width: col3W - 30,
      align: "center",
      weight: "bold",
      fontSize: labelFontSize,
      color: "#2b5d88",
    });

    // Value
    if (isDoubleValue && typeof value === "object") {
      const subColW = col2W / 2;
      doc
        .moveTo(startX + col1W + subColW, currentY)
        .lineTo(startX + col1W + subColW, currentY + dynamicRowH)
        .strokeColor("#e0e0e0")
        .stroke();

      // English value (left side)
      doc.font(fontEnReg).fontSize(valueFontSize);
      const vH1 = doc.heightOfString(value.en || "-", { width: subColW - 30 });
      const vy1 = currentY + (dynamicRowH - vH1) / 2;
      drawTextEn(value.en || "-", startX + col1W + 15, vy1, {
        width: subColW - 30,
        align: "center",
        weight: "regular",
        fontSize: valueFontSize,
        color: "#29396e",
      });

      // Arabic value (right side)
      const arText: string = value.ar || "-";

      // For dates (numbers + dashes/slashes), always use English font to avoid boxes
      const cleanText = String(arText)
        .replace(/[^0-9\-\/]/g, "")
        .trim();
      let vH2 = 0;
      let isDate = false;

      if (cleanText.length > 0 && /^[0-9\-\/]+$/.test(cleanText)) {
        isDate = true;
        doc.font(fontEnReg).fontSize(valueFontSize);
        vH2 = doc.heightOfString(cleanText, { width: subColW - 30 });
      } else {
        doc.font(fontArReg).fontSize(valueFontSize);
        vH2 = doc.heightOfString(arText, { width: subColW - 30 });
      }

      const vy2 = currentY + (dynamicRowH - vH2) / 2;

      if (isDate) {
        drawTextEn(cleanText, startX + col1W + subColW + 15, vy2, {
          width: subColW - 30,
          align: "center",
          weight: "regular",
          fontSize: valueFontSize,
          color: "#29396e",
        });
      } else {
        drawTextAr(arText, startX + col1W + subColW + 15, vy2, {
          width: subColW - 30,
          align: "center",
          weight: "regular",
          fontSize: valueFontSize,
          color: "#29396e",
        });
      }
    } else {
      // Single Value
      doc.font(fontEnReg).fontSize(valueFontSize);
      const vH = doc.heightOfString(value || "-", { width: col2W - 30 });
      const vY = currentY + (dynamicRowH - vH) / 2;
      drawTextEn(value || "-", startX + col1W + 15, vY, {
        width: col2W - 30,
        align: "center",
        weight: "regular",
        fontSize: valueFontSize,
        color: "#29396e",
      });
    }

    currentY += dynamicRowH;
  };

  // ============================================================
  // DATA PREPARATION — same formatDateOnly + getArabicDuration
  // ============================================================

  const formatDateOnly = (dateStr: string | Date | undefined): string => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const startDateFormatted = formatDateOnly(patient.date_from);
  const endDateFormatted = formatDateOnly(patient.date_to);

  const getArabicDuration = (count: number | string): string => {
    const c = parseInt(String(count)) || 0;
    if (c === 0) return "0 يوم";
    if (c === 1) return "1 يوم";
    if (c === 2) return "2 يومان";
    if (c >= 3 && c <= 10) return `${c} أيام`;
    return `${c} يوم`;
  };

  const duration = `${patient.day_count || 0} day (${startDateFormatted} to ${endDateFormatted})`;
  const durText = getArabicDuration(patient.day_count);
  // Format: Count Unit (FromDate الى ToDate)
  const durationAr = `${durText} (${startDateFormatted} الى ${endDateFormatted})`;

  // --- Row 1: Leave ID ---
  drawRow("Leave ID", patient.gsl_code, "رمز الإجازة");

  // ============================================================
  // ROW 2 — Duration (Special Style) — exact copy of manual
  // piece-by-piece rendering used in the original.
  // ============================================================

  const rowH = 45;
  const durFontSize = 13;

  doc.save();
  doc.rect(startX, currentY, tableWidth, rowH).fill("#2c3e77");

  // Labels (White)
  doc.font(fontEnBold).fontSize(durFontSize);
  const durLabelH1 = doc.heightOfString("Leave Duration", { width: col1W - 30 });
  const durY1 = currentY + (rowH - durLabelH1) / 2;

  doc.font(fontArBold).fontSize(durFontSize);
  const durLabelH2 = doc.heightOfString("مدة الإجازة", { width: col3W - 30 });
  const durY2 = currentY + (rowH - durLabelH2) / 2;

  drawTextEn("Leave Duration", startX + 15, durY1, {
    width: col1W - 30,
    align: "center",
    weight: "bold",
    fontSize: durFontSize,
    color: "#ffffff",
  });
  drawTextAr("مدة الإجازة", startX + col1W + col2W + 15, durY2, {
    width: col3W - 30,
    align: "center",
    weight: "bold",
    fontSize: durFontSize,
    color: "#ffffff",
  });

  // Borders
  const subColW = col2W / 2;
  doc
    .moveTo(startX + col1W, currentY)
    .lineTo(startX + col1W, currentY + rowH)
    .strokeColor("#ffffff")
    .stroke();
  doc
    .moveTo(startX + col1W + subColW, currentY)
    .lineTo(startX + col1W + subColW, currentY + rowH)
    .stroke();
  doc
    .moveTo(startX + col1W + col2W, currentY)
    .lineTo(startX + col1W + col2W, currentY + rowH)
    .stroke();

  // Values — English duration (left sub-col)
  doc.font(fontEnReg).fontSize(durFontSize - 1);
  const durValH1 = doc.heightOfString(duration, { width: subColW - 20 });
  const durValY1 = currentY + (rowH - durValH1) / 2;

  drawTextEn(duration, startX + col1W + 10, durValY1, {
    width: subColW - 20,
    align: "center",
    fontSize: durFontSize - 1,
    color: "#ffffff",
    weight: "regular",
  });

  // Arabic duration — rendered as a single mixed line via drawMixedText.
  //
  // Target visual order (per user's reference screenshot + latest request):
  //     Reading RTL:  "1 يوم (date الى date)"
  //     Visual LTR:   "(date الى date) يوم 1"
  //
  // Why this order: in Arabic RTL reading, the rightmost element is read
  // first. drawMixedText places runs left-to-right in the order they
  // appear in the string, so to make "1" the rightmost (read first) we
  // put it LAST in the string. To make "يوم" the second-rightmost we
  // put it second-to-last. Dates go first (leftmost).
  //
  // User explicitly requested: "اجعل الرقم قبل كلمه يوم وليس بعدها"
  // (make the number BEFORE يوم, not after). In RTL reading "before"
  // means comes first = rightmost visually. Previous attempt had
  // "يوم 1" (يوم read first), now corrected to "1 يوم" (1 read first).
  //
  // Font: this cell uses Amiri (Amiri-Arabic for Arabic runs, Amiri-Latin
  // for digit/Latin runs) per user request — see useAmiri option below.
  // All other cells in the PDF keep using Noto Sans Arabic.
  const durNum = (durText.match(/\d+/) || ["0"])[0];
  const durTxt = durText.replace(/[0-9]/g, "").trim();

  const hDateFrom = startDateFormatted || "-";
  const hDateTo = endDateFormatted || "-";

  // Construct:  "(<hDateFrom> الى <hDateTo>) <durTxt> <durNum>"
  // Visual LTR order: dates-paren, day-word, number
  // Visual result (LTR): dates on LEFT, "يوم" in middle, "1" on RIGHT
  // Reading RTL: "1 يوم (dates)" — number BEFORE يوم ✓
  const arDurLine = `(${hDateFrom} الى ${hDateTo}) ${durTxt} ${durNum}`;

  // Compute the unified baseline Y for the cell.
  // Use Amiri line metrics here (since this cell uses Amiri) so vertical
  // centering matches the actual rendered line height.
  doc
    .font(amiriAvailable ? fontAmiriArabicRegPath : fontArReg)
    .fontSize(durFontSize - 1);
  const arabicLineH = doc.heightOfString("م");
  doc
    .font(amiriAvailable ? fontAmiriLatinRegPath : fontEnReg)
    .fontSize(durFontSize - 1);
  const englishLineH = doc.heightOfString("0");

  // Cell vertical centering: use the LARGER line height (Arabic) so the
  // whole mixed line fits. The Latin runs will be offset down inside
  // drawMixedText to align with the Arabic baseline.
  const maxLineH = Math.max(arabicLineH, englishLineH);
  const yCell = currentY + (rowH - maxLineH) / 2;

  drawMixedText(arDurLine, startX + col1W + subColW + 10, yCell, {
    width: subColW - 20,
    align: "center",
    fontSize: durFontSize - 1,
    color: "#ffffff",
    weight: "regular",
    useAmiri: true, // <-- Amiri only for this cell, rest stays Noto Sans Arabic
  });

  doc.restore();
  currentY += rowH;

  // ============================================================
  // DATA ROWS — exact sequence + bg colors as original
  // ============================================================

  const admissionEn = formatDateOnly(patient.date_from);
  const admissionAr = admissionEn;
  drawRow("Admission Date", { en: admissionEn, ar: admissionAr }, "تاريخ الدخول", true, "#f7f7f7");

  const dischargeEn = formatDateOnly(patient.date_to);
  const dischargeAr = dischargeEn;
  drawRow("Discharge Date", { en: dischargeEn, ar: dischargeAr }, "تاريخ الخروج", true);

  // Issue Date
  const issueDateRaw = patient.issue_date || new Date();
  const issueDateStr = formatDateOnly(issueDateRaw as string | Date);
  drawRow("Issue Date", issueDateStr, "تاريخ إصدار التقرير");

  // Name
  drawRow(
    "Name",
    { en: patient.name_en, ar: patient.name_ar || "" },
    "الاسم",
    true,
    "#f7f7f7",
  );

  drawRow("National ID / Iqama", patient.identity_number, "رقم الهوية / الإقامة");

  let natEn = "-";
  let natAr = "-";
  if (patient.nationalityObj) {
    natEn = patient.nationalityObj.name_en;
    natAr = patient.nationalityObj.name_ar;
  }
  drawRow("Nationality", { en: natEn, ar: natAr }, "الجنسية", true, "#f7f7f7");

  // Employer — empty → space, not "-"
  const employerArRaw =
    patient.employer !== undefined && patient.employer !== null
      ? String(patient.employer)
      : "";
  const employerEnRaw =
    patient.employer_en !== undefined && patient.employer_en !== null
      ? String(patient.employer_en)
      : "";
  const emptyIndicators = new Set([
    "",
    "غير محدد",
    "فارغ",
    "-",
    "None",
    "none",
    "null",
    "NULL",
    "Not Specified",
    "N/A",
    "n/a",
    "undefined",
  ]);
  const employerAr = emptyIndicators.has(employerArRaw.trim()) ? " " : employerArRaw;
  const employerEn = emptyIndicators.has(employerEnRaw.trim()) ? " " : employerEnRaw;
  drawRow(
    "Employer",
    { en: employerEn, ar: employerAr },
    "جهة العمل",
    true,
    "#f7f7f7",
  );

  drawRow(
    "Practitioner Name",
    { en: patient.doctor_name_en, ar: patient.doctor_name_ar },
    "اسم الممارس",
    true,
    "#f7f7f7",
  );

  drawRow(
    "Position",
    { en: patient.doctor_specialty_en, ar: patient.doctor_specialty_ar },
    "المسمى الوظيفي",
    true,
  );

  // ============================================================
  // FOOTER — exact coordinates + structure as original
  // ============================================================

  const footerY = pageHeight - 400;
  const centerX = pageWidth / 2;
  doc
    .moveTo(centerX, footerY)
    .lineTo(centerX, footerY + 150)
    .strokeColor("#e0e0e0")
    .stroke();

  const leftCenterX = centerX / 2;

  // QR — عند مسحه بأي كاميرا هاتف يفتح صفحة الاستعلامات العامة مباشرة.
  // The QR contains only the inquiry page URL (no code parameter) —
  // scanning it opens the general inquiry page where the user types
  // both their service code and ID manually.
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://almoqeesehh.vercel.app";
    const qrData = `${baseUrl}/inquiry`;
    const qrImage = await QRCode.toDataURL(qrData);
    doc.image(qrImage, leftCenterX - 20, footerY, { width: 100 });
  } catch (qrErr) {
    console.error("Error generating QR code:", qrErr);
  }

  drawTextAr(
    "للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة الرسمي",
    leftCenterX - 125,
    footerY + 110,
    {
      width: 300,
      align: "center",
      weight: "bold",
      fontSize: 10,
      color: "#000000",
    },
  );
  drawTextEn(
    "To check the report please visit Seha's official website",
    leftCenterX - 100,
    footerY + 150,
    {
      width: 250,
      align: "center",
      weight: "bold",
      fontSize: 10,
      color: "#000000",
    },
  );

  doc
    .fillColor("blue")
    .font(fontEnBold)
    .fontSize(9);
  // الرابط أسفل الـ QR — يفتح صفحة الاستعلام ويُعبّئ رمز الخدمة تلقائياً
  const inquiryBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://almoqeesehh.vercel.app";
  const inquiryLink = `${inquiryBaseUrl}/inquiry`;
  doc.text("almoqeesehh.vercel.app/inquiry", leftCenterX - 110, footerY + 180, {
    width: 250,
    align: "center",
    link: inquiryLink,
    underline: true,
  });

  // Right Footer (Hospital)
  const rightCenterX = centerX + centerX / 2;
  if (hospital && hospital.logo) {
    let ospLogoPath = hospital.logo;
    if (ospLogoPath.startsWith("/uploads")) {
      ospLogoPath = path.join(rootDir, "backend", ospLogoPath);
    }
    if (fs.existsSync(ospLogoPath)) {
      doc.image(ospLogoPath, rightCenterX - 50, footerY, {
        width: 100,
        height: 100,
        fit: [100, 100],
        align: "center",
      });
    }
  }

  if (hospital) {
    drawTextAr(hospital.name_ar || "", rightCenterX - 125, footerY + 100, {
      width: 250,
      align: "center",
      weight: "bold",
      fontSize: 12,
      color: "#000000",
    });
    drawTextEn(hospital.name_en || "", rightCenterX - 125, footerY + 135, {
      width: 250,
      align: "center",
      weight: "bold",
      fontSize: 12,
      color: "#000000",
    });

    // License number — only if present
    const rawLic =
      hospital.license_number !== undefined && hospital.license_number !== null
        ? String(hospital.license_number)
        : "";
    const licNum = emptyIndicators.has(rawLic.trim()) ? "" : rawLic.trim();

    if (licNum) {
      // Render the full mixed line via drawMixedText. Noto Sans Arabic
      // lacks ASCII digit glyphs (0-9), so digits must be rendered with
      // Times-Bold on the same baseline as the Arabic. drawMixedText
      // handles the Arabic/Latin run splitting + baseline offset.
      //
      // Visual order target (per user request — digits on LEFT, label on RIGHT):
      //     Visual LTR:  "<licNum> : رقم الترخيص"
      //     Reading RTL: "رقم الترخيص : <licNum>"
      // Place digits first in the string so they end up on the LEFT side
      // visually; "رقم الترخيص" goes last so it ends up on the RIGHT side
      // (read first in RTL — matches Arabic reading order).
      const fullLine = `${licNum} : رقم الترخيص`;

      drawMixedText(fullLine, rightCenterX - 125, footerY + 165, {
        width: 250,
        align: "center",
        weight: "bold",
        fontSize: 12,
        color: "#000000",
      });
    }
  }

  // ============================================================
  // BOTTOM FOOTER — time + date + national info logo
  // ============================================================

  const bottomY = pageHeight - 150;
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  doc.font(fontEnBold).fontSize(12).fillColor("#000000");
  doc.text(timeStr, 40, bottomY);
  doc.text(dateStr, 40, bottomY + 20);

  if (fs.existsSync(nationalLogo)) {
    doc.image(nationalLogo, pageWidth - 160, bottomY - 20, { width: 120 });
  }

  doc.end();

  // Wait for the 'end' event before resolving
  return new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}
