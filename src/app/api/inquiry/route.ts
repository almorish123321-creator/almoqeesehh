/**
 * POST /api/inquiry
 * Body: { service_code: string, national_id: string }
 *
 * مسار الاستعلام عن الإجازة المرضية — مطابق لمنطق
 * alehtiat-almorish/website/routes/inquiry.js (POST /inquiry/api).
 *
 * الـ query الأصلي في MySQL:
 *   SELECT * FROM patients
 *   WHERE gsl_code = ? AND identity_number = ?
 *     AND (prevent_inquiry = 0 OR prevent_inquiry IS NULL)
 *
 * في PostgreSQL:
 *   - ILIKE للبحث غير الحساس لحالة الأحرف
 *   - BOOLEAN مباشرة (prevent_inquiry IS NOT TRUE)
 *
 * الرد:
 *   - 200 + { success: true, data: {...} }  عند وجود سجل مطابق
 *   - 404 + { success: false, message }     عند عدم وجود سجل
 *   - 400 + { success: false, message }     عند نقص مدخلات
 *   - 500 + { success: false, message }     عند خطأ داخلي
 *
 * وضع العرض (DEMO_MODE أو فشل الاتصال بقاعدة البيانات):
 *   - يبحث في Vercel Blob storage (دالتان demoSearchLeave من src/lib/db)
 *   - يطابق gsl_code و identity_number بحساسية حالة الأحرف
 *
 * توافق مع مستودع floseseh (server.js /api/inquiry):
 *   - يقبل أسماء حقول متعددة: leaveId / service_code / id / serviceCode
 *     و nationalId / national_id / nin / nid
 *   - يوحّد الأرقام العربية-الهندية (٠-٩ ، ۰-۹) إلى أرقام لاتينية
 *   - الرد يتضمن الشكلين معاً: data (لصفحة /inquiry) و report
 *     (لصفحة /verify) — نفس حقول report في server.js
 */

import { NextRequest, NextResponse } from "next/server";
import { sql, isDemoMode, demoSearchLeave } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * توحيد الأرقام العربية-الهندية إلى لاتينية — مطابق لدالة cleanDigits في
 * server.js من مستودع floseseh:
 *   replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
 *   replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
 */
export function normalizeDigits(s: string): string {
  if (!s) return "";
  return String(s)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .trim();
}

/**
 * توحيد رمز الخدمة: أرقام لاتينية + أحرف كبيرة + إزالة المسافات —
 * مطابق لدالة cleanCode في server.js من مستودع floseseh.
 */
export function normalizeCode(s: string): string {
  if (!s) return "";
  return normalizeDigits(s).toUpperCase().replace(/\s+/g, "");
}

/**
 * Format a Date/string as DD-MM-YYYY (Gregorian, day-first) — exactly
 * like the original `formatDate` helper in inquiry.js.
 */
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
}

/**
 * Convert a database row (snake_case) into the response shape expected
 * by the inquiry page (camelCase fields used by the React page).
 *
 * النصوص العربية تُرسل كما هي، الأرقام كذلك. التواريخ بصيغة DD-MM-YYYY.
 */
