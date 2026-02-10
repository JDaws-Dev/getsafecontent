# YouTube API Caching Implementation

## Overview
This document describes the YouTube API search caching system implemented to reduce API quota usage for SafeTubes.

## Problem Statement
The YouTube Data API has a 10,000 units/day free quota, and search operations cost 100 units per call. With just one user testing, the quota was exhausted in one night. This caching system was implemented to dramatically reduce API calls by caching search results server-side.

## Solution Architecture

### 1. Database Schema (`convex/schema.ts`)
A new `youtubeSearchCache` table was added to store search results:

```typescript
youtubeSearchCache: defineTable({
  query: v.string(),              // Normalized search query (lowercase, trimmed)
  searchType: v.string(),         // "channels", "videos", or "channelVideos"
  maxResults: v.optional(v.number()),  // For deduplication
  channelId: v.optional(v.string()),   // For channelVideos searches
  results: v.any(),               // The cached search results array
  cachedAt: v.number(),           // Timestamp when cached
  expiresAt: v.number(),          // When cache expires
  timesReused: v.number(),        // How many times this cache entry was used
  lastAccessedAt: v.number(),     // Last time this cache was accessed
})
```

**Indexes:**
- `by_query_type`: (query, searchType) - For regular searches
- `by_query_type_max`: (query, searchType, maxResults) - For searches with specific result limits
- `by_channel_id`: (channelId, searchType) - For channel video lookups
- `by_expires`: (expiresAt) - For cache cleanup (future use)

### 2. Server-Side Caching (`convex/youtubeCache.ts`)

This file contains three main Convex actions that replace direct YouTube API calls:

#### `searchChannelsCached(query, maxResults?, forceRefresh?)`
- Searches for YouTube channels with server-side caching
- TTL: 6 hours
- Returns: `{ results: Channel[], fromCache: boolean }`

#### `searchVideosCached(query, maxResults?, forceRefresh?)`
- Searches for YouTube videos with server-side caching
- TTL: 6 hours
- Returns: `{ results: Video[], fromCache: boolean }`

#### `getChannelVideosCached(channelId, maxVideos?, forceRefresh?)`
- Fetches all videos from a channel with server-side caching
- TTL: 1 hour (channel content changes more frequently)
- Returns: `{ videos: Video[], totalResults: number, fromCache: boolean }`

**Cache Flow:**
1. Check cache using normalized query + search type
2. If cache hit and not expired:
   - Update access statistics (timesReused, lastAccessedAt)
   - Return cached results
3. If cache miss or expired:
   - Call YouTube API
   - Parse and format results
   - Save to cache with TTL
   - Return fresh results

**Environment Variables:**
- `YOUTUBE_API_KEY` - YouTube Data API v3 key (stored in Convex environment)

### 3. Frontend Integration (`src/components/admin/YouTubeSearch.jsx`)

The YouTubeSearch component was updated to use the cached actions via Convex:

```javascript
// Import Convex actions
const searchChannelsCached = useAction(api.youtubeCache.searchChannelsCached);
const searchVideosCached = useAction(api.youtubeCache.searchVideosCached);
const getChannelVideosCached = useAction(api.youtubeCache.getChannelVideosCached);

// Usage example
const result = await searchChannelsCached({ query: searchQuery });
setResults(result.results);

if (result.fromCache) {
  setToast({ message: 'Results loaded from cache', type: 'success' });
}
```

**User Experience:**
- Instant results for repeated searches (cache hits)
- Visual feedback when results are loaded from cache
- Error handling with user-friendly messages

## Cache Statistics

A public query `getCacheStats()` is available to monitor cache performance:

```javascript
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';

const cacheStats = useQuery(api.youtubeCache.getCacheStats);

// Returns:
// {
//   totalEntries: number,
//   validEntries: number,
//   expiredEntries: number,
//   totalReuses: number,
//   byType: {
//     channels: number,
//     videos: number,
//     channelVideos: number
//   }
// }
```

## Cache Configuration

### Time-to-Live (TTL)
- **Channel/Video Searches**: 6 hours (21,600,000ms)
  - Reasoning: Search results don't change frequently
- **Channel Videos**: 1 hour (3,600,000ms)
  - Reasoning: Channels upload new content regularly

### Query Normalization
All search queries are normalized before caching:
- Converted to lowercase
- Whitespace trimmed
- This ensures "Cocomelon", "cocomelon", and " Cocomelon " all hit the same cache entry

