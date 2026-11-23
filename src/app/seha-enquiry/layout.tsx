import type { Metadata, Viewport } from "next";

/**
 * تخطيط صفحة /seha-enquiry — نفس عنوان وإعدادات العرض في
 * seha-enquiry.html الأصلي:
 *   <title>الإجازات المرضية - منصة صحة</title>
 *   <meta name="viewport" content="width=device-width, initial-scale=1.0">
 */

export const metadata: Metadata = {
  title: "الإجازات المرضية - منصة صحة",
  description:
    "خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي",
  icons: {
    icon: "/assets/images/Seha.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export default function SehaEnquiryLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
