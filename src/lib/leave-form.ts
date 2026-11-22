/**
 * Leave form field definitions and types.
 * تعريفات حقول استمارة الإجازة المرضية.
 *
 * أنواع النماذج الأربعة — منقولة من المستودع المرجعي floseseh
 * (نفس أزرار لوحة التحكم: startForm(type)):
 *   sickleave        → تقرير إجازة مرضية
 *   companion        → تقرير مرافقة مريض
 *   companion_review → مشهد مراجعة لمرافق
 *   visit_review     → مشهد مراجعة
 */

export type NativeFormType =
  | "sickleave"
  | "companion"
  | "companion_review"
  | "visit_review";

export const NATIVE_FORM_TYPES: {
  value: NativeFormType;
  labelAr: string;
  descAr: string;
  emoji: string;
}[] = [
  {
    value: "sickleave",
    labelAr: "تقرير إجازة مرضية",
    descAr: "Sick Leave Report",
    emoji: "🩺",
  },
  {
    value: "companion",
    labelAr: "تقرير مرافقة مريض",
    descAr: "Patient Companion Report",
    emoji: "👥",
  },
  {
    value: "companion_review",
    labelAr: "مشهد مراجعة لمرافق",
    descAr: "Companion Attendance Certificate",
    emoji: "📋",
  },
  {
    value: "visit_review",
    labelAr: "مشهد مراجعة",
    descAr: "Statement of Visit",
    emoji: "🔍",
  },
];

export interface LeaveFormData {
  patient_name_ar: string;
  patient_name_en: string;
  id_number: string;
  nationality_ar: string;
  nationality_en: string;
  employer_ar: string;
  employer_en: string;
  doctor_name_ar: string;
  doctor_name_en: string;
  position_ar: string;
  position_en: string;
  admission_date_gregorian: string;
  discharge_date_gregorian: string;
  hospital_name_ar: string;
  hospital_name_en: string;
  license_number: string;
  time: string;
  /**
   * نوع المنشأة الصحية:
   *   - "public"  → مشفى عام      → رمز الإجازة يبدأ بـ GSL
   *   - "private" → مشفى خاص/أهلي → رمز الإجازة يبدأ بـ PSL
   * افتراضي: "public" (لم backward-compat مع السجلات القديمة التي لا تحتوي على الحقل).
   */
  hospital_type?: "public" | "private";
  /**
   * Optional hospital/facility logo to embed in the PDF.
   * Stored as a base64 data URL (e.g. "data:image/png;base64,...").
   * Not persisted to the database — only used for PDF rendering.
   */
  hospital_logo?: string;
  /**
   * الرمز المرجعي للإجازة (GSL/PSL + digits).
   *
   * يُولَّد على العميل ويُرسَل إلى /api/generate-pdf و /api/upload-leave
   * لضمان أن ملف PDF وقاعدة البيانات يستخدمان نفس الرمز بالضبط.
   *
   * بدون هذا الحقل، كل مسار يستدعي generateLeaveId() بشكل منفصل،
   * وبسبب Math.random() + Date.now() % 1000 داخل generateLeaveId،
   * ينتج رمز مختلف في كل استدعاء — فيعرض PDF رمزاً ويخزّن DB رمزاً آخر،
   * فلا يجد /inquiry السجل أبداً.
   *
   * إذا ترك فارغاً (للحمولات القديمة)، يستعيد المسار السلوك القديم
   * ويولّد رمزاً جديداً محلياً.
   */
  leave_id?: string;

  /**
   * نوع النموذج المراد إصداره (الأنواع الأربعة من المستودع المرجعي).
   * افتراضي: "sickleave".
   */
  form_type?: NativeFormType;

  // ===== حقول المرافق (لنوعي المرافقة ومشهد مراجعة لمرافق) =====
  escort_name_ar?: string;
  escort_name_en?: string;
  relation_ar?: string;
  relation_en?: string;

  // ===== حقول مشهد المراجعة (تظهر لهذا النوع فقط) =====
  admission_time?: string; // HH:MM (24h)
  discharge_time?: string; // HH:MM (24h)
  visit_type?: string; // طوارئ | عيادة | مراجعة

  // ===== حقول إضافية مطابقة للمستودع =====
  /** مدة الإجازة بالأيام — يدوية؛ إن كانت فارغة تُحسب من تاريخي الدخول والخروج */
  duration?: string;
  /** تاريخ إصدار التقرير (YYYY-MM-DD) — افتراضياً اليوم */
  issue_date?: string;
  /** إضافة باركود QR للتقرير (افتراضي: مفعّل كما في المستودع) */
  include_qr?: boolean;
  /** تفعيل تواريخ الدخول والخروج الخاصة بالملف (ميزة المستودع) */
  file_dates_enabled?: boolean;
  file_admission_date?: string;
  file_discharge_date?: string;
}

