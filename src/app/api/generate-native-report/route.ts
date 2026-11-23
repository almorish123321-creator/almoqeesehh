/**
 * POST /api/generate-native-report
 * =================================
 * يولد HTML التقرير المطابق 100% لتنسيق المستودع المرجعي floseseh
 * (نفس مخرجات POST /api/generate-native-pdf في server.js — لكن بدون
 * Puppeteer: المستعرض نفسه يُستخدم للطباعة/الحفظ PDF عبر نافذة الطباعة
 * بنفس محرك الرندر، فالناتج مطابق بصرياً تماماً).
 *
 * الأنواع الأربعة: sickleave | companion | companion_review | visit_review
 *
 * Body (JSON): NativeReportInput + hospital_logo (data URL اختياري)
 * Response: text/html — مستند مستقل بذاته (خطوط مضمّنة base64 + شعارات
 * base64 + باركود QR data URL) يفتح في نافذة ويطبع تلقائياً بحجم A4.
 */

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import {
  generateNativeLeaveId,
  type NativeReportInput,
} from "@/lib/native-report";
import { buildServerNativeReport } from "@/lib/native-report-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** استنتج عنوان التطبيق من ترويسات الطلب (نفس دور WEB_APP_URL في المستودع) */
function resolveBaseUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as NativeReportInput;
    if (!body || !body.type) {
      return NextResponse.json(
        { success: false, message: "بيانات التقرير غير مكتملة" },
        { status: 400 },
      );
    }

    const baseUrl = resolveBaseUrl(req);

    // رمز الإجازة الموحد: من العميل إن وُجد، وإلا يُولَّد خادمياً بنفس
    // خوارزمية المستودع (الشفر الأفين التسلسلي الزمني)
    const leaveId =
      body.leave_id && String(body.leave_id).trim()
        ? String(body.leave_id).trim()
        : generateNativeLeaveId(
            body.issue_date || new Date().toISOString().slice(0, 10),
            body.hospital_type === "private" ? "private" : "public",
          );

    // باركود QR — توليد محلي بدون اعتماد على خدمات خارجية (نفس المستودع):
    // QRCode.toDataURL(target, { width: 144, margin: 0, errorCorrectionLevel: 'M' })
    const includeQR = body.include_qr !== false;
    const qrTarget = `/inquiry?id=${encodeURIComponent(leaveId)}&nin=${encodeURIComponent(body.national_id || "")}`;
    let qrDataUrl = "";
    if (includeQR) {
      try {
        qrDataUrl = await QRCode.toDataURL(`${baseUrl}${qrTarget}`, {
          width: 144,
          margin: 0,
          errorCorrectionLevel: "M",
        });
      } catch {
        qrDataUrl = ""; // فشل غير قاتل — القالب يرجع لخدمة QR الخارجية
      }
    }

    // بناء HTML التقرير خادمياً (نفس تدفق server.js: بيانات ← أصول ← قالب)
    const { html: rawHtml } = await buildServerNativeReport(
      { ...body, leave_id: leaveId },
      { baseUrl, qrTarget, qrDataUrl },
    );

    // وضع العرض داخل الصفحة (embed): نزيل سكربت الطباعة التلقائية حتى
    // لا تُفتح نافذة الطباعة فور تضمين التقرير في معاينة نفس الصفحة —
    // المستخدم يطبع يدوياً بزر (طباعة) في المعاينة.
    const html =
      body.embed === true
        ? rawHtml.replace(/<script>[\s\S]*?<\/script>\s*<\/body>/, "</body>")
        : rawHtml;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Leave-Id": leaveId,
      },
    });
  } catch (err: any) {
    console.error("[generate-native-report] Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "فشل توليد التقرير" },
      { status: 500 },
    );
  }
}
