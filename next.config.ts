import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Test-result CSVs from a season of school testing can exceed the 1 MB default.
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
