# Admin Music Playback Feature

## Overview
This document describes the music playback functionality added to the SafeTunes admin review page, allowing parents to preview and listen to songs and albums before approving them.

## Branch
`admin-music-playback`

## Implementation Date
November 2025

## Features Implemented

### 1. Persistent Player (Top of Page)
A sticky music player that remains visible while scrolling through requests.

**Location:** Top of the admin requests page

**Components:**
- `src/components/admin/PersistentPlayer.jsx`

**Features:**
- **Purple-to-pink gradient background** - Matches SafeTunes brand
- **Album artwork display** - 60x60px rounded thumbnail
- **Track information** - Song name and artist
- **Play/Pause control** - Large circular button
- **Seekable progress bar** - Click anywhere to jump to that position in the track
- **Time display** - Current time and total duration (e.g., "1:24 / 3:45")
- **Sticky positioning** - Uses `sticky top-0` to remain visible while scrolling
- **Auto-shows** - Only appears when a track is playing

**User Experience:**
1. Click Play on any song → Persistent player appears at top
2. Shows currently playing track info
3. Click progress bar to seek to any position
4. Click Play/Pause to control playback
5. Player stays visible while scrolling through requests

### 2. Individual Song Approval
Parents can now approve songs one-by-one from album requests instead of blanket album approval.

**Location:** Album Tracks Modal (opened by clicking album artwork)

**Components:**
- `src/components/admin/AlbumTracksModal.jsx`

**Features:**
- **Track listing** - All songs in the album with metadata
- **Individual approve buttons** - Green "Approve" button for each song
- **Approved badge** - Shows "Approved" for already-approved songs
- **Play buttons** - Simple play button for each track
- **Lyrics links** - Google search link for song lyrics
- **Duration display** - Track length for each song

**User Experience:**
1. Click album artwork on request
2. Modal opens showing all tracks
3. Click Play on any track to preview
4. Click Approve on individual songs (not whole album)
5. Approved songs show green "Approved" badge

### 3. Simple Play Buttons
Clean, minimal play buttons throughout the UI for starting playback.

**Locations:**
- Song requests (inline with action buttons)
- Album tracks modal (per song)

**Features:**
- Purple button design matching brand
- Starts playback immediately
- All playback control happens in persistent player
- No inline progress bars or duplicate controls

### 4. Seekable Progress Bar
Click-to-seek functionality in the persistent player.

**Implementation:**
- `handleProgressClick()` in PersistentPlayer.jsx
- Calculates position based on click location
- Uses `musicKitService.seekToTime()`
- Hover effect (bar grows slightly on hover)

**Technical Details:**
```javascript
const handleProgressClick = (e) => {
  const rect = progressBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const percentage = clickX / rect.width;
  const newTime = percentage * duration;
  musicKitService.seekToTime(newTime);
};
```

## Technical Implementation

### MusicKit Service Updates
**File:** `src/config/musickit.js`

**New Methods:**
- `seekToTime(time)` - Seek to specific time in current track

### Component Architecture

```
AlbumRequests.jsx
├── PersistentPlayer.jsx (sticky at top)
├── Song Requests (with inline Play buttons)
├── Album Requests (clickable artwork)
└── AlbumTracksModal.jsx (when album clicked)
    ├── Track list
    ├── Play buttons per song
    ├── Approve buttons per song
    └── Lyrics links per song
```

### State Management
- **MusicKit playback state** - Managed via MusicKit event listeners
- **Approved songs** - Fetched via `api.songs.getApprovedSongs`
- **Currently playing track** - Synced across all components via MusicKit events

### Event Listeners
Components listen to MusicKit events:
- `playbackStateDidChange` - Updates play/pause state
- `playbackTimeDidChange` - Updates progress bar
- `nowPlayingItemDidChange` - Updates track info

## Files Created
1. `src/components/admin/PersistentPlayer.jsx` - Sticky player at top
2. `ADMIN_MUSIC_PLAYBACK_FEATURE.md` - This documentation

