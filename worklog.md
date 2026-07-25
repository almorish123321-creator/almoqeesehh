# Project Worklog

---
Task ID: PDF-BIDI-TEST
Agent: general-purpose (vision analysis)
Task: Analyze test PDFs of mixed Arabic/Latin text rendering

## Summary

Analyzed 8 test PNG images rendered by pdfkit, each showing a single 400x100pt PDF page
with one line of mixed Arabic/Latin text. Each test was rendered with one of two configurations:
`rtla` (right-to-left-accounting feature flag enabled) vs `no-rtla` (disabled), crossed with
different code paths ("single-text" vs "bot-style"). The VLM skill (`z-ai vision` CLI, model
`glm-5v-turbo`) was used to assess each image for visual reading order, Arabic shaping
(connected vs disconnected), digit ordering in dates, bracket/colon rendering, and overall
readability.

**Important caveat:** VLM OCR of small/low-res text is unreliable for exact transcription
(the model repeatedly misread actual Arabic words — e.g., read `مستشفى الملك فيصل التخصصي` as
`مستند الفاتورة التجارية`, and read `يوم` as `إيداع`/`إسم`). However, the model's
**structural observations** (whether Arabic letters are joined cursive-style or appear
isolated, whether digit sequences are reversed, whether brackets/colons render as tofu) are
visually-grounded and reliable enough for diagnostic purposes. The findings below focus on
these structural signals, not the exact transcriptions.

## Per-image findings (structural signals)

| # | Image | Arabic shaping | Digit order in dates | Brackets `(` `)` | Colon `:` | Logical BiDi order |
|---|-------|----------------|----------------------|------------------|-----------|--------------------|
| 1 | test1-single-text-**with-rtla**    | DISCONNECTED | **REVERSED** (90-60-6202) | correct | correct | broken — fully mirrored |
| 2 | test2-single-text-**no-rtla**      | DISCONNECTED | correct (2026-06-09)      | correct | not present | broken — Arabic fragments scattered |
| 3 | test3-bot-style-**with-rtla**      | DISCONNECTED | **REVERSED** (90-60-6202) | MIRRORED (swapped positions) | not present | worst case — fully mirrored, brackets flipped |
| 4 | test4-bot-style-**no-rtla**        | **CONNECTED**| correct (2026-06-09)      | correct | correct* | readable but logical run order is off |
| 5 | test5-license-**with-rtla**        | **CONNECTED**| **REVERSED** (3440021021010141) | n/a | correct | mirrored digits — broken |
| 6 | test6-license-**no-rtla**          | **CONNECTED**| correct (1410101201200443) | n/a | correct | Arabic pushed to wrong side, BiDi not applied |
| 7 | test7-hospital-name-**with-rtla**  | **CONNECTED**| n/a (pure Arabic)         | n/a | n/a | correct — fully readable |
| 8 | test8-hospital-name-**no-rtla**    | **CONNECTED**| n/a (pure Arabic)         | n/a | n/a | correct — fully readable |

*VLM reported a colon in test4 even though the test string has no colon; likely an OCR
artifact rather than a real glyph. Treat with caution.

## Detailed analysis by test

### Test 1 — `single-text` + `rtla` — `"1 يوم (2026-06-09 إلى 2026-06-09)"`
- **Arabic letters:** DISCONNECTED — appearing in isolated forms, not joined cursive-style.
- **Date digits:** Reversed visually as `90-60-6202` — the entire Latin/numeric run has been
  mirrored by the rtl-accounting pass.
- **Brackets / colon:** Brackets render correctly; VLM also reported a colon (likely
  hallucinated since none is in source).
- **Verdict:** BROKEN. Classic BiDi over-reversal: rtla mirrors the Latin/number run
  end-to-end instead of just reordering runs. Arabic shaping is also broken in this code path.

### Test 2 — `single-text` + `no-rtla` — same string
- **Arabic letters:** DISCONNECTED — "إلى" rendered as three separate isolated letters
  (ا ل ى) instead of joined.
- **Date digits:** Correct order `2026-06-09`.
- **Brackets:** Correct.
- **Verdict:** PARTIAL — digits and brackets OK, but Arabic shaping (cursive joining) is
  broken. The single-text code path does not run proper Arabic shaping. Not acceptable
  for an Arabic reader.

### Test 3 — `bot-style` + `rtla` — `"يوم 1 (2026-06-09 إلى 2026-06-09)"`
- **Arabic letters:** DISCONNECTED.
- **Date digits:** Reversed `90-60-6202`.
- **Brackets:** MIRRORED — opening `(` appears at the right end of the text, closing `)` at
  the left end. This is the classic symptom of an entire-string-level RTL mirror.
- **Verdict:** WORST CASE. rtla causes full-string mirroring; the entire line is visually
  reversed including parentheses and digits, while also failing Arabic shaping.

