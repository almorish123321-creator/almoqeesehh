"use client";

/**
 * صفحة /seha-enquiry — نسخة React مطابقة بصرياً 100% للأصل
 * ============================================================================
 *
 * المصدر: مستودع aboooo555567-coder/floseseh — seha-enquiry.html (454 سطر)
 *
 * القاعدة الذهبية: لا تغيير بصري. كل الـ CSS (متغيرات الألوان #23559d،
 * خط Tajawal، الترويسة البيضاء مع ☰، مسار التنقل، العنوان مع الشرطة
 * السفلية المظللة، حقول الإدخال، صندوق النتيجة الأخضر، التذييل الأزرق
 * #295796، ودردشة المساعد العائمة) — منسوخ حرفياً من seha-enquiry.html.
 *
 * الاختلافات التقنية المسموح بها فقط:
 *  - DOM getElementById → React state
 *  - الاستعلام يجلب البيانات الحقيقية من /api/inquiry بدلاً من العرض
 *    التجريبي في الأصل (نفس مكان وعناصر صندوق النتيجة بالضبط)
 *  - src الشعار: الملف المحلي /assets/images/Seha.png (نفس صورة
 *    الشعارات/Seha.png في الأصل) مع نفس onerror البديل
 *
 * الوظائف المطابقة للأصل:
 *  - تعبئة تلقائية من رابط QR (?id=&nid=)
 *  - زر "جاري البحث..." مع الشفافية أثناء التحميل (نفس التأثير)
 *  - زر "بحث جديد" يخفي النتيجة ويعيد النموذج
 *  - زر "رجوع للاستعلامات" ينقل إلى /
 */

import { useState, useRef, useEffect } from "react";

interface InquiryData {
  name: string;
  issue_date: string;
  date_from: string;
  date_to: string;
  day_count: number | string;
  doctor_name: string;
  doctor_specialty: string;
}

interface InquiryReport {
  name?: string;
  issueDate?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  doctorName?: string;
  jobTitle?: string;
  hospital?: string;
}

interface ResultFields {
  name: string;
  nid: string;
  dur: string;
  date: string;
  hosp: string;
  doc: string;
}

