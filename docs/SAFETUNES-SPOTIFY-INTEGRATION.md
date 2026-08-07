# SafeTunes Spotify Integration Plan

**Status:** Planned (not started)
**Priority:** Future enhancement
**Date:** April 4, 2026

## Overview

Add Spotify as a second music provider alongside Apple Music. Parents choose their service during onboarding. The entire family uses one provider (no mixing Apple + Spotify in one account).

## Current State

SafeTunes is tightly coupled to Apple MusicKit JS v3:
- **Service layer**: `src/config/musickit.js` (1,193 lines) — singleton wrapping `window.MusicKit`
- **32 files** import `musicKitService` directly
- **Schema**: 9+ tables use `appleSongId` / `appleAlbumId` as external identifiers
- **Users table**: stores `appleMusicAuthorized`, `appleMusicAuthDate`

## Key Differences: Apple Music vs Spotify

| Concern | Apple MusicKit | Spotify Web Playback SDK |
|---------|---------------|--------------------------|
| Subscription for playback | Apple Music sub required | **Spotify Premium** required |
| Free tier | No free tier | 30-sec previews only |
| Auth | Developer token (JWT) + popup | OAuth 2.0 PKCE (redirect flow) |
| Token expiry | Long-lived | **1 hour** (needs refresh) |
| Search API | `/v1/catalog/{storefront}/search` | `/v1/search` |
| Playlist write | MusicKit library API | `/v1/users/{id}/playlists` |
| Lyrics | Built-in (but we use LRCLib) | Not available (we use LRCLib) |
| Artwork URLs | Template `{w}x{h}` | Direct URLs |

---

## Phase 1: Schema & Data Model

### 1.1 New fields on `users` table

```
musicProvider          // "apple_music" | "spotify" (default: "apple_music")
spotifyAccessToken     // encrypted access token
spotifyRefreshToken    // encrypted refresh token
spotifyTokenExpiresAt  // Unix timestamp
spotifyUserId          // Spotify user ID
spotifyProductType     // "premium" | "free" | "open"
spotifyAuthorized      // boolean
spotifyAuthDate        // timestamp
```

Keep existing `appleMusicAuthorized` and `appleMusicAuthDate` as-is.

### 1.2 Provider-agnostic IDs on content tables

Add optional fields alongside existing Apple-prefixed ones (schema validation is already off):

```
provider: optional(string)        // "apple_music" | "spotify"
externalSongId: optional(string)  // provider-agnostic song ID
externalAlbumId: optional(string) // provider-agnostic album ID
```

**Tables affected:** `approvedSongs`, `approvedAlbums`, `albumTracks`, `playlists` (embedded songs), `featuredPlaylists`, `featuredPlaylistTracks`, `albumRequests`, `songRequests`, `contentReviewCache`, `albumOverviewCache`, `recentlyPlayed`

### 1.3 New indexes

```typescript
// approvedSongs
.index("by_user_and_external_song", ["userId", "provider", "externalSongId"])
// approvedAlbums
.index("by_user_and_external_album", ["userId", "provider", "externalAlbumId"])
```

### 1.4 Helper functions

```typescript
function getSongId(record) {
  return record.externalSongId || record.appleSongId;
}
function getProvider(record) {
  return record.provider || "apple_music";
}
```

### 1.5 Migration

Batch script to backfill existing records:
- Set `provider: "apple_music"` on all existing records
- Copy `appleSongId` -> `externalSongId`, `appleAlbumId` -> `externalAlbumId`
- Can run lazily since schema validation is off

---

## Phase 2: Music Service Abstraction

### 2.1 Provider interface

Create `src/config/MusicProvider.js` — abstract base class:

