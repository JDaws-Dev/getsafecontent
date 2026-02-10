# Integration Code Snippets

Quick reference for integrating Discovery features into existing components.

## 1. Add Discovery Tab to AdminDashboard.jsx

### Location: `/Users/jeremiahdaws/AppleMusicWhitelist/src/components/admin/AdminDashboard.jsx`

### Add Import (top of file):
```javascript
import PreApprovalManager from './PreApprovalManager';
```

### Add Tab Button (in desktop navigation, around line 340):
```javascript
<button
  onClick={() => setActiveTab('discovery')}
  className={`${
    activeTab === 'discovery'
      ? 'border-b-2 border-purple-600 text-purple-600'
      : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
  } py-3 px-6 font-medium text-sm transition-all duration-200 flex items-center gap-2`}
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
  <span>Discovery</span>
</button>
```

### Add Mobile Tab (in mobile menu section):
```javascript
<button
  onClick={() => {
    setActiveTab('discovery');
    setShowMobileMenu(false);
  }}
  className={`${
    activeTab === 'discovery' ? 'bg-purple-50' : ''
  } flex items-center gap-3 p-4 hover:bg-gray-50 transition-all`}
>
  <svg className={`w-6 h-6 ${activeTab === 'discovery' ? 'text-purple-600' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'discovery' ? 2.5 : 2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
  <span className={`text-xs transition-all ${activeTab === 'discovery' ? 'font-semibold text-purple-600' : 'font-normal text-gray-600'}`}>Discovery</span>
</button>
```

### Add Tab Content (in main content area):
```javascript
{activeTab === 'discovery' && (
  <PreApprovalManager user={user} kidProfiles={kidProfiles} />
)}
```

## 2. Add AI Review to AlbumSearch.jsx

### Location: `/Users/jeremiahdaws/AppleMusicWhitelist/src/components/admin/AlbumSearch.jsx`

### Add Imports:
```javascript
import { useState } from 'react'; // if not already imported
import ContentReviewModal from './ContentReviewModal';
```

### Add State (in component):
```javascript
const [reviewModalOpen, setReviewModalOpen] = useState(false);
const [reviewContent, setReviewContent] = useState(null);
```

### Add AI Review Button (next to approve button for each song):
```javascript
<button
  onClick={() => {
    setReviewContent({
      type: 'song',
      appleSongId: song.id,
      songName: song.attributes.name,
      albumName: song.attributes.albumName,
      artistName: song.attributes.artistName,
    });
    setReviewModalOpen(true);
  }}
  className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 transition flex items-center gap-1.5"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
  AI Review
</button>
```

### Add Modal (at end of component, before closing):
```javascript
<ContentReviewModal
  isOpen={reviewModalOpen}
  onClose={() => setReviewModalOpen(false)}
  content={reviewContent}
  onApprove={() => {
    // Optionally call your existing approve function here
    console.log('Approved after AI review:', reviewContent);
  }}
/>
```

## 3. Add AI Review to AlbumRequests.jsx

### Location: `/Users/jeremiahdaws/AppleMusicWhitelist/src/components/admin/AlbumRequests.jsx`

### Add Imports:
```javascript
import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import ContentReviewModal from './ContentReviewModal';
```

### Add State:
```javascript
const [reviewModalOpen, setReviewModalOpen] = useState(false);
const [reviewContent, setReviewContent] = useState(null);
```

### Check for Cached Review (for each request):
```javascript
const cachedReview = useQuery(
  api.ai.contentReview.getCachedReview,
  request ? {
    reviewType: 'album',
    albumId: request.appleAlbumId,
  } : 'skip'
);
```

### Add AI Review Button (in request actions):
```javascript
<button
  onClick={() => {
    setReviewContent({
      type: 'album',
      appleAlbumId: request.appleAlbumId,
      albumName: request.albumName,
      artistName: request.artistName,
    });
    setReviewModalOpen(true);
  }}
  className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm rounded-lg hover:bg-purple-200 transition flex items-center gap-1.5"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
  {cachedReview ? 'View Review' : 'AI Review'}
</button>
```

### Show Cached Review Badge:
```javascript
{cachedReview && (
  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    Previously Reviewed
  </span>
)}
```

### Add Modal:
```javascript
<ContentReviewModal
  isOpen={reviewModalOpen}
  onClose={() => setReviewModalOpen(false)}
  content={reviewContent}
  onApprove={() => approveRequest(request._id)}
  onDeny={() => denyRequest(request._id)}
/>
```

## 4. Add Auto-Approval Check to Search Results

### In any search component (AlbumSearch, child search):

### Add Import:
```javascript
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
```

### Check Auto-Approval (for each album in results):
```javascript
const autoApprovalCheck = useQuery(
  api.discovery.checkAutoApproval,
  kidProfile && album ? {
    kidProfileId: kidProfile._id,
    appleAlbumId: album.id,
    albumName: album.attributes.name,
    artistName: album.attributes.artistName,
    genres: album.attributes.genreNames,
  } : 'skip'
);
```

### Display Auto-Approved Badge:
```javascript
{autoApprovalCheck?.autoApproved && (
  <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1 font-medium">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Auto-Approved
    </span>
    <span className="text-xs text-gray-600">
      {autoApprovalCheck.reason === 'artist-match' && 'Pre-approved artist'}
      {autoApprovalCheck.reason === 'genre-match' && 'Pre-approved genre'}
      {autoApprovalCheck.reason === 'album-match' && 'Pre-approved album'}
    </span>
  </div>
)}
```

### Auto-Add Button (instead of regular approve):
```javascript
{autoApprovalCheck?.autoApproved && autoApprovalCheck?.autoAddToLibrary ? (
  <button
    onClick={async () => {
      await autoApproveAlbum({
        kidProfileId: kidProfile._id,
        appleAlbumId: album.id,
        albumName: album.attributes.name,
        artistName: album.attributes.artistName,
        artworkUrl: album.attributes.artwork?.url,
        genres: album.attributes.genreNames,
        discoveryMethod: autoApprovalCheck.reason,
        preApprovalId: autoApprovalCheck.preApprovalId,
        hideArtwork: autoApprovalCheck.hideArtwork,
      });
      // Show toast notification
      alert('Album automatically added to library!');
    }}
    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
    Add to Library
  </button>
) : (
  // Regular approve button
  <button className="...">Request Approval</button>
)}
```

## 5. Add Discovery Tab to ChildDashboard

### Location: `/Users/jeremiahdaws/AppleMusicWhitelist/src/components/child/ChildDashboard.jsx`

### Add Import:
```javascript
import DiscoveryPage from './DiscoveryPage';
```

### Add Tab Button (in navigation):
```javascript
<button
  onClick={() => setActiveTab('discovery')}
  className={`${
    activeTab === 'discovery'
      ? 'border-b-2 border-purple-600 text-purple-600'
      : 'text-gray-600 hover:text-gray-900'
  } py-3 px-6 font-medium text-sm transition flex items-center gap-2`}
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
  <span>Discovery</span>
</button>
```

### Add Tab Content:
```javascript
{activeTab === 'discovery' && (
  <DiscoveryPage kidProfile={selectedKidProfile} />
)}
```

## 6. Environment Variables

### Add to Convex Dashboard:

1. Go to https://dashboard.convex.dev
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   - Key: `OPENAI_API_KEY`
   - Value: `sk-...your-key...`

## 7. Deploy Schema Changes

### Run in terminal:
```bash
# For development:
npx convex dev

# For production:
npx convex deploy
```

## Testing Snippets

### Test AI Recommendations:
```javascript
// In browser console or test component:
const result = await getAiRecommendations({
  kidAge: 8,
  musicPreferences: "Likes Taylor Swift and Disney songs",
  targetGenres: ["Pop", "Kids Music"],
  restrictions: "No romance themes"
});
console.log('Recommendations:', result);
```

### Test Content Review:
```javascript
// In browser console or test component:
const result = await reviewContent({
  appleSongId: "1234567890",
  reviewType: "song",
  trackName: "Let It Go",
  albumName: "Frozen",
  artistName: "Idina Menzel",
  lyrics: "[paste song lyrics here]"
});
console.log('Review:', result);
```

### Test Auto-Approval Check:
```javascript
// In browser console or test component:
const result = await checkAutoApproval({
  kidProfileId: "kid-profile-id",
  appleAlbumId: "1234567890",
  albumName: "Fearless",
  artistName: "Taylor Swift",
  genres: ["Pop", "Country"]
});
console.log('Auto-approved:', result.autoApproved);
```

## Quick Start Checklist

- [ ] Add `OPENAI_API_KEY` to Convex environment
- [ ] Deploy schema: `npx convex deploy`
- [ ] Add Discovery tab to AdminDashboard
- [ ] Add AI Review button to AlbumSearch
- [ ] Add AI Review button to AlbumRequests
- [ ] Add Discovery tab to ChildDashboard
- [ ] Test pre-approval workflow
- [ ] Test AI recommendations
- [ ] Test content review
- [ ] Test auto-approval in search

## Support

If you encounter issues:
1. Check Convex logs: `npx convex logs`
2. Check browser console for errors
3. Verify environment variables are set
4. Review DISCOVERY_IMPLEMENTATION_GUIDE.md for detailed explanations
