import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["graphql"],
  // D-194: SPA client routes — rewrite to home page so the SPA handles them
  async rewrites() {
    return [
      { source: "/ayakkabilar", destination: "/" },
    ];
  },
  // D-198: Redirect /urun/:slug → /products/:slug (canonical enhanced page)
  async redirects() {
    return [
      {
        source: "/urun/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default withPayload(nextConfig);
