import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Cache TTLs in milliseconds
const SIX_HOURS = 6 * 60 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// YouTube API configuration
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

/**
 * Normalize search query for cache key consistency
 */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Internal query to check cache
 */
export const getCachedSearch = internalQuery({
  args: {
    query: v.string(),
    searchType: v.string(),
    maxResults: v.optional(v.number()),
    channelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedQuery = normalizeQuery(args.query);
    const now = Date.now();

    // Build query based on search type
    let cacheEntry;
    if (args.searchType === "channelVideos" && args.channelId) {
      // For channel videos, use channelId as the cache key
      cacheEntry = await ctx.db
        .query("youtubeSearchCache")
        .withIndex("by_channel_id", (q) =>
          q.eq("channelId", args.channelId).eq("searchType", args.searchType)
        )
        .first();
    } else {
      // For regular searches, use query + searchType + maxResults
      cacheEntry = await ctx.db
        .query("youtubeSearchCache")
        .withIndex("by_query_type_max", (q) =>
          q.eq("query", normalizedQuery)
           .eq("searchType", args.searchType)
           .eq("maxResults", args.maxResults || 20)
        )
        .first();
    }

    // Check if cache is still valid
    if (cacheEntry && cacheEntry.expiresAt > now) {
      console.log(`[YouTube Cache] HIT for ${args.searchType}: ${args.channelId || args.query}`);
      return cacheEntry;
    }

    console.log(`[YouTube Cache] MISS for ${args.searchType}: ${args.channelId || args.query}`);
    return null;
  },
});

/**
 * Internal mutation to update cache access stats
 */
export const updateCacheAccess = internalMutation({
  args: {
    cacheId: v.id("youtubeSearchCache"),
  },
  handler: async (ctx, args) => {
    const cache = await ctx.db.get(args.cacheId);
    if (!cache) return;

    await ctx.db.patch(args.cacheId, {
      timesReused: cache.timesReused + 1,
      lastAccessedAt: Date.now(),
    });
  },
});

/**
 * Internal mutation to save search results to cache
 */
export const saveToCache = internalMutation({
  args: {
    query: v.string(),
    searchType: v.string(),
    maxResults: v.optional(v.number()),
    channelId: v.optional(v.string()),
    results: v.any(),
    ttl: v.number(),
  },
  handler: async (ctx, args) => {
    const normalizedQuery = normalizeQuery(args.query);
    const now = Date.now();

    await ctx.db.insert("youtubeSearchCache", {
      query: normalizedQuery,
      searchType: args.searchType,
      maxResults: args.maxResults,
      channelId: args.channelId,
      results: args.results,
      cachedAt: now,
      expiresAt: now + args.ttl,
      timesReused: 0,
      lastAccessedAt: now,
    });

    console.log(`[YouTube Cache] SAVED ${args.searchType}: ${args.channelId || args.query} (${args.results.length} results)`);
  },
});

/**
 * Helper to get channel details from YouTube API
 */
async function getChannelDetails(apiKey: string, channelIds: string) {
  if (!channelIds) return [];

  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet,statistics,contentDetails',
    id: channelIds,
  });

  try {
    const response = await fetch(`${YOUTUBE_API_BASE_URL}/channels?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error (channels):', data.error);
      throw new Error(`YouTube API error: ${data.error.message}`);
    }

    return data.items || [];
  } catch (err) {
    console.error('Failed to get channel details:', err);
    return [];
  }
}

/**
 * Helper to get video details from YouTube API
 */
async function getVideoDetails(apiKey: string, videoIds: string) {
  if (!videoIds) return [];

  const params = new URLSearchParams({
    key: apiKey,
    part: 'snippet,contentDetails,status,statistics',  // Added statistics for view count
    id: videoIds,
  });

  try {
    const response = await fetch(`${YOUTUBE_API_BASE_URL}/videos?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error (videos):', data.error);
      throw new Error(`YouTube API error: ${data.error.message}`);
    }

    return data.items || [];
  } catch (err) {
    console.error('Failed to get video details:', err);
    return [];
  }
}

/**
 * Helper to parse ISO 8601 duration to seconds
 */
function parseDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Helper to check video playability
 */