### Test 4 — `bot-style` + `no-rtla` — same string
- **Arabic letters:** CONNECTED — proper cursive joining (initial/medial/final forms present).
- **Date digits:** Correct order `2026-06-09`.
- **Brackets:** Correct.
- **Verdict:** BEST of the duration tests. Glyphs render correctly and Arabic shaping works.
  The remaining issue is logical run ordering: the second `2026-06-09` date visually appears
  before the second Arabic word (`إلى`/`يوم`), suggesting the BiDi reordering of mixed runs
  is imperfect (segments appear in raw order rather than visually-reordered order). However,
  the text is much more readable than tests 1–3.

### Test 5 — `license` + `rtla` — `"رقم الترخيص: 1410101201200443"`
- **Arabic letters:** CONNECTED.
- **Digit run:** Reversed visually as `3440021021010141` (original: `1410101201200443`).
- **Colon:** Correct.
- **Verdict:** BROKEN. rtla mirrors the numeric run end-to-end. An Arabic reader would see
  the license number with its digits scrambled.

### Test 6 — `license` + `no-rtla` — same string
- **Arabic letters:** CONNECTED.
- **Digit run:** Correct `1410101201200443`.
- **Colon:** Correct.
- **Verdict:** PARTIAL. Individual glyphs are perfect, but the Unicode BiDi algorithm was
  not applied — the Arabic label "رقم الترخيص" appears on the LEFT of the line and the
  number on the RIGHT, which is the reverse of what an Arabic reader expects (label on
  right, number on left, reading RTL). For an Arabic reader this is logically backwards
  even though every glyph is technically correct.

### Test 7 — `hospital-name` + `rtla` — `"مستشفى الملك فيصل التخصصي"` (pure Arabic)
- **Arabic letters:** CONNECTED, properly shaped cursive forms.
- **Verdict:** CORRECT and fully readable. No issues.

### Test 8 — `hospital-name` + `no-rtla` — same string (pure Arabic)
- **Arabic letters:** CONNECTED, properly shaped.
- **Verdict:** CORRECT and fully readable. No issues. (Note: VLM hallucinated different
  text entirely here, but the structural shaping observation is reliable.)

## Cross-test comparison

### Effect of `rtla` flag
- **On pure Arabic text (no Latin/digits):** No visible effect. Both test7 and test8 are
  correct. (tests 7 & 8)
- **On mixed Arabic/Latin with digits:** `rtla` consistently **REVERSES the Latin/numeric
  run end-to-end**, producing mirrored digit sequences (`90-60-6202`,
  `3440021021010141`) and sometimes mirrored brackets. This is a regression vs `no-rtla`.
  (tests 1 vs 2, 3 vs 4, 5 vs 6)
- **Conclusion:** `rtla` as currently implemented is performing a naive full-string mirror
  rather than correct Unicode BiDi run reordering. It is HARMFUL for any mixed-direction
  string and should be considered broken until reimplemented.

### Effect of code path (`single-text` vs `bot-style`)
- The `single-text` path (tests 1, 2) produces **DISCONNECTED** Arabic letters — i.e., it
  is bypassing Arabic shaping (likely treating each codepoint as an isolated glyph).
- The `bot-style` path with `no-rtla` (test 4) produces **CONNECTED** Arabic letters —
  shaping works correctly.
- **Conclusion:** The `single-text` rendering path has a separate shaping bug independent
  of the BiDi issue. It should not be used for Arabic content.

### Best overall configuration
- For pure Arabic strings: either rtla or no-rtla works (test7 / test8).
- For mixed Arabic/Latin strings: **`bot-style` + `no-rtla`** (test4) is the best of the
  options tested — it is the ONLY configuration that simultaneously produces (a) connected
  Arabic letters, (b) correct digit order, and (c) correct bracket rendering.
- However, even the best case (test4) still shows imperfect BiDi run reordering — the
  logical sequence of runs is not visually reordered as an Arabic reader would expect.
  This is a separate, smaller issue than the rtla regression.

## Recommendation

1. **Disable / remove the `rtla` feature flag** in its current form. It causes a
   full-string mirror that breaks digit sequences and brackets in every mixed-direction
   test case.
2. **Deprecate the `single-text` rendering path** for Arabic content — it does not perform
   Arabic shaping and produces isolated (disconnected) letters.
3. **Use the `bot-style` + `no-rtla` path** (test4-style) as the default for mixed
   Arabic/Latin text. It produces connected Arabic and correct digits/brackets.
4. **Remaining work:** The `bot-style` + `no-rtla` path still has imperfect BiDi run
   reordering (e.g., test6 has the Arabic label on the wrong side, test4 has the second
   date visually before the second Arabic word). A proper Unicode BiDi implementation
   (e.g., using a library like `arabic-reshaper` + `python-bidi` upstream of pdfkit, or
   embedding a BiDi engine) is needed to fully fix the logical ordering while preserving
   the shaping and digit-ordering that the `no-rtla` path already gets right.

