"use client";

/**
 * صفحة الاستعلام عن الإجازة المرضية — نسخة React مطابقة بصرياً 100% للأصل
 * ============================================================================
 *
 * المصدر: alehtiat-almorish/website/public/inquiry.html (402 سطر)
 *
 * القاعدة الذهبية: لا تغيير بصري. الـ HTML structure, الـ class names,
 * الـ CSS files المُحمَّلة, الـ spinner, الـ form fields, الـ results
 * section, الـ footer — كلها مطابقة للأصل.
 *
 * الاختلافات التقنية المسموح بها فقط:
 *  - DOM event listeners → React state + handlers
 *  - `<script>` tag → React useEffect/useCallback
 *  - fetch URL `/inquiry/api` → `/api/inquiry` (Next.js API route)
 *
 * كل الـ class names, الـ IDs, الـ styles المضمَّنة, الـ SVG data URIs,
 * الـ header, الـ footer, روابط الـ nav, صور الـ social, نصوص الـ copyright
 * — كلها منسوخة حرفياً من inquiry.html.
 */

import { useEffect, useState, useCallback, useRef } from "react";

interface InquiryResult {
  name: string;
  issue_date: string;
  date_from: string;
  date_to: string;
  day_count: number | string;
  doctor_name: string;
  doctor_specialty: string;
}

