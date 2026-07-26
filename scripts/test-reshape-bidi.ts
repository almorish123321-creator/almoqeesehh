import { arabicReshape, processArabicText } from "/home/z/my-project/src/lib/arabic-text.ts";

const tests = [
  "محمد أحمد علي",
  "السعودية",
  "مستشفى الملك فهد التخصصي",
  "د. خالد السعيد",
  "استشاري طب الأسرة",
  "رمز الإجازة",
  "اسم الممارس",
  "المسمى الوظيفي",
  "جهة العمل",
  "الاسم",
  "رقم الهوية / الإقامة",
  "تاريخ الدخول",
  "تاريخ الخروج",
  "تاريخ إصدار التقرير",
];

for (const t of tests) {
  const reshaped = arabicReshape(t);
  const processed = processArabicText(t);
  console.log("ORIG:", JSON.stringify(t));
  console.log("  RESHAPED:", JSON.stringify(reshaped));
  console.log("  PROCESSED (reshape+bidi):", JSON.stringify(processed));
  console.log("---");
}
