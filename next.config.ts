import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: [
    "pdfkit",
    "docx",
    "puppeteer-core",
    "@sparticuz/chromium",
  ],
  // @sparticuz/chromium reads its Brotli-compressed binaries from bin/ via a
  // filesystem path at runtime, not via require(), so Next's dependency tracer
  // never copies them into the serverless function bundle and
  // chromium.executablePath() throws "input directory ... does not exist",
  // returning 500 on every report export. Force the bin/ blobs into the trace.
  outputFileTracingIncludes: {
    "/api/document/export-report": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        //https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
