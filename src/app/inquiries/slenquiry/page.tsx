/**
 * صفحة الاستعلام عن الإجازة المرضية — مطابقة لتصميم منصة صحة seha.sa
 * ====================================================================
 * مسار: /inquiries/slenquiry
 *
 * هذه صفحة استعلام مستقلة بنفس تصميم منصة صحة الأصلية:
 *   - شعار صحة في الرأس (header) على خلفية بيضاء
 *   - عنوان أزرق "الإجازات المرضية" مع خط تحته
 *   - حقلان: رمز الخدمة + رقم الهوية / الإقامة
 *   - زر "استعلام" أزرق
 *   - عند النجاح: قسم نتائج بخلفية رمادية فاتحة وأزرار "استعلام جديد"
 *   - عند الفشل: رسالة alert-danger حمراء
 *   - فوتر بخلفية زرقاء (#306db5) مع شعار صحة وروابط
 *
 * يتصل بـ /api/inquire?gsl=...&id=... ويستخرج البيانات من Vercel Blob / Postgres.
 * هذا نفس منطق البوت الأصلي من alehtiat-almorish/website/routes/inquiry.js.
 */

"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Download, Search } from "lucide-react";

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
      // ابحث عن تطابق دقيق برمز الخدمة أولاً، ثم أي نتيجة لرقم الهوية
      // Look for exact service-code match first, then any ID match
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
    <div className="seha-page">
      <style>{SEHA_STYLES}</style>

      {/* ===== Spinner Overlay ===== */}
      {loading && (
        <div className="spinner-overlay active">
          <div className="spinner-circle"></div>
          <div className="spinner-text">جاري التحقق من البيانات...</div>
        </div>
      )}

      {/* ===== Header (مطابق لـ seha.sa) ===== */}
      <nav className="header navbar-expand-lg navbar-light px-4">
        <div className="nav-container">
          <a href="/" aria-label="seha logo">
            <img
              src="/images/seha-logo-white.svg"
              alt="seha logo"
              className="logo"
            />
          </a>
          <div className="d-lg-none d-xl-none justify-content-end menu">
            <button
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
              <a className="link nav-link" href="/">الرئيسية</a>
              <a className="link nav-link" href="/#services">الخدمات</a>
              <a className="link nav-link active" href="/inquiries/slenquiry">الاستعلامات</a>
              <a className="link nav-link" href="/#faq">الأسئلة الشائعة</a>
            </div>
            <div className="navbar justify-content-end navbar-nav">
              <a className="nav-link" href="/#signup">
                <p>إنشاء حساب</p>
              </a>
              <a
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

      {/* ===== Main Content ===== */}
      <div className="inner-page inquiries-container">
        <h1 className="heading">الإجازات المرضية</h1>
        <p className="sub-heading">
          خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك
          للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي
        </p>

        <div className="row justify-content-center mt-1">
          <div className="col-md-5 p-4 seha-form-col">
            {error && (
              <p className="alert alert-danger seha-alert" role="alert">
                {error}
              </p>
            )}

            <form onSubmit={onSubmit} className="seha-form">
              <div className="form-group">
                <input
                  type="text"
                  name="service_code"
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

              {showResults && result && (
                <div className="results-inquiery row" style={{ display: "flex" }}>
                  <div className="col-md-6">
                    <span>الاسم:</span> <span>{result.nameAr}</span>
                  </div>
                  <div className="col-md-6">
                    <span>تاريخ إصدار تقرير الإجازة:</span>{" "}
                    <span>{formatDate(result.issueDate)}</span>
                  </div>
                  <div className="col-md-6">
                    <span>تبدأ من:</span> <span>{formatDate(result.dateFrom)}</span>
                  </div>
                  <div className="col-md-6">
                    <span>وحتى:</span> <span>{formatDate(result.dateTo)}</span>
                  </div>
                  <div className="col-md-6">
                    <span>المدة بالأيام:</span> <span>{result.dayCount}</span>
                  </div>
                  <div className="col-md-6">
                    <span>اسم الطبيب:</span> <span>{result.doctorNameAr || "-"}</span>
                  </div>
                  <div className="col-md-6">
                    <span>المسمى الوظيفي:</span>{" "}
                    <span>{result.doctorSpecialtyAr || "-"}</span>
                  </div>
                  <div className="col-md-6">
                    <span>المنشأة الصحية:</span>{" "}
                    <span>{result.hospitalNameAr || "-"}</span>
                  </div>

                  <div className="col-md-12 text-center mt-3 seha-results-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={resetForm}
                    >
                      استعلام جديد
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary seha-btn-secondary"
                      onClick={onDownloadPdf}
                    >
                      <Download className="h-4 w-4 inline" />
                      تحميل PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary seha-btn-secondary"
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
                  className="btn btn-primary mt-3 seha-submit-btn"
                  disabled={loading}
                >
                  {loading ? "جارٍ الاستعلام..." : "استعلام"}
                </button>
              )}
            </form>
          </div>

          <div className="col-md-12 text-center">
            <a className="btn btn-primary mb-3 seha-back-btn" href="/">
              <ArrowRight className="h-4 w-4 inline" />
              رجوع للوحة الإدخال
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
              className="seha-footer-logo"
            />
            <p className="about">
              منصة صحة تخدم جميع المنشأت الطبية من خلال تقديم الخدمات الصحية
              إلكترونياً لجميع المنشأت الطبية وتسعى إلى توحيد وأتمتة الاجراءات
              والخدمات بما في دوره رفع جودة الاداء وخفض التكاليف.
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
                  <span>أوقات العمل: الأحد حتى الخميس 8 ص - 11م</span>
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
            <p>منصة صحة معتمدة من قبل وزارة الصحة © 2026</p>
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
    </div>
  );
}

