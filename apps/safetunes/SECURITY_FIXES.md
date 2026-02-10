# Security Fixes & Improvements

## Overview
This document tracks all security fixes implemented to ensure that ONLY approved songs can be played in the child dashboard. Multiple vulnerabilities were identified and patched where unapproved songs could slip through during playback or display.

## Critical Security Issues Fixed

### Issue #1: Unapproved Songs Playing from Albums
**Reported**: User clicked next button and "Sweeney Todd" (unapproved) started playing from Disney's Greatest Albums

**Root Cause**:
- `handlePlayAlbum` was using `playAlbum(albumId)` which called MusicKit's `setQueue({ album: albumId })`
- This queued ALL songs from the album, not just approved ones
- Autoplay and skip functions would play any song in the queue

**Fix Applied** (ChildDashboard.jsx:150-203):
```javascript
const handlePlayAlbum = async (album) => {
  // 1. Fetch all tracks from album
  const allTracks = await musicKitService.getAlbumTracks(albumId);

  // 2. Filter to only approved song IDs for this kid
  const approvedSongIds = new Set(
    approvedSongs
      .filter(s => s.kidProfileId === kidProfile._id || !s.kidProfileId)
      .map(s => s.appleSongId)
  );

  const approvedTracks = allTracks.filter(track => {
    const trackId = track.id || track.attributes?.playParams?.id;
    return approvedSongIds.has(trackId);
  });

  // 3. Play only approved tracks
  await musicKitService.playApprovedSongs(approvedTracks);
}
```

**Security Method Created** (musickit.js:375-437):
```javascript
async playApprovedSongs(tracks) {
  // Stop any existing playback first
  if (this.music.isPlaying) {
    await this.music.stop();
  }

  // Extract only the song IDs
  const songIds = tracks.map(track =>
    track.id || track.attributes?.playParams?.id
  ).filter(Boolean);

  // Set queue with ONLY approved songs
  await this.music.setQueue({
    songs: songIds,
    startWith: 0
  });

  // SECURITY: Disable autoplay and repeat
  this.music.autoplayEnabled = false;
  this.music.repeatMode = 0;

  await this.music.play();
}
```

---

### Issue #2: Unapproved Songs in Recently Played Display
**Reported**: User saw "Ronnettes" (unapproved) in Recently Played section

**Root Cause**:
- `recentlyPlayed` query was displaying all items without filtering
- Database contained songs that were played before security fixes

**Fix Applied** (ChildDashboard.jsx:120-142):
```javascript
const recentlyPlayedRaw = useQuery(
  api.recentlyPlayed.getRecentlyPlayed,
  kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
);

// SECURITY: Filter recently played to only show approved content
const recentlyPlayedData = useMemo(() => {
  if (!recentlyPlayedRaw || !approvedSongs || !approvedAlbums) return [];

  const approvedSongIds = new Set(approvedSongs.map(s => s.appleSongId));
  const approvedAlbumIds = new Set(approvedAlbums.map(a => a.appleAlbumId));

  return recentlyPlayedRaw.filter(item => {
    if (item.itemType === 'song') {
      return approvedSongIds.has(item.itemId);
    } else if (item.itemType === 'album') {
      return approvedAlbumIds.has(item.itemId);
    }
    return item.itemType === 'playlist'; // Playlists are always approved
  });
}, [recentlyPlayedRaw, approvedSongs, approvedAlbums]);
```

**Database Cleanup** (migrations.ts:151-169):
- Created `clearRecentlyPlayed` migration
- Ran migration: Deleted 15 old recently played items
- Fresh start with clean data

---

### Issue #3: Playlist Playback Not Using Secure Queue
**Root Cause**:
- `handlePlayPlaylist` was directly calling `setQueue({ songs: songIds })`
- Wasn't using the secure `playApprovedSongs` method
- Could leave old queues active

**Fix Applied** (ChildDashboard.jsx:512-550):
```javascript
const handlePlayPlaylist = async (playlist) => {
  // SECURITY: Use playApprovedSongs for consistency and safety
  const tracks = playlist.songs.map(song => ({
    id: song.appleSongId,
    attributes: {
      name: song.songName,
      artistName: song.artistName,
      playParams: { id: song.appleSongId }
    }
  }));

  await musicKitService.playApprovedSongs(tracks);
}
```

---

### Issue #4: Single Song Playback Not Clearing Queue
**Root Cause**:
- `playSong` method wasn't stopping existing playback
- Could leave remnants of previous unsafe queue

