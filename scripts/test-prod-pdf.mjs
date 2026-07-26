// Test the production PDF generation endpoint
import fs from "fs";

const payload = {
  patient_name_ar: "محمد أحمد علي",
  patient_name_en: "Mohammed Ahmed Ali",
  id_number: "1234567890",
  nationality_ar: "السعودية",
  nationality_en: "Saudi Arabia",
  employer_ar: "مستشفى الملك فهد التخصصي",
  employer_en: "King Fahd Specialist Hospital",
  doctor_name_ar: "د. خالد السعيد",
  doctor_name_en: "Dr. Khaled Al-Saeed",
  position_ar: "استشاري طب الأسرة",
  position_en: "Family Medicine Consultant",
  admission_date_gregorian: "2026-06-09",
  discharge_date_gregorian: "2026-06-15",
  hospital_name_ar: "مستشفى الملك فهد التخصصي",
  hospital_name_en: "King Fahd Specialist Hospital",
  license_number: "12345",
  time: "10:00 AM",
};

const url = process.argv[2] || "https://almoqeesehh.vercel.app";
console.log("[prod-test] Testing:", url + "/api/generate-pdf");
const res = await fetch(url + "/api/generate-pdf", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
console.log("[prod-test] Status:", res.status, res.statusText);
if (!res.ok) {
  console.error("[prod-test] FAILED:", await res.text());
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
const outPath = "/home/z/my-project/download/prod-test.pdf";
fs.writeFileSync(outPath, buf);
console.log("[prod-test] Saved:", outPath, "size:", buf.length, "bytes");
