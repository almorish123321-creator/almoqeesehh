import bidiFactory from 'bidi-js';
const bidi: any = bidiFactory();

const tests = [
  "الإجازة",
  "رمز الإجازة",
  "مدة الإجازة",
  "تاريخ الدخول",
  "تاريخ الخروج",
  "تاريخ إصدار التقرير",
  "الاسم",
  "رقم الهوية / الإقامة",
  "الجنسية",
  "جهة العمل",
  "اسم الممارس",
  "المسمى الوظيفي",
  "تقرير إجازة مرضية",
  "تالين مريم عوض القحطاني",
  "السعودية",
  "طالبة",
  "طبيب عام",
  "عبد الله بن محمد القحطاني",
  "1 يوم ( 2026-06-09 إلى 2026-06-09 )",
];

for (const text of tests) {
  try {
    const result = bidi.getEmbeddingLevels(text);
    const reordered = bidi.getReorderedString(text, result);
    const codes = Array.from(reordered).map((c: string) => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ');
    console.log(`'${text}' → ${codes}`);
    console.log(`  visual: ${reordered}`);
  } catch (e: any) {
    console.log(`'${text}' → ERROR: ${e.message}`);
  }
}
