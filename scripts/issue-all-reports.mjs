/**
 * إصدار نسخة PDF من كل نموذج من الأربعة + حفظ السجلات في قاعدة البيانات
 * + التحقق من صفحة الاستعلام (POST /api/inquiry) لكل سجل.
 *
 * ينتج الملفات في /home/z/my-project/download/ بأسماء عربية واضحة.
 */
import { writeFileSync } from "fs";

const BASE = process.env.BASE || "https://almoqeesehh.vercel.app";
const NIN = "1122923749";

const common = {
  patient_name_ar: "أحمد محمد السعيد",
  patient_name_en: "AHMED Mohammed Alsaeed",
  national_id: NIN,
  nationality: "سعودي",
  employer: "طالب جامعي",
  admission_date: "2026-11-20",
  discharge_date: "2026-11-22",
  duration: "3 أيام",
  issue_date: "2026-11-22",
  issue_time: "10:20",
  admission_time: "07:25",
  discharge_time: "08:35",
  visit_type_ar: "طوارئ",
  doctor_name_ar: "نبيل حنا نصر",
  doctor_name_en: "NABIL HANNA NASR",
  position_ar: "استشاري طب الأسرة",
  position_en: "Family Medicine Consultant",
  hospital_ar: "مستشفى الملك فيصل التخصصي ومركز الأبحاث",
  hospital_en: "King Faisal Specialist Hospital and Research Centre",
  hospital_type: "public",
  license_number: "1410101201200443",
  include_qr: true,
  hospital_logo: null,
};

const reports = [
  {
    type: "sickleave",
    file: "1-تقرير-إجازة-مرضية.pdf",
    label: "الإجازة المرضية",
  },
  {
    type: "companion",
    file: "2-تقرير-مرافق-المريض.pdf",
    label: "مرافق المريض",
    extra: {
      escort_name_ar: "فاطمة عبدالله محمد",
      escort_name_en: "FATIMAH Abdullah Mohammed",
      relation_ar: "زوجة",
      relation_en: "Wife",
    },
  },
  {
    type: "companion_review",
    file: "3-تقرير-مراجعة-المرافق.pdf",
    label: "مراجعة المرافق",
    extra: {
      escort_name_ar: "فاطمة عبدالله محمد",
      escort_name_en: "FATIMAH Abdullah Mohammed",
      relation_ar: "زوجة",
      relation_en: "Wife",
    },
  },
  {
    type: "visit_review",
    file: "4-تقرير-مراجعة-الزيارة.pdf",
    label: "مراجعة الزيارة",
  },
];

let failed = 0;
const issued = [];

for (const r of reports) {
  // 1) توليد PDF منسّق (الخادم يولّد رمز الإجازة ويعيده في الترويسة)
  const res = await fetch(`${BASE}/api/download-native-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...common, ...r.extra, type: r.type, leave_id: "" }),
  });
  if (!res.ok) {
    console.log(`❌ ${r.label}: PDF HTTP ${res.status} — ${(await res.text()).slice(0, 150)}`);
    failed++;
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const leaveId = res.headers.get("X-Leave-Id") || "";
  if (buf.slice(0, 5).toString() !== "%PDF-") {
    console.log(`❌ ${r.label}: ليس ملف PDF صالح`);
    failed++;
    continue;
  }
  writeFileSync(`/home/z/my-project/download/${r.file}`, buf);
  console.log(`✅ PDF ${r.label}: ${buf.length} bytes | رمز الإجازة: ${leaveId}`);

  // 2) حفظ السجل في قاعدة البيانات بنفس الرمز المطبوع في التقرير
  const up = await fetch(`${BASE}/api/upload-leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...common,
      ...r.extra,
      form_type: r.type,
      leave_id: leaveId,
      id_number: NIN,
      patient_name_ar: common.patient_name_ar,
      patient_name_en: common.patient_name_en,
      nationality_ar: common.nationality,
      nationality_en: "Saudi",
      employer_ar: common.employer,
      employer_en: "University Student",
      doctor_name_ar: common.doctor_name_ar,
      doctor_name_en: common.doctor_name_en,
      position_ar: common.position_ar,
      position_en: common.position_en,
      hospital_name_ar: common.hospital_ar,
      hospital_name_en: common.hospital_en,
      admission_date_gregorian: common.admission_date,
      discharge_date_gregorian: common.discharge_date,
      time: common.issue_time,
    }),
  });
  const upData = await up.json().catch(() => ({}));
  if (!up.ok || !upData.success) {
    console.log(`❌ حفظ ${r.label}: HTTP ${up.status} — ${JSON.stringify(upData).slice(0, 150)}`);
    failed++;
    continue;
  }
  console.log(`   💾 حفظ: ${upData.message} | record_id=${upData.record_id}`);

  // 3) التحقق من الاستعلام — نفس نداء صفحة /inquiry عند مسح الباركود
  const q = await fetch(`${BASE}/api/inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service_code: leaveId, national_id: NIN }),
  });
  const qData = await q.json().catch(() => ({}));
  if (!q.ok || !qData.success) {
    console.log(`❌ استعلام ${r.label}: HTTP ${q.status} — ${JSON.stringify(qData).slice(0, 150)}`);
    failed++;
    continue;
  }
  const d = qData.data || {};
  console.log(
    `   🔍 استعلام: success | الاسم=${d.name} | من ${d.date_from} إلى ${d.date_to} (${d.day_count} يوم) | الطبيب=${d.doctor_name}`,
  );
  issued.push({ label: r.label, file: r.file, leaveId });
}

console.log("\n===== الملخص =====");
for (const i of issued) console.log(`${i.label}: ${i.file} | ${i.leaveId}`);
console.log(failed === 0 ? "ALL PASSED" : `FAILED: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
