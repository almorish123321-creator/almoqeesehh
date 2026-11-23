/**
 * تصحيح تاريخ الإصدار للسجلات الأربعة المُنشأة في الاختبار الشامل —
 * إعادة الإرسال بنفس gsl_code + identity_number (مسار التحديث/upsert)
 * بعد نشر إصلاح issue_date في /api/upload-leave.
 */
const BASE = "https://almoqeesehh.vercel.app";
const ISSUE_DATE = "2026-11-23";
const HOSPITAL_AR = "مستشفى الملك فيصل التخصصي ومركز الأبحاث";
const HOSPITAL_EN = "King Faisal Specialist Hospital and Research Centre";
const LICENSE = "1410101201200443";

const CASES = [
  {
    type: "sickleave", leaveId: "GSL26112373900", nid: "1011223344",
    patient_name_ar: "عبدالله سالم الحربي", patient_name_en: "Abdullah Salem Al-Harbi",
    employer_ar: "وزارة الصحة", adm: "2026-11-20", dis: "2026-11-23", time: "10:30",
  },
  {
    type: "companion", leaveId: "GSL26112394343", nid: "1022334455",
    patient_name_ar: "فاطمة يوسف القحطاني", patient_name_en: "Fatimah Yusuf Al-Qahtani",
    employer_ar: "طالب جامعي", adm: "2026-11-21", dis: "2026-11-23", time: "09:15",
    escort_name_ar: "سعد يوسف القحطاني", escort_name_en: "Saad Yusuf Al-Qahtani",
    relation_ar: "أخ", relation_en: "Brother",
  },
  {
    type: "companion_review", leaveId: "GSL26112378221", nid: "1033445566",
    patient_name_ar: "نورة عبدالعزيز الشمري", patient_name_en: "Noura Abdulaziz Al-Shammari",
    employer_ar: "موظفة حكومية", adm: "2026-11-22", dis: "2026-11-23", time: "08:20",
    escort_name_ar: "محمد عبدالعزيز الشمري", escort_name_en: "Mohammed Abdulaziz Al-Shammari",
    relation_ar: "زوج", relation_en: "Husband",
  },
  {
    type: "visit_review", leaveId: "GSL26112362099", nid: "1044556677",
    patient_name_ar: "ماجد فهد العتيبي", patient_name_en: "Majed Fahad Al-Otaibi",
    employer_ar: "قطاع خاص", adm: "2026-11-22", dis: "2026-11-22", time: "07:25",
    admission_time: "07:25", discharge_time: "08:35", visit_type: "طوارئ",
  },
];

for (const c of CASES) {
  const form = {
    form_type: c.type,
    patient_name_ar: c.patient_name_ar, patient_name_en: c.patient_name_en,
    id_number: c.nid, nationality_ar: "السعودية", nationality_en: "Saudi Arabia",
    employer_ar: c.employer_ar, employer_en: "Employer",
    doctor_name_ar: "د. خالد السالم", doctor_name_en: "Dr. Khalid Al-Salem",
    position_ar: "طبيب عام", position_en: "General Practitioner",
    admission_date_gregorian: c.adm, discharge_date_gregorian: c.dis,
    hospital_name_ar: HOSPITAL_AR, hospital_name_en: HOSPITAL_EN,
    license_number: LICENSE, time: c.time, hospital_type: "public",
    escort_name_ar: c.escort_name_ar || "", escort_name_en: c.escort_name_en || "",
    relation_ar: c.relation_ar || "", relation_en: c.relation_en || "",
    admission_time: c.admission_time || "07:25", discharge_time: c.discharge_time || "08:35",
    visit_type: c.visit_type || "طوارئ", duration: "",
    issue_date: ISSUE_DATE, leave_id: c.leaveId, include_qr: true,
    file_dates_enabled: false, file_admission_date: "", file_discharge_date: "",
  };
  const resp = await fetch(`${BASE}/api/upload-leave`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  const data = await resp.json();
  console.log(`${c.type}: HTTP ${resp.status} | success=${data.success} | record_id=${data.record_id} | leave_id=${data.leave_id}`);

  // تحقق فوري من الاستعلام
  const q = await fetch(`${BASE}/api/inquiry`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service_code: c.leaveId, national_id: c.nid }),
  });
  const qd = await q.json();
  console.log(`   استعلام: success=${qd.success} | issue_date=${qd.data?.issue_date} | من=${qd.data?.date_from} | حتى=${qd.data?.date_to}`);
  if (qd.data?.issue_date !== "23-11-2026") {
    console.log(`   ⚠️ تاريخ الإصدار لم يُصحَّح بعد (قد يكون النشر لم يكتمل)`);
  }
}
console.log("DONE");
