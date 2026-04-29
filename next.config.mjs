import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  /** Prefer fresh HTML/CSS after deploys; avoids unstyled shells from stale SW caches. */
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url: { pathname }, sameOrigin }) =>
          sameOrigin && !pathname.startsWith("/api/"),
        handler: "NetworkFirst",
        method: "GET",
        options: {
          cacheName: "pages",
          expiration: { maxEntries: 16, maxAgeSeconds: 300 },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\.(?:css|less)$/i,
        handler: "NetworkFirst",
        method: "GET",
        options: {
          cacheName: "static-style-assets",
          expiration: { maxEntries: 48, maxAgeSeconds: 86400 },
          networkTimeoutSeconds: 5,
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
