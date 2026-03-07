import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

import { Products } from "./app/collections/Products";
import { Orders } from "./app/collections/Orders";
import { Media } from "./app/collections/Media";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: "users",
    meta: {
      titleSuffix: " — UygunAyakkabı Admin",
    },
  },
  collections: [
    {
      slug: "users",
      labels: {
        singular: "Kullanıcı",
        plural: "Kullanıcılar",
      },
      auth: true,
      admin: {
        useAsTitle: "email",
      },
      fields: [],
    },
    Products,
    Orders,
    Media,
  ],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI!,
    },
  }),
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET!,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
