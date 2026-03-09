import type { FC } from 'react';

export interface DbProduct {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  description: string;
  images: string[];
  dbImage: string | null;
  sizes: number[];
  stock: number;
  category: string;
  badge: string;
  slug: string;
  sku: string;
  fromDb: boolean;
}

export interface DbBanner {
  id: string | number;
  title: string;
  subtitle: string;
  type: string;
  discountPercent: number | null;
  couponCode: string;
  bgColor: string;
  textColor: string;
  linkUrl: string;
  placement: string;
  imageUrl: string | null;
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  contact: {
    whatsapp: string;
    whatsappFull: string;
    email: string;
    instagram: string;
  };
  shipping: {
    freeShippingThreshold: number;
    shippingCost: number;
    showFreeShippingBanner: boolean;
  };
  trustBadges: {
    monthlyCustomers: string;
    totalProducts: string;
    satisfactionRate: string;
  };
  announcementBar: {
    enabled: boolean;
    text: string;
    bgColor: string;
  };
}

export interface AppProps {
  dbProducts?: DbProduct[];
  siteSettings?: SiteSettings | null;
  banners?: DbBanner[];
}

declare const App: FC<AppProps>;
export default App;