function checkVideoPlayability(videoDetails: any) {
  if (!videoDetails) {
    return { embeddable: false, ageRestricted: false, reason: 'Video not found' };
  }

  const embeddable = videoDetails.status?.embeddable ?? true;
  const contentRating = videoDetails.contentDetails?.contentRating || {};
  const ageRestricted = contentRating.ytRating === 'ytAgeRestricted';

  if (!embeddable) {
    return { embeddable: false, ageRestricted, reason: 'Video cannot be embedded' };
  }

  if (ageRestricted) {
    return { embeddable: true, ageRestricted: true, reason: 'Age-restricted content' };
  }

  return { embeddable: true, ageRestricted: false, reason: null };
}

/**
 * Action to search YouTube channels with caching
 */
export const searchChannelsCached = action({
  args: {
    query: v.string(),
    maxResults: v.optional(v.number()),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const maxResults = args.maxResults || 20;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY not configured in Convex environment variables');
    }

    // Check cache first (unless force refresh)
    if (!args.forceRefresh) {
      const cached = await ctx.runQuery(internal.youtubeCache.getCachedSearch, {
        query: args.query,
        searchType: "channels",
        maxResults,
      });

      if (cached) {
        // Update access stats
        await ctx.runMutation(internal.youtubeCache.updateCacheAccess, {
          cacheId: cached._id,
        });
        return { results: cached.results, fromCache: true };
      }
    }

    // Cache miss - call YouTube API
    const params = new URLSearchParams({
      key: apiKey,
      part: 'snippet',
      type: 'channel',
      q: args.query,
      maxResults: maxResults.toString(),
    });

    const response = await fetch(`${YOUTUBE_API_BASE_URL}/search?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
      // Return graceful error instead of throwing
      if (data.error.errors?.[0]?.reason === 'quotaExceeded') {
        return { results: [], fromCache: false, error: 'YouTube API quota exceeded. Try again tomorrow.' };
      }
      return { results: [], fromCache: false, error: `YouTube API error: ${data.error.message}` };
    }

    // Get channel IDs for subscriber counts
    const channelIds = data.items.map((item: any) => item.id.channelId).join(',');
    const channelDetails = await getChannelDetails(apiKey, channelIds);
    const channelMap = new Map(channelDetails.map((ch: any) => [ch.id, ch]));

    const results = data.items.map((item: any) => {
      const details = channelMap.get(item.id.channelId);
      const detailThumbnail = details?.snippet?.thumbnails?.high?.url ||
                              details?.snippet?.thumbnails?.medium?.url ||
                              details?.snippet?.thumbnails?.default?.url;
      const searchThumbnail = item.snippet.thumbnails?.high?.url ||
                              item.snippet.thumbnails?.medium?.url ||
                              item.snippet.thumbnails?.default?.url;
      return {
        channelId: item.id.channelId,
        channelTitle: item.snippet.title,
        thumbnailUrl: detailThumbnail || searchThumbnail,
        description: item.snippet.description,
        subscriberCount: details?.statistics?.subscriberCount,
        videoCount: details?.statistics?.videoCount,
      };
    });

    // Save to cache with 6-hour TTL
    await ctx.runMutation(internal.youtubeCache.saveToCache, {
      query: args.query,
      searchType: "channels",
      maxResults,
      results,
      ttl: SIX_HOURS,
    });

    return { results, fromCache: false };
  },
});

/**
 * Action to search YouTube videos with caching
 */
export const searchVideosCached = action({
  args: {
    query: v.string(),
    maxResults: v.optional(v.number()),
    forceRefresh: v.optional(v.boolean()),
    videoDuration: v.optional(v.string()), // 'short' (<4min), 'medium' (4-20min), 'long' (>20min)
    channelId: v.optional(v.string()), // Filter results to specific channel
  },
  handler: async (ctx, args) => {
    const maxResults = args.maxResults || 50; // Increased default from 20 to 50 for better results
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY not configured in Convex environment variables');
    }

    // Include duration and channelId in cache key by appending to query
    let cacheQuery = args.query;
    if (args.videoDuration) {
      cacheQuery += `|duration:${args.videoDuration}`;
    }
    if (args.channelId) {
      cacheQuery += `|channel:${args.channelId}`;
    }

    // Check cache first (unless force refresh)
    if (!args.forceRefresh) {
      const cached = await ctx.runQuery(internal.youtubeCache.getCachedSearch, {
        query: cacheQuery,
        searchType: "videos",
        maxResults,
      });

      if (cached) {
        // Update access stats
        await ctx.runMutation(internal.youtubeCache.updateCacheAccess, {
          cacheId: cached._id,
        });
        return { results: cached.results, fromCache: true };
      }
    }

    // Cache miss - call YouTube API
    // Use optimized parameters for better search relevance (matching YouTube's own search behavior)
    const params = new URLSearchParams({
      key: apiKey,
      part: 'snippet',
      type: 'video',
      q: args.query,
      maxResults: maxResults.toString(),
      safeSearch: 'strict',
      order: 'relevance',           // Explicitly set relevance ordering
      videoEmbeddable: 'true',      // Only return embeddable videos (saves API quota)
      regionCode: 'US',             // Optimize for US region
      relevanceLanguage: 'en',      // Prefer English content
    });

    // Add duration filter if specified
    // YouTube API: 'short' (<4min), 'medium' (4-20min), 'long' (>20min)
    if (args.videoDuration && ['short', 'medium', 'long'].includes(args.videoDuration)) {
      params.append('videoDuration', args.videoDuration);
    }

    // Add channel filter if specified (search within specific channel)
    if (args.channelId) {
      params.append('channelId', args.channelId);
    }

    const response = await fetch(`${YOUTUBE_API_BASE_URL}/search?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
      // Return graceful error instead of throwing
      if (data.error.errors?.[0]?.reason === 'quotaExceeded') {
        return { results: [], fromCache: false, error: 'YouTube API quota exceeded. Try again tomorrow.' };
      }
      return { results: [], fromCache: false, error: `YouTube API error: ${data.error.message}` };
    }

    // Get video details for duration and madeForKids
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    const videoDetails = await getVideoDetails(apiKey, videoIds);
    const videoMap = new Map(videoDetails.map((v: any) => [v.id, v]));

    const results = data.items.map((item: any) => {
      const details = videoMap.get(item.id.videoId);
      const duration = details?.contentDetails?.duration || 'PT0S';
      const playability = checkVideoPlayability(details);
      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
        duration,
        durationSeconds: parseDuration(duration),
        madeForKids: details?.status?.madeForKids ?? false,
        publishedAt: item.snippet.publishedAt,
        viewCount: details?.statistics?.viewCount || null,  // Added view count
        embeddable: playability.embeddable,
        ageRestricted: playability.ageRestricted,
      };
    });

    // Save to cache with 6-hour TTL (use cacheQuery which includes duration)
    await ctx.runMutation(internal.youtubeCache.saveToCache, {
      query: cacheQuery,
      searchType: "videos",
      maxResults,
      results,
      ttl: SIX_HOURS,
    });

    return { results, fromCache: false };
  },
});

