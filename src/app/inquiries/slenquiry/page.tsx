/**
 * صفحة الاستعلام عن الإجازة المرضية — مطابقة 100% لتصميم البوت الأصلي
 * ====================================================================
 * مسار: /inquiries/slenquiry
 *
 * المصدر المرجعي: alehtiat-almorish/website/public/inquiry.html
 *
 * هذا الصفحة مطابقة تماماً لتصميم لوحة الاستعلام في البوت الأصلي:
 *   - نفس الخطوط: Cairo (400, 600, 700, 900) من Google Fonts
 *   - نفس الألوان: #306db5 (الأزرق الرسمي), #798ca1 (الرمادي), #0d6efd (الأزرق للأزرار)
 *   - نفس الأحجام: عنوان 40px, نص فرعي 16px, حقول إدخال Bootstrap (0.375rem 0.75rem)
 *   - نفس الدائرة الزرقاء: 60x60, 5px solid #e0e0e0, top 5px solid #306db5, 0.8s linear
 *   - نفس الفوتر: خلفية #306db5, شعار صحة أبيض, خط أزرق فاتح تحت كل عنوان h3 (50% width, 4px, #7eb7db)
 *   - نفس النص العربي: "الإجازات المرضية", "رمز الخدمة", "رقم الهوية / الإقامة", "استعلام"
 *
 * يتصل بـ /api/inquire?gsl=...&id=... ويستخرج البيانات من Vercel Blob / Postgres.
 *
 * ملاحظة: تمت إضافة زرين إضافيين (تحميل PDF + فتح في لوحة الإدخال) ضمن قسم النتائج
 * للحفاظ على الوظائف المطلوبة، لكن بأسلوب .btn-primary مطابق للتصميم الأصلي.
 */

"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface LeaveRecord {
  id: number;
  gslCode: string;
  identityNumber: string;
  nameAr: string;
  nameEn: string | null;
  dateFrom: string;
  dateTo: string;
  dayCount: number;
  issueDate: string | null;
  timeFrom: string | null;
  nationalityAr: string | null;
  nationalityEn: string | null;
  employer: string | null;
  employerEn: string | null;
  doctorNameAr: string | null;
  doctorNameEn: string | null;
  doctorSpecialtyAr: string | null;
  doctorSpecialtyEn: string | null;
  hospitalNameAr: string | null;
  hospitalNameEn: string | null;
  licenseNumber: string | null;
  leaveType: string;
  createdAt: string;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return iso;
}