export const EMPTY_FORM: LeaveFormData = {
  patient_name_ar: "",
  patient_name_en: "",
  id_number: "",
  nationality_ar: "السعودية",
  nationality_en: "Saudi Arabia",
  employer_ar: "",
  employer_en: "",
  doctor_name_ar: "",
  doctor_name_en: "",
  position_ar: "طبيب عام",
  position_en: "General",
  admission_date_gregorian: "",
  discharge_date_gregorian: "",
  hospital_name_ar: "",
  hospital_name_en: "",
  license_number: "",
  time: "",
  hospital_type: "public",
  hospital_logo: "",
  form_type: "sickleave",
  escort_name_ar: "",
  escort_name_en: "",
  relation_ar: "",
  relation_en: "",
  admission_time: "07:25",
  discharge_time: "08:35",
  visit_type: "طوارئ",
  duration: "",
  issue_date: "",
  include_qr: true,
  file_dates_enabled: false,
  file_admission_date: "",
  file_discharge_date: "",
};

export const DEFAULTS: LeaveFormData = {
  patient_name_ar: "غير محدد",
  patient_name_en: "Not Specified",
  id_number: "0000000000",
  nationality_ar: "السعودية",
  nationality_en: "Saudi Arabia",
  employer_ar: "غير محدد",
  employer_en: "Not Specified",
  doctor_name_ar: "غير محدد",
  doctor_name_en: "Not Specified",
  position_ar: "طبيب عام",
  position_en: "General Practitioner",
  admission_date_gregorian: "01-01-2025",
  discharge_date_gregorian: "01-01-2025",
  hospital_name_ar: "مستشفى عام",
  hospital_name_en: "General Hospital",
  license_number: "",
  time: "12:00 PM",
  hospital_type: "public",
  hospital_logo: "",
};

/**
 * Each field's metadata: label (ar), placeholder, group, and emoji used by the bot template.
 */
export interface FieldMeta {
  key: keyof LeaveFormData;
  labelAr: string;
  labelEn: string;
  emoji: string;
  group: "patient" | "leave" | "doctor" | "hospital" | "escort" | "visit";
  placeholder?: string;
  type?: "text" | "date" | "time" | "number" | "select";
  /** خيارات القائمة المنسدلة (type = select) */
  options?: string[];
}

