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
    sitemap: 'https://getsafefamily.com/spark/sitemap.xml',
    host: 'https://getsafefamily.com',
  };
}
