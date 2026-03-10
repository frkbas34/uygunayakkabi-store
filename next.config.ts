import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["graphql"],
  images: {
    remotePatterns: [
      // Vercel Blob Storage
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Cloudflare R2 / AWS S3 (ileride kullanım için)
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
      // Unsplash (static data)
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default withPayload(nextConfig);