## Files / artifacts produced
- `/tmp/vlm-results/test1.json` … `/tmp/vlm-results/test8.json` — raw VLM responses
- `/tmp/vlm-prompt.txt` — the structured 6-question prompt used for all 8 images
- This worklog entry: `/home/z/my-project/worklog.md`

---
Task ID: PDF-FULL-VERIFY
Agent: general-purpose (vision analysis)
Task: Verify full sick leave PDF rendering after fixes

## Summary

Analyzed the full Sick Leave Report PDF rendered to PNG at `/tmp/test-1.png` (315 KB, 120 DPI render of the
full page). Ran three VLM passes against the same image using the `z-ai vision` CLI (model `glm-5v-turbo`):

1. **Pass 1** — full-page structured 5-question prompt (full PDF analysis)
2. **Pass 2** — focused 4-question prompt on Row 2 only
3. **Pass 3** — tie-breaker pass with `--thinking` enabled, asking the VLM to choose between two explicit
   hypotheses for the date format ("2026-06-09" correct vs "90-60-6202" reversed) and to look pixel-by-pixel
   at Arabic letter connection.

I also read the actual rendering code at `/home/z/my-project/src/app/api/generate-pdf/route.ts` and the test
payload at `/home/z/my-project/scripts/test-full-pdf.mjs` to determine the *intended* source strings, so
that VLM OCR errors (which the prior PDF-BIDI-TEST worklog established are common for small Arabic text)
can be cross-checked against ground truth.

**Headline verdict:** The `rtla` regression identified in PDF-BIDI-TEST has been fixed — the production
code path no longer uses `features: ["rtla"]` and as a result dates are no longer character-reversed
(`90-60-6202` does NOT appear) and brackets are not glyph-flipped. However, **one residual BiDi issue
remains**: the footer license line `رقم الترخيص: 1410101201200443` is rendered in logical LTR source
order (Arabic label on the left, number on the right) instead of visually-reordered RTL order (label on
the right, number on the left) — this is the same `bot-style + no-rtla` shortcoming flagged in the prior
worklog as test6, and it persists in the full PDF.

## Ground-truth source strings (from route.ts + test payload)

For cross-referencing with VLM observations:

- **Row 2 Arabic cell source string** (route.ts:573):
  `${durText} ( ${startDateAr} إلى ${endDateAr} )` where `durText = "1 يوم"` (route.ts:481 for count===1)
  and `startDateAr = endDateAr = "2026-06-09"` (converted from DD-MM-YYYY "09-06-2026" by `toArabicDate`,
  route.ts:559-565). So the **full logical source string** is:
  `1 يوم ( 2026-06-09 إلى 2026-06-09 )`
  Note: this string STARTS WITH A DIGIT ("1"), not an Arabic letter. The code's own comments at
  route.ts:548 and route.ts:557 claim that "starting the text with an Arabic letter (not a digit) is
  required for proper Arabic letter shaping (connected forms)" and that "the bot's format `يوم 1 (...)`
  produces connected letters". This is contradicted by the actual code, which uses `1 يوم` (digit first).
  Despite this, the VLM evidence below suggests HarfBuzz is still producing connected shaping — so the
  code comment appears to be outdated/wrong, OR the digit-first form also works because HarfBuzz shapes
  per-script-run rather than per-whole-string.

- **Row 2 English cell source string** (route.ts:492):
  `1 day ( 09-06-2026 to 09-06-2026 )` — uses DD-MM-YYYY (raw `startDateFormatted`).

- **Footer Arabic hospital name** (test payload line 17): `مستشفى الملك فيصل التخصصي`
- **Footer English hospital name** (test payload line 18): `King Faisal Specialist Hospital`
- **Footer license line source string** (route.ts:694): `رقم الترخيص: 1410101201200443`
  (starts with Arabic letter, then colon+space, then 16-digit number; rendered with `align: "center"`.)

## Per-question findings

### 1. Row 2 (Leave Duration) — Arabic cell (right side, dark blue)

| Sub-question | Pass 1 | Pass 2 (focused) | Pass 3 (thinking tiebreak) | Conclusion |
|---|---|---|---|---|
| (a) Text read L-to-R | `) 09-2026-06 إلى 09-2026-06 ( يوم 1` | (not asked) | (not asked) | Likely OCR-misread; see below |
| (b) Arabic letters connected? | DISCONNECTED | CONNECTED | CONNECTED | **CONNECTED** (2 of 3; the two more careful passes agree) |
| (c) Dates YYYY-MM-DD correct? | "09-2026-06" REVERSED | "2026-06-09" CORRECT | "2026-06-09" CORRECT (explicit pixel check: leftmost digit is '2', not '9') | **CORRECT** `2026-06-09` (2 of 3; tiebreak confirms) |
| (d) Brackets render correctly (not tofu)? | YES (proper `(` `)` glyphs) | YES but visually SWAPPED: `)` on left, `(` on right | (not asked) | **YES, proper glyphs** (not tofu). Visual swap (`)` left / `(` right) is consistent with correct Unicode BiDi for an RTL paragraph — opening paren on the right where reading starts. |
| (e) Reads correctly in Arabic? | (not explicitly asked) | "Arabic word for 'day' appears AFTER the number 1 (to the left of the number)" — i.e., visual L-to-R is `يوم 1` | "Digit 1 appears to the LEFT of the Arabic word يوم" — i.e., visual L-to-R is `1 يوم` | **Inconsistent** between passes; the source string starts with "1" so visual L-to-R `1 يوم` is the expected layout for no-bidi-reordering rendering. Pass 3's reading (`1 يوم` L-to-R) matches ground truth. |

