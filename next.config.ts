import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;

// Restarting Next.js to reload PrismaClient and reset Turbopack compiler cache
