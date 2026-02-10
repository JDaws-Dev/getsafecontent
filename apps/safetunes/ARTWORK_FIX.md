# Album Artwork Fix - November 17, 2025

## Issue
Album artwork was displaying as broken images on the admin dashboard (both Home and Library tabs), but worked correctly on the child dashboard.

## Root Cause
Apple Music API returns artwork URLs with placeholder dimensions:
```
https://is1-ssl.mzstatic.com/image/thumb/Music126/.../image.jpg/{w}x{h}bb.jpg
```

These placeholders (`{w}` and `{h}`) must be replaced with actual pixel dimensions (e.g., `300x300`) before the image can load.

## Files Fixed

### 1. `/src/components/child/ChildDashboard.jsx`
**Problem:** When kids played music, artwork URLs were saved to `recentlyPlayed` table with placeholders intact.

**Fixed 4 locations:**
- Line 267: Album artwork when playing an album
- Line 290: Song artwork when playing a song
- Line 648: Playlist artwork when playing a playlist
- Line 2243: Song artwork from MusicPlayer track changes

**Solution:** Added `.replace('{w}', '300').replace('{h}', '300')` before saving to database.

### 2. `/src/components/admin/AdminDashboard.jsx`
**Problem:** "Recently Added" section displayed broken artwork.

**Fixed:** Line 599 - Added `.replace('{w}', '300').replace('{h}', '300')` to artwork URL.

### 3. `/src/components/admin/Library.jsx`
**Problem:** Albums list showed broken artwork.

**Fixed:** Line 812 - Added `.replace('{w}', '300').replace('{h}', '300')` to artwork URL.

### 4. `/src/components/admin/PlaylistImport.jsx`
**Fixed:** Line 260 - Added placeholder replacement for consistency.

### 5. `/src/components/player/AlbumGrid.jsx`
**Fixed:** Line 15 - Added placeholder replacement for consistency.

### 6. `/convex/migrations.ts`
**Added new migration:** `fixRecentlyPlayedArtwork`
- Fixes existing broken URLs in the `recentlyPlayed` table
- Replaces `{w}x{h}` with `300x300` for all existing records
- Successfully updated 10 records on first run

## Deployment Process

### Initial Deployment
```bash
git add -A
git commit -m "Fix artwork URLs in recently played by replacing placeholders"
git push
vercel --prod --yes
```

### Cache Busting Required
The initial deployment didn't work due to Vercel CDN caching old JavaScript bundles.

**Final deployment with forced cache clear:**
```bash
git commit --allow-empty -m "Force rebuild to clear Vercel cache"
git push
vercel --prod --yes --force
```

## Why Child Dashboard Worked
The child dashboard was already correctly handling artwork URLs with `.replace()` calls in the rendering logic, even though the database stored them with placeholders.

## Why Admin Dashboard Failed
The admin dashboard components were missing the `.replace()` calls, so when they rendered artwork URLs directly from the database (which had placeholders), the images were broken.

## Testing Performed
1. ✅ Checked database for broken URLs with placeholders
2. ✅ Ran migration to fix 10 existing `recentlyPlayed` records
3. ✅ Verified new albums display artwork correctly on admin dashboard
4. ✅ Verified child dashboard still works correctly
5. ✅ Confirmed forced deployment cleared Vercel cache

## Prevention
All components that display Apple Music artwork now use:
```javascript
artworkUrl.replace('{w}', '300').replace('{h}', '300')
```

This ensures artwork displays correctly regardless of where it comes from (API, database, etc.).

## Notes
- Apple Music uses different sizes: 60px, 80px, 120px, 160px, 200px, 300px
- We standardized on 300x300 for most uses
- Smaller sizes (60px, 80px) used for thumbnails and list views
- The `{w}` and `{h}` placeholders are case-sensitive
