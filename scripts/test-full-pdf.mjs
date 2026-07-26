// Test the full PDF generation with a realistic payload
const payload = {
  id_number: "1122923749",
  patient_name_ar: "أحمد محمد السعيد",
  patient_name_en: "AHMED Mohammed Alsaeed",
  nationality_ar: "سعودي",
  nationality_en: "Saudi",
  employer_ar: "طالب جامعي",
  employer_en: "University Student",
  doctor_name_ar: "نبيل حنا نصر",
  doctor_name_en: "NABIL HANNA NASR",
  position_ar: "طبيب عام",
  position_en: "General",
  admission_date_gregorian: "09-06-2026",
  discharge_date_gregorian: "09-06-2026",
  issue_date_gregorian: "09-06-2026",
  hospital_name_ar: "مستشفى الملك فيصل التخصصي",
  hospital_name_en: "King Faisal Specialist Hospital",
  license_number: "1410101201200443",
  time: "3:28 PM",
  hospital_logo: ""
};

const res = await fetch("http://127.0.0.1:3000/api/generate-pdf", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  console.error("FAILED:", res.status, await res.text());
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
const fs = await import("fs");
fs.writeFileSync("/tmp/full-test.pdf", buf);
console.log(`OK: ${buf.length} bytes saved to /tmp/full-test.pdf`);

// Convert to PNG
const { execSync } = await import("child_process");
execSync("pdftoppm -r 120 -png /tmp/full-test.pdf /tmp/full-test", { stdio: "inherit" });
console.log("PNG saved.");
