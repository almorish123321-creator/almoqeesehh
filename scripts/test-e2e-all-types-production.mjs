/**
 * اختبار شامل على الإنتاج — لكل نوع من الأنواع الأربعة:
 *  1) إصدار التقرير (POST /api/generate-native-report) — يتوقع HTML يحوي عنوان النوع
 *  2) الحفظ في قاعدة البيانات (POST /api/upload-leave) — يتوقع leave_id مطابق
 *  3) تنزيل PDF منسّق (POST /api/download-native-pdf) — يتوقع %PDF + ترويسة X-Leave-Id
 *     + التحقق من عنوان النوع داخل نص الـ PDF (pdftotext)
 *  4) الاستعلام (POST /api/inquiry) برمز الخدمة ورقم الهوية
 *  5) الاستعلام (GET /api/inquire?q=) والتأكد من leave_type
 *  6) صفحة الاستعلام GET /inquiry?id=…&nin=… — 200
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const BASE = process.env.BASE_URL || "https://almoqeesehh.vercel.app";
const OUT_DIR = "/home/z/my-project/download";
const TMP = "/tmp/e2e-reports";
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

// نفس خوارزمية generateNativeLeaveId (native-report.ts)
function generateNativeLeaveId(issueDate, hospitalType) {
  const prefix = hospitalType === "private" ? "PSL" : "GSL";
  const d = new Date(issueDate);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const seqId = Math.floor(Date.now() / 1000) % 100000;
  const obfuscatedId = (47313 * seqId + 15923) % 100000;
  return `${prefix}${yy}${mm}${dd}${String(obfuscatedId).padStart(5, "0")}`;
}

const ISSUE_DATE = "2026-11-23";
const HOSPITAL_AR = "مستشفى الملك فيصل التخصصي ومركز الأبحاث";
const HOSPITAL_EN = "King Faisal Specialist Hospital and Research Centre";
const LICENSE = "1410101201200443";

const CASES = [
  {
    type: "sickleave",
    titleAr: "تقرير إجازة مرضية",
    file: "sickleave.pdf",
    form: {
      patient_name_ar: "عبدالله سالم الحربي", patient_name_en: "Abdullah Salem Al-Harbi",
      id_number: "1011223344", employer_ar: "وزارة الصحة",
      admission_date_gregorian: "2026-11-20", discharge_date_gregorian: "2026-11-23", time: "10:30",
    },
  },
  {
    type: "companion",
    titleAr: "تقرير مرافقة مريض",
    file: "companion.pdf",
    form: {
      patient_name_ar: "فاطمة يوسف القحطاني", patient_name_en: "Fatimah Yusuf Al-Qahtani",
      id_number: "1022334455", employer_ar: "طالب جامعي",
      escort_name_ar: "سعد يوسف القحطاني", escort_name_en: "Saad Yusuf Al-Qahtani",
      relation_ar: "أخ", relation_en: "Brother",
      admission_date_gregorian: "2026-11-21", discharge_date_gregorian: "2026-11-23", time: "09:15",
    },
  },
  {
    type: "companion_review",
    titleAr: "مشهد مراجعة لمرافق",
    file: "companion_review.pdf",
    form: {
      patient_name_ar: "نورة عبدالعزيز الشمري", patient_name_en: "Noura Abdulaziz Al-Shammari",
      id_number: "1033445566", employer_ar: "موظفة حكومية",
      escort_name_ar: "محمد عبدالعزيز الشمري", escort_name_en: "Mohammed Abdulaziz Al-Shammari",
      relation_ar: "زوج", relation_en: "Husband",
      admission_date_gregorian: "2026-11-22", discharge_date_gregorian: "2026-11-23", time: "08:20",
    },
  },
  {
    type: "visit_review",
    titleAr: "مشهد مراجعة",
    file: "visit_review.pdf",
    form: {
      patient_name_ar: "ماجد فهد العتيبي", patient_name_en: "Majed Fahad Al-Otaibi",
      id_number: "1044556677", employer_ar: "قطاع خاص",
      admission_date_gregorian: "2026-11-22", discharge_date_gregorian: "2026-11-22",
      time: "07:25", admission_time: "07:25", discharge_time: "08:35", visit_type: "طوارئ",
    },
  },
];

function buildForm(c, leaveId) {
  return {
    ...c.form,
    form_type: c.type,
    nationality_ar: "السعودية", nationality_en: "Saudi Arabia",
    employer_en: "Employer", doctor_name_ar: "د. خالد السالم", doctor_name_en: "Dr. Khalid Al-Salem",
    position_ar: "طبيب عام", position_en: "General Practitioner",
    hospital_name_ar: HOSPITAL_AR, hospital_name_en: HOSPITAL_EN,
    license_number: LICENSE, hospital_type: "public",
    admission_time: c.form.admission_time || "07:25",
    discharge_time: c.form.discharge_time || "08:35",
    visit_type: c.form.visit_type || "طوارئ",
    duration: "", issue_date: ISSUE_DATE, include_qr: true,
    file_dates_enabled: false, file_admission_date: "", file_discharge_date: "",
    leave_id: leaveId,
  };
}

function buildNative(c, leaveId) {
  const f = buildForm(c, leaveId);
  return {
    type: c.type,
    patient_name_ar: f.patient_name_ar, patient_name_en: f.patient_name_en,
    national_id: f.id_number, nationality: f.nationality_ar, employer: f.employer_ar,
    escort_name_ar: f.escort_name_ar || "", escort_name_en: f.escort_name_en || "",
    relation_ar: f.relation_ar || "", relation_en: f.relation_en || "",
    admission_date: f.admission_date_gregorian, discharge_date: f.discharge_date_gregorian,
    duration: "", issue_date: f.issue_date, issue_time: f.time,
    admission_time: f.admission_time, discharge_time: f.discharge_time,
    visit_type_ar: f.visit_type,
    file_dates_enabled: false, file_admission_date: "", file_discharge_date: "",
    doctor_name_ar: f.doctor_name_ar, doctor_name_en: f.doctor_name_en,
    position_ar: f.position_ar, position_en: f.position_en,
    hospital_ar: f.hospital_name_ar, hospital_en: f.hospital_name_en,
    hospital_type: "public", license_number: LICENSE,
    include_qr: true, leave_id: leaveId, hospital_logo: null,
  };
}

let failures = 0;
const results = [];

for (const c of CASES) {
  console.log(`\n════════ ${c.type} — ${c.titleAr} ════════`);
  const leaveId = generateNativeLeaveId(ISSUE_DATE, "public");
  const row = { type: c.type, leaveId, checks: {} };

  // 1) إصدار
  try {
    const resp = await fetch(`${BASE}/api/generate-native-report`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildNative(c, leaveId)),
    });
    const html = await resp.text();
    const okTitle = html.includes(c.titleAr);
    row.checks.issue = resp.ok && okTitle;
    console.log(`  إصدار: HTTP ${resp.status} | العنوان داخل HTML: ${okTitle ? "✅" : "❌"}`);
  } catch (e) { row.checks.issue = false; console.log("  إصدار: ❌", e.message); }

  // 2) حفظ في DB
  try {
    const resp = await fetch(`${BASE}/api/upload-leave`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildForm(c, leaveId)),
    });
    const data = await resp.json();
    const okId = data.leave_id === leaveId;
    row.checks.upload = resp.ok && data.success && okId;
    row.recordId = data.record_id;
    console.log(`  حفظ: HTTP ${resp.status} | success=${data.success} | leave_id مطابق: ${okId ? "✅" : "❌"} (${data.leave_id})`);
  } catch (e) { row.checks.upload = false; console.log("  حفظ: ❌", e.message); }

  // 3) تنزيل PDF
  try {
    const resp = await fetch(`${BASE}/api/download-native-pdf`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildNative(c, leaveId)),
    });
    const buf = Buffer.from(await resp.arrayBuffer());
    const isPdf = buf.subarray(0, 5).toString() === "%PDF-";
    const xId = resp.headers.get("X-Leave-Id") || "";
    const cd = resp.headers.get("Content-Disposition") || "";
    if (resp.ok && isPdf) {
      const p = path.join(OUT_DIR, c.file);
      fs.writeFileSync(p, buf);
      const raw = execSync(`pdftotext "${p}" - 2>/dev/null || true`, { encoding: "utf8" });
      // pdftotext يفصل حروف العربية بمسافات (تباعد الأحرف في التصميم) — نقارن بدون مسافات
      const strip = (s) => s.replace(/[\s\u202b\u202c\u200e\u200f]+/g, "");
      const txt = strip(raw);
      const titleOk = txt.includes(strip(c.titleAr));
      const qrLinkOk = raw.includes(leaveId);
      row.checks.pdf = titleOk && qrLinkOk;
      row.pdfSize = buf.length;
      row.pdfPath = p;
      console.log(`  PDF: HTTP ${resp.status} | ${buf.length} bytes | %PDF ✅ | X-Leave-Id=${xId} ${xId === leaveId ? "✅" : "❌"}`);
      console.log(`       العنوان داخل PDF: ${titleOk ? "✅" : "❌"} | رمز الإجازة داخل PDF: ${qrLinkOk ? "✅" : "❌"} | filename: ${cd}`);
    } else {
      row.checks.pdf = false;
      console.log(`  PDF: ❌ HTTP ${resp.status} | isPdf=${isPdf} | first bytes: ${buf.subarray(0, 40).toString()}`);
    }
  } catch (e) { row.checks.pdf = false; console.log("  PDF: ❌", e.message); }

  // 4) POST /api/inquiry
  const nid = c.form.id_number;
  try {
    const resp = await fetch(`${BASE}/api/inquiry`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_code: leaveId, national_id: nid }),
    });
    const data = await resp.json();
    const nameOk = data.success && data.data?.name && String(data.data.name).includes(c.form.patient_name_ar.split(" ")[0]);
    row.checks.inquiryPost = resp.ok && data.success;
    console.log(`  استعلام POST /api/inquiry: HTTP ${resp.status} | success=${data.success} | الاسم: ${data.data?.name || "-"} ${nameOk ? "✅" : "❌"}`);
  } catch (e) { row.checks.inquiryPost = false; console.log("  استعلام POST: ❌", e.message); }

  // 5) GET /api/inquire?q=
  try {
    const resp = await fetch(`${BASE}/api/inquire?q=${encodeURIComponent(leaveId)}`);
    const data = await resp.json();
    const rec = (data.records || [])[0];
    const typeOk = rec?.leaveType === c.type;
    row.checks.inquireGet = resp.ok && data.success && data.count >= 1 && typeOk;
    console.log(`  استعلام GET /api/inquire: HTTP ${resp.status} | count=${data.count} | leave_type=${rec?.leaveType} ${typeOk ? "✅" : "❌"}`);
  } catch (e) { row.checks.inquireGet = false; console.log("  استعلام GET: ❌", e.message); }

  // 6) صفحة الاستعلام
  try {
    const resp = await fetch(`${BASE}/inquiry?id=${encodeURIComponent(leaveId)}&nin=${nid}`);
    const html = await resp.text();
    const ok = resp.ok && html.includes("رمز الخدمة");
    row.checks.inquiryPage = ok;
    console.log(`  صفحة /inquiry: HTTP ${resp.status} ${ok ? "✅" : "❌"}`);
  } catch (e) { row.checks.inquiryPage = false; console.log("  صفحة /inquiry: ❌", e.message); }

  const all = Object.values(row.checks).every(Boolean);
  if (!all) failures++;
  results.push(row);
}

console.log("\n════════ الملخص ════════");
for (const r of results) {
  const all = Object.values(r.checks).every(Boolean);
  console.log(`${all ? "✅" : "❌"} ${r.type} | leaveId=${r.leaveId} | ${r.pdfSize || 0} bytes | ${JSON.stringify(r.checks)}`);
}
console.log(failures === 0 ? "\nALL PASSED ✅" : `\n${failures} نوع فشل ❌`);
process.exitCode = failures === 0 ? 0 : 1;
