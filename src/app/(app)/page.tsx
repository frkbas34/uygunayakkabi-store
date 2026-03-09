import App from "./UygunApp";
import type { DbProduct, DbBanner, SiteSettings } from "./UygunApp";
import { getPayload } from "@/lib/payload";

// SVG ayakkabı renkleri — kategoriye göre
const CATEGORY_COLORS: Record<string, [string, string, string, string, string]> = {
  gunluk:   ['#f8f8f8', '#e0e0e0', '#ffffff', '#00b4d8', '#0077b6'],
  klasik:   ['#f8f0e4', '#3a1a08', '#6b3010', '#c08040', '#d4a870'],
  spor:     ['#f0f8ff', '#0a1a4a', '#1a2a8a', '#4a5acc', '#ffffff'],
  bot:      ['#ede0d0', '#2a1400', '#5a3010', '#8a5430', '#d4a06a'],
  sandalet: ['#fdfaf2', '#7a6040', '#c8a870', '#e8c890', '#f5e8c0'],
  krampon:  ['#f0fff4', '#145a20', '#1e8a2e', '#4dcc6a', '#b8f5c4'],
  cuzdan:   ['#f5f0eb', '#5c3a1e', '#8b6914', '#c9a97b', '#d4a76a'],
};

function makeSvgShoe(bg: string, sole: string, body: string, acc: string, lace: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><rect width="800" height="800" fill="${bg}"/><g transform="translate(400,400) scale(1.15)"><path d="M-220,80Q-220,110-180,120L200,120Q240,120,250,95L260,60Q260,45,240,40L-180,40Q-220,45-220,80Z" fill="${sole}"/><path d="M-200,48Q-210,68-190,78L230,78Q250,73,255,53L250,33Q245,23,230,23L-175,23Q-200,28-200,48Z" fill="white" opacity="0.88"/><path d="M-180,28Q-200,8-195,-42Q-185,-102-140,-132Q-80,-172,20,-177Q120,-180,180,-152Q230,-127,245,-72Q255,-27,245,13L240,23L-175,23Z" fill="${body}"/><path d="M-150,-45Q-70,-92,50,-87Q145,-82,210,-38" fill="none" stroke="${acc}" stroke-width="14" stroke-linecap="round" opacity="0.75"/><line x1="-78" y1="-132" x2="-18" y2="-147" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><line x1="-58" y1="-112" x2="2" y2="-132" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/><line x1="-38" y1="-92" x2="22" y2="-117" stroke="${lace}" stroke-width="4.5" stroke-linecap="round"/></g><ellipse cx="400" cy="605" rx="240" ry="20" fill="black" opacity="0.055"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function getShoeImage(category: string) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['gunluk'];
  return makeSvgShoe(...colors);
}

function getMediaUrl(images: any[]) {
  if (!images || images.length === 0) return null;
  const first = images[0]?.image;
  if (!first) return null;
  if (typeof first === 'object') {
    // Payload CMS stores the url field on media documents
    if (first.url) return first.url;
    // Fallback: construct from filename (files in public/media/)
    if (first.filename) return `/media/${first.filename}`;
  }
  return null;
}

// Extract ALL media URLs from a product's images array
function getAllMediaUrls(images: any[]): string[] {
  if (!images || images.length === 0) return [];
  return images
    .map((entry: any) => {
      const img = entry?.image;
      if (!img || typeof img !== 'object') return null;
      if (img.url) return img.url;
      if (img.filename) return `/media/${img.filename}`;
      return null;
    })
    .filter(Boolean) as string[];
}

// Map from stored category value → display label
// Supports both legacy lowercase and new mixed-case values
const CATEGORY_LABELS: Record<string, string> = {
  gunluk: 'Günlük', klasik: 'Klasik', spor: 'Spor',
  bot: 'Bot', sandalet: 'Sandalet', krampon: 'Krampon',
  cuzdan: 'Cüzdan',
  // Pass-through for values already in display form
  'Günlük': 'Günlük', 'Klasik': 'Klasik', 'Spor': 'Spor',
  'Bot': 'Bot', 'Sandalet': 'Sandalet', 'Krampon': 'Krampon',
  'Cüzdan': 'Cüzdan',
};

