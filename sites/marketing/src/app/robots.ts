import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_URL || "https://getsafefamily.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/admin-login/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
