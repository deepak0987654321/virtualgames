import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.externals.push({
      "sqlite3": "commonjs sqlite3",
      "sqlite": "commonjs sqlite"
    });
    return config;
  },
};

export default nextConfig;
