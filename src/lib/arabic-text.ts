/**
 * Arabic text processing for PDFKit
 * =================================
 *
 * STRATEGY (v3 — let fontkit handle shaping + RTL reversal)
 * --------------------------------------------------------
 *
 * fontkit's ArabicShaper, when given Arabic base letters, will:
 *   1. Detect script = 'arab' (via Unicode properties)
 *   2. Apply GSUB features (ccmp, init, medi, fina, liga, rlig, rtlm)
 *      on the font itself → produces presentation forms
 *   3. Reverse the glyphs array (because direction = 'rtl')
 *
 * Step 3 is critical: fontkit reverses ALL glyphs in a single text run.
 * For pure Arabic words, this is correct — the logical-order input becomes
 * visual-order glyphs, ready for left-to-right rendering.
 *
 * For mixed text (e.g. "1 يوم"), fontkit still reverses everything, which
 * is also correct: "1 يوم" → reversed glyphs → visually "يوم 1" on the page,
 * which reads from right-to-left as "1 يوم" — exactly what we want.
 *
 * PROBLEM: PDFKit's layout() splits text on space characters (' ' and '\t')
 * and processes each chunk separately. For Arabic, this would mean each
 * word is shaped correctly, but the WORDS would be laid out in the order
 * given (LTR), not in RTL visual order.
 *
 * SOLUTION: Replace ASCII spaces with NBSP (\u00A0) so PDFKit treats the
 * whole text as ONE run. Then fontkit shapes all words and reverses all
 * glyphs in one pass, producing the correct visual order.
 *
 * For mixed text with Latin/digits mixed with Arabic (e.g. Row 2:
 * "( 2026-06-09 إلى 2026-06-15 ) 7 يوم"), fontkit's blanket reverse
 * also flips the digits inside dates, producing garbled output like
 * "51-60-6202". For these cases, the caller must split the text manually
 * and render each piece (Arabic piece via drawTextAr, Latin piece via
 * drawTextEn) at computed X positions — see the Row 2 handler in
 * route.ts.
 *
 * SUMMARY:
 *   - processArabicText(text) = text.replace(/ /g, '\u00A0')
 *   - The caller passes the result to doc.text() with lineBreak:false
 *   - fontkit handles shaping + RTL reversal automatically
 *   - For mixed Arabic+digit text, the caller must split manually
 */

import bidiFactory from "bidi-js";

const bidi = bidiFactory();

// ============================================================
// Arabic Presentation Forms mapping (kept for backward compat)
// ============================================================
// These are no longer used in the main pipeline. fontkit handles
// shaping via GSUB on the font itself.

interface CharRep {
  isolated: number | null;
  initial: number | null;
  medial: number | null;
  final: number | null;
}

const CHARS_MAP: Record<number, CharRep> = {};

