/**
 * اختبار تدفق الإصدار والاستعلام بعد التعديلات:
 *  1) رمز إجازة فريد لكل نوع (4 أنواع) + حفظ عبر /api/upload-leave
 *  2) الاستعلام /api/inquiry يعيد البيانات حسب نوع الملف
 *  3) /api/generate-native-report مع embed:true يزيل سكربت الطباعة التلقائية
 *  4) هدف QR داخل التقرير يشير إلى /inquiry?id=CODE&nin=ID
 *  5) توليد رموز متتالية لا تتكرر (فحص عشوائية crypto)
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

let failures = 0;
function check(name, cond, extra = "") {
  const ok = Boolean(cond);
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${extra ? " | " + extra : ""}`);
  if (!ok) failures += 1;
}

const pad = (n) => String(n).padStart(2, "0");
const today = new Date();
const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

/** توليد رمز مثل المتصفح: GSL/PSL + YYMMDD + 5 أرقام crypto عشوائية */
function genCode(prefix, seq) {
  const yy = String(today.getFullYear()).slice(2);
  const mm = pad(today.getMonth() + 1);
  const dd = pad(today.getDate());
  const rand = String((seq * 37791 + 12345) % 100000).padStart(5, "0");
  return `${prefix}${yy}${mm}${dd}${rand}`;
}

async function upload(payload) {
  const resp = await fetch(`${BASE}/api/upload-leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: resp.status, data: await resp.json().catch(() => ({})) };
}

async function inquire(code, nid) {
  const resp = await fetch(`${BASE}/api/inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service_code: code, national_id: nid }),
  });
  return { status: resp.status, data: await resp.json().catch(() => ({})) };
}

const CASES = [
  {
    type: "sickleave",
    code: genCode("GSL", 1),
    name: "عبدالله محمد علي",
    extra: {},
    expectLabel: "تاريخ إصدار تقرير الإجازة",
  },
  {
    type: "companion",
    code: genCode("PSL", 2),
    name: "سعيد فهد القحطاني",
    extra: { escort_name_ar: "نورة سعيد القحطاني", relation_ar: "زوجة" },
    expectField: "escort_name",
  },
  {
    type: "companion_review",
    code: genCode("GSL", 3),
    name: "ماجد عمر الحربي",
    extra: { escort_name_ar: "خالد ماجد الحربي", relation_ar: "ابن" },
    expectField: "escort_name",
  },
  {
    type: "visit_review",
    code: genCode("GSL", 4),
    name: "فيصل ناصر الزهراني",
    extra: { admission_time: "07:25", discharge_time: "08:35", visit_type: "طوارئ" },
    expectField: "visit_type",
  },
];