**Verdict for Row 2 Arabic cell:** Fixed vs the prior `rtla` regression. Letters are connected
(proper cursive shaping), dates read `2026-06-09` in correct YYYY-MM-DD order (NOT reversed to
`90-60-6202`), and brackets render as proper `(` `)` glyphs (not tofu). The visual swap of bracket
positions (`)` on left, `(` on right) is the EXPECTED behavior for an RTL paragraph and is not a bug.

⚠️ **Caveat:** Pass 1 reported DISCONNECTED letters and reversed dates ("09-2026-06"). The prior PDF-BIDI-TEST
worklog explicitly noted that VLM structural observations are usually reliable but can be wrong on small
text. The two more-careful passes (Pass 2 focused, Pass 3 with thinking) both contradict Pass 1, and the
ground-truth source string confirms `2026-06-09` is what should be rendered. I therefore weigh Pass 2 + 3
as authoritative and treat Pass 1's date-order finding as a VLM OCR error. The Arabic-letter-connection
question is less clear-cut — Pass 1 said DISCONNECTED, Passes 2 + 3 said CONNECTED — but the more careful
passes agree on CONNECTED, and this matches the test4 (bot-style + no-rtla) result from the prior worklog.

### 2. Row 2 — English cell (left side, dark blue)

All three passes agreed (Pass 1 and Pass 2 reported; Pass 3 didn't address):

**Exact text seen:** `1 day ( 09-06-2026 to 09-06-2026 )`

Format matches the requested `1 day ( DD-MM-YYYY to DD-MM-YYYY )` pattern. Both dates show `09-06-2026`
(same start/end, since `entryDate === exitDate` in the test payload). **Correct. ✓**

### 3. Footer — Hospital name section (right side)

**(a) Arabic hospital name + connection:**
- Pass 1 read the Arabic as `فيصل الملكي متخصصون` and reported letters as **CONNECTED**.
- Per the prior worklog's caveat, this is almost certainly a VLM OCR misread of the actual source
  `مستشفى الملك فيصل التخصصي` (the same kind of misread seen in test7/test8 where the model read
  `مستشفى الملك فيصل التخصصي` as `مستند الفاتورة التجارية`).
- **Structural verdict: Arabic letters are CONNECTED (proper cursive shaping).** ✓
- This is the same positive result as test7/test8 in the prior worklog (pure-Arabic text renders
  correctly under both rtla and no-rtla).

**(b) English hospital name:**
- Pass 1 read `King Faisal` — but the actual source is `King Faisal Specialist Hospital`. The VLM
  likely truncated the reading (the English name is rendered at fontSize 12 in a 250pt-wide box, and
  the full string "King Faisal Specialist Hospital" may be tight or the model may have just stopped
  early). **Treat the VLM reading as incomplete, not as evidence of truncation in the PDF.** The
  rendering code (route.ts:674-680) uses `drawTextEn` with `width: 250, align: "center"`, which would
  wrap to two lines if needed; the VLM did not report a second line, so the name likely fit on one
  line and the VLM just under-read it.

**(c) License number line — exact text:**
- Pass 1 read: `رقم الترخيص1410101201200443 :` and noted "no space between the Arabic label and the
  number". The source string is `رقم الترخيص: 1410101201200443` (with `: ` between label and number),
  so the VLM's "no space" observation is an OCR artifact — the colon+space is being visually misplaced
  by the lack of BiDi reordering (see below), confusing the VLM.

**(d) License line layout (the key issue):**
- Pass 1 explicitly reports: "Arabic label `رقم الترخيص:` is on the **LEFT**, and the number
  `1410101201200443` is on the **RIGHT**. Expected: label on the RIGHT and number on the LEFT."
- **This matches the test6 (license + no-rtla) finding from the prior worklog exactly.** The
  `bot-style + no-rtla` code path does NOT apply Unicode BiDi run reordering, so the source string
  `رقم الترخيص: 1410101201200443` is rendered in logical LTR source order: Arabic run first (left),
  then colon, then digit run (right). For an Arabic reader this is logically backwards — the label
  should be on the right (where Arabic reading starts) and the number on the left.

**Verdict for footer license line:** **STILL BROKEN.** This is the one remaining issue from the prior
worklog that the fixes did not address. The license number is technically readable (digits in correct
order, Arabic letters connected), but the spatial layout is wrong for an Arabic reader.

### 4. Other rows — Arabic labels in rightmost column

- Pass 1: "the Arabic labels in the rightmost column (e.g., `الإجازة`, `تاريخ الدخول`, `الاسم`, etc.)
  are all rendered with **connected (cursive)** letters. Only the specific data inside the dark blue
  'Leave Duration' cell (Row 2) exhibits the disconnection issue."
- (Pass 1's claim that Row 2 is disconnected is contradicted by Passes 2 + 3, as discussed above.)
- **Structural verdict: All other-row Arabic labels render with connected letters.** ✓

### 5. Overall assessment

**The PDF is now MOSTLY CORRECT for an Arabic reader.** The most severe bug from the prior worklog
— `rtla` reversing digit sequences and flipping brackets — has been fixed (the production code at
route.ts:151-156, 173-183, 547 explicitly avoids `features: ["rtla"]`).

**Remaining issues, in priority order:**

1. **Footer license line layout is REVERSED** (high priority for Arabic readability). The source
   string `رقم الترخيص: 1410101201200443` is rendered in source LTR order: Arabic label on left,
   number on right. For an Arabic reader it should be Arabic label on right, number on left. This is
   the same `bot-style + no-rtla` shortcoming flagged in the prior worklog (test6). Suggested fix:
   apply proper Unicode BiDi reordering upstream of pdfkit (e.g., `arabic-reshaper` + `python-bidi`
   equivalent in JS, such as `node-bidi` / `bidi-js`), OR manually reorder the source string to
   `${licenseNumber} : رقم الترخيص` so that LTR source order produces the correct visual RTL layout
   (a workaround, not a real fix).

2. **Row 2 Arabic cell — discrepancy in VLM reports** (medium priority; needs human eyeball to
   confirm). Pass 1 said Arabic letters DISCONNECTED + dates reversed; Passes 2 + 3 (more careful,
   with thinking) said CONNECTED + dates correct. Ground-truth source (`1 يوم ( 2026-06-09 إلى 2026-06-09 )`)
   and the route.ts:548,557 comments suggest the digit-first source string *might* be at risk of
   disconnected shaping — but HarfBuzz shaping is per-script-run, so it likely still produces
   connected forms. **Recommend a human visually inspect `/tmp/test-1.png` Row 2 at high zoom to
   confirm the Arabic word `يوم` is rendered as a single connected cursive stroke.** If it is
   confirmed disconnected, the fix is to flip the source to `يوم 1 (...)` (Arabic word first), as
   the code's own comments prescribe but the code itself does not do (route.ts:481 returns `"1 يوم"`
   for count===1, and route.ts:573 prepends `durText` to the date parens, so the string begins with
   a digit).

3. **VLM also reported "no space between Arabic label and number" in the license line** — almost
   certainly an OCR artifact of issue #1 (the misplaced colon confuses the VLM), not a real rendering
   bug. The source string clearly has `: ` (colon + space). No action needed beyond fixing #1.

4. **VLM under-read the English hospital name** as `King Faisal` instead of
   `King Faisal Specialist Hospital`. This is a VLM OCR limitation, not a PDF rendering bug — the
   rendering code (route.ts:674-680) draws the full source string. No action needed.

## Cross-reference vs prior PDF-BIDI-TEST worklog

| Issue from prior worklog | Status in full PDF |
|---|---|
| `rtla` reverses digit sequences (`90-60-6202`, `3440021021010141`) | **FIXED** — dates read `2026-06-09` in correct order; license number reads `1410101201200443` in correct order |
| `rtla` mirrors brackets | **FIXED** — brackets render as proper `(` `)` glyphs in their BiDi-correct positions |
| `single-text` path produces disconnected Arabic letters | **Likely fixed** — Passes 2 + 3 report connected letters in Row 2 (which uses `doc.text()` single-text path); Pass 1 disagrees, so a human visual check is recommended |
| Pure-Arabic strings (hospital name) render correctly | **Still working** — ✓ Arabic hospital name renders with connected letters |
| `bot-style + no-rtla` has imperfect BiDi run reordering (test6: Arabic label on wrong side) | **NOT FIXED** — license line still shows Arabic label on left, number on right (test6 pattern persists) |

## Recommendation

1. **Highest priority:** Apply proper Unicode BiDi reordering to the footer license line (issue #1).
   Either integrate a JS BiDi library upstream of pdfkit, or as a quick workaround reverse the source
   string for that one line to `${licenseNumber} : رقم الترخيص` so that LTR source order produces
   correct visual RTL order.

2. **Medium priority:** Have a human visually verify Row 2's Arabic cell at high zoom to resolve the
   Pass 1 vs Passes 2+3 discrepancy on Arabic letter connection. If disconnected, flip `getArabicDuration`
   (route.ts:479-485) to return `"يوم 1"` instead of `"1 يوم"` for count===1, and adjust the
   `arabicDurationText` template (route.ts:573) accordingly — this would also match the code's own
   comments at route.ts:548,557 which say the format should be `يوم 1 (...)`.

3. **Low priority / no action:** The other VLM-reported issues (no space in license line, truncated
   English hospital name) are VLM OCR artifacts, not real PDF bugs.

## Files / artifacts produced

- `/tmp/vlm-results/full-pdf-analysis.json` — Pass 1 (full-page structured 5-question prompt)
- `/tmp/vlm-results/full-pdf-row2-focused.json` — Pass 2 (focused 4-question prompt on Row 2)
- `/tmp/vlm-results/full-pdf-row2-tiebreak.json` — Pass 3 (thinking-enabled tiebreaker for date format + letter connection)
- This worklog entry appended to `/home/z/my-project/worklog.md`


---
Task ID: PDF-LICENSE-VERIFY
Agent: general-purpose (vision analysis)
Task: Verify license number rendering after piece-by-piece fix

## Summary

**The license line fix is CONFIRMED WORKING.** All three previously-broken aspects of the footer
license line are now rendering correctly for an Arabic reader. The "test6 pattern" (Arabic label on
left, number on right) that was flagged in the prior worklog as **NOT FIXED** has now been resolved.

## Method

Used the VLM skill (`z-ai vision` CLI) to analyze `/tmp/fullpdf-1.png` — the full Sick Leave Report
PDF page rendered to PNG. Submitted a structured prompt with three areas of focus (footer license
line, hospital name lines, and Row 2 leave-duration cell), each broken into sub-questions to force
precise character-level reporting.

- Raw VLM response saved to: `/tmp/vlm-license-analysis.json`

## Findings

### AREA 1: Footer License Line — **FIXED ✅**

The line is now rendering correctly for an Arabic reader (RTL):

| Check | Prior (broken) state | Current (post-fix) state | Status |
|---|---|---|---|
| Arabic label `رقم الترخيص` position | LEFT side | **RIGHT side** | ✅ Fixed |
| Number `1410101201200443` position | RIGHT side | **LEFT side** | ✅ Fixed |
| Colon `:` between label and number | Misplaced / absent | **Present, between label and number** (immediately left of label, immediately right of number) | ✅ Fixed |
| Arabic letter shaping | (not checked) | **CONNECTED** — proper cursive shaping | ✅ OK |
| Visual reading order for Arabic reader | Wrong (`1410101201200443 : رقم الترخيص` reading visually as label-left/number-right) | **Correct**: `[رقم الترخيص] [:] [1410101201200443]` — label on right, then colon, then number on left | ✅ Fixed |

This is the canonical correct RTL layout for an Arabic license-number line. The piece-by-piece
fix (whatever the exact mechanism — likely the source-string reversal workaround recommended in
the prior worklog, or a BiDi library integration) has produced the intended visual order.

### AREA 2: Hospital Name Lines — **OK ✅**

- **Arabic text seen:** `فيصل الملكي متخصصين` — letters **CONNECTED** (proper cursive shaping).
- **English text seen:** `King Faisal`

Note: VLM again under-reads the English hospital name as `King Faisal` instead of the full
`King Faisal Specialist Hospital` that the source string contains. As flagged in the prior worklog,
this is a **VLM OCR limitation, not a PDF rendering bug** — the rendering code (route.ts:674-680)
draws the full source string. No action needed.

### AREA 3: Row 2 — Leave Duration / مدة الإجازة — **Mostly OK ⚠️**

- **3a.** Arabic cell (right side, dark blue) contains (transcribed by VLM):
  `الإجازة من(2026-06-09 )الى 2026-06-09 ) 1 يوم(`
- **3b.** Dates **ARE** in YYYY-MM-DD format (`2026-06-09`) — confirms the digit-reversal fix is
  still holding.
- **3c.** Brackets render as **parentheses `( )`**, not square brackets `[ ]`. This matches the
  prior worklog note ("brackets render as proper `(` `)` glyphs in their BiDi-correct positions")
  — the source uses parens, so this is expected, not a bug.
- **3d.** Full value-cell content:
  `الإجازة من(2026-06-09 )الى 2026-06-09 ) 1 يوم(`
  - Starts with `الإجازة` (Leave)
  - `من(` (from + open paren)
  - `2026-06-09` start date
  - ` ` space + `)` close paren
  - `الى` (to)
  - `2026-06-09` end date
  - ` ` space, `)`, ` ` space, `1`, ` ` space, `يوم` (day), `(`
  - English cell to its left reads: `1 day ( 09-06-2026 to 09-06-2026 )`

**⚠️ Minor remaining concern in Row 2:** The parentheses around the `(1 يوم)` group appear
visually swapped — the transcription shows `) 1 يوم(` (close-paren before, open-paren after),
which suggests BiDi is still mirroring the parens around the digit-prefixed duration text. This is
the same class of issue the prior worklog flagged at route.ts:481/573 (the `1 يوم` digit-first
source order may produce a BiDi run that starts with a digit and confuses paren placement). It does
not break the dates (which are correct YYYY-MM-DD) but the surrounding parens around the duration
text may look slightly off to a careful Arabic reader.

## Verdict

| Issue from prior worklog | New status |
|---|---|
| License line: Arabic label on wrong side (test6 pattern) | **✅ FIXED** — label now on RIGHT, number on LEFT, colon between, letters connected |
| Dates reversed by `rtla` (e.g. `90-60-6202`) | **✅ Still fixed** — dates read `2026-06-09` in correct order |
| Brackets mirrored by `rtla` | **✅ Still fixed** — parens render as proper `(` `)` glyphs (mostly; one paren-pair around `1 يوم` may still be visually swapped, see 3d above) |
| Arabic letter shaping (connected vs disconnected) | **✅ OK** — license line and hospital name both render with connected letters |
| English hospital name truncated to `King Faisal` | **No change** — VLM OCR artifact, not a rendering bug; no action needed |

## Recommended next actions

1. **None required for the license line** — the fix is verified working. Mark the
   `PDF-LICENSE-VERIFY` task as complete.
2. **Optional polish for Row 2:** If the `) 1 يوم(` reversed-paren appearance is undesirable,
   apply the workaround recommended in the prior worklog: flip `getArabicDuration` (route.ts:479-485)
   to return `"يوم 1"` instead of `"1 يوم"` for `count === 1`, and adjust the
   `arabicDurationText` template (route.ts:573) so the Arabic word leads the digit run. This would
   also align the code with its own comments at route.ts:548,557.
3. **No action** on the VLM-truncated English hospital name — confirmed VLM OCR artifact.

## Files / artifacts produced

- `/tmp/vlm-license-analysis.json` — full VLM response (3 areas × sub-questions)
- This worklog entry appended to `/home/z/my-project/worklog.md`

---
Task ID: PDF-FINAL-VERIFY
Agent: general-purpose (vision analysis)
Task: Final verification of full PDF after all fixes

## Summary

Performed the final end-to-end visual verification of the Sick Leave Report PDF
(`/tmp/test3-1.png`, final version after all prior fixes) using the VLM skill
(`z-ai vision` CLI, model `glm-5v-turbo`) with a 5-part structured prompt
covering: Row 2 Arabic cell, Row 2 English cell, footer license line, footer
hospital name, and overall verdict.

**Headline result: the PDF is now correct for an Arabic reader.** All previously
identified BiDi / shaping / bracket / date-format / license-line issues are
resolved. No remaining issues were found in the areas under test.

## Per-question findings

### 1. Row 2 — Arabic cell (right side, dark blue bg, white text)

| Sub-check | Expected | Observed | Pass? |
|---|---|---|---|
| (a) Text content (LTR transcription) | `يوم 1 (2026-06-09 إلى 2026-06-09)` | VLM read `) … إلى … ( 1 يوم` in LTR order — consistent with correct RTL logical layout | ✅ |
| (b) Arabic letter shaping | Letters CONNECTED (cursive) | CONNECTED — joined properly as standard Arabic script | ✅ |
| (c) Date format | `YYYY-MM-DD` (`2026-06-09`) | `YYYY-MM-DD` confirmed (e.g. `2026-06-09`) | ✅ |
| (d) Parentheses `(` `)` | Matching pair, correct direction | Rendered correctly as matching pair; mirrored correctly within RTL context | ✅ |
| (e) RTL read | `يوم 1 (2026-06-09 إلى 2026-06-09)` | Reads exactly as expected for an Arabic reader (right-to-left) | ✅ |

**Note on VLM transcription noise:** In sub-question (a) the VLM's literal LTR
OCR transcription prefixed each date with a stray `09-` (e.g. `09-2026-06-09`).
This is a known VLM OCR artifact on small dark-background white text — the same
class of artifact documented in earlier worklog entries. Sub-questions (c) and
(e), which ask about format and logical RTL reading respectively, were both
answered correctly by the same model invocation, which is internally consistent
only if the actual rendered dates are `2026-06-09` in YYYY-MM-DD form. The PDF
itself is therefore judged correct; only the LTR transcription line in (a) was
noisy and should not be treated as a real PDF defect.

### 2. Row 2 — English cell (left side, dark blue bg, white text)

| Sub-check | Expected | Observed | Pass? |
|---|---|---|---|
| (a) Text content | `1 day ( 09-06-2026 to 09-06-2026 )` | `1 day ( 09-06-2026 to 09-06-2026 )` | ✅ |
| (b) Verification | matches expected | confirmed exact match | ✅ |

The English cell uses DD-MM-YYYY (`09-06-2026`) as intended, with properly
spaced parentheses — consistent with prior worklog decisions on bilingual
date formatting (Arabic uses ISO YYYY-MM-DD, English uses DD-MM-YYYY).

### 3. Footer — License line (right side, below hospital name)

| Sub-check | Expected | Observed | Pass? |
|---|---|---|---|
| (a) Text content (LTR) | `1410101201200443 : رقم الترخيص` | `1410101201200443 : الترخيص رقم` (VLM split the label in its LTR transcription — see note) | ✅* |
| (b) Arabic label `رقم الترخيص` on RIGHT | yes | confirmed on the RIGHT side | ✅ |
| (c) Number `1410101201200443` on LEFT | yes | confirmed on the LEFT side | ✅ |
| (d) Colon `:` between them | yes | colon present between label and number | ✅ |
| (e) RTL read | `رقم الترخيص : 1410101201200443` | reads exactly as expected right-to-left | ✅ |

*The VLM's LTR transcription in (a) reordered the label as `الترخيص رقم`
instead of `رقم الترخيص`. This is a known VLM OCR artifact on RTL Arabic
short phrases (same class as documented in earlier worklog entries — the model
flips the visual order of two-word Arabic phrases when forced to read them
left-to-right). Sub-questions (b), (c), (d), and (e) — which probe the
*structural* layout (label position, number position, colon presence, RTL
reading) — were all answered correctly and consistently. The PDF itself is
therefore judged correct; this is a VLM transcription artifact, not a PDF
defect. The previous `PDF-LICENSE-VERIFY` task already confirmed this line via
a more focused analysis.

### 4. Footer — Hospital name (right side)

| Sub-check | Expected | Observed | Pass? |
|---|---|---|---|
| (a) Arabic name on TOP line, letters connected | yes | Arabic name on top line, letters connected properly | ✅ |
| (b) English name on SECOND line | yes | English name on second line | ✅ |
| (c) Text of both lines | `مستشفى الملك فيصل التخصصي` / `King Faisal Specialist Hospital` | VLM read Arabic as `المستشفى المتخصص الملك فيصل` (slightly garbled word order, same OCR-noise class as above) and English as `King Faisal Specialist Hospital` (exact) | ✅ (structural) |

Note: The VLM's Arabic hospital-name transcription (`المستشفى المتخصص الملك
فيصل`) does not match the expected source string (`مستشفى الملك فيصل
التخصصي`), but this is the same kind of VLM word-order drift on multi-word
Arabic phrases that has been documented throughout this worklog. The structural
checks the task asked about — (a) Arabic on top, (b) letters connected, (c)
English on second line — all passed. The English line was transcribed exactly.
No action required.

### 5. Overall verdict

| Question | Answer |
|---|---|
| (a) Is the PDF now correct for an Arabic reader? | **YES** |
| (b) Remaining issues | **None** in the areas under test |
| (c) If everything correct, say so | **Everything looks correct.** All prior fixes (Row 2 Arabic shaping, date format YYYY-MM-DD in the Arabic cell, bracket rendering, license-line label/number/colon RTL layout, hospital name stacking) are verified working in the final PDF. |

## Cross-check with prior worklog entries

- `PDF-BIDI-TEST`: Row 2 Arabic cell was previously DISCONNECTED with reversed
  digits (`90-60-6202`) — **now fixed**: letters connected, dates in
  `YYYY-MM-DD`.
- `PDF-LICENSE-VERIFY`: License line layout was the focus — **still verified
  correct**: `رقم الترخيص` on right, `1410101201200443` on left, colon in
  between.
- The optional Row 2 polish suggested in `PDF-LICENSE-VERIFY` (flipping
  `getArabicDuration` so `يوم` leads the digit) appears to have been applied,
  since the VLM now reads the cell as `يوم 1 (…)` rather than `) 1 يوم (…)`.

## VLM reliability note (consistent with prior entries)

As noted in earlier worklog entries, the VLM (`glm-5v-turbo`) is reliable on
**structural** signals (letter connection, digit-run ordering, bracket/colon
presence, left-vs-right positioning, top-vs-bottom stacking) but unreliable on
**exact transcription** of small white-on-dark-blue Arabic text. This report
relies on the structural signals for the pass/fail verdict and treats literal
LTR transcriptions as soft evidence only. Where a literal transcription
appeared to contradict the structural findings (e.g. stray `09-` prefixes,
`الترخيص رقم` vs `رقم الترخيص`), the contradiction is attributed to VLM OCR
noise, not to a PDF defect.

## Recommended next actions

1. **None.** All items under test pass. The `PDF-FINAL-VERIFY` task can be
   marked complete and the Sick Leave Report PDF can be considered
   production-ready for an Arabic reader.
2. (Optional, non-blocking) If a higher-confidence second opinion is desired,
   re-render at 2× DPI and re-run the VLM prompt — this typically reduces
   transcription noise on the small footer/hospital-name text. Not required
   for sign-off.

## Files / artifacts produced

- `/tmp/test3-1.png` — input image (final PDF page 1 render), unchanged
- VLM analysis run inline via `z-ai vision` CLI (no JSON artifact saved; full
  response captured in this worklog entry)
- This worklog entry appended to `/home/z/my-project/worklog.md`
