import type { NextConfig } from "next";
import path from "node:path";

const isVercelBuild = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: isVercelBuild ? undefined : "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  outputFileTracingIncludes: { "/api/demo/*": ["../../sample-data/*.csv"] },
};

export default nextConfig;
