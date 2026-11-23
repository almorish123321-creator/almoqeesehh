/**
 * Native Seha Report Generator — النسخة المطابقة 100% لمستودع floseseh
 * =====================================================================
 *
 * منقول حرفياً من:
 *   - app.js  → populatePdfAndGenerate() (تحضير بيانات التقرير) + دوال التواريخ
 *   - server.js → POST /api/generate-native-pdf (بناء HTML التقرير الكامل)
 *
 * القاعدة الذهبية: هذا نقل أمين (faithful port). كل قيمة رقمية، لون، إحداثي،
 * حجم خط، بعد جدول، ترتيب صفوف، قرار RTL/LTR من الأصل محفوظ كما هو حرفياً.
 * أي فرق بصري بين هذا المولد والأصل يعتبر خطأ وليس ميزة.
 *
 * الأنواع الأربعة المدعومة (نفس أزرار لوحة التحكم في المستودع):
 *   - sickleave        → تقرير إجازة مرضية / Sick Leave Report
 *   - companion        → تقرير مرافقة مريض / Patient Companion Report
 *   - companion_review → مشهد مراجعة لمرافق / Companion Attendance Certificate
 *   - visit_review     → مشهد مراجعة / Statement of Visit
 */

import { NATIONALITY_MAP } from "./nationality-map";
import { calculateDays, toISODate } from "./parser";

// ============================================================
// الأنواع
// ============================================================

export type NativeReportType =
  | "sickleave"
  | "companion"
  | "companion_review"
  | "visit_review";

export interface NativeReportInput {
  type: NativeReportType;

  // بيانات المريض / المرافق
  patient_name_ar: string;
  patient_name_en: string;
  national_id: string;
  nationality: string; // الجنسية بالعربي (كما في حقل المستودع الواحد)
  employer: string;

  // بيانات المرافق (لنوعي المرافقة ومشهد مراجعة لمرافق)
  escort_name_ar?: string;
  escort_name_en?: string;
  relation_ar?: string;
  relation_en?: string;

  // بيانات الإجازة
  admission_date: string; // YYYY-MM-DD أو DD-MM-YYYY
  discharge_date: string;
  /** مدة الإجازة بالأيام — إن كانت فارغة تُحسب من تاريخي الدخول والخروج */
  duration?: string;
  issue_date: string; // YYYY-MM-DD
  issue_time: string; // HH:MM (24 ساعة، قيمة input type="time")

  // حقول مشهد المراجعة (تظهر لهذا النوع فقط)
  admission_time?: string; // HH:MM
  discharge_time?: string; // HH:MM
  visit_type_ar?: string; // طوارئ | عيادة | مراجعة

  // تواريخ الملف (ميزة اختيارية من المستودع)
  file_dates_enabled?: boolean;
  file_admission_date?: string;
  file_discharge_date?: string;

  // بيانات الطبيب
  doctor_name_ar: string;
  doctor_name_en: string;
  position_ar: string;
  position_en: string;

  // بيانات المنشأة
  hospital_ar: string;
  hospital_en: string;
  hospital_type: "public" | "private" | "gov";
  license_number?: string;

  // خيارات
  include_qr?: boolean;
  /** رمز الإجازة الموحد (يُولَّد مرة واحدة على العميل ويُمرَّر هنا) */
  leave_id?: string;
  /** شعار المنشأة المرفوع (data URL base64) — بديل شعار وزارة الصحة */
  hospital_logo?: string | null;
  /**
   * عرض داخل الصفحة (iframe معاينة): إزالة سكربت الطباعة التلقائية من
   * HTML التقرير — الطباعة تصبح يدوية بزر (طباعة) في المعاينة.
   */
  embed?: boolean;
}

export interface NativeReportData {
  titleAr: string;
  titleEn: string;
  leaveId: string;
  durationEn: string;
  durationAr: string;
  admissionG: string;
  admissionH: string;
  dischargeG: string;
  dischargeH: string;
  waitingEn: string;
  waitingAr: string;
  visitTypeEn: string;
  visitTypeAr: string;
  issueDate: string;
  nameLabelEn: string;
  nameLabelAr: string;
  nameEn: string;
  nameAr: string;
  nationalId: string;
  nationalityEn: string;
  nationalityAr: string;
  relationEn: string;
  relationAr: string;
  employerEn: string;
  employerAr: string;
  docLabelEn: string;
  docLabelAr: string;
  doctorEn: string;
  doctorAr: string;
  positionEn: string;
  positionAr: string;
  hospitalAr: string;
  hospitalEn: string;
  hospitalLogoBase64: string | null;
  licenseNumber: string;
  includeQR: boolean;
  time: string;
  dayDate: string;
  type: NativeReportType;
}

// ============================================================
// دوال التواريخ والوقت — منقول حرفياً من app.js (1944-2021)
// ============================================================

