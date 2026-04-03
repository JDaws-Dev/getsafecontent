# Playlist Export to Apple Music - Implementation Plan

## Feature Overview

Allow graduating teens (or parents on their behalf) to export curated SafeTunes playlists directly to the teen's personal Apple Music account. The teen signs into their own Apple ID via MusicKit, and the system creates playlists and adds songs in their Apple Music library.

This is an MVP -- no re-export tracking, no account graduation/disabling, just a clean export flow.

## UX Flow

1. Parent navigates to **Settings > Kid Profiles > [Kid Name]** (edit view)
2. Clicks **"Export Playlists to Apple Music"** button (below existing profile actions)
3. A modal wizard opens with 4 steps:
   - **Step 1 - Select Playlists**: Checkboxes for each playlist (default all selected). Shows playlist name, song count, and total duration.
   - **Step 2 - Sign Into Apple Music**: Teen signs into their own Apple ID via MusicKit authorization with library write access. Shows instructions explaining the teen should use their personal Apple ID, not the parent's.
   - **Step 3 - Exporting**: Progress bar showing current playlist being exported, songs added, overall progress percentage.
   - **Step 4 - Results Summary**: Shows X playlists created, Y songs exported, Z songs skipped (unavailable in catalog). Option to close.

## Files to Create

| File | Purpose |
|------|---------|
| `apps/safetunes/src/components/admin/ExportPlaylistsModal.jsx` | The 4-step modal wizard component |

## Files to Modify

| File | Change |
|------|--------|
| `apps/safetunes/src/config/musickit.js` | Add `createLibraryPlaylist()` and `addSongsToLibraryPlaylist()` methods |
| `apps/safetunes/src/components/admin/Settings.jsx` | Add "Export Playlists to Apple Music" button in kid profile edit view, import modal |

## Database Schema Changes

**None.** For MVP, all export state is managed in component state. No new tables or fields.

## Apple MusicKit API Calls Needed

### 1. Authorization with Library Write Access

MusicKit's `authorize()` already requests the user music token. Library write access is implicitly granted when the user authorizes MusicKit -- the developer token's entitlements determine what scopes are available. No special parameter is needed beyond the standard `authorize()` call.

### 2. Create Playlist in User's Library

```
POST /v1/me/library/playlists
Body: {
  attributes: {
    name: "Playlist Name",
    description: "Exported from SafeTunes"
  }
}
Response: { data: [{ id: "p.xxxxxxxx", ... }] }
```

### 3. Add Songs to Library Playlist

```
POST /v1/me/library/playlists/{id}/tracks
Body: {
  data: [
    { id: "song-catalog-id-1", type: "songs" },
    { id: "song-catalog-id-2", type: "songs" },
    ...
  ]
}
```

Songs are referenced by their Apple Music **catalog IDs** (`appleSongId` in our schema), which map directly.

### Rate Limiting Strategy

- Process playlists sequentially (one at a time)
- Batch songs in groups of 25 per API call (Apple Music allows up to 25 tracks per request)
- Add a 200ms delay between API calls to stay well under the ~5 req/sec limit
- Show per-playlist progress in the UI

## Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Song no longer in Apple Music catalog | Skip it, increment "skipped" counter, show in results |
| MusicKit authorization denied/cancelled | Show friendly error, allow retry from Step 2 |
| Network error during export | Stop export, show partial results with option to retry remaining |
| Kid has no playlists | Disable the export button, show tooltip explaining why |
| Empty playlist (0 songs) | Skip it automatically, note in results |
| Library ID songs (i.xxxxx) | These should not exist in playlists (playlists store catalog IDs), but if found, skip them |
| Teen closes modal mid-export | Export stops (component unmounts), partial playlists may exist in Apple Music |
| Rate limit hit (429 response) | Wait 2 seconds, retry once, then skip and continue |

## Implementation Steps

### Step 1: Add MusicKit library write methods

Add two new methods to `MusicKitService` in `musickit.js`:
- `createLibraryPlaylist(name, description)` -- creates a playlist in the authorized user's library
- `addSongsToLibraryPlaylist(playlistId, songIds)` -- adds songs in batches of 25

### Step 2: Create ExportPlaylistsModal component

Build the 4-step wizard modal:
- Step 1: Fetch playlists for the selected kid via `useQuery(api.playlists.getPlaylistsForKid)`
- Step 2: MusicKit auth (separate from parent's existing auth -- teen signs in with their own Apple ID)
- Step 3: Sequential export with progress tracking
- Step 4: Results summary

### Step 3: Add export button to Settings

In the kid profile edit view within `Settings.jsx`, add the "Export Playlists to Apple Music" button below the existing "Reset Profile" and "Delete Profile" buttons.

### Step 4: Test manually

- Create a test playlist with known songs
- Export to a personal Apple Music account
- Verify playlists and songs appear correctly