const charsArray: [number, number | null, number | null, number | null, number | null][] = [
  [0x0621, 0xFE80, null, null, null],
  [0x0622, 0xFE81, null, null, 0xFE82],
  [0x0623, 0xFE83, null, null, 0xFE84],
  [0x0624, 0xFE85, null, null, 0xFE86],
  [0x0625, 0xFE87, null, null, 0xFE88],
  [0x0626, 0xFE89, 0xFE8B, 0xFE8C, 0xFE8A],
  [0x0627, 0xFE8D, null, null, 0xFE8E],
  [0x0628, 0xFE8F, 0xFE91, 0xFE92, 0xFE90],
  [0x0629, 0xFE93, null, null, 0xFE94],
  [0x062A, 0xFE95, 0xFE97, 0xFE98, 0xFE96],
  [0x062B, 0xFE99, 0xFE9B, 0xFE9C, 0xFE9A],
  [0x062C, 0xFE9D, 0xFE9F, 0xFEA0, 0xFE9E],
  [0x062D, 0xFEA1, 0xFEA3, 0xFEA4, 0xFEA2],
  [0x062E, 0xFEA5, 0xFEA7, 0xFEA8, 0xFEA6],
  [0x062F, 0xFEA9, null, null, 0xFEAA],
  [0x0630, 0xFEAB, null, null, 0xFEAC],
  [0x0631, 0xFEAD, null, null, 0xFEAE],
  [0x0632, 0xFEAF, null, null, 0xFEB0],
  [0x0633, 0xFEB1, 0xFEB3, 0xFEB4, 0xFEB2],
  [0x0634, 0xFEB5, 0xFEB7, 0xFEB8, 0xFEB6],
  [0x0635, 0xFEB9, 0xFEBB, 0xFEBC, 0xFEBA],
  [0x0636, 0xFEBD, 0xFEBF, 0xFEC0, 0xFEBE],
  [0x0637, 0xFEC1, 0xFEC3, 0xFEC4, 0xFEC2],
  [0x0638, 0xFEC5, 0xFEC7, 0xFEC8, 0xFEC6],
  [0x0639, 0xFEC9, 0xFECB, 0xFECC, 0xFECA],
  [0x063A, 0xFECD, 0xFECF, 0xFED0, 0xFECE],
  [0x0641, 0xFED1, 0xFED3, 0xFED4, 0xFED2],
  [0x0642, 0xFED5, 0xFED7, 0xFED8, 0xFED6],
  [0x0643, 0xFED9, 0xFEDB, 0xFEDC, 0xFEDA],
  [0x0644, 0xFEDD, 0xFEDF, 0xFEE0, 0xFEDE],
  [0x0645, 0xFEE1, 0xFEE3, 0xFEE4, 0xFEE2],
  [0x0646, 0xFEE5, 0xFEE7, 0xFEE8, 0xFEE6],
  [0x0647, 0xFEE9, 0xFEEB, 0xFEEC, 0xFEEA],
  [0x0648, 0xFEED, null, null, 0xFEEE],
  [0x0649, 0xFEEF, null, null, 0xFEF0],
  [0x064A, 0xFEF1, 0xFEF3, 0xFEF4, 0xFEF2],
  [0x0640, 0x0640, 0x0640, 0x0640, 0x0640],
  [0x064B, 0x064B, null, null, null],
  [0x064C, 0x064C, null, null, null],
  [0x064D, 0x064D, null, null, null],
  [0x064E, 0x064E, null, null, null],
  [0x064F, 0x064F, null, null, null],
  [0x0650, 0x0650, null, null, null],
  [0x0651, 0x0651, null, null, null],
  [0x0652, 0x0652, null, null, null],
];

for (const [code, iso, init, med, fin] of charsArray) {
  CHARS_MAP[code] = {
    isolated: iso,
    initial: init,
    medial: med,
    final: fin,
  };
}

const LAM_ALEF_LIGATURES: Record<string, number> = {
  "\u0644\u0622": 0xFEF5,
  "\u0644\u0623": 0xFEF7,
  "\u0644\u0625": 0xFEF9,
  "\u0644\u0627": 0xFEFB,
};

const LAM_ALEF_LIGATURES_FINAL: Record<string, number> = {
  "\u0644\u0622": 0xFEF6,
  "\u0644\u0623": 0xFEF8,
  "\u0644\u0625": 0xFEFA,
  "\u0644\u0627": 0xFEFC,
};

function isArabicLetter(code: number): boolean {
  return (
    (code >= 0x0621 && code <= 0x064A) ||
    code === 0x0640
  );
}

function isDiacritic(code: number): boolean {
  return code >= 0x064B && code <= 0x0652;
}

function getCharRep(
  current: number,
  prevCode: number | null,
  nextCode: number | null,
): number {
  const rep = CHARS_MAP[current];
  if (!rep) return current;
  const prevConnectsForward = prevCode !== null
    && CHARS_MAP[prevCode] !== undefined
    && CHARS_MAP[prevCode].initial !== null;
  const nextIsArabicLetter = nextCode !== null && isArabicLetter(nextCode);
  if (prevConnectsForward && nextIsArabicLetter && rep.medial !== null) {
    return rep.medial;
  }
  if (prevConnectsForward && rep.final !== null) {
    return rep.final;
  }
  if (nextIsArabicLetter && rep.initial !== null) {
    return rep.initial;
  }
  return rep.isolated ?? current;
}

/**
 * Apply Arabic letter shaping — kept for backward compatibility but
 * NOT used in the main pipeline anymore. fontkit handles shaping via
 * GSUB features (ccmp, init, medi, fina, liga, rlig) on the font itself.
 */
