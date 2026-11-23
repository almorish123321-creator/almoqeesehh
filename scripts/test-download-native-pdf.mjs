// اختبار /api/download-native-pdf — توليد PDF منسّق للنماذج الأربعة
// يستخدم نفس payload الذي يرسله العميل (buildNativePayload)
const BASE = process.env.BASE || "http://localhost:3000";

function payload(type, overrides = {}) {
  return {
    type,
    patient_name_ar: "أحمد محمد السعيد",
    patient_name_en: "AHMED Mohammed Alsaeed",
    national_id: "1122923749",
    nationality: "سعودي",
    employer: "طالب جامعي",
    escort_name_ar: type === "companion" || type === "companion_review" ? "فاطمة عبدالله" : "",
    escort_name_en: type === "companion" || type === "companion_review" ? "FATIMAH Abdullah" : "",
    relation_ar: type === "companion" || type === "companion_review" ? "زوجة" : "",
    relation_en: type === "companion" || type === "companion_review" ? "Wife" : "",
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
    leave_id: "",
    hospital_logo: null,
    ...overrides,
  };
}

const types = ["sickleave", "companion", "companion_review", "visit_review"];
let failed = 0;

for (const type of types) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/download-native-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload(type)),
  });
  const ms = Date.now() - t0;
  const cd = res.headers.get("Content-Disposition") || "";
  const leaveId = res.headers.get("X-Leave-Id") || "";

  if (!res.ok) {
    const txt = await res.text();
    console.log(`❌ ${type}: HTTP ${res.status} (${ms}ms) — ${txt.slice(0, 200)}`);
    failed++;
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const isPdf = buf.slice(0, 5).toString() === "%PDF-";
  const out = `/tmp/test-${type}.pdf`;
  (await import("fs")).writeFileSync(out, buf);
  console.log(
    `${isPdf ? "✅" : "⚠️"} ${type}: HTTP ${res.status} | ${buf.length} bytes | ${ms}ms | file=${cd} | leaveId=${leaveId} | header=${buf.slice(0, 8).toString()}`,
  );
  if (!isPdf) failed++;
}

console.log(failed === 0 ? "ALL PASSED" : `FAILED: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
