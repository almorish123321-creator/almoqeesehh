/**
 * POST /api/generate-pdf
 * Body: ApiPayload (JSON)
 * Response: application/pdf (the sick leave report)
 *
 * Generates a Sick Leave Report PDF by delegating to
 * `src/lib/pdf-generator.ts` — a faithful TypeScript port of the
 * original Express.js `sickLeaveReportGenerator.js` from
 * alehtiat-almorish.
 *
 * The PDF format, colors, dimensions, fonts, and layout are
 * preserved EXACTLY from the original. This route is a thin
 * Next.js App-Router wrapper that:
 *   1. Parses the JSON body
 *   2. Calls generateSickLeavePDF(patient, hospital, doctor)
 *   3. Returns the resulting Buffer as application/pdf
 */

import { NextRequest, NextResponse } from "next/server";
import { generateSickLeavePDF, type PatientData, type HospitalData } from "@/lib/pdf-generator";
import { calculateDays, generateLeaveId, normalizeDateToDDMMYYYY, toISODate } from "@/lib/parser";
import { DEFAULTS, type LeaveFormData } from "@/lib/leave-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface ApiPayload {
  leaveNumber: string;
  idNumber: string;
  name: string;
  nameEn: string;
  reportDate: string;
  entryDate: string;
  exitDate: string;
  dayCount: number;
  doctor: string;
  doctorEn: string;
  jobTitle: string;
  jobTitleEn: string;
  employer: string;
  employerEn: string;
  nationality: string;
  nationalityEn: string;
  hospitalName: string;
  hospitalNameEn: string;
  licenseNumber: string;
  leaveType: string;
  time: string;
}

/**
 * Build the API payload from the form data — kept compatible with the
 * existing entry page (/) that POSTs the same JSON shape.
 *
 * If the client provides `filled.leave_id` (the unified leave id captured
 * at click time), use it verbatim — this guarantees the PDF embeds the
 * SAME leave id that /api/upload-leave stores to the DB. Without this,
 * each route calls generateLeaveId() independently (Math.random +
 * Date.now) and produces DIFFERENT ids, breaking /inquiry lookups.
 */
export function buildApiPayload(data: LeaveFormData): ApiPayload {
  const filled: LeaveFormData = { ...DEFAULTS, ...data } as LeaveFormData;

  if (!filled.id_number) filled.id_number = DEFAULTS.id_number;
  if (!filled.patient_name_ar) filled.patient_name_ar = DEFAULTS.patient_name_ar;
  // Ensure hospital_type is set (default "public" for backward compat with
  // payloads that don't include the field).
  if (filled.hospital_type !== "public" && filled.hospital_type !== "private") {
    filled.hospital_type = "public";
  }

  // Use the client-provided leave_id if present; otherwise fall back to
  // generating one server-side (legacy behaviour for old payloads).
  const leaveNumber =
    filled.leave_id && filled.leave_id.trim()
      ? filled.leave_id.trim()
      : generateLeaveId(
          filled.id_number,
          filled.admission_date_gregorian,
          filled.discharge_date_gregorian,
          filled.hospital_type,
        );
  const dayCount = calculateDays(
    filled.admission_date_gregorian,
    filled.discharge_date_gregorian,
  );
  const reportDate = toISODate(normalizeDateToDDMMYYYY(filled.admission_date_gregorian)) || toISODate(new Date().toISOString().slice(0, 10));
  const entryDate = toISODate(normalizeDateToDDMMYYYY(filled.admission_date_gregorian));
  const exitDate = toISODate(normalizeDateToDDMMYYYY(filled.discharge_date_gregorian));

  return {
    leaveNumber,
    idNumber: filled.id_number,
    name: filled.patient_name_ar,
    nameEn: filled.patient_name_en,
    reportDate,
    entryDate,
    exitDate,
    dayCount,
    doctor: filled.doctor_name_ar,
    doctorEn: filled.doctor_name_en,
    jobTitle: filled.position_ar,
    jobTitleEn: filled.position_en,
    employer: filled.employer_ar,
    employerEn: filled.employer_en,
    nationality: filled.nationality_ar,
    nationalityEn: filled.nationality_en,
    hospitalName: filled.hospital_name_ar,
    hospitalNameEn: filled.hospital_name_en,
    licenseNumber: filled.license_number,
    leaveType: "sick",
    time: filled.time || "",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LeaveFormData;
    const payload = buildApiPayload(body);

    // Decode uploaded hospital logo (base64 data URL) into a temp file
    // path so the original generator can `fs.existsSync` it. The original
    // takes a file path string; we write the buffer to /tmp if present.
    let hospitalLogoPath: string | undefined;
    if (body.hospital_logo && typeof body.hospital_logo === "string") {
      const matches = body.hospital_logo.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (matches && matches[2]) {
        try {
          const buf = Buffer.from(matches[2], "base64");
          const fs = await import("fs");
          const path = await import("path");
          const tmpPath = path.join("/tmp", `hospital-logo-${Date.now()}.png`);
          fs.writeFileSync(tmpPath, buf);
          hospitalLogoPath = tmpPath;
        } catch {
          hospitalLogoPath = undefined;
        }
      }
    }

    // Build the patient object expected by generateSickLeavePDF
    // — matches the field names of PatientData from pdf-generator.ts.
    const patient: PatientData = {
      gsl_code: payload.leaveNumber,
      identity_number: payload.idNumber,
      name_ar: payload.name,
      name_en: payload.nameEn,
      date_from: payload.entryDate,
      date_to: payload.exitDate,
      day_count: payload.dayCount,
      issue_date: payload.entryDate, // Issue Date = admission date (matches original behaviour)
      employer: payload.employer,
      employer_en: payload.employerEn,
      doctor_name_ar: payload.doctor,
      doctor_name_en: payload.doctorEn,
      doctor_specialty_ar: payload.jobTitle,
      doctor_specialty_en: payload.jobTitleEn,
      nationalityObj: {
        name_ar: payload.nationality,
        name_en: payload.nationalityEn,
      },
      time_from: payload.time,
    };

    const hospital: HospitalData | null = {
      name_ar: payload.hospitalName,
      name_en: payload.hospitalNameEn,
      logo: hospitalLogoPath,
      license_number: payload.licenseNumber,
    };

    const pdfBuffer = await generateSickLeavePDF(patient, hospital, null);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="sick_leave_${payload.leaveNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("[generate-pdf] Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "PDF generation failed" },
      { status: 500 },
    );
  }
}
