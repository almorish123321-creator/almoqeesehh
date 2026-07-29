---
Task ID: amiri-font-2026-07-29
Agent: main
Task: Switch Arabic font in PDF generator from Noto Sans Arabic to Amiri per user's request — "اجعل النص في الخليه 2 من الصف الثاني يكون في نفس هذا الترتيبب صوره ونفس نوع الخط اميري"

Work Log:
- Analyzed user's uploaded reference image (IMG_٢٠٢٦٠٧٢٩_١٨٢٢٤٥.jpg) via VLM — confirmed cell 2 of row 2 should show "1 يوم (date الى date)" order with Amiri font
- Verified @fontsource/amiri package exists on npm and installed it locally
- Tested Amiri-Arabic subset: renders Arabic correctly with proper letter joining, has slash glyph, but lacks Latin digits (tofu boxes for 0-9)
- Tested Amiri-Latin subset: renders Latin digits (0-9) and slash correctly
- Updated src/lib/pdf-generator.ts:
  * Replaced primary Arabic font path from @fontsource/noto-sans-arabic to @fontsource/amiri (amiri-arabic-400/700-normal.woff)
  * Added Amiri-Latin subset paths (amiri-latin-400/700-normal.woff) for use in drawMixedText
  * Kept Noto Sans Arabic as fallback (replaced Almarai fallback)
  * Updated drawMixedText to use Amiri-Latin for Latin/digit runs (instead of Times-Roman) — gives the duration cell and license number a fully Amiri-styled look
- Verified the change with type-check (npx tsc --noEmit) — clean compile
- Generated test PDF via scripts/test-pdf-direct.ts
- Visual verification via VLM (--thinking mode): confirmed
  * Arabic font is now Amiri (Naskh-style with serifs)
  * Cell 2 of row 2 shows "1 يوم (09-06-2026 إلى 09-06-2026)" in correct order
  * Digits render clearly (no tofu)
  * Text is vertically centered in cell
  * Visual matches user's reference screenshot
- Committed and pushed to GitHub (commit 8556fc9) — Vercel auto-deploy triggered

Stage Summary:
- File changed: src/lib/pdf-generator.ts (font loading section + drawMixedText Latin font selection)
- Dependencies added: @fontsource/amiri@5.3.0
- User's reference image (IMG_٢٠٢٦٠٧٢٩_١٨٢٢٤٥.jpg) shows the desired Amiri font for cell 2 of row 2; we applied Amiri globally for visual consistency
- All previously-working features preserved: QR opens /inquiry, slash renders correctly (bold + extra spaces), license number digits render correctly, kingdom header at 180pt, duration cell vertical centering
- Production deployment in progress via Vercel auto-deploy