/**
 * Action to get channel videos with caching
 */
export const getChannelVideosCached = action({
  args: {
    channelId: v.string(),
    maxVideos: v.optional(v.number()),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const maxVideos = args.maxVideos || 500;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY not configured in Convex environment variables');
    }

    // Check cache first (unless force refresh)
    if (!args.forceRefresh) {
      const cached = await ctx.runQuery(internal.youtubeCache.getCachedSearch, {
        query: args.channelId, // Use channelId as query for logging
        searchType: "channelVideos",
        channelId: args.channelId,
      });

      if (cached) {
        // Update access stats
        await ctx.runMutation(internal.youtubeCache.updateCacheAccess, {
          cacheId: cached._id,
        });
        return {
          videos: cached.results.videos || [],
          totalResults: cached.results.totalResults || 0,
          fromCache: true
        };
      }
    }

    // Cache miss - call YouTube API
    // First get the channel's uploads playlist ID
    const channelDetails = await getChannelDetails(apiKey, args.channelId);
    const uploadsPlaylistId = channelDetails[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return { videos: [], totalResults: 0, fromCache: false };
    }

    let allPlaylistItems: any[] = [];
    let nextPageToken: string | null = null;
    let totalResults = 0;

    // Paginate through all videos
    do {
      const params = new URLSearchParams({
        key: apiKey,
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: '50', // Max per request
      });
      if (nextPageToken) {
        params.append('pageToken', nextPageToken);
      }

      const response = await fetch(`${YOUTUBE_API_BASE_URL}/playlistItems?${params}`);
      const data = await response.json();

      if (data.error) {
        console.error('YouTube API error:', data.error);
        // Return graceful error instead of just breaking
        if (data.error.errors?.[0]?.reason === 'quotaExceeded') {
          return { videos: [], totalResults: 0, fromCache: false, error: 'YouTube API quota exceeded. Try again tomorrow.' };
        }
        return { videos: [], totalResults: 0, fromCache: false, error: `YouTube API error: ${data.error.message}` };
      }

      allPlaylistItems = allPlaylistItems.concat(data.items || []);
      nextPageToken = data.nextPageToken || null;
      totalResults = data.pageInfo?.totalResults || allPlaylistItems.length;

      // Stop if we've reached our limit
      if (allPlaylistItems.length >= maxVideos) {
        allPlaylistItems = allPlaylistItems.slice(0, maxVideos);
        break;
      }
    } while (nextPageToken);

    if (allPlaylistItems.length === 0) {
      return { videos: [], totalResults: 0, fromCache: false };
    }

    // Get video details in batches of 50 (API limit)
    const allVideos: any[] = [];
    for (let i = 0; i < allPlaylistItems.length; i += 50) {
      const batch = allPlaylistItems.slice(i, i + 50);
      const videoIds = batch.map((item: any) => item.snippet.resourceId.videoId).join(',');
      const videoDetails = await getVideoDetails(apiKey, videoIds);
      const videoMap = new Map(videoDetails.map((v: any) => [v.id, v]));

      const batchVideos = batch.map((item: any) => {
        const videoId = item.snippet.resourceId.videoId;
        const details = videoMap.get(videoId);
        const duration = details?.contentDetails?.duration || 'PT0S';
        const playability = checkVideoPlayability(details);
        return {
          videoId,
          title: item.snippet.title,
          thumbnailUrl: item.snippet.thumbnails?.high?.url ||
                        item.snippet.thumbnails?.medium?.url ||
                        item.snippet.thumbnails?.default?.url,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          description: item.snippet.description,
          duration,
          durationSeconds: parseDuration(duration),
          madeForKids: details?.status?.madeForKids ?? false,
          publishedAt: item.snippet.publishedAt,
          embeddable: playability.embeddable,
          ageRestricted: playability.ageRestricted,
        };
      });
      allVideos.push(...batchVideos);
    }

    const result = {
      videos: allVideos,
      totalResults,
    };

    // Save to cache with 1-hour TTL (channel videos change more frequently)
    await ctx.runMutation(internal.youtubeCache.saveToCache, {
      query: args.channelId,
      searchType: "channelVideos",
      channelId: args.channelId,
      results: result,
      ttl: ONE_HOUR,
    });

    return { ...result, fromCache: false };
  },
});

