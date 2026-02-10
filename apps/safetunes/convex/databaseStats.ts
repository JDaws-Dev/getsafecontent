import { query } from "./_generated/server";

// Query to get database statistics
export const getDatabaseStats = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const kidProfiles = await ctx.db.query("kidProfiles").collect();
    const approvedAlbums = await ctx.db.query("approvedAlbums").collect();
    const approvedSongs = await ctx.db.query("approvedSongs").collect();
    const albumRequests = await ctx.db.query("albumRequests").collect();
    const songRequests = await ctx.db.query("songRequests").collect();
    const playlists = await ctx.db.query("playlists").collect();
    const recentlyPlayed = await ctx.db.query("recentlyPlayed").collect();
    const blockedSearches = await ctx.db.query("blockedSearches").collect();

    return {
      users: {
        count: users.length,
        emails: users.map(u => u.email || 'no email'),
        familyCodes: users.map(u => u.familyCode || 'no code'),
      },
      kidProfiles: {
        count: kidProfiles.length,
        names: kidProfiles.map(k => k.name),
      },
      approvedAlbums: {
        count: approvedAlbums.length,
      },
      approvedSongs: {
        count: approvedSongs.length,
      },
      albumRequests: {
        count: albumRequests.length,
      },
      songRequests: {
        count: songRequests.length,
      },
      playlists: {
        count: playlists.length,
      },
      recentlyPlayed: {
        count: recentlyPlayed.length,
      },
      blockedSearches: {
        count: blockedSearches.length,
      },
    };
  },
});
