/**
 * Arabic text processing for PDFKit — mirrors the Python bot's approach
 * ===================================================================
 *
 * Source: pdf_generator_updated (2).py
 *   import arabic_reshaper
 *   from bidi.algorithm import get_display
 *
 *   reshaped = arabic_reshaper.reshape(text)
 *   bidi_text = get_display(reshaped)
 *
 * This module replicates that two-step pipeline in pure TypeScript:
 *
 * 1. `arabicReshape()` — converts Arabic base letters (U+0600..U+06FF) to
 *    their Presentation Forms (U+FE70..U+FEFF) based on context
 *    (isolated/initial/medial/final). This makes letters connect properly
 *    in PDFKit, which doesn't ship HarfBuzz.
 *
 * 2. `bidiGetDisplay()` — applies the Unicode Bidirectional Algorithm to
 *    reorder characters for visual display. Uses `bidi-js` package.
 *
 * The combined pipeline preserves:
 *   - Arabic letter shaping (connected forms)
 *   - Correct RTL visual order for Arabic words
 *   - LTR order for Latin digits, brackets, slashes, hyphens
 *   - Mixed Arabic + Latin text (e.g. "2 يوم (2025-01-01 إلى 2025-01-02)")
 *
 * LRM marks (U+200E) are stripped before processing — bidi-js handles
 * direction without them, and PDFKit's Times font would render them as
 * tofu boxes.
 */

import bidiFactory from "bidi-js";

const bidi = bidiFactory();

// ============================================================
// Arabic Presentation Forms mapping
// Based on arabic-reshaper Python library by Louy Alakkad
// Source: https://github.com/louy/Javascript-Arabic-Reshaper
// ============================================================

interface CharRep {
  isolated: number | null;
  initial: number | null;
  medial: number | null;
  final: number | null;
}

// Map of base Arabic letter code points → [isolated, initial, medial, final]
// Format: [code, isolated, initial, medial, final] (null = not applicable)
const CHARS_MAP: Record<number, CharRep> = {};