```javascript
class MusicProvider {
  // Auth
  async initialize() {}
  async authorize() {}
  async unauthorize() {}
  checkAuthorization() {}

  // Search & catalog
  async search(query, options) {}
  async searchAlbums(query, limit) {}
  async getAlbum(albumId) {}
  async getAlbumTracks(albumId) {}

  // Playback
  async playSong(songId, meta) {}
  async playApprovedSongs(tracks, startIndex) {}
  async playAlbum(albumId) {}
  pause() {}
  play() {}
  stop() {}
  skipToNext() {}
  skipToPrevious() {}
  seekToTime(time) {}
  setVolume(volume) {}
  toggleShuffle() {}
  toggleRepeat() {}

  // Queue
  getQueue() {}
  async addToQueue(songId) {}
  async clearQueue() {}

  // Library write (export)
  async createLibraryPlaylist(name, description) {}
  async addSongsToLibraryPlaylist(playlistId, songIds) {}

  // Info
  getProviderName() {}   // "Apple Music" | "Spotify"
  getProviderId() {}     // "apple_music" | "spotify"
  requiresPremium() {}   // false | true
}
```

### 2.2 Normalized result shape

All search/catalog methods return:

```javascript
{
  id: string,              // external ID
  provider: string,        // "apple_music" | "spotify"
  type: string,            // "song" | "album" | "artist"
  name: string,
  artistName: string,
  albumName?: string,
  artworkUrl?: string,     // direct URL (no templates)
  durationInMillis?: number,
  isExplicit?: boolean,
  trackNumber?: number,
  genres?: string[],
  raw: object              // original API response
}
```

### 2.3 Provider Manager singleton

Create `src/config/MusicProviderManager.js`:

```javascript
class MusicProviderManager {
  registerProvider(id, instance) {}
  setActiveProvider(id) {}
  getActiveProvider() {}     // returns current MusicProvider
}
```

All 32 files that import `musicKitService` migrate to `musicProviderManager.getActiveProvider()`. Can be done incrementally — default to Apple Music until Spotify is ready.

### 2.4 Event normalization

Map provider-specific events to common names:

| Common Event | Apple MusicKit | Spotify SDK |
|-------------|---------------|-------------|
| `playbackStateChanged` | `playbackStateDidChange` | `player_state_changed` |
| `playbackTimeChanged` | `playbackTimeDidChange` | (poll from state) |
| `nowPlayingChanged` | `nowPlayingItemDidChange` | `player_state_changed` |
| `queueChanged` | `queueItemsDidChange` | (manual tracking) |

---

## Phase 3: Spotify Service Implementation

### 3.1 OAuth (PKCE flow)

Create `src/config/spotifyAuth.js`:

1. Generate `code_verifier` (128-char random) + `code_challenge` (SHA-256, base64url)
2. Redirect to `https://accounts.spotify.com/authorize` with PKCE params
3. User authorizes, redirected back to `/callback/spotify`
4. Exchange `code` + `code_verifier` for tokens via `https://accounts.spotify.com/api/token`
5. Store tokens in Convex via mutation

**Required scopes:** `streaming`, `user-read-email`, `user-read-private`, `user-library-read`, `user-library-modify`, `playlist-read-private`, `playlist-modify-public`, `playlist-modify-private`

**New env vars:** `VITE_SPOTIFY_CLIENT_ID`, `VITE_SPOTIFY_REDIRECT_URI`

**New route:** `/callback/spotify` in the React app

### 3.2 Token refresh

Spotify access tokens expire in **1 hour**. Strategy:

- **Client-side**: Before each API call, check `spotifyTokenExpiresAt`. If within 5 min of expiry, call refresh action first.
- **Server-side cron** (every 15 min): Proactively refresh tokens expiring within 10 min. Prevents playback interruption.
- **Web Playback SDK**: Accepts a `getOAuthToken` callback at construction — pass a function that returns a valid token (refreshing if needed).

### 3.3 Web Playback SDK

Create `src/config/spotify.js` extending `MusicProvider`:

```javascript
class SpotifyService extends MusicProvider {
  player = null;       // Spotify.Player instance
  deviceId = null;
  isPremium = false;

  async initialize() {
    // Load SDK script from cdn
    // Create Spotify.Player with getOAuthToken callback
    // Wait for 'ready' event -> store deviceId
  }

  async playSong(songId) {
    // PUT /v1/me/player/play { device_id, uris: ["spotify:track:{id}"] }
  }
}
```

