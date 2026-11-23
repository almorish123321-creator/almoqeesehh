"use client";

/**
 * صفحة /verify — نسخة React مطابقة بصرياً 100% للأصل
 * ============================================================================
 *
 * المصدر: مستودع aboooo555567-coder/floseseh — verify.html (826 سطر)
 * (في المستودع الأصلي تُخدَم على المسار /verify عبر server.js سطر 3162)
 *
 * القاعدة الذهبية: لا تغيير بصري. كل الـ CSS (الخط Tajawal، الترويسة،
 * مسار التنقل breadcrumb، حقول الإدخال، بطاقة النتيجة الرمادية، الأزرار،
 * التذييل مع شعاري وزارة الصحة ولين، أيقونات التواصل، ودردشة المساعد
 * العائمة) — منسوخ حرفياً من verify.html.
 *
 * الاختلافات التقنية المسموح بها فقط:
 *  - DOM getElementById → React state + refs
 *  - fetch '/api/inquiry' (نفس مسار الـ API الأصلي، مع استجابة تُرجع report)
 *  - <script> DOMContentLoaded → useEffect
 *
 * الوظائف المطابقة للأصل:
 *  - توحيد الأرقام العربية-الهندية (٠-٩ / ۰-۹) قبل الإرسال
 *  - تعبئة تلقائية من رابط QR (?id=&nin= أو #/...?id=&nin=) مع استعلام تلقائي
 *  - قفل الحقول بعد النتيجة + زر "استعلام جديد" لفتحها ومسح الرابط
 */

import { useState, useRef, useEffect, useCallback } from "react";

interface ReportShape {
  name?: string;
  issueDate?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  doctorName?: string;
  jobTitle?: string;
  hospital?: string;
  data?: Record<string, string>;
}

interface ResultFields {
  name: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  duration: string;
  doctorName: string;
  jobTitle: string;
}

/* توحيد الأرقام العربية-الهندية — مطابق لدالة normalizeDigits في verify.html */
function normalizeDigits(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .trim();
}

/* توحيد رمز الخدمة — مطابق لدالة normalizeCode في verify.html */
function normalizeCode(str: string): string {
  if (!str) return "";
  return normalizeDigits(str).toUpperCase().replace(/\s+/g, "");
}

