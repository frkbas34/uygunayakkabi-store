import type { CollectionConfig } from "payload";

export const Products: CollectionConfig = {
  slug: "products",
  labels: {
    singular: "Ürün",
    plural: "Ürünler",
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "price", "stock", "category", "badge"],
  },
  access: {
    read: () => true, // public read for storefront
  },
  fields: [
    {
      name: "name",
      label: "Ürün Adı",
      type: "text",
      required: true,
    },
    {
      name: "price",
      label: "Fiyat (₺)",
      type: "number",
      required: true,
      min: 0,
    },
    {
      name: "originalPrice",
      label: "Eski Fiyat (₺)",
      type: "number",
      min: 0,
      admin: {
        description: "İndirim göstermek için eski fiyatı girin. Boş bırakırsanız indirim gösterilmez.",
      },
    },
    {
      name: "description",
      label: "Açıklama",
      type: "textarea",
      required: true,
    },
    {
      name: "images",
      label: "Ürün Görselleri",
      type: "array",
      minRows: 1,
      maxRows: 5,
      fields: [
        {
          name: "image",
          label: "Görsel",
          type: "upload",
          relationTo: "media",
          required: true,
        },
      ],
    },
    {
      name: "sizes",
      label: "Bedenler",
      type: "json",
      required: true,
      admin: {
        description: 'Mevcut bedenleri dizi olarak girin, örn: [39, 40, 41, 42, 43, 44]',
      },
    },
    {
      name: "stock",
      label: "Stok",
      type: "number",
      required: true,
      min: 0,
      defaultValue: 0,
    },
    {
      name: "category",
      label: "Kategori",
      type: "select",
      required: true,
      options: [
        { label: "Günlük", value: "Günlük" },
        { label: "Klasik", value: "Klasik" },
      ],
    },
    {
      name: "badge",
      label: "Etiket",
      type: "select",
      options: [
        { label: "Yeni", value: "Yeni" },
        { label: "İndirim", value: "İndirim" },
        { label: "Tükendi", value: "Tükendi" },
        { label: "Yok", value: "" },
      ],
    },
  ],
};
