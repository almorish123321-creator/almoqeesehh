/**
 * صفحة الاستعلام عن الإجازة المرضية — مطابقة 100% لتصميم البوت الأصلي
 * ====================================================================
 * مسار: /inquiries/slenquiry
 *
 * المصدر المرجعي: alehtiat-almorish/website/public/inquiry.html
 *                 + assets/css/mo.css (header/navbar/footer)
 *                 + assets/css/ali.css (form-control, btn)
 *                 + assets/images/seha_logo.*.svg
 *
 * هذا الصفحة مطابقة تماماً لتصميم لوحة الاستعلام في البوت الأصلي:
 *   - نفس الخطوط: Cairo (400, 600, 700, 900) من Google Fonts
 *   - نفس الألوان (مطابقة لـ seha.sa الفعلية):
 *       * الهيدر: خلفية بيضاء #ffffff (مطابقة لـ .header{background-color:#fff!important})
 *       * شعار صحة ملوّن (أزرق + رمادي) WITHOUT filter — مرئي على الخلفية البيضاء
 *       * روابط الهيدر: rgb(48, 109, 181) - الأزرق الرسمي
 *       * زر تسجيل الدخول: rgb(48, 109, 181) خلفية، نص أبيض، radius 15px
 *       * زر القائمة (الهامبرغر): ثلاثة خطوط أفقية بلون #7eb7db — يظهر على الموبايل فقط
 *       * العنوان "الإجازات المرضية": rgb(48, 109, 181)، 40px، وزن 700، مع SVG خلفي فاتح
 *       * النص الفرعي: rgb(121, 140, 161)
 *       * زر الاستعلام: Bootstrap btn-primary (#0d6efd)
 *       * الفوتر: rgb(48, 109, 181) خلفية
 *       * شعار صحة أبيض في الفوتر (filter: brightness(0) invert(1))
 *       * خط أزرق فاتح rgb(126, 183, 219) تحت كل h3 في الفوتر
 *       * روابط الفوتر: rgb(212, 238, 255)
 *   - نفس الدائرة الزرقاء: 60x60، 5px solid #e0e0e0، top 5px solid #306db5، 0.8s linear
 *   - نفس الأحجام: عنوان 40px، نص فرعي 16px، حقول Bootstrap (0.375rem 0.75rem)
 *   - نفس النص العربي: "الإجازات المرضية"، "رمز الخدمة"، "رقم الهوية / الإقامة"، "استعلام"
 *   - نفس بنية الفوتر: قسم About + قسم Links + قسم Contact (مع أيقونات SVG وأيقونات تواصل)
 *   - زر القائمة (3 خطوط) يظهر على الموبايل ويفتح/يغلق القائمة عند الضغط
 *
 * يتصل بـ /api/inquire?gsl=...&id=... ويستخرج البيانات من Vercel Blob / Postgres.
 */

"use client";

import { useState, useRef } from "react";
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

// SVG icons (inline data URIs copied verbatim from alehtiat-almorish/website/public/inquiry.html)
const PHONE_ICON =
  "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='13.667'%20height='13.662'%20viewBox='0%200%2013.667%2013.662'%3e%3cpath%20id='phone'%20d='M15.455,17.037h-.089C5.04,16.443,3.574,7.731,3.369,5.072a1.576,1.576,0,0,1,1.45-1.7h2.9a1.051,1.051,0,0,1,.978.662L9.491,6a1.051,1.051,0,0,1-.231,1.135L8.14,8.267a4.923,4.923,0,0,0,3.983,3.993l1.14-1.13a1.051,1.051,0,0,1,1.14-.215l1.981.794a1.051,1.051,0,0,1,.647.977V15.46a1.576,1.576,0,0,1-1.576,1.576ZM4.946,4.426a.525.525,0,0,0-.525.525v.042c.242,3.111,1.792,10.467,11,10.992a.525.525,0,0,0,.557-.494V12.686L14,11.892l-1.508,1.5-.252-.032c-4.571-.573-5.191-5.144-5.191-5.191l-.032-.252L8.508,6.406,7.72,4.426Z'%20transform='translate(-3.364%20-3.375)'%20fill='%237eb7db'/%3e%3c/svg%3e";