const charsArray: [number, number | null, number | null, number | null, number | null][] = [
  [0x0621, 0xFE80, null, null, null], // HAMZA
  [0x0622, 0xFE81, null, null, 0xFE82], // ALEF_MADDA
  [0x0623, 0xFE83, null, null, 0xFE84], // ALEF_HAMZA_ABOVE
  [0x0624, 0xFE85, null, null, 0xFE86], // WAW_HAMZA
  [0x0625, 0xFE87, null, null, 0xFE88], // ALEF_HAMZA_BELOW
  [0x0626, 0xFE89, 0xFE8B, 0xFE8C, 0xFE8A], // YEH_HAMZA
  [0x0627, 0xFE8D, null, null, 0xFE8E], // ALEF
  [0x0628, 0xFE8F, 0xFE91, 0xFE92, 0xFE90], // BEH
  [0x0629, 0xFE93, null, null, 0xFE94], // TEH_MARBUTA
  [0x062A, 0xFE95, 0xFE97, 0xFE98, 0xFE96], // TEH
  [0x062B, 0xFE99, 0xFE9B, 0xFE9C, 0xFE9A], // THEH
  [0x062C, 0xFE9D, 0xFE9F, 0xFEA0, 0xFE9E], // JEEM
  [0x062D, 0xFEA1, 0xFEA3, 0xFEA4, 0xFEA2], // HAH
  [0x062E, 0xFEA5, 0xFEA7, 0xFEA8, 0xFEA6], // KHAH
  [0x062F, 0xFEA9, null, null, 0xFEAA], // DAL
  [0x0630, 0xFEAB, null, null, 0xFEAC], // THAL
  [0x0631, 0xFEAD, null, null, 0xFEAE], // REH
  [0x0632, 0xFEAF, null, null, 0xFEB0], // ZAIN
  [0x0633, 0xFEB1, 0xFEB3, 0xFEB4, 0xFEB2], // SEEN
  [0x0634, 0xFEB5, 0xFEB7, 0xFEB8, 0xFEB6], // SHEEN
  [0x0635, 0xFEB9, 0xFEBB, 0xFEBC, 0xFEBA], // SAD
  [0x0636, 0xFEBD, 0xFEBF, 0xFEC0, 0xFEBE], // DAD
  [0x0637, 0xFEC1, 0xFEC3, 0xFEC4, 0xFEC2], // TAH
  [0x0638, 0xFEC5, 0xFEC7, 0xFEC8, 0xFEC6], // ZAH
  [0x0639, 0xFEC9, 0xFECB, 0xFECC, 0xFECA], // AIN
  [0x063A, 0xFECD, 0xFECF, 0xFED0, 0xFECE], // GHAIN
  [0x0641, 0xFED1, 0xFED3, 0xFED4, 0xFED2], // FEH
  [0x0642, 0xFED5, 0xFED7, 0xFED8, 0xFED6], // QAF
  [0x0643, 0xFED9, 0xFEDB, 0xFEDC, 0xFEDA], // KAF
  [0x0644, 0xFEDD, 0xFEDF, 0xFEE0, 0xFEDE], // LAM
  [0x0645, 0xFEE1, 0xFEE3, 0xFEE4, 0xFEE2], // MEEM
  [0x0646, 0xFEE5, 0xFEE7, 0xFEE8, 0xFEE6], // NOON
  [0x0647, 0xFEE9, 0xFEEB, 0xFEEC, 0xFEEA], // HEH
  [0x0648, 0xFEED, null, null, 0xFEEE], // WAW
  [0x0649, 0xFEEF, null, null, 0xFEF0], // ALEF_MAKSURA
  [0x064A, 0xFEF1, 0xFEF3, 0xFEF4, 0xFEF2], // YEH
  // Ligatures
  [0x0640, 0x0640, 0x0640, 0x0640, 0x0640], // TATWEEL
  // Diacritics (shadda, fatha, etc.) — kept as-is
  [0x064B, 0x064B, null, null, null], // FATHATAN
  [0x064C, 0x064C, null, null, null], // DAMMATAN
  [0x064D, 0x064D, null, null, null], // KASRATAN
  [0x064E, 0x064E, null, null, null], // FATHA
  [0x064F, 0x064F, null, null, null], // DAMMA
  [0x0650, 0x0650, null, null, null], // KASRA
  [0x0651, 0x0651, null, null, null], // SHADDA
  [0x0652, 0x0652, null, null, null], // SUKUN
];

for (const [code, iso, init, med, fin] of charsArray) {
  CHARS_MAP[code] = {
    isolated: iso,
    initial: init,
    medial: med,
    final: fin,
  };
}

// ============================================================
// Ligatures — LAM-ALEF combinations
// ============================================================
const LAM_ALEF_LIGATURES: Record<string, number> = {
  "\u0644\u0622": 0xFEF5, // LAM + ALEF_MADDA = 0xFEF5 (isolated)
  "\u0644\u0623": 0xFEF7, // LAM + ALEF_HAMZA_ABOVE = 0xFEF7
  "\u0644\u0625": 0xFEF9, // LAM + ALEF_HAMZA_BELOW = 0xFEF9
  "\u0644\u0627": 0xFEFB, // LAM + ALEF = 0xFEFB
};

const LAM_ALEF_LIGATURES_FINAL: Record<string, number> = {
  "\u0644\u0622": 0xFEF6,
  "\u0644\u0623": 0xFEF8,
  "\u0644\u0625": 0xFEFA,
  "\u0644\u0627": 0xFEFC,
};

// ============================================================
// Helper functions
// ============================================================

function isArabicLetter(code: number): boolean {
  return (
    (code >= 0x0621 && code <= 0x064A) ||
    code === 0x0640
  );
}

function isDiacritic(code: number): boolean {
  return code >= 0x064B && code <= 0x0652;
}

