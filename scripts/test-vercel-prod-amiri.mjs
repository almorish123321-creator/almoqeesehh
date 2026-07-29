import fs from "fs";
// Test the production Vercel deployment to verify Amiri font works in production
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

console.log("Sending request to Vercel production...");
const res = await fetch("https://almoqeesehh.vercel.app/api/generate-pdf", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ patient, hospital, doctor: null })
});

if (!res.ok) {
  console.error("HTTP error:", res.status, await res.text());
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync("/tmp/vercel-prod-amiri.pdf", buf);
console.log("OK:", buf.length, "bytes -> /tmp/vercel-prod-amiri.pdf");
