import type { MetadataRoute } from 'next'

// D-295: Allow normal crawling of the public storefront, keep admin/API
// private, and point crawlers + AI engines at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/'],
    },
    sitemap: 'https://uygunayakkabi.com/sitemap.xml',
    host: 'https://uygunayakkabi.com',
  }
}