## Files Modified
1. `src/components/admin/AlbumRequests.jsx` - Added play buttons and persistent player
2. `src/components/admin/AlbumTracksModal.jsx` - Added individual song approval
3. `src/components/admin/MiniPlayer.jsx` - Simplified to just play button (not used in final implementation)
4. `src/config/musickit.js` - Added seekToTime method

## User Workflow

### Reviewing Song Requests
1. Navigate to Admin Dashboard → Requests tab
2. See list of pending song/album requests
3. **For Song Requests:**
   - Click "Play" button → Song starts playing
   - Persistent player appears at top
   - Review lyrics (click "Lyrics" button)
   - Click "Approve" or "Deny"
4. **For Album Requests:**
   - Click album artwork → Modal opens
   - See all tracks in album
   - Click Play on any track → Starts playing in persistent player
   - Click Approve on individual songs (not whole album)
   - Close modal when done

### Playback Control
- **Start playback** - Click any Play button
- **Pause/Resume** - Click play/pause in persistent player
- **Seek through track** - Click anywhere on progress bar
- **Switch tracks** - Click Play on a different song

## Security Considerations
- Uses existing MusicKit security model
- Only plays explicitly selected tracks
- No autoplay of unapproved content
- Requires Apple Music authorization

## Design Decisions

### Why Persistent Player at Top?
- **Always accessible** - Control playback while reviewing requests
- **Centralized controls** - Single source of truth for playback state
- **No duplicate UI** - Avoids multiple progress bars throughout page
- **Clean interface** - Reduces visual clutter

### Why Individual Song Approval?
- **Parental control** - More granular content filtering
- **Flexibility** - Approve safe songs from otherwise questionable albums
- **Better UX** - See exactly what's approved vs pending
- **Common use case** - Many albums have mix of appropriate/inappropriate content

### Why Remove Inline Players?
- **Simplicity** - Reduced cognitive load
- **Consistency** - Single playback interface
- **Performance** - Fewer components re-rendering
- **Mobile-friendly** - Less UI clutter on small screens

## Browser Compatibility
- **Desktop** - Chrome, Safari, Firefox, Edge
- **Mobile** - iOS Safari, Chrome (requires Apple Music subscription)
- **Requires** - Apple Music subscription for actual playback
- **Requires** - MusicKit developer token configured

## Known Limitations
1. Requires active Apple Music subscription
2. Requires user to authorize with Apple Music
3. Preview clips may not be available for all songs
4. Seeking may have slight delay depending on connection

## Future Enhancements (Potential)
- [ ] Keyboard shortcuts (Space = play/pause, Arrow keys = seek)
- [ ] Volume control in persistent player
- [ ] Skip to next/previous track in queue
- [ ] Waveform visualization in progress bar
- [ ] Remember playback position when switching tracks
- [ ] Batch approve multiple songs at once

## Testing Checklist
- [x] Persistent player appears when song plays
- [x] Persistent player sticks to top while scrolling
- [x] Progress bar updates in real-time
- [x] Clicking progress bar seeks correctly
- [x] Play/pause button works correctly
- [x] Individual song approval works
- [x] Approved badge shows for approved songs
- [x] Album modal shows all tracks
- [x] Play buttons work in modal
- [x] Authorization flow works correctly
- [x] Mobile responsive design
- [x] No duplicate players or controls

## Deployment Notes
- Merge `admin-music-playback` branch to `main`
- Ensure `VITE_MUSICKIT_DEVELOPER_TOKEN` is configured
- Test with real Apple Music account
- Verify on both desktop and mobile

## Related Documentation
- [SafeTunes Coding Standards](./CLAUDE.md)
- [MusicKit Integration](./src/config/musickit.js)
- [Convex Schema](./convex/schema.ts)

## Support
For questions or issues:
1. Check MusicKit logs in browser console
2. Verify Apple Music authorization status
3. Ensure developer token is valid
4. Check network requests for API errors