/** التاريخ الهجري بصيغة DD-MM-YYYY — نفس تقويم المستودع (en-GB-u-ca-islamic) */
export function getHijriDate(dateString: string): string {
  if (!dateString) return "";
  try {
    // منتصف النهار UTC يمنع انزياح اليوم عبر المناطق الزمنية (نفس نتيجة المتصفح)
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
      ? `${dateString}T12:00:00Z`
      : dateString;
    const date = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-GB-u-ca-islamic", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(date);

    let d = "01",
      m = "01",
      y = "1448";
    parts.forEach((p) => {
      if (p.type === "day") d = p.value;
      if (p.type === "month") m = p.value;
      if (p.type === "year") y = p.value;
    });

    // إزالة أي حرف غير رقمي من السنة (مثل B، AH، هـ)
    y = y.replace(/\D/g, "");
    d = d.padStart(2, "0");
    m = m.padStart(2, "0");

    return `${d}-${m}-${y}`;
  } catch {
    return "";
  }
}

/** تحويل YYYY-MM-DD إلى DD-MM-YYYY — منقول حرفياً من app.js formatGregorian */
export function formatGregorian(dateString: string): string {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateString;
}

/** تحويل HH:MM (24) إلى 10:20 PM — منقول حرفياً من app.js formatAMPM */
export function formatAMPM(timeStr: string): string {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (!h) h = 12;
  return `${h}:${minutes} ${ampm}`;
}

