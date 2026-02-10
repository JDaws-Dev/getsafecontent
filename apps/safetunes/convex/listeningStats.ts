import { v } from "convex/values";
import { query } from "./_generated/server";

// Get comprehensive listening stats for all kids (for parent dashboard)
export const getAllKidsStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all kid profiles for this user
    const kidProfiles = await ctx.db
      .query("kidProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const stats = [];

    for (const kid of kidProfiles) {
      // Get recently played items (used for all stats now)
      const recentlyPlayed = await ctx.db
        .query("recentlyPlayed")
        .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", kid._id))
        .collect();

      // Calculate stats
      let totalPlays = 0;
      let totalListenTimeMs = 0;
      const artistCounts: Record<string, { count: number; name: string; artworkUrl?: string }> = {};
      const genreCounts: Record<string, number> = {};

      for (const item of recentlyPlayed) {
        const playCount = item.playCount || 1;
        totalPlays += playCount;
        totalListenTimeMs += item.totalListenTimeMs || 0;

        // Track artist plays
        if (item.artistName) {
          if (!artistCounts[item.artistName]) {
            artistCounts[item.artistName] = {
              count: 0,
              name: item.artistName,
              artworkUrl: item.artworkUrl,
            };
          }
          artistCounts[item.artistName].count += playCount;
        }
      }

      // Sort to get top artists
      const topArtists = Object.values(artistCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get top songs
      const topSongs = [...recentlyPlayed]
        .sort((a, b) => (b.playCount || 1) - (a.playCount || 1))
        .slice(0, 5)
        .map((s) => ({
          id: s.itemId,
          name: s.itemName,
          artistName: s.artistName,
          artworkUrl: s.artworkUrl,
          playCount: s.playCount || 1,
        }));

      // Create daily breakdown for chart (last 7 days) from recentlyPlayed data
      const dailyBreakdown = [];
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setDate(dayStart.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dateString = dayStart.toISOString().split("T")[0];
        const dayName = dayStart.toLocaleDateString("en-US", { weekday: "short" });

        // Sum up listen time for plays on this day
        const dayMinutes = recentlyPlayed
          .filter((item) => {
            const playedAt = item.playedAt;
            return playedAt >= dayStart.getTime() && playedAt <= dayEnd.getTime();
          })
          .reduce((sum, item) => sum + Math.floor((item.totalListenTimeMs || 0) / 60000), 0);

        dailyBreakdown.push({
          date: dateString,
          dayName,
          minutes: dayMinutes,
        });
      }

      // Calculate weekly listening time from daily breakdown
      const weeklyMinutes = dailyBreakdown.reduce(
        (sum, day) => sum + day.minutes,
        0
      );

      // Get most recent play
      const mostRecent = recentlyPlayed.length > 0
        ? [...recentlyPlayed].sort((a, b) => b.playedAt - a.playedAt)[0]
        : null;

      stats.push({
        kidId: kid._id,
        kidName: kid.name,
        kidAvatar: kid.avatar,
        kidColor: kid.color,
        totalPlays,
        totalListenTimeMinutes: Math.floor(totalListenTimeMs / 60000),
        weeklyListenTimeMinutes: weeklyMinutes,
        uniqueSongs: recentlyPlayed.filter((i) => i.itemType === "song").length,
        topArtists,
        topSongs,
        dailyBreakdown,
        mostRecentPlay: mostRecent
          ? {
              name: mostRecent.itemName,
              artistName: mostRecent.artistName,
              artworkUrl: mostRecent.artworkUrl,
              playedAt: mostRecent.playedAt,
            }
          : null,
      });
    }

    return stats;
  },
});

// Get detailed stats for a single kid
export const getKidDetailedStats = query({
  args: {
    kidProfileId: v.id("kidProfiles"),
    days: v.optional(v.number()), // Number of days to analyze (default 30)
  },
  handler: async (ctx, args) => {
    const daysToAnalyze = args.days || 30;

    // Get kid profile
    const kid = await ctx.db.get(args.kidProfileId);
    if (!kid) return null;

    // Get recently played items (used for all stats now)
    const recentlyPlayed = await ctx.db
      .query("recentlyPlayed")
      .withIndex("by_kid_profile", (q) => q.eq("kidProfileId", args.kidProfileId))
      .collect();

    // Calculate comprehensive stats
    let totalPlays = 0;
    let totalListenTimeMs = 0;
    const artistCounts: Record<string, { count: number; name: string; artworkUrl?: string }> = {};
    const hourCounts: Record<number, number> = {};

    for (const item of recentlyPlayed) {
      const playCount = item.playCount || 1;
      totalPlays += playCount;
      totalListenTimeMs += item.totalListenTimeMs || 0;

      // Track artist plays
      if (item.artistName) {
        if (!artistCounts[item.artistName]) {
          artistCounts[item.artistName] = {
            count: 0,
            name: item.artistName,
            artworkUrl: item.artworkUrl,
          };
        }
        artistCounts[item.artistName].count += playCount;
      }

      // Track listening hours (for when they listen most)
      const playedDate = new Date(item.playedAt);
      const hour = playedDate.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + playCount;
    }

    // Top artists
    const topArtists = Object.values(artistCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top songs
    const topSongs = [...recentlyPlayed]
      .sort((a, b) => (b.playCount || 1) - (a.playCount || 1))
      .slice(0, 10)
      .map((s) => ({
        id: s.itemId,
        name: s.itemName,
        artistName: s.artistName,
        artworkUrl: s.artworkUrl,
        playCount: s.playCount || 1,
        totalListenTimeMinutes: Math.floor((s.totalListenTimeMs || 0) / 60000),
      }));

    // Daily breakdown from recentlyPlayed data (more accurate than dailyListeningTime)
    const dailyBreakdown = [];
    for (let i = daysToAnalyze - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dateString = dayStart.toISOString().split("T")[0];

      // Sum up listen time for plays on this day
      const dayMinutes = recentlyPlayed
        .filter((item) => {
          const playedAt = item.playedAt;
          return playedAt >= dayStart.getTime() && playedAt <= dayEnd.getTime();
        })
        .reduce((sum, item) => sum + Math.floor((item.totalListenTimeMs || 0) / 60000), 0);

      dailyBreakdown.push({
        date: dateString,
        minutes: dayMinutes,
      });
    }

    // Peak listening hours
    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Calculate averages from daily breakdown
    const daysWithActivity = dailyBreakdown.filter((d) => d.minutes > 0).length || 1;
    const avgDailyMinutes = Math.round(
      dailyBreakdown.reduce((sum, d) => sum + d.minutes, 0) / daysWithActivity
    );

    // Recent activity (last 10 plays)
    const recentActivity = [...recentlyPlayed]
      .sort((a, b) => b.playedAt - a.playedAt)
      .slice(0, 10)
      .map((item) => ({
        name: item.itemName,
        artistName: item.artistName,
        artworkUrl: item.artworkUrl,
        playedAt: item.playedAt,
        itemType: item.itemType,
      }));

    return {
      kidId: kid._id,
      kidName: kid.name,
      kidAvatar: kid.avatar,
      kidColor: kid.color,
      summary: {
        totalPlays,
        totalListenTimeMinutes: Math.floor(totalListenTimeMs / 60000),
        totalListenTimeHours: Math.round((totalListenTimeMs / 3600000) * 10) / 10,
        uniqueSongs: recentlyPlayed.filter((i) => i.itemType === "song").length,
        uniqueArtists: Object.keys(artistCounts).length,
        avgDailyMinutes,
      },
      topArtists,
      topSongs,
      dailyBreakdown,
      peakHours,
      recentActivity,
    };
  },
});
