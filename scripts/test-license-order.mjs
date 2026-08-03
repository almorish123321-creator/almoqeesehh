// Standalone test for the license number rendering.
// Renders the full PDF with mock data, converts to PNG, and crops the
// bottom-right region (where the license number lives) for inspection.

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
fs.writeFileSync("/tmp/test-license-order.pdf", buf);
console.log(`OK: ${buf.length} bytes -> /tmp/test-license-order.pdf`);

// Convert page 1 to PNG at 150 DPI
console.log("Converting to PNG...");
execSync("pdftoppm -r 150 -png -f 1 -l 1 /tmp/test-license-order.pdf /tmp/test-license-order", {
  stdio: "inherit",
});
console.log("PNG saved at /tmp/test-license-order-1.png");

// Crop the bottom-right region where the license number appears, using Pillow.
// Page is A3 at 150 DPI: ~1754 x 2396 px (code uses pageHeight=1150pt).
// footerY = 750pt, license at footerY+165 = 915pt → ~1906px
// rightCenterX = 631.4pt, license X = 506..756pt → ~1055..1576px
const cropX = 1040;
const cropY = 1880;
const cropW = 560;
const cropH = 100;
const pyScript = `/tmp/crop_license.py`;
fs.writeFileSync(
  pyScript,
  `from PIL import Image
im = Image.open("/tmp/test-license-order-1.png")
print("full image size:", im.size)
crop = im.crop((${cropX}, ${cropY}, ${cropX + cropW}, ${cropY + cropH}))
crop.save("/tmp/test-license-crop.png")
print("cropped size:", crop.size)
# Also upscale 3x for better OCR
big = crop.resize((crop.width * 3, crop.height * 3), Image.LANCZOS)
big.save("/tmp/test-license-crop-big.png")
print("upscaled size:", big.size)
`,
);
execSync(`python3 ${pyScript}`, { stdio: "inherit" });
console.log(`Cropped -> /tmp/test-license-crop.png and /tmp/test-license-crop-big.png`);