export function arabicReshape(text: string): string {
  if (!text) return "";
  let cleaned = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code === 0x200d || code === 0x200c) continue;
    cleaned += ch;
  }

  let afterLigatures = "";
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const nextCh = cleaned[i + 1];
    const pair = ch + (nextCh || "");
    if (i < cleaned.length - 1 && LAM_ALEF_LIGATURES[pair]) {
      let prevConnectsForward = false;
      for (let j = i - 1; j >= 0; j--) {
        const pc = cleaned[j].codePointAt(0)!;
        if (isDiacritic(pc)) continue;
        if (isArabicLetter(pc)) {
          prevConnectsForward = CHARS_MAP[pc] !== undefined && CHARS_MAP[pc].initial !== null;
        }
        break;
      }
      const ligatureCode = prevConnectsForward
        ? LAM_ALEF_LIGATURES_FINAL[pair] || LAM_ALEF_LIGATURES[pair]
        : LAM_ALEF_LIGATURES[pair];
      afterLigatures += String.fromCodePoint(ligatureCode);
      i++;
      continue;
    }
    afterLigatures += ch;
  }

  let result = "";
  for (let i = 0; i < afterLigatures.length; i++) {
    const ch = afterLigatures[i];
    const code = ch.codePointAt(0)!;
    if (!isArabicLetter(code) && !isDiacritic(code)) {
      result += ch;
      continue;
    }
    let prevCode: number | null = null;
    for (let j = i - 1; j >= 0; j--) {
      const pc = afterLigatures[j].codePointAt(0)!;
      if (isDiacritic(pc)) continue;
      if (isArabicLetter(pc)) prevCode = pc;
      break;
    }
    let nextCode: number | null = null;
    for (let j = i + 1; j < afterLigatures.length; j++) {
      const nc = afterLigatures[j].codePointAt(0)!;
      if (isDiacritic(nc)) continue;
      if (isArabicLetter(nc)) nextCode = nc;
      break;
    }
    if (isDiacritic(code)) {
      result += ch;
      continue;
    }
    const shaped = getCharRep(code, prevCode, nextCode);
    result += String.fromCodePoint(shaped);
  }
  return result;
}

/**
 * Apply Unicode Bidirectional Algorithm to reorder text for visual display.
 * Uses bidi-js package's `getReorderedString()`.
 *
 * NOTE: Not used in the main pipeline anymore — fontkit handles RTL
 * reversal via the script-direction detection. Kept for backward compat
 * and for callers that need raw bidi reordering.
 */
export function bidiGetDisplay(text: string): string {
  if (!text) return "";
  try {
    const result = bidi.getEmbeddingLevels(text);
    if (result.paragraphs.length === 0) return text;
    const hasRtl = result.paragraphs.some((p: any) => p.level % 2 === 1);
    if (!hasRtl) return text;
    const reordered = (bidi as any).getReorderedString(text, result);
    return reordered;
  } catch {
    return text;
  }
}

/**
 * Full Arabic text processing pipeline (v3 — fontkit-driven).
 *
 * What we do here:
 *   - Replace ASCII spaces with NBSP (\u00A0) so PDFKit treats the whole
 *     text as ONE run and doesn't split it on spaces.
 *
 * What fontkit does (at PDFKit's encode() call):
 *   - Detects script = 'arab' from Arabic code points
 *   - Applies GSUB features (ccmp, init, medi, fina, liga, rlig, rtlm)
 *     on each word to produce presentation forms (shaping)
 *   - Reverses the glyph array (because direction = 'rtl') so the
 *     glyphs are in visual order for left-to-right rendering
 *
 * The caller passes the result to doc.text() with `lineBreak: false` and
 * `align: "center"` (NOT "right" — pdfkit's align:"right" assumes LTR
 * text and computes width wrong for Arabic).
 *
 * IMPORTANT for mixed Arabic+digit text:
 *   fontkit's blanket RTL reverse also flips digits inside dates, so
 *   "2026-06-15" would render as "51-60-6202" visually. For mixed text
 *   (e.g. Row 2 with dates and counts), the caller MUST split the text
 *   into pure-Arabic and pure-Latin/digit pieces, and render each piece
 *   at a computed X position. See the Row 2 handler in route.ts.
 */
export function processArabicText(text: string): string {
  if (!text) return "";
  // Replace ASCII spaces with NBSP to prevent PDFKit from splitting on
  // spaces and laying out each word separately (which would lose the
  // RTL word order established by fontkit's glyph reversal).
  return text.replace(/ /g, "\u00A0");
}

/**
 * Safe mixed Arabic + Latin/digits text processing.
 * Same as processArabicText — fontkit handles shaping + RTL reversal.
 *
 * WARNING: For text containing dates or long digit runs, fontkit's RTL
 * reversal will flip the digits, producing garbled output. In those
 * cases, the caller MUST split the text and render each piece
 * separately. See Row 2 handler in route.ts.
 */
export function safeArabicMixed(text: string): string {
  return processArabicText(text);
}
