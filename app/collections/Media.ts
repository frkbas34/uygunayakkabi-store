import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  labels: {
    singular: "Medya",
    plural: "Medya",
  },
  access: {
    read: () => true,
  },
  upload: {
    staticDir: "public/media",
    mimeTypes: ["image/*"],
    imageSizes: [
      {
        name: "thumbnail",
        width: 300,
        height: 300,
        position: "centre",
      },
      {
        name: "card",
        width: 600,
        height: 600,
        position: "centre",
      },
      {
        name: "full",
        width: 1200,
        height: undefined,
        position: "centre",
      },
    ],
  },
  fields: [
    {
      name: "alt",
      label: "Alt Metin",
      type: "text",
      required: true,
    },
  ],
};
