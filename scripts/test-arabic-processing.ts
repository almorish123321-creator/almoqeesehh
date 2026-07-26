/**
 * Test the Arabic text processing module
 */

import { arabicReshape, bidiGetDisplay, processArabicText, safeArabicMixed } from "../src/lib/arabic-text";

const tests = [
  // Pure Arabic
  { input: "تقرير إجازة مرضية", desc: "Title" },
  { input: "رمز الإجازة", desc: "Leave ID label" },
  { input: "مدة الإجازة", desc: "Duration label" },
  { input: "تاريخ الدخول", desc: "Admission Date" },
  { input: "تاريخ الخروج", desc: "Discharge Date" },
  { input: "تاريخ إصدار التقرير", desc: "Issue Date" },
  { input: "الاسم", desc: "Name" },
  { input: "رقم الهوية / الإقامة", desc: "National ID" },
  { input: "الجنسية", desc: "Nationality" },
  { input: "جهة العمل", desc: "Employer" },
  { input: "اسم الممارس", desc: "Practitioner Name" },
  { input: "المسمى الوظيفي", desc: "Position" },
  { input: "السعودية", desc: "Saudi Arabia" },
  { input: "طالبة", desc: "Student (f)" },
  { input: "طبيب عام", desc: "General Doctor" },
  { input: "عبد الله بن محمد القحطاني", desc: "Doctor name" },
  { input: "تالين مريم عوض القحطاني", desc: "Patient name" },
  { input: "مستشفى الأطباء المتحدون", desc: "Hospital name" },
  { input: "للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة", desc: "Footer line 1" },
  { input: "الرسمي", desc: "Footer line 2" },
  // Mixed
  { input: "1 يوم ( 2026-06-09 إلى 2026-06-09 )", desc: "Duration mixed" },
  { input: "2 يوم (1447-03-28 إلى 1447-03-29)", desc: "Duration Arabic+Hijri" },
];

for (const t of tests) {
  const reshaped = arabicReshape(t.input);
  const bidi = bidiGetDisplay(reshaped);
  const processed = processArabicText(t.input);
  console.log(`\n📝 ${t.desc}`);
  console.log(`   Input:    ${t.input}`);
  console.log(`   Reshaped: ${reshaped}`);
  console.log(`   Bidi:     ${bidi}`);
  console.log(`   Final:    ${processed}`);
}