/**
 * Public query to get cache statistics
 */
export const getCacheStats = query({
  handler: async (ctx) => {
    const allCache = await ctx.db.query("youtubeSearchCache").collect();
    const now = Date.now();

    const stats = {
      totalEntries: allCache.length,
      validEntries: allCache.filter(c => c.expiresAt > now).length,
      expiredEntries: allCache.filter(c => c.expiresAt <= now).length,
      totalReuses: allCache.reduce((sum, c) => sum + c.timesReused, 0),
      byType: {
        channels: allCache.filter(c => c.searchType === "channels").length,
        videos: allCache.filter(c => c.searchType === "videos").length,
        channelVideos: allCache.filter(c => c.searchType === "channelVideos").length,
      },
    };

    return stats;
  },
});

/**
 * Internal mutation to clear video search cache (used when search algorithm changes)
 */
export const clearVideoSearchCache = internalMutation({
  handler: async (ctx) => {
    const videoCache = await ctx.db
      .query("youtubeSearchCache")
      .filter((q) => q.eq(q.field("searchType"), "videos"))
      .collect();

    let deleted = 0;
    for (const entry of videoCache) {
      await ctx.db.delete(entry._id);
      deleted++;
    }

    console.log(`[YouTube Cache] Cleared ${deleted} video search cache entries`);
    return { deleted };
  },
});
