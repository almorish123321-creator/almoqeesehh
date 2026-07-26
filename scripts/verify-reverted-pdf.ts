/**
 * verify-reverted-pdf.ts
 *
 * Generates a PDF by calling the SAME /api/generate-pdf route.ts
 * (after the revert to before commit 3fe33ad). Saves the PDF and
 * a PNG render for visual review.
 *
 * Run with: bun scripts/verify-reverted-pdf.ts
 */

import { writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();

// --- 1. Load the route handler (TS, transpiled by bun on the fly) ---
// Next's `NextRequest` import is `next/server`. Under bun runtime we
// don't have that available outside of Next — but the route only calls
// `req.json()`. So we cast a plain Request to `any` and feed it in.
const routeModule = await import("../src/app/api/generate-pdf/route.ts");
const POST = routeModule.POST as (req: any) => Promise<Response>;
if (typeof POST !== "function") {
  console.error("Could not load POST handler from route.ts");
  process.exit(1);
}

// --- 2. Build a fake request with the same sample data the user tested with ---
const sampleBody = {
  id_number: "1234567890",
  patient_name_ar: "محمد عبدالله السالم",
  patient_name_en: "Mohammed Abdullah Al-Salem",
  admission_date_gregorian: "2026-06-09",
  discharge_date_gregorian: "2026-06-15",
  nationality_ar: "السعودية",
  nationality_en: "Saudi",
  employer_ar: "شركة example للتجارة",
  employer_en: "Example Trading Co.",
  doctor_name_ar: "خالد المطيري",
  doctor_name_en: "Khaled Al-Mutairi",
  position_ar: "استشاري طب الأسرة",
  position_en: "Family Medicine Consultant",
  hospital_name_ar: "مستشفى الملك فهد التخصصي",
  hospital_name_en: "King Fahad Specialist Hospital",
  license_number: "12345",
  time: "10:30 ص",
};

const fakeReq = new Request("http://localhost/api/generate-pdf", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(sampleBody),
});

// --- 3. Call POST and capture the response ---
const res = await POST(fakeReq);
if (!res.ok) {
  console.error("POST failed:", res.status, await res.text());
  process.exit(1);
}

const pdfBuffer = Buffer.from(await res.arrayBuffer());

// --- 4. Save the PDF ---
mkdirSync(join(ROOT, "download"), { recursive: true });
const pdfPath = join(ROOT, "download", "reverted-design.pdf");
writeFileSync(pdfPath, pdfBuffer);
console.log("Saved PDF:", pdfPath, "(" + pdfBuffer.length + " bytes)");

// --- 5. Render to PNG using pdftoppm (poppler-utils) ---
const pngPath = join(ROOT, "download", "reverted-design.png");
const pngBasePath = pngPath.replace(/\.png$/, "");
const pdftoppmResult = spawnSync(
  "pdftoppm",
  ["-png", "-r", "150", "-singlefile", pdfPath, pngBasePath],
  { encoding: "utf8" },
);
if (pdftoppmResult.status !== 0) {
  console.error("pdftoppm failed:", pdftoppmResult.status, pdftoppmResult.stderr);
  process.exit(1);
}
console.log("Saved PNG:", pngPath);
