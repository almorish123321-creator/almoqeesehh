"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardPaste,
  FileText,
  UploadCloud,
  Printer,
  CheckCircle2,
  XCircle,
  Loader2,
  Wand2,
  RotateCcw,
  Eye,
  ExternalLink,
  Save,
  Info,
  Search,
  Database,
  RefreshCw,
  History,
  ArrowLeftRight,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import {
  FIELDS,
  GROUP_LABELS,
  LeaveFormData,
  EMPTY_FORM,
  FieldMeta,
} from "@/lib/leave-form";
import {
  parseBotMessage,
  normalizeDateToDDMMYYYY,
  toDateInputValue,
  toTimeInputValue,
  toTimeDisplay,
  calculateDays,
  generateLeaveId,
} from "@/lib/parser";

const SAMPLE_MESSAGE = `👤 اسم المريض (عربي): عبدالله محمد علي
👤 اسم المريض (إنجليزي): Abdullah Mohammed Ali
🆔 رقم الهوية: 828287654
🌍 الجنسية (عربي): السعودية
🌍 الجنسية (إنجليزي): Saudi Arabia
🏢 جهة العمل (عربي): طالب جامعي
🏢 جهة العمل (إنجليزي): University Student
👨‍⚕️ اسم الطبيب (عربي): المقبني
👨‍⚕️ اسم الطبيب (إنجليزي): Almakbany
💼 المسمى الوظيفي (عربي): طبيب عام
💼 المسمى الوظيفي (إنجليزي): General
📅 تاريخ الدخول (ميلادي): 20-09-2025
📅 تاريخ الخروج (ميلادي): 21-09-2025
🏥 اسم المنشأة (عربي): مستشفى الملك فيصل التخصصي ومركز الأبحاث
🏥 اسم المنشأة (إنجليزي): King Faisal Specialist Hospital and Research Centre
🔢 رقم الترخيص: 1410101201200443
⏰ الوقت: 10:20 AM`;

type StepStatus = "idle" | "loading" | "success" | "error";

interface ActionState {
  pdf: StepStatus;
  upload: StepStatus;
  pdfMessage?: string;
  uploadMessage?: string;
  leaveId?: string;
  recordId?: number;
}

const INITIAL_ACTION: ActionState = { pdf: "idle", upload: "idle" };

// =================================================================
//  Utility: convert a database record back into form data
// =================================================================
function recordToForm(r: any): LeaveFormData {
  // Infer hospital_type from the saved gsl_code prefix (GSL → public,
  // PSL → private). Falls back to "public" for legacy records.
  const code: string = r.gslCode || r.gsl_code || "";
  const inferredType: "public" | "private" = code.startsWith("PSL") ? "private" : "public";
  return {
    patient_name_ar: r.nameAr || "",
    patient_name_en: r.nameEn || "",
    id_number: r.identityNumber || "",
    nationality_ar: r.nationalityAr || "",
    nationality_en: r.nationalityEn || "",
    employer_ar: r.employer || "",
    employer_en: r.employerEn || "",
    doctor_name_ar: r.doctorNameAr || "",
    doctor_name_en: r.doctorNameEn || "",
    position_ar: r.doctorSpecialtyAr || "",
    position_en: r.doctorSpecialtyEn || "",
    admission_date_gregorian: toDateInputValue(r.dateFrom) || r.dateFrom || "",
    discharge_date_gregorian: toDateInputValue(r.dateTo) || r.dateTo || "",
    hospital_name_ar: r.hospitalNameAr || "",
    hospital_name_en: r.hospitalNameEn || "",
    license_number: r.licenseNumber || "",
    time: toTimeInputValue(r.timeFrom) || r.timeFrom || "",
    hospital_type: inferredType,
  };
}

