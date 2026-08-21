import type { NextConfig } from "next";
import { join } from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: join(__dirname, "../../"),
  transpilePackages: ["@kenji-government/shared", "mapbox-gl"],
};

export default nextConfig;
