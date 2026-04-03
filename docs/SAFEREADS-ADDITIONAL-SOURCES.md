# SafeReads Additional Free Book Sources

## Overview

Integrate four additional free book sources alongside the existing Gutenberg integration, plus audiobook support via LibriVox and Lit2Go.

## Sources

| Source | Type | Count | License | Ages | API |
|--------|------|-------|---------|------|-----|
| Gutenberg (existing) | Text classics | 70K+ | Public domain | All | Gutendex REST |
| Bloom Library | Illustrated early readers | 22K+ | CC-BY (filtered) | 3-9 | OPDS/Atom XML |
| Lit2Go (USF) | Audio narrated classics | 400+ | Public domain | 6-14 | Structured URLs |
| LibriVox | Audiobooks | 20K+ | Public domain | 8+ | JSON REST |
| Book Dash | Illustrated kids books | 200+ | CC-BY-4.0 | 3-9 | GDL API |

## Architecture

### Backend Files (Convex)

- `convex/bloomBooks.ts` - Bloom Library OPDS search + cache
- `convex/lit2go.ts` - Lit2Go structured URL scraping + cache
- `convex/librivox.ts` - LibriVox JSON API search + cache
- `convex/bookDash.ts` - Book Dash / GDL API search + cache
- `convex/freeBooks.ts` - Updated unified search combining all sources

### Frontend Components

- `src/components/kid/AudioPlayer.tsx` - Kid-friendly audio player
- `src/components/kid/SourceBadge.tsx` - Source indicator badges
- Updated: `FreeBookSearch.tsx` - Multi-source search
- Updated: `KidHomePage` - Audiobooks section
- Updated: `BookReader.tsx` - Listen button for audio-available books

### Caching Strategy

All sources use the same `freeBookCache` table with 24hr TTL:
- Cache key format: `{source}:search:{query}`, `{source}:browse:{category}`
- Weekly cache clear via existing cron

### Unified Book Format

All sources normalize to:
```typescript
{
  id: string;           // Source-prefixed: "bloom:123", "librivox:456"
  title: string;
  authors: string[];
  coverUrl?: string;
  source: "gutenberg" | "bloom" | "lit2go" | "librivox" | "bookdash";
  formats: { html?: string; epub?: string; txt?: string; };
  audioUrl?: string;    // Direct MP3 URL (LibriVox, Lit2Go)
  audioChapters?: { title: string; url: string; duration?: string; }[];
  readingLevel?: string;
  ageRange?: string;
}
```

## Status

- [x] Plan document
- [x] Bloom Library backend (`convex/bloomBooks.ts`)
- [x] Lit2Go backend (`convex/lit2go.ts`)
- [x] LibriVox backend (`convex/librivox.ts`)
- [x] Book Dash backend (`convex/bookDash.ts`)
- [x] Unified search in `freeBooks.ts`
- [x] AudioPlayer component
- [x] SourceBadge component
- [x] Updated FreeBookSearch (multi-source)
- [x] Updated kid home page (audiobooks section)
- [x] Updated book detail page (listen button)
- [x] Updated search page (audiobooks tab)

*Created: April 1, 2026*
