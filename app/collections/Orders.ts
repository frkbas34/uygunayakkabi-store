import type { CollectionConfig } from "payload";

export const Orders: CollectionConfig = {
  slug: "orders",
  labels: {
    singular: "Sipariş",
    plural: "Siparişler",
  },
  admin: {
    useAsTitle: "customerName",
    defaultColumns: ["customerName", "totalAmount", "status", "createdAt"],
  },
  access: {
    read: () => true,
    create: () => true, // storefront can create orders
  },
  fields: [
    {
      name: "customerName",
      label: "Müşteri Adı",
      type: "text",
      required: true,
    },
    {
      name: "customerPhone",
      label: "Telefon",
      type: "text",
      required: true,
    },
    {
      name: "customerAddress",
      label: "Adres",
      type: "textarea",
    },
    {
      name: "items",
      label: "Ürünler",
      type: "array",
      required: true,
      fields: [
        {
          name: "product",
          label: "Ürün",
          type: "relationship",
          relationTo: "products",
          required: true,
        },
        {
          name: "productName",
          label: "Ürün Adı",
          type: "text",
          required: true,
        },
        {
          name: "size",
          label: "Beden",
          type: "number",
          required: true,
        },
        {
          name: "quantity",
          label: "Adet",
          type: "number",
          required: true,
          min: 1,
        },
        {
          name: "unitPrice",
          label: "Birim Fiyat (₺)",
          type: "number",
          required: true,
        },
      ],
    },
    {
      name: "totalAmount",
      label: "Toplam Tutar (₺)",
      type: "number",
      required: true,
    },
    {
      name: "status",
      label: "Durum",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Beklemede", value: "pending" },
        { label: "Onaylandı", value: "confirmed" },
        { label: "Kargoya Verildi", value: "shipped" },
        { label: "Teslim Edildi", value: "delivered" },
        { label: "İptal Edildi", value: "cancelled" },
      ],
    },
    {
      name: "notes",
      label: "Notlar",
      type: "textarea",
    },
  ],
};
