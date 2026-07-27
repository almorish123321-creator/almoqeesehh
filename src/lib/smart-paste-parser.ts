/**
 * Smart Paste Parser — parses the Telegram-bot patient message format
 * and returns a structured object that can be merged into the input form.
 *
 * Supported message format (line-by-line, each line starts with an emoji
 * followed by "Label (lang): value"):
 *
 *   👤 اسم المريض (عربي): تالين مريع عوض القحطاني
 *   👤 اسم المريض (إنجليزي): Talin Marie Awad Al-Qahtani
 *   🆔 رقم الهوية: 1152609259
 *   🌍 الجنسية (عربي): السعودية
 *   🌍 الجنسية (إنجليزي): Saudi Arabia
 *   🏢 جهة العمل (عربي): طالبه
 *   🏢 جهة العمل (إنجليزي): _
 *   👨‍⚕️ اسم الطبيب (عربي): عبد الله بن محمد القحطاني
 *   👨‍⚕️ اسم الطبيب (إنجليزي): Abdullah bin Mohammed Al-Qahtani
 *   💼 المسمى الوظيفي (عربي): طبيب عام
 *   💼 المسمى الوظيفي (إنجليزي): General
 *   📅 تاريخ الدخول (ميلادي): 2026-06-09
 *   📅 تاريخ الخروج (ميلادي): 2026-06-09
 *   🏥 اسم المنشأة (عربي): مستشفى الأطباء المتحدون
 *   🏥 اسم المنشأة (إنجليزي): United Doctors Hospital
 *   ⏰ الوقت: 07:50 AM
 */

export interface ParsedPatientData {
  patient_name_ar?: string;
  patient_name_en?: string;
  identity_number?: string;
  nationality_ar?: string;
  nationality_en?: string;
  employer_ar?: string;
  employer_en?: string;
  doctor_name_ar?: string;
  doctor_name_en?: string;
  doctor_specialty_ar?: string;
  doctor_specialty_en?: string;
  admission_date?: string;
  discharge_date?: string;
  hospital_name_ar?: string;
  hospital_name_en?: string;
  visit_time?: string;
}

/**
 * Parse the pasted Telegram-bot message into a structured object.
 * - Strips leading emoji + spaces from each line
 * - Matches each line against the field regexes
 * - Skips empty placeholders: '_', '-', '—'
 * - Does NOT overwrite a field that already has a value
 */
export function parsePatientMessage(text: string): ParsedPatientData {
  const result: ParsedPatientData = {};

  // Map of result field → regex (matched against the cleaned line).
  // The regexes use [\s\S]*? for "Label" parts that may include
  // extra Arabic words before the colon (e.g. "تاريخ الدخول (ميلادي)").
  const fieldMap: [keyof ParsedPatientData, RegExp][] = [
    ["patient_name_ar", /اسم المريض \(عربي\)\s*[:\-]\s*(.+)/],
    ["patient_name_en", /اسم المريض \(إنجليزي\)\s*[:\-]\s*(.+)/i],
    ["identity_number", /رقم الهوية\s*[:\-]\s*(\S+)/],
    ["nationality_ar", /الجنسية \(عربي\)\s*[:\-]\s*(.+)/],
    ["nationality_en", /الجنسية \(إنجليزي\)\s*[:\-]\s*(.+)/i],
    ["employer_ar", /جهة العمل \(عربي\)\s*[:\-]\s*(.+)/],
    ["employer_en", /جهة العمل \(إنجليزي\)\s*[:\-]\s*(.+)/i],
    ["doctor_name_ar", /اسم الطبيب \(عربي\)\s*[:\-]\s*(.+)/],
    ["doctor_name_en", /اسم الطبيب \(إنجليزي\)\s*[:\-]\s*(.+)/i],
    ["doctor_specialty_ar", /المسمى الوظيفي \(عربي\)\s*[:\-]\s*(.+)/],
    ["doctor_specialty_en", /المسمى الوظيفي \(إنجليزي\)\s*[:\-]\s*(.+)/i],
    ["admission_date", /تاريخ الدخول[^:]*[:\-]\s*(\d{4}-\d{2}-\d{2})/],
    ["discharge_date", /تاريخ الخروج[^:]*[:\-]\s*(\d{4}-\d{2}-\d{2})/],
    ["hospital_name_ar", /اسم المنشأة \(عربي\)\s*[:\-]\s*(.+)/],
    ["hospital_name_en", /اسم المنشأة \(إنجليزي\)\s*[:\-]\s*(.+)/i],
    ["visit_time", /الوقت\s*[:\-]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i],
  ];

  for (const line of text.split("\n")) {
    // Strip leading emoji + spaces (emoji ranges + pictographs + variation
    // selectors + ZWJ). The "u" flag enables full Unicode property handling.
    const clean = line
      .replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\s]+/u, "")
      .trim();

    if (!clean) continue;

    for (const [field, regex] of fieldMap) {
      if (result[field]) continue; // do not overwrite existing value
      const match = clean.match(regex);
      if (match?.[1]) {
        const val = match[1].trim();
        // Skip empty placeholders — the bot uses "_" or "-" for missing data
        if (val && val !== "_" && val !== "-" && val !== "—") {
          (result as Record<string, string>)[field] = val;
        }
      }
    }
  }
  return result;
}
