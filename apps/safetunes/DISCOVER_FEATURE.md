# Discover Feature Documentation

## Overview
The Discover feature allows parents to curate a discovery pool of albums for their children to preview before adding to their library. Children can listen to any album in Discover, and if they like it, they can add it to their Library for permanent access.

## Key Concepts

### Library vs Discover Separation
- **Library**: Music that kids can access anytime (featured=false or kidProfileId is set)
- **Discover**: Music for preview/exploration (featured=true and kidProfileId=undefined)
- Albums in Discover are hidden from Library views until explicitly added

### Featured Flag Logic
The `featured` boolean field determines content placement:
- `featured: true` + `kidProfileId: undefined` = Discover only
- `featured: false` or `kidProfileId: set` = Library
- Albums move from Discover → Library when kid adds them

## Implementation Details

### Database Schema
Added to `convex/schema.ts`:
```javascript
approvedAlbums: {
  featured: v.optional(v.boolean()), // Featured for discovery
  // ... other fields
}
.index("by_user_featured", ["userId", "featured"])

approvedSongs: {
  featured: v.optional(v.boolean()), // Featured for discovery
  // ... other fields
}
.index("by_user_featured", ["userId", "featured"])
```

### Backend Queries

#### Featured Content (`convex/featured.ts`)
```javascript
// Get featured albums for discover pool
getFeaturedAlbums(userId)
// Returns albums where featured=true

// Get featured songs for discover pool
getFeaturedSongs(userId)
// Returns songs where featured=true

// Get all featured content for a kid profile
getFeaturedContentForKid(kidProfileId)
// Returns both albums and songs filtered by kid
```

#### Library Filtering (`convex/albums.ts`)
Modified queries to exclude Discover-only content:
- `getApprovedAlbums` - Filters out featured=true albums without kidProfileId
- `getAlbumsWithApprovedSongs` - Excludes Discover-only partial albums
- `getAlbumsWithApprovedSongsForKid` - Kid-specific filtering with Discover exclusion

### Frontend Components

#### DiscoveryPage (`src/components/child/DiscoveryPage.jsx`)

**Key Features:**
1. **Recommended Section**
   - Shows 3 randomly selected albums from Discover pool
   - Uses seeded randomization for consistency
   - Persists recommendations for 3 hours in localStorage
   - Manual shuffle button to refresh recommendations
   - Purple-pink gradient design for visual distinction
   - Compact layout with smaller cards and spacing

2. **Three Tabs:**
   - **Albums**: All albums in Discover (filtered from library)
   - **Genres**: Albums grouped by primary genre
   - **Artists**: Albums grouped by artist name

3. **Full Playback Support:**
   - Click any album to open modal with track list
   - Play individual tracks or entire albums
   - Add albums to Library from modal
   - Visual indicators for albums already in Library

4. **Smart Filtering:**
   - Automatically hides albums once added to Library
   - Shows "All albums added to your library!" when Discover is empty
   - Real-time updates when content is added/removed

**Technical Implementation:**
```javascript
// Seeded randomization for consistent recommendations
const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Fisher-Yates shuffle with seed
const shuffled = [...albumsNotInLibrary];
for (let i = shuffled.length - 1; i > 0; i--) {
  const j = Math.floor(seededRandom(recommendedSeed + i) * (i + 1));
  [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}

// localStorage persistence
localStorage.setItem('discoverRecommendedSeed', JSON.stringify({
  seed: recommendedSeed,
  timestamp: Date.now()
}));
```

#### Admin Album Search (`src/components/admin/AlbumSearch.jsx`)
Added "Add to Discover" button:
- Calls `toggleAlbumFeatured` mutation
- Sets `featured: true` and `kidProfileId: undefined`
- Visually distinct from "Approve Album" action

#### Library Views
Updated to exclude Discover-only content:
- `src/components/admin/LibraryiTunes.jsx` - Admin library view
- `src/components/child/ChildDashboard.jsx` - Kid library view
- Both use filtered queries that exclude featured=true albums