const EMAIL_ICON =
  "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='13.667'%20height='10.25'%20viewBox='0%200%2013.667%2010.25'%3e%3cpath%20id='email-line'%20d='M14.812,6H2.854A.854.854,0,0,0,2,6.854V15.4a.854.854,0,0,0,.854.854H14.812a.854.854,0,0,0,.854-.854V6.854A.854.854,0,0,0,14.812,6Zm-.658,9.4H3.563L6.553,12.3l-.615-.594L2.854,14.9V7.5l5.309,5.283a.854.854,0,0,0,1.2,0l5.445-5.415v7.474L11.669,11.7l-.6.6ZM3.414,6.854H14.121L8.765,12.18Z'%20transform='translate(-2%20-6)'%20fill='%237eb7db'/%3e%3c/svg%3e";
const WHATSAPP_ICON =
  "data:image/svg+xml,%3csvg%20width='14'%20height='15'%20viewBox='0%200%2014%2015'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M11.9602%202.27071C10.6442%200.953543%208.89393%200.227791%207.02923%200.227051C3.18704%200.227051%200.0599782%203.35292%200.0584405%207.19512C0.057928%208.42329%200.378928%209.62217%200.988904%2010.6789L-7.62939e-06%2014.29L3.69531%2013.321C4.71343%2013.8761%205.85977%2014.1687%207.02644%2014.1692H7.0293C10.8711%2014.1692%2013.9984%2011.0429%2014%207.20068C14.0007%205.33869%2013.2763%203.58787%2011.9602%202.27071ZM7.0293%2012.9922H7.02693C5.98731%2012.9918%204.96761%2012.7126%204.07808%2012.1849L3.86649%2012.0594L1.67367%2012.6344L2.25899%2010.4971L2.12121%2010.278C1.54125%209.35579%201.23492%208.28992%201.23538%207.19556C1.23665%204.00207%203.83576%201.40399%207.0316%201.40399C8.5791%201.40458%2010.0338%202.00783%2011.1277%203.10261C12.2216%204.19739%2012.8237%205.65261%2012.8231%207.20023C12.8217%2010.3939%2010.2227%2012.9922%207.0293%2012.9922ZM10.2073%208.65437C10.0331%208.56722%209.17681%208.14597%209.01715%208.08787C8.8575%208.02976%208.7414%208.00072%208.62527%208.17504C8.50917%208.34934%208.17537%208.74154%208.07374%208.85773C7.97216%208.97395%207.87056%208.98849%207.69638%208.90132C7.52221%208.81417%206.961%208.63032%206.29571%208.03711C5.77795%207.57544%205.42836%207.0052%205.32677%206.8309C5.22517%206.65658%205.31597%206.56233%205.40316%206.47554C5.4815%206.39752%205.57732%206.27218%205.66442%206.17049C5.75149%206.06881%205.78052%205.99618%205.83856%205.87999C5.89663%205.76378%205.86761%205.66209%205.82406%205.57494C5.78052%205.48779%205.4322%204.63075%205.28704%204.28213C5.14567%203.9426%205.00207%203.98854%204.89515%203.98322C4.79367%203.97817%204.67744%203.97709%204.56134%203.97709C4.44522%203.97709%204.25653%204.02068%204.09687%204.19498C3.93722%204.3693%203.48729%204.79055%203.48729%205.64756C3.48729%206.50458%204.11139%207.33254%204.19848%207.44875C4.28556%207.56497%205.42666%209.32371%207.17387%2010.0779C7.58943%2010.2573%207.91386%2010.3644%208.16681%2010.4447C8.58407%2010.5772%208.96377%2010.5585%209.26389%2010.5137C9.59852%2010.4637%2010.2944%2010.0925%2010.4395%209.68573C10.5847%209.279%2010.5847%208.93038%2010.5411%208.85775C10.4976%208.78513%2010.3815%208.74154%2010.2073%208.65437Z'%20fill='white'/%3e%3c/svg%3e";
