/**
 * صفحة الاستعلام عن الإجازة المرضية
 * ===================================
 * مسار: /inquiries/slenquiry
 *
 * هذه صفحة منفصلة عن لوحة الإدخال الرئيسية. الزائر يدخل:
 *   1. رمز الإجازة (GSL...) أو رقم الهوية
 *   2. يضغط "استعلام"
 * فتُعرض بيانات الإجازة المرضية كاملة (مثل بطاقة تفصيلية) مع زر لتحميل PDF.
 *
 * الفكرة مطابقة لمنصة seha.sa/#/inquiries/slenquiry — استبدلنا البوت بصفحة إدخال،
 * لكن صفحة الاستعلام تبقى كما هي: أي شخص يملك الرمز + رقم الهوية يمكنه الاستعلام.
 *
 * This is the inquiry page (separate from the data-entry page). A visitor
 * enters the leave code (GSL...) and/or national ID and clicks "Inquire"
 * to retrieve and display the full leave record, with a download-PDF button.
 */

"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
  Building2,
  User,
  Calendar,
  Stethoscope,
  Hash,
  Globe,
} from "lucide-react";

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

// عرض التاريخ بصيغة DD-MM-YYYY (نفس صيغة الإدخال في لوحة الإدخال)
function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return iso;
}

function emptyOrDash(s: string | null | undefined): string {
  if (!s) return "-";
  const t = s.trim();
  if (!t) return "-";
  return t;
}

