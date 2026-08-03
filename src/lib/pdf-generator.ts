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
import bidiFactory from "bidi-js";
import arabicReshaper from "arabic-reshaper";

// ============================================================
// Arabic BiDi + Reshaping — exact port of the Python bot's
// `safe_arabic_mixed` (line 59 of pdf_generator_updated (2).py).
//
// The bot uses `arabic_reshaper.reshape(text)` + `bidi.algorithm.get_display(text)`
// to convert logical-order Arabic into visual-order (post-BiDi) display text.
// We replicate that here with the JS equivalents: `arabic-reshaper` (Louay
// Alakkad's port) and `bidi-js` (lojjic's UBA implementation).
//
// The output string is in VISUAL LTR order: read left-to-right on screen,
// but each Arabic run is already reversed and shape-substituted to its
// presentation form (U+FE70-U+FEFF range). This means the renderer must
// NOT apply PDFKit's `features: ["rtla"]` (which would re-shape already-
// shaped chars and break them).
// ============================================================
const bidiEngine = bidiFactory();
function processArabicBiDi(text: string): string {
  if (!text) return "";
  try {
    const reshaped = arabicReshaper.convertArabic(text);
    const levels = bidiEngine.getEmbeddingLevels(reshaped);
    return bidiEngine.getReorderedString(reshaped, levels);
  } catch (e) {
    return text;
  }
}

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

    // Strip Unicode Cf (Format) characters — LRM (U+200E), RLM (U+200F),
    // ZWJ (U+200D), ZWNJ (U+200C), etc. These are BiDi control marks that
    // are needed by the BiDi algorithm but are NOT visually rendered.
    // PDFKit + Latin fonts (Times-Roman, Amiri-Latin) lack glyphs for
    // these codepoints → they render as tofu □ boxes. Mirrors the bot's
    // `clean_text = ''.join(ch for ch in text if unicodedata.category(ch) != 'Cf')`.
    // eslint-disable-next-line no-control-regex
    const CF_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;
    const cleanedText = String(text).replace(CF_REGEX, "");
    text = cleanedText;

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
      // All Arabic, or all Latin — fall back to default path.
      // If text is pre-shaped (post-BiDi presentation forms), do NOT apply
      // rtla — it would re-shape already-shaped chars and break them.
      const defaultOptions: DrawOpts = {
        align: "right",
        features: options.preShaped ? [] : ["rtla"],
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

    // ------------------------------------------------------------
    // Vertical centering inside a cell of known height.
    //
    // When `centerVertically: true` is passed (with `cellHeight`),
    // we treat the caller's `y` as the TOP of the cell, compute the
    // total visual block height as max(arabicLineH, latinLineH),
    // and shift `y` DOWN by (cellHeight - blockH) / 2 so the whole
    // line block is centered within the cell — mirroring the
    // Python bot's `self.write(height, char)` vertical distribution.
    //
    // `centerVertically: true` also forces `alignTop` to false so the
    // Latin baseline-offset is applied (Latin runs are pushed DOWN to
    // align with the Arabic baseline). This keeps digits, dashes, and
    // parentheses visually centered on the same line as the Arabic
    // letters — matching the bot's mixed-font cell behavior.
    // ------------------------------------------------------------
    let yRender = y;
    const centerVertically = options.centerVertically === true;
    const cellHeight = typeof options.cellHeight === "number" ? options.cellHeight : 0;
    if (centerVertically && cellHeight > 0) {
      const blockH = Math.max(arabicLineH, latinLineH);
      yRender = y + (cellHeight - blockH) / 2;
    }

    // Vertical offset: shift Latin runs DOWN to align with Arabic baseline.
    // The default behavior pushes Latin runs down by (arabicLineH - latinLineH)
    // so that Latin baselines visually align with Arabic baselines.
    //
    // `alignTop: true` option DISABLES this offset — all runs render at the
    // SAME Y (top of the line box). This mirrors the Python bot's
    // render_mixed_font_cell_v2, which writes each char at the same Y with
    // no vertical adjustment.
    //
    // `centerVertically: true` FORCES this offset ON (i.e., alignTop=false)
    // because we want Latin chars to share the Arabic baseline when the
    // block is centered as a whole.
    const alignTopEffective =
      options.alignTop === true && !centerVertically;
    const yOffset = alignTopEffective ? 0 : arabicLineH - latinLineH;

    // Render runs in visual order (left to right in the line).
    //
    // `preShaped: true` means the text has already been processed by
    // processArabicBiDi — Arabic chars are already in presentation form
    // (U+FE70-U+FEFF). We must NOT apply `features: ["rtla"]` because
    // PDFKit would try to re-shape already-shaped chars, breaking them.
    //
    // `preShaped: false` (default, used by the duration cell + footer)
    // means the text is in logical order. We DO apply rtla so PDFKit
    // shapes the Arabic and applies its BiDi algorithm to each Arabic run.
    const arabicFeatures = options.preShaped ? [] : ["rtla"];
    let curX = startX;
    for (let k = 0; k < runs.length; k++) {
      const run = runs[k];
      if (run.isArabic) {
        doc.font(fontArabic).fontSize(fontSize).fillColor(color);
        doc.text(run.text, curX, yRender, {
          features: arabicFeatures,
          align: "left",
          lineBreak: false,
        });
      } else {
        doc.font(fontLatin).fontSize(fontSize).fillColor(color);
        doc.text(run.text, curX, yRender + yOffset, {
          align: "left",
          lineBreak: false,
        });
      }
      curX += runWidths[k];
    }
  };

  // ============================================================
  // drawMixedTextCharByChar — renders mixed Arabic + Latin/digit text
  // by drawing EACH CHARACTER INDIVIDUALLY at sequential LTR positions.
  //
  // Why this exists (and is now the PREFERRED path for any mixed
  // Arabic+Latin text where reliable visual ordering matters):
  //   PDFKit ALWAYS applies its internal BiDi algorithm to any text
  //   containing Arabic-range characters (U+0600-U+06FF, U+FB50-U+FEFF).
  //   This BiDi pass REVERSES Arabic runs, so logical-order "يوم" gets
  //   visually reversed to "موي" on screen. There is no PDFKit option
  //   to disable BiDi. In some deployment environments (e.g. serverless
  //   builds) the `features: ["rtla"]` GSUB pass also fails to apply
  //   shaping, leaving Arabic letters in disconnected isolated forms.
  //
  //   The only way to guarantee correct visual output across all
  //   environments is to render each character as a SEPARATE doc.text()
  //   call. A single character cannot be reversed by BiDi (there's
  //   nothing to reverse). By positioning each char explicitly at
  //   increasing X coordinates, we force the visual LTR order to match
  //   the logical string order.
  //
  // Input handling (the function accepts RAW LOGICAL text):
  //   - Arabic chars are pre-shaped INSIDE this function via
  //     `arabicReshaper.convertArabic(...)`. Pre-shaping is critical
  //     because rendering each char individually means PDFKit's rtla
  //     GSUB feature cannot determine the correct form based on
  //     context (it only sees one char at a time). The pre-shaper
  //     chooses initial/medial/final/isolated forms based on the
  //     full string context, preserving the cursive appearance.
  //   - The input is in LOGICAL order (NOT BiDi-reversed). After
  //     pre-shaping we walk the string left-to-right and emit each
  //     char at increasing X positions, so visual LTR == logical.
  //
  // Rendering:
  //   - Strip Cf (format) chars (LRM, RLM, etc.) — same as drawMixedText.
  //   - For each character:
  //     - If Arabic (including presentation forms U+FB50-U+FEFF):
  //       render with Arabic font, features:[] (no rtla — already shaped)
  //     - If Latin/digit/space: render with Latin font
  //   - Place chars left-to-right at increasing X positions.
  //   - Apply Latin-baseline yOffset so Latin chars align with Arabic
  //     baseline (same as drawMixedText's alignTop:false behavior).
  //   - Center the whole line within `options.width`.
  //   - When `centerVertically:true` + `cellHeight` are passed, the
  //     whole line block is centered vertically inside the cell,
  //     mirroring the bot's `self.write(height, char)` behavior.
  // ============================================================
  const drawMixedTextCharByChar = (
    text: string,
    x: number,
    y: number,
    options: DrawOpts = {},
  ) => {
    if (!useArabicFont) {
      drawTextEn(text, x, y, options);
      return;
    }

    // Strip Cf chars
    const CF_REGEX = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g;
    const cleanedText = String(text).replace(CF_REGEX, "");

    const fontSize = options.fontSize || 12;
    const color = options.color || "#000000";
    const weight = options.weight || "regular";
    const fontArabic = weight === "bold" ? fontArBold : fontArReg;
    const fontLatin = weight === "bold" ? fontEnBold : fontEnReg;

    // ------------------------------------------------------------
    // Pre-shape the Arabic chars in the cleaned logical-order string.
    // `arabicReshaper.convertArabic` walks the string and replaces
    // basic Arabic codepoints (U+0600-U+06FF) with their presentation
    // forms (U+FB50-U+FDFF, U+FE70-U+FEFF) based on each char's
    // context (initial/medial/final/isolated). Latin chars are left
    // untouched. The output is still in logical order — only the
    // Arabic codepoints are substituted.
    //
    // This MUST happen BEFORE the per-char rendering loop, because
    // each char is rendered individually (PDFKit's rtla cannot shape
    // single chars).
    // ------------------------------------------------------------
    const shapedText = arabicReshaper.convertArabic(cleanedText);

    // Classify chars: Arabic (incl. presentation forms) vs Latin/digit/punct
    // Arabic ranges: U+0600-U+06FF, U+0750-U+077F, U+FB50-U+FDFF, U+FE70-U+FEFF
    const isArabicChar = (ch: string) => {
      const cp = ch.codePointAt(0) || 0;
      return (
        (cp >= 0x0600 && cp <= 0x06ff) ||
        (cp >= 0x0750 && cp <= 0x077f) ||
        (cp >= 0xfb50 && cp <= 0xfdff) ||
        (cp >= 0xfe70 && cp <= 0xfeff)
      );
    };

    // Measure line heights for baseline alignment
    doc.font(fontArabic).fontSize(fontSize);
    const arabicLineH = doc.heightOfString("م");
    doc.font(fontLatin).fontSize(fontSize);
    const latinLineH = doc.heightOfString("0");
    // yOffset shifts Latin chars DOWN to align baseline with Arabic
    const yOffset = arabicLineH - latinLineH;

    // Build per-char rendering plan: measure each char's width with its
    // appropriate font, then compute total width and start X for centering.
    type CharPlan = { ch: string; isArabic: boolean; width: number };
    const chars: CharPlan[] = [];
    let totalWidth = 0;

    for (const ch of shapedText) {
      const isAr = isArabicChar(ch);
      if (isAr) {
        doc.font(fontArabic).fontSize(fontSize);
      } else {
        doc.font(fontLatin).fontSize(fontSize);
      }
      const w = doc.widthOfString(ch);
      chars.push({ ch, isArabic: isAr, width: w });
      totalWidth += w;
    }

    // Compute start X based on alignment
    let startX = x;
    if (options.align === "center" && options.width) {
      startX = x + (options.width - totalWidth) / 2;
    } else if (options.align === "right" && options.width) {
      startX = x + options.width - totalWidth;
    }

    // ------------------------------------------------------------
    // Vertical centering inside a cell of known height. Mirrors
    // drawMixedText's behavior: when `centerVertically:true` is set
    // with a positive `cellHeight`, treat `y` as the TOP of the cell
    // and shift the line block DOWN by (cellHeight - blockH) / 2 so
    // the whole line is centered vertically.
    // ------------------------------------------------------------
    let yRender = y;
    const centerVertically = options.centerVertically === true;
    const cellHeight = typeof options.cellHeight === "number" ? options.cellHeight : 0;
    if (centerVertically && cellHeight > 0) {
      const blockH = Math.max(arabicLineH, latinLineH);
      yRender = y + (cellHeight - blockH) / 2;
    }

    // Render each char at its computed X position
    let curX = startX;
    for (const cp of chars) {
      if (cp.isArabic) {
        doc.font(fontArabic).fontSize(fontSize).fillColor(color);
        // features:[] = do NOT apply rtla (chars are already pre-shaped)
        doc.text(cp.ch, curX, yRender, {
          features: [],
          align: "left",
          lineBreak: false,
        });
      } else {
        doc.font(fontLatin).fontSize(fontSize).fillColor(color);
        // Shift Latin chars DOWN by yOffset to align baselines
        doc.text(cp.ch, curX, yRender + yOffset, {
          align: "left",
          lineBreak: false,
        });
      }
      curX += cp.width;
    }
  };

  // ============================================================
  // renderLongNameCell — port of the bot's render_long_name_cell.
  //
  // Used ONLY for uppercase English name cells (Name + Practitioner Name).
  //
  // Bot behavior (render_long_name_cell, lines 413-482):
  //   1. Measure text width; padding = 4mm each side → available_width.
  //   2. If text fits → single line, centered horizontally AND vertically
  //      via FPDF's cell(width, height, text, align='C') which vertically
  //      centers the text within the cell height.
  //   3. If text doesn't fit → split at word boundaries, putting as many
  //      words as possible on line 1 (majority on top).
  //   4. For 2-line case:
  //        line_height = height / 2  (each line gets HALF the row height)
  //        y_offset = y + (height - line_height*2) / 2 = y  (no extra offset)
  //        Line 1: cell(width, line_height, line1, align='C') at y_offset
  //                → text vertically centered within TOP HALF [y, y+h/2]
  //        Line 2: cell(width, line_height, line2, align='C') at y_offset+line_height
  //                → text vertically centered within BOTTOM HALF [y+h/2, y+h]
  //   5. If no good word-boundary split → render as single line (overflow).
  //
  // Our port:
  //   - Same greedy max-words-on-line-1 word splitting.
  //   - Same single-line vertical centering.
  //   - For 2-line case: each line is centered WITHIN ITS HALF of the row,
  //     matching the bot's per-half centering. Previously we drew line 1
  //     at the TOP of the cell and line 2 at the MIDDLE — which left empty
  //     space at the bottom of each half. Now we compute:
  //       line1Y = cellY + (lineH - naturalLineH) / 2
  //       line2Y = cellY + lineH + (lineH - naturalLineH) / 2
  //     so each line is vertically centered in its respective half.
  //   - No mid-word hyphenation (bot has it as a last-resort fallback for
  //     very long single-word names; we skip it since our cell is narrower
  //     and wrapping at word boundaries is sufficient).
  // ============================================================
  const renderLongNameCell = (
    text: string,
    cellX: number,
    cellY: number,
    cellW: number,
    cellH: number,
    options: DrawOpts = {},
  ) => {
    if (!text) return;

    const fontSize = options.fontSize || 13;
    const color = options.color || "#000000";
    const weight = options.weight || "regular";
    const fontToUse = weight === "bold" ? fontEnBold : fontEnReg;
    // The caller already passes cellW = subColW - 30, which bakes in 15pt
    // of padding on each side of the sub-column. We DON'T add the bot's
    // extra 4mm padding here — our cell is already ~15pt narrower than
    // the bot's per-side, and adding more padding would push borderline
    // names past the wrap threshold unnecessarily.
    const padding = 0;
    const availableWidth = cellW - padding * 2;

    // Measure single-line text width and height
    doc.font(fontToUse).fontSize(fontSize).fillColor(color);
    const textWidth = doc.widthOfString(text);
    const singleLineH = doc.heightOfString("X", { width: cellW });

    // Case 1: text fits on a single line → render centered, no wrap
    if (textWidth <= availableWidth) {
      const vy = cellY + (cellH - singleLineH) / 2;
      doc.font(fontToUse).fontSize(fontSize).fillColor(color);
      doc.text(text, cellX, vy, {
        width: cellW,
        align: "center",
        lineBreak: false,
      });
      return;
    }

    // Case 2: text too long → find the largest prefix of words that fits
    const words = text.split(" ");
    let line1 = "";
    let line2 = "";
    let foundSplit = false;

    // Iterate from the largest prefix down to 1 word
    for (let i = words.length; i > 0; i--) {
      const testLine = words.slice(0, i).join(" ");
      if (doc.widthOfString(testLine) <= availableWidth) {
        line1 = testLine;
        line2 = words.slice(i).join(" ");
        foundSplit = true;
        break;
      }
    }

    // Case 3: no good split → render as single line (force, no wrap)
    if (!foundSplit || !line2) {
      const vy = cellY + (cellH - singleLineH) / 2;
      doc.font(fontToUse).fontSize(fontSize).fillColor(color);
      doc.text(text, cellX, vy, {
        width: cellW,
        align: "center",
        lineBreak: false,
      });
      return;
    }

    // Case 4: render 2 lines — both lines clustered together in the
    // vertical center of the row, with a small gap between them.
    //
    // User explicitly requested a SMALLER gap between the two lines
    // (originally we used bot's per-half centering which left a large
    // gap because each line sat in the center of its half-row).
    //
    // New approach:
    //   - Use natural single-line height for both lines.
    //   - Add a small inter-line gap (4pt) — visually tighter than half-row.
    //   - Cluster both lines as a single block, centered vertically in
    //     the entire row height.
    //
    // Computation:
    //   totalBlockH = singleLineH * 2 + gap
    //   blockTopY   = cellY + (cellH - totalBlockH) / 2
    //   line1Y      = blockTopY
    //   line2Y      = blockTopY + singleLineH + gap
    const gap = 4; // tight inter-line gap (pt)
    const totalBlockH = singleLineH * 2 + gap;
    const blockTopY = cellY + (cellH - totalBlockH) / 2;
    const line1Y = blockTopY;
    const line2Y = blockTopY + singleLineH + gap;

    doc.font(fontToUse).fontSize(fontSize).fillColor(color);
    doc.text(line1, cellX, line1Y, {
      width: cellW,
      align: "center",
      lineBreak: false,
    });
    doc.text(line2, cellX, line2Y, {
      width: cellW,
      align: "center",
      lineBreak: false,
    });
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

  // drawRow — faithful port including the `isDoubleValue` branch.
  //
  // Options:
  //   - uppercaseEn: when true, the English value is rendered via
  //     renderLongNameCell — which avoids PDFKit's mid-word hyphen
  //     wrapping (e.g. "AL-QAHTANI" → "AL-" + "QAHTANI") and puts the
  //     majority of words on line 1 when wrapping is unavoidable.
  //     Used only for Name + Practitioner Name rows.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawRow = (
    labelEn: string,
    value: any,
    labelAr: string,
    isDoubleValue = false,
    bgColor: string | null = null,
    options: { uppercaseEn?: boolean } = {},
  ) => {
    const labelFontSize = 14;
    const valueFontSize = 14;
    const uppercaseEn = options.uppercaseEn === true;

    doc.font(fontEnReg).fontSize(valueFontSize);
    let maxTextHeight = 0;
    const padding = 15;

    // Measure English Value
    if (isDoubleValue && typeof value === "object") {
      const subColW = col2W / 2;
      let h1: number;
      if (uppercaseEn) {
        // Uppercase names: use text width to decide 1 vs 2 lines,
        // avoiding PDFKit's mid-word hyphen wrapping in heightOfString.
        // Bot uses size=13 for these cells (set_cell_font_and_color
        // line 543); we measure with 13 to match the actual render size.
        const uppercaseFontSize = 13;
        doc.font(fontEnReg).fontSize(uppercaseFontSize);
        const textW = doc.widthOfString(value.en || "-");
        const availW = subColW - 30;
        const singleH = doc.heightOfString("X", { width: subColW });
        h1 = textW <= availW ? singleH : singleH * 2;
      } else {
        h1 = doc.heightOfString(value.en || "-", { width: subColW - 20 });
      }

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
      if (uppercaseEn) {
        // Use renderLongNameCell: prevents mid-word hyphen breaks and
        // puts majority of words on line 1 when wrapping is needed.
        // Bot's set_cell_font_and_color uses size=13 for rows 5, 9
        // (Name, Practitioner Name) — we pass 13 here to match, instead
        // of the default valueFontSize (14) used for other value cells.
        renderLongNameCell(
          value.en || "-",
          startX + col1W + 15,
          currentY,
          subColW - 30,
          dynamicRowH,
          {
            align: "center",
            weight: "regular",
            fontSize: 13,
            color: "#29396e",
          },
        );
      } else {
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
      }

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

  // Arabic duration line — built in LOGICAL order, matching the bot's
  // `calculate_duration` (line 218):
  //     f"{days} يوم ( {LRM}{start}{LRM} إلى {LRM}{end}{LRM} )"
  //
  // We pass the raw logical string to drawMixedText WITHOUT pre-shaping.
  // PDFKit's `features: ["rtla"]` (applied automatically when `preShaped`
  // is not set) handles BiDi + shaping natively for each Arabic run.
  //
  // Visual result on screen (left → right):
  //     "2 يوم ( 09-06-2026 إلى 10-06-2026 )"
  const LRM = "\u200e";
  const durationArLogical =
    `${patient.day_count || 1} يوم ( ${LRM}${startDateFormatted}${LRM} إلى ${LRM}${endDateFormatted}${LRM} )`;

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
  // Bot uses size=13 for ALL cells in row 2 (labels AND values, English AND
  // Arabic) — see set_cell_font_and_color line 533 and render_mixed_font_cell_v2
  // line 502/504. We previously used durFontSize-1 (=12) for values, which
  // made the duration values smaller than the labels. Now matching bot: 13.
  doc.font(fontEnReg).fontSize(durFontSize);
  const durValH1 = doc.heightOfString(duration, { width: subColW - 20 });
  const durValY1 = currentY + (rowH - durValH1) / 2;

  drawTextEn(duration, startX + col1W + 10, durValY1, {
    width: subColW - 20,
    align: "center",
    fontSize: durFontSize,
    color: "#ffffff",
    weight: "regular",
  });

  // Arabic duration — rendered via drawMixedTextCharByChar for maximum
  // reliability across deployment environments.
  //
  // Why char-by-char (not drawMixedText):
  //   PDFKit's internal BiDi + `features:["rtla"]` path works in local
  //   tests but has been observed to FAIL in some serverless/production
  //   environments, producing:
  //     - Arabic letters in disconnected isolated forms (no cursive joining)
  //     - BiDi-reversed Arabic runs ("يوم" → "موي")
  //     - Garbled glyphs when the font fallback chain kicks in
  //
  //   drawMixedTextCharByChar bypasses these issues by:
  //     1. Pre-shaping the Arabic inside the function (via arabic-reshaper)
  //        → cursive joining is preserved even when each char is rendered
  //        individually (PDFKit's rtla cannot shape single chars).
  //     2. Rendering each char as a SEPARATE doc.text() call → a single
  //        char cannot be BiDi-reversed, so visual LTR == logical order.
  //     3. Using `features:[]` for Arabic chars → no rtla GSUB pass,
  //        which means no opportunity for the GSUB pass to fail/misshape.
  //
  // Strategy:
  //   - Input: raw `durationArLogical` (NOT pre-shaped, NOT BiDi-processed).
  //     Arabic letters are in their basic Unicode form (U+0600-U+06FF).
  //     The LRM (U+200E) marks are stripped inside drawMixedTextCharByChar.
  //   - `centerVertically: true` + `cellHeight: rowH` (45pt) centers the
  //     whole line block vertically inside the dark blue row, mirroring
  //     the bot's `self.write(height, char)` vertical distribution.
  //
  // Expected visual output (left → right):
  //     "2 يوم ( 20-09-2025 إلى 21-09-2025 )"

  drawMixedTextCharByChar(durationArLogical, startX + col1W + subColW + 10, currentY, {
    width: subColW - 20,
    align: "center",
    fontSize: durFontSize,
    color: "#ffffff",
    weight: "regular",
    centerVertically: true,
    cellHeight: rowH,
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

  // Name — bot applies .upper() to patient_name_en (matches Python:
  //   processed_data.get('patient_name_en', '').upper())
  // Only the English value is uppercased; Arabic value is unchanged.
  // uppercaseEn: true routes the English value through renderLongNameCell,
  // which avoids mid-word hyphen breaks and keeps short names on one line.
  drawRow(
    "Name",
    { en: (patient.name_en || "").toUpperCase(), ar: patient.name_ar || "" },
    "الاسم",
    true,
    "#f7f7f7",
    { uppercaseEn: true },
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

  // Practitioner Name — bot applies .upper() to doctor_name_en (matches Python:
  //   processed_data.get("doctor_name_en", "").upper())
  // uppercaseEn: true routes the English value through renderLongNameCell.
  drawRow(
    "Practitioner Name",
    { en: (patient.doctor_name_en || "").toUpperCase(), ar: patient.doctor_name_ar },
    "اسم الممارس",
    true,
    "#f7f7f7",
    { uppercaseEn: true },
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
      // Render the full mixed line via drawMixedTextCharByChar for maximum
      // reliability. Noto Sans Arabic lacks ASCII digit glyphs (0-9), so
      // digits must be rendered with Times-Bold on the same baseline as
      // the Arabic. drawMixedTextCharByChar handles the per-char Arabic/
      // Latin split + baseline offset + Arabic pre-shaping.
      //
      // Logical input format (digits first, Arabic label last):
      //     `${licNum} : رقم الترخيص`
      //
      // Why this order (digits first, Arabic label last):
      //   drawMixedTextCharByChar walks the string LEFT-TO-RIGHT and emits
      //   each char at increasing X positions, so visual LTR == logical
      //   order. Putting the digits first puts them on the LEFT side of
      //   the cell, and the Arabic label last puts it on the RIGHT side —
      //   matching the bot's visual layout:
      //       "1410101201200443 : رقم الترخيص"
      //
      // Why char-by-char (not drawMixedText):
      //   PDFKit's internal BiDi + `features:["rtla"]` path works in local
      //   tests but has been observed to FAIL in some production
      //   environments, producing garbled Arabic ("ص.يخزتلا م.ق.ر" instead
      //   of "رقم الترخيص") when the rtla GSUB pass doesn't apply shaping.
      //   drawMixedTextCharByChar pre-shapes the Arabic internally (via
      //   arabic-reshaper) and renders each char as a separate doc.text()
      //   call with `features:[]`, bypassing both BiDi reversal and rtla
      //   GSUB — so the visual output is identical in every environment.
      const fullLine = `${licNum} : رقم الترخيص`;

      drawMixedTextCharByChar(fullLine, rightCenterX - 125, footerY + 165, {
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
