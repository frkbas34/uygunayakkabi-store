// Run: npx ts-node --esm seed.ts
// Or: npx tsx seed.ts
// Seeds the Payload CMS database with initial products

import payload from "payload";
import config from "./payload.config";

const PLACEHOLDER = "/products/kahve-deri.jpg";

const seedProducts = [
  {
    name: "Deri Runner — Çikolata",
    price: 4290,
    originalPrice: 5490,
    description:
      "Çikolata kahvesi nubuk ve tam deri kombinasyonu, kabartmalı elmas desen panel ve tabaka kauçuk taban. El işçiliği, premium İtalyan deri.",
    sizes: [40, 41, 42, 43, 44],
    stock: 5,
    category: "Günlük",
    badge: "İndirim",
  },
  {
    name: "Deri Runner — Jet Siyah",
    price: 4290,
    originalPrice: null,
    description:
      "Siyah tam deri üst, kontrastlı kabartma panel ve bej tabaka taban. Sofistike sokak stili için tasarlandı.",
    sizes: [39, 40, 41, 42, 43, 44],
    stock: 8,
    category: "Günlük",
    badge: "Yeni",
  },
  {
    name: "Deri Runner — Lacivert",
    price: 4290,
    originalPrice: 5490,
    description:
      "Lacivert tam deri, kontrast bej taban ve işlemeli yan panel. Zamansız zarafetle modern konfor.",
    sizes: [40, 41, 42, 43],
    stock: 3,
    category: "Günlük",
    badge: "İndirim",
  },
  {
    name: "Deri Runner — Camel",
    price: 4890,
    originalPrice: null,
    description:
      "Işıltılı camel patinalı deri ve süet kombinasyonu. Tabaka sole ve bağcıklı tasarımıyla her kombine uyum.",
    sizes: [40, 41, 42, 43, 44, 45],
    stock: 6,
    category: "Günlük",
    badge: "",
  },
  {
    name: "Deri Runner — Bordo",
    price: 4890,
    originalPrice: 5990,
    description:
      "Zengin bordo patinalı deri, kontrast dikişler ve özel işçilik. Koleksiyonun en gösterişli rengi.",
    sizes: [39, 40, 41, 42, 43],
    stock: 2,
    category: "Günlük",
    badge: "İndirim",
  },
  {
    name: "Nubuk Sneaker — Kum",
    price: 3890,
    originalPrice: null,
    description:
      "Nefes alabilen kum rengi nubuk deri, crepe kauçuk taban ve minimal kesim. Günlük kullanımın vazgeçilmezi.",
    sizes: [38, 39, 40, 41, 42],
    stock: 10,
    category: "Günlük",
    badge: "Yeni",
  },
  {
    name: "Deri Derby — Konjak",
    price: 5290,
    originalPrice: 6490,
    description:
      "Zengin konjak rengi İngiliz deri, Goodyear welt dikişi ve kauçuk-deri karma taban. Resmi ve business casual her ortam için.",
    sizes: [40, 41, 42, 43, 44],
    stock: 4,
    category: "Klasik",
    badge: "İndirim",
  },
  {
    name: "Süet Loafer — Gece",
    price: 4490,
    originalPrice: null,
    description:
      "Gece mavisi süet, altın bitişli tok nal taban ve tassel detayıyla soylu bir klasik. Tam ayak konforu.",
    sizes: [39, 40, 41, 42, 43, 44],
    stock: 7,
    category: "Klasik",
    badge: "Yeni",
  },
  {
    name: "Deri Oxford — Siyah",
    price: 5490,
    originalPrice: 6990,
    description:
      "Siyah tam deri Brogue detayları, Goodyear welt dikişi ve deri-kauçuk karma taban. Zamansız bir klasik.",
    sizes: [40, 41, 42, 43],
    stock: 0,
    category: "Klasik",
    badge: "Tükendi",
  },
  {
    name: "Velvet Sneaker — Derin Mavi",
    price: 4990,
    originalPrice: null,
    description:
      "Derin mavi kadife üst, kontrast beyaz taban ve saten bağcıklar. Lüks gece stili için tasarlanmış özel koleksiyon.",
    sizes: [38, 39, 40, 41, 42, 43],
    stock: 5,
    category: "Günlük",
    badge: "",
  },
];

async function seed() {
  console.log("🌱 Seeding started...");

  const payloadInstance = await payload.init({ config });

  // Clear existing products
  const existing = await payloadInstance.find({ collection: "products", limit: 100 });
  for (const doc of existing.docs) {
    await payloadInstance.delete({ collection: "products", id: doc.id });
  }
  console.log(`🗑️  Cleared ${existing.docs.length} existing products`);

  // Create products
  for (const product of seedProducts) {
    await payloadInstance.create({
      collection: "products",
      data: product as any,
    });
    console.log(`✅ Created: ${product.name}`);
  }

  console.log("🌱 Seeding complete! All 10 products created.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
