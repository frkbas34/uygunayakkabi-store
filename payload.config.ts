import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";
import { tr } from "@payloadcms/translations/languages/tr";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

import { Products } from "./src/collections/Products";
import { Variants } from "./src/collections/Variants";
import { MediaCollection } from "./src/collections/Media";
import { CustomerInquiries } from "./src/collections/CustomerInquiries";
import { InventoryLogs } from "./src/collections/InventoryLogs";
import { Orders } from "./src/collections/Orders";
import { Users } from "./src/collections/Users";
import { Brands } from "./src/collections/Brands";
import { Categories } from "./src/collections/Categories";
import { Banners } from "./src/collections/Banners";
import { SiteSettings } from "./src/globals/SiteSettings";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  plugins: [
    vercelBlobStorage({
      // Sadece BLOB_READ_WRITE_TOKEN varsa aktif olur (production).
      // Lokalde token yoksa Payload kendi yerel depolamasını kullanır.
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: {
        media: true,
      },
      token: process.env.BLOB_READ_WRITE_TOKEN || "",
    }),
  ],
  i18n: {
    supportedLanguages: { tr },
    fallbackLanguage: "tr",
  },
  admin: {
    user: "users",
    meta: {
      titleSuffix: " — UygunAyakkabı Admin",
    },
    components: {
      afterDashboard: ["@/components/admin/Dashboard"],
    },
  },
  collections: [
    Users,
    Products,
    Variants,
    Brands,
    Categories,
    MediaCollection,
    CustomerInquiries,
    InventoryLogs,
    Orders,
    Banners,
  ],
  globals: [SiteSettings],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI!,
    },
    // Şema değişikliklerini otomatik uygular (dev için ideal)
    push: true,
  }),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET!,
  sharp,
  // Global upload size limit: 10 MB
  upload: {
    limits: {
      fileSize: 10_000_000,
    },
  },
  // CORS — production'da gerçek URL'yi .env'e yazın
  cors: [
    process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000",
  ],
  typescript: {
    outputFile: path.resolve(dirname, "src/payload-types.ts"),
  },
});
