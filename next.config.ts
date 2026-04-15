import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const extraAllowedOrigins = (process.env.NEXT_SERVER_ACTIONS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "sahl-crm.pages.dev",
        "*.sahl-crm.pages.dev",
        "localhost:3000",
        ...extraAllowedOrigins,
      ],
    },
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
