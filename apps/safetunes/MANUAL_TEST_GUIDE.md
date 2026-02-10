# Manual Testing Guide - AI Features

## ✅ Setup Complete!

Your Convex deployment is running with:
- ✅ Schema deployed (4 new tables)
- ✅ OpenAI API key configured
- ✅ All backend functions ready

**Convex Dashboard:** https://reminiscent-cod-488.convex.cloud

---

## Quick Test via Convex Dashboard

### 1. Open Your Convex Dashboard

Go to: https://reminiscent-cod-488.convex.cloud

Click on **"Functions"** tab

---

### 2. Test AI Recommendations (with Caching)

**Function:** `ai/recommendations:getAiRecommendations`

**Test Input (copy this JSON):**
```json
{
  "kidAge": 8,
  "musicPreferences": "Likes Disney music and Taylor Swift",
  "targetGenres": ["Pop", "Soundtrack"],
  "restrictions": "No romance or scary themes"
}
```

**Click "Run"**

**Expected Result:**
```json
{
  "recommendations": [
    {
      "type": "artist",
      "name": "Disney",
      "reason": "Age-appropriate movie soundtracks",
      "ageAppropriate": true,
      "genres": ["Soundtrack", "Kids"]
    },
    // ... more recommendations
  ],
  "fromCache": false  // First call = false
}
```

**Test Again (Same Input):**
Run the EXACT same query again.

**Expected Result:**
```json
{
  "recommendations": [ ... same results ... ],
  "fromCache": true  // 🎉 CACHE HIT!
}
```

---

### 3. Test Content Review (with Caching)

**Function:** `ai/contentReview:reviewContent`

**Test Input (copy this JSON):**
```json
{
  "reviewType": "song",
  "appleTrackId": "test-frozen-123",
  "trackName": "Let It Go",
  "artistName": "Idina Menzel",
  "lyrics": "Let it go, let it go\nCan't hold it back anymore\nLet it go, let it go\nTurn away and slam the door\nI don't care what they're going to say\nLet the storm rage on\nThe cold never bothered me anyway"
}
```

**Click "Run"**

**Expected Result:**
```json
{
  "review": {
    "summary": "This song is about...",
    "inappropriateContent": [],  // Should be empty for this song
    "overallRating": "appropriate",
    "ageRecommendation": "5+",
    "_id": "..."
  },
  "fromCache": false,  // First call = false
  "cacheHitCount": 0
}
```

**Test Again (Without Lyrics):**
```json
{
  "reviewType": "song",
  "appleTrackId": "test-frozen-123",
  "trackName": "Let It Go",
  "artistName": "Idina Menzel"
}
```

**Expected Result:**
```json
{
  "review": { ... same as before ... },
  "fromCache": true,  // 🎉 CACHE HIT!
  "cacheHitCount": 1  // Shows it was reused once
}
```

---

### 4. Test Pre-Approval System

**Function:** `preApprovedContent:preApproveArtist`

First, get a user ID from your users table (click "Data" tab → "users" → copy an `_id`)

**Test Input:**
```json
{
  "userId": "YOUR_USER_ID_HERE",
  "artistName": "Taylor Swift",
  "autoAddToLibrary": true,
  "notes": "Test pre-approval for Taylor Swift"
}
```

**Click "Run"**

**Expected Result:** Returns the new pre-approval ID
```json
"jh74abc123xyz..."
```

**Verify:** Go to "Data" tab → "preApprovedContent" table → see your new entry!

---

### 5. Check Discovery Functions

**Function:** `discovery:checkAutoApproval`

**Test Input:**
```json
{
  "kidProfileId": "YOUR_KID_PROFILE_ID",
  "albumData": {
    "artistName": "Taylor Swift",
    "genres": ["Pop"],
    "appleAlbumId": "1234567890"
  }
}
```

**Expected Result:**
```json
{
  "match": true,
  "type": "artist",
  "item": { ... pre-approval details ... }
}
```

This confirms that albums by Taylor Swift will auto-approve!

---

## Cost Monitoring

### Check Cache Effectiveness

**Go to Data Tab:**
1. Click **aiRecommendationCache** table
   - Check `timesReused` field
   - Higher = more cost savings!

2. Click **contentReviewCache** table
   - Check `timesReused` field
   - Each reuse = $0.005 saved!

### Expected Costs for Testing:
- First AI recommendation call: ~$0.002
- First content review call: ~$0.005
- All subsequent calls: **$0.000** (cached!)

**Total test budget: ~$0.01**

---

## Troubleshooting

### "OpenAI API key not found"
✅ Already set! But if you see this error:
```bash
npx convex env set OPENAI_API_KEY sk-your-key...
```

### Function not found
- Make sure `npx convex dev` is still running
- Check terminal for any errors
- Restart `npx convex dev` if needed

### Cache not working
- Make sure you're using EXACT same input parameters
- Check `queryHash` values in cache tables
- Hash is MD5 of sorted JSON keys

---

## What to Test Next

Once basic functions work:

1. **Test with Frontend:**
   - Add Discovery tab to ChildDashboard
   - See components in action
   - Test full user flow

2. **Integration Testing:**
   - Pre-approve an artist
   - Have kid search for that artist
   - Verify auto-approval works

3. **Cache Performance:**
   - Review same popular song multiple times
   - Check cache hit count increases
   - Verify costs stay low

---

## Current Status

✅ Convex dev server running
✅ Schema deployed (4 new tables)
✅ OpenAI API key configured
✅ Backend functions ready
⏳ Ready for manual testing!

**Next:** Test the functions in Convex dashboard using the examples above!
