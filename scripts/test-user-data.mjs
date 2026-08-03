import { generateSickLeavePDF } from "../src/lib/pdf-generator.ts";
import fs from "fs";
import { execSync } from "child_process";

const patient = {
  gsl_code: "GSL123456",
  identity_number: "1122923749",
  name_ar: "أحمد محمد السعيد",
  name_en: "TALIN MARIE AWAD AL-QAHTANI",
  date_from: "2025-09-20",
  date_to: "2025-09-21",
  day_count: 2,
  issue_date: "2025-09-20",
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
fs.writeFileSync("/tmp/user-test.pdf", buf);
console.log("OK:", buf.length, "bytes -> /tmp/user-test.pdf");
execSync("pdftoppm -r 200 -png /tmp/user-test.pdf /tmp/user-test", { stdio: "inherit" });
console.log("PNG saved");
