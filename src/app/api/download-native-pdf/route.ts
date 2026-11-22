/**
 * POST /api/download-native-pdf
 * =============================
 * يولّد ملف PDF منسّق جاهز للتنزيل المباشر — بنفس قالب المستودع المرجعي
 * floseseh حرفياً (نفس HTML المسار /api/generate-native-report المستخدم
 * في نافذة الطباعة) لكن يُرنَّد هنا خادمياً عبر Chromium headless
 * (@sparticuz/chromium) ويُعاد كملف PDF مرفق للتنزيل.
 *
 * الأنواع الأربعة: sickleave | companion | companion_review | visit_review
 *
 * Body (JSON): NativeReportInput + hospital_logo (data URL اختياري)
 * Response: application/pdf — Content-Disposition: attachment
 */

import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {
  generateNativeLeaveId,
  type NativeReportInput,
} from "@/lib/native-report";
import { buildServerNativeReport } from "@/lib/native-report-server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** استنتج عنوان التطبيق من ترويسات الطلب (نفس دور WEB_APP_URL في المستودع) */
function resolveBaseUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const host =
    req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** اسم ملف التنزيل: نوع النموذج + رمز الإجازة (ASCII آمن) */
function safeFileName(leaveId: string, type: string): string {
  const typePart = String(type || "report").replace(/[^a-zA-Z0-9_-]/g, "");
  const idPart = String(leaveId).replace(/[^a-zA-Z0-9_-]/g, "") || "report";
  return `${typePart}-${idPart}.pdf`;
}

/** حاوية Chromium واحدة معاد استخدامها عبر الطلبات (توفّر cold start) */
let _browser: import("puppeteer-core").Browser | null = null;

async function getBrowser(): Promise<import("puppeteer-core").Browser> {
  if (_browser && _browser.connected) return _browser;
  _browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: "shell",
    defaultViewport: { width: 794, height: 1123 },
  });
  return _browser;
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

    // رمز الإجازة الموحد — نفس خوارزمية مسار الطباعة
    const leaveId =
      body.leave_id && String(body.leave_id).trim()
        ? String(body.leave_id).trim()
        : generateNativeLeaveId(
            body.issue_date || new Date().toISOString().slice(0, 10),
            body.hospital_type === "private" ? "private" : "public",
          );

    // باركود QR — نفس توليد مسار الطباعة
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
        qrDataUrl = "";
      }
    }

    // بناء HTML التقرير — نفس القالب تماماً المستخدم في نافذة الطباعة
    const { html } = await buildServerNativeReport(
      { ...body, leave_id: leaveId },
      { baseUrl, qrTarget, qrDataUrl },
    );

    // رندر Chromium → PDF بنفس أبعاد الصفحة المعرّفة في القالب (@page 794×1123)
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "load",
      timeout: 45000,
    });
    // انتظار تحميل الخطوط المضمّنة قبل الطباعة (القالب مكتفٍ ذاتياً base64)
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      width: "794px",
      height: "1123px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: false,
      pageRanges: "1",
    });

    await page.close();

    const fileName = safeFileName(leaveId, body.type);
    const size = typeof pdf.length === "number" ? pdf.length : (pdf as Uint8Array).byteLength;
    return new NextResponse(Buffer.from(pdf) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(size),
        "Cache-Control": "no-store",
        "X-Leave-Id": leaveId,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "فشل توليد ملف PDF";
    console.error("[download-native-pdf] Error:", err);
    return NextResponse.json(
      { success: false, message },
      { status: 500 },
    );
  }
}