**Premium-only limitation:**
- Detect via `GET /v1/me` -> `product` field
- Free users: show banner "Spotify Premium required for playback"
- Free users CAN still: search, approve, manage library, export playlists
- Optional: play 30-sec previews via `preview_url` on track objects

### 3.4 Spotify Web API methods

| Operation | Endpoint |
|-----------|----------|
| Search | `GET /v1/search?q={query}&type=album,track&limit=25` |
| Get album | `GET /v1/albums/{id}` |
| Album tracks | `GET /v1/albums/{id}/tracks?limit=50` |
| Artist albums | `GET /v1/artists/{id}/albums` |
| Create playlist | `POST /v1/users/{user_id}/playlists` |
| Add tracks | `POST /v1/playlists/{id}/tracks` |
| User playlists | `GET /v1/me/playlists` |
| User profile | `GET /v1/me` |

### 3.5 Lyrics & AI review

**No changes needed.** The existing AI content review pipeline uses LRCLib for lyrics lookup by song name + artist name. This is completely provider-agnostic. Cache keys just need the new `provider` + `externalTrackId` fields from Phase 1.

---

## Phase 4: UI Changes

### 4.1 Onboarding — service selection

Modify `src/pages/OnboardingPage.jsx`:

Current step 2 is "Connect Apple Music". Replace with:

- **Step 2: "Choose Your Music Service"**
  - Two cards: Apple Music (purple gradient) / Spotify (green gradient)
  - Each shows logo, brief note, "Connect" button
  - Apple: existing MusicKit `authorize()` popup
  - Spotify: PKCE redirect -> `/callback/spotify` -> resume onboarding
  - Selection saved to `users.musicProvider`

### 4.2 Settings — provider management

Modify `src/components/admin/Settings.jsx`:

- "Apple Music Connection" section becomes "Music Service"
- Show current provider with option to switch
- Switch warning: "Your approved music library stays, but playback needs the selected service"

### 4.3 Components to update (priority order)

| Priority | Component | What changes |
|----------|-----------|-------------|
| **High** | `ChildDashboard.jsx` | Core player — all playback calls, event listeners |
| **High** | `AddMusic.jsx` | Search functionality |
| **High** | `AlbumSearch.jsx` | Album search |
| **High** | `PlaylistImport.jsx` | Import from user's library |
| **High** | `ExportPlaylistsModal.jsx` | Export auth flow + API calls |
| **Medium** | `MusicLibrarySeparate.jsx` | Album track fetching |
| **Medium** | `AlbumInspector.jsx` | Album detail/review |
| **Medium** | `DiscoveryPage.jsx` | Preview playback |
| **Medium** | `AppleMusicAuth.jsx` | Rename to `MusicServiceAuth.jsx` |
| **Low** | Legacy components (10+) | May not be actively used |

### 4.4 Artwork URL utility

Create `src/utils/artworkUrl.js`:

```javascript
export function resolveArtworkUrl(url, width = 300, height = 300) {
  if (!url) return null;
  if (url.includes('{w}') || url.includes('{h}')) {
    return url.replace('{w}', width).replace('{h}', height);
  }
  return url; // Spotify URLs are direct
}
```

Replace all inline `.replace('{w}', ...)` calls across the codebase.

---

## Phase 5: Backend Changes

### 5.1 New Convex files

**`convex/spotifyAuth.ts`:**
- `storeSpotifyTokens` — mutation, stores tokens after OAuth
- `getSpotifyAccessToken` — query, returns valid token
- `refreshSpotifyToken` — action, calls Spotify token endpoint
- `refreshExpiringTokens` — internal action for cron
- `disconnectSpotify` — mutation, clears Spotify fields

**`convex/spotifyApi.ts`:**
- `searchSpotify` — action, server-side search (for background approval flows)
- `getSpotifyAlbumTracks` — action, fetch tracks server-side

### 5.2 Token refresh cron

Add to `convex/crons.ts`:

