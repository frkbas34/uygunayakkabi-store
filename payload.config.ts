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
import { BlogPosts } from "./src/collections/BlogPosts";
import { ImageGenerationJobs } from "./src/collections/ImageGenerationJobs";
import { SiteSettings } from "./src/globals/SiteSettings";
import { AutomationSettings } from "./src/globals/AutomationSettings";
import { shopierSyncTask } from "./src/jobs/shopierSyncTask";
import { imageGenTask } from "./src/jobs/imageGenTask";

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
    // components: {
    //   afterDashboard: ["@/components/admin/Dashboard"],
    // },
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
    BlogPosts,
    ImageGenerationJobs,
  ],
  globals: [SiteSettings, AutomationSettings],

  // ── Step 20: Shopier Jobs Queue ──────────────────────────────────────────────
  //
  // Payload creates a `payload-jobs` collection in the DB to persist jobs.
  // Jobs are processed when GET /api/payload-jobs/run is called.
  // (GET — not POST — by Payload design, to allow direct Vercel Cron invocation.)
  //
  // LOCAL DEV:
  //   curl "http://localhost:3000/api/payload-jobs/run"
  //   (No Authorization header needed locally when CRON_SECRET is unset.)
  //
  // PRODUCTION — see DECISIONS.md Step 20 for full options. Summary:
  //   • Vercel Pro  → vercel.json cron hitting GET /api/payload-jobs/run (every minute)
  //   • Vercel Hobby → daily cron only; use an external scheduler (see below)
  //   • External    → cron-job.org or GitHub Actions calling the endpoint every 5 min
  //
  // SECURITY: Vercel injects  Authorization: Bearer <CRON_SECRET>  on cron calls.
  // Set CRON_SECRET in Vercel env vars; the access.run fn below enforces it.
  // Locally, leave CRON_SECRET unset — the check falls back to open access.
  jobs: {
    tasks: [shopierSyncTask, imageGenTask],

    // Protect the GET /api/payload-jobs/run endpoint.
    // Pattern from Payload docs: check Authorization: Bearer <CRON_SECRET>.
    // Vercel Cron automatically attaches this header when CRON_SECRET is set
    // in the project's environment variables.
    access: {
      run: ({ req }) => {
        const secret = process.env.CRON_SECRET
        // If CRON_SECRET is not set (local dev), allow all requests.
        if (!secret) return true
        const auth = req.headers.get('authorization')
        return auth === `Bearer ${secret}`
      },
    },

    // autoRun is intentionally NOT used:
    //   - Serverless (Vercel) Lambda functions are ephemeral — setInterval-based
    //     autoRun fires once per cold start and then dies. Unreliable.
    //   - Use GET /api/payload-jobs/run via external cron instead.
  },

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI!,
      // SSL handled here instead of sslmode= in connection string
      // to avoid pg-connection-string deprecation warning
      ssl: process.env.DATABASE_URI?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
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
