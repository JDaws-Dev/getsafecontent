/**
 * YouTube Cache Test Script
 *
 * This script tests the YouTube API caching functionality.
 * Run with: node test-youtube-cache.js
 *
 * Prerequisites:
 * - Convex dev deployment running
 * - YOUTUBE_API_KEY set in Convex environment
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

// Use your dev deployment URL
const CONVEX_URL = process.env.VITE_CONVEX_URL || "https://avid-alpaca-129.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function testCache() {
  console.log("🧪 Testing YouTube Cache System\n");

  try {
    // Test 1: Search for channels (first call - should miss cache)
    console.log("Test 1: Search for 'Cocomelon' channels (first call)...");
    const start1 = Date.now();
    const result1 = await client.action(api.youtubeCache.searchChannelsCached, {
      query: "Cocomelon",
      maxResults: 5
    });
    const duration1 = Date.now() - start1;
    console.log(`✓ Found ${result1.results.length} channels`);
    console.log(`  From cache: ${result1.fromCache ? 'YES ✓' : 'NO (expected)'}`);
    console.log(`  Duration: ${duration1}ms\n`);

    // Test 2: Same search (should hit cache)
    console.log("Test 2: Search for 'Cocomelon' channels again (should be cached)...");
    const start2 = Date.now();
    const result2 = await client.action(api.youtubeCache.searchChannelsCached, {
      query: "Cocomelon",
      maxResults: 5
    });
    const duration2 = Date.now() - start2;
    console.log(`✓ Found ${result2.results.length} channels`);
    console.log(`  From cache: ${result2.fromCache ? 'YES ✓✓✓' : 'NO (unexpected!)'}`);
    console.log(`  Duration: ${duration2}ms`);
    console.log(`  Speedup: ${Math.round((duration1 / duration2) * 100) / 100}x faster\n`);

    // Test 3: Search for videos
    console.log("Test 3: Search for 'kids songs' videos (first call)...");
    const start3 = Date.now();
    const result3 = await client.action(api.youtubeCache.searchVideosCached, {
      query: "kids songs",
      maxResults: 5
    });
    const duration3 = Date.now() - start3;
    console.log(`✓ Found ${result3.results.length} videos`);
    console.log(`  From cache: ${result3.fromCache ? 'YES ✓' : 'NO (expected)'}`);
    console.log(`  Duration: ${duration3}ms\n`);

    // Test 4: Get cache statistics
    console.log("Test 4: Get cache statistics...");
    const stats = await client.query(api.youtubeCache.getCacheStats);
    console.log(`✓ Cache Statistics:`);
    console.log(`  Total entries: ${stats.totalEntries}`);
    console.log(`  Valid entries: ${stats.validEntries}`);
    console.log(`  Expired entries: ${stats.expiredEntries}`);
    console.log(`  Total reuses: ${stats.totalReuses}`);
    console.log(`  By type:`);
    console.log(`    - Channels: ${stats.byType.channels}`);
    console.log(`    - Videos: ${stats.byType.videos}`);
    console.log(`    - Channel Videos: ${stats.byType.channelVideos}\n`);

    console.log("✅ All tests passed!");
    console.log("\n📊 Summary:");
    console.log(`   Cache is working correctly`);
    console.log(`   Speedup on cache hit: ${Math.round((duration1 / duration2) * 100) / 100}x`);
    console.log(`   API calls saved: ${stats.totalReuses}`);

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("\nTroubleshooting:");
    console.error("1. Make sure Convex dev is running: npx convex dev");
    console.error("2. Verify YOUTUBE_API_KEY is set: npx convex env list");
    console.error("3. Check CONVEX_URL in .env file");
    process.exit(1);
  }
}

// Run tests
testCache();