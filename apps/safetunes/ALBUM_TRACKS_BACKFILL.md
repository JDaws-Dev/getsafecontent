# Album Tracks Feature

## Summary
Database storage for individual album tracks enables song-level search in the kid's library view. When albums are approved, individual track data is stored, making it possible to search for songs by name (e.g., "Don't Stop Believing").

## How It Works

### When Albums Are Approved
1. Admin approves an album in the parent dashboard
2. Frontend fetches track list from Apple Music API
3. Tracks are passed to the `approveAlbum` mutation
4. Backend stores tracks in `albumTracks` table
5. Kid's library can now search individual song names

### Database Schema

```typescript
// convex/schema.ts
albumTracks: defineTable({
  userId: v.id("users"),
  appleAlbumId: v.string(),
  appleSongId: v.string(),
  songName: v.string(),
  artistName: v.string(),
  trackNumber: v.optional(v.number()),
  durationInMillis: v.optional(v.number()),
  isExplicit: v.optional(v.boolean()),
  createdAt: v.number(),
})
  .index("by_user_and_album", ["userId", "appleAlbumId"])
  .index("by_user_and_song", ["userId", "appleSongId"])
```

## Key Files

### Backend
- `convex/schema.ts` - `albumTracks` table definition
- `convex/albums.ts` - `approveAlbum` mutation stores tracks, `getAlbumsWithApprovedSongs` query returns tracks

### Frontend
- `src/components/admin/AlbumSearch.jsx` - Fetches tracks from Apple Music on approval
- `src/components/child/ChildDashboard.jsx` - Searches song names within albums

## Search Behavior

**Kid's Library Search:**
- Searches album names, artists, genres, AND individual song names
- Searching "Don't Stop Believing" shows albums containing that song
- Songs section shows ALL tracks from ALL approved albums
- Deduplicates by `appleSongId`

## Technical Notes

- Track storage is lightweight (~200-500 bytes per track)
- For 1000 albums = ~10-15K song records (manageable)
- Tracks stored with user's `userId` for data isolation
- Apple Music album IDs are global - any authenticated user can fetch tracks

## Status: COMPLETE

- Feature is fully implemented and working
- No backfill needed (no active users with legacy data)
- BackfillComponent has been removed