export const FIELDS: FieldMeta[] = [
  // Patient
  {
    key: "patient_name_ar",
    labelAr: "اسم المريض (عربي)",
    labelEn: "Patient Name (Arabic)",
    emoji: "👤",
    group: "patient",
    placeholder: "عبدالله محمد علي",
  },
  {
    key: "patient_name_en",
    labelAr: "اسم المريض (إنجليزي)",
    labelEn: "Patient Name (English)",
    emoji: "👤",
    group: "patient",
    placeholder: "Abdullah Mohammed Ali",
  },
  {
    key: "id_number",
    labelAr: "رقم الهوية",
    labelEn: "National ID",
    emoji: "🆔",
    group: "patient",
    placeholder: "828287654",
  },
  {
    key: "nationality_ar",
    labelAr: "الجنسية (عربي)",
    labelEn: "Nationality (Arabic)",
    emoji: "🌍",
    group: "patient",
    placeholder: "السعودية",
  },
  {
    key: "nationality_en",
    labelAr: "الجنسية (إنجليزي)",
    labelEn: "Nationality (English)",
    emoji: "🌍",
    group: "patient",
    placeholder: "Saudi Arabia",
  },
  {
    key: "employer_ar",
    labelAr: "جهة العمل (عربي)",
    labelEn: "Employer (Arabic)",
    emoji: "🏢",
    group: "patient",
    placeholder: "طالب جامعي",
  },
  {
    key: "employer_en",
    labelAr: "جهة العمل (إنجليزي)",
    labelEn: "Employer (English)",
    emoji: "🏢",
    group: "patient",
    placeholder: "University Student",
  },
  // Leave dates
  {
    key: "admission_date_gregorian",
    labelAr: "تاريخ الدخول (ميلادي)",
    labelEn: "Admission Date (Gregorian)",
    emoji: "📅",
    group: "leave",
    placeholder: "20-09-2025",
    type: "date",
  },
  {
    key: "discharge_date_gregorian",
    labelAr: "تاريخ الخروج (ميلادي)",
    labelEn: "Discharge Date (Gregorian)",
    emoji: "📅",
    group: "leave",
    placeholder: "21-09-2025",
    type: "date",
  },
  {
    key: "time",
    labelAr: "الوقت",
    labelEn: "Time",
    emoji: "⏰",
    group: "leave",
    placeholder: "10:20 AM",
    type: "time",
  },
  // Doctor
  {
    key: "doctor_name_ar",
    labelAr: "اسم الطبيب (عربي)",
    labelEn: "Doctor Name (Arabic)",
    emoji: "👨‍⚕️",
    group: "doctor",
    placeholder: "المقبني",
  },
  {
    key: "doctor_name_en",
    labelAr: "اسم الطبيب (إنجليزي)",
    labelEn: "Doctor Name (English)",
    emoji: "👨‍⚕️",
    group: "doctor",
    placeholder: "Almakbany",
  },
  {
    key: "position_ar",
    labelAr: "المسمى الوظيفي (عربي)",
    labelEn: "Position (Arabic)",
    emoji: "💼",
    group: "doctor",
    placeholder: "طبيب عام",
  },
  {
    key: "position_en",
    labelAr: "المسمى الوظيفي (إنجليزي)",
    labelEn: "Position (English)",
    emoji: "💼",
    group: "doctor",
    placeholder: "General Practitioner",
  },
  // Hospital
  {
    key: "hospital_name_ar",
    labelAr: "اسم المنشأة (عربي)",
    labelEn: "Hospital Name (Arabic)",
    emoji: "🏥",
    group: "hospital",
    placeholder: "مستشفى الملك فيصل التخصصي ومركز الأبحاث",
  },
  {
    key: "hospital_name_en",
    labelAr: "اسم المنشأة (إنجليزي)",
    labelEn: "Hospital Name (English)",
    emoji: "🏥",
    group: "hospital",
    placeholder: "King Faisal Specialist Hospital and Research Centre",
  },
  {
    key: "license_number",
    labelAr: "رقم الترخيص",
    labelEn: "License Number",
    emoji: "🔢",
    group: "hospital",
    placeholder: "1410101201200443",
  },
  // ===== حقول إضافية مطابقة للمستودع المرجعي =====
  {
    key: "issue_date",
    labelAr: "تاريخ إصدار التقرير",
    labelEn: "Issue Date",
    emoji: "🗓️",
    group: "leave",
    placeholder: "22-11-2025",
    type: "date",
  },
  {
    key: "duration",
    labelAr: "مدة الإجازة (بالأيام)",
    labelEn: "Leave Duration (days)",
    emoji: "📆",
    group: "leave",
    placeholder: "اتركه فارغاً للحساب التلقائي",
    type: "number",
  },
  // ===== بيانات المرافق (تظهر لنوعي المرافقة ومشهد مراجعة لمرافق) =====
  {
    key: "escort_name_ar",
    labelAr: "اسم المرافق (عربي)",
    labelEn: "Companion Name (Arabic)",
    emoji: "👥",
    group: "escort",
    placeholder: "الاسم الرباعي",
  },
  {
    key: "escort_name_en",
    labelAr: "اسم المرافق (إنجليزي)",
    labelEn: "Companion Name (English)",
    emoji: "👥",
    group: "escort",
    placeholder: "Full Name",
  },
  {
    key: "relation_ar",
    labelAr: "صلة القرابة (عربي)",
    labelEn: "Relation (Arabic)",
    emoji: "🔗",
    group: "escort",
    placeholder: "مثال: ابن، زوجة",
  },
  {
    key: "relation_en",
    labelAr: "صلة القرابة (إنجليزي)",
    labelEn: "Relation (English)",
    emoji: "🔗",
    group: "escort",
    placeholder: "e.g. Son, Wife",
  },
  // ===== حقول مشهد المراجعة (تظهر لهذا النوع فقط) =====
  {
    key: "admission_time",
    labelAr: "وقت الدخول",
    labelEn: "Admission Time",
    emoji: "🕐",
    group: "visit",
    placeholder: "07:25",
    type: "time",
  },
  {
    key: "discharge_time",
    labelAr: "وقت الخروج",
    labelEn: "Discharge Time",
    emoji: "🕔",
    group: "visit",
    placeholder: "08:35",
    type: "time",
  },
  {
    key: "visit_type",
    labelAr: "نوع الزيارة",
    labelEn: "Visit Type",
    emoji: "🏥",
    group: "visit",
    type: "select",
    options: ["طوارئ", "عيادة", "مراجعة"],
  },
];

export const GROUP_LABELS: Record<
  FieldMeta["group"],
  { ar: string; en: string; icon: string }
> = {
  patient: { ar: "بيانات المريض", en: "Patient", icon: "👤" },
  leave: { ar: "بيانات الإجازة", en: "Leave", icon: "📅" },
  doctor: { ar: "بيانات الطبيب", en: "Doctor", icon: "👨‍⚕️" },
  hospital: { ar: "بيانات المنشأة", en: "Hospital", icon: "🏥" },
  escort: { ar: "بيانات المرافق", en: "Companion", icon: "👥" },
  visit: { ar: "بيانات مشهد المراجعة", en: "Visit Review", icon: "🔍" },
};