```typescript
crons.interval("refresh expiring spotify tokens", { minutes: 15 },
  internal.spotifyAuth.refreshExpiringTokens
);
```

### 5.3 Provider-aware mutations

These files need an optional `provider` parameter (defaults to `"apple_music"`):

| File | Functions |
|------|-----------|
| `convex/songs.ts` | `approveSong`, `getApprovedSongs`, `isSongApproved`, `toggleSongForKid` |
| `convex/albums.ts` | `approveAlbum`, `getApprovedAlbums`, `removeApprovedAlbum` |
| `convex/albumRequests.ts` | `createRequest` |
| `convex/songRequests.ts` | `createSongRequest` |
| `convex/playlists.ts` | `addSongToPlaylist`, `addSongsToPlaylist` |
| `convex/featuredPlaylists.ts` | Featured playlist operations |
| `convex/ai/contentReview.ts` | Cache keying |

---

## Implementation Sequence

| Week | Work | Phase |
|------|------|-------|
| 1-2 | Schema changes, provider interface, artwork utility, migration script | 1, 2.1, 4.4 |
| 3-4 | Spotify OAuth PKCE, token storage/refresh, Spotify Web API wrapper, backend provider awareness | 3.1-3.2, 3.4, 5.1-5.3 |
| 5-6 | Spotify Web Playback SDK, Provider Manager, event normalization | 3.3, 2.3, 2.4 |
| 7-8 | UI migration: onboarding, settings, ChildDashboard, search, import/export | 4.1-4.3 |
| 9 | Premium degradation UX, provider indicators, testing, edge cases | 3.3, 4.4 |

---

## Risks & Mitigations

### Spotify Premium requirement
~37% of Spotify users are free tier. Free users cannot play full songs via Web Playback SDK.

**Mitigation:** Clear messaging at onboarding. Free users can still search, approve, manage, and export. Optional 30-sec previews via `preview_url`.

### Token expiry during playback
Spotify tokens last 1 hour. Kids listening for longer sessions will hit expiry.

**Mitigation:** The Web Playback SDK's `getOAuthToken` callback handles this natively — it requests a fresh token when needed. The proactive cron refresh ensures tokens are ready.

### 32 files coupled to musicKitService
Large migration surface area.

**Mitigation:** Provider Manager returns `musicKitService` by default. Components migrate incrementally. No big-bang rewrite needed.

### Data model complexity
Dual ID fields (`appleSongId` + `externalSongId`) on every table.

**Mitigation:** One family = one provider. No mixing. Helper functions abstract the lookup. Eventually deprecate Apple-prefixed fields.

### Spotify rate limits
Stricter than Apple Music. Playlist export with many songs could hit limits.

**Mitigation:** Existing batch approach (25 songs/batch with delays) works. Add retry with backoff on 429 responses (already implemented for Apple Music export).

---

## New Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SPOTIFY_CLIENT_ID` | `.env` (client) | Spotify app client ID |
| `VITE_SPOTIFY_REDIRECT_URI` | `.env` (client) | OAuth callback URL |

No server-side Spotify secret needed — PKCE flow is public-client only.

---

## Spotify Developer Setup (Prerequisites)

1. Create app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Set redirect URI to `https://getsafetunes.com/callback/spotify` (and `http://localhost:5173/callback/spotify` for dev)
3. Request extended quota if needed (default is 25 users for dev mode)
4. **Important:** Spotify apps in "development mode" are limited to 25 users. Must submit for [quota extension](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) before launch.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| One provider per family (no mixing) | Vastly simpler data model and UX. Mixed providers is a future enhancement. |
| PKCE auth (no client secret on frontend) | Spotify's recommended flow for SPAs. More secure. |
| Keep Apple-prefixed fields, add generic ones | Backward compatible. No data migration urgency. |
| Provider Manager pattern | Allows incremental migration of 32 files. No big-bang rewrite. |
| Proactive token refresh cron | Prevents playback interruption. SDK callback is backup. |
| LRCLib for both providers | Already provider-agnostic. No Spotify lyrics API exists anyway. |