export default function Home() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"new" | "inquiry">("new");

  // --- Form state ---
  const [formData, setFormData] = useState<LeaveFormData>({ ...EMPTY_FORM });
  const [pasteText, setPasteText] = useState("");
  const [pasteStats, setPasteStats] = useState<{ matched: number; total: number } | null>(null);
  const [action, setAction] = useState<ActionState>(INITIAL_ACTION);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  // شعار المنشأة المرفوع (data URL base64) — يُرسل للـ PDF فقط ولا يُخزن في قاعدة البيانات
  // Uploaded facility logo (base64 data URL) — sent to PDF only, not stored in DB
  const [hospitalLogo, setHospitalLogo] = useState<string>("");
  const [logoFileName, setLogoFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Inquiry state ---
  const [searchMode, setSearchMode] = useState<"gsl" | "id" | "q">("gsl");
  const [searchValue, setSearchValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // --- Mobile menu state (قائمة الهامبرغر 3 خطوط - مطابقة لـ seha.sa) ---
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

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
  const closeMenu = () => {
    if (menuOpen) {
      setMenuOpen(false);
      if (menuBtnRef.current && !menuBtnRef.current.classList.contains("collapsed")) {
        menuBtnRef.current.classList.add("collapsed");
      }
    }
  };

  const isBusy = action.pdf === "loading" || action.upload === "loading";

  // عند العودة من صفحة الاستعلام (/inquiries/slenquiry) مع بيانات محملة،
  // اقرأها من sessionStorage وعبّئ النموذج بها تلقائياً.
  // When returning from the inquiry page with loaded data, read it from
  // sessionStorage and auto-fill the form.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("slenquiry:prefill");
      if (!raw) return;
      sessionStorage.removeItem("slenquiry:prefill");
      const parsed = JSON.parse(raw);
      setFormData((prev) => ({
        ...prev,
        ...parsed,
        // حوّل التواريخ من DD-MM-YYYY إلى قيمة input type="date" (YYYY-MM-DD)
        admission_date_gregorian: toDateInputValue(parsed.admission_date_gregorian) || prev.admission_date_gregorian,
        discharge_date_gregorian: toDateInputValue(parsed.discharge_date_gregorian) || prev.discharge_date_gregorian,
        time: toTimeInputValue(parsed.time) || prev.time,
      }));
      setActiveTab("new");
      toast({
        title: "تم تحميل البيانات من الاستعلام",
        description: "عبّئ النموذج بالبيانات السابقة، عدّل ما يلزم ثم اطبع أو ارفع.",
      });
    } catch {
      /* ignore */
    }
  }, []);

  // --- Field update ---
  const updateField = (key: keyof LeaveFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }) as LeaveFormData);
  };

  // --- Smart Paste ---
  const handleSmartPaste = () => {
    if (!pasteText.trim()) {
      toast({
        title: "الصندوق فارغ",
        description: "الصق رسالة الاستمارة في المربع ثم اضغط تعبئة تلقائية.",
        variant: "destructive",
      });
      return;
    }
    const result = parseBotMessage(pasteText, { ...EMPTY_FORM });
    setFormData(result.data);
    setPasteStats({ matched: result.matchedFields.length, total: result.totalFields });
    toast({
      title: "تمت التعبئة التلقائية",
      description: `تم تعبئة ${result.matchedFields.length} من ${result.totalFields} حقلاً بنجاح.`,
    });
  };

  const handleLoadSample = () => {
    setPasteText(SAMPLE_MESSAGE);
    toast({ title: "تم تحميل مثال", description: "اضغط (تعبئة تلقائية) لتحويله إلى حقول النموذج." });
  };

  const handleClearAll = () => {
    setFormData({ ...EMPTY_FORM });
    setPasteText("");
    setPasteStats(null);
    setAction(INITIAL_ACTION);
    setHospitalLogo("");
    setLogoFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    toast({ title: "تم مسح كل البيانات", description: "أصبح النموذج جاهزاً لإدخال جديد." });
  };

  // --- Logo upload ---
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // تحقق من النوع
    if (!/^image\/(png|jpe?g|gif|webp|bmp)$/i.test(file.type)) {
      toast({
        title: "نوع ملف غير مدعوم",
        description: "الرجاء رفع صورة بصيغة PNG أو JPG أو GIF أو WebP.",
        variant: "destructive",
      });
      return;
    }
    // تحقق من الحجم (5 ميغابايت كحد أقصى)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast({
        title: "حجم الصورة كبير جداً",
        description: "الحد الأقصى لحجم الشعار 5 ميغابايت.",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setHospitalLogo(result);
        setLogoFileName(file.name);
        toast({
          title: "تم رفع الشعار",
          description: `سيظهر الشعار "${file.name}" في أسفل ملف PDF فقط، فوق اسم المنشأة.`,
        });
      }
    };
    reader.onerror = () => {
      toast({
        title: "فشل قراءة الملف",
        description: "تعذّر قراءة ملف الصورة. حاول مرة أخرى.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setHospitalLogo("");
    setLogoFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast({ title: "تم حذف الشعار", description: "لن يظهر شعار مخصص في ملف PDF." });
  };

  // --- Save / Load to localStorage ---
  const handleSaveDraft = () => {
    try {
      localStorage.setItem("seha-leave-draft", JSON.stringify(formData));
      toast({ title: "تم الحفظ", description: "حُفظت المسودة في المتصفح." });
    } catch {
      toast({ title: "فشل الحفظ", variant: "destructive" });
    }
  };

  const handleLoadDraft = () => {
    try {
      const raw = localStorage.getItem("seha-leave-draft");
      if (!raw) {
        toast({ title: "لا توجد مسودة محفوظة" });
        return;
      }
      const parsed = JSON.parse(raw);
      setFormData({ ...EMPTY_FORM, ...parsed });
      toast({ title: "تم استرجاع المسودة" });
    } catch {
      toast({ title: "تعذّر استرجاع المسودة", variant: "destructive" });
    }
  };

  // --- Validation ---
  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!formData.patient_name_ar.trim()) errors.push("اسم المريض (عربي)");
    if (!formData.id_number.trim()) errors.push("رقم الهوية");
    if (!formData.admission_date_gregorian) errors.push("تاريخ الدخول");
    if (!formData.discharge_date_gregorian) errors.push("تاريخ الخروج");
    return errors;
  }, [formData]);

  const isValid = validation.length === 0;

  // --- Computed preview values ---
  const computed = useMemo(() => {
    const admissionDisp = normalizeDateToDDMMYYYY(formData.admission_date_gregorian);
    const dischargeDisp = normalizeDateToDDMMYYYY(formData.discharge_date_gregorian);
    const days =
      formData.admission_date_gregorian && formData.discharge_date_gregorian
        ? calculateDays(formData.admission_date_gregorian, formData.discharge_date_gregorian)
        : 0;
    // Pass hospital_type to generateLeaveId so the prefix is GSL (public)
    // or PSL (private). Defaults to "public" if the field is somehow unset.
    const hospitalType: "public" | "private" =
      formData.hospital_type === "private" ? "private" : "public";
    const leaveId =
      formData.id_number && formData.admission_date_gregorian && formData.discharge_date_gregorian
        ? generateLeaveId(
            formData.id_number,
            formData.admission_date_gregorian,
            formData.discharge_date_gregorian,
            hospitalType,
          )
        : "—";
    return { admissionDisp, dischargeDisp, days, leaveId, timeDisp: toTimeDisplay(formData.time) };
  }, [formData]);

  // --- Combined action: print PDF + upload data ---
  const handlePrintAndUpload = async () => {
    if (!isValid) {
      toast({
        title: "بيانات ناقصة",
        description: `يرجى تعبئة: ${validation.join("، ")}`,
        variant: "destructive",
      });
      return;
    }

    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    setAction({ pdf: "loading", upload: "loading" });

    // التقط رمز الإجازة الحالي من المعاينة مرة واحدة فقط، ثم أرسله
    // إلى كلا المسارين /api/generate-pdf و /api/upload-leave لضمان أن
    // ملف PDF وقاعدة البيانات يستخدمان نفس الرمز بالضبط.
    //
    // دون هذا، كل مسار يستدعي generateLeaveId() بشكل مستقل (مع
    // Math.random() + Date.now()) فيُنتج رمزاً مختلفاً، فيعرض PDF
    // رمزاً وتخزّن DB رمزاً آخر — فلا يجد /inquiry السجل أبداً.
    const capturedLeaveId = computed.leaveId;

    const pdfPromise = (async () => {
      try {
        // أرسل بيانات النموذج + الشعار المرفوع (إن وُجد) + رمز الإجازة
        // الموحَّد إلى API توليد PDF
        // Send form data + uploaded logo (if any) + unified leave id to the
        // PDF generation API so the PDF embeds the same code saved to DB.
        const payload = {
          ...formData,
          hospital_logo: hospitalLogo || "",
          leave_id: capturedLeaveId,
        };
        const resp = await fetch("/api/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err?.message || `HTTP ${resp.status}`);
        }
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        if (typeof window !== "undefined") {
          window.open(url, "_blank");
        }
        return { ok: true, message: "تم توليد ملف PDF وفتحه للطباعة" };
      } catch (e: any) {
        return { ok: false, message: e?.message || "فشل توليد PDF" };
      }
    })();

    const uploadPromise = (async () => {
      try {
        const resp = await fetch("/api/upload-leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, leave_id: capturedLeaveId }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data.success) {
          return { ok: false, message: data?.message || `HTTP ${resp.status}`, leaveId: data?.leave_id, recordId: data?.record_id };
        }
        return { ok: true, message: data.message || "تم حفظ البيانات في Vercel Postgres", leaveId: data.leave_id, recordId: data.record_id };
      } catch (e: any) {
        return { ok: false, message: e?.message || "فشل حفظ البيانات" };
      }
    })();

    const [pdfRes, uploadRes] = await Promise.all([pdfPromise, uploadPromise]);

    setAction({
      pdf: pdfRes.ok ? "success" : "error",
      upload: uploadRes.ok ? "success" : "error",
      pdfMessage: pdfRes.message,
      uploadMessage: uploadRes.message,
      leaveId: uploadRes.leaveId || (pdfRes.ok ? computed.leaveId : undefined),
      recordId: uploadRes.recordId,
    });

    if (pdfRes.ok && uploadRes.ok) {
      toast({
        title: "تم بنجاح",
        description: "طُبع ملف PDF وحُفظت البيانات في قاعدة بيانات Vercel Postgres.",
      });
    } else if (pdfRes.ok) {
      toast({
        title: "تم الطباعة، فشل الحفظ",
        description: uploadRes.message,
        variant: "destructive",
      });
    } else if (uploadRes.ok) {
      toast({
        title: "تم الحفظ، فشل الطباعة",
        description: pdfRes.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "فشل العمليتان",
        description: `PDF: ${pdfRes.message} | حفظ: ${uploadRes.message}`,
        variant: "destructive",
      });
    }
  };

  const handlePrintAgain = () => {
    if (pdfBlobUrl) {
      window.open(pdfBlobUrl, "_blank");
    }
  };

  // --- Inquiry ---
  // highlights: السجل الذي تم حفظه/طباعته للتو ليُبرز في نتائج الاستعلام
  const [highlightId, setHighlightId] = useState<number | null>(null);

  const handleSearch = useCallback(
    async (overrideValue?: string, overrideMode?: "gsl" | "id" | "q") => {
      const value = (overrideValue ?? searchValue).trim();
      const mode = overrideMode ?? searchMode;
      if (!value) {
        toast({ title: "أدخل قيمة للبحث", variant: "destructive" });
        return;
      }
      setSearching(true);
      setHasSearched(true);
      try {
        const params = new URLSearchParams();
        params.set(mode, value);
        const resp = await fetch(`/api/inquire?${params.toString()}`);
        const data = await resp.json();
        if (!resp.ok || !data.success) {
          throw new Error(data?.message || "فشل البحث");
        }
        setRecords(data.records || []);
        toast({
          title: `تم العثور على ${data.count} سجل`,
          description:
            data.count === 0
              ? "لا توجد نتائج مطابقة."
              : "اضغط على أي سجل لتحميله في النموذج.",
        });
      } catch (e: any) {
        setRecords([]);
        toast({
          title: "فشل البحث",
          description: e?.message || "خطأ في الاستعلام",
          variant: "destructive",
        });
      } finally {
        setSearching(false);
      }
    },
    [searchMode, searchValue, toast],
  );

  /**
   * بعد نجاح الطباعة + الحفظ، يفتح تبويب الاستعلامات ويبحث تلقائياً
   * برمز الإجازة (GSL) الذي تم حفظه للتو. يبرز السجل الجديد في النتائج.
   */
  const handleViewInInquiry = useCallback(async () => {
    if (!action.leaveId) {
      toast({ title: "لا يوجد سجل محفوظ بعد", variant: "destructive" });
      return;
    }
    // انتقل لتبويب الاستعلامات واضبط البحث على رمز الإجازة
    setActiveTab("inquiry");
    setSearchMode("gsl");
    setSearchValue(action.leaveId);
    setHighlightId(action.recordId ?? null);
    // اترك وقتاً قصيراً لانتقال التبويب ثم نفّذ البحث
    await new Promise((r) => setTimeout(r, 150));
    await handleSearch(action.leaveId, "gsl");
  }, [action.leaveId, action.recordId, handleSearch]);

  const handleLoadRecord = (r: any) => {
    const form = recordToForm(r);
    setFormData(form);
    setActiveTab("new");
    setAction(INITIAL_ACTION);
    setHighlightId(null);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    toast({
      title: "تم تحميل السجل",
      description: `سجل ${r.gslCode} محمّل في النموذج. يمكنك تعديله أو إعادة طباعته.`,
    });
  };

  // Group fields
  const grouped = useMemo(() => {
    const g: Record<string, FieldMeta[]> = { patient: [], leave: [], doctor: [], hospital: [] };
    for (const f of FIELDS) g[f.group].push(f);
    return g;
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white seha-entry-page">
      {/* ===== ترويسة مطابقة 100% لـ seha.sa الأصلية (خلفية فاتحة + شعار ملوّن + زر قائمة 3 خطوط) ===== */}
      <style>{SEHA_ENTRY_STYLES}</style>
      <div style={{ zIndex: 99, opacity: 1, transform: "none" }}>
        <nav className="seha-header navbar-expand-lg navbar-light px-4">
          <div className="nav-container">
            {/* الشعار الملوّن — مرئي بدون filter على الخلفية الفاتحة */}
            <a className="" href="/" aria-label="الرئيسية">
              <img
                src="/images/seha-color-logo.svg"
                alt="صحة - منصة الخدمات الصحية"
                className="seha-logo"
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

            {/* القائمة — قابلة للطي على الموبايل، مرئية دائماً على الديسكتوب */}
            <div
              className={`white justify-content-around navbar-collapse collapse${menuOpen ? " show" : ""}`}
              id="responsive-navbar-nav"
              style={menuOpen ? { display: "block" } : undefined}
            >
              <div className="navbar justify-content-around navbar-nav">
                <a
                  data-rr-ui-event-key="1"
                  className="link nav-link active"
                  href="/"
                  onClick={closeMenu}
                >
                  الرئيسية
                </a>
                <a
                  data-rr-ui-event-key="2"
                  className="link nav-link"
                  href="/#services"
                  onClick={closeMenu}
                >
                  الخدمات
                </a>
                <a
                  data-rr-ui-event-key="3"
                  className="link nav-link"
                  href="/inquiries/slenquiry"
                  onClick={closeMenu}
                >
                  الاستعلامات
                </a>
                <a
                  data-rr-ui-event-key="4"
                  className="link nav-link"
                  href="/#faq"
                  onClick={closeMenu}
                >
                  الأسئلة الشائعة
                </a>
                <a
                  data-rr-ui-event-key="5"
                  className="link nav-link"
                  href="/#contactus"
                  onClick={closeMenu}
                >
                  تواصل معنا
                </a>
              </div>
              <div className="navbar justify-content-end navbar-nav">
                <a
                  data-rr-ui-event-key="6"
                  className="nav-link"
                  href="/#signup"
                  onClick={closeMenu}
                >
                  <p>إنشاء حساب</p>
                </a>
                <a
                  data-rr-ui-event-key="7"
                  className="login nav-link"
                  href="/#login"
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                  onClick={closeMenu}
                >
                  <p style={{ margin: 0 }}>تسجيل الدخول</p>
                </a>
              </div>
            </div>
          </div>
        </nav>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="new" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              إصدار إجازة جديدة
            </TabsTrigger>
            <TabsTrigger value="inquiry" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              الإجازات السابقة
            </TabsTrigger>
          </TabsList>

          {/* ====================================================== */}
          {/*  TAB 1: New leave                                      */}
          {/* ====================================================== */}
          <TabsContent value="new" className="space-y-6">
            {/* Smart paste */}
            <Card className="border-2 border-[#306db5]/30 shadow-sm">
              <CardHeader className="bg-[#306db5]/5 border-b border-[#306db5]/15">
                <CardTitle className="flex items-center gap-2 text-[#2c3e77]">
                  <ClipboardPaste className="w-5 h-5" />
                  الصندوق الذكي — لصق الاستمارة وتعبئة تلقائية
                </CardTitle>
                <CardDescription>
                  الصق هنا نص الاستمارة التي كان يستخدمها البوت (بنفس الصيغة التي تحتوي على الرموز التعبيرية
                  👤 🆔 🌍 🏢 👨‍⚕️ 💼 📅 🏥 🔢 ⏰)، ثم اضغط (تعبئة تلقائية) فتُملأ الحقول تلقائياً في الأسفل.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <Textarea
                  dir="rtl"
                  value={pasteText}
                  onChange={(e) => {
                    setPasteText(e.target.value);
                    setPasteStats(null);
                  }}
                  placeholder={SAMPLE_MESSAGE}
                  className="min-h-[200px] font-mono text-sm leading-6 bg-white"
                />
                {pasteStats && (
                  <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4" />
                    <AlertTitle>تمت التعبئة</AlertTitle>
                    <AlertDescription>
                      حُددت <strong>{pasteStats.matched}</strong> من <strong>{pasteStats.total}</strong> حقلاً.
                      راجع الحقول بالأسفل وعدّلها إن لزم، ثم اضغط (طباعة PDF + حفظ البيانات).
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap items-center gap-2 border-t pt-4 bg-[#306db5]/5">
                <Button onClick={handleSmartPaste} className="bg-[#306db5] hover:bg-[#285d9e] text-white" disabled={isBusy}>
                  <Wand2 className="w-4 h-4 ml-1" />
                  تعبئة تلقائية
                </Button>
                <Button variant="outline" onClick={handleLoadSample} disabled={isBusy}>
                  <Eye className="w-4 h-4 ml-1" />
                  تحميل مثال
                </Button>
                <Button variant="ghost" onClick={() => { setPasteText(""); setPasteStats(null); }} disabled={isBusy}>
                  مسح الصندوق
                </Button>
              </CardFooter>
            </Card>

            {/* Logo Upload */}
            <Card className="border-2 border-emerald-300/50 shadow-sm">
              <CardHeader className="bg-emerald-50/50 border-b border-emerald-200/50">
                <CardTitle className="flex items-center gap-2 text-[#2c3e77]">
                  <ImageIcon className="w-5 h-5" />
                  شعار المنشأة (يظهر في ملف PDF)
                </CardTitle>
                <CardDescription>
                  ارفع شعار المستشفى أو المنشأة الطبية بصيغة PNG أو JPG (الحد الأقصى 5 ميغابايت).
                  سيظهر الشعار في أسفل ملف PDF فقط، فوق اسم المنشأة. إن لم ترفع
                  شعاراً، سيُستخدم الشعار الافتراضي.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      ref={fileInputRef}
                      id="logo-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp"
                      onChange={handleLogoUpload}
                      disabled={isBusy}
                      className="block w-full text-sm text-slate-600 file:ml-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-[#306db5] file:text-white hover:file:bg-[#285d9e] file:cursor-pointer cursor-pointer disabled:opacity-50"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">
                      الأنواع المدعومة: PNG, JPG, GIF, WebP, BMP. الحد الأقصى 5 ميغابايت.
                    </p>
                  </div>
                  {hospitalLogo && (
                    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                      <img
                        src={hospitalLogo}
                        alt="معاينة الشعار"
                        className="w-16 h-16 object-contain bg-white rounded border border-slate-200"
                      />
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          تم رفع الشعار
                        </div>
                        <div className="text-xs text-slate-600 max-w-[200px] truncate" title={logoFileName}>
                          {logoFileName}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          disabled={isBusy}
                          className="h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
                        >
                          <Trash2 className="w-3.5 h-3.5 ml-1" />
                          حذف الشعار
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Form */}
            <Card className="shadow-sm">
              <CardHeader className="bg-slate-50 border-b">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-[#2c3e77]">حقول الاستمارة</CardTitle>
                    <CardDescription>
                      عدّل أي حقل يدوياً بعد التعبئة التلقائية أو أدخل البيانات من الصفر.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isBusy}>
                      <Save className="w-4 h-4 ml-1" />
                      حفظ مسودة
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleLoadDraft} disabled={isBusy}>
                      <RotateCcw className="w-4 h-4 ml-1" />
                      استرجاع مسودة
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={isBusy}>
                      <RotateCcw className="w-4 h-4 ml-1" />
                      مسح الكل
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryTile label="رمز الإجازة" value={computed.leaveId} />
                  <SummaryTile label="عدد الأيام" value={String(computed.days)} />
                  <SummaryTile label="تاريخ الدخول" value={computed.admissionDisp || "—"} />
                  <SummaryTile label="تاريخ الخروج" value={computed.dischargeDisp || "—"} />
                </div>

                {/* ===== نوع المنشأة الصحية =====
                    يحدد بادئة رمز الإجازة:
                      - مشفى عام       → GSL
                      - مشفى خاص/أهلي  → PSL
                    الاختيار ينعكس فوراً على "رمز الإجازة" المعروض في الأعلى. */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[220px]">
                      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <span aria-hidden>🏥</span>
                        نوع المنشأة الصحية
                      </Label>
                      <p className="text-xs text-slate-500 mt-1">
                        يُحدد بادئة رمز الإجازة: <span className="font-mono font-semibold text-[#2c3e77]">GSL</span> للمشفى العام،{" "}
                        <span className="font-mono font-semibold text-[#2c3e77]">PSL</span> للمشفى الخاص/الأهلي.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateField("hospital_type", "public")}
                        disabled={isBusy}
                        aria-pressed={formData.hospital_type !== "private"}
                        className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors disabled:opacity-50 ${
                          formData.hospital_type !== "private"
                            ? "bg-[#306db5] text-white border-[#306db5] shadow-sm"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        🏥 مشفى عام
                        <span className="mr-1 text-[10px] font-mono opacity-75">(GSL)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField("hospital_type", "private")}
                        disabled={isBusy}
                        aria-pressed={formData.hospital_type === "private"}
                        className={`px-4 py-2 rounded-md text-sm font-semibold border transition-colors disabled:opacity-50 ${
                          formData.hospital_type === "private"
                            ? "bg-[#306db5] text-white border-[#306db5] shadow-sm"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        🏥 مشفى خاص
                        <span className="mr-1 text-[10px] font-mono opacity-75">(PSL)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {(["patient", "leave", "doctor", "hospital"] as const).map((groupKey) => (
                  <section key={groupKey} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[#2c3e77] bg-[#306db5]/10">
                        {GROUP_LABELS[groupKey].icon} {GROUP_LABELS[groupKey].ar}
                      </Badge>
                      <Separator className="flex-1 bg-slate-200" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {grouped[groupKey].map((field) => (
                        <FieldInput
                          key={field.key}
                          field={field}
                          value={(formData[field.key] as string) ?? ""}
                          onChange={(v) => updateField(field.key, v)}
                          disabled={isBusy}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </CardContent>
            </Card>

            {/* Action */}
            <Card className="border-2 border-[#306db5]/40 shadow-md">
              <CardHeader className="bg-gradient-to-l from-[#306db5]/10 to-transparent border-b">
                <CardTitle className="text-[#2c3e77] flex items-center gap-2">
                  <Printer className="w-5 h-5" />
                  طباعة التقرير وحفظ البيانات
                </CardTitle>
                <CardDescription>
                  بضغطة واحدة: يُولَّد ملف PDF ويُفتح للطباعة، وتُحفظ البيانات في قاعدة Vercel Postgres في نفس اللحظة.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {!isValid && (
                  <Alert variant="destructive">
                    <Info className="w-4 h-4" />
                    <AlertTitle>حقول مطلوبة</AlertTitle>
                    <AlertDescription>
                      يرجى تعبئة الحقول التالية قبل الطباعة: {validation.join("، ")}.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StatusBlock
                    title="حالة الطباعة (PDF)"
                    status={action.pdf}
                    message={action.pdfMessage}
                    icon={<FileText className="w-5 h-5" />}
                    onAction={
                      action.pdf === "success" && pdfBlobUrl
                        ? { label: "فتح PDF مجدداً", onClick: handlePrintAgain }
                        : undefined
                    }
                  />
                  <StatusBlock
                    title="حالة الحفظ (Vercel Postgres)"
                    status={action.upload}
                    message={action.uploadMessage}
                    icon={<Database className="w-5 h-5" />}
                    extra={
                      action.leaveId && action.upload !== "idle"
                        ? `رمز الإجازة: ${action.leaveId}`
                        : undefined
                    }
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    onClick={handlePrintAndUpload}
                    disabled={!isValid || isBusy}
                    className="bg-[#2c3e77] hover:bg-[#243559] text-white text-base h-12 px-6"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                        جارٍ الطباعة والحفظ...
                      </>
                    ) : (
                      <>
                        <Printer className="w-5 h-5 ml-2" />
                        طباعة PDF + حفظ البيانات
                      </>
                    )}
                  </Button>
                  {pdfBlobUrl && (
                    <Button variant="outline" asChild>
                      <a href={pdfBlobUrl} download={`sick_leave_${computed.leaveId}.pdf`} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4 ml-1" />
                        تنزيل ملف PDF
                      </a>
                    </Button>
                  )}
                  {action.upload === "success" && action.leaveId && (
                    <Button
                      onClick={handleViewInInquiry}
                      variant="default"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-12"
                    >
                      <Search className="w-5 h-5 ml-2" />
                      عرض في الاستعلامات
                    </Button>
                  )}
                </div>

                {/* رسالة توضيحية تربط الطباعة بالاستعلام */}
                {action.upload === "success" && action.leaveId && (
                  <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4" />
                    <AlertTitle>تم رفع البيانات للاستعلامات</AlertTitle>
                    <AlertDescription>
                      رمز الإجازة <strong dir="ltr">{action.leaveId}</strong> محفوظ الآن في قاعدة البيانات.
                      اضغط <strong>"عرض في الاستعلامات"</strong> للانتقال إلى تبويب الاستعلامات ورؤية السجل تلقائياً.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====================================================== */}
          {/*  TAB 2: Inquiry / past records                         */}
          {/* ====================================================== */}
          <TabsContent value="inquiry" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="flex items-center gap-2 text-[#2c3e77]">
                  <Search className="w-5 h-5" />
                  البحث في الإجازات السابقة
                </CardTitle>
                <CardDescription>
                  ابحث في قاعدة بيانات Vercel Postgres عن الإجازات المرضية السابقة. يمكنك البحث برمز الإجازة
                  (GSL) أو رقم الهوية أو نص حر.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label className="text-xs">نوع البحث</Label>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={searchMode === "gsl" ? "default" : "outline"}
                        onClick={() => setSearchMode("gsl")}
                        className={searchMode === "gsl" ? "bg-[#306db5] hover:bg-[#285d9e]" : ""}
                      >
                        رمز الإجازة
                      </Button>
                      <Button
                        size="sm"
                        variant={searchMode === "id" ? "default" : "outline"}
                        onClick={() => setSearchMode("id")}
                        className={searchMode === "id" ? "bg-[#306db5] hover:bg-[#285d9e]" : ""}
                      >
                        رقم الهوية
                      </Button>
                      <Button
                        size="sm"
                        variant={searchMode === "q" ? "default" : "outline"}
                        onClick={() => setSearchMode("q")}
                        className={searchMode === "q" ? "bg-[#306db5] hover:bg-[#285d9e]" : ""}
                      >
                        نص حر
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="search-value" className="text-xs">قيمة البحث</Label>
                    <Input
                      id="search-value"
                      dir="ltr"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder={
                        searchMode === "gsl"
                          ? "GSL20251234567"
                          : searchMode === "id"
                          ? "828287654"
                          : "عبدالله أو GSL أو رقم الهوية..."
                      }
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={searching} className="bg-[#2c3e77] hover:bg-[#243559] h-10">
                    {searching ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Search className="w-4 h-4 ml-2" />}
                    بحث
                  </Button>
                </div>

                {/* Results */}
                {hasSearched && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>عدد النتائج: {records.length}</span>
                      <Button variant="ghost" size="sm" onClick={handleSearch} disabled={searching}>
                        <RefreshCw className="w-3 h-3 ml-1" />
                        تحديث
                      </Button>
                    </div>

                    {records.length === 0 ? (
                      <Alert>
                        <Info className="w-4 h-4" />
                        <AlertTitle>لا توجد نتائج</AlertTitle>
                        <AlertDescription>
                          لم يتم العثور على سجلات مطابقة. جرّب قيمة بحث أخرى أو تغيير نوع البحث.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-2 max-h-[600px] overflow-y-auto pl-1">
                        {records.map((r) => (
                          <RecordCard
                            key={r.id}
                            record={r}
                            highlight={r.id === highlightId}
                            onLoad={() => handleLoadRecord(r)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!hasSearched && (
                  <Alert className="bg-[#306db5]/5 border-[#306db5]/20">
                    <Database className="w-4 h-4" />
                    <AlertTitle>قاعدة البيانات جاهزة</AlertTitle>
                    <AlertDescription>
                      ابحث برمز الإجازة GSL (الأكثر دقة)، أو برقم الهوية (لعرض كل إجازات نفس المريض)،
                      أو بنص حر في الأسماء والأرقام. عند النقر على أي نتيجة، يُحمَّل السجل في النموذج لتعديله
                      أو إعادة طباعته.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t bg-slate-50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-slate-500">
          منصة إصدار تقرير الإجازة المرضية — تعمل بالكامل على Vercel (Next.js + Vercel Postgres).
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
 *  أنماط الترويسة على صفحة الإدخال — مطابقة 100% لـ seha.sa الأصلية
 *  نفس القيم المستخدمة في /inquiries/slenquiry لضمان تطابق الترويسة
 * ============================================================ */
const SEHA_ENTRY_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');

.seha-entry-page {
  font-family: 'Cairo', sans-serif;
}

/* Bootstrap utility classes */
.d-none { display: none !important; }
.d-inline-flex { display: inline-flex !important; }
.d-flex { display: flex !important; }
.justify-content-end { justify-content: flex-end !important; }
.justify-content-around { justify-content: space-around !important; }
.align-items-center { align-items: center !important; }
.collapse:not(.show) { display: none; }
@media (max-width: 991.98px) {
  .d-lg-none { display: flex !important; }
}
@media (min-width: 992px) {
  .d-lg-none { display: none !important; }
  .d-xl-none { display: none !important; }
}

/* Header — مطابق لـ seha.sa الأصلية */
.seha-header, .navbar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  z-index: 999;
  width: 100%;
  position: sticky;
  background-color: rgb(248, 249, 251) !important;
  padding: 0% 2% !important;
  box-shadow: rgba(99, 99, 99, 0.15) 0px 2px 8px 0px;
}
@media (min-width: 992px) {
  .seha-header, .navbar {
    box-shadow: none;
  }
}
@media (min-width: 1200px) {
  .seha-header, .navbar {
    padding-inline: 4% !important;
  }
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

.seha-header .seha-logo,
.navbar .seha-logo {
  flex: 0.5 1 0%;
  margin-inline-start: 2px;
  z-index: 999;
  width: 90px;
  height: auto;
}
@media (min-width: 768px) {
  .seha-header .seha-logo,
  .navbar .seha-logo {
    width: auto;
    height: 50px;
  }
}

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
  background-image: url("data:image/svg+xml,%3csvg%20id='ios-menu'%20xmlns='http://www.w3.org/2000/svg'%20width='23.2'%20height='15.75'%20viewBox='0%200%2023.2%2015.75'%3e%3cpath%20id='Path_8753'%20data-name='Path%208753'%20d='M26.734,12.375H5.467A1.058,1.058,0,0,1,4.5,11.25a1.058,1.058,0,0,1,.967-1.125H26.734A1.058,1.058,0,0,1,27.7,11.25,1.058,1.058,0,0,1,26.734,12.375Z'%20transform='translate(-4.5%20-10.125)'%20fill='%237eb7db'/%3e%3cpath%20id='Path_8754'%20data-name='Path%208754'%20d='M26.734,19.125H5.467a1.138,1.138,0,0,1,0-2.25H26.734a1.138,1.138,0,0,1,0,2.25Z'%20transform='translate(-4.5%20-10.125)'%20fill='%237eb7db'/%3e%3cpath%20id='Path_8755'%20data-name='Path%208755'%20d='M26.734,25.875H5.467a1.138,1.138,0,0,1,0-2.25H26.734a1.138,1.138,0,0,1,0,2.25Z'%20transform='translate(-4.5%20-10.125)'%20fill='%237eb7db'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 100% 100%;
}
.menu .navbar-toggler:not(.collapsed) .navbar-toggler-icon {
  width: 50%;
  background-image: url("data:image/svg+xml,%3csvg%20id='ios-menu'%20xmlns='http://www.w3.org/2000/svg'%20width='17.997'%20height='17.996'%20viewBox='0%200%2017.997%2017.996'%3e%3cpath%20id='Path_8753'%20data-name='Path%208753'%20d='M22.234,2.25H.967A1.058,1.058,0,0,1,0,1.125,1.058,1.058,0,0,1,.967,0H22.234A1.058,1.058,0,0,1,23.2,1.125,1.058,1.058,0,0,1,22.234,2.25Z'%20transform='translate(0%2016.405)%20rotate(-45)'%20fill='%237eb7db'/%3e%3cpath%20id='Path_8755'%20data-name='Path%208755'%20d='M22.234,2.25H.967A1.058,1.058,0,0,1,0,1.125,1.058,1.058,0,0,1,.967,0H22.234A1.058,1.058,0,0,1,23.2,1.125,1.058,1.058,0,0,1,22.234,2.25Z'%20transform='translate(16.406%2017.996)%20rotate(-135)'%20fill='%237eb7db'/%3e%3c/svg%3e");
}

.white.navbar-collapse.collapse {
  display: none !important;
  visibility: visible !important;
}
.white.navbar-collapse.collapse.show {
  display: block !important;
  visibility: visible !important;
}
@media (min-width: 992px) {
  .white.navbar-collapse.collapse {
    display: flex !important;
    visibility: visible !important;
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
@media (max-width: 991.98px) {
  .white.navbar-collapse.collapse.show {
    width: 100%;
    margin-top: 0;
    font-weight: 700;
    padding-top: 30%;
    padding-bottom: 40px;
    background-color: rgb(248, 249, 251);
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 1;
    box-shadow: rgba(99, 99, 99, 0.2) 0px 4px 2px -2px;
    visibility: visible !important;
  }
}

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
  color: #306DB5;
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

.navbar-nav .link.active {
  color: rgb(48, 109, 181);
  font-weight: 700;
  text-decoration-line: underline;
  text-underline-offset: 6px;
  text-decoration-thickness: 3px;
  text-decoration-color: rgb(126, 183, 219);
}

.seha-header .login,
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
  .seha-header .login,
  .navbar .login {
    justify-content: unset;
    margin-top: 0px;
    margin-inline: 30px;
    padding-inline: 50px;
    gap: unset;
  }
}
.seha-header .login:hover,
.navbar .login:hover {
  color: rgb(255, 255, 255);
  background-color: rgb(44, 62, 119);
}
`;

/* ============================ Sub-components ============================ */

function FieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldMeta;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const isAr = field.key.endsWith("_ar") || field.key === "patient_name_ar";
  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.key} className="text-xs sm:text-sm flex items-center gap-1.5 text-slate-700">
        <span aria-hidden>{field.emoji}</span>
        <span>{field.labelAr}</span>
        <span className="text-slate-400 text-[10px]">({field.labelEn})</span>
      </Label>
      <Input
        id={field.key}
        dir={isAr ? "rtl" : "ltr"}
        type={field.type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled}
        className="bg-white"
      />
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-sm font-bold text-[#2c3e77] truncate" title={value}>
        {value}
      </div>
    </div>
  );
}

function StatusBlock({
  title,
  status,
  message,
  icon,
  onAction,
  extra,
}: {
  title: string;
  status: StepStatus;
  message?: string;
  icon: React.ReactNode;
  onAction?: { label: string; onClick: () => void };
  extra?: string;
}) {
  const palette: Record<StepStatus, { bg: string; border: string; text: string; iconBg: string; iconColor: string }> = {
    idle: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", iconBg: "bg-slate-100", iconColor: "text-slate-500" },
    loading: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", iconBg: "bg-amber-100", iconColor: "text-amber-700" },
    success: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", iconBg: "bg-emerald-100", iconColor: "text-emerald-700" },
    error: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", iconBg: "bg-rose-100", iconColor: "text-rose-700" },
  };
  const p = palette[status];
  const statusText: Record<StepStatus, string> = {
    idle: "بانتظار التنفيذ",
    loading: "جارٍ التنفيذ...",
    success: "تم بنجاح",
    error: "فشل",
  };
  return (
    <div className={`rounded-lg border ${p.border} ${p.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full ${p.iconBg} ${p.iconColor} flex items-center justify-center shrink-0`}>
          {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : status === "success" ? <CheckCircle2 className="w-5 h-5" /> : status === "error" ? <XCircle className="w-5 h-5" /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-slate-800">{title}</h4>
            <Badge variant="outline" className={`${p.text} ${p.border} bg-transparent`}>
              {statusText[status]}
            </Badge>
          </div>
          {message && <p className={`text-xs ${p.text} mt-1 break-words`}>{message}</p>}
          {extra && <p className="text-xs text-slate-600 mt-1">{extra}</p>}
          {onAction && (
            <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-[#306db5]" onClick={onAction.onClick}>
              {onAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordCard({
  record,
  onLoad,
  highlight = false,
}: {
  record: any;
  onLoad: () => void;
  highlight?: boolean;
}) {
  const created = record.createdAt ? new Date(record.createdAt).toLocaleString("ar-SA") : "";
  return (
    <div
      className={`rounded-lg border-2 p-4 transition-all ${
        highlight
          ? "border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200"
          : "border-slate-200 bg-white hover:border-[#306db5] hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-[#2c3e77] text-white">{record.gslCode}</Badge>
            {highlight && (
              <Badge className="bg-emerald-600 text-white">
                <CheckCircle2 className="w-3 h-3 ml-1" />
                السجل الحديث
              </Badge>
            )}
            <span className="font-bold text-slate-800">{record.nameAr}</span>
            {record.nameEn && <span className="text-xs text-slate-500">({record.nameEn})</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 mt-2">
            <div>
              <div className="text-slate-400">رقم الهوية</div>
              <div className="font-mono" dir="ltr">{record.identityNumber}</div>
            </div>
            <div>
              <div className="text-slate-400">الدخول</div>
              <div dir="ltr">{record.dateFrom}</div>
            </div>
            <div>
              <div className="text-slate-400">الخروج</div>
              <div dir="ltr">{record.dateTo}</div>
            </div>
            <div>
              <div className="text-slate-400">عدد الأيام</div>
              <div>{record.dayCount}</div>
            </div>
          </div>
          {record.hospitalNameAr && (
            <div className="text-xs text-slate-600 mt-1">
              🏥 {record.hospitalNameAr}
              {record.doctorNameAr && <> · 👨‍⚕️ {record.doctorNameAr}</>}
            </div>
          )}
          {created && <div className="text-[10px] text-slate-400 mt-1">أُنشئ في: {created}</div>}
        </div>
        <Button onClick={onLoad} size="sm" variant="outline" className="shrink-0">
          <ArrowLeftRight className="w-4 h-4 ml-1" />
          تحميل في النموذج
        </Button>
      </div>
    </div>
  );
}