export default function SlenquiryPage() {
  const { toast } = useToast();
  const [serviceCode, setServiceCode] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<LeaveRecord | null>(null);
  const [showResults, setShowResults] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = serviceCode.trim();
    const id = nationalId.trim();

    setError("");
    if (!code || !id) {
      setError("يرجى إدخال رمز الخدمة ورقم الهوية.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("gsl", code);
      params.set("id", id);
      const res = await fetch(`/api/inquire?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.message || "خطأ في الاستعلام");
      }
      const records: LeaveRecord[] = data.records || [];
      const exact = records.find(
        (r) => r.gslCode?.toUpperCase() === code.toUpperCase() && r.identityNumber === id,
      );
      const rec = exact || records[0];
      if (!rec) {
        setError("خطأ في الاستعلام");
        setShowResults(false);
      } else {
        setResult(rec);
        setShowResults(true);
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء الاتصال بالنظام، يرجى المحاولة لاحقًا.");
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setServiceCode("");
    setNationalId("");
    setError("");
    setResult(null);
    setShowResults(false);
  };

  const onDownloadPdf = async () => {
    if (!result) return;
    try {
      toast({ title: "جارٍ توليد ملف PDF...", description: "قد يستغرق بضع ثوانٍ." });
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_number: result.identityNumber,
          patient_name_ar: result.nameAr,
          patient_name_en: result.nameEn || result.nameAr,
          nationality_ar: result.nationalityAr || "",
          nationality_en: result.nationalityEn || "",
          employer_ar: result.employer || "",
          employer_en: result.employerEn || "",
          doctor_name_ar: result.doctorNameAr || "",
          doctor_name_en: result.doctorNameEn || "",
          position_ar: result.doctorSpecialtyAr || "",
          position_en: result.doctorSpecialtyEn || "",
          hospital_name_ar: result.hospitalNameAr || "",
          hospital_name_en: result.hospitalNameEn || "",
          license_number: result.licenseNumber || "",
          admission_date_gregorian: formatDate(result.dateFrom),
          discharge_date_gregorian: formatDate(result.dateTo),
          issue_date_gregorian: result.issueDate ? formatDate(result.issueDate) : formatDate(result.dateFrom),
          time: result.timeFrom || "",
          hospital_logo: "",
        }),
      });
      if (!res.ok) throw new Error(`فشل توليد PDF (HTTP ${res.status})`);
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sick_leave_${result.gslCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast({
        title: "فشل تنزيل PDF",
        description: e?.message || "خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  const onOpenInEntryPage = () => {
    if (!result) return;
    try {
      const stored = {
        id_number: result.identityNumber,
        patient_name_ar: result.nameAr,
        patient_name_en: result.nameEn || "",
        nationality_ar: result.nationalityAr || "",
        nationality_en: result.nationalityEn || "",
        employer_ar: result.employer || "",
        employer_en: result.employerEn || "",
        doctor_name_ar: result.doctorNameAr || "",
        doctor_name_en: result.doctorNameEn || "",
        position_ar: result.doctorSpecialtyAr || "",
        position_en: result.doctorSpecialtyEn || "",
        hospital_name_ar: result.hospitalNameAr || "",
        hospital_name_en: result.hospitalNameEn || "",
        license_number: result.licenseNumber || "",
        admission_date_gregorian: formatDate(result.dateFrom),
        discharge_date_gregorian: formatDate(result.dateTo),
        time: result.timeFrom || "",
      };
      sessionStorage.setItem("slenquiry:prefill", JSON.stringify(stored));
      window.location.href = "/";
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <style>{SEHA_STYLES}</style>

      {/* ===== Spinner Overlay - الدائرة المتحركة (مطابقة للبوت الأصلي) ===== */}
      {loading && (
        <div id="spinner-overlay" className="spinner-overlay active">
          <div className="spinner-circle"></div>
          <div className="spinner-text">جاري التحقق من البيانات...</div>
        </div>
      )}

      {/* ===== Header (مطابق لـ seha.sa) ===== */}
      <div style={{ zIndex: 99, opacity: 1, transform: "none" }}>
        <nav className="header navbar-expand-lg navbar-light px-4">
          <div className="nav-container">
            <a className="" href="/">
              <img
                src="/images/seha-logo-white.svg"
                alt="logo"
                className="logo"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </a>
            <div className="d-lg-none d-xl-none justify-content-end menu">
              <button
                aria-controls="responsive-navbar-nav"
                type="button"
                aria-label="Toggle navigation"
                className="d-inline-flex menu-img navbar-toggler collapsed"
              >
                <span className="navbar-toggler-icon"></span>
              </button>
            </div>
            <div
              className="white justify-content-around navbar-collapse collapse"
              id="responsive-navbar-nav"
            >
              <div className="navbar justify-content-around navbar-nav">
                <a data-rr-ui-event-key="1" className="link nav-link" href="/">
                  الرئيسية
                </a>
                <a data-rr-ui-event-key="2" className="link nav-link" href="/#services">
                  الخدمات
                </a>
                <a
                  data-rr-ui-event-key="3"
                  className="link nav-link active"
                  href="/inquiries/slenquiry"
                >
                  الاستعلامات
                </a>
                <a data-rr-ui-event-key="4" className="link nav-link" href="/#faq">
                  الأسئلة الشائعة
                </a>
              </div>
              <div className="navbar justify-content-end navbar-nav">
                <a data-rr-ui-event-key="6" className="nav-link" href="/#signup">
                  <p>إنشاء حساب</p>
                </a>
                <a
                  data-rr-ui-event-key="7"
                  className="login nav-link"
                  href="/#login"
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <p style={{ margin: 0 }}>تسجيل الدخول</p>
                </a>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* ===== Main Content ===== */}
      <div className="inner-page inquiries-container">
        <h1 className="heading">الإجازات المرضية</h1>
        <p className="sub-heading">
          خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك
          للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي
        </p>
        <div className="row justify-content-center mt-1">
          <div className="col-md-5 p-4">
            <p
              id="error-message"
              className="alert alert-danger"
              style={{ display: error ? "block" : "none" }}
              role="alert"
            >
              {error}
            </p>

            <form id="inquiryForm" onSubmit={onSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  name="service_code"
                  id="service_code"
                  maxLength={20}
                  placeholder="رمز الخدمة"
                  className="form-control"
                  value={serviceCode}
                  onChange={(e) => {
                    setServiceCode(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={showResults}
                />
              </div>
              <div className="form-group">
                <label></label>
                <input
                  type="text"
                  name="national_id"
                  id="national_id"
                  maxLength={10}
                  pattern="\d*"
                  placeholder="رقم الهوية / الإقامة"
                  className="form-control"
                  value={nationalId}
                  onChange={(e) => {
                    setNationalId(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={showResults}
                />
              </div>

              {/* Results Section (Hidden by default) */}
              {showResults && result && (
                <div
                  id="results-section"
                  className="results-inquiery row"
                  style={{ display: "flex" }}
                >
                  <div className="col-md-6">
                    <span>الاسم: </span> <span id="res-name">{result.nameAr}</span>
                  </div>
                  <div className="col-md-6">
                    <span>تاريخ إصدار تقرير الإجازة:</span>{" "}
                    <span id="res-issue-date">{formatDate(result.issueDate)}</span>
                  </div>
                  <div className="col-md-6">
                    <span>تبدأ من:</span>{" "}
                    <span id="res-date-from">{formatDate(result.dateFrom)}</span>
                  </div>
                  <div className="col-md-6">
                    <span>وحتى:</span>{" "}
                    <span id="res-date-to">{formatDate(result.dateTo)}</span>
                  </div>
                  <div className="col-md-6">
                    <span>المدة بالأيام:</span>{" "}
                    <span id="res-day-count">{result.dayCount}</span>
                  </div>
                  <div className="col-md-6">
                    <span>اسم الطبيب:</span>{" "}
                    <span id="res-doctor-name">{result.doctorNameAr || "-"}</span>
                  </div>
                  <div className="col-md-6">
                    <span>المسمى الوظيفي:</span>{" "}
                    <span id="res-doctor-specialty">
                      {result.doctorSpecialtyAr || "-"}
                    </span>
                  </div>

                  <div className="col-md-12 text-center mt-3 results-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={resetForm}
                    >
                      استعلام جديد
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={onDownloadPdf}
                    >
                      تحميل PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={onOpenInEntryPage}
                    >
                      فتح في لوحة الإدخال
                    </button>
                  </div>
                </div>
              )}

              {!showResults && (
                <button
                  type="submit"
                  id="submit-btn"
                  className="btn btn-primary mt-3"
                  disabled={loading}
                >
                  استعلام
                </button>
              )}
            </form>
          </div>
          <div className="col-md-12 text-center">
            <a className="btn btn-primary mb-3" href="/">
              رجوع للاستعلامات
            </a>
          </div>
        </div>
      </div>

      {/* ===== Footer (مطابق لـ seha.sa) ===== */}
      <div className="footer-container container-fluid">
        <div className="footer">
          <div className="about section">
            <img
              src="/images/seha-logo-white.svg"
              alt="Logo"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <p className="about">
              منصة صحة تخدم جميع المنشأت الطبية من خلال تقديم الخدمات الصحية إلكترونياً لجميع المنشأت
              الطبية وتسعى إلى توحيد وأتمتة الاجراءات والخدمات بما في دوره رفع جودة الاداء وخفض التكاليف.
            </p>
          </div>
          <div className="links section" style={{ alignItems: "center" }}>
            <h3 className="heading">القائمة الرئيسية</h3>
            <ul className="links-wrapepr">
              <li className="inquiry-li">
                <a className="nav-link" href="/#services">الخدمات</a>
              </li>
              <li className="inquiry-li">
                <a className="nav-link" href="/inquiries/slenquiry">الاستعلامات</a>
              </li>
              <li className="inquiry-li">
                <a className="nav-link" href="/#faq">الأسئلة الشائعة</a>
              </li>
              <li className="inquiry-li" style={{ borderBottom: "none" }}>
                <a className="nav-link" href="/#contactus">تواصل معنا</a>
              </li>
            </ul>
          </div>
          <div className="contact section">
            <h3 className="heading">تواصل معنا</h3>
            <div className="contact-wrapper">
              <div className="values">
                <div className="details">
                  <a href="tel:920002005">920002005</a>
                </div>
                <div className="details">
                  <a href="mailto:support@seha.sa">support@seha.sa</a>
                </div>
                <div className="timings mt-3">
                  <span style={{ fontSize: "12px", color: "rgb(240, 243, 248)" }}>
                    أوقات العمل: الأحد حتى الخميس 8 ص - 11م
                  </span>
                </div>
              </div>
              <div className="contact">
                <img alt="lean logo" src="/images/lean-logo.png" />
                <div className="spacer"></div>
                <img alt="moh logo" src="/images/moh-logo.png" />
              </div>
            </div>
          </div>
          <div className="footer-note-wrapper">
            <p>منصة صحة معتمدة من قبل وزارة الصحة © 2026 </p>
            <ul>
              <li>
                <a>سياسة الخصوصية وشروط الإستخدام</a>
              </li>
              <li>
                <a href="#">دليل الاستخدام</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================================================
 *  أنماط CSS مطابقة 100% لتصميم البوت الأصلي من alehtiat-almorish
 *  Source: alehtiat-almorish/website/public/inquiry.html + assets/css/*.css
 *
 *  كل القيم مأخوذة حرفياً من ملفات CSS المرجعية:
 *    - mo.css: navbar/header, footer-container, inquiry-li, results-inquiery, btn-primary
 *    - ali.css: form-control base style
 *    - inquiry.html <style> tag: spinner-overlay, spinner-circle, spinner-text
 * ============================================================ */
const SEHA_STYLES = `
/* ===== Page Reset (مطابق لـ inquiry.html) ===== */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden;
  direction: rtl;
}
html {
  direction: ltr !important; /* Scrollbar on right */
}
body {
  direction: rtl;
  background-color: #fff;
}

/* ===== Spinning circle animation - الدائرة المتحركة (مطابقة للبوت) ===== */
.spinner-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.85);
  z-index: 9999;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
.spinner-overlay.active {
  display: flex;
}
.spinner-circle {
  width: 60px;
  height: 60px;
  border: 5px solid #e0e0e0;
  border-top: 5px solid #306db5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 15px;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.spinner-text {
  font-family: 'Cairo', sans-serif;
  font-size: 16px;
  color: #306db5;
  font-weight: 600;
}

/* ===== Header / Navbar (مطابق لـ mo.css) ===== */
.header, .navbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  z-index: 999;
  width: 100%;
  position: sticky;
  background-color: rgb(248, 249, 251);
  padding: 0% 2% !important;
}
.header {
  background-color: rgb(48, 109, 181) !important;
}
.nav-container {
  display: flex;
  flex-direction: row;
  flex-wrap: inherit;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-top: 10px;
  padding-bottom: 10px;
  max-width: 1400px;
}
.header .logo {
  height: 50px;
  width: auto;
}
.menu {
  flex: 1 1 0%;
  display: flex;
  align-items: center;
  margin: 0;
  margin-inline-end: 16px;
}
.menu .navbar-toggler {
  padding: 0;
  width: 40px;
  height: 40px;
  box-shadow: none;
  align-items: center;
  background: transparent;
  border: none;
}
.menu .navbar-toggler-icon {
  display: inline-block;
  width: 1.5em;
  height: 1.5em;
  vertical-align: middle;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28255,255,255,0.9%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
}
.white.navbar-collapse.collapse {
  display: none !important;
}
@media (min-width: 992px) {
  .header, .navbar { padding-inline: 2%; }
  .white.navbar-collapse.collapse {
    display: flex !important;
    flex-basis: auto;
    flex-grow: 1;
    align-items: center;
  }
}
@media (min-width: 1200px) {
  .header, .navbar { padding-inline: 4%; }
}
.navbar-nav {
  display: flex;
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 8px;
}
.navbar-nav .nav-link {
  font-weight: 400;
  text-align: center;
  color: #fff;
  padding: 8px 12px;
  font-size: 0.9rem;
  text-decoration: none;
  cursor: pointer;
}
@media (min-width: 1200px) {
  .navbar-nav .nav-link { font-size: 1rem; }
}
.navbar-nav .nav-link:hover,
.navbar-nav .nav-link.active {
  color: #c6e4ff;
}
.navbar-nav:last-child {
  margin-inline-start: auto;
}
.navbar-nav:last-child .nav-link p {
  margin: 0;
  font-size: 0.9rem;
}
.navbar-nav:last-child .login {
  background-color: #fff;
  color: rgb(48, 109, 181);
  padding: 6px 16px;
  border-radius: 6px;
}
.navbar-nav:last-child .login p {
  color: rgb(48, 109, 181);
  font-weight: 600;
}

/* ===== Main / Inquiries Container (مطابق لـ mo.css) ===== */
.inner-page {
  margin-top: 50px;
  padding-top: 7%;
}
.inner-page p {
  margin-top: 20px;
  margin-bottom: 20px;
  text-align: center;
}
div.inquiries-container {
  display: flex;
  min-height: 65vh;
  flex-direction: column;
  text-align: center;
  margin-top: -4%;
}
div.inquiries-container .btn {
  padding-top: 6px;
}
div.inquiries-container h1.heading {
  color: rgb(48, 109, 181);
  font-size: 40px;
  margin-top: 20px;
  font-weight: 700;
  position: relative;
  display: inline-block;
  background-position: center center;
  background-repeat: no-repeat;
  font-family: 'Cairo', sans-serif;
  background-image: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='204'%20height='21'%20viewBox='0%200%20204%2021'%3e%3crect%20id='Rectangle_9405'%20data-name='Rectangle%209405'%20width='204'%20height='21'%20fill='%237eb7db'%20opacity='0.25'/%3e%3c/svg%3e");
  padding: 0 24px;
  margin-bottom: 0;
}
div.inquiries-container p.sub-heading {
  color: rgb(121, 140, 161);
  font-family: 'Cairo', sans-serif;
  font-size: 16px;
  max-width: 700px;
  margin: 20px auto;
  line-height: 1.7;
}

/* ===== Row / Col (Bootstrap-like from style.css) ===== */
.row {
  --bs-gutter-x: 1.5rem;
  --bs-gutter-y: 0;
  display: flex;
  flex-wrap: wrap;
  margin-top: calc(-1 * var(--bs-gutter-y));
  margin-right: calc(-.5 * var(--bs-gutter-x));
  margin-left: calc(-.5 * var(--bs-gutter-x));
}
.row > * {
  box-sizing: border-box;
  flex-shrink: 0;
  width: 100%;
  max-width: 100%;
  padding-right: calc(var(--bs-gutter-x) * .5);
  padding-left: calc(var(--bs-gutter-x) * .5);
  margin-top: var(--bs-gutter-y);
}
.justify-content-center { justify-content: center !important; }
.text-center { text-align: center !important; }
.mt-1 { margin-top: 0.5rem !important; }
.mt-3 { margin-top: 1rem !important; }
.mb-3 { margin-bottom: 1rem !important; }
.p-4 { padding: 1.5rem !important; }
.col-md-5 { flex: 0 0 auto; width: 41.66667%; }
.col-md-6 { flex: 0 0 auto; width: 50%; }
.col-md-12 { flex: 0 0 auto; width: 100%; }
@media (max-width: 767px) {
  .col-md-5, .col-md-6, .col-md-12 { width: 100%; flex: 0 0 100%; }
}

/* ===== Form Group & Form Control (Bootstrap defaults from ali.css) ===== */
.form-group {
  margin-bottom: 1rem;
}
.form-control {
  display: block;
  width: 100%;
  padding: 0.375rem 0.75rem;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--bs-body-color, #212529);
  appearance: none;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid #ced4da;
  border-radius: 0.375rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  font-family: 'Cairo', sans-serif;
  text-align: right;
}
.form-control:focus {
  color: rgb(0, 0, 0);
  background-color: rgb(255, 255, 255);
  outline: 0;
  border-color: #86b7fe;
  box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
}
.form-control:disabled {
  background-color: #f8f9fa;
  opacity: 0.7;
}

/* ===== Alert (Bootstrap default) ===== */
.alert {
  --bs-alert-bg: transparent;
  --bs-alert-padding-x: 1rem;
  --bs-alert-padding-y: 1rem;
  --bs-alert-margin-bottom: 1rem;
  --bs-alert-color: inherit;
  --bs-alert-border-color: transparent;
  --bs-alert-border: 1px solid var(--bs-alert-border-color);
  --bs-alert-border-radius: 0.375rem;
  position: relative;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid transparent;
  border-radius: 0.375rem;
}
.alert-danger {
  color: #842029;
  background-color: #f8d7da;
  border-color: #f5c2c7;
}

/* ===== Buttons (Bootstrap .btn .btn-primary from mo.css) ===== */
.btn {
  display: inline-block;
  font-weight: 400;
  line-height: 1.5;
  color: #212529;
  text-align: center;
  text-decoration: none;
  vertical-align: middle;
  cursor: pointer;
  user-select: none;
  background-color: transparent;
  border: 1px solid transparent;
  padding: 0.375rem 0.75rem;
  font-size: 1rem;
  border-radius: 0.375rem;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out,
              border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  font-family: 'Cairo', sans-serif;
}
.btn-primary {
  --bs-btn-color: #fff;
  --bs-btn-bg: #0d6efd;
  --bs-btn-border-color: #0d6efd;
  --bs-btn-hover-color: #fff;
  --bs-btn-hover-bg: #0b5ed7;
  --bs-btn-hover-border-color: #0a58ca;
  --bs-btn-focus-shadow-rgb: 49, 132, 253;
  --bs-btn-active-color: #fff;
  --bs-btn-active-bg: #0a58ca;
  --bs-btn-active-border-color: #0a53be;
  --bs-btn-active-shadow: inset 0 3px 5px rgba(0, 0, 0, .125);
  --bs-btn-disabled-color: #fff;
  --bs-btn-disabled-bg: #0d6efd;
  --bs-btn-disabled-border-color: #0d6efd;
  color: #fff;
  background-color: #0d6efd;
  border-color: #0d6efd;
}
.btn-primary:hover, .btn-primary:focus {
  color: #fff;
  background-color: #0b5ed7;
  border-color: #0a58ca;
}
.btn-primary:disabled {
  color: #fff;
  background-color: #0d6efd;
  border-color: #0d6efd;
  opacity: 0.65;
  cursor: not-allowed;
}
.results-actions {
  display: flex !important;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  width: 100% !important;
}

/* ===== Results Section (مطابق لـ mo.css) ===== */
.results-inquiery {
  background: rgb(247, 247, 247) !important;
  padding: 10px !important;
  margin: 25px 1px 1px !important;
  border: 1px solid gainsboro !important;
  border-radius: 6px;
}
.results-inquiery > div {
  padding: 10px !important;
  text-align: right;
}
.results-inquiery span {
  display: block;
  font-weight: 700;
  padding: 8px 0px;
  color: rgb(48, 109, 181);
}
.results-inquiery span + span {
  color: #212529;
  font-weight: 400;
}

/* ===== Footer Container (مطابق لـ mo.css) ===== */
div.footer-container {
  color: rgb(240, 243, 248);
  padding-top: 44px;
  padding-bottom: 20px;
  background-color: rgb(48, 109, 181);
  width: 100%;
  margin-top: auto;
}
@media (min-width: 992px) {
  div.footer-container { padding-bottom: 10px; }
}
div.footer-container .footer {
  display: flex;
  flex-direction: column;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}
@media (min-width: 992px) {
  div.footer-container .footer {
    padding-right: 100px;
    padding-left: 100px;
    flex-direction: row;
    gap: 0;
  }
}
@media (max-width: 767px) {
  div.footer-container { text-align: center; }
}
div.footer-container .about.section p.about {
  width: 100%;
  line-height: 30px;
  font-size: 16px;
  margin-top: 40px;
  text-align: center;
  font-family: 'Cairo', sans-serif;
  padding-left: 1%;
  padding-right: 1%;
  color: rgb(240, 243, 248);
}
@media (min-width: 992px) {
  div.footer-container .about.section p.about {
    background-position: 95% 50%;
    background-repeat: no-repeat;
    background-size: contain;
    flex: 1 1 0%;
    font-size: 0.9rem;
    line-height: 2rem;
    text-align: justify;
    margin-bottom: 0px;
  }
  div.footer-container .about.section img {
    width: 150px;
    height: auto;
  }
}
div.footer-container .about.section img {
  height: 50px;
  width: auto;
}

/* Links section */
div.footer-container .links-wrapepr {
  text-align: -webkit-center;
  list-style: none;
  padding: 0;
  width: 100%;
}
@media (min-width: 992px) {
  div.footer-container .links-wrapepr {
    width: unset;
    padding-right: 10px;
  }
}
div.footer-container .inquiry-li {
  width: 300px;
  margin: 2px;
  padding: 11px 0px;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-bottom: 1px solid rgb(98, 151, 214);
  color: rgb(212, 238, 255);
  text-align: center;
}
div.footer-container .inquiry-li .nav-link {
  padding-right: 4px;
  color: rgb(240, 243, 248);
  text-decoration: none;
  font-family: 'Cairo', sans-serif;
  font-size: 16px;
  font-weight: 200;
  cursor: pointer;
}
@media (min-width: 992px) {
  div.footer-container .inquiry-li {
    text-align: right;
  }
  div.footer-container .inquiry-li .nav-link {
    font-size: 1rem;
  }
}
div.footer-container .inquiry-li:hover {
  color: rgba(255, 255, 255, 0.5) !important;
}
div.footer-container .inquiry-li:hover .nav-link {
  color: rgba(255, 255, 255, 0.7);
}

/* Section layout */
div.footer-container .section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 10%;
  margin-bottom: 1%;
}
@media (min-width: 992px) {
  div.footer-container .section {
    margin-top: 0px;
    flex: 1 1 0%;
    justify-content: flex-start;
    align-items: flex-start;
    padding-left: 20px;
  }
}

