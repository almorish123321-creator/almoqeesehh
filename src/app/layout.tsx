import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "تقرير الإجازة المرضية | منصة صحة",
  description:
    "صفحة إدخال بيانات الإجازة المرضية - تطبع تقرير PDF وترفع البيانات إلى منصة صحة في نفس الوقت.",
  keywords: ["إجازة مرضية", "صحة", "تقرير طبي", "PDF", "Seha"],
  icons: {
    icon: "/images/seha-logo.jpg",
  },
};

/**
 * Links to the original CSS files copied verbatim from the
 * alehtiat-almorish repo (public/assets/css/*.css). These define
 * every visual rule used by inquiry.html — navbar, footer, form,
 * results layout, social icons. Loaded globally so the inquiry page
 * renders pixel-identical to the original.
 */
const ORIGINAL_CSS_HREFS = [
  "/assets/css/style.css",
  "/assets/css/mo.css",
  "/assets/css/ali.css",
  "/assets/css/tyi.css",
  "/assets/css/Ais.css",
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {ORIGINAL_CSS_HREFS.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        <script src="/assets/css/moh.js" type="text/javascript" defer />
      </head>
      <body
        className={`${cairo.variable} antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-cairo), system-ui, sans-serif" }}
      >
        {children}
        <Toaster />
        {/* ElevenLabs widget (same as inquiry.html original) */}
        <script
          src="https://unpkg.com/@elevenlabs/convai-widget-embed"
          async
          type="text/javascript"
        />
      </body>
    </html>
  );
}