/**
 * Get the character representation (presentation form) for an Arabic letter
 * based on its context (previous and next letters).
 *
 * Uses the Python `arabic_reshaper` library's "letter at position N" logic:
 * - prevLetter "connects forward" iff it has an INITIAL form
 *   (letters like ALEF, DAL, REH, ZAIN, WAW have only isolated+final — they
 *   can connect backward but NOT forward).
 * - nextLetter is any Arabic letter (it counts as a connection target
 *   regardless of its forms, because the CURRENT letter is the one that
 *   needs an initial/medial form to connect forward).
 *
 * Form selection for the current letter:
 * - medial:    prev connects forward (has initial form) AND next is Arabic letter
 * - final:     prev connects forward (has initial form)
 * - initial:   next is Arabic letter
 * - isolated:  otherwise
 */
function getCharRep(
  current: number,
  prevCode: number | null,
  nextCode: number | null,
): number {
  const rep = CHARS_MAP[current];
  if (!rep) return current;

  // Previous letter connects forward iff it has an INITIAL form
  const prevConnectsForward = prevCode !== null
    && CHARS_MAP[prevCode] !== undefined
    && CHARS_MAP[prevCode].initial !== null;

  // Next letter is any Arabic letter
  const nextIsArabicLetter = nextCode !== null && isArabicLetter(nextCode);

  // Medial: prev connects forward AND next is Arabic letter
  if (prevConnectsForward && nextIsArabicLetter && rep.medial !== null) {
    return rep.medial;
  }
  // Final: prev connects forward
  if (prevConnectsForward && rep.final !== null) {
    return rep.final;
  }
  // Initial: next is Arabic letter
  if (nextIsArabicLetter && rep.initial !== null) {
    return rep.initial;
  }
  // Isolated
  return rep.isolated ?? current;
}

/**
 * Apply Arabic letter shaping — convert base letters to presentation forms
 * based on context. Mirrors `arabic_reshaper.reshape()` from Python.
 *
 * IMPORTANT: We preserve LRM (U+200E) and RLM (U+200F) marks because they
 * are essential for controlling the visual order of mixed LTR/RTL runs
 * (e.g., ensuring "1 يوم" displays as "number on right, يوم on left" and
 * dates like "2026-06-09" don't get mirrored). These marks are zero-width
 * so they don't visually render — they only influence bidi-js reordering.
 * PDFKit renders them as zero-width characters, not as tofu boxes.
 */
export function arabicReshape(text: string): string {
  if (!text) return "";

  // Remove only ZWJ/ZWNJ (which pdfkit would render as boxes), but KEEP
  // LRM/RLM marks (U+200E, U+200F) so bidi-js can use them for direction.
  let cleaned = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code === 0x200d || code === 0x200c) {
      continue;
    }
    cleaned += ch;
  }

  // Handle LAM-ALEF ligatures first
  // The LAM-ALEF ligature has only TWO forms: isolated and final.
  // - Isolated form (e.g., FEF9 for LAM-HAMZA-BELOW): used when ligature is at
  //   start of word OR when previous letter doesn't connect forward (e.g., after
  //   space, or after a letter like ALEF/DAL/REH that doesn't have initial form).
  // - Final form (e.g., FEFA): used when previous letter connects forward
  //   (has initial form like BEH, TEH, etc.) — meaning the ligature is in the
  //   middle/end of a word preceded by a connecting letter.
  //
  // This matches Python's arabic_reshaper behavior:
  //   "الإجازة" → LAM+ALEF-HAMZA-BELOW at start (prev=none/space) → ISOLATED FEF9
  //   "بالإجازة" → BEH+LAM+ALEF-HAMZA-BELOW (prev=BEH which connects forward) → FINAL FEFA
  let afterLigatures = "";
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const nextCh = cleaned[i + 1];
    const pair = ch + (nextCh || "");
    if (i < cleaned.length - 1 && LAM_ALEF_LIGATURES[pair]) {
      // Find previous non-diacritic character to decide isolated vs final
      let prevConnectsForward = false;
      for (let j = i - 1; j >= 0; j--) {
        const pc = cleaned[j].codePointAt(0)!;
        if (isDiacritic(pc)) continue;
        if (isArabicLetter(pc)) {
          // Previous letter connects forward iff it has an initial form
          prevConnectsForward = CHARS_MAP[pc] !== undefined && CHARS_MAP[pc].initial !== null;
        }
        break; // stop at first non-diacritic
      }
      // Use final form if prev connects forward, otherwise isolated
      const ligatureCode = prevConnectsForward
        ? LAM_ALEF_LIGATURES_FINAL[pair] || LAM_ALEF_LIGATURES[pair]
        : LAM_ALEF_LIGATURES[pair];
      afterLigatures += String.fromCodePoint(ligatureCode);
      i++; // skip the ALEF
      continue;
    }
    afterLigatures += ch;
  }

  // Now apply shaping to each Arabic letter based on context
  let result = "";
  for (let i = 0; i < afterLigatures.length; i++) {
    const ch = afterLigatures[i];
    const code = ch.codePointAt(0)!;

    if (!isArabicLetter(code) && !isDiacritic(code)) {
      result += ch;
      continue;
    }

    // Find previous Arabic letter (skip diacritics and non-Arabic chars)
    let prevCode: number | null = null;
    for (let j = i - 1; j >= 0; j--) {
      const pc = afterLigatures[j].codePointAt(0)!;
      if (isDiacritic(pc)) continue;
      if (isArabicLetter(pc)) {
        prevCode = pc;
      }
      break; // stop at first non-diacritic
    }

    // Find next Arabic letter (skip diacritics and non-Arabic chars)
    let nextCode: number | null = null;
    for (let j = i + 1; j < afterLigatures.length; j++) {
      const nc = afterLigatures[j].codePointAt(0)!;
      if (isDiacritic(nc)) continue;
      if (isArabicLetter(nc)) {
        nextCode = nc;
      }
      break; // stop at first non-diacritic
    }

    // If it's a diacritic, keep as-is
    if (isDiacritic(code)) {
      result += ch;
      continue;
    }

    // Get presentation form
    const shaped = getCharRep(code, prevCode, nextCode);
    result += String.fromCodePoint(shaped);
  }

  return result;
}

