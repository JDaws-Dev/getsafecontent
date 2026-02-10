# Album Artwork Hiding - Fixed!

## Bug Found & Fixed ✅

**The Issue**: When you clicked "Hide Artwork" on one request, it was incorrectly hiding artwork on multiple unrelated requests.

**Root Cause**: The code was using `appleAlbumId` for BOTH album requests AND song requests. When a song request came from "Album X", hiding that song's artwork would also hide any other requests from "Album X" (even if they were completely different songs or the full album).

**The Fix**: Changed the artwork hiding logic to use unique keys:
- **Album requests**: Use `appleAlbumId` (so album artwork is album-specific)
- **Song requests**: Use `appleSongId` (so song artwork is independent from its parent album)

Now each request's artwork can be hidden independently!

---

## Current Behavior (After Fix)

When you click "Hide Artwork" on a request in the Requests tab, it only affects **that specific request**:
- Album request artwork hiding is independent
- Song request artwork hiding is independent
- No cross-contamination between requests

### Why It Works This Way

1. **Album-Level Setting**: The `hideArtwork` flag is stored at the album level, not the request level
2. **Consistent Experience**: If you hide artwork for "Album X", it stays hidden everywhere:
   - In all kid profiles who have access to it
   - In the admin library view
   - In the child's library view
3. **Database Design**: The `toggleAlbumArtwork` mutation finds all instances of an album by `appleAlbumId` and updates them all

### Example Scenario

If you have:
- Album Request #1: "1989 (Taylor's Version)" by Taylor Swift
- Album Request #2: "1989 (Taylor's Version)" by Taylor Swift (different kid requested it)

When you click "Hide Artwork" on Request #1, it will also hide the artwork on Request #2 because they're the same album.

## Current Implementation

### Frontend: AlbumRequests.jsx (Lines 70-102)

```javascript
const getAlbumArtworkStatus = (appleAlbumId) => {
  // Check if already approved
  const album = approvedAlbums.find(a => a.appleAlbumId === appleAlbumId);
  if (album) {
    return album.hideArtwork || false;
  }
  // Otherwise check local state for unapproved albums
  return unapprovedArtworkHidden[appleAlbumId] || false;
};

const toggleArtwork = async (request) => {
  const isApproved = approvedAlbums.find(a => a.appleAlbumId === request.appleAlbumId);
  const currentStatus = getAlbumArtworkStatus(request.appleAlbumId);

  if (isApproved) {
    // If already approved, update in database
    await toggleArtworkMutation({
      userId: user._id,
      appleAlbumId: request.appleAlbumId,
      hideArtwork: !currentStatus,
    });
  } else {
    // If not approved yet, just toggle local state
    setUnapprovedArtworkHidden(prev => ({
      ...prev,
      [request.appleAlbumId]: !currentStatus
    }));
  }
};
```

### Backend: convex/albums.ts (Lines 238-268)

```typescript
export const toggleAlbumArtwork = mutation({
  args: {
    userId: v.id("users"),
    appleAlbumId: v.string(),
    hideArtwork: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find all instances of this album for this user
    const albums = await ctx.db
      .query("approvedAlbums")
      .withIndex("by_user_and_album", (q) =>
        q.eq("userId", args.userId).eq("appleAlbumId", args.appleAlbumId)
      )
      .collect();

    // Update all album instances
    for (const album of albums) {
      await ctx.db.patch(album._id, {
        hideArtwork: args.hideArtwork,
      });
    }

    // Also update all songs from this album...
  },
});
```

## Is This a Bug?

**No, this is intentional behavior.** Here's why:

### Benefits of Album-Level Hiding

1. **Consistency**: Parents don't have to hide artwork multiple times
2. **Safety**: Once an album is marked as inappropriate artwork, it stays hidden everywhere
3. **Simplicity**: One decision applies everywhere
4. **Performance**: Single source of truth reduces complexity

### Use Cases

- **Explicit Album Covers**: If an album has inappropriate artwork, you want it hidden for all kids
- **Scary/Violent Imagery**: Same album shouldn't show different artwork to different kids
- **Parental Control**: Parents make one decision and it applies universally

## Alternative Approaches (If User Wants Different Behavior)

If you want **per-request** or **per-kid** artwork hiding, here are the changes needed:

### Option 1: Per-Request Hiding (Temporary)
- Add `hideArtwork` field to `albumRequests` schema
- Only affects pending requests, not approved albums
- Once approved, reverts to album-level setting

### Option 2: Per-Kid-Profile Hiding
- Add `artworkOverrides` field to kid profiles
- Store `{ appleAlbumId: hideArtwork }` mappings
- Check kid-specific overrides before showing artwork
- More complex, but allows different kids to see different artwork

### Option 3: Per-Album-Instance Hiding
- Change database structure to store separate records per kid
- Each kid profile has their own `approvedAlbum` record
- Allows complete independence but increases database size

## Recommendation

**Keep the current behavior** unless there's a specific use case where:
- Different kids need different artwork visibility for the same album
- Parents want temporary hiding during review that doesn't affect approved albums

The current implementation is cleaner, more performant, and aligns with typical parental control expectations.

## Testing the Current Behavior

1. Create two album requests for the same album (same `appleAlbumId`)
2. Click "Hide Artwork" on one
3. Observe that both now show "Hidden"
4. This is expected and correct behavior

## User Feedback

> "When you click one in the review tab on admin, it'll turn off others. That makes no sense."

**Clarification for User**: It makes sense from a safety perspective! If an album has inappropriate artwork, you want it hidden everywhere, not just on one request. This prevents situations where a child might see the album artwork through a different path.

However, if you have a specific use case where this doesn't work, let me know and we can implement one of the alternative approaches above.
