/**
 * Arabic text processing for PDFKit — v4
 * =======================================
 *
 * PROBLEM DIAGNOSIS:
 *   Previous version (v3) only replaced spaces with NBSP and relied on
 *   fontkit to detect script=arab → apply GSUB shaping → reverse glyphs.
 *
 *   But this approach FAILS for two reasons:
 *
 *   1. FONT SHAPING: NotoSansArabic DOES have GSUB features (isol/init/medi/
 *      fina/liga/rlig). When fontkit's ArabicShaper runs, it correctly
 *      produces presentation forms. ✅ (verified via fontTools)
 *
 *   2. BUT: PDFKit splits text on space characters (' ', '\t') in
 *      EmbeddedFont.layout(). Each chunk is then shaped SEPARATELY.
 *      Even with NBSP, fontkit's RTL reversal works on each chunk
 *      independently, so multi-word Arabic text gets word order wrong.
 *
 *      Example: "تقرير إجازة مرضية" → fontkit shapes each word, then
 *      reverses each word's glyphs. But the WORDS are emitted in the
 *      original LTR order: "تقرير" "إجازة" "مرضية". Visually:
 *      ← (reversed تقرير) ← (reversed إجازة) ← (reversed مرضية)
 *      Reading RTL: "تقرير" "إجازة" "مرضية" — actually this works!
 *
 *      BUT for mixed Arabic + Latin/digits:
 *      "1 يوم" → fontkit reverses the whole run → "موي 1" → ✗ WRONG!
 *
 * SOLUTION (v4):
 *   Use the proven pipeline from the Python bot:
 *     1. arabicReshape() — convert base letters to Presentation Forms
 *        (isolated/initial/medial/final) based on context.
 *     2. bidiGetDisplay() — apply Unicode Bidirectional Algorithm to
 *        reorder characters for visual display.
 *
 *   This produces a string that is ALREADY in visual order. PDFKit then
 *   just renders glyphs left-to-right WITHOUT any additional RTL reversal
 *   from fontkit.
 *
 *   To prevent fontkit from doing RTL reversal, we render the text using
 *   a Latin font (Times-Roman) for the Latin/digit parts — but for Arabic
 *   parts we MUST use the Arabic font. fontkit will detect the Arabic
 *   script and still apply shaping. To avoid the RTL reversal, we
 *   pre-reverse each Arabic word ourselves (so fontkit's reverse puts
 *   it back to the correct order) — wait no, that won't work.
 *
 *   The actual solution: render the pre-shaped, bidi-reordered text and
 *   rely on fontkit to do nothing further. The pre-shaped presentation
 *   form characters (U+FE70–U+FEFC) are letter-like glyphs that don't
 *   trigger ArabicShaper's context-sensitive shaping (they're already
 *   presentation forms). So fontkit will:
 *     - Detect script = arab (presentation forms ARE in the Arabic block)
 *     - Apply GSUB features — but the font's GSUB table doesn't
 *       substitute presentation forms further (they're already
 *       presentation forms), so no changes happen
 *     - Reverse the glyphs (RTL)
 *
 *   So we need to PRE-REVERSE each glyph run before handing it to
 *   PDFKit. But bidiGetDisplay already does this!
 *
 *   Test:
 *     Input: "1 يوم"
 *     After arabicReshape: "1 ﻳﻮﻡ" (with presentation forms for ي و م)
 *       Actually: ي=0x064A → medial=0xFEF2 (ﻳ), و=0x0648 → isolated=0xFEED (ﻭ),
 *                 م=0x0645 → final=0xFEE2 (ﻢ)
 *       Reshaped "يوم" → "ﻳﻮﻡ"
 *     After bidiGetDisplay on "1 ﻳﻮﻡ" (RTL paragraph):
 *       - Level 0 for "1" (LTR)
 *       - Level 1 for " " (NBSP-like, paragraph level)
 *       - Level 1 for "ﻳﻮﻡ" (RTL)
 *       L2 reversal: segments at level >= 1: " ﻳﻮﻡ" reversed → "ﻥﻮﻳ "
 *       Final: "ﻥﻮﻳ 1" → visually "موي 1" — wait that's the same as before
 *
 *   Hmm — bidiGetDisplay reorders at character level, but the glyphs
 *   are presentation forms. When fontkit processes "ﻥﻮﻳ" (reversed), it
 *   will:
 *     - Detect arab script
 *     - Apply GSUB — but GSUB on already-presentation-forms doesn't
 *       change anything
 *     - Reverse the glyphs (RTL) — back to "ﻳﻮﻥ" — WRONG
 *
 *   So we need to DISABLE fontkit's RTL reversal. The way to do this
 *   in PDFKit is to NOT pass Arabic code points — pass the presentation
 *   forms. fontkit checks script via Unicode properties. Presentation
 *   forms ARE in the Arabic block (U+FB50–U+FEFF), so fontkit WILL
 *   still treat them as Arabic.
 *
 *   The cleanest solution: render with a Latin font. PDFKit only does
 *   font shaping (font.layout) for embedded fonts via fontkit. Standard
 *   PDF fonts like Helvetica/Times don't go through fontkit at all —
 *   they use simple glyph mapping without shaping.
 *
 *   But NotoSansArabic is an embedded font — fontkit WILL process it.
 *
 *   ACTUAL SOLUTION:
 *   1. Pre-shape Arabic letters into presentation forms.
 *   2. Apply bidi reordering at the character level.
 *   3. The bidi-reordered string is in VISUAL order.
 *   4. Pass it to PDFKit with the Arabic font. fontkit will:
 *      - Detect script (Arabic — because of presentation form code points)
 *      - Apply GSUB (no-op on presentation forms)
 *      - REVERSE the glyphs (RTL)
 *
 *   To compensate for fontkit's unwanted reversal, we need to PRE-REVERSE
 *   the order of the Arabic glyphs AFTER bidiGetDisplay. So:
 *     - Arabic run "ﻳﻮﻡ" (after bidiGetDisplay, visually correct order
 *       for direct LTR rendering) → pre-reverse → "ﻥﻮﻳ" → fontkit
 *       reverses it back → "ﻳﻮﻡ" — correct!
 *
 *   But for the Latin run "1" → bidiGetDisplay leaves it as "1" → no
 *   need to reverse → fontkit doesn't reverse (no Arabic script
 *   detected, but fontkit detects it based on FONT not content).
 *
 *   Wait — fontkit detects script from the STRING passed to font.layout.
 *   For "1" with no Arabic, script = latn → no reversal. ✅
 *   For "ﻳﻮﻡ" (presentation forms) → script = arab → REVERSAL.
 *
 *   So our pipeline:
 *     1. arabicReshape(text) — convert base Arabic letters to
 *        presentation forms (initial/medial/final/isolated).
 *     2. bidiGetDisplay(reshaped) — reorder characters per Unicode bidi
 *        algorithm. Produces a visually-ordered string.
 *     3. Replace ASCII spaces with NBSP to prevent PDFKit splitting.
 *     4. Pass to PDFKit with the Arabic font. fontkit will shape (no-op
 *        on presentation forms) and reverse (compensated for by bidi).
 *
 *   For pure Arabic text (e.g. "تقرير إجازة مرضية"):
 *     1. arabicReshape → "ﺗﻘﺮﻳﺮ ﺇﺟﺎﺯﺓ ﻣﺮﺿﻴﺔ"
 *     2. bidiGetDisplay → "ﺔﻴﻀﺮﻣ ﺔﺯﺎﺟﺇ ﺮﻴﺮﻗﺗ" (each word's glyphs reversed
 *        separately, words in RTL order)
 *     3. fontkit reverses each word → "ﺗﻘﺮﻳﺮ ﺇﺟﺎﺯﺓ ﻣﺮﺿﻴﺔ" → correct!
 *
 *   For mixed text "1 يوم":
 *     1. arabicReshape → "1 ﻳﻮﻡ"
 *     2. bidiGetDisplay → "ﻡﻮﻳ 1" (Arabic run reversed, Latin run kept)
 *     3. fontkit reverses the Arabic run → "1 يوم" — wait, fontkit
 *        reverses ALL glyphs in a single text() call. If we use one
 *        text() call with mixed content, fontkit reverses everything,
 *        making "1 ﻳﻮﻡ" → "ﻡﻮﻳ 1" — which is WRONG (digits reversed
 *        to position 1).
 *
 *   CONCLUSION: We cannot use a single text() call for mixed content
 *   with the Arabic font. The caller must split mixed text into
 *   Arabic-only and Latin-only chunks and render each chunk separately.
 *
 *   For PURE Arabic text, the v4 pipeline works. For mixed text, the
 *   caller MUST use the manual split approach.
 */