const YOUTUBE_ICON =
  "data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='18'%20height='18'%20viewBox='0%200%2018%2018'%3e%3cg%20id='Group_4247'%20data-name='Group%204247'%20transform='translate(-326%20-6335)'%3e%3cpath%20id='youtube'%20d='M6.848,12.169V9.444l2.62,1.368-2.62,1.358Zm5.754-3.2a2.094,2.094,0,0,0-.386-.963,1.388,1.388,0,0,0-.972-.411c-1.357-.1-3.393-.1-3.393-.1h0s-2.036,0-3.393.1a1.388,1.388,0,0,0-.972.411,2.1,2.1,0,0,0-.386.963,14.673,14.673,0,0,0-.1,1.57v.736a14.681,14.681,0,0,0,.1,1.57,2.094,2.094,0,0,0,.386.963,1.641,1.641,0,0,0,1.07.414c.776.074,3.3.1,3.3.1s2.038,0,3.4-.1a1.387,1.387,0,0,0,.972-.411,2.1,2.1,0,0,0,.386-.963,14.681,14.681,0,0,0,.1-1.57v-.736a14.665,14.665,0,0,0-.1-1.57Z'%20transform='translate(327%206333.5)'%20fill='%23f0f3f8'%20fill-rule='evenodd'/%3e%3cg%20id='Path_8137'%20data-name='Path%208137'%20transform='translate(326%206335)'%20fill='none'%20opacity='0'%3e%3cpath%20d='M9,0A9,9,0,1,1,0,9,9,9,0,0,1,9,0Z'%20stroke='none'/%3e%3cpath%20d='M%209.000004768371582%200.4999980926513672%20C%204.313084602355957%200.4999980926513672%200.4999942779541016%204.31309700012207%200.4999942779541016%209.00003719329834%20C%200.4999942779541016%2013.68697738647461%204.313084602355957%2017.50007629394531%209.000004768371582%2017.50007629394531%20C%2013.68692493438721%2017.50007629394531%2017.50000381469727%2013.68697738647461%2017.50000381469727%209.00003719329834%20C%2017.50000381469727%204.31309700012207%2013.68692493438721%200.4999980926513672%209.000004768371582%200.4999980926513672%20M%209.000004768371582%20-1.9073486328125e-06%20C%2013.97056484222412%20-1.9073486328125e-06%2018.00000381469727%204.029457092285156%2018.00000381469727%209.00003719329834%20C%2018.00000381469727%2013.97061729431152%2013.97056484222412%2018.00007629394531%209.000004768371582%2018.00007629394531%20C%204.029444694519043%2018.00007629394531%20-5.7220458984375e-06%2013.97061729431152%20-5.7220458984375e-06%209.00003719329834%20C%20-5.7220458984375e-06%204.029457092285156%204.029444694519043%20-1.9073486328125e-06%209.000004768371582%20-1.9073486328125e-06%20Z'%20stroke='none'%20fill='%23f0f3f8'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e";
const TWITTER_ICON_SVG = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 1200 1227"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#ffffff"
      d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
    />
  </svg>
);