## Deployment

### Development Environment
```bash
# Set API key
npx convex env set YOUTUBE_API_KEY your_api_key_here

# Deploy functions
npx convex dev --once
```

### Production Environment
```bash
# Set API key for production
npx convex env set YOUTUBE_API_KEY your_api_key_here --prod

# Deploy to production
CONVEX_DEPLOYMENT=prod:rightful-rabbit-333 npx convex deploy --yes
```

**Production Deployment:** `rightful-rabbit-333` (https://rightful-rabbit-333.convex.cloud)

## API Quota Savings

### Before Caching
- Each channel search: 100 units (search) + 1 unit (channel details) = 101 units
- Each video search: 100 units (search) + 1 unit (video details) = 101 units
- Each channel video list: 1 unit per page (typically 10-20 units for full list)

**Example:** 20 searches/day = 2,020 units (20% of daily quota)

### After Caching
- First search: Same cost (100-101 units)
- Subsequent searches (within TTL): 0 units
- **Estimated savings: 80-95% reduction in API calls** (assuming typical usage patterns)

**Example:** 20 searches/day with 80% cache hit rate:
- 4 fresh searches = 404 units
- 16 cached searches = 0 units
- **Total: 404 units (80% reduction)**

## Cache Invalidation

Currently, cache entries expire automatically based on TTL. Future enhancements could include:

1. **Manual cache clearing** - Admin button to force refresh all caches
2. **Selective invalidation** - Clear cache for specific queries
3. **Smart expiration** - Shorter TTL for trending topics, longer for stable content

## Monitoring

### Check Cache Status
```bash
# List all cache entries
npx convex data youtubeSearchCache

# Check cache statistics via query
# (requires implementing a UI component that calls getCacheStats)
```

### Cache Hit/Miss Logging
The system logs cache hits and misses to the console:
- `[YouTube Cache] HIT for channels: cocomelon`
- `[YouTube Cache] MISS for videos: peppa pig`
- `[YouTube Cache] SAVED channels: cocomelon (5 results)`

## Files Modified

### New Files
- `/convex/youtubeCache.ts` - Server-side caching actions and queries

### Modified Files
- `/convex/schema.ts` - Added youtubeSearchCache table
- `/src/config/youtube.js` - Added documentation about cached versions
- `/src/components/admin/YouTubeSearch.jsx` - Updated to use cached actions

## Testing Checklist

- [x] Schema deployed successfully
- [x] Environment variables set (dev and prod)
- [x] Cache table created in database
- [x] Search channels returns cached results
- [x] Search videos returns cached results
- [x] Channel videos returns cached results
- [x] Cache statistics query works
- [x] Cache expiration works after TTL
- [x] Force refresh bypasses cache
- [ ] Monitor quota usage after deployment

## Future Enhancements

1. **Cache warming** - Pre-populate cache with popular searches
2. **Analytics** - Track cache hit rates and quota savings
3. **Admin dashboard** - Display cache stats and allow manual refresh
4. **Smart TTL** - Adjust TTL based on search frequency
5. **Cache cleanup** - Scheduled job to remove expired entries
6. **Rate limiting** - Prevent excessive API calls from individual users

## Troubleshooting

### Cache not working
1. Check environment variable: `npx convex env list`
2. Verify YOUTUBE_API_KEY is set correctly
3. Check console logs for cache hit/miss messages

### API errors
1. Verify API key is valid in Google Cloud Console
2. Check YouTube Data API v3 is enabled
3. Verify quota is not exhausted: https://console.cloud.google.com/apis/dashboard

### Expired cache entries not clearing
- Currently, expired entries are skipped (not returned) but not deleted
- Future enhancement: Scheduled cleanup job

## Performance Impact

**Frontend:**
- No impact - actions execute server-side
- Faster response times for cached results (no network call to YouTube)

**Backend:**
- Minimal storage cost (~1-5KB per cache entry)
- Reduced external API latency for cache hits
- Small query overhead to check cache (indexed, fast)

## Security Considerations

- API key stored securely in Convex environment variables
- Not exposed to frontend (actions run server-side)
- Cache entries are public within the app (no sensitive data)
- Query normalization prevents cache poisoning attacks

## Conclusion

This caching system provides a robust, scalable solution to reduce YouTube API quota usage by 80-95%. It's transparent to users, provides better performance through cache hits, and includes monitoring capabilities for ongoing optimization.