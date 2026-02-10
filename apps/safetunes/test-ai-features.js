/**
 * Simple Test Script for AI Features
 *
 * This script tests the AI recommendation and content review features
 * to verify they're working correctly with caching.
 *
 * Run with: node test-ai-features.js
 */

import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL || "your-deployment-url");

async function testAIRecommendations() {
  console.log("\n🎵 Testing AI Recommendations...\n");

  try {
    const testParams = {
      kidAge: 8,
      musicPreferences: "Likes Disney music and Taylor Swift",
      targetGenres: ["Pop", "Soundtrack"],
      restrictions: "No romance or scary themes"
    };

    console.log("📤 Calling AI recommendations (first call - should hit OpenAI)...");
    const result1 = await client.action("ai/recommendations:getAiRecommendations", testParams);
    console.log("✅ First call result:", {
      fromCache: result1.fromCache,
      recommendationCount: result1.recommendations?.length || 0,
    });

    if (result1.recommendations?.length > 0) {
      console.log("\n📋 Sample recommendations:");
      result1.recommendations.slice(0, 3).forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.type}: ${rec.name}`);
        console.log(`     Reason: ${rec.reason}`);
      });
    }

    console.log("\n📤 Calling AI recommendations again (should use cache)...");
    const result2 = await client.action("ai/recommendations:getAiRecommendations", testParams);
    console.log("✅ Second call result:", {
      fromCache: result2.fromCache,
      recommendationCount: result2.recommendations?.length || 0,
    });

    if (result2.fromCache) {
      console.log("🎉 CACHE WORKING! Second call used cached results.");
    } else {
      console.log("⚠️  Cache miss - this might indicate an issue with cache hashing.");
    }

  } catch (error) {
    console.error("❌ Error testing recommendations:", error.message);
    console.error("   Full error:", error);
  }
}

async function testContentReview() {
  console.log("\n📝 Testing Content Review...\n");

  try {
    const testSong = {
      reviewType: "song",
      appleTrackId: "test-123456",
      trackName: "Let It Go",
      artistName: "Idina Menzel",
      lyrics: `Let it go, let it go
Can't hold it back anymore
Let it go, let it go
Turn away and slam the door
I don't care what they're going to say
Let the storm rage on
The cold never bothered me anyway`
    };

    console.log("📤 Reviewing song (first call - should hit OpenAI)...");
    const result1 = await client.action("ai/contentReview:reviewContent", testSong);
    console.log("✅ First review result:", {
      fromCache: result1.fromCache,
      overallRating: result1.review?.overallRating,
      ageRecommendation: result1.review?.ageRecommendation,
      issueCount: result1.review?.inappropriateContent?.length || 0,
    });

    if (result1.review?.summary) {
      console.log("\n📄 Summary:", result1.review.summary);
    }

    if (result1.review?.inappropriateContent?.length > 0) {
      console.log("\n⚠️  Issues found:");
      result1.review.inappropriateContent.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.category} (${issue.severity})`);
        console.log(`     Quote: "${issue.quote}"`);
      });
    } else {
      console.log("\n✅ No inappropriate content found!");
    }

    console.log("\n📤 Reviewing same song again (should use cache)...");
    const result2 = await client.action("ai/contentReview:reviewContent", {
      reviewType: "song",
      appleTrackId: "test-123456",
      trackName: "Let It Go",
      artistName: "Idina Menzel",
    });
    console.log("✅ Second review result:", {
      fromCache: result2.fromCache,
      cacheHitCount: result2.cacheHitCount,
      overallRating: result2.review?.overallRating,
    });

    if (result2.fromCache) {
      console.log("🎉 CACHE WORKING! Second review used cached results.");
      console.log(`   This content has been reviewed ${result2.cacheHitCount + 1} times total.`);
    } else {
      console.log("⚠️  Cache miss - this might indicate an issue.");
    }

  } catch (error) {
    console.error("❌ Error testing content review:", error.message);
    console.error("   Full error:", error);
  }
}

async function runTests() {
  console.log("═══════════════════════════════════════");
  console.log("  SafeTunes AI Feature Tests");
  console.log("═══════════════════════════════════════");

  await testAIRecommendations();
  await testContentReview();

  console.log("\n═══════════════════════════════════════");
  console.log("  Tests Complete!");
  console.log("═══════════════════════════════════════\n");
}

// Run the tests
runTests().catch(console.error);