export default async function Page() {
  let dbProducts: DbProduct[] = [];
  let siteSettings: SiteSettings | null = null;
  let banners: DbBanner[] = [];

  try {
    const payload = await getPayload();

    // Fetch products
    const result = await payload.find({
      collection: 'products',
      where: { status: { equals: 'active' } },
      depth: 2,
      limit: 100,
      sort: '-createdAt',
    });

    dbProducts = result.docs.map((p: any) => {
      const shoeImg = getShoeImage(p.category || 'gunluk');
      const mediaUrls = getAllMediaUrls(p.images || []);
      const imgSrc = mediaUrls[0] || shoeImg;
      const img2 = mediaUrls[1] || shoeImg;

      // Varyantlardan beden ve stok
      const variants = Array.isArray(p.variants) ? p.variants : [];
      const sizes = variants
        .filter((v: any) => typeof v === 'object' && v?.size)
        .map((v: any) => parseInt(v.size))
        .filter((s: number) => !isNaN(s))
        .sort((a: number, b: number) => a - b);

      const totalStock = variants
        .filter((v: any) => typeof v === 'object')
        .reduce((acc: number, v: any) => acc + (Number(v?.stock) || 0), 0);

      const badge =
        p.featured ? 'Öne Çıkan'
        : p.status === 'soldout' ? 'Tükendi'
        : p.originalPrice && p.originalPrice > p.price ? 'İndirim'
        : 'Yeni';

      return {
        id: `db_${p.id}`,
        name: p.title,
        price: Number(p.price) || 0,
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
        description: p.description || `${p.title} — uygun fiyatlı ayakkabı`,
        images: mediaUrls.length > 0 ? [...mediaUrls, shoeImg] : [imgSrc, img2],
        dbImage: mediaUrls[0] || null,
        sizes: sizes.length > 0 ? sizes : [38, 39, 40, 41, 42, 43],
        stock: totalStock || 5,
        category: CATEGORY_LABELS[p.category] || p.category || 'Günlük',
        badge,
        slug: p.slug || String(p.id),
        sku: p.sku || '',
        fromDb: true,
      };
    });

    // Fetch SiteSettings global
    try {
      const settings = await payload.findGlobal({ slug: 'site-settings' });
      siteSettings = {
        siteName: settings.siteName || 'UygunAyakkabı',
        siteDescription: settings.siteDescription || '',
        contact: {
          whatsapp: settings.contact?.whatsapp || '0533 152 48 43',
          whatsappFull: settings.contact?.whatsappFull || '905331524843',
          email: settings.contact?.email || '',
          instagram: settings.contact?.instagram || '',
        },
        shipping: {
          freeShippingThreshold: settings.shipping?.freeShippingThreshold ?? 500,
          shippingCost: settings.shipping?.shippingCost ?? 49,
          showFreeShippingBanner: settings.shipping?.showFreeShippingBanner ?? true,
        },
        trustBadges: {
          monthlyCustomers: settings.trustBadges?.monthlyCustomers || '500+',
          totalProducts: settings.trustBadges?.totalProducts || '200+',
          satisfactionRate: settings.trustBadges?.satisfactionRate || '%98',
        },
        announcementBar: {
          enabled: settings.announcementBar?.enabled ?? true,
          text: settings.announcementBar?.text || '🚚 500₺ üzeri siparişlerde KARGO BEDAVA!',
          bgColor: settings.announcementBar?.bgColor || '#c8102e',
        },
      };
    } catch (e) {
      console.log('[Page] SiteSettings yüklenemedi, varsayılan değerler kullanılacak');
    }

    // Fetch active Banners
    try {
      const bannerResult = await payload.find({
        collection: 'banners',
        where: {
          active: { equals: true },
        },
        depth: 1,
        limit: 10,
        sort: 'sortOrder',
      });
      banners = bannerResult.docs.map((b: any) => ({
        id: b.id,
        title: b.title,
        subtitle: b.subtitle || '',
        type: b.type,
        discountPercent: b.discountPercent || null,
        couponCode: b.couponCode || '',
        bgColor: b.bgColor || '#c8102e',
        textColor: b.textColor || '#ffffff',
        linkUrl: b.linkUrl || '',
        placement: b.placement || 'top_bar',
        imageUrl: b.image?.url || null,
      }));
    } catch (e) {
      console.log('[Page] Bannerlar yüklenemedi');
    }

  } catch (err) {
    console.error('[Page] DB ürünleri yüklenemedi:', err);
  }

  return <App dbProducts={dbProducts} siteSettings={siteSettings} banners={banners} />;
}
