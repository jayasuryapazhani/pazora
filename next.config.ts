import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "same-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=()",
  },
] as const;

const allowedDevOrigin =
  process.env
    .PAZORA_ALLOWED_DEV_ORIGIN
    ?.trim();

const nextConfig: NextConfig = {
  ...(allowedDevOrigin
    ? {
        allowedDevOrigins: [
          allowedDevOrigin,
        ],
      }
    : {}),
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
        ],
      },
    ];
  },
};

export default nextConfig;