**Fix Applied** (musickit.js:443-493):
```javascript
async playSong(songId) {
  // SECURITY: Stop any existing playback and clear queue first
  if (this.music.isPlaying) {
    await this.music.stop();
  }

  // Use songs array format for consistency
  await this.music.setQueue({
    songs: [songId],
    startWith: 0
  });

  // SECURITY: Ensure autoplay is disabled and no repeat
  this.music.autoplayEnabled = false;
  this.music.repeatMode = 0;

  await this.music.play();
}
```

---

## Global Security Settings

### MusicKit Initialization (musickit.js:44-46)
```javascript
// SECURITY: Disable autoplay globally to prevent unapproved content
this.music.autoplayEnabled = false;
```

### Skip Function Logging (musickit.js:525-566)
Added comprehensive logging to track queue state:
```javascript
skipToNext() {
  const queue = this.music.queue;
  const currentIndex = queue?.position || 0;
  const nextItem = queue?.items?.[currentIndex + 1];

  console.log('⏭️ SKIP NEXT:', {
    currentSong: this.music.nowPlayingItem?.attributes?.name,
    currentSongId: this.music.nowPlayingItem?.id,
    nextSong: nextItem?.attributes?.name,
    nextSongId: nextItem?.id,
    queueLength: queue?.items?.length,
    currentPosition: currentIndex
  });

  this.music.skipToNextItem();
}
```

---

## Security Checklist

### ✅ Playback Methods Secured
- [x] `handlePlayAlbum` - Filters tracks before queuing
- [x] `handlePlaySong` - Stops existing queue first
- [x] `handlePlayPlaylist` - Uses secure playApprovedSongs method
- [x] `playApprovedSongs` - Stops playback, sets secure queue
- [x] `playSong` - Stops playback, disables autoplay/repeat

### ✅ Display Points Filtered
- [x] Recently Played - Filters to only approved content
- [x] Library Albums - Already filtered by approvedAlbums query
- [x] Library Songs - Already filtered by approvedSongs query
- [x] Playlists - Songs added to playlists are pre-approved

### ✅ Queue Management
- [x] All playback methods call `stop()` before setting new queue
- [x] All queues set with `autoplayEnabled = false`
- [x] All queues set with `repeatMode = 0`
- [x] Skip functions log queue state for debugging

### ℹ️ Intentionally Unsecured (By Design)
- [ ] Search Results - Shows unapproved content for REQUEST feature
  - This is correct: Kids search Apple Music to request new songs
  - Parents approve/deny requests in admin dashboard

---

## Testing Recommendations

1. **Album Playback Test**:
   - Play an album with mix of approved/unapproved songs
   - Verify only approved songs are in queue
   - Check console for "✓ SECURE QUEUE" message
   - Try skipping - should only skip within approved songs

2. **Recently Played Test**:
   - Play several approved songs
   - Check Recently Played section only shows approved items
   - No "Unknown" or unapproved content should appear

3. **Playlist Test**:
   - Play a playlist
   - Verify queue contains only playlist songs
   - Check console for secure queue creation

4. **Skip Function Test**:
   - Play any content
   - Click skip next/previous
   - Check console logs show correct queue state
   - Verify next song is from approved queue

---

## Files Modified

### Core Files
- `/src/config/musickit.js` - Secure playback methods, queue management
- `/src/components/child/ChildDashboard.jsx` - Secure playback handlers, display filtering
- `/src/components/MusicPlayer.jsx` - Already had secure skip functions
- `/convex/migrations.ts` - Database cleanup for recently played

### Key Changes Summary
- 3 playback methods secured with queue clearing
- 1 display point filtered (Recently Played)
- 2 skip functions enhanced with logging
- 1 global security setting (autoplayEnabled = false)
- 1 database migration for cleanup

---

## Future Considerations

1. **Queue Validation**: Consider adding validation in skip functions to verify next song is approved before allowing skip
2. **Admin Audit Log**: Track when unapproved songs are detected attempting to play
3. **Automated Testing**: Add unit tests for queue security
4. **Content Policy**: Document what content is allowed/blocked

---

## Changelog

### 2025-01-XX - Security Hardening Release
- **CRITICAL**: Fixed album playback to only queue approved songs
- **CRITICAL**: Added queue clearing before all playback operations
- **SECURITY**: Filtered Recently Played to only show approved content
- **SECURITY**: Secured playlist playback with playApprovedSongs method
- **SECURITY**: Enhanced single song playback with queue clearing
- **LOGGING**: Added comprehensive skip function logging
- **CLEANUP**: Removed 15 legacy recently played items from database

---

## Contact

For security issues or questions about these fixes, please contact the development team.

**Last Updated**: January 2025