/* Footer headings (h3) — مع الخط الأزرق الفاتح أسفل كل عنوان */
div.footer-container h3.heading {
  width: 300px;
  font-size: 16px;
  margin-top: 30px;
  font-weight: 700;
  position: relative;
  margin-bottom: 40px;
  font-family: 'Cairo', sans-serif;
  color: rgb(255, 255, 255);
}
@media (min-width: 992px) {
  div.footer-container h3.heading {
    font-size: 1rem;
    margin-bottom: 20px;
  }
}
div.footer-container h3.heading::before {
  right: 25%;
  bottom: -15px;
  content: "";
  width: 50%;
  height: 4px;
  position: absolute;
  background-color: rgb(126, 183, 219);
}
@media (min-width: 992px) {
  div.footer-container h3.heading::before {
    right: 0%;
  }
}
@media (max-width: 768px) {
  div.footer-container h3.heading::before {
    right: 25%;
  }
}

/* Footer contact section */
div.footer-container .details a {
  color: rgb(240, 243, 248) !important;
  text-decoration: none;
  font-family: 'Cairo', sans-serif;
}
div.footer-container .details a:hover {
  color: rgba(255, 255, 255, 0.5) !important;
}
div.footer-container .contact-wrapper {
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
@media (min-width: 992px) {
  div.footer-container .contact-wrapper {
    flex-direction: column;
  }
}
div.footer-container .contact img {
  height: 40px;
  margin-inline-end: 12px;
  vertical-align: middle;
}
div.footer-container .contact .spacer {
  display: inline-block;
  width: 8px;
}

/* Footer note */
div.footer-container .footer-note-wrapper {
  margin-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 20px;
  text-align: center;
  width: 100%;
}
@media (min-width: 992px) {
  div.footer-container .footer-note-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
}
div.footer-container .footer-note-wrapper p {
  font-weight: lighter;
  font-size: 12px;
  color: rgb(240, 243, 248);
  margin: 0px;
  font-family: 'Cairo', sans-serif;
}
@media (min-width: 992px) {
  div.footer-container .footer-note-wrapper p {
    font-size: 0.6rem;
    text-align: right;
    margin-bottom: 10px;
  }
}
div.footer-container .footer-note-wrapper ul {
  flex: 1 1 0%;
  display: flex;
  flex-direction: row;
  padding: 0px;
  align-items: center;
  justify-content: center;
  list-style: none;
  flex-wrap: wrap;
  gap: 16px;
  margin: 8px 0 0 0;
}
@media (min-width: 992px) {
  div.footer-container .footer-note-wrapper ul {
    list-style-type: "";
    gap: 0;
  }
}
div.footer-container .footer-note-wrapper ul li {
  height: fit-content;
  margin: 20px 0px 0px;
  line-height: 1;
  font-size: 10px;
  padding: 0px 0px 0px 10px;
  font-weight: 200;
  border-left: 1px solid white;
}
div.footer-container .footer-note-wrapper ul li a {
  color: rgb(240, 243, 248);
  text-decoration: none;
  cursor: pointer;
}
@media (min-width: 992px) {
  div.footer-container .footer-note-wrapper ul li {
    font-size: 0.6rem;
    margin-top: 0px;
  }
}
div.footer-container .footer-note-wrapper ul li:last-child {
  border-left: 0px solid white;
  padding-right: 1rem;
}

/* ===== Mobile responsive tweaks ===== */
@media (max-width: 768px) {
  div.inquiries-container h1.heading { font-size: 28px; }
  div.inquiries-container p.sub-heading { font-size: 14px; }
  .header .logo { height: 36px; }
  div.footer-container .footer { gap: 24px; }
}
`;
