/**
 * Test script: Generate a PDF with the same data as the reference (sickleave (2).pdf)
 * and save it locally for visual comparison.
 *
 * Reference data (extracted from sickleave (2).pdf):
 *   leaveNumber: GSL20260269259
 *   idNumber: 1152609259
 *   name (Ar): تالين مريم عوض القحطاني
 *   name (En): TALIN MARIE AWAD AL-QAHTANI
 *   entryDate / exitDate / reportDate: 09-06-2026
 *   dayCount: 1
 *   doctor (Ar): عبد الله بن محمد القحطاني
 *   doctor (En): ABDULLAH BIN MOHAMMED AL-QAHTANI
 *   jobTitle (Ar): طبيب عام
 *   jobTitle (En): General
 *   employer (Ar): طالبة
 *   nationality (Ar): السعودية
 *   nationality (En): Saudi Arabia
 *   hospitalName (Ar): مستشفى الأطباء المتحدون
 *   hospitalName (En): United Doctors Hospital
 *   time: 07:50 AM
 *   date: Wednesday, 17 June 2026
 */

import { buildApiPayload } from "../src/app/api/generate-pdf/route";
import type { LeaveFormData } from "../src/lib/leave-form";

// We need to import the POST function's logic but call it with a fake request
// is complex. Instead, let's replicate the data and call the API directly.

const testData: LeaveFormData = {
  id_number: "1152609259",
  patient_name_ar: "تالين مريم عوض القحطاني",
  patient_name_en: "TALIN MARIE AWAD AL-QAHTANI",
  admission_date_gregorian: "09-06-2026",
  discharge_date_gregorian: "09-06-2026",
  doctor_name_ar: "عبد الله بن محمد القحطاني",
  doctor_name_en: "ABDULLAH BIN MOHAMMED AL-QAHTANI",
  position_ar: "طبيب عام",
  position_en: "General",
  employer_ar: "طالبة",
  employer_en: " ",
  nationality_ar: "السعودية",
  nationality_en: "Saudi Arabia",
  hospital_name_ar: "مستشفى الأطباء المتحدون",
  hospital_name_en: "United Doctors Hospital",
  license_number: "",
  time: "07:50 AM",
} as any;

// Print what the API payload would look like
const payload = buildApiPayload(testData);
console.log("Payload:", JSON.stringify(payload, null, 2));