export default function SehaEnquiryPage() {
  const [serviceCode, setServiceCode] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<ResultFields | null>(null);
  // إظهار/إخفاء النموذج وصندوق النتيجة — مطابق لعرض formContainer/resultBox
  const [showForm, setShowForm] = useState(true);
  const [showResult, setShowResult] = useState(false);

  const resultBoxRef = useRef<HTMLDivElement>(null);

  // Auto-fill from URL params if present (from QR code) — مطابق للأصل
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    const nid = urlParams.get("nid");
    if (id) setServiceCode(id);
    if (nid) setNationalId(nid);
  }, []);

  /**
   * منطق الاستعلام — نفس تدفق الأصل (زر "جاري البحث..." بشفافية 0.7 ثم
   * إظهار صندوق النتيجة)، مع جلب بيانات حقيقية من /api/inquiry.
   */
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const code = serviceCode.trim();
    const nid = nationalId.trim();
    setErrorMsg("");

    if (!code || !nid) {
      setErrorMsg("يرجى إدخال رمز الخدمة ورقم الهوية.");
      return;
    }

    // Show loading animation — نفس تأثير الأصل
    setLoading(true);

    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId: code, nationalId: nid }),
      });
      const res = await response.json();

      if (res.success && (res.data || res.report)) {
        const data: InquiryData | null = res.data || null;
        const rep: InquiryReport | null = res.report || null;

        // نفس حقول صندوق النتيجة في الأصل (resName/resNid/resDur/...)
        setResult({
          name:
            (rep?.name || data?.name || "-") as string,
          nid: nid,
          dur: `${rep?.duration || data?.day_count || "1"} يوم / أيام`,
          date: rep?.issueDate || data?.issue_date || "-",
          hosp: rep?.hospital || "-",
          doc: rep?.doctorName || data?.doctor_name || "-",
        });
        // المسمى الوظيفي يُضاف بين قوسين بعد اسم الطبيب — مطابق للأصل
        const pos = rep?.jobTitle || data?.doctor_specialty || "";
        if (pos) {
          setResult((prev) =>
            prev ? { ...prev, doc: `${prev.doc} (${pos})` } : prev,
          );
        }

        setShowForm(false);
        setShowResult(true);
        setTimeout(() => {
          resultBoxRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 50);
      } else {
        setErrorMsg(res.error || res.message || "التقرير غير موجود أو البيانات غير متطابقة.");
      }
    } catch (err) {
      setErrorMsg("حدث خطأ أثناء الاتصال بالنظام، يرجى المحاولة لاحقًا.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * بحث جديد — مطابق لـ onclick الزر في الأصل:
   * إخفاء resultBox وإظهار formContainer
   */
  const handleNewSearch = () => {
    setShowResult(false);
    setShowForm(true);
    setErrorMsg("");
    setResult(null);
  };

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap");

        :root {
          --primary-blue: #23559d;
          --light-blue: #ebf2f8;
          --text-dark: #333;
          --text-gray: #777;
          --border-color: #ced4da;
          --footer-bg: #295796;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: "Tajawal", sans-serif;
        }

        body {
          background-color: white;
          color: var(--text-dark);
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* Header */
        header {
          background-color: white;
          padding: 15px 5%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          position: relative;
          z-index: 10;
        }

        .header-right {
          display: flex;
          align-items: center;
        }

        .header-right img {
          height: 45px;
        }

        .header-left .menu-icon {
          font-size: 28px;
          color: var(--primary-blue);
          cursor: pointer;
        }

        /* Breadcrumbs */
        .breadcrumbs {
          padding: 20px 5%;
          font-size: 13px;
          color: var(--primary-blue);
          font-weight: 700;
        }

        .breadcrumbs span {
          color: var(--text-gray);
          margin: 0 5px;
          font-weight: 400;
        }

        /* Main Content */
        main {
          flex: 1;
          padding: 20px 5%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        h1 {
          color: var(--primary-blue);
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 20px;
          position: relative;
          display: inline-block;
        }

        h1::after {
          content: "";
          position: absolute;
          bottom: -5px;
          left: 10%;
          right: 10%;
          height: 8px;
          background-color: #d8e5f2;
          z-index: -1;
        }

        .description {
          color: var(--text-gray);
          font-size: 15px;
          line-height: 1.8;
          margin-bottom: 40px;
          max-width: 600px;
        }

        .form-container {
          width: 100%;
          max-width: 450px;
          background: white;
          padding: 0;
        }

        .input-group {
          margin-bottom: 20px;
        }

        input[type="text"] {
          width: 100%;
          padding: 12px 15px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 15px;
          outline: none;
          transition: border-color 0.3s;
          text-align: right;
        }

        input[type="text"]:focus {
          border-color: var(--primary-blue);
        }

        .btn {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          margin-bottom: 15px;
          transition: background-color 0.3s;
        }

        .btn-primary {
          background-color: var(--primary-blue);
          color: white;
        }

        .btn-primary:hover {
          background-color: #1a437d;
        }

        /* Error message (نفس لغة التصميم) */
        .error-box {
          width: 100%;
          background-color: #fdf2f2;
          border: 1px solid #f5c2c2;
          color: #b02a37;
          padding: 12px 15px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 20px;
          text-align: right;
        }

        /* Result Box */
        #resultBox {
          display: none;
          width: 100%;
          max-width: 500px;
          background-color: #f1f8f1;
          border: 1px solid #c3e6cb;
          color: #155724;
          padding: 20px;
          border-radius: 6px;
          margin-top: 20px;
          text-align: right;
        }

        #resultBox h3 {
          margin-bottom: 15px;
          color: #155724;
        }

        .result-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          border-bottom: 1px solid #dee2e6;
          padding-bottom: 5px;
        }

        .result-row:last-child {
          border-bottom: none;
        }

        .result-label {
          font-weight: bold;
        }

        /* Footer */
        footer {
          background-color: var(--footer-bg);
          color: white;
          padding: 40px 5%;
          text-align: center;
          margin-top: 40px;
        }

        .footer-logo {
          height: 60px;
          margin-bottom: 20px;
          filter: brightness(0) invert(1);
          /* إعادة التوسيط: style.css العام يجعل img display:block فيفقد
             text-align:center أثره — margin auto يعيد ما يطابق الأصل */
          margin-left: auto;
          margin-right: auto;
          display: block;
        }

        /* ودردشة ElevenLabs ليست جزءاً من seha-enquiry.html الأصلي */
        elevenlabs-convai {
          display: none !important;
        }

        .footer-desc {
          font-size: 14px;
          line-height: 1.8;
          margin-bottom: 30px;
          color: #d1e1f5;
        }

        .footer-section {
          margin-bottom: 30px;
        }

        .footer-section h3 {
          font-size: 18px;
          margin-bottom: 20px;
          position: relative;
          display: inline-block;
        }

        .footer-section h3::after {
          content: "";
          position: absolute;
          bottom: -8px;
          left: 20%;
          right: 20%;
          height: 2px;
          background-color: #7ba4db;
        }

        .footer-links {
          list-style: none;
          margin-bottom: 30px;
          padding: 0;
        }

        .footer-links li {
          margin-bottom: 15px;
        }

        .footer-links a {
          color: white;
          text-decoration: none;
          font-size: 15px;
        }

        .contact-info {
          text-align: center;
          font-size: 14px;
          color: white;
          margin-bottom: 20px;
          line-height: 2;
        }

        .footer-bottom {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 20px;
          font-size: 13px;
          color: #d1e1f5;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        /* Floating widget */
        .floating-widget {
          position: fixed;
          bottom: 20px;
          left: 20px;
          width: 65px;
          height: 65px;
          background-color: white;
          border-radius: 50%;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          z-index: 100;
        }
      `}</style>

      {/* Header */}
      <header>
        <div className="header-right">
          {/* Using local Seha logo or a web fallback */}
          <img
            src="/assets/images/Seha.png"
            alt="صحة Seha"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src.indexOf("/assets/images/Seha.png") !== -1) {
                img.src = "https://www.seha.sa/assets/images/logo.png";
              }
            }}
          />
        </div>
        <div className="header-left">
          <div className="menu-icon">☰</div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        الرئيسية <span>/</span> الاستعلامات <span>/</span> الإجازات المرضية
      </div>

      {/* Main Content */}
      <main>
        <h1>الإجازات المرضية</h1>
        <p className="description">
          خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك
          للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي
        </p>

        <div className="form-container" style={{ display: showForm ? "block" : "none" }}>
          <form onSubmit={onSubmit}>
            <div className="input-group">
              <input
                type="text"
                id="serviceCode"
                placeholder="رمز الخدمة"
                required
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <input
                type="text"
                id="nationalId"
                placeholder="رقم الهوية / الإقامة"
                required
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                disabled={loading}
              />
            </div>

            {errorMsg && <div className="error-box">{errorMsg}</div>}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "جاري البحث..." : "استعلام"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              رجوع للاستعلامات
            </button>
          </form>
        </div>

        <div
          id="resultBox"
          ref={resultBoxRef}
          style={{ display: showResult ? "block" : "none" }}
        >
          <h3>تفاصيل الإجازة المرضية</h3>
          <div className="result-row">
            <span className="result-label">حالة الإجازة:</span>
            <span style={{ fontWeight: "bold", color: "green" }}>معتمدة</span>
          </div>
          <div className="result-row">
            <span className="result-label">اسم المريض:</span>
            <span>{result ? result.name : ""}</span>
          </div>
          <div className="result-row">
            <span className="result-label">رقم الهوية:</span>
            <span>{result ? result.nid : ""}</span>
          </div>
          <div className="result-row">
            <span className="result-label">المدة:</span>
            <span>{result ? result.dur : ""}</span>
          </div>
          <div className="result-row">
            <span className="result-label">تاريخ الإصدار:</span>
            <span>{result ? result.date : ""}</span>
          </div>
          <div className="result-row">
            <span className="result-label">المنشأة الصحية:</span>
            <span>{result ? result.hosp : ""}</span>
          </div>
          <div className="result-row">
            <span className="result-label">الطبيب المعالج:</span>
            <span>{result ? result.doc : ""}</span>
          </div>

          <button
            className="btn btn-primary"
            style={{ marginTop: "20px" }}
            onClick={handleNewSearch}
          >
            بحث جديد
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer>
        <img
          src="/assets/images/Seha.png"
          className="footer-logo"
          alt="Seha Logo"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.indexOf("/assets/images/Seha.png") !== -1) {
              img.src = "https://www.seha.sa/assets/images/logo-white.png";
            }
          }}
        />
        <p className="footer-desc">
          منصة صحة تخدم جميع المنشآت الطبية من خلال تقديم الخدمات الصحية
          إلكترونياً لجميع المنشآت الطبية وتسعى إلى توحيد وأتمتة الإجراءات
          والخدمات بما في ذلك رفع جودة الأداء وخفض التكاليف.
        </p>

        <div className="footer-section">
          <h3>القائمة الرئيسية</h3>
          <ul className="footer-links">
            <li>
              <a href="#">الخدمات</a>
            </li>
            <li>
              <a href="#">الاستعلامات</a>
            </li>
            <li>
              <a href="#">الأسئلة الشائعة</a>
            </li>
            <li>
              <a href="#">تواصل معنا</a>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>تواصل معنا</h3>
          <div className="contact-info">
            📞 920002005
            <br />
            ✉️ support@seha.sa
            <br />
            أوقات العمل: الأحد حتى الخميس 8 ص - 11 م
          </div>
        </div>

        <div className="footer-bottom">
          <div>جميع الحقوق محفوظة من قبل وزارة الصحة © 2026</div>
          <div>سياسة الخصوصية وشروط الاستخدام &nbsp;|&nbsp; دليل الاستخدام</div>
        </div>
      </footer>

      {/* Floating Chat Widget */}
      <div className="floating-widget">
        <svg
          viewBox="0 0 24 24"
          width="35"
          height="35"
          fill="var(--primary-blue)"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
      </div>
    </>
  );
}
