# How to Publish a Blog Post

## Quick Start (5 minutes)

### Option 1: GitHub Web Editor (Easiest)

1. Go to: https://github.com/JDaws-Dev/getsafecontent/tree/main/sites/marketing/content/blog
2. Click **Add file** → **Create new file**
3. Name it: `your-post-slug.mdx` (use hyphens, lowercase)
4. Paste the template below, edit content
5. Click **Commit changes**
6. Vercel auto-deploys in ~60 seconds

### Option 2: Local (If you have the repo cloned)

1. Create a new `.mdx` file in `sites/marketing/content/blog/`
2. Use the template below
3. Run `npx velite build` to compile
4. Commit and push to GitHub
5. Vercel auto-deploys

---

## Post Template

Copy this template for every new post:

```mdx
---
title: "Your SEO-Friendly Title Here (50-60 characters ideal)"
slug: your-url-slug-here
description: "A compelling 150-160 character description for Google search results."
date: 2026-02-10
published: true
featured: false
image: https://images.pexels.com/photos/PHOTO_ID/pexels-photo-PHOTO_ID.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop
imageAlt: Description of the image for accessibility
author: Jeremiah Daws
category: SafeTunes
tags:
  - relevant
  - keywords
  - here
---

Your content starts here. Write in markdown.

## Use Headings Like This

Regular paragraphs work normally.

- Bullet lists work
- Like this

### Subheadings Too

**Bold text** and *italic text* work.

> Blockquotes look like this.

Add a CTA anywhere in your post:

<SignupCTA
  product="SafeTunes"
  headline="Custom headline here"
  description="Custom description here"
/>

---

*Footer text or author note here.*
```

---

## Field Reference

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Post title (shows in browser tab, Google) |
| `slug` | Yes | URL path (e.g., `my-post` → `/blog/my-post`) |
| `description` | Yes | Google search snippet (150-160 chars) |
| `date` | Yes | Publish date (YYYY-MM-DD format) |
| `published` | Yes | Set to `true` to publish, `false` to hide |
| `featured` | No | Set to `true` to feature at top of blog |
| `image` | No | Featured image URL (use Pexels) |
| `imageAlt` | No | Image description for accessibility |
| `author` | No | Author name (defaults to "Jeremiah Daws") |
| `category` | Yes | One of: `SafeTunes`, `SafeTube`, `SafeReads`, `General` |
| `tags` | No | Array of keywords for organization |

---

## Finding Images on Pexels

1. Go to https://www.pexels.com
2. Search for relevant photos
3. Click on a photo
4. Copy the photo ID from the URL (e.g., `4908731` from `pexels.com/photo/4908731`)
5. Use this format:
   ```
   https://images.pexels.com/photos/PHOTO_ID/pexels-photo-PHOTO_ID.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop
   ```

---

## Using the SignupCTA Component

Add CTAs anywhere in your post:

```mdx
<SignupCTA
  product="SafeTunes"
  headline="Take control of what your kids hear"
  description="With SafeTunes, your kids only hear songs you've approved."
/>
```

**Product options:**
- `SafeTunes` - Purple/indigo theme
- `SafeTube` - Red/orange theme
- `SafeReads` - Green/teal theme
- `all` - Peach gradient (promotes the bundle)

If you omit `headline` or `description`, sensible defaults are used.

---

## SEO Checklist

Before publishing, verify:

- [ ] Title is 50-60 characters
- [ ] Title includes target keyword
- [ ] Description is 150-160 characters
- [ ] Slug matches target keyword
- [ ] Featured image is set
- [ ] Category is correct
- [ ] At least one SignupCTA in the post
- [ ] Content answers the search query

---

## Markdown Quick Reference

```markdown
# Heading 1 (don't use - title is H1)
## Heading 2
### Heading 3

**bold text**
*italic text*

- Bullet list
- Another item

1. Numbered list
2. Second item

[Link text](https://example.com)

> Blockquote

`inline code`

| Table | Header |
|-------|--------|
| Cell  | Cell   |
```

---

## Troubleshooting

**Post not showing up?**
- Check `published: true` in frontmatter
- Make sure date is not in the future
- Verify the file ends in `.mdx`

**Build errors?**
- Check frontmatter YAML syntax (colons, quotes)
- Ensure category is one of the allowed values
- Verify date format is YYYY-MM-DD

**Images not loading?**
- Use full Pexels URL with parameters
- Check the photo ID is correct

---

## Questions?

Email jeremiah@getsafefamily.com
