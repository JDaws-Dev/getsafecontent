import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://getsafereads.com", lastModified: new Date(), priority: 1.0 },
    { url: "https://getsafereads.com/about", lastModified: new Date(), priority: 0.8 },
    { url: "https://getsafereads.com/contact", lastModified: new Date(), priority: 0.5 },
    { url: "https://getsafereads.com/privacy", lastModified: new Date(), priority: 0.3 },
    { url: "https://getsafereads.com/terms", lastModified: new Date(), priority: 0.3 },
  ];
}
