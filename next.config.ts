import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/me-site",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
