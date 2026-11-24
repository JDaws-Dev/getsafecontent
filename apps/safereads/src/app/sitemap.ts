import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://getsafefamily.com/reads", lastModified: new Date(), priority: 1.0 },
    { url: "https://getsafefamily.com/reads/about", lastModified: new Date(), priority: 0.8 },
    { url: "https://getsafefamily.com/reads/contact", lastModified: new Date(), priority: 0.5 },
    { url: "https://getsafefamily.com/reads/privacy", lastModified: new Date(), priority: 0.3 },
    { url: "https://getsafefamily.com/reads/terms", lastModified: new Date(), priority: 0.3 },
  ];
}