export default function SlenquiryPage() {
  const { toast } = useToast();
  const [serviceCode, setServiceCode] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<LeaveRecord | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

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

  const toggleMenu = () => {
    setMenuOpen((v) => !v);
    if (menuBtnRef.current) {
      if (menuBtnRef.current.classList.contains("collapsed")) {
        menuBtnRef.current.classList.remove("collapsed");
      } else {
        menuBtnRef.current.classList.add("collapsed");
      }
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

      {/* ===== Header (مطابق لـ seha.sa الفعلية - خلفية بيضاء + شعار ملوّن + زر هامبرغر للموبايل) ===== */}
      <div style={{ zIndex: 99, opacity: 1, transform: "none" }}>
        <nav className="header navbar-expand-lg navbar-light px-4">
          <div className="nav-container">
            {/* الشعار الملوّن — يظهر دائماً (بدون filter لضمان الرؤية على الخلفية البيضاء) */}
            <a className="" href="/">
              <img
                src="/images/seha-color-logo.svg"
                alt="logo"
                className="logo"
              />
            </a>

            {/* زر القائمة (3 خطوط أفقية) — يظهر على الموبايل فقط ويفتح/يغلق القائمة */}
            <div className="d-lg-none d-xl-none justify-content-end menu">
              <button
                aria-controls="responsive-navbar-nav"
                type="button"
                aria-label="Toggle navigation"
                id="menu_but"
                ref={menuBtnRef}
                className="d-inline-flex menu-img navbar-toggler collapsed"
                onClick={toggleMenu}
                aria-expanded={menuOpen}
              >
                <span className="navbar-toggler-icon"></span>
              </button>
            </div>

            {/* القائمة البيضاء — قابلة للطي على الموبايل */}
            <div
              className={`white justify-content-around navbar-collapse collapse${menuOpen ? " show" : ""}`}
              id="responsive-navbar-nav"
              style={menuOpen ? { display: "block" } : undefined}
            >
              <div className="navbar justify-content-around navbar-nav">
                <a data-rr-ui-event-key="1" className="link nav-link active" href="/">
                  الرئيسية
                </a>
                <a data-rr-ui-event-key="2" className="link nav-link" href="/#services">
                  الخدمات
                </a>
                <a
                  data-rr-ui-event-key="3"
                  className="link nav-link"
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
              src="/images/seha-color-logo.svg"
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
                  <img alt="phone icon" src={PHONE_ICON} />
                  <a href="tel:920002005">920002005</a>
                </div>
                <div className="details">
                  <img alt="email line" src={EMAIL_ICON} />
                  <a href="mailto:support@seha.sa">support@seha.sa</a>
                </div>
                <div className="details">
                  <img
                    alt="whatsapp"
                    src={WHATSAPP_ICON}
                    style={{ width: "16px", height: "16px", opacity: 0.5 }}
                  />
                  <a href="https://wa.me/920002005" target="_blank" rel="noreferrer">
                    920002005
                  </a>
                </div>
                <div className="timings mt-3">
                  <span style={{ fontSize: "12px", color: "rgb(240, 243, 248)" }}>
                    أوقات العمل: الأحد حتى الخميس 8 ص - 11م
                  </span>
                </div>
                <div className="social">
                  <button>
                    <a href="https://www.youtube.com/channel/UCb9ZrS2YcriYqIPIHNp9wcQ">
                      <img alt="youtube icon" src={YOUTUBE_ICON} />
                    </a>
                  </button>
                  <button>
                    <a href="https://twitter.com/seha_services">{TWITTER_ICON_SVG}</a>
                  </button>
                </div>
              </div>
              <div className="contact">
                <img alt="lean logo" src="/images/lean-logo.png" />
                <div className="spacer"></div>
                <img alt="moh logo" src="/images/moh-logo.png" />
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
      </div>
    </>
  );
}

/* ============================================================
 *  أنماط CSS مطابقة 100% لتصميم البوت الأصلي من alehtiat-almorish
 *  Source: alehtiat-almorish/website/public/inquiry.html + assets/css/*.css
 *          + assets/images/صحة - منصة الخدمات الصحية_files/index-BPgz3OGf.css
 *
 *  كل القيم مأخوذة حرفياً من ملفات CSS المرجعية:
 *    - mo.css: navbar/header, footer-container, inquiry-li, results-inquiery, btn-primary, .login
 *    - ali.css: form-control base style
 *    - Ais.css: :root --primary-color #306DB5
 *    - inquiry.html <style> tag: spinner-overlay, spinner-circle, spinner-text
 *    - index-BPgz3OGf.css (seha.sa الفعلية): .header{background-color:#fff!important}
 *
 *  التغييرات المهمة عن النسخة السابقة:
 *    1. خلفية الهيدر أصبحت بيضاء (#ffffff) مطابقة لـ seha.sa الفعلية
 *    2. شعار الهيدر الملوّن (بدون filter) — مرئي بوضوح
 *    3. زر القائمة (3 خطوط) يظهر على الموبايل بفضل Bootstrap utility classes
 *    4. أضيفت classes Bootstrap: d-lg-none, d-xl-none, d-inline-flex, justify-content-end
 *    5. أضيفت أيقونة الهامبرغر الأصلية (ios-menu SVG) من mo.css
 *    6. أضيف JavaScript toggle لإظهار/إخفاء القائمة على الموبايل
 * ============================================================ */
const SEHA_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

:root {
  --primary-color: #306DB5;
  --secondary-color: #2c3e77;
  --bs-primary: #306DB5;
  --bs-body-color: #212529;
  --bs-body-bg: #fff;
  --bs-border-color: #dee2e6;
  --bs-border-radius: 0.375rem;
  --bs-border-width: 1px;
}

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
  background-color: rgb(255, 255, 255);
  font-family: 'Cairo', sans-serif;
  font-size: 1rem;
}