function formatRow(row: any) {
  const data = {
    name: row.name_ar ?? row.name ?? "",
    issue_date: formatDate(row.issue_date),
    date_from: formatDate(row.date_from),
    date_to: formatDate(row.date_to),
    day_count: row.day_count ?? row.dayCount ?? 0,
    doctor_name: row.doctor_name_ar ?? row.doctorNameAr ?? "",
    doctor_specialty: row.doctor_specialty_ar ?? row.doctorSpecialtyAr ?? "",
  };

  // كائن report — نفس حقول الرد في server.js من مستودع floseseh
  // (/api/inquiry → { success, report: formatted }) — تستخدمه صفحة /verify
  const report = {
    id: row.gsl_code ?? "",
    serviceCode: row.gsl_code ?? "",
    nationalId: row.identity_number ?? "",
    type: "sickleave",
    name: data.name,
    patientName: data.name,
    companionName: row.escort_name_ar ?? "",
    relation: row.relation_ar ?? "",
    issueDate: data.issue_date,
    startDate: data.date_from,
    endDate: data.date_to,
    duration: String(data.day_count ?? "1"),
    doctorName: data.doctor_name,
    jobTitle: data.doctor_specialty,
    hospital: row.hospital_ar ?? row.hospital_name_ar ?? "",
    // البيانات الخام بأسماء حقول server.js (patient_name_ar, admission_date,
    // discharge_date, job_title_ar ...) — تستخدمها /verify كقيم احتياطية
    data: {
      patient_name_ar: row.name_ar ?? row.name ?? "",
      patient_name_en: row.name_en ?? "",
      national_id: row.identity_number ?? "",
      issue_date: row.issue_date ?? "",
      admission_date: row.date_from ?? "",
      discharge_date: row.date_to ?? "",
      duration: String(row.day_count ?? row.dayCount ?? "1"),
      doctor_name_ar: row.doctor_name_ar ?? "",
      doctor_name: row.doctor_name_en ?? "",
      job_title_ar: row.doctor_specialty_ar ?? "",
      position: row.doctor_specialty_en ?? "",
      hospital_ar: row.hospital_ar ?? row.hospital_name_ar ?? "",
    },
  };

  return { data, report };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // أسماء الحقول البديلة — مطابق لـ server.js من مستودع floseseh:
    //   leaveId || service_code || id || serviceCode
    //   nationalId || national_id || nin || nid
    const rawCode = String(
      body?.leaveId ?? body?.service_code ?? body?.id ?? body?.serviceCode ?? "",
    );
    const rawNationalId = String(
      body?.nationalId ?? body?.national_id ?? body?.nin ?? body?.nid ?? "",
    );

    // توحيد الأرقام والرمز — مطابق لـ cleanDigits/cleanCode في server.js
    const service_code = normalizeCode(rawCode);
    const national_id = normalizeDigits(rawNationalId);

    // تحقق أساسي من المدخلات — مطابق للأصل
    if (!service_code || !national_id) {
      return NextResponse.json(
        { success: false, message: "يرجى إدخال رمز الخدمة ورقم الهوية." },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------
    // وضع العرض: ابحث في Vercel Blob storage (DEMO_MODE=true)
    // -----------------------------------------------------------------
    if (isDemoMode()) {
      const demoRows = await demoSearchLeave({
        gsl: service_code,
        id: national_id,
        limit: 50,
      });

      // البحث في الذاكرة يطابق substring، لذا نُصفّي النتائج لتطابق
      // المعرّف الكامل تماماً (case-insensitive) كما يفعل الـ MySQL.
      const exact = demoRows.find(
        (r) =>
          r.gsl_code.toLowerCase() === service_code.toLowerCase() &&
          r.identity_number === national_id,
      );

      if (exact) {
        const { data, report } = formatRow(exact);
        return NextResponse.json({ success: true, data, report });
      }
      return NextResponse.json(
        { success: false, message: "خطأ في الاستعلام" },
        { status: 404 },
      );
    }

    // -----------------------------------------------------------------
    // الوضع الإنتاجي: استعلام PostgreSQL
    // -----------------------------------------------------------------
    let rows: any[] = [];
    try {
      // البحث المطابق تماماً (case-insensitive) — يطابق الـ MySQL UPPER()
      const res = await sql`
        SELECT * FROM patients
        WHERE LOWER(gsl_code) = LOWER(${service_code})
          AND identity_number = ${national_id}
          AND (prevent_inquiry IS NOT TRUE)
        LIMIT 1
      `;
      rows = res.rows as any[];

      // إن لم يُوجَد في جدول patients، جرّب جدول sick_leaves (الهيكل الجديد)
      if (rows.length === 0) {
        const res2 = await sql`
          SELECT * FROM sick_leaves
          WHERE LOWER(gsl_code) = LOWER(${service_code})
            AND identity_number = ${national_id}
          LIMIT 1
        `;
        rows = res2.rows as any[];
      }
    } catch (dbErr: any) {
      const msg = String(dbErr?.message || dbErr || "");
      // عند عدم وجود قاعدة بيانات مربوطة، ارجع تلقائياً إلى وضع العرض
      // (Vercel Blob) بدلاً من إرجاع 500 — يضمن عمل صفحة الاستعلام
      // فوراً على Vercel بدون إعداد قاعدة بيانات.
      if (
        msg.includes("missing_connection_string") ||
        msg.includes("connect") ||
        msg.includes("connection") ||
        msg.includes("relation") ||
        msg.includes("does not exist")
      ) {
        const demoRows = await demoSearchLeave({
          gsl: service_code,
          id: national_id,
          limit: 50,
        });
        const exact = demoRows.find(
          (r) =>
            r.gsl_code.toLowerCase() === service_code.toLowerCase() &&
            r.identity_number === national_id,
        );
        if (exact) {
          const { data, report } = formatRow(exact);
          return NextResponse.json({ success: true, data, report });
        }
        return NextResponse.json(
          { success: false, message: "خطأ في الاستعلام" },
          { status: 404 },
        );
      }
      throw dbErr;
    }

    if (rows.length > 0) {
      const { data, report } = formatRow(rows[0]);
      return NextResponse.json({ success: true, data, report });
    }

    return NextResponse.json(
      { success: false, message: "خطأ في الاستعلام" },
      { status: 404 },
    );
  } catch (err: any) {
    console.error("[inquiry] Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "حدث خطأ أثناء الاتصال بالنظام، يرجى المحاولة لاحقًا.",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/inquiry?code=PSL-XXX&identity=XXXX
 *
 * يستخدمه رمز QR في PDF (لو احتاج) — يقبل GET أيضاً.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim() || "";
    const identity = searchParams.get("identity")?.trim() || "";

    if (!code || !identity) {
      return NextResponse.json(
        { success: false, message: "يرجى إدخال رمز الخدمة ورقم الهوية." },
        { status: 400 },
      );
    }

    // أعد استخدام نفس منطق POST عبر تحويله إلى جسم JSON
    return POST(
      new NextRequest(req.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_code: code, national_id: identity }),
      }),
    );
  } catch (err: any) {
    console.error("[inquiry GET] Error:", err);
    return NextResponse.json(
      { success: false, message: "خطأ في الاستعلام" },
      { status: 500 },
    );
  }
}
