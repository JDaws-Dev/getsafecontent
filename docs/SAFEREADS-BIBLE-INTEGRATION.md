# SafeReads Bible Integration Plan

## Status: In Progress (Apr 2026)

## Overview
Add Bible reading to SafeReads kid side. Kids can read the Bible in-app with multiple translation choices. No parent approval required.

## API Choice: Bolls.life Bible API

**Winner: Bolls.life** (https://bolls.life) -- no authentication required, all 5 requested translations available.

### Available Translations (Verified Working)

| Translation | Code | Status | Notes |
|------------|------|--------|-------|
| KJV (King James Version) | `KJV` | Available | Public domain. Includes Strong's numbers in `<S>` tags (stripped in display). |
| ESV (English Standard Version) | `ESV` | Available | Copyrighted (Crossway). Includes cross-reference comments. |
| NKJV (New King James Version) | `NKJV` | Available | Copyrighted (Thomas Nelson). Includes `<i>` tags for italicized words. |
| NIV (New International Version) | `NIV` | Available | Copyrighted (Biblica/Zondervan). Clean text with `<br/>` section headers. |
| NLT (New Living Translation) | `NLT` | Available | Copyrighted (Tyndale). Kid-friendly language. Includes footnote comments. |

### API Endpoints Used

```
GET https://bolls.life/get-books/{TRANSLATION}/
  -> Returns: [{ bookid, name, chapters }]

GET https://bolls.life/get-chapter/{TRANSLATION}/{BOOK_ID}/{CHAPTER}/
  -> Returns: [{ pk, verse, text, comment? }]
```

- No API key required
- No rate limits documented (but we cache aggressively)
- Text may contain HTML tags: `<br/>`, `<i>`, `<S>num</S>` (Strong's), `<a>` (cross-refs)

### Other APIs Considered

| API | Why Not |
|-----|---------|
| API.Bible (scripture.api.bible) | Requires API key registration, complex OAuth, limited free tier |
| ESV API (api.esv.org) | ESV only, requires API key, non-commercial restriction |
| bible-api.com | Only KJV and WEB translations available |

## Architecture

### Backend (`convex/bible.ts`)

- `getBooks` action -- fetches book list from Bolls.life, caches in `bibleCache`
- `getChapter` action -- fetches chapter text, caches in `bibleCache`
- `getBibleReadingProgress` query -- reading progress per kid per book/chapter

### Schema Additions (`convex/schema.ts`)

```typescript
// Bible text cache (Bible text never changes)
bibleCache: defineTable({
  cacheKey: v.string(),    // e.g., "books:ESV", "chapter:ESV:1:1"
  data: v.string(),        // JSON stringified response
  cachedAt: v.number(),
}).index("by_key", ["cacheKey"]),

// Bible reading progress per kid
bibleProgress: defineTable({
  kidId: v.id("kids"),
  translation: v.string(),  // e.g., "ESV"
  bookId: v.number(),       // Bolls.life book ID (1-66)
  chapter: v.number(),
  lastReadAt: v.number(),
}).index("by_kid", ["kidId"])
 .index("by_kid_and_book", ["kidId", "translation", "bookId"]),
```

### Frontend Pages

- `/play/bible` -- Bible browser (book/chapter selector + reader)
- Added to KidNav as a Bible icon
- Added as a card on the kid home page

### Design Choices

- Warm gold/amber accents (distinct from the playful purple)
- Same reader styling as BookReader (font size, theme toggle)
- Old Testament / New Testament sections in book list
- Chapter selector as a grid of numbers
- Verse numbers displayed inline

## Text Cleaning

Bolls.life text includes HTML markup that needs stripping/handling:
- `<S>1234</S>` -- Strong's concordance numbers (KJV) -- strip entirely
- `<i>word</i>` -- Italicized words (NKJV) -- render as italic
- `<br/>` -- Line breaks (NIV, NLT) -- render as line break
- `<a href="...">ref</a>` -- Cross-references in comments -- strip from main text
- `comment` field -- Cross-references/footnotes -- optional display

## Cache Strategy

- Bible text is immutable -- cache forever (no expiry)
- Book lists cached per translation
- Chapter text cached per translation + book + chapter
- ~1,189 chapters total in the Bible; cached on demand

## No Parent Approval Required

Bible is always available to all kids. It's pre-approved content by definition for this app's target audience (Christian families).