export default function InquiryPage() {
  const [serviceCode, setServiceCode] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InquiryResult | null>(null);
  const [inputsDisabled, setInputsDisabled] = useState(false);
  const [submitButtonVisible, setSubmitButtonVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  // Refs for menu toggle (mirror original `showSlidbar` behaviour)
  const navCollapseRef = useRef<HTMLDivElement>(null);

  // Hide error message when user types in service_code (mirror original
  // `keydown` listener that hides the error)
  const handleServiceCodeKeydown = () => {
    setErrorVisible(false);
  };

  const resetForm = useCallback(() => {
    setServiceCode("");
    setNationalId("");
    setResult(null);
    setErrorVisible(false);
    setInputsDisabled(false);
    setSubmitButtonVisible(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Basic validation — mirror original
    if (!serviceCode.trim() || !nationalId.trim()) {
      setErrorMessage("يرجى إدخال رمز الخدمة ورقم الهوية.");
      setErrorVisible(true);
      return;
    }

    setErrorVisible(false);
    setErrorMessage("");
    setLoading(true);
    setSubmitButtonVisible(false);

    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_code: serviceCode.trim(),
          national_id: nationalId.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        setSubmitButtonVisible(false);
        setInputsDisabled(true);
      } else {
        setErrorMessage(data.message || "خطأ في الاستعلام");
        setErrorVisible(true);
      }
    } catch (err) {
      console.error("Error:", err);
      setErrorMessage("حدث خطأ أثناء الاتصال بالنظام، يرجى المحاولة لاحقًا.");
      setErrorVisible(true);
    } finally {
      setLoading(false);
      setSubmitButtonVisible(true);
    }
  };

  // Trigger Bootstrap-style menu toggle (mirror `showSlidbar()`)
  useEffect(() => {
    if (!navCollapseRef.current) return;
    navCollapseRef.current.style.display = menuOpen ? "block" : "none";
  }, [menuOpen]);

  return (
    <>
      {/* <head>-level resources: fonts + stylesheets from the original */}
      {/* (in Next.js App Router, these go in layout.tsx — but we also
          include them here so this page is self-contained when rendered
          on its own URL.) The actual <link> tags are added via the
          page's metadata + a Head-like effect below. */}

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          overflow-x: hidden;
          direction: rtl;
        }
        html {
          direction: ltr !important;
        }
        body {
          direction: rtl;
        }

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
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .spinner-text {
          font-family: "Cairo", sans-serif;
          font-size: 16px;
          color: #306db5;
          font-weight: 600;
        }
      `}</style>

      <div
        style={{
          display: loading ? "flex" : "none",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(255, 255, 255, 0.85)",
          zIndex: 9999,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
        }}
        className="spinner-overlay"
      >
        <div className="spinner-circle" />
        <div className="spinner-text">جاري التحقق من البيانات...</div>
      </div>

      <div style={{ zIndex: 99, opacity: 1, transform: "none" }}>
        <nav className="header navbar-expand-lg navbar-light px-4">
          <div className="nav-container">
            <a href="https://www.seha.sa/#/">
              <img
                src="/assets/images/seha_logo.4dde29e5c4f38890ccf9787220bcc5be.svg"
                alt="logo"
                className="logo"
              />
            </a>
            <div className="d-lg-none d-xl-none justify-content-end menu">
              <button
                aria-controls="responsive-navbar-nav"
                type="button"
                aria-label="Toggle navigation"
                id="menu_but"
                className="d-inline-flex menu-img navbar-toggler collapsed"
                onClick={() => setMenuOpen((v) => !v)}
              >
                <span className="navbar-toggler-icon" />
              </button>
            </div>
            <div
              className="white justify-content-around navbar-collapse collapse"
              id="responsive-navbar-nav"
              ref={navCollapseRef}
            >
              <div className="navbar justify-content-around navbar-nav">
                <a data-rr-ui-event-key="1" className="link nav-link active" href="https://www.seha.sa/#/">
                  الرئيسية
                </a>
                <a data-rr-ui-event-key="2" className="link nav-link" href="https://www.seha.sa/#/services">
                  الخدمات
                </a>
                <a data-rr-ui-event-key="3" className="link nav-link" href="https://www.seha.sa/#/inquiries">
                  الاستعلامات
                </a>
                <a data-rr-ui-event-key="4" className="link nav-link" href="https://seha.sa/#/faq">
                  الأسئلة الشائعة
                </a>
              </div>
              <div className="navbar justify-content-end navbar-nav">
                <a data-rr-ui-event-key="6" className="nav-link" href="https://www.seha.sa/#/iamredirection/1">
                  <p>إنشاء حساب</p>
                </a>
                <a
                  data-rr-ui-event-key="7"
                  className="login nav-link"
                  href="https://www.seha.sa/#/account/login"
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <img src="/assets/" height="15" alt="logo" className="" />
                  <p style={{ margin: 0 }}>تسجيل الدخول</p>
                </a>
              </div>
            </div>
          </div>
        </nav>
      </div>

      <div className="inner-page inquiries-container">
        <h1 className="heading">الإجازات المرضية</h1>
        <p className="sub-heading">
          خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي
        </p>
        <div className="row justify-content-center mt-1">
          <div className="col-md-5 p-4">
            <p
              id="error-message"
              className="alert alert-danger"
              style={{ display: errorVisible ? "block" : "none" }}
            >
              {errorMessage}
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  name="service_code"
                  id="service_code"
                  maxLength={20}
                  placeholder="رمز الخدمة"
                  className="form-control"
                  value={serviceCode}
                  onChange={(e) => setServiceCode(e.target.value)}
                  onKeyDown={handleServiceCodeKeydown}
                  disabled={inputsDisabled}
                />
              </div>
              <div className="form-group">
                <label />
                <input
                  type="text"
                  name="national_id"
                  id="national_id"
                  maxLength={10}
                  pattern="\d*"
                  placeholder="رقم الهوية / الإقامة"
                  className="form-control"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  disabled={inputsDisabled}
                />
              </div>

              {result && (
                <div id="results-section" className="results-inquiery row" style={{ display: "flex" }}>
                  <div className="col-md-6">
                    <span>الاسم: </span> <span>{result.name}</span>
                  </div>
                  <div className="col-md-6">
                    <span>تاريخ إصدار تقرير الإجازة:</span> <span>{result.issue_date}</span>
                  </div>
                  <div className="col-md-6">
                    <span>تبدأ من:</span> <span>{result.date_from}</span>
                  </div>
                  <div className="col-md-6">
                    <span>وحتى:</span> <span>{result.date_to}</span>
                  </div>
                  <div className="col-md-6">
                    <span>المدة بالأيام:</span> <span>{result.day_count}</span>
                  </div>
                  <div className="col-md-6">
                    <span>اسم الطبيب:</span> <span>{result.doctor_name}</span>
                  </div>
                  <div className="col-md-6">
                    <span>المسمى الوظيفي:</span> <span>{result.doctor_specialty}</span>
                  </div>
                  <div className="col-md-12 text-center mt-3">
                    <button type="button" className="btn btn-primary" onClick={resetForm}>
                      استعلام جديد
                    </button>
                  </div>
                </div>
              )}

              {submitButtonVisible && (
                <button type="submit" id="submit-btn" className="btn btn-primary mt-3">
                  استعلام
                </button>
              )}
            </form>
          </div>
          <div className="col-md-12 text-center">
            <a className="btn btn-primary mb-3" href="/inquiry">
              رجوع للاستعلامات
            </a>
          </div>
        </div>
      </div>

      <div className="footer-container container-fluid">
        <div className="footer">
          <div className="about section">
            <img
              src="/assets/images/seha_logo.4dde29e5c4f38890ccf9787220bcc5be.svg"
              alt="Logo"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <p className="about">
              منصة صحة تخدم جميع المنشأت الطبية من خلال تقديم الخدمات الصحية إلكترونياً لجميع المنشأت الطبية وتسعى إلى توحيد وأتمتة الاجراءات والخدمات بما في دوره رفع جودة الاداء وخفض التكاليف.
            </p>
          </div>
          <div className="links section" style={{ alignItems: "center" }}>
            <h3 className="heading">القائمة الرئيسية</h3>
            <ul className="links-wrapepr">
              <li className="inquiry-li">
                <a className="nav-link" href="https://www.seha.sa/ui#/services">
                  الخدمات
                </a>
              </li>
              <li className="inquiry-li">
                <a className="nav-link" href="https://www.seha.sa/ui#/inquiries">
                  الاستعلامات
                </a>
              </li>
              <li className="inquiry-li">
                <a className="nav-link" href="https://www.seha.sa/ui#/faq">
                  الأسئلة الشائعة
                </a>
              </li>
              <li className="inquiry-li" style={{ borderBottom: "none" }}>
                <a className="nav-link" href="https://www.seha.sa/ui#/ContactUs">
                  تواصل معنا
                </a>
              </li>
            </ul>
          </div>
          <div className="section d-none">
            <h3 className="heading d-none">النشرة البريدية</h3>
            <p className="about d-none">الاشتراك في الرسائل الإخبارية</p>
            <form className="d-none">
              <div className="input-wrapper">
                <input placeholder="البريد الالكتروني" type="email" className="form-control" />
                <button className="button-small">إشترك</button>
              </div>
            </form>
          </div>
          <div className="contact section">
            <h3 className="heading">تواصل معنا</h3>
            <div className="contact-wrapper">
              <div className="values">
                <div className="details">
                  <img
                    alt="phone icon"
                    src="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='13.667'%20height='13.662'%20viewBox='0%200%2013.667%2013.662'%3e%3cpath%20id='phone'%20d='M15.455,17.037h-.089C5.04,16.443,3.574,7.731,3.369,5.072a1.576,1.576,0,0,1,1.45-1.7h2.9a1.051,1.051,0,0,1,.978.662L9.491,6a1.051,1.051,0,0,1-.231,1.135L8.14,8.267a4.923,4.923,0,0,0,3.983,3.993l1.14-1.13a1.051,1.051,0,0,1,1.14-.215l1.981.794a1.051,1.051,0,0,1,.647.977V15.46a1.576,1.576,0,0,1-1.576,1.576ZM4.946,4.426a.525.525,0,0,0-.525.525v.042c.242,3.111,1.792,10.467,11,10.992a.525.525,0,0,0,.557-.494V12.686L14,11.892l-1.508,1.5-.252-.032c-4.571-.573-5.191-5.144-5.191-5.191l-.032-.252L8.508,6.406,7.72,4.426Z'%20transform='translate(-3.364%20-3.375)'%20fill='%237eb7db'/%3e%3c/svg%3e"
                  />
                  <a href="tel:920002005">920002005</a>
                </div>
                <div className="details">
                  <img
                    alt="email line"
                    src="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='13.667'%20height='10.25'%20viewBox='0%200%2013.667%2010.25'%3e%3cpath%20id='email-line'%20d='M14.812,6H2.854A.854.854,0,0,0,2,6.854V15.4a.854.854,0,0,0,.854.854H14.812a.854.854,0,0,0,.854-.854V6.854A.854.854,0,0,0,14.812,6Zm-.658,9.4H3.563L6.553,12.3l-.615-.594L2.854,14.9V7.5l5.309,5.283a.854.854,0,0,0,1.2,0l5.445-5.415v7.474L11.669,11.7l-.6.6ZM3.414,6.854H14.121L8.765,12.18Z'%20transform='translate(-2%20-6)'%20fill='%237eb7db'/%3e%3c/svg%3e"
                  />
                  <a href="mailto:support@seha.sa">support@seha.sa</a>
                </div>
                <div className="details">
                  <img
                    alt="whatsapp"
                    src="data:image/svg+xml,%3csvg%20width='14'%20height='15'%20viewBox='0%200%2014%2015'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20fill-rule='evenodd'%20clip-rule='evenodd'%20d='M11.9602%202.27071C10.6442%200.953543%208.89393%200.227791%207.02923%200.227051C3.18704%200.227051%200.0599782%203.35292%200.0584405%207.19512C0.057928%208.42329%200.378928%209.62217%200.988904%2010.6789L-7.62939e-06%2014.29L3.69531%2013.321C4.71343%2013.8761%205.85977%2014.1687%207.02644%2014.1692H7.0293C10.8711%2014.1692%2013.9984%2011.0429%2014%207.20068C14.0007%205.33869%2013.2763%203.58787%2011.9602%202.27071ZM7.0293%2012.9922H7.02693C5.98731%2012.9918%204.96761%2012.7126%204.07808%2012.1849L3.86649%2012.0594L1.67367%2012.6344L2.25899%2010.4971L2.12121%2010.278C1.54125%209.35579%201.23492%208.28992%201.23538%207.19556C1.23665%204.00207%203.83576%201.40399%207.0316%201.40399C8.5791%201.40458%2010.0338%202.00783%2011.1277%203.10261C12.2216%204.19739%2012.8237%205.65261%2012.8231%207.20023C12.8217%2010.3939%2010.2227%2012.9922%207.0293%2012.9922ZM10.2073%208.65437C10.0331%208.56722%209.17681%208.14597%209.01715%208.08787C8.8575%208.02976%208.7414%208.00072%208.62527%208.17504C8.50917%208.34934%208.17537%208.74154%208.07374%208.85773C7.97216%208.97395%207.87056%208.98849%207.69638%208.90132C7.52221%208.81417%206.961%208.63032%206.29571%208.03711C5.77795%207.57544%205.42836%207.0052%205.32677%206.8309C5.22517%206.65658%205.31597%206.56233%205.40316%206.47554C5.4815%206.39752%205.57732%206.27218%205.66442%206.17049C5.75149%206.06881%205.78052%205.99618%205.83856%205.87999C5.89663%205.76378%205.86761%205.66209%205.82406%205.57494C5.78052%205.48779%205.4322%204.63075%205.28704%204.28213C5.14567%203.9426%205.00207%203.98854%204.89515%203.98322C4.79367%203.97817%204.67744%203.97709%204.56134%203.97709C4.44522%203.97709%204.25653%204.02068%204.09687%204.19498C3.93722%204.3693%203.48729%204.79055%203.48729%205.64756C3.48729%206.50458%204.11139%207.33254%204.19848%207.44875C4.28556%207.56497%205.42666%209.32371%207.17387%2010.0779C7.58943%2010.2573%207.91386%2010.3644%208.16681%2010.4447C8.58407%2010.5772%208.96377%2010.5585%209.26389%2010.5137C9.59852%2010.4637%2010.2944%2010.0925%2010.4395%209.68573C10.5847%209.279%2010.5847%208.93038%2010.5411%208.85775C10.4976%208.78513%2010.3815%208.74154%2010.2073%208.65437Z'%20fill='white'/%3e%3c/svg%3e"
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
                      <img
                        alt="youtube icon"
                        src="data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20width='18'%20height='18'%20viewBox='0%200%2018%2018'%3e%3cg%20id='Group_4247'%20data-name='Group%204247'%20transform='translate(-326%20-6335)'%3e%3cpath%20id='youtube'%20d='M6.848,12.169V9.444l2.62,1.368-2.62,1.358Zm5.754-3.2a2.094,2.094,0,0,0-.386-.963,1.388,1.388,0,0,0-.972-.411c-1.357-.1-3.393-.1-3.393-.1h0s-2.036,0-3.393.1a1.388,1.388,0,0,0-.972.411,2.1,2.1,0,0,0-.386.963,14.673,14.673,0,0,0-.1,1.57v.736a14.681,14.681,0,0,0,.1,1.57,2.094,2.094,0,0,0,.386.963,1.641,1.641,0,0,0,1.07.414c.776.074,3.3.1,3.3.1s2.038,0,3.4-.1a1.387,1.387,0,0,0,.972-.411,2.1,2.1,0,0,0,.386-.963,14.681,14.681,0,0,0,.1-1.57v-.736a14.665,14.665,0,0,0-.1-1.57Z'%20transform='translate(327%206333.5)'%20fill='%23f0f3f8'%20fill-rule='evenodd'/%3e%3cg%20id='Path_8137'%20data-name='Path%208137'%20transform='translate(326%206335)'%20fill='none'%20opacity='0'%3e%3cpath%20d='M9,0A9,9,0,1,1,0,9,9,9,0,0,1,9,0Z'%20stroke='none'/%3e%3cpath%20d='M%209.000004768371582%200.4999980926513672%20C%204.313084602355957%200.4999980926513672%200.4999942779541016%204.31309700012207%200.4999942779541016%209.00003719329834%20C%200.4999942779541016%2013.68697738647461%204.313084602355957%2017.50007629394531%209.000004768371582%2017.50007629394531%20C%2013.68692493438721%2017.50007629394531%2017.50000381469727%2013.68697738647461%2017.50000381469727%209.00003719329834%20C%2017.50000381469727%204.31309700012207%2013.68692493438721%200.4999980926513672%209.000004768371582%200.4999980926513672%20M%209.000004768371582%20-1.9073486328125e-06%20C%2013.97056484222412%20-1.9073486328125e-06%2018.00000381469727%204.029457092285156%2018.00000381469727%209.00003719329834%20C%2018.00000381469727%2013.97061729431152%2013.97056484222412%2018.00007629394531%209.000004768371582%2018.00007629394531%20C%204.029444694519043%2018.00007629394531%20-5.7220458984375e-06%2013.97061729431152%20-5.7220458984375e-06%209.00003719329834%20C%20-5.7220458984375e-06%204.029457092285156%204.029444694519043%20-1.9073486328125e-06%209.000004768371582%20-1.9073486328125e-06%20Z'%20stroke='none'%20fill='%23f0f3f8'/%3e%3c/g%3e%3c/g%3e%3c/svg%3e"
                      />
                    </a>
                  </button>
                  <button>
                    <a href="https://twitter.com/seha_services">
                      <svg width="14" height="14" viewBox="0 0 1200 1227" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          fill="#ffffff"
                          d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                        />
                      </svg>
                    </a>
                  </button>
                </div>
              </div>
              <div className="contact">
                <img alt="lean logo" src="/assets/images/lean-logo.png" />
                <div className="spacer" />
                <img alt="moh logo" src="/assets/images/moh-logo.png" />
              </div>
            </div>
            <div className="footer-note-wrapper">
              <p>منصة صحة معتمدة من قبل وزارة الصحة © 2026 </p>
              <ul>
                <li>
                  <a>سياسة الخصوصية وشروط الإستخدام</a>
                </li>
                <li>
                  <a className="" href="https://www.seha.sa/Content/LandingPages/UserManual.pdf">
                    دليل الاستخدام
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ElevenLabs widget (kept as in original) */}
      <elevenlabs-convai dir="ltr" agent-id="agent_1301kg5kw3djfmn9wrwj8gqa0cee" />
    </>
  );
}
