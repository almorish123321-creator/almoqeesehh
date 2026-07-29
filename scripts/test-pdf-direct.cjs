// Direct PDF generator test — bypasses Next.js, calls the TS module via tsx.
// Generates a test PDF with the current pdf-generator.ts code and saves it
// to /tmp/full-test.pdf, then converts it to PNG for visual inspection.
const { execSync } = require("child_process");
const fs = require("fs");

// Use tsx to run a TypeScript entry that imports the generator directly.
const tsxScript = `
import { generateSickLeavePDF } from "../src/lib/pdf-generator";

const patient = {
  gsl_code: "GSL123456",
  identity_number: "1122923749",
  name_ar: "أحمد محمد السعيد",
  name_en: "AHMED Mohammed Alsaeed",
  date_from: "2026-06-09",
  date_to: "2026-06-09",
  day_count: 1,
  issue_date: "2026-06-09",
  employer: "طالب جامعي",
  employer_en: "University Student",
  doctor_name_ar: "نبيل حنا نصر",
  doctor_name_en: "NABIL HANNA NASR",
  doctor_specialty_ar: "طبيب عام",
  doctor_specialty_en: "General",
  nationalityObj: { name_ar: "سعودي", name_en: "Saudi" },
  time_from: "3:28 PM"
};

const hospital = {
  name_ar: "مستشفى الملك فيصل التخصصي",
  name_en: "King Faisal Specialist Hospital",
  license_number: "1410101201200443"
};

const buf = await generateSickLeavePDF(patient, hospital, null);
fs.writeFileSync("/tmp/full-test.pdf", buf);
console.log("OK:", buf.length, "bytes -> /tmp/full-test.pdf");
`;

fs.writeFileSync("/tmp/run-pdf-gen.ts", tsxScript);

// Run via tsx
process.chdir("/home/z/my-project");
execSync("npx tsx /tmp/run-pdf-gen.ts", { stdio: "inherit" });

// Convert to PNG at high resolution
execSync("pdftoppm -r 200 -png /tmp/full-test.pdf /tmp/full-test", { stdio: "inherit" });
console.log("PNG saved to /tmp/full-test-1.png");
