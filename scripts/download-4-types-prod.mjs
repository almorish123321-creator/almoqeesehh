/**
 * تنزيل PDF منسّق لكل نوع من الأنواع الأربعة من الإنتاج
 * والحفظ في download/ — مع التحقق من ترويسة %PDF ورقم الصفحات.
 */
const BASE = process.env.BASE_URL || "https://almoqeesehh.vercel.app";
import { mkdirSync, writeFileSync, statSync } from "node:fs";

const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

const CASES = [
  {
    type: "sickleave",
    code: `GSL${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}50136`,
    id: "1000000001",
    file: "report-sickleave.pdf",
    admission: "2025-09-20",
    discharge: "2025-09-24",
    duration: "",
  },
  {
    type: "companion",
    code: `PSL${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}87927`,
    id: "1000000002",
    file: "report-companion.pdf",
    admission: "2025-09-20",
    discharge: "2025-09-24",
    escort_name_ar: "نورة سعيد القحطاني",
    escort_name_en: "Noura Saed Alqahtani",
    relation_ar: "زوجة",
    relation_en: "Wife",
  },
  {
    type: "companion_review",
    code: `GSL${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}25718`,
    id: "1000000003",
    file: "report-companion-review.pdf",
    admission: "2025-09-20",
    discharge: "2025-09-24",
    escort_name_ar: "خالد ماجد الحربي",
    escort_name_en: "Khaled Majed Alharbi",
    relation_ar: "ابن",
    relation_en: "Son",
  },
  {
    type: "visit_review",
    code: `GSL${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}63509`,
    id: "1000000004",
    file: "report-visit-review.pdf",
    admission: "2025-09-20",
    discharge: "2025-09-20",
    admission_time: "07:25",
    discharge_time: "08:35",
    visit_type_ar: "طوارئ",
  },
];

const SHARED = {
  patient_name_ar: "فيصل ناصر الزهراني",
  patient_name_en: "Faisal Nasser Alzahrani",
  nationality: "السعودية",
  employer: "جهة اختبار",
  issue_time: "10:20",
  doctor_name_ar: "د. المقبني",
  doctor_name_en: "Almakbany",
  position_ar: "طبيب عام",
  position_en: "General",
  hospital_ar: "مستشفى الاختبار العام",
  hospital_en: "Test General Hospital",
  hospital_type: "public",
  license_number: "",
  include_qr: true,
  issue_date: iso,
};

mkdirSync("/home/z/my-project/download", { recursive: true });

let failures = 0;
for (const c of CASES) {
  const resp = await fetch(`${BASE}/api/download-native-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...SHARED,
      type: c.type,
      national_id: c.id,
      admission_date: c.admission,
      discharge_date: c.discharge,
      leave_id: c.code,
      ...Object.fromEntries(Object.entries(c).filter(([k]) => !["type", "code", "id", "file", "admission", "discharge"].includes(k))),
    }),
  });
  const buf = Buffer.from(await resp.arrayBuffer());
  const isPdf = buf.subarray(0, 5).toString() === "%PDF-";
  const header = resp.headers.get("X-Leave-Id") || "";
  console.log(
    `${isPdf && resp.status === 200 && header === c.code ? "PASS" : "FAIL"} | ${c.type} → ${c.file} | ${buf.length} bytes | X-Leave-Id=${header} | PDF-magic=${isPdf}`,
  );
  if (!isPdf || resp.status !== 200 || header !== c.code) failures += 1;
  else {
    writeFileSync(`/home/z/my-project/download/${c.file}`, buf);
    const st = statSync(`/home/z/my-project/download/${c.file}`);
    if (st.size === 0) { console.log(`FAIL | ${c.file} ملف فارغ`); failures += 1; }
  }
}

console.log("\n" + (failures === 0 ? "PDF DOWNLOADS OK ✅" : `${failures} FAILED ❌`));
process.exit(failures === 0 ? 0 : 1);