export default function SlenquiryPage() {
  const { toast } = useToast();
  const [leaveCode, setLeaveCode] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [searched, setSearched] = useState(false);

  const onSearch = useCallback(async () => {
    const code = leaveCode.trim();
    const id = idNumber.trim();
    if (!code && !id) {
      setError("الرجاء إدخال رمز الإجازة أو رقم الهوية على الأقل.");
      return;
    }
    setLoading(true);
    setError(null);
    setRecords([]);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (code) params.set("gsl", code);
      if (id) params.set("id", id);
      const res = await fetch(`/api/inquire?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `فشل الاستعلام (HTTP ${res.status})`);
      }
      if (!data.success) {
        throw new Error(data?.message || "فشل الاستعلام");
      }
      setRecords((data.records || []) as LeaveRecord[]);
      if ((data.records || []).length === 0) {
        setError("لم يتم العثور على إجازة مرضية بهذه البيانات.");
      } else {
        toast({
          title: "تم الاستعلام بنجاح",
          description: `عُثر على ${data.count} نتيجة.`,
        });
      }
    } catch (e: any) {
      setError(e?.message || "خطأ غير متوقع أثناء الاستعلام.");
    } finally {
      setLoading(false);
    }
  }, [leaveCode, idNumber, toast]);

  const onReset = () => {
    setLeaveCode("");
    setIdNumber("");
    setError(null);
    setRecords([]);
    setSearched(false);
  };

  // إعادة تعبئة بيانات النموذج الرئيسي بناءً على سجل موجود
  const onGoToEntryPage = (rec: LeaveRecord) => {
    try {
      const stored = {
        id_number: rec.identityNumber,
        patient_name_ar: rec.nameAr,
        patient_name_en: rec.nameEn || "",
        nationality_ar: rec.nationalityAr || "",
        nationality_en: rec.nationalityEn || "",
        employer_ar: rec.employer || "",
        employer_en: rec.employerEn || "",
        doctor_name_ar: rec.doctorNameAr || "",
        doctor_name_en: rec.doctorNameEn || "",
        position_ar: rec.doctorSpecialtyAr || "",
        position_en: rec.doctorSpecialtyEn || "",
        hospital_name_ar: rec.hospitalNameAr || "",
        hospital_name_en: rec.hospitalNameEn || "",
        license_number: rec.licenseNumber || "",
        admission_date_gregorian: formatDate(rec.dateFrom),
        discharge_date_gregorian: formatDate(rec.dateTo),
        time: rec.timeFrom || "",
      };
      sessionStorage.setItem("slenquiry:prefill", JSON.stringify(stored));
      window.location.href = "/";
    } catch {
      /* ignore */
    }
  };

  const onDownloadPdf = async (rec: LeaveRecord) => {
    try {
      toast({ title: "جارٍ توليد ملف PDF...", description: "قد يستغرق بضع ثوانٍ." });
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_number: rec.identityNumber,
          patient_name_ar: rec.nameAr,
          patient_name_en: rec.nameEn || rec.nameAr,
          nationality_ar: rec.nationalityAr || "",
          nationality_en: rec.nationalityEn || "",
          employer_ar: rec.employer || "",
          employer_en: rec.employerEn || "",
          doctor_name_ar: rec.doctorNameAr || "",
          doctor_name_en: rec.doctorNameEn || "",
          position_ar: rec.doctorSpecialtyAr || "",
          position_en: rec.doctorSpecialtyEn || "",
          hospital_name_ar: rec.hospitalNameAr || "",
          hospital_name_en: rec.hospitalNameEn || "",
          license_number: rec.licenseNumber || "",
          admission_date_gregorian: formatDate(rec.dateFrom),
          discharge_date_gregorian: formatDate(rec.dateTo),
          issue_date_gregorian: rec.issueDate ? formatDate(rec.issueDate) : formatDate(rec.dateFrom),
          time: rec.timeFrom || "",
          hospital_logo: "",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || `فشل توليد PDF (HTTP ${res.status})`);
      }
      const buf = await res.arrayBuffer();
      const blob = new Blob([buf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sick_leave_${rec.gslCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "تم تنزيل ملف PDF", description: rec.gslCode });
    } catch (e: any) {
      toast({
        title: "فشل تنزيل PDF",
        description: e?.message || "خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50"
      dir="rtl"
    >
      {/* ===== Header ===== */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/seha-logo.jpg"
              alt="منصة صحة"
              className="h-12 w-12 rounded-lg object-contain"
            />
            <div>
              <h1 className="text-lg font-bold text-sky-800">
                منصة صحة | الاستعلام عن الإجازة المرضية
              </h1>
              <p className="text-xs text-gray-500">
                Sick Leave Inquiry — Seha Platform
              </p>
            </div>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50"
          >
            <ArrowRight className="h-4 w-4" />
            الذهاب إلى لوحة الإدخال
          </a>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-8">
        {/* ===== Search Form ===== */}
        <Card className="mb-6 overflow-hidden border-sky-200 shadow-sm">
          <CardHeader className="bg-gradient-to-l from-sky-100 to-emerald-50">
            <CardTitle className="flex items-center gap-2 text-sky-900">
              <Search className="h-5 w-5" />
              استعلام عن إجازة مرضية
            </CardTitle>
            <CardDescription>
              أدخل رمز الإجازة ورقم الهوية ثم اضغط "استعلام" لعرض بيانات الإجازة.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="leaveCode" className="text-sm font-semibold">
                  رمز الإجازة (GSL...)
                </Label>
                <Input
                  id="leaveCode"
                  dir="ltr"
                  placeholder="مثال: GSL20267665111"
                  value={leaveCode}
                  onChange={(e) => setLeaveCode(e.target.value)}
                  className="text-left font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSearch();
                  }}
                />
                <p className="text-xs text-gray-500">Leave Code</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber" className="text-sm font-semibold">
                  رقم الهوية / الإقامة
                </Label>
                <Input
                  id="idNumber"
                  dir="ltr"
                  placeholder="مثال: 1122923749"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="text-left font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSearch();
                  }}
                />
                <p className="text-xs text-gray-500">National ID / Iqama</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={onSearch}
                disabled={loading}
                className="bg-sky-700 hover:bg-sky-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الاستعلام...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    استعلام
                  </>
                )}
              </Button>
              <Button onClick={onReset} variant="outline" disabled={loading}>
                إعادة تعيين
              </Button>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <XCircle className="h-4 w-4" />
                <AlertTitle>تعذّر الاستعلام</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* ===== Results ===== */}
        {searched && !loading && records.length === 0 && !error && (
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <p className="text-gray-600">لم يتم العثور على نتائج مطابقة.</p>
              <p className="mt-1 text-xs text-gray-500">
                تأكد من صحة رمز الإجازة أو رقم الهوية وحاول مرة أخرى.
              </p>
            </CardContent>
          </Card>
        )}

        {records.length > 0 && (
          <div className="space-y-6">
            {records.map((rec) => (
              <Card key={rec.id} className="overflow-hidden border-sky-200 shadow-md">
                <CardHeader className="bg-gradient-to-l from-sky-50 to-emerald-50 pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="flex flex-wrap items-center gap-2 text-sky-900">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span>إجازة مرضية معتمدة</span>
                        <Badge variant="secondary" className="font-mono">
                          {rec.gslCode}
                        </Badge>
                        <Badge variant="outline" className="text-emerald-700">
                          {rec.dayCount} {rec.dayCount === 1 ? "يوم" : "أيام"}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        أُنشئت في: {new Date(rec.createdAt).toLocaleString("ar-SA")}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => onDownloadPdf(rec)}
                        className="bg-emerald-700 hover:bg-emerald-800"
                      >
                        <Download className="h-4 w-4" />
                        تحميل PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onGoToEntryPage(rec)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        فتح في لوحة الإدخال
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {/* ===== Patient Section ===== */}
                  <section className="mb-6">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-sky-800">
                      <User className="h-4 w-4" />
                      بيانات المريض
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailItem icon={<Hash className="h-3.5 w-3.5" />} label="رقم الهوية" value={rec.identityNumber} dir="ltr" mono />
                      <DetailItem icon={<User className="h-3.5 w-3.5" />} label="الاسم (عربي)" value={rec.nameAr} />
                      <DetailItem icon={<User className="h-3.5 w-3.5" />} label="الاسم (إنجليزي)" value={rec.nameEn} dir="ltr" />
                      <DetailItem icon={<Globe className="h-3.5 w-3.5" />} label="الجنسية" value={rec.nationalityAr} />
                      <DetailItem icon={<Globe className="h-3.5 w-3.5" />} label="Nationality" value={rec.nationalityEn} dir="ltr" />
                      <DetailItem icon={<Building2 className="h-3.5 w-3.5" />} label="جهة العمل" value={rec.employer} />
                    </div>
                  </section>

                  <Separator className="my-4" />

                  {/* ===== Leave Period ===== */}
                  <section className="mb-6">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-sky-800">
                      <Calendar className="h-4 w-4" />
                      فترة الإجازة
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="تاريخ الدخول" value={formatDate(rec.dateFrom)} dir="ltr" mono />
                      <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="تاريخ الخروج" value={formatDate(rec.dateTo)} dir="ltr" mono />
                      <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="تاريخ الإصدار" value={formatDate(rec.issueDate)} dir="ltr" mono />
                      <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="الوقت" value={rec.timeFrom} dir="ltr" mono />
                    </div>
                  </section>

                  <Separator className="my-4" />

                  {/* ===== Practitioner & Hospital ===== */}
                  <section>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-sky-800">
                      <Stethoscope className="h-4 w-4" />
                      بيانات الممارس والمنشأة
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailItem icon={<Stethoscope className="h-3.5 w-3.5" />} label="اسم الممارس (عربي)" value={rec.doctorNameAr} />
                      <DetailItem icon={<Stethoscope className="h-3.5 w-3.5" />} label="Practitioner (EN)" value={rec.doctorNameEn} dir="ltr" />
                      <DetailItem icon={<Stethoscope className="h-3.5 w-3.5" />} label="التخصص" value={rec.doctorSpecialtyAr} />
                      <DetailItem icon={<Building2 className="h-3.5 w-3.5" />} label="المنشأة (عربي)" value={rec.hospitalNameAr} />
                      <DetailItem icon={<Building2 className="h-3.5 w-3.5" />} label="Hospital (EN)" value={rec.hospitalNameEn} dir="ltr" />
                      <DetailItem icon={<Hash className="h-3.5 w-3.5" />} label="رقم الترخيص" value={rec.licenseNumber} dir="ltr" mono />
                    </div>
                  </section>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ===== Help ===== */}
        {!searched && (
          <Card className="border-sky-200 bg-sky-50/50">
            <CardContent className="pt-6">
              <h3 className="mb-2 font-bold text-sky-900">كيف يعمل الاستعلام؟</h3>
              <ol className="ml-4 list-decimal space-y-1.5 text-sm text-gray-700">
                <li>أدخل رمز الإجازة (يبدأ بـ GSL) ورقم الهوية في الحقول أعلاه.</li>
                <li>اضغط زر "استعلام" لعرض بيانات الإجازة المرضية كاملة.</li>
                <li>يمكنك تحميل ملف PDF الرسمي للتقرير، أو فتح البيانات في لوحة الإدخال لإعادة الطباعة.</li>
                <li>تُحفظ جميع البيانات في قاعدة بيانات منصة صحة عند إنشاء الإجازة من لوحة الإدخال.</li>
              </ol>
              <p className="mt-4 text-xs text-gray-500">
                هذه الخدمة بديل لاستعلام البوت السابق على تيليجرام — نفس الفكرة، لكن عبر صفحة ويب.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="border-t bg-white py-4">
        <div className="container mx-auto max-w-5xl px-4 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} منصة صحة — صفحة الاستعلام عن الإجازة المرضية
        </div>
      </footer>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
  dir,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  dir?: "ltr" | "rtl";
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
        {icon}
        {label}
      </div>
      <div
        dir={dir || "rtl"}
        className={`text-sm font-medium text-gray-900 ${mono ? "font-mono" : ""}`}
      >
        {emptyOrDash(value)}
      </div>
    </div>
  );
}