/** صيغة 12 ساعة بصفر بادئ للساعات — لمشهد المراجعة (07:25 PM) — app.js formatTime12En */
export function formatTime12En(timeStr: string): string {
  if (!timeStr) return "";
  const [hRaw, m] = timeStr.split(":");
  let h = parseInt(hRaw, 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

/** صيغة 12 ساعة عربية — لمشهد المراجعة (07:25 مساءً) — app.js formatTime12Ar */
export function formatTime12Ar(timeStr: string): string {
  if (!timeStr) return "";
  const [hRaw, m] = timeStr.split(":");
  let h = parseInt(hRaw, 10);
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? "مساءً" : "صباحاً";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${period}`;
}

/** فترة الانتظار بالساعات — الدقائق -- كالنموذج المرجعي — app.js computeWaitingHours */
export function computeWaitingHours(admTime: string, disTime: string): string {
  try {
    const toMin = (t: string) => {
      const [h, m] = String(t)
        .split(":")
        .map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    let diff = toMin(disTime) - toMin(admTime);
    if (diff < 0) diff = 0;
    return String(Math.floor(diff / 60)).padStart(2, "0");
  } catch {
    return "01";
  }
}

/** تسمية اليوم بالإنجليزية للفوتر — منقول حرفياً من app.js formatDateLabel */
export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  if (isNaN(d.getTime())) return "";
  return ` ${days[d.getDay()]} ,${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ============================================================
// توليد رمز الإجازة — عشوائي قوي يمنع التشابه بين الإجازات
// ============================================================

/**
 * بادئة رمز الإجازة: GSL/PSL + YYMMDD — تُستخدم للتحقق أن الرمز المعروض
 * يطابق تاريخ الإصدار الحالي ونوع المنشأة قبل الإصدار.
 */
export function nativeLeaveIdHead(
  issueDate: string,
  hospitalType: "public" | "private" | "gov",
): string {
  const prefix = hospitalType === "private" ? "PSL" : "GSL";
  const dateObj = new Date(issueDate || Date.now());
  const yy = dateObj.getFullYear().toString().slice(2);
  const mm = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const dd = dateObj.getDate().toString().padStart(2, "0");
  return `${prefix}${yy}${mm}${dd}`;
}

/**
 * رمز الإجازة: GSL/PSL + سنتين + شهر + يوم + 5 أرقام عشوائية.
 * مثال: GSL25112201234
 *
 * الأرقام الخمسة تُولَّد عشوائياً عبر crypto.getRandomValues (وليس من
 * الوقت كما كان سابقاً) — فكان الرمزان الصادران في الثانية نفسها
 * متطابقين. العشوائية التشفيرية تمنع التشابه تماماً بين إجازة وأخرى
 * ومشهد وآخر، ويُضاف عليها فحص عدم التكرار على العميل (سجل الرموز
 * الصادرة) وقبل الإصدار عبر /api/inquire للتأكد أن الرمز غير مستخدم.
 */
export function generateNativeLeaveId(
  issueDate: string,
  hospitalType: "public" | "private" | "gov",
): string {
  const head = nativeLeaveIdHead(issueDate, hospitalType);
  let rand5 = "";
  try {
    const g = globalThis.crypto;
    if (g && typeof g.getRandomValues === "function") {
      const buf = new Uint32Array(1);
      g.getRandomValues(buf);
      rand5 = String(buf[0] % 100000).padStart(5, "0");
    }
  } catch {
    /* fallthrough */
  }
  if (!/^\d{5}$/.test(rand5)) {
    rand5 = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  }
  return `${head}${rand5}`;
}

// ============================================================
// تحضير بيانات التقرير — منقول حرفياً من app.js populatePdfAndGenerate (2090-2242)
// ============================================================

/** تطبيع التاريخ إلى YYYY-MM-DD (يدعم DD-MM-YYYY و YYYY-MM-DD) */
function normalizeInputDate(value: string | undefined): string {
  if (!value) return "";
  const iso = toISODate(value);
  return iso || value;
}

export function buildNativeReportData(
  input: NativeReportInput,
): NativeReportData {
  const type = input.type;

  // التواريخ — المدخلات قد تأتي بصيغة input type=date (YYYY-MM-DD) أو DD-MM-YYYY
  const admission = normalizeInputDate(input.admission_date);
  const discharge = normalizeInputDate(input.discharge_date);
  const issueDate = normalizeInputDate(input.issue_date);

  // مدة الإجازة: قيمة يدوية أو محسوبة من التواريخ (حساب شامل داخلٍ)
  const duration =
    input.duration && String(input.duration).trim() !== ""
      ? String(input.duration).trim()
      : String(calculateDays(admission, discharge) || 1);

  const pNameAr = input.patient_name_ar || "";
  const pNameEn = input.patient_name_en || "";
  const idNum = input.national_id || "";
  const nationalityAr = input.nationality || "";
  // نفس خريطة الجنسيات الحرفية من المستودع
  const nationalityEn = NATIONALITY_MAP[nationalityAr] || nationalityAr;
  const employer = input.employer || "";

  const hospAr = input.hospital_ar || "";
  const hospEn = input.hospital_en || "";
  const isPrivate =
    input.hospital_type === "private" || input.hospital_type === "gov"
      ? input.hospital_type === "private"
      : false;
  const license = input.license_number || "";

  // صف المدة (مدة الإجازة) يعتمد دائماً على تواريخ الإجازة الأصلية — لا يتأثر أبداً
  const hijriAdmLeave = getHijriDate(admission);
  const hijriDisLeave = getHijriDate(discharge);
  const gregoAdmLeave = formatGregorian(admission);
  const gregoDisLeave = formatGregorian(discharge);

  // تواريخ الملف (الدخول/الخروج في جدول التقرير):
  // تُستبدل فقط عند تفعيل مربع «تفعيل تواريخ الدخول والخروج الخاصة بالملف»،
  // وعند عدم التفعيل تبقى تواريخ الإجازة الأصلية دون أي تأثير
  const fileDatesEnabled = input.file_dates_enabled || false;
  let fileAdmission = admission;
  let fileDischarge = discharge;
  if (fileDatesEnabled) {
    const fa = normalizeInputDate(input.file_admission_date);
    const fd = normalizeInputDate(input.file_discharge_date);
    if (fa) fileAdmission = fa; // حقل فارغ = إبقاء تاريخ الإجازة
    if (fd) fileDischarge = fd; // حقل فارغ = إبقاء تاريخ الإجازة
  }
  const hijriAdm = getHijriDate(fileAdmission);
  const hijriDis = getHijriDate(fileDischarge);
  const gregoAdm = formatGregorian(fileAdmission);
  const gregoDis = formatGregorian(fileDischarge);

  const isCompanionType = type === "companion" || type === "companion_review";
  const escAr = isCompanionType ? input.escort_name_ar || "" : "";
  const escEn = isCompanionType ? input.escort_name_en || "" : "";
  const relAr = isCompanionType ? input.relation_ar || "" : "";
  const relEn = isCompanionType ? input.relation_en || "" : "";

  let titleAr = "تقرير إجازة مرضية";
  let titleEn = "Sick Leave Report";
  if (type === "companion") {
    titleAr = "تقرير مرافقة مريض";
    titleEn = "Patient Companion Report";
  } else if (type === "companion_review") {
    titleAr = "مشهد مراجعة لمرافق";
    titleEn = "Companion Attendance Certificate";
  } else if (type === "visit_review") {
    titleAr = "مشهد مراجعة";
    titleEn = "Statement of Visit";
  }

  // مشهد المراجعة: وقتا الدخول والخروج + نوع الزيارة + فترة الانتظار
  // (ساعات، الدقائق -- كالنموذج المرجعي)
  const isVisitReview = type === "visit_review";
  let admissionGVal = gregoAdm,
    admissionHVal = hijriAdm;
  let dischargeGVal = gregoDis,
    dischargeHVal = hijriDis;
  let waitingEn = "",
    waitingAr = "",
    visitTypeEn = "",
    visitTypeAr = "";
  if (isVisitReview) {
    const admissionTimeVal = input.admission_time || "07:25";
    const dischargeTimeVal = input.discharge_time || "08:35";
    visitTypeAr = input.visit_type_ar || "طوارئ";
    const visitTypeMap: Record<string, string> = {
      طوارئ: "Emergency",
      عيادة: "Outpatient Clinic",
      مراجعة: "Follow-up",
    };
    visitTypeEn = visitTypeMap[visitTypeAr] || "Emergency";
    admissionGVal = `${gregoAdm} - ${formatTime12En(admissionTimeVal)}`;
    admissionHVal = `${hijriAdm} - ${formatTime12Ar(admissionTimeVal)}`;
    dischargeGVal = `${gregoDis} - ${formatTime12En(dischargeTimeVal)}`;
    dischargeHVal = `${hijriDis} - ${formatTime12Ar(dischargeTimeVal)}`;
    const waitHours = computeWaitingHours(admissionTimeVal, dischargeTimeVal);
    waitingEn = `${waitHours} hours and -- mins`;
    waitingAr = `${waitHours} ساعة و -- دقيقة`;
  }

  // خيار «إضافة باركود (QR Code) للتقرير»
  const includeQR = input.include_qr !== false;

  return {
    titleAr,
    titleEn,
    leaveId: input.leave_id || "",
    durationEn: `${duration} day ( ${gregoAdmLeave} to ${gregoDisLeave} )`,
    durationAr: `${duration} يوم ( <span dir="ltr">${hijriAdmLeave}</span> الى <span dir="ltr">${hijriDisLeave}</span> )`,
    admissionG: admissionGVal,
    admissionH: admissionHVal,
    dischargeG: dischargeGVal,
    dischargeH: dischargeHVal,
    waitingEn,
    waitingAr,
    visitTypeEn,
    visitTypeAr,
    issueDate: formatGregorian(issueDate),
    nameLabelEn: isCompanionType ? "Companion Name" : "Name",
    nameLabelAr: isCompanionType ? "اسم المرافق" : "الاسم",
    nameEn: (isCompanionType ? escEn : pNameEn).toUpperCase(),
    nameAr: isCompanionType ? escAr : pNameAr,
    nationalId: idNum,
    nationalityEn,
    nationalityAr,
    relationEn: isCompanionType ? relEn : "",
    relationAr: isCompanionType ? relAr : "",
    employerEn: "", // كما في المستودع حرفياً — خلية جهة العمل الإنجليزية فارغة دائماً
    employerAr: employer || (isVisitReview ? "إلى من يهمه الأمر" : "غير محدد"),
    docLabelEn:
      isCompanionType || isVisitReview ? "Physician Name" : "Practitioner Name",
    docLabelAr: isCompanionType || isVisitReview ? "اسم الطبيب المعالج" : "اسم الممارس",
    doctorEn: (input.doctor_name_en || "").toUpperCase(),
    doctorAr: input.doctor_name_ar || "",
    positionEn: input.position_en || "",
    positionAr: input.position_ar || "",
    hospitalAr: hospAr,
    hospitalEn: hospEn,
    hospitalLogoBase64: input.hospital_logo || null,
    licenseNumber: isPrivate ? license : "",
    includeQR,
    time: formatAMPM(input.issue_time || ""),
    dayDate: formatDateLabel(issueDate),
    type,
  };
}

// ============================================================
// أصول التقرير (شعارات مضمّنة base64) — نفس الأصول المُحمَّلة في server.js
// ============================================================

export interface NativeReportAssets {
  /** شعار صحة بالأزرق الرسمي (data URL) */
  sehaLogo: string;
  /** ختام المملكة العربية السعودية (data URL) */
  ksaCalligraphy: string;
  /** شعار وزارة الصحة — الافتراضي لخلية المنشأة (data URL) */
  mohLogo: string;
  /** شعار المركز الوطني للمعلومات الصحية (data URL) */
  nhicLogo: string;
  /** باركود الاستعلام (data URL) — يُولَّد مسبقاً */
  qrDataUrl: string;
  /** روابط الاستعلام (تُطبع في الفوتر) */
  inquiryUrl: string;
}

// ============================================================
// بناء HTML التقرير — منقول حرفياً من server.js (3706-3999)
// 794px × 1123px (A4) — نفس الألوان والأبعاد والمواضع بايت-ببايت
// ============================================================

export function buildNativeReportHTML(
  d: NativeReportData,
  assets: NativeReportAssets,
  fontsCss: string = "",
): string {
  // منقول حرفياً من server.js 3707-3710
  let formattedDurationAr = d.durationAr || "";
  if (
    formattedDurationAr &&
    !formattedDurationAr.includes('<span dir="ltr">')
  ) {
    formattedDurationAr = formattedDurationAr.replace(
      /(\d{2,4}-\d{2}-\d{2,4})/g,
      '<span dir="ltr">$1</span>',
    );
  }
  const footerMarginTop = "14px";
  const includeQR = d.includeQR;
  const qrDataUrl = assets.qrDataUrl;

  // نوع «مشهد مراجعة» (Statement of Visit): بنية صفوف مختلفة عن الإجازة المرضية —
  // رمز الإجازة ← صفوف داكنة (الدخول/الخروج/فترة الانتظار) ← تاريخ الإصدار ← بيانات المريض ← نوع الزيارة
  // نفس تنسيقات الاستعلام تماماً (نفس الألوان والأعمدة والخطوط والفوتر)
  const isVisitReview = d.type === "visit_review";
  const tableRows = isVisitReview ? `
    <tr>
      <td class="label-en" style="width:150px;">Leave ID</td>
      <td class="val" colspan="2" style="width:424px; font-family: 'Tinos', 'Times New Roman', serif; white-space: nowrap;">${d.leaveId || ""}</td>
      <td class="label-ar" style="width:150px;">رمز الإجازة</td>
    </tr>
    <tr class="dur-row">
      <td class="dur-label" style="width:150px;">Admission Date</td>
      <td style="width:212px;">${d.admissionG || ""}</td>
      <td dir="rtl" style="width:212px;">${d.admissionH || ""}</td>
      <td class="dur-label" style="width:150px;">تاريخ الدخول</td>
    </tr>
    <tr class="dur-row">
      <td class="dur-label" style="width:150px;">Discharge Date</td>
      <td style="width:212px;">${d.dischargeG || ""}</td>
      <td dir="rtl" style="width:212px;">${d.dischargeH || ""}</td>
      <td class="dur-label" style="width:150px;">تاريخ الخروج</td>
    </tr>
    <tr class="dur-row">
      <td class="dur-label" style="width:150px;">Waiting Period</td>
      <td style="width:212px;">${d.waitingEn || ""}</td>
      <td dir="rtl" style="width:212px;">${d.waitingAr || ""}</td>
      <td class="dur-label" style="width:150px;">فترة الانتظار</td>
    </tr>
    <tr>
      <td class="label-en">Issue Date</td>
      <td class="val" colspan="2">${d.issueDate || ""}</td>
      <td class="label-ar">تاريخ إصدار التقرير</td>
    </tr>
    <tr>
      <td class="label-en">${d.nameLabelEn || "Name"}</td>
      <td class="val">${d.nameEn || ""}</td>
      <td class="val">${d.nameAr || ""}</td>
      <td class="label-ar">${d.nameLabelAr || "الاسم"}</td>
    </tr>
    <tr>
      <td class="label-en">National ID / Iqama</td>
      <td class="val" colspan="2" style="font-family: 'Tinos', 'Times New Roman', serif; white-space: nowrap;">${d.nationalId || ""}</td>
      <td class="label-ar">رقم الهوية/الاقامه</td>
    </tr>
    <tr>
      <td class="label-en">Nationality</td>
      <td class="val">${d.nationalityEn || "Saudi Arabia"}</td>
      <td class="val">${d.nationalityAr || "السعودية"}</td>
      <td class="label-ar">الجنسية</td>
    </tr>
    <tr>
      <td class="label-en">Employer</td>
      <td class="val">${d.employerEn || ""}</td>
      <td class="val">${d.employerAr || ""}</td>
      <td class="label-ar">جهة العمل</td>
    </tr>
    <tr>
      <td class="label-en">${d.docLabelEn || "Physician Name"}</td>
      <td class="val">${d.doctorEn || ""}</td>
      <td class="val">${d.doctorAr || ""}</td>
      <td class="label-ar">${d.docLabelAr || "اسم الطبيب المعالج"}</td>
    </tr>
    <tr>
      <td class="label-en">Position</td>
      <td class="val">${d.positionEn || ""}</td>
      <td class="val">${d.positionAr || ""}</td>
      <td class="label-ar">المسمى الوظيفى</td>
    </tr>
    <tr>
      <td class="label-en">Visit Type</td>
      <td class="val">${d.visitTypeEn || ""}</td>
      <td class="val">${d.visitTypeAr || ""}</td>
      <td class="label-ar">نوع الزيارة</td>
    </tr>
  ` : `
    <tr>
      <td class="label-en" style="width:150px;">Leave ID</td>
      <td class="val" colspan="2" style="width:424px; font-family: 'Tinos', 'Times New Roman', serif; white-space: nowrap;">${d.leaveId || ""}</td>
      <td class="label-ar" style="width:150px;">رمز الإجازة</td>
    </tr>
    <tr class="dur-row">
      <td class="dur-label" style="width:150px;">Leave Duration</td>
      <td style="width:212px;">${d.durationEn || ""}</td>
      <td dir="rtl" style="width:212px;">${formattedDurationAr}</td>
      <td class="dur-label" style="width:150px;">مدة الإجازة</td>
    </tr>
    <tr>
      <td class="label-en">Admission Date</td>
      <td class="val">${d.admissionG || ""}</td>
      <td class="val">${d.admissionH || ""}</td>
      <td class="label-ar">تاريخ الدخول</td>
    </tr>
    <tr>
      <td class="label-en">Discharge Date</td>
      <td class="val">${d.dischargeG || ""}</td>
      <td class="val">${d.dischargeH || ""}</td>
      <td class="label-ar">تاريخ الخروج</td>
    </tr>
    <tr>
      <td class="label-en">Issue Date</td>
      <td class="val" colspan="2">${d.issueDate || ""}</td>
      <td class="label-ar">تاريخ إصدار التقرير</td>
    </tr>
    <tr>
      <td class="label-en">${d.nameLabelEn || "Name"}</td>
      <td class="val">${d.nameEn || ""}</td>
      <td class="val">${d.nameAr || ""}</td>
      <td class="label-ar">${d.nameLabelAr || "الاسم"}</td>
    </tr>
    <tr>
      <td class="label-en">National ID / Iqama</td>
      <td class="val" colspan="2" style="font-family: 'Tinos', 'Times New Roman', serif; white-space: nowrap;">${d.nationalId || ""}</td>
      <td class="label-ar">رقم الهوية/الاقامه</td>
    </tr>
    <tr>
      <td class="label-en">Nationality</td>
      <td class="val">${d.nationalityEn || "Saudi Arabia"}</td>
      <td class="val">${d.nationalityAr || "السعودية"}</td>
      <td class="label-ar">الجنسية</td>
    </tr>
    ${(d.relationEn || d.relationAr) ? `<tr>
      <td class="label-en">Relation</td>
      <td class="val">${d.relationEn || ""}</td>
      <td class="val">${d.relationAr || ""}</td>
      <td class="label-ar">صلة القرابة</td>
    </tr>` : ""}
    <tr>
      <td class="label-en">Employer</td>
      <td class="val">${d.employerEn || ""}</td>
      <td class="val">${d.employerAr || ""}</td>
      <td class="label-ar">جهة العمل</td>
    </tr>
    <tr>
      <td class="label-en">${d.docLabelEn || "Practitioner Name"}</td>
      <td class="val">${d.doctorEn || ""}</td>
      <td class="val">${d.doctorAr || ""}</td>
      <td class="label-ar">${d.docLabelAr || "اسم الممارس"}</td>
    </tr>
    <tr>
      <td class="label-en">Position</td>
      <td class="val">${d.positionEn || ""}</td>
      <td class="val">${d.positionAr || ""}</td>
      <td class="label-ar">المسمى الوظيفى</td>
    </tr>
  `;

  // Build self-contained HTML matching Sehaty platform exactly
  // الخطوط: نفس fonts-embedded.css المضمّن في المستودع (base64 woff2) —
  // يُقرأ خادمياً (native-report-server.ts) ويُمرَّر هنا كنص — مثل
  // EMBEDDED_FONTS_CSS في server.js.
  const html = `<!DOCTYPE html>
<html lang="ar" dir="ltr">
<head>
<meta charset="UTF-8">
<title>${d.titleAr || "تقرير"}</title>
</head>
<body>
<style>
  ${fontsCss}
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  html { background: #fff !important; }
  body { margin: 0; padding: 0; background: #fff !important; width: 794px; height: 1123px; overflow: hidden; direction: ltr; }
  @page { size: 794px 1123px; margin: 0; }
  table { border-spacing: 0; direction: ltr; }
  tr { height: 40px; }
  /* الخطوط من المستودع المرجعي: عربي = Noto Sans Arabic | إنجليزي/أرقام = Tinos (Times).
     التنسيق النهائي المعتمد من كود seha-sickleave بطلب المالك:
     حدود الجدول 1.4px solid #cccccc | تسميات #154d79 (12.5px إنجليزي / 13.5px عربي)
     قيم #0d2847 (12.5px) | صف المدة خلفية #1F3864 | ارتفاع الصف 40px | حشو 5px 6px
     تظليل الصفوف الزوجية #f7f7f7 | عرض الجدول 724px left:35px أعمدة 150/212/212/150
     عنوان عربي #1a5b8c حجم 21px + إنجليزي 16.5px بخط Times، موضع العنوان top:153px
     فجوة العنوانين 12px، الفاصل العمودي بين الصورتين طول طبيعي 191px محاذاً
     خط منتصف الجدول — تموضع مطلق حتى لا يدفع الصف السفلي */
  td { font-family: 'Noto Sans Arabic', 'Tajawal', 'Arial', sans-serif; line-height: 1.2; }
  .label-en { border: 1.4px solid #cccccc; padding: 5px 6px; font-weight: bold; color: #154d79; font-size: 12.5px; width: 150px; text-align: center !important; vertical-align: middle !important; font-family: 'Tinos', 'Times New Roman', serif; }
  .label-ar { border: 1.4px solid #cccccc; padding: 5px 6px; font-weight: bold; color: #154d79; font-size: 13.5px; width: 150px; text-align: center !important; vertical-align: middle !important; font-family: 'Noto Sans Arabic', 'Tajawal', sans-serif; }
  .val { border: 1.4px solid #cccccc; padding: 5px 6px; color: #0d2847; font-weight: normal; font-size: 12.5px; text-align: center !important; vertical-align: middle !important; font-family: 'Tinos', 'Times New Roman', 'Noto Sans Arabic', serif; }
  .val[dir="rtl"] { font-family: 'Tinos', 'Noto Sans Arabic', 'Tajawal', serif; }
  .dur-row td { background-color: #1F3864 !important; color: white; border: 1.4px solid #cccccc; padding: 5px 6px; font-size: 12.5px; text-align: center !important; vertical-align: middle !important; font-family: 'Tinos', 'Noto Sans Arabic', serif; }
  .dur-row td.label-ar { font-family: 'Noto Sans Arabic', 'Tajawal', sans-serif; }
  .dur-label { font-weight: bold; }
  tr:nth-child(even) td { background-color: #f7f7f7; }
  @media print { html, body { width: 794px; height: 1123px; } }
</style>
<div style="width:794px;height:1123px;background:#fff;font-family:'Noto Sans Arabic','Tajawal','Arial',sans-serif;position:relative;overflow:hidden;direction:ltr;">

  <!-- Header: Seha Logo (left) -->
  <img src="${assets.sehaLogo}" style="position:absolute;top:32px;left:38px;width:155px;height:auto;">

  <!-- Header: Geometric graphic (right) -->
  <svg width="195" height="92" viewBox="0 0 408 192" style="position:absolute;top:22px;right:30px;opacity:0.8;">
    <path d="M 0,0 L 44,28 L 56,109 L 91,2 L 116,59 L 56,109 M 56,109 L 113,124 L 116,59 M 116,59 L 154,1 M 116,59 L 229,44 L 327,96 M 116,59 L 201,74 L 327,96 M 113,124 L 201,74 L 229,44 M 213,1 L 229,44 M 241,1 L 327,96 M 324,1 L 327,96 M 327,96 L 386,1 L 404,190 L 327,96" stroke="#9cb1cd" stroke-width="1.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>

  <!-- Header: KSA Calligraphy (center) -->
  <img src="${assets.ksaCalligraphy}" style="position:absolute;top:68px;left:50%;transform:translateX(-50%);width:190px;height:auto;">

  <!-- Header: Arabic & English Titles -->
  <div style="position:absolute;top:153px;left:0;width:794px;text-align:center;">
    <h1 style="color:#1a5b8c;font-size:21px;font-weight:bold;font-family:'Noto Sans Arabic','Tajawal',sans-serif;margin:0 0 12px 0;line-height:1.2;">${d.titleAr || "تقرير إجازة مرضية"}</h1>
    <h2 style="color:#2c3e77;font-size:16.5px;font-weight:bold;font-family:'Tinos','Times New Roman',Georgia,serif;margin:0;letter-spacing:0.2px;line-height:1.2;">${d.titleEn || "Sick Leave Report"}</h2>
  </div>

  <!-- Data Table & Footer Container -->
  <div style="position:absolute;top:228px;left:35px;width:724px;">
  <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:center;table-layout:fixed;">
${tableRows}
  </table>

  <!-- ===== FOOTER ===== -->
  <div style="margin-top:${footerMarginTop};">

    <!-- Top Footer Row: QR/Text | Divider | MOH/Hospital -->
    <div style="display:flex; justify-content:center; align-items:flex-start; min-height:155px; position:relative;">

      <!-- Left: QR Code + Text (QR margin-top: 8px, margin-bottom: 20px -> text starts at 100px) -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-right:15px;">
        ${includeQR ? (qrDataUrl ? `<img src="${qrDataUrl}" style="width:72px;height:72px;margin-top:8px;margin-bottom:20px;">` : `<img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(assets.inquiryUrl)}" style="width:72px;height:72px;margin-top:8px;margin-bottom:20px;">`) : ""}
        <p style="font-size:10px;font-weight:bold;font-family:'Noto Sans Arabic','Tajawal',sans-serif;text-align:center;margin:0 0 4px 0;line-height:1.4;color:#000;">للتحقق من بيانات التقرير يرجى التأكد من زيارة موقع منصة صحة<br>الرسمي</p>
        <p style="font-size:8px;color:#000;text-align:center;margin:0 0 3px 0;font-weight:bold;font-family:'Tinos','Times New Roman',serif;">To check the report please visit Seha's offical website</p>
        <p style="font-size:9px;text-align:center;margin:0;"><a href="${assets.inquiryUrl}" style="color:#0000EE;text-decoration:underline;">www.seha.sa/#/inquiries/slenquiry</a></p>
      </div>

      <!-- Center 1px spacer: preserves exact flex centering of both cells -->
      <div style="width:1px;"></div>

      <!-- Right: MOH Logo (clean cropped, height: 92px, margin-bottom: 8px -> hospital name starts at 100px) -->
      <div style="width:340px; display:flex; flex-direction:column; align-items:center; padding-left:25px;">
        <img src="${d.hospitalLogoBase64 || assets.mohLogo}" style="height:92px;object-fit:contain;margin-bottom:8px;">
        <h3 style="font-size:11px;font-weight:bold;font-family:'Noto Sans Arabic','Tajawal',sans-serif;margin:0 0 4px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">${d.hospitalAr || ""}</h3>
        <h4 style="font-size:9.5px;font-weight:bold;font-family:'Tinos','Times New Roman',serif;margin:0 0 3px 0;color:#000;text-align:center;max-width:210px;word-wrap:break-word;line-height:1.5;">${d.hospitalEn || ""}</h4>
        ${d.licenseNumber ? `<p style="font-size:13px;font-weight:bold;color:#000;margin:0;">رقم الترخيص : ${d.licenseNumber}</p>` : ""}
      </div>

      <!-- Vertical divider: natural length 191px from footer-row top,
           at x=397 on the page (left:362 within container at 35) aligning the
           table middle line (35 + 724/2). Absolute => does not push the bottom row. -->
      <div style="position:absolute; top:0; left:362px; width:1px; height:191px; background-color:#dddddd;"></div>

    </div>

    <!-- Bottom Footer Row: Time/Date & NHIC Logo (margin-right: -10px aligns NHIC to exact 30px page edge) -->
    <div style="display:flex; justify-content:space-between; align-items:flex-end; padding: 0; margin-top:6px; margin-right:-10px;">

      <!-- Left: Time / Date -->
      <div style="font-weight:bold;font-size:11px;color:#000;font-family:'Tinos','Times New Roman',serif;">
        <p style="margin:0 0 10px 0;">${d.time || ""}</p>
        <p style="margin:0;">${d.dayDate || ""}</p>
      </div>

      <!-- Right: NHIC Logo -->
      <div style="display:flex; flex-direction:column; align-items:center;">
        <div style="width: 75px; height: 55px; overflow: hidden; position: relative; margin-bottom: 2px;">
          <img src="${assets.nhicLogo}" style="width: 75px; height: 75px; position: absolute; top: 0; left: 0; object-fit: cover; object-position: top;">
        </div>
        <h4 style="font-size:11.5px; font-weight:bold; font-family:'Noto Sans Arabic','Tajawal',sans-serif; color:#00A99D; margin:0; line-height:1.2; text-align:center;">المركز الوطني للمعلومات الصحية</h4>
        <h5 style="font-size:7px; font-weight:bold; font-family:'Tinos','Times New Roman',serif; color:#1A365D; margin:2px 0 0 0; line-height:1.2; text-align:center; letter-spacing:0.8px;">NATIONAL HEALTH INFORMATION CENTER</h5>
      </div>

    </div>

  </div>

</div>
<script>
// نفس تسلسل الرندر ثنائي المراحل في Puppeteer بالمستودع:
// انتظار الصور ثم الخطوط المضمنة ثم document.fonts.ready ثم الطباعة تلقائياً.
(async function () {
  var done = false;
  var fire = function () { if (!done) { done = true; setTimeout(function () { try { window.focus(); } catch (e) {} window.print(); }, 150); } };
  try {
    var imgs = Array.prototype.slice.call(document.images);
    await Promise.all(imgs.map(function (img) {
      return img.complete ? Promise.resolve() : new Promise(function (res) { img.onload = img.onerror = res; });
    }));
    await Promise.all([
      document.fonts.load('400 12px Tajawal'),
      document.fonts.load('700 12px Tajawal'),
      document.fonts.load('400 12px "Noto Sans Arabic"'),
      document.fonts.load('700 12px "Noto Sans Arabic"'),
      document.fonts.load('400 12px Tinos'),
      document.fonts.load('700 12px Tinos')
    ]);
    await document.fonts.ready;
    fire();
  } catch (e) { fire(); }
  setTimeout(fire, 2500); // صمام أمان: اطبع حتى لو تعطل انتظار الخطوط
})();
</script>
</body>
</html>`;
  return html;
}
