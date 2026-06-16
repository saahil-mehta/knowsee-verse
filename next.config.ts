import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone server output for the Cloud Run Docker image.
  output: "standalone",
  cacheComponents: true,
  serverExternalPackages: ["pdfkit", "docx", "puppeteer-core"],
  images: {
    remotePatterns: [
      {
        // GCS-hosted uploads (deploy). Local dev uploads are data URLs.
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