/**
 * Apply Unicode Bidirectional Algorithm to reorder text for visual display.
 * Mirrors `bidi.algorithm.get_display()` from Python.
 *
 * Uses bidi-js package's `getReorderedString()` which takes the full
 * embedding levels result (including paragraphs).
 */
export function bidiGetDisplay(text: string): string {
  if (!text) return "";

  try {
    const result = bidi.getEmbeddingLevels(text);
    // If no RTL paragraphs, return as-is
    if (result.paragraphs.length === 0) return text;
    const hasRtl = result.paragraphs.some((p: any) => p.level % 2 === 1);
    if (!hasRtl) return text;

    const reordered = (bidi as any).getReorderedString(text, result);
    return reordered;
  } catch (e) {
    // If bidi fails, return original text (better than crashing)
    return text;
  }
}

/**
 * Full Arabic text processing pipeline — matches the Python bot's
 * `process_arabic_text()` and the reference PDF exactly.
 *
 * Pipeline (mirrors pdf_generator_updated.py):
 *   1. reshaped = arabicReshape(text)        // Arabic letter shaping
 *   2. bidi_text = bidiGetDisplay(reshaped)   // Unicode BiDi reordering
 *
 * The reference PDF (sickleave (2).pdf) stores text in VISUAL order
 * (reshaped + bidi-applied). pdfkit must receive visual-order text and
 * NOT do its own BiDi (which would double-reverse and produce garbage).
 *
 * To prevent pdfkit's internal BiDi:
 *   - Pass the text as a single string with `lineBreak: false`
 *   - Use `align: "left"` or `align: "center"` (NOT "right" — that triggers RTL)
 *   - Do NOT use `features: ["rtla"]`
 */
export function processArabicText(text: string): string {
  if (!text) return "";
  const reshaped = arabicReshape(text);
  const display = bidiGetDisplay(reshaped);
  return display;
}

/**
 * Safe mixed Arabic + Latin/digits text processing.
 * Mirrors the Python bot's `safe_arabic_mixed()` function.
 *
 * Same pipeline as processArabicText. The Unicode BiDi algorithm
 * correctly handles mixed-direction text by keeping LTR runs (digits,
 * Latin letters, brackets) in LTR order while reordering RTL runs
 * (Arabic words) for visual display.
 */
export function safeArabicMixed(text: string): string {
  return processArabicText(text);
}