/* ============================================================
 *  أنماط CSS مطابقة لـ seha.sa — مأخوذة من alehtiat-almorish
 *  Seha.sa-style CSS — derived from alehtiat-almorish reference
 * ============================================================ */
const SEHA_STYLES = `
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-x: hidden;
}

.seha-page {
  background-color: #fff;
  direction: rtl;
  font-family: 'Cairo', system-ui, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ===== Spinner ===== */
.spinner-overlay {
  display: none;
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(255, 255, 255, 0.85);
  z-index: 9999;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
.spinner-overlay.active { display: flex; }
.spinner-circle {
  width: 60px; height: 60px;
  border: 5px solid #e0e0e0;
  border-top: 5px solid #306db5;
  border-radius: 50%;
  animation: seha-spin 0.8s linear infinite;
  margin-bottom: 15px;
}
@keyframes seha-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.spinner-text {
  font-family: 'Cairo', sans-serif;
  font-size: 16px;
  color: #306db5;
  font-weight: 600;
}

/* ===== Header (مطابق لـ seha.sa) ===== */
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
  border-bottom: 1px solid #e5e7eb;
}
.header .nav-container {
  display: flex;
  flex-direction: row;
  flex-wrap: inherit;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-bottom: 2%;
  margin-bottom: 0px;
  max-width: 1400px;
}
@media (min-width: 992px) {
  .header, .navbar { padding-inline: 2%; }
  .header .nav-container { padding-top: 10px; }
}
@media (min-width: 1200px) {
  .header, .navbar { padding-inline: 4%; }
}
.header .logo {
  height: 50px;
  width: auto;
  filter: brightness(0) invert(1);
  /* الشعار أبيض لأن الخلفية زرقاء (انظر background-color أدناه) */
}
/* الخلفية الزرقاء للهيدر — مطابقة لـ seha.sa */
.header {
  background-color: #306db5 !important;
}
.header .nav-container {
  padding-top: 10px;
  padding-bottom: 10px;
}
.header .menu {
  flex: 1 1 0%;
  display: flex;
  align-items: center;
  margin: 0;
  margin-inline-end: 16px;
}
.header .menu .navbar-toggler {
  padding: 0;
  width: 40px;
  height: 40px;
  box-shadow: none;
  align-items: center;
}
.header #responsive-navbar-nav {
  display: none !important;
}
@media (min-width: 992px) {
  .header #responsive-navbar-nav {
    display: flex !important;
    flex-basis: auto;
    flex-grow: 1;
    align-items: center;
  }
}
.header #responsive-navbar-nav .navbar-nav {
  display: flex;
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
}
.header #responsive-navbar-nav .navbar-nav .nav-link {
  font-weight: 400;
  text-align: center;
  color: #fff;
  padding: 8px 12px;
  font-size: 0.9rem;
  text-decoration: none;
}
@media (min-width: 1200px) {
  .header #responsive-navbar-nav .navbar-nav .nav-link {
    font-size: 1rem;
  }
}
.header #responsive-navbar-nav .navbar-nav .nav-link:hover,
.header #responsive-navbar-nav .navbar-nav .nav-link.active {
  color: #c6e4ff;
}
.header #responsive-navbar-nav .navbar-nav:last-child {
  margin-inline-start: auto;
}
.header #responsive-navbar-nav .navbar-nav:last-child .nav-link p {
  margin: 0;
  font-size: 0.9rem;
}
.header #responsive-navbar-nav .navbar-nav:last-child .login {
  background-color: #fff;
  color: #306db5;
  padding: 6px 16px;
  border-radius: 6px;
}

/* ===== Main / Inquiries Container ===== */
.inner-page {
  margin-top: 0;
  padding-top: 4%;
  flex: 1;
}
div.inquiries-container {
  display: flex;
  min-height: 65vh;
  flex-direction: column;
  text-align: center;
  margin-top: 0;
  padding: 40px 16px;
}
div.inquiries-container h1.heading {
  color: rgb(48, 109, 181);
  font-size: 40px;
  margin-top: 20px;
  margin-bottom: 0;
  font-weight: 700;
  position: relative;
  display: inline-block;
  background-position: center center;
  background-repeat: no-repeat;
  font-family: Cairo, sans-serif;
  background-image: url("data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='204'%20height='21'%20viewBox='0%200%20204%2021'%3e%3crect%20id='Rectangle_9405'%20data-name='Rectangle%209405'%20width='204'%20height='21'%20fill='%237eb7db'%20opacity='0.25'/%3e%3c/svg%3e");
  padding: 4px 24px;
}
div.inquiries-container p.sub-heading {
  color: rgb(121, 140, 161);
  font-family: Cairo, sans-serif;
  font-size: 16px;
  max-width: 700px;
  margin: 20px auto;
  line-height: 1.7;
}

/* ===== Form ===== */
.seha-form-col {
  background: #fff;
  max-width: 540px;
  margin: 0 auto;
}
.form-group {
  margin-bottom: 1rem;
}
.form-control {
  display: block;
  width: 100%;
  padding: 0.6rem 0.9rem;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: #212529;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid #ced4da;
  border-radius: 0.375rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  font-family: inherit;
  text-align: right;
}
.form-control:focus {
  color: rgb(0, 0, 0);
  background-color: rgb(255, 255, 255);
  outline: 0;
  box-shadow: none !important;
  border-color: #306db5;
}
.form-control:disabled {
  background-color: #f8f9fa;
  opacity: 0.7;
}

/* ===== Alert ===== */
.seha-alert {
  background-color: #f8d7da;
  border: 1px solid #f5c2c7;
  color: #842029;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  display: block;
}

/* ===== Buttons ===== */
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
  padding: 0.475rem 0.9rem;
  font-size: 1rem;
  border-radius: 0.375rem;
  transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  font-family: inherit;
}
.btn-primary {
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
  background-color: #6c9aff;
  border-color: #6c9aff;
  cursor: not-allowed;
  opacity: 0.8;
}
.seha-submit-btn {
  width: 100%;
  padding: 10px 16px;
  font-size: 16px;
  font-weight: 600;
}
.seha-back-btn {
  margin-top: 24px !important;
  background-color: #306db5;
  border-color: #306db5;
}
.seha-back-btn:hover {
  background-color: #285a96;
  border-color: #285a96;
}

/* ===== Results ===== */
.results-inquiery {
  background: rgb(247, 247, 247) !important;
  padding: 10px !important;
  margin: 25px 1px 1px !important;
  border: 1px solid gainsboro !important;
  border-radius: 6px;
  flex-wrap: wrap;
}
.results-inquiery > div {
  padding: 10px !important;
  text-align: right;
  flex: 0 0 auto;
  width: 50%;
}
@media (max-width: 768px) {
  .results-inquiery > div { width: 100%; }
}
.results-inquiery span {
  display: block;
  font-weight: 700;
  padding: 8px 0;
  color: #306db5;
}
.results-inquiery span + span {
  color: #212529;
  font-weight: 400;
}
.seha-results-actions {
  display: flex !important;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  width: 100% !important;
  margin-top: 12px;
}
.seha-results-actions .btn {
  padding: 8px 16px;
  font-size: 14px;
}
.seha-btn-secondary {
  background-color: #306db5 !important;
  border-color: #306db5 !important;
}
.seha-btn-secondary:hover {
  background-color: #285a96 !important;
  border-color: #285a96 !important;
}

/* ===== Row / Col (Bootstrap-like) ===== */
.row {
  --bs-gutter-x: 1.5rem;
  display: flex;
  flex-wrap: wrap;
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
}
.justify-content-center { justify-content: center !important; }
.text-center { text-align: center !important; }
.mt-1 { margin-top: 0.5rem !important; }
.mt-3 { margin-top: 1rem !important; }
.mb-3 { margin-bottom: 1rem !important; }
.p-4 { padding: 1.5rem !important; }
.col-md-5 { width: 41.66667%; }
.col-md-6 { width: 50%; }
.col-md-12 { width: 100%; }
@media (max-width: 768px) {
  .col-md-5, .col-md-6, .col-md-12 { width: 100%; }
}

/* ===== Footer ===== */
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
  div.footer-container .footer {
    padding-right: 100px;
    padding-left: 100px;
    flex-direction: row;
  }
}
@media (max-width: 767px) {
  div.footer-container { text-align: center; }
}
div.footer-container .footer {
  display: flex;
  flex-direction: column;
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 16px;
}
.seha-footer-logo {
  height: 50px;
  filter: brightness(0) invert(1);
  margin-bottom: 12px;
}
div.footer-container .about.section p.about {
  width: 100%;
  line-height: 30px;
  color: rgb(212, 238, 255);
  font-size: 14px;
}
div.footer-container .links-wrapepr {
  text-align: -webkit-center;
  list-style: none;
  padding: 0;
}
div.footer-container .inquiry-li {
  width: 100%;
  max-width: 300px;
  margin: 2px auto;
  padding: 11px 0;
  align-items: center;
  gap: 10px;
  align-self: stretch;
  border-bottom: 1px solid rgb(98, 151, 214);
  color: rgb(212, 238, 255);
}
div.footer-container .inquiry-li:last-child { border-bottom: none; }
div.footer-container .inquiry-li .nav-link {
  padding-right: 4px;
  color: rgb(212, 238, 255);
  text-decoration: none;
}
div.footer-container .inquiry-li:hover {
  color: rgba(255, 255, 255, 0.5) !important;
}
div.footer-container .inquiry-li:hover .nav-link {
  color: rgba(255, 255, 255, 0.7);
}
div.footer-container h3.heading {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #fff;
}
div.footer-container .contact-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
div.footer-container .contact .details {
  margin-bottom: 8px;
}
div.footer-container .contact .details a {
  color: #c6e4ff;
  text-decoration: none;
}
div.footer-container .contact .timings span {
  font-size: 12px;
  color: rgb(240, 243, 248);
}
div.footer-container .contact img {
  height: 40px;
  margin-inline-end: 12px;
  vertical-align: middle;
}
div.footer-container .footer-note-wrapper {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 20px;
  margin-top: 30px;
  text-align: center;
  width: 100%;
}
div.footer-container .footer-note-wrapper p {
  margin: 0 0 8px 0;
  font-size: 13px;
}
div.footer-container .footer-note-wrapper ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px;
}
div.footer-container .footer-note-wrapper ul li a {
  color: #c6e4ff;
  text-decoration: none;
  font-size: 13px;
}

/* ===== Mobile responsive tweaks ===== */
@media (max-width: 768px) {
  div.inquiries-container h1.heading { font-size: 28px; }
  div.inquiries-container p.sub-heading { font-size: 14px; }
  .header .logo { height: 36px; }
  div.footer-container .footer { gap: 24px; }
}
`;
