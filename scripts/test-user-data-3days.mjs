import { generateSickLeavePDF } from "../src/lib/pdf-generator.ts";
import fs from "fs";
import { execSync } from "child_process";

const patient = {
  gsl_code: "GSL123456",
  identity_number: "1122923749",
  name_ar: "أحمد محمد السعيد",
  name_en: "TALIN MARIE AWAD AL-QAHTANI",
  date_from: "2026-02-09",
  date_to: "2026-02-11",
  day_count: 3,
  issue_date: "2026-02-09",
  employer: "طالب جامعي",
  employer_en: "University Student",
  doctor_name_ar: "نبيل حنا نصر حنا",
  doctor_name_en: "NABIL HANNA NASR HANNA",
  doctor_specialty_ar: "طبيب عام",
  doctor_specialty_en: "General",
  nationalityObj: { name_ar: "سعودي", name_en: "Saudi" },
  time_from: "3:28 PM"
};

const hospital = {
  name_ar: "مجمع عائلتي الطبي",
  name_en: "My Family Medical Center",
  license_number: "1410101201200443"
};

const buf = await generateSickLeavePDF(patient, hospital, null);
fs.writeFileSync("/tmp/user-test-3days.pdf", buf);
console.log("OK:", buf.length, "bytes -> /tmp/user-test-3days.pdf");
execSync("pdftoppm -r 200 -png /tmp/user-test-3days.pdf /tmp/user-test-3days", { stdio: "inherit" });
console.log("PNG saved");
