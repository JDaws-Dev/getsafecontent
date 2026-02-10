# YouTube API Caching - Quick Reference

## What is it?
A server-side caching system that stores YouTube search results in Convex to reduce API quota usage by 80-95%.

## How it works
1. User searches for channels/videos in admin panel
2. System checks Convex cache first
3. If found (and not expired), returns cached results instantly
4. If not found, calls YouTube API, caches results, then returns
5. Cache expires after 6 hours (searches) or 1 hour (channel videos)

## Setup (Already Done)
```bash
# Set YouTube API key in Convex
npx convex env set YOUTUBE_API_KEY your_api_key_here --prod

# Deploy functions
CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex deploy --yes
```

## Usage
The caching is automatic - no code changes needed in components that use YouTubeSearch.

## Monitoring Cache Performance
```javascript
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

function CacheStats() {
  const stats = useQuery(api.youtubeCache.getCacheStats);

  return (
    <div>
      <p>Total Cache Entries: {stats?.totalEntries}</p>
      <p>Cache Hits: {stats?.totalReuses}</p>
      <p>Valid Entries: {stats?.validEntries}</p>
    </div>
  );
}
```

## Cache TTLs
- **Channel/Video Searches**: 6 hours
- **Channel Videos**: 1 hour

## API Quota Savings
**Before:** 20 searches/day = ~2,000 units (20% of daily quota)
**After:** 20 searches/day with 80% hit rate = ~400 units (4% of daily quota)
**Savings:** 80% reduction in API costs

## Files
- **Schema**: `/convex/schema.ts` (youtubeSearchCache table)
- **Caching Logic**: `/convex/youtubeCache.ts`
- **Frontend Integration**: `/src/components/admin/YouTubeSearch.jsx`

## Full Documentation
See [YOUTUBE_CACHE_IMPLEMENTATION.md](./YOUTUBE_CACHE_IMPLEMENTATION.md) for complete details.