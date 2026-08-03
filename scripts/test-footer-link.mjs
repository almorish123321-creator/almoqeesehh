// Renders the full PDF with mock data, then crops the bottom-left region
// (where the inquiry link under the QR code lives) for inspection.
// Verifies the displayed text is "www.seha.sa/#/inquiries/slenquiry"
// while the clickable link target is the almoqeesehh.vercel.app/inquiry URL.

import { generateSickLeavePDF } from "../src/lib/pdf-generator.ts";
import fs from "fs";
import { execSync } from "child_process";

const patient = {
  gsl_code: "GSL-TEST-001",
  identity_number: "1122923749",
  name_ar: "أحمد محمد السعيد",
  name_en: "AHMED Mohammed Alsaeed",
  date_from: "2026-09-06",
  date_to: "2026-09-08",
  day_count: 2,
  issue_date: "2026-09-06",
  employer: "طالب جامعي",
  employer_en: "University Student",
  doctor_name_ar: "نبيل حنا نصر",
  doctor_name_en: "NABIL HANNA NASR",
  doctor_specialty_ar: "طبيب عام",
  doctor_specialty_en: "General",
  nationalityObj: { name_ar: "سعودي", name_en: "Saudi" },
  time_from: "3:28 PM",
};

const hospital = {
  name_ar: "مستشفى الملك فيصل التخصصي",
  name_en: "King Faisal Specialist Hospital",
  license_number: "1410101201200443",
};

const doctor = {
  name_ar: "نبيل حنا نصر",
  name_en: "NABIL HANNA NASR",
  specialty_ar: "طبيب عام",
  specialty_en: "General",
};

console.log("Generating PDF...");
const buf = await generateSickLeavePDF(patient, hospital, doctor);
fs.writeFileSync("/tmp/test-footer-link.pdf", buf);
console.log(`OK: ${buf.length} bytes -> /tmp/test-footer-link.pdf`);

// Convert page 1 to PNG at 150 DPI
console.log("Converting to PNG...");
execSync("pdftoppm -r 150 -png -f 1 -l 1 /tmp/test-footer-link.pdf /tmp/test-footer-link", {
  stdio: "inherit",
});
console.log("PNG saved at /tmp/test-footer-link-1.png");

// Crop the bottom-LEFT region where the inquiry link lives.
// Page is A3 at 150 DPI: ~1754 x 2396 px (code uses pageHeight=1150pt).
// footerY = 750pt → ~1500px
// link Y = footerY + 180 = 930pt → ~1938px
// leftCenterX = centerX/2 = 363pt → ~756px (center of left half)
// link X = leftCenterX - 110 = 253pt, width=250pt → 253..503pt → ~527..1049px
const cropX = 480;
const cropY = 1900;
const cropW = 700;
const cropH = 100;
const pyScript = `/tmp/crop_footer_link.py`;
fs.writeFileSync(
  pyScript,
  `from PIL import Image
im = Image.open("/tmp/test-footer-link-1.png")
print("full image size:", im.size)
crop = im.crop((${cropX}, ${cropY}, ${cropX + cropW}, ${cropY + cropH}))
crop.save("/tmp/test-footer-link-crop.png")
print("cropped size:", crop.size)
# Also upscale 3x for better OCR
big = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
big.save("/tmp/test-footer-link-crop-big.png")
print("upscaled size:", big.size)
`,
);
execSync(`python3 ${pyScript}`, { stdio: "inherit" });
console.log(`Cropped -> /tmp/test-footer-link-crop.png and /tmp/test-footer-link-crop-big.png`);

// Also dump the PDF's link annotations to verify the URI target
console.log("\n--- PDF Link Annotations ---");
try {
  execSync(`python3 -c "
import sys
try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader
r = PdfReader('/tmp/test-footer-link.pdf')
for pi, page in enumerate(r.pages):
    annots = page.get('/Annots')
    if not annots:
        continue
    for ai, a in enumerate(annots):
        a = a.get_object() if hasattr(a, 'get_object') else a
        if a.get('/Subtype') == '/Link':
            uri = a.get('/A', {}).get('/URI') or (a.get('/A').get_object() if a.get('/A') else {}).get('/URI')
            print(f'page {pi+1} annot {ai+1}: URI = {uri}')
"`, { stdio: "inherit" });
} catch (e) {
  console.log("(could not dump annotations:", e.message, ")");
}