export default function VerifyPage() {
  const [serviceCode, setServiceCode] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [alertMsg, setAlertMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultFields | null>(null);
  const [inputsLocked, setInputsLocked] = useState(false);
  const [phase, setPhase] = useState<"initial" | "result">("initial");

  const codeRef = useRef<HTMLInputElement>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);
  // لمنع الاستعلام التلقائي المزدوج في وضع التطوير (StrictMode يشغّل التأثير مرتين)
  const autoRanRef = useRef(false);

  const showAlert = (msg: string) => setAlertMsg(msg);
  const hideAlert = () => setAlertMsg("");

  /**
   * منطق الاستعلام — مطابق لدالة handleInquiry في verify.html:
   * POST /api/inquiry مع { leaveId, nationalId } وتوقّع { success, report }
   */
  const handleInquiry = useCallback(
    async (rawCodeArg?: string, rawNidArg?: string) => {
      const rawCode = rawCodeArg !== undefined ? rawCodeArg : serviceCode;
      const rawNid = rawNidArg !== undefined ? rawNidArg : nationalId;

      const code = normalizeCode(rawCode);
      const nid = normalizeDigits(rawNid);

      hideAlert();

      if (!code || !nid) {
        showAlert("الرجاء إدخال رمز الخدمة ورقم الهوية / الإقامة");
        return;
      }

      setLoading(true);

      try {
        const response = await fetch("/api/inquiry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leaveId: code, nationalId: nid }),
        });

        const res = await response.json();
        setLoading(false);

        if (res.success && res.report) {
          const rep: ReportShape = res.report;
          const rData: Record<string, string> = rep.data || {};

          // Populate fields — نفس التعيينات في verify.html
          setResult({
            name: rep.name || rData.patient_name_ar || rData.patient_name_en || "-",
            issueDate: rep.issueDate || rData.issue_date || "-",
            startDate: rep.startDate || rData.admission_date || "-",
            endDate: rep.endDate || rData.discharge_date || "-",
            duration: rep.duration || rData.duration || "1",
            doctorName: rep.doctorName || rData.doctor_name_ar || "-",
            jobTitle: rep.jobTitle || rData.job_title_ar || "-",
          });

          // Lock inputs as disabled (matching Screenshot 2)
          setInputsLocked(true);

          // Toggle visibility to show result card and change buttons
          setPhase("result");

          // Smooth scroll to results
          setTimeout(() => {
            resultCardRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 50);
        } else {
          showAlert(res.error || res.message || "التقرير غير موجود أو البيانات غير متطابقة.");
        }
      } catch (err) {
        setLoading(false);
        showAlert("حدث خطأ في الاتصال بالخدمة. يرجى المحاولة لاحقاً.");
      }
    },
    [serviceCode, nationalId],
  );

  /**
   * استعلام جديد — مطابق لدالة handleNewInquiry في verify.html:
   * فتح الحقول، مسحها، إخفاء النتيجة، تنظيف معاملات الرابط، تركيز الحقل الأول
   */
  const handleNewInquiry = useCallback(() => {
    hideAlert();
    setInputsLocked(false);
    setServiceCode("");
    setNationalId("");
    setResult(null);
    setPhase("initial");

    // Clean URL query parameters
    if (window.history.replaceState) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    setTimeout(() => codeRef.current?.focus(), 0);
  }, []);

  // handleBack — مطابق للأصل (نفس سلوك استعلام جديد)
  const handleBack = handleNewInquiry;

  /**
   * On Page Load — مطابق لـ DOMContentLoaded في verify.html:
   * قراءة معاملات الرابط (id / serviceCode / leaveId و nin / nid / nationalId)
   * أو معاملات الهاش (#/...?id=&nin=)، ثم استعلام تلقائي إن وجد الاثنان
   */
  useEffect(() => {
    if (autoRanRef.current) return;
    autoRanRef.current = true;

    const url = new URL(window.location.href);
    let id =
      url.searchParams.get("id") ||
      url.searchParams.get("serviceCode") ||
      url.searchParams.get("leaveId") ||
      "";
    let nin =
      url.searchParams.get("nin") ||
      url.searchParams.get("nid") ||
      url.searchParams.get("nationalId") ||
      "";

    // If not found in query string, check URL hash (e.g. #/inquiries/slenquiry?id=...&nin=...)
    if ((!id || !nin) && window.location.hash) {
      const hashPart = window.location.hash;
      const qIdx = hashPart.indexOf("?");
      if (qIdx !== -1) {
        const hashParams = new URLSearchParams(hashPart.substring(qIdx));
        id =
          id ||
          hashParams.get("id") ||
          hashParams.get("serviceCode") ||
          hashParams.get("leaveId") ||
          "";
        nin =
          nin ||
          hashParams.get("nin") ||
          hashParams.get("nid") ||
          hashParams.get("nationalId") ||
          "";
      }
    }

    // التعبئة الأولية من معاملات الرابط تحدّث الحالة عمداً عند التحميل
    // (مطابق لسلوك DOMContentLoaded في verify.html الأصلي)
    /* eslint-disable react-hooks/set-state-in-effect */
    if (id) setServiceCode(id.trim());
    if (nin) setNationalId(nin.trim());

    // If both ID and NIN are present in the URL (scanned from QR code or link),
    // auto-execute inquiry!
    if (id && nin) {
      handleInquiry(id.trim(), nin.trim());
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap");

        html,
        body {
          margin: 0;
          padding: 0;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: "Tajawal", -apple-system, BlinkMacSystemFont, "Segoe UI",
            Roboto, sans-serif;
          -webkit-tap-highlight-color: transparent;
        }

        body {
          background-color: #ffffff;
          color: #1e293b;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          direction: rtl;
        }

        /* Top Header */
        .header {
          background: #ffffff;
          border-bottom: 1px solid #edf2f7;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-logo {
          display: flex;
          align-items: center;
        }

        .header-logo img {
          height: 36px;
          object-fit: contain;
        }

        .header-menu-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
        }

        .header-menu-btn span {
          display: block;
          width: 22px;
          height: 2.5px;
          background-color: #1f4f89;
          border-radius: 2px;
        }

        /* Breadcrumb */
        .breadcrumb-bar {
          background: #ffffff;
          padding: 12px 20px;
          font-size: 13.5px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #4a5568;
          border-bottom: 1px solid #f1f5f9;
        }

        .breadcrumb-bar a {
          color: #1f548e;
          text-decoration: none;
          font-weight: 600;
        }

        .breadcrumb-bar .sep {
          color: #94a3b8;
        }

        .breadcrumb-bar .current {
          color: #475569;
        }

        /* Main Container */
        .main-container {
          flex: 1;
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          padding: 28px 20px 40px 20px;
          text-align: center;
        }

        .title-wrapper {
          margin-bottom: 16px;
        }

        .page-title {
          display: inline-block;
          position: relative;
          color: #1f548e;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .page-title::after {
          content: "";
          position: absolute;
          left: -8px;
          right: -8px;
          bottom: 3px;
          height: 9px;
          background: #e2effd;
          z-index: -1;
          border-radius: 4px;
        }

        .page-subtitle {
          color: #64748b;
          font-size: 13.5px;
          line-height: 1.75;
          margin: 0 auto 28px auto;
          max-width: 360px;
        }

        /* Form Inputs */
        .form-section {
          margin-bottom: 24px;
        }

        .input-group {
          margin-bottom: 14px;
        }

        .form-input {
          width: 100%;
          height: 48px;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          padding: 0 16px;
          font-size: 15.5px;
          font-weight: 600;
          color: #1e293b;
          text-align: center;
          background-color: #ffffff;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }

        .form-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .form-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
          text-align: center;
        }

        .form-input:disabled {
          background-color: #ffffff;
          color: #1e293b;
          cursor: default;
        }

        /* Buttons */
        .btn-seha {
          display: block;
          width: 200px;
          height: 44px;
          margin: 0 auto 12px auto;
          background-color: #24588e;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-family: inherit;
          transition: background-color 0.2s, transform 0.1s;
          box-shadow: 0 2px 4px rgba(36, 88, 142, 0.15);
        }

        .btn-seha:hover {
          background-color: #1a426c;
        }

        .btn-seha:active {
          transform: scale(0.98);
        }

        .btn-seha:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Result Card (exact match with media_1789516741334.png) */
        .result-card {
          background-color: #f3f4f6;
          border-radius: 14px;
          padding: 26px 20px;
          margin: 22px 0 28px 0;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          animation: fadeIn 0.3s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .result-item {
          margin-bottom: 16px;
        }

        .result-item:last-child {
          margin-bottom: 0;
        }

        .result-label {
          font-size: 15px;
          font-weight: 800;
          color: #111827;
          margin-bottom: 3px;
        }

        .result-val {
          font-size: 14.5px;
          font-weight: 500;
          color: #374151;
          word-break: break-word;
        }

        /* Status & Alert Messages */
        .alert-box {
          background-color: #fee2e2;
          border: 1px solid #fca5a5;
          color: #b91c1c;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          margin: 16px 0;
          display: none;
          line-height: 1.5;
        }

        .loading-spinner {
          display: none;
          margin: 20px auto;
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #24588e;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        /* Footer (exact match with user screenshots) */
        .footer {
          background-color: #1e4a7a;
          color: #ffffff;
          padding: 40px 20px 28px 20px;
          text-align: center;
          margin-top: auto;
        }

        .footer-logo-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 16px;
        }

        .footer-logo-wrap img {
          height: 48px;
          filter: brightness(0) invert(1);
        }

        .footer-desc {
          color: #e2e8f0;
          font-size: 12.5px;
          line-height: 1.8;
          max-width: 330px;
          margin: 0 auto 30px auto;
          text-align: center;
        }

        .footer-section-title {
          font-size: 16px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .footer-title-bar {
          width: 85px;
          height: 3px;
          background-color: #5ba2df;
          margin: 0 auto 16px auto;
          border-radius: 2px;
        }

        .footer-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 34px;
        }

        .footer-links a {
          color: #ffffff;
          text-decoration: none;
          font-size: 14.5px;
          font-weight: 500;
          transition: color 0.2s;
        }

        .footer-links a:hover {
          color: #93c5fd;
        }

        .footer-contact-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          margin-bottom: 24px;
          direction: ltr;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
        }

        .contact-item svg {
          width: 16px;
          height: 16px;
          fill: #ffffff;
        }

        .footer-partners {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 28px;
          margin: 20px auto;
          padding: 10px 0;
        }

        .work-hours {
          font-size: 13px;
          color: #cbd5e1;
          margin: 14px 0 18px 0;
        }

        .social-icons {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 18px;
          margin-bottom: 24px;
        }

        .social-icons a {
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
        }

        .social-icons svg {
          width: 22px;
          height: 22px;
          fill: #ffffff;
        }

        .footer-divider {
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          margin: 24px auto 18px auto;
          max-width: 360px;
        }

        .copyright-text {
          font-size: 12px;
          color: #cbd5e1;
          margin-bottom: 10px;
        }

        .footer-sub-links {
          display: flex;
          justify-content: center;
          gap: 20px;
          font-size: 12px;
        }

        .footer-sub-links a {
          color: #cbd5e1;
          text-decoration: none;
        }

        /* Floating Chat Widget */
        .chat-widget-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #ffffff;
          border-radius: 30px;
          padding: 6px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.18);
          z-index: 1000;
          cursor: pointer;
          border: 1px solid #e2e8f0;
        }

        .chat-widget-btn .bot-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1e3a8a, #3b82f6);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-widget-btn .bot-circle svg {
          width: 18px;
          height: 18px;
          fill: #ffffff;
        }

        .chat-widget-btn .chat-bubble {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-widget-btn .chat-bubble svg {
          width: 16px;
          height: 16px;
          fill: #ffffff;
        }

        /* ودردشة ElevenLabs ليست جزءاً من verify.html الأصلي */
        elevenlabs-convai {
          display: none !important;
        }
      `}</style>

      {/* Header (Logo on right, Menu on left) */}
      <header className="header">
        <div className="header-logo">
          <img src="/assets/images/Seha.png" alt="منصة صحة | Seha" />
        </div>
        <button className="header-menu-btn" aria-label="القائمة" type="button">
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* Breadcrumb */}
      <nav className="breadcrumb-bar" aria-label="مسار التنقل">
        <a href="#">الرئيسية</a>
        <span className="sep">/</span>
        <a href="#">الاستعلامات</a>
        <span className="sep">/</span>
        <span className="current">الإجازات المرضية</span>
      </nav>

      {/* Main Content */}
      <main className="main-container">
        <div className="title-wrapper">
          <h1 className="page-title">الإجازات المرضية</h1>
        </div>

        <p className="page-subtitle">
          خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك
          للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي
        </p>

        {/* Form Inputs */}
        <div className="form-section">
          <div className="input-group">
            <input
              type="text"
              id="serviceCode"
              ref={codeRef}
              className="form-input"
              placeholder="رمز الخدمة"
              autoComplete="off"
              spellCheck={false}
              value={serviceCode}
              onChange={(e) => setServiceCode(e.target.value)}
              disabled={inputsLocked}
            />
          </div>
          <div className="input-group">
            <input
              type="text"
              id="nationalId"
              className="form-input"
              placeholder="رقم الهوية / الإقامة"
              autoComplete="off"
              spellCheck={false}
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              disabled={inputsLocked}
            />
          </div>
        </div>

        {/* Alert & Loading */}
        <div
          id="alertBox"
          className="alert-box"
          style={{ display: alertMsg ? "block" : "none" }}
        >
          {alertMsg}
        </div>
        <div
          id="loadingSpinner"
          className="loading-spinner"
          style={{ display: loading ? "block" : "none" }}
        />

        {/* Result Card (exact match with media_1789516741334.png) */}
        <div
          id="resultCard"
          ref={resultCardRef}
          className="result-card"
          style={{ display: result ? "block" : "none" }}
        >
          <div className="result-item">
            <div className="result-label">الاسم:</div>
            <div className="result-val">{result ? result.name : "--"}</div>
          </div>
          <div className="result-item">
            <div className="result-label">تاريخ إصدار تقرير الإجازة:</div>
            <div className="result-val">{result ? result.issueDate : "--"}</div>
          </div>
          <div className="result-item">
            <div className="result-label">تبدأ من:</div>
            <div className="result-val">{result ? result.startDate : "--"}</div>
          </div>
          <div className="result-item">
            <div className="result-label">وحتى:</div>
            <div className="result-val">{result ? result.endDate : "--"}</div>
          </div>
          <div className="result-item">
            <div className="result-label">المدة بالأيام:</div>
            <div className="result-val">{result ? result.duration : "--"}</div>
          </div>
          <div className="result-item">
            <div className="result-label">اسم الطبيب:</div>
            <div className="result-val">{result ? result.doctorName : "--"}</div>
          </div>
          <div className="result-item">
            <div className="result-label">المسمى الوظيفي:</div>
            <div className="result-val">{result ? result.jobTitle : "--"}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          id="initialButtons"
          style={{ display: phase === "initial" ? "block" : "none" }}
        >
          <button
            id="btnInquire"
            type="button"
            className="btn-seha"
            disabled={loading}
            onClick={() => handleInquiry()}
          >
            استعلام
          </button>
          <button
            id="btnBackInitial"
            type="button"
            className="btn-seha"
            onClick={handleBack}
          >
            رجوع للاستعلامات
          </button>
        </div>

        <div
          id="resultButtons"
          style={{ display: phase === "result" ? "block" : "none" }}
        >
          <button
            id="btnNewInquiry"
            type="button"
            className="btn-seha"
            onClick={handleNewInquiry}
          >
            استعلام جديد
          </button>
          <button
            id="btnBackResult"
            type="button"
            className="btn-seha"
            onClick={handleBack}
          >
            رجوع للاستعلامات
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-logo-wrap">
          <img src="/assets/images/Seha.png" alt="منصة صحة" />
        </div>

        <p className="footer-desc">
          منصة صحة تخدم جميع المنشآت الطبية من خلال تقديم الخدمات الصحية
          إلكترونياً لجميع المنشآت الطبية وتسعى إلى توحيد وأتمتة الإجراءات
          والخدمات بما في ذلك رفع جودة الأداء وخفض التكاليف.
        </p>

        <div className="footer-section-title">القائمة الرئيسية</div>
        <div className="footer-title-bar" />
        <nav className="footer-links">
          <a href="#">الخدمات</a>
          <a href="#">الاستعلامات</a>
          <a href="#">الأسئلة الشائعة</a>
          <a href="#">تواصل معنا</a>
        </nav>

        <div className="footer-section-title">تواصل معنا</div>
        <div className="footer-title-bar" />
        <div className="footer-contact-list">
          <a href="tel:920002005" className="contact-item">
            <span>920002005</span>
            <svg viewBox="0 0 24 24">
              <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.24.2 2.45.57 3.57.11.35.03.74-.24 1.02l-2.21 2.2z" />
            </svg>
          </a>
          <a href="mailto:support@seha.sa" className="contact-item">
            <span>support@seha.sa</span>
            <svg viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
          </a>
          <a href="https://wa.me/920002005" className="contact-item">
            <span>920002005</span>
            <svg viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 012.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.49-1.4-1.74-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.78 2.71 4.3 3.8 2.53 1.09 2.53.73 2.98.69.46-.04 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.17-.48-.29z" />
            </svg>
          </a>
        </div>

        <div className="footer-partners">
          {/* Ministry of Health Vector Logo in White */}
          <svg
            width="120"
            height="58"
            viewBox="0 0 160 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="#ffffff">
              <path d="M80 8 C78 14 74 20 70 24 C74 23 78 23 80 23 C82 23 86 23 90 24 C86 20 82 14 80 8 Z" />
              <path d="M70 11 C65 16 60 20 55 22 C59 23 63 24 67 24 C69 21 71 16 73 12 Z" />
              <path d="M90 11 C95 16 100 20 105 22 C101 23 97 24 93 24 C91 21 89 16 87 12 Z" />
              <path d="M63 18 C58 21 52 24 46 25 C50 27 55 27 60 27 C62 24 64 21 66 18 Z" />
              <path d="M97 18 C102 21 108 24 114 25 C110 27 105 27 100 27 C98 24 96 21 94 18 Z" />
              <path d="M79 24 L81 24 L81 33 L79 33 Z" />
              <path
                d="M56 36 C66 30 94 30 104 36 C94 42 66 42 56 36 Z"
                stroke="#ffffff"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
              <text
                x="80"
                y="56"
                fontFamily="'Tajawal', sans-serif"
                fontSize="14"
                fontWeight="bold"
                textAnchor="middle"
              >
                وزارة الصحة
              </text>
              <text
                x="80"
                y="70"
                fontFamily="'Arial', sans-serif"
                fontSize="9"
                textAnchor="middle"
                letterSpacing="0.5"
              >
                Ministry of Health
              </text>
            </g>
          </svg>

          {/* Lean Business Services Vector Logo in White */}
          <svg
            width="70"
            height="58"
            viewBox="0 0 80 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="#ffffff">
              <rect x="18" y="4" width="10" height="7" rx="2" />
              <rect x="35" y="4" width="10" height="7" rx="2" />
              <rect x="52" y="4" width="10" height="7" rx="2" />

              <rect x="18" y="14" width="10" height="7" rx="2" />
              <rect x="35" y="14" width="10" height="7" rx="2" />
              <rect x="52" y="14" width="10" height="7" rx="2" />

              <rect x="18" y="24" width="10" height="7" rx="2" />
              <rect x="35" y="24" width="10" height="7" rx="2" />
              <rect x="52" y="24" width="10" height="7" rx="2" />

              <text
                x="40"
                y="47"
                fontFamily="'Tajawal', sans-serif"
                fontSize="13"
                fontWeight="bold"
                textAnchor="middle"
              >
                لـيـن
              </text>
              <text
                x="40"
                y="61"
                fontFamily="'Arial', sans-serif"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                letterSpacing="1"
              >
                LEAN
              </text>
            </g>
          </svg>
        </div>

        <div className="work-hours">
          أوقات العمل: الأحد حتى الخميس 8 ص - 11 م
        </div>

        <div className="social-icons">
          <a href="#" aria-label="X (Twitter)">
            <svg viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a href="#" aria-label="YouTube">
            <svg viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </a>
        </div>

        <div className="footer-divider" />

        <div className="copyright-text">
          جميع الحقوق محفوظة من قبل وزارة الصحة © 2026
        </div>

        <div className="footer-sub-links">
          <a href="#">سياسة الخصوصية وشروط الاستخدام</a>
          <a href="#">دليل الاستخدام</a>
        </div>
      </footer>

      {/* Chat Widget Pill */}
      <div
        className="chat-widget-btn"
        onClick={() => alert("خدمة المساعد الآلي لمنصة صحة")}
        title="المساعد الذكي"
      >
        <div className="bot-circle">
          <svg viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="#ffffff"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="12" cy="12" r="4" fill="#ffffff" />
          </svg>
        </div>
        <div className="chat-bubble">
          <svg viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </div>
      </div>
    </>
  );
}
