import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  outputFileTracingIncludes: { "/api/demo/*": ["../../sample-data/*.csv"] },
};

export default nextConfig;