/* ===== Bootstrap utility classes (مطلوبة لـ d-lg-none, d-xl-none, d-inline-flex, إلخ) ===== */
.d-none { display: none !important; }
.d-inline-flex { display: inline-flex !important; }
.d-flex { display: flex !important; }
.d-block { display: block !important; }
.justify-content-end { justify-content: flex-end !important; }
.justify-content-around { justify-content: space-around !important; }
.justify-content-between { justify-content: space-between !important; }
.justify-content-center { justify-content: center !important; }
.align-items-center { align-items: center !important; }
.flex-wrap { flex-wrap: wrap !important; }
.text-center { text-align: center !important; }
.collapse:not(.show) { display: none; }
.collapsing { height: 0; overflow: hidden; transition: height .35s ease; }
@media (max-width: 991.98px) {
  .d-lg-none { display: flex !important; }
}
@media (min-width: 992px) {
  .d-lg-none { display: none !important; }
  .d-lg-block { display: block !important; }
  .d-xl-none { display: none !important; }
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

/* ===== Header / Navbar (مطابق لـ seha.sa الفعلية - خلفية بيضاء) =====
 * في seha.sa الأصلية، الـ header له:
 *   background-color: #f8f9fb  (افتراضي في mo.css)
 *   background-color: #fff !important  (override من index-BPgz3OGf.css)
 * النتيجة الفعلية: خلفية بيضاء
 */
.header, .navbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  z-index: 999;
  width: 100%;
  position: sticky;
  background-color: #ffffff !important;
  padding: 0% 2% !important;
  box-shadow: rgba(99, 99, 99, 0.15) 0px 2px 8px 0px;
}
@media (min-width: 992px) {
  .header, .navbar {
    background-color: #ffffff !important;
    box-shadow: none;
  }
}
@media (min-width: 1200px) {
  .header, .navbar {
    padding-inline: 4% !important;
  }
}

/* nav-container — الحاوية الداخلية للهيدر */
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
@media (min-width: 992px) {
  .nav-container {
    padding-inline: unset;
    padding-top: 10px;
  }
}

/* شعار صحة في الهيدر — مرئي (بدون filter) */
.header .logo,
.header .navbar-brand,
.navbar .logo,
.navbar .navbar-brand {
  flex: 0.5 1 0%;
  margin-inline-start: 2px;
  z-index: 999;
  width: 90px;
  height: auto;
}
@media (min-width: 768px) {
  .header .logo,
  .header .navbar-brand,
  .navbar .logo,
  .navbar .navbar-brand {
    width: auto;
    height: 50px;
  }
}

