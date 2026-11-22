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
};

export default nextConfig;
