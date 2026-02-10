# Genre Data Debug Analysis

## Problem Summary
Albums approved through the search interface are not capturing genre data from Apple Music API, even though the code appears to request and process it correctly.

## Current Implementation

### 1. API Request (musickit.js line 209-214)
```javascript
const params = {
  term: query,
  types: searchOptions.types,
  limit: searchOptions.limit,
  // Note: genreNames is a default attribute on albums/songs, no extend needed
};
```

**Previous attempt:** Used `extend: 'editorialVideo,genreNames'` but this was removed because `genreNames` should be a default attribute.

### 2. Data Processing (AlbumSearch.jsx line 146)
```javascript
genreNames: album.attributes.genreNames || [],
```

### 3. Data Storage (albums.ts line 133)
```javascript
genres: v.optional(v.array(v.string())),
```

### 4. Data Passed to Mutation (AlbumSearch.jsx line 555)
```javascript
genres: album.genreNames,
```

## Debug Logging Added

### In musickit.js (lines 227-239)
```javascript
console.log('=== MUSICKIT SEARCH RESPONSE ===');
console.log('Full results:', results);
if (results.data?.results?.albums?.data?.[0]) {
  console.log('First album raw data:', results.data.results.albums.data[0]);
  console.log('First album attributes:', results.data.results.albums.data[0].attributes);
  console.log('First album genreNames:', results.data.results.albums.data[0].attributes?.genreNames);
}
if (results.data?.results?.songs?.data?.[0]) {
  console.log('First song raw data:', results.data.results.songs.data[0]);
  console.log('First song attributes:', results.data.results.songs.data[0].attributes);
  console.log('First song genreNames:', results.data.results.songs.data[0].attributes?.genreNames);
}
console.log('================================');
```

### In AlbumSearch.jsx - Processing (lines 134-141)
```javascript
console.log('=== PROCESSING ALBUM ===');
console.log('Album ID:', album.id);
console.log('Album name:', album.attributes.name);
console.log('Album attributes:', album.attributes);
console.log('genreNames field:', album.attributes.genreNames);
console.log('genreNames type:', typeof album.attributes.genreNames);
console.log('genreNames is array?', Array.isArray(album.attributes.genreNames));
console.log('=======================');
```

### In AlbumSearch.jsx - Approval (lines 554-559)
```javascript
console.log('=== APPROVING ALBUM ===');
console.log('Album object:', album);
console.log('Album genreNames:', album.genreNames);
console.log('Album genreNames type:', typeof album.genreNames);
console.log('Album genreNames is array?', Array.isArray(album.genreNames));
console.log('======================');
```

### In AlbumSearch.jsx - Mutation Data (lines 577-578)
```javascript
console.log('[handleApprove] Approval data:', approvalData);
console.log('[handleApprove] Genres being sent:', approvalData.genres);
```

## Next Steps for User

1. **Open the browser console** (F12 or Cmd+Option+I)
2. **Search for an album** in the admin interface
3. **Look at the console logs** and check:
   - Does `genreNames` exist in the API response?
   - What is its value? (undefined, empty array, or populated array?)
   - Is it being passed correctly to the mutation?
4. **Approve an album** and check the approval logs

## Possible Issues & Solutions

### Issue 1: genreNames not in API response
**Symptom:** `album.attributes.genreNames` is `undefined`

**Solution:** The Apple Music API might require a different parameter. Common alternatives:
- Use `include` parameter: `include: 'genres'`
- Use `extend` parameter: `extend: 'genres'`
- Query genres relationship separately

### Issue 2: genreNames is empty array
**Symptom:** `album.attributes.genreNames` is `[]`

**Solution:** Some albums don't have genre data in Apple Music. This is expected for certain content.

### Issue 3: Data not persisting to database
**Symptom:** API returns genres but they're not in the database

**Solution:** Check the Convex mutation logs (lines 577-578 will show what's being sent)

## Apple Music API Documentation Notes

Based on research:
- `genreNames` is listed as a standard attribute for albums and songs
- It should be returned by default without needing `extend` or `include`
- Some albums may legitimately not have genre information
- The API response structure is: `results.data.results.albums.data[].attributes.genreNames`

## Files Modified

1. `/Users/jeremiahdaws/AppleMusicWhitelist/src/config/musickit.js`
   - Removed `extend` parameter
   - Added comprehensive debug logging

2. `/Users/jeremiahdaws/AppleMusicWhitelist/src/components/admin/AlbumSearch.jsx`
   - Added debug logging at processing, approval, and mutation stages

## Testing Checklist

- [ ] Search for a well-known album (e.g., "Taylor Swift 1989")
- [ ] Check console for genre data in API response
- [ ] Approve the album
- [ ] Check console for genre data being sent to mutation
- [ ] Check database to verify genres were saved
- [ ] View album in Library to confirm genres display

## Known Working Code

The genre display in Library (LibraryiTunes.jsx lines 139-147) works correctly:
```javascript
const genresMap = new Map();
Array.from(allAlbumsMap.values()).forEach(album => {
  if (album.genres && album.genres.length > 0) {
    album.genres.forEach(genre => {
      if (!genresMap.has(genre)) {
        genresMap.set(genre, { name: genre, albums: [] });
      }
      genresMap.get(genre).albums.push(album);
    });
  }
});
```

This confirms that:
- The database schema supports genres
- The display code is ready to show genres
- The only issue is capturing the data from the API