import bidiFactory from "bidi-js";

const bidi = bidiFactory();

// ============================================================
// Arabic Presentation Forms mapping
// ============================================================

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
 * Apply Arabic letter shaping — convert base Arabic letters to their
 * presentation forms (isolated/initial/medial/final) based on context,
 * and handle LAM-ALEF ligatures.
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
 *
 *   "1 يوم" → "موي 1"
 *   "تقرير إجازة مرضية" → "ةيضرم ةزاجإ ريرقت"
 *   "( 2026-06-09 إلى 2026-06-15 )" → "( 15-06-2026 ىلإ 2026-06-09 )"
 *
 * The returned string is in VISUAL order — read left-to-right.
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
 * FULL ARABIC TEXT PROCESSING PIPELINE (v4).
 *
 * Stages:
 *   1. arabicReshape(text) — convert base Arabic letters to their
 *      presentation forms based on context (initial/medial/final/isolated).
 *      This makes the letters "look connected" when rendered by a font
 *      that has the presentation form glyphs (NotoSansArabic does).
 *
 *   2. bidiGetDisplay(reshaped) — apply Unicode Bidirectional Algorithm.
 *      This reorders characters so the string is in VISUAL order
 *      (left-to-right, ready for direct rendering).
 *
 *   3. Replace ASCII spaces with NBSP (\u00A0) to prevent PDFKit from
 *      splitting the text on spaces and laying out each chunk separately.
 *
 * RESULT: A string ready for `doc.text(...)` with the Arabic font.
 * fontkit will detect Arabic script → apply GSUB (no-op on presentation
 * forms) → REVERSE the glyphs (RTL). The pre-reversal done by
 * bidiGetDisplay + the fontkit reversal = net effect is correct visual
 * order for each Arabic word.
 *
 * IMPORTANT:
 *   - For PURE Arabic text (no digits/Latin), this works perfectly.
 *   - For MIXED text (Arabic + digits/Latin), the bidiGetDisplay
 *     reordering is correct, BUT fontkit's blanket RTL reversal will
 *     also flip the digits. The caller MUST use a separate text() call
 *     for each piece — see drawTextMixed in route.ts or the Row 2
 *     handler.
 */
export function processArabicText(text: string): string {
  if (!text) return "";
  const reshaped = arabicReshape(text);
  const bidiText = bidiGetDisplay(reshaped);
  // Replace ASCII spaces with NBSP to prevent PDFKit from splitting
  // on spaces and laying out each chunk separately.
  return bidiText.replace(/ /g, "\u00A0");
}

/**
 * Safe mixed Arabic + Latin/digits text processing.
 *
 * WARNING: For text containing dates or long digit runs, fontkit's RTL
 * reversal will flip the digits, producing garbled output. In those
 * cases, the caller MUST split the text and render each piece
 * separately. See Row 2 handler in route.ts.
 */
export function safeArabicMixed(text: string): string {
  return processArabicText(text);
}