/* زر القائمة (الهامبرغر - 3 خطوط) — يظهر على الموبايل فقط */
.menu {
  flex: 2 1 0%;
  display: flex;
  z-index: 999;
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
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
}
.menu .navbar-toggler-icon {
  display: inline-block;
  margin-top: 15px;
  width: 56%;
  height: 36px;
  /* أيقونة ios-menu الأصلية من mo.css - 3 خطوط أفقية بلون #7eb7db */
  background-image: url("data:image/svg+xml,%3csvg%20id='ios-menu'%20xmlns='http://www.w3.org/2000/svg'%20width='23.2'%20height='15.75'%20viewBox='0%200%2023.2%2015.75'%3e%3cpath%20id='Path_8753'%20data-name='Path%208753'%20d='M26.734,12.375H5.467A1.058,1.058,0,0,1,4.5,11.25a1.058,1.058,0,0,1,.967-1.125H26.734A1.058,1.058,0,0,1,27.7,11.25,1.058,1.058,0,0,1,26.734,12.375Z'%20transform='translate(-4.5%20-10.125)'%20fill='%237eb7db'/%3e%3cpath%20id='Path_8754'%20data-name='Path%208754'%20d='M26.734,19.125H5.467a1.138,1.138,0,0,1,0-2.25H26.734a1.138,1.138,0,0,1,0,2.25Z'%20transform='translate(-4.5%20-10.125)'%20fill='%237eb7db'/%3e%3cpath%20id='Path_8755'%20data-name='Path%208755'%20d='M26.734,25.875H5.467a1.138,1.138,0,0,1,0-2.25H26.734a1.138,1.138,0,0,1,0,2.25Z'%20transform='translate(-4.5%20-10.125)'%20fill='%237eb7db'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
}
.menu .navbar-toggler:not(.collapsed) .navbar-toggler-icon {
  width: 50%;
  /* أيقونة X (إغلاق) من mo.css - تظهر عند فتح القائمة */
  background-image: url("data:image/svg+xml,%3csvg%20id='ios-menu'%20xmlns='http://www.w3.org/2000/svg'%20width='17.997'%20height='17.996'%20viewBox='0%200%2017.997%2017.996'%3e%3cpath%20id='Path_8753'%20data-name='Path%208753'%20d='M22.234,2.25H.967A1.058,1.058,0,0,1,0,1.125,1.058,1.058,0,0,1,.967,0H22.234A1.058,1.058,0,0,1,23.2,1.125,1.058,1.058,0,0,1,22.234,2.25Z'%20transform='translate(0%2016.405)%20rotate(-45)'%20fill='%237eb7db'/%3e%3cpath%20id='Path_8755'%20data-name='Path%208755'%20d='M22.234,2.25H.967A1.058,1.058,0,0,1,0,1.125,1.058,1.058,0,0,1,.967,0H22.234A1.058,1.058,0,0,1,23.2,1.125,1.058,1.058,0,0,1,22.234,2.25Z'%20transform='translate(16.406%2017.996)%20rotate(-135)'%20fill='%237eb7db'/%3e%3c/svg%3e");
}

/* القائمة المنسدلة (responsive-navbar-nav) — على الموبايل تكون absolute، على الديسكتوب flex */
.white.navbar-collapse.collapse {
  display: none !important;
}
.white.navbar-collapse.collapse.show {
  display: block !important;
}
@media (min-width: 992px) {
  .white.navbar-collapse.collapse {
    display: flex !important;
    flex-basis: auto;
    flex-grow: 1;
    align-items: center;
    background-color: transparent;
    box-shadow: unset;
    position: unset;
    padding: 0;
    margin-top: 0;
  }
}
/* على الموبايل: القائمة تظهر كقائمة منسدلة أسفل الهيدر */
@media (max-width: 991.98px) {
  .white.navbar-collapse.collapse.show {
    width: 100%;
    margin-top: 0;
    font-weight: 700;
    padding-top: 30%;
    padding-bottom: 40px;
    background-color: #ffffff;
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 1;
    box-shadow: rgba(99, 99, 99, 0.2) 0px 4px 2px -2px;
  }
}

/* روابط القائمة (navbar-nav) */
.navbar-nav {
  display: flex;
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 8px;
}
@media (max-width: 991.98px) {
  .navbar-nav {
    flex-direction: column;
    width: 100%;
  }
}
.navbar-nav .nav-link {
  display: block;
  font-weight: 400;
  text-align: center;
  color: var(--primary-color);
  padding: 8px 12px;
  font-size: 0.9rem;
  text-decoration: none;
  cursor: pointer;
}
@media (min-width: 992px) {
  .navbar-nav .nav-link {
    margin: 0;
    padding-block: 0;
    font-size: 0.8rem;
  }
}
@media (min-width: 992px) and (min-width: 1200px) {
  .navbar-nav .nav-link { font-size: 1rem; }
}
.navbar-nav .nav-link:hover {
  color: rgb(44, 62, 119);
}
.navbar-nav .link {
  font-size: 15px;
  font-weight: 600;
  align-items: center;
  align-self: center;
}
.navbar-nav:last-child {
  margin-inline-start: auto;
  margin-inline-end: 30px;
}
.navbar-nav:last-child .nav-link p {
  margin: 0;
  font-size: 0.9rem;
}

/* الرابط النشط - تسطير أزرق فاتح */
.navbar-nav .link.active {
  color: rgb(48, 109, 181);
  font-weight: 700;
  text-decoration-line: underline;
  text-underline-offset: 6px;
  text-decoration-thickness: 3px;
  text-decoration-color: rgb(126, 183, 219);
}

/* Login button - مطابق لـ mo.css .header .login */
.header .login,
.navbar .login {
  display: inline-flex;
  font-size: 16px;
  margin-top: 20px;
  margin-inline: 10%;
  border-radius: 15px;
  background: rgb(48, 109, 181);
  font-weight: 400;
  flex-direction: row;
  justify-content: center;
  white-space: nowrap;
  color: rgb(255, 255, 255) !important;
  padding: 10px 20px 10px 27px !important;
  text-decoration: none;
}
@media (min-width: 992px) {
  .header .login,
  .navbar .login {
    justify-content: unset;
    margin-top: 0px;
    margin-inline: 30px;
    padding-inline: 50px;
    gap: unset;
  }
}
.header .login:hover,
.navbar .login:hover {
  color: rgb(255, 255, 255);
  background-color: rgb(44, 62, 119);
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
  color: var(--bs-body-color);
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
  filter: brightness(0) invert(1);
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
div.footer-container .details {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
div.footer-container .details img {
  flex-shrink: 0;
}
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
div.footer-container .contact .values .social {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
div.footer-container .contact .values .social button {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}
div.footer-container .contact .values .social button a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
  .header .logo { width: 70px; height: auto; }
  div.footer-container .footer { gap: 24px; }
}
`;