## User Experience

### For Parents (Admin)
1. Search for albums in album search
2. Click "Add to Discover" to add album to discovery pool
3. Album appears in kid's Discover tab (not Library)
4. Monitor what kids add to their Library from Discover

### For Kids (Child Dashboard)
1. Navigate to "Discover" tab
2. See recommended albums in purple-pink section at top
3. Browse all albums via Albums/Genres/Artists tabs
4. Click album to preview tracks
5. Play songs or entire albums
6. Click "Add to Library" to move album to permanent library
7. Album disappears from Discover once added

## UI/UX Features

### Recommended Section Design
- **Compact Layout**: 3 albums, smaller padding (p-4), reduced spacing
- **Visual Hierarchy**: Purple-pink gradient stands out from rest of page
- **Persistent Recommendations**: Same albums for 3 hours, then auto-refresh
- **Manual Shuffle**: Button to instantly refresh recommendations
- **Library Indicators**: Green badges show albums already in Library

### Kid-Friendly Design
- **Simple Explanation**: "Listen to new music here. Like it? Add it to your Library!"
- **No Search Bar**: Removed to prevent overwhelm, focus on curated content
- **Clear Actions**: Big "Play Album" and "Add to Library" buttons
- **Visual Feedback**: Toasts confirm when albums added successfully
- **Empty States**: Helpful messages when Discover is empty or fully explored

### Responsive Design
- Grid layouts adapt to screen size
- Mobile-optimized touch targets
- Horizontal scrolling tabs for small screens
- Compact modal design for mobile

## Technical Patterns

### State Management
```javascript
// Local state for UI
const [activeTab, setActiveTab] = useState('albums');
const [selectedAlbum, setSelectedAlbum] = useState(null);
const [recommendedSeed, setRecommendedSeed] = useState(() => {
  // Initialize from localStorage with expiration check
});

// Convex real-time queries
const featuredContent = useQuery(api.featured.getFeaturedContentForKid, ...);
const approvedAlbums = useQuery(api.albums.getApprovedAlbumsForKid, ...);

// Convex mutations
const approveAlbum = useMutation(api.albums.approveAlbum);
```

### Album Queue Playback
```javascript
// Pass fromDiscover flag to enable unrestricted playback
onPlayAlbum({
  appleAlbumId: album.appleAlbumId,
  albumName: album.albumName,
  artistName: album.artistName,
  artworkUrl: album.artworkUrl,
  fromDiscover: true, // All tracks playable in Discover
});
```

### Library Check
```javascript
const isAlbumInLibrary = (appleAlbumId) => {
  return approvedAlbums?.some(album => album.appleAlbumId === appleAlbumId);
};
```

## Data Flow

### Adding Album to Discover
1. Parent searches for album in admin
2. Clicks "Add to Discover"
3. `toggleAlbumFeatured({ albumId, featured: true })`
4. Album saved with `featured: true, kidProfileId: undefined`
5. Real-time update via Convex subscriptions
6. Album appears in kid's Discover tab

### Adding Album from Discover to Library
1. Kid clicks "Add to Library" in Discover
2. `approveAlbum({ userId, appleAlbumId, kidProfileId: null, featured: false })`
3. Creates new album record with `featured: false`
4. Real-time update removes album from Discover view
5. Album appears in Library tab
6. Playback continues uninterrupted

## Performance Optimizations

### Seeded Randomization
- Prevents re-shuffling on every render
- localStorage caching reduces computation
- 3-hour expiration balances freshness with stability

### Query Filtering
- Index-based queries for fast featured content lookup
- Client-side filtering for Library exclusion (avoids duplicate queries)
- Efficient grouping algorithms for genres/artists

### Lazy Loading
- Album modal only fetches tracks when opened
- MusicKit API calls on-demand
- React component memoization for expensive operations

## Future Enhancements

