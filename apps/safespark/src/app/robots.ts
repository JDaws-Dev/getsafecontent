import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/parent/', '/start', '/api/', '/make', '/spark', '/lumi', '/demo'],
      },
    ],
    sitemap: 'https://getsafespark.com/sitemap.xml',
    host: 'https://getsafespark.com',
  };
}
