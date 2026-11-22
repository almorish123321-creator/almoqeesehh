import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // pdfkit reads font metric data files via __dirname at runtime, so it must
  // be required from node_modules rather than bundled by Turbopack/webpack.
  // @sparticuz/chromium likewise locates its brotli binaries via __dirname.
  serverExternalPackages: ["pdfkit", "qrcode", "puppeteer-core", "@sparticuz/chromium"],
  // Chromium's .br binaries are loaded via fs at runtime (not require), so
  // Next.js file tracing misses them — include them explicitly for the
  // /api/download-native-pdf function, otherwise Vercel deploys without
  // node_modules/@sparticuz/chromium/bin and the render fails with
  // "input directory does not exist".
  outputFileTracingIncludes: {
    "/api/download-native-pdf": ["node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
