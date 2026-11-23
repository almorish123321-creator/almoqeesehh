/**
 * اختبار: التعبئة التلقائية (الصندوق الذكي) يجب أن تحافظ على
 * نوع النموذج المُختار (form_type) وعلى الحقول المُعبّأة سابقاً.
 */
import { parseBotMessage } from "../src/lib/parser.ts";
import { EMPTY_FORM } from "../src/lib/leave-form.ts";

const SAMPLE = `👤 اسم المريض (عربي): أحمد محمد علي
🆔 رقم الهوية: 1098765432
🌍 الجنسية (عربي): السعودية
🏢 جهة العمل (عربي): وزارة الصحة
👨‍⚕️ اسم الطبيب (عربي): د. خالد السالم
💼 المسمى الوظيفي (عربي): طبيب عام
📅 تاريخ الدخول (ميلادي): 15-11-2026
📅 تاريخ الخروج (ميلادي): 18-11-2026
🏥 اسم المنشأة (عربي): مستشفى الملك فهد
🔢 رقم الترخيص: 0102030`;

// 1) المستخدم اختار «مشهد مراجعة» ثم لصق رسالة البوت
const base = { ...EMPTY_FORM, form_type: "visit_review", employer_ar: "جهة سابقة" };
const { data, matchedFields } = parseBotMessage(SAMPLE, base);

const assert = (cond, msg) => {
  if (!cond) {
    console.error("❌ FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("✅", msg);
  }
};

assert(data.form_type === "visit_review", `form_type محفوظ بعد التعبئة (${data.form_type})`);
assert(data.employer_ar === "وزارة الصحة", `حقل مطابق استُبدل (${data.employer_ar})`);
assert(data.patient_name_ar === "أحمد محمد علي", `الاسم عُبّئ (${data.patient_name_ar})`);
assert(matchedFields.length > 5, `عدد الحقول المطابقة معقول (${matchedFields.length})`);

// 2) الأساس الافتراضي القديم (EMPTY_FORM) ما زال يعمل للاستدعاءات بدون أساس
const d2 = parseBotMessage(SAMPLE).data;
assert(d2.form_type === "sickleave", `الافتراضي بدون أساس يبقى sickleave (${d2.form_type})`);

console.log(process.exitCode ? "TEST FAILED" : "ALL PASSED");
