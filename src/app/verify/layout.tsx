import type { Metadata, Viewport } from "next";

/**
 * تخطيط صفحة /verify — نفس عنوان وإعدادات العرض في verify.html الأصلي:
 *   <title>الاستعلام عن الإجازات المرضية - منصة صحة</title>
 *   <meta name="viewport" content="width=device-width, initial-scale=1.0,
 *         maximum-scale=1.0, user-scalable=no">
 */

export const metadata: Metadata = {
  title: "الاستعلام عن الإجازات المرضية - منصة صحة",
  description:
    "خدمة الاستعلام عن الإجازات المرضية تتيح لك الاستعلام عن حالة طلبك للإجازة ويمكنك طباعتها عن طريق تطبيق صحتي",
  icons: {
    icon: "/assets/images/Seha.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export default function VerifyLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