async function main() {
  // 0) توليد الرموز: فحص عدم التكرار لعدة رموز متتالية (محاكاة)
  // ============================================================
  const codes = new Set();
  for (let i = 0; i < 5000; i += 1) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    codes.add(String(buf[0] % 100000).padStart(5, "0"));
  }
  console.log(`INFO | توليد 5000 رقم عشوائي → ${codes.size} قيمة مختلفة (متوقع ~4877 نظراً للاصطدام الطبيعي: 100000×(1−e^−0.05))`);
  // الاصطدامات الطبيعية متوقعة رياضياً — الرموز الفعلية الصادرة تفرد
  // عبر فحص التكرار (ensureUniqueLeaveCode) قبل الحفظ
  check("عشوائية crypto تنتج تنوعاً واسعاً", codes.size > 4800);

  // 1) رفع الأنواع الأربعة برموز مختلفة
  // ============================================================
  for (const c of CASES) {
    const up = await upload({
      form_type: c.type,
      patient_name_ar: c.name,
      patient_name_en: "Test Patient",
      id_number: "1" + String(CASES.indexOf(c) + 1).padStart(9, "0"),
      nationality_ar: "السعودية",
      employer_ar: "جهة اختبار",
      doctor_name_ar: "د. المقبني",
      position_ar: "طبيب عام",
      admission_date_gregorian: "20-09-2025",
      discharge_date_gregorian: "24-09-2025",
      hospital_name_ar: "مستشفى الاختبار العام",
      hospital_name_en: "Test General Hospital",
      hospital_type: c.code.startsWith("PSL") ? "private" : "public",
      time: "10:20",
      issue_date: iso,
      leave_id: c.code,
      ...c.extra,
    });
    check(
      `رفع ${c.type} (${c.code})`,
      up.status === 200 && up.data.success && up.data.leave_id === c.code,
      `leave_id=${up.data.leave_id}`,
    );
  }

  // 2) الاستعلام عن كل نوع والتحقق من الحقول الخاصة
  // ============================================================
  for (const c of CASES) {
    const nid = "1" + String(CASES.indexOf(c) + 1).padStart(9, "0");
    const q = await inquire(c.code, nid);
    const d = q.data?.data || {};
    check(`استعلام ${c.type} ناجح`, q.status === 200 && q.data.success === true);
    check(`${c.type}: type=${c.type}`, d.type === c.type, `got=${d.type}`);
    check(`${c.type}: الاسم`, d.name === c.name, `got=${d.name}`);
    check(`${c.type}: المنشأة`, Boolean(d.hospital), `got=${d.hospital}`);
    check(`${c.type}: الجنسية`, d.nationality === "السعودية", `got=${d.nationality}`);
    if (c.expectField === "escort_name") {
      check(`${c.type}: اسم المرافق`, d.escort_name === c.extra.escort_name_ar, `got=${d.escort_name}`);
      check(`${c.type}: صلة القرابة`, d.relation === c.extra.relation_ar, `got=${d.relation}`);
    }
    if (c.expectField === "visit_type") {
      check(`${c.type}: نوع الزيارة`, d.visit_type === "طوارئ", `got=${d.visit_type}`);
      check(`${c.type}: وقت الدخول`, d.admission_time === "07:25", `got=${d.admission_time}`);
      check(`${c.type}: وقت الخروج`, d.discharge_time === "08:35", `got=${d.discharge_time}`);
    }
  }

  // استعلام خاطئ → فشل واضح
  const bad = await inquire("GSL00000000000", "9999999999");
  check("استعلام رمز غير موجود → فشل 404", bad.status === 404 && bad.data.success === false);

  // 3) توليد التقرير مع embed:true → بلا سكربت طباعة تلقائية
  // ============================================================
  const c0 = CASES[3]; // visit_review — أشد الأنواع تعقيداً
  const gen = await fetch(`${BASE}/api/generate-native-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: c0.type,
      patient_name_ar: c0.name,
      national_id: "1000000004",
      nationality: "السعودية",
      admission_date: "2025-09-20",
      discharge_date: "2025-09-20",
      issue_date: iso,
      issue_time: "10:20",
      admission_time: "07:25",
      discharge_time: "08:35",
      visit_type_ar: "طوارئ",
      doctor_name_ar: "د. المقبني",
      doctor_name_en: "Almakbany",
      position_ar: "طبيب عام",
      position_en: "General",
      hospital_ar: "مستشفى الاختبار العام",
      hospital_en: "Test General Hospital",
      hospital_type: "public",
      include_qr: true,
      leave_id: c0.code,
      embed: true,
    }),
  });
  const html = await gen.text();
  check("توليد التقرير embed → 200", gen.status === 200);
  check("embed: لا يوجد سكربت طباعة تلقائي", !/<script>[\s\S]*window\.print/.test(html));
  check("embed: الرمز داخل التقرير", html.includes(c0.code));
  check("embed: هدف QR للاستعلام", html.includes(`/inquiry?id=${encodeURIComponent(c0.code)}&nin=1000000004`));
  check("embed: عنوان مشهد مراجعة", html.includes("مشهد مراجعة"));

  // بدون embed → السكربت موجود (نافذة الطباعة المستقلة ما زالت تعمل)
  const gen2 = await fetch(`${BASE}/api/generate-native-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "sickleave",
      patient_name_ar: "عبدالله محمد علي",
      national_id: "1000000001",
      admission_date: "2025-09-20",
      discharge_date: "2025-09-24",
      issue_date: iso,
      issue_time: "10:20",
      doctor_name_ar: "د. المقبني",
      hospital_ar: "مستشفى الاختبار العام",
      hospital_type: "public",
      leave_id: CASES[0].code,
    }),
  });
  const html2 = await gen2.text();
  check("بدون embed: سكربت الطباعة موجود", /window\.print\(\)/.test(html2));

  // 4) رمز فريد لكل إصدار: استعلام نصي عبر /api/inquire
  // ============================================================
  const all = await fetch(`${BASE}/api/inquire?limit=50`).then((r) => r.json());
  const gsls = (all.records || []).map((r) => r.gslCode);
  const uniq = new Set(gsls);
  check("كل رموز السجلات المحفوظة مختلفة", gsls.length === uniq.size, `${gsls.length} سجل / ${uniq.size} رمز`);

  console.log("\n" + (failures === 0 ? "ALL TESTS PASSED ✅" : `${failures} TEST(S) FAILED ❌`));
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("TEST RUNNER ERROR:", e);
  process.exit(1);
});
