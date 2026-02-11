import { defineConfig, defineCollection, s } from "velite";

const posts = defineCollection({
  name: "Post",
  pattern: "blog/**/*.mdx",
  schema: s
    .object({
      title: s.string().max(120),
      slug: s.slug("blog"),
      description: s.string().max(300),
      date: s.isodate(),
      updated: s.isodate().optional(),
      published: s.boolean().default(true),
      featured: s.boolean().default(false),
      image: s.string().optional(),
      imageAlt: s.string().optional(),
      author: s.string().default("Jeremiah Daws"),
      category: s.enum(["SafeTunes", "SafeTube", "SafeReads", "General"]),
      tags: s.array(s.string()).default([]),
      body: s.mdx(),
    })
    .transform((data) => ({
      ...data,
      permalink: `/blog/${data.slug}`,
    })),
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: { posts },
  mdx: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});