### Potential Features
- [ ] Add 'Add to Library' button to full screen player (requires context tracking)
- [ ] Playlist support in Discover
- [ ] "Why was this recommended?" explanations for parents
- [ ] Kid feedback system (thumbs up/down on recommendations)
- [ ] Discovery analytics for parents (what kids are exploring)
- [ ] Scheduled Discover refreshes (weekly new content)
- [ ] Genre/artist preferences for better recommendations

### Technical Improvements
- [ ] Server-side shuffle algorithm for better randomization
- [ ] Pagination for large Discover pools
- [ ] Image lazy loading for album artwork
- [ ] Preload next recommended albums
- [ ] Cache MusicKit API responses

## Testing Checklist

### Manual Testing
- [ ] Albums added to Discover appear in kid's Discover tab
- [ ] Albums in Discover are hidden from Library views
- [ ] Adding album from Discover to Library removes it from Discover
- [ ] Recommended section persists across page refreshes
- [ ] Recommended section updates after 3 hours
- [ ] Shuffle button generates new recommendations
- [ ] Album playback works from Discover
- [ ] "Add to Library" button works in album modal
- [ ] Genre and Artist tabs correctly group albums
- [ ] Empty states display when appropriate
- [ ] Mobile responsive design works correctly

### Edge Cases
- [ ] Discover pool with 1-2 albums (less than 3 for recommendations)
- [ ] All albums in Discover already in Library
- [ ] Empty Discover pool
- [ ] Albums without genre data
- [ ] Network failures during playback
- [ ] Multiple kids with separate Discover pools

## Troubleshooting

### Albums not appearing in Discover
- Check `featured` flag is `true`
- Check `kidProfileId` is `undefined`
- Verify `by_user_featured` index exists
- Check user ID matches between parent and kid profile

### Albums appearing in both Library and Discover
- Check for duplicate album records with different IDs
- Verify filtering logic in `getApprovedAlbums`
- Check `kidProfileId` values (should be null/undefined for Discover-only)

### Recommended section not updating
- Clear localStorage: `localStorage.removeItem('discoverRecommendedSeed')`
- Check timestamp expiration logic (3 hours = 10800000 ms)
- Verify `Math.random()` and `Math.sin()` functions working

### Playback issues from Discover
- Check `fromDiscover: true` flag is passed to `onPlayAlbum`
- Verify MusicKit authorization
- Check Apple Music API rate limits
- Verify album tracks are being fetched correctly

## Related Files

### Frontend
- `src/components/child/DiscoveryPage.jsx` - Main Discover UI
- `src/components/child/ChildDashboard.jsx` - Child navigation (removed search from Discover)
- `src/components/admin/AlbumSearch.jsx` - Admin "Add to Discover" action
- `src/components/admin/LibraryiTunes.jsx` - Admin library (excludes Discover)

### Backend
- `convex/featured.ts` - Featured content queries
- `convex/albums.ts` - Album queries with Discover filtering
- `convex/songs.ts` - Song queries with Discover filtering
- `convex/schema.ts` - Database schema with featured field

### Documentation
- `CLAUDE.md` - Coding standards and project guidelines
- `DISCOVER_FEATURE.md` - This file

## Version History

### November 2024 - Initial Implementation
- Added `featured` boolean field to schema
- Created `convex/featured.ts` with query functions
- Built DiscoveryPage component with tabs
- Implemented Library/Discover separation logic
- Added "Add to Discover" to admin search

### November 2024 - Enhancements
- Added seeded randomization for recommendations
- Implemented 3-hour localStorage persistence
- Added full playback support (album queue from Discover)
- Removed search bar from Discover tab
- Simplified explanation text for kids
- Made recommended section more compact (3 albums, smaller layout)
- Added "In Library" badges to prevent re-adding

### Current Status
- ✅ Core functionality complete
- ✅ UI/UX polished and kid-friendly
- ✅ Performance optimized with seeding
- ✅ Real-time updates working
- ⏸️ Full-screen player integration pending (complex feature)
