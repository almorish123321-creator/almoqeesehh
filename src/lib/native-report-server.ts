/**
 * Native Seha Report — SERVER-ONLY helpers
 * =========================================
 * قراءة الخطوط والشعارات من نظام الملفات وتضمينها base64 —
 * نفس آلية EMBEDDED_FONTS_CSS و imgToBase64 في server.js بالمستودع.
 *
 * هذا الملف خادمي فقط (يستخدم fs) — لا يستورده أبداً مكوّن عميل.
 * الدوال البحتة (الأنواع، دوال التواريخ، بناء البيانات والقالب) في
 * src/lib/native-report.ts.
 */

import {
  buildNativeReportData,
  buildNativeReportHTML,
  type NativeReportAssets,
  type NativeReportInput,
} from "./native-report";

// ============================================================
// الخطوط المضمّنة — نفس fonts-embedded.css من المستودع (base64 woff2)
// تُقرأ مرة واحدة وتُخزَّن في الذاكرة
// ============================================================

let _embeddedFontsCss: string | null = null;

function embeddedFontsCss(): string {
  if (_embeddedFontsCss !== null) return _embeddedFontsCss;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const candidates = [
      path.join(process.cwd(), "public", "assets", "native-report", "fonts-embedded.css"),
      path.join(process.cwd(), ".next", "standalone", "public", "assets", "native-report", "fonts-embedded.css"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        _embeddedFontsCss = fs.readFileSync(p, "utf8");
        return _embeddedFontsCss;
      }
    }
  } catch {
    /* fallthrough */
  }
  _embeddedFontsCss = ""; // احتياطي: الخطوط النظامية
  return _embeddedFontsCss;
}

// ============================================================
// قراءة الأصول (الشعارات) من الملفات وتضمينها base64
// — نفس imgToBase64 في server.js (3686-3704)
// ============================================================

function imgToBase64(relPaths: string[]): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  for (const rel of relPaths) {
    const candidates = [
      path.join(process.cwd(), "public", rel),
      path.join(process.cwd(), ".next", "standalone", "public", rel),
    ];
    for (const abs of candidates) {
      try {
        if (!fs.existsSync(abs)) continue;
        const buf = fs.readFileSync(abs);
        const ext = path.extname(abs).toLowerCase().replace(".", "");
        const mime =
          ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : ext === "svg"
              ? "image/svg+xml"
              : "image/png";
        return `data:${mime};base64,${buf.toString("base64")}`;
      } catch {
        /* حاول التالي */
      }
    }
  }
  return "";
}

/**
 * تحميل أصول التقرير — شعار صحة، ختام المملكة، شعار وزارة الصحة،
 * شعار المركز الوطني — مع روابط الاستعلام والباركود.
 * نفس ترتيب البدائل في server.js (3701-3704).
 */
export async function loadNativeReportAssets(
  baseUrl: string,
  qrTarget: string,
  qrDataUrl: string,
): Promise<NativeReportAssets> {
  const sehaLogo =
    imgToBase64(["images/native-report/seha_logo_blue.png"]) ||
    imgToBase64(["images/native-report/Seha.png"]);
  const ksaCalligraphy = imgToBase64([
    "images/native-report/ksa_emblem_clean.png",
  ]);
  const mohLogo = imgToBase64(["images/native-report/moh_logo_clean.png"]);
  const nhicLogo = imgToBase64(["images/native-report/nhic-logo.jpg"]);

  return {
    sehaLogo,
    ksaCalligraphy,
    mohLogo,
    nhicLogo,
    qrDataUrl,
    inquiryUrl: `${baseUrl}${qrTarget}`,
  };
}

/**
 * بناء HTML التقرير كاملاً خادمياً (نفس تدفق server.js generate-native-pdf):
 * تحضير البيانات ← تحميل الأصول ← حقن الخطوط ← بناء القالب.
 */
export async function buildServerNativeReport(
  input: NativeReportInput,
  opts: { baseUrl: string; qrTarget: string; qrDataUrl: string },
): Promise<{ html: string; data: ReturnType<typeof buildNativeReportData> }> {
  const data = buildNativeReportData(input);
  const assets = await loadNativeReportAssets(
    opts.baseUrl,
    opts.qrTarget,
    opts.qrDataUrl,
  );
  const html = buildNativeReportHTML(data, assets, embeddedFontsCss());
  return { html, data };
}
