import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The technical notes page became "About"; keep old links working.
  async redirects() {
    return [{ source: "/:lang(en|fr)/notes", destination: "/:lang/about", permanent: true }];
  },
  experimental: {
    // Test-result CSVs from a season of school testing can exceed the 1 MB default.
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
