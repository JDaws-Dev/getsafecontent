/**
 * YouTube API Configuration
 *
 * Get your API key from Google Cloud Console:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable "YouTube Data API v3"
 * 4. Create credentials (API Key)
 * 5. Add the key to your .env file as VITE_YOUTUBE_API_KEY
 */

export const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';
export const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

// API Quota info:
// - Free tier: 10,000 units/day
// - search.list: 100 units per call
// - channels.list: 1 unit per call
// - videos.list: 1 unit per call
// - playlistItems.list: 1 unit per call

// IMPORTANT: Use the cached versions (searchChannelsCached, searchVideosCached, getChannelVideosCached)
// instead of the direct API functions below to reduce quota usage.
// Cached versions are available in YouTubeSearch.jsx component via Convex actions.

/**
 * Search YouTube for channels
 */
export async function searchChannels(query, maxResults = 20) {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key not configured');
    return [];
  }

  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    part: 'snippet',
    type: 'channel',
    q: query,
    maxResults: maxResults.toString(),
  });

  try {
    const response = await fetch(`${YOUTUBE_API_BASE_URL}/search?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
      return [];
    }

    // Get channel IDs for subscriber counts
    const channelIds = data.items.map((item) => item.id.channelId).join(',');
    const channelDetails = await getChannelDetails(channelIds);
    const channelMap = new Map(channelDetails.map((ch) => [ch.id, ch]));

    return data.items.map((item) => {
      const details = channelMap.get(item.id.channelId);
      // Get thumbnail from channel details (better quality) or search result
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
  } catch (err) {
    console.error('Failed to search channels:', err);
    return [];
  }
}

/**
 * Search YouTube for videos
 */
export async function searchVideos(query, maxResults = 20) {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API key not configured');
    return [];
  }

  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: maxResults.toString(),
    safeSearch: 'strict',
  });

  try {
    const response = await fetch(`${YOUTUBE_API_BASE_URL}/search?${params}`);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
      return [];
    }

    // Get video details for duration and madeForKids
    const videoIds = data.items.map((item) => item.id.videoId).join(',');
    const videoDetails = await getVideoDetails(videoIds);
    const videoMap = new Map(videoDetails.map((v) => [v.id, v]));

    return data.items.map((item) => {
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
        embeddable: playability.embeddable,
        ageRestricted: playability.ageRestricted,
      };
    });
  } catch (err) {
    console.error('Failed to search videos:', err);
    return [];
  }
}

/**
 * Get channel details by ID(s)
 */
export async function getChannelDetails(channelIds) {
  if (!YOUTUBE_API_KEY || !channelIds) return [];

  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    part: 'snippet,statistics,contentDetails',
    id: channelIds,
  });

  try {
    const response = await fetch(`${YOUTUBE_API_BASE_URL}/channels?${params}`);
    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error('Failed to get channel details:', err);
    return [];
  }
}

/**
 * Get video details by ID(s)
 * Includes embeddable status, content rating, and player info for dimensions
 */
export async function getVideoDetails(videoIds) {
  if (!YOUTUBE_API_KEY || !videoIds) return [];

  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    part: 'snippet,contentDetails,status,player',
    id: videoIds,
  });

  try {
    const response = await fetch(`${YOUTUBE_API_BASE_URL}/videos?${params}`);
    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error('Failed to get video details:', err);
    return [];
  }
}

/**
 * Check if a video is embeddable and not age-restricted
 * Returns { embeddable, ageRestricted, reason }
 */
export function checkVideoPlayability(videoDetails) {
  if (!videoDetails) {
    return { embeddable: false, ageRestricted: false, reason: 'Video not found' };
  }

  const embeddable = videoDetails.status?.embeddable ?? true;
  const contentRating = videoDetails.contentDetails?.contentRating || {};

  // Check for age restrictions (ytRating is for YouTube's own rating)
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
 * Get videos from a channel's uploads playlist
 * Now fetches ALL videos using pagination (up to maxVideos limit)
 */
export async function getChannelVideos(channelId, maxVideos = 500) {
  if (!YOUTUBE_API_KEY) return { videos: [], totalResults: 0 };

  try {
    // First get the channel's uploads playlist ID
    const channelDetails = await getChannelDetails(channelId);
    const uploadsPlaylistId = channelDetails[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) return { videos: [], totalResults: 0 };

    let allPlaylistItems = [];
    let nextPageToken = null;
    let totalResults = 0;

    // Paginate through all videos
    do {
      const params = new URLSearchParams({
        key: YOUTUBE_API_KEY,
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
        break;
      }

      allPlaylistItems = allPlaylistItems.concat(data.items || []);
      nextPageToken = data.nextPageToken;
      totalResults = data.pageInfo?.totalResults || allPlaylistItems.length;

      // Stop if we've reached our limit
      if (allPlaylistItems.length >= maxVideos) {
        allPlaylistItems = allPlaylistItems.slice(0, maxVideos);
        break;
      }
    } while (nextPageToken);

    if (allPlaylistItems.length === 0) {
      return { videos: [], totalResults: 0 };
    }

    // Get video details in batches of 50 (API limit)
    const allVideos = [];
    for (let i = 0; i < allPlaylistItems.length; i += 50) {
      const batch = allPlaylistItems.slice(i, i + 50);
      const videoIds = batch.map((item) => item.snippet.resourceId.videoId).join(',');
      const videoDetails = await getVideoDetails(videoIds);
      const videoMap = new Map(videoDetails.map((v) => [v.id, v]));

      const batchVideos = batch.map((item) => {
        const videoId = item.snippet.resourceId.videoId;
        const details = videoMap.get(videoId);
        const duration = details?.contentDetails?.duration || 'PT0S';
        const playability = checkVideoPlayability(details);
        // Detect vertical video from player embed dimensions
        const embedWidth = parseInt(details?.player?.embedWidth || '0', 10);
        const embedHeight = parseInt(details?.player?.embedHeight || '0', 10);
        const isVertical = embedWidth > 0 && embedHeight > 0 && embedHeight > embedWidth;
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
          isVertical,
        };
      });
      allVideos.push(...batchVideos);
    }

    return {
      videos: allVideos,
      totalResults,
    };
  } catch (err) {
    console.error('Failed to get channel videos:', err);
    return { videos: [], totalResults: 0 };
  }
}

/**
 * Parse ISO 8601 duration to seconds
 * e.g., "PT4M13S" -> 253
 */
export function parseDuration(duration) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format seconds to human-readable duration
 * e.g., 253 -> "4:13"
 */
export function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format subscriber count
 * e.g., 1234567 -> "1.2M"
 */
export function formatSubscribers(count) {
  if (!count) return '';
  const num = parseInt(count, 10);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K`;
  }
  return count;
}

/**
 * Decode HTML entities in text
 * e.g., "Charlie Kirk&#39;s" -> "Charlie Kirk's"
 */
export function decodeHtmlEntities(text) {
  if (!text) return '';
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Format view count
 * e.g., 1234567 -> "1.2M views"
 */
export function formatViewCount(count) {
  if (!count) return '';
  const num = parseInt(count, 10);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M views`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(0)}K views`;
  }
  return `${count} views`;
}

/**
 * Format relative time ago
 * e.g., "2024-06-15T10:00:00Z" -> "9 months ago"
 */
export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  if (diffWeeks > 0) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}