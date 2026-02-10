# Local Testing Guide - Discovery Feature

## Quick Setup (5 minutes)

### 1. Add OpenAI API Key

You need an OpenAI API key for the AI features to work.

**Get API Key:**
1. Go to https://platform.openai.com/api-keys
2. Create new key (or use existing)
3. Copy the key (starts with `sk-...`)

**Add to Convex:**

```bash
# Set environment variable in Convex dev environment
npx convex env set OPENAI_API_KEY sk-your-key-here
```

Alternatively, add it via the Convex dashboard:
1. Go to your Convex dashboard
2. Click "Settings" → "Environment Variables"
3. Add: `OPENAI_API_KEY` = `sk-your-key-here`

### 2. Deploy Schema Changes

The schema has 4 new tables that need to be deployed:

```bash
# Start Convex dev (this will auto-deploy schema)
npx convex dev
```

This will:
- Create the 4 new database tables
- Deploy all backend functions
- Watch for changes

**Keep this terminal running!**

### 3. Start Dev Server (New Terminal)

```bash
npm run dev
```

Your app should now be running with the discovery feature backend ready!

---

## Testing the Features

### A. Test Pre-Approval System (Backend Only)

You can test the backend functions directly from Convex dashboard:

1. Go to http://localhost:3000 (or your Convex dashboard URL shown in terminal)
2. Click "Functions" tab
3. Test these functions:

**Pre-approve an artist:**
```javascript
// Function: preApprovedContent:preApproveArtist
{
  "userId": "your-user-id",  // Get from users table
  "artistName": "Taylor Swift",
  "autoAddToLibrary": true,
  "notes": "Test pre-approval"
}
```

**Get pre-approved content:**
```javascript
// Function: preApprovedContent:getPreApprovedContent
{
  "userId": "your-user-id"
}
```

### B. Test AI Recommendations (Backend Only)

**Get AI recommendations:**
```javascript
// Function: ai/recommendations:getAiRecommendations
{
  "kidAge": 8,
  "musicPreferences": "Likes Disney music and Taylor Swift",
  "targetGenres": ["Pop", "Soundtrack"],
  "restrictions": "No romance or scary themes"
}
```

**Run twice to test caching** - second call should return `fromCache: true`

### C. Test Content Review (Backend Only)

**Review song lyrics:**
```javascript
// Function: ai/contentReview:reviewContent
{
  "reviewType": "song",
  "appleTrackId": "123456789",
  "trackName": "Let It Go",
  "artistName": "Idina Menzel",
  "lyrics": "Let it go, let it go\nCan't hold it back anymore..."
}
```

**Run twice with same trackId** - second call should return `fromCache: true`

---

## Frontend Integration (Optional for Testing)

If you want to see the UI components, follow the integration guide:

### Quick Integration - Just Discovery Tab

**Add to Child Dashboard:**

Edit `src/components/child/ChildDashboard.jsx`:

```jsx
// Add import
import DiscoveryPage from './DiscoveryPage';

// Add to tab state (around line 20)
const [activeTab, setActiveTab] = useState('library'); // or 'discovery'

// Add tab button (in the nav section)
<button
  onClick={() => setActiveTab('discovery')}
  className={activeTab === 'discovery' ? 'active-class' : 'inactive-class'}
>
  Discovery
</button>

// Add tab content (in the render section)
{activeTab === 'discovery' && (
  <DiscoveryPage kidProfileId={selectedKidProfile._id} />
)}
```

Now kids can see the discovery page!

### Full Integration

For complete admin features, see [INTEGRATION_CODE_SNIPPETS.md](./INTEGRATION_CODE_SNIPPETS.md)

---

## Verification Checklist

- [ ] `npx convex dev` running without errors
- [ ] Schema shows 4 new tables (preApprovedContent, discoveryHistory, aiRecommendationCache, contentReviewCache)
- [ ] Can call backend functions from Convex dashboard
- [ ] AI recommendations return results (first call)
- [ ] AI recommendations use cache (second call with same params)
- [ ] Content review returns analysis (first call)
- [ ] Content review uses cache (second call with same trackId)
- [ ] Frontend components render without errors (if integrated)

---

## Troubleshooting

### "OpenAI API key not found"
- Make sure you ran `npx convex env set OPENAI_API_KEY sk-...`
- Restart `npx convex dev` after setting the key

### "Module not found: convex/ai/..."
- Make sure files exist in `convex/ai/` directory
- Restart `npx convex dev` to pick up new files

### Schema deployment fails
- Check for syntax errors in `convex/schema.ts`
- Make sure all indexes are valid
- Check Convex dashboard for error details

### Frontend components crash
- Check browser console for errors
- Make sure all imports are correct
- Verify Convex queries are working (check Network tab)

---

## Cost Monitoring

While testing, monitor your OpenAI usage:

**Check cache effectiveness:**
```javascript
// Function: ai/recommendations:getCacheStats (if implemented)
// Or query aiRecommendationCache table directly
```

**Expected costs for testing:**
- ~10 AI recommendations: $0.02
- ~10 content reviews: $0.05
- Total testing budget: ~$0.10

**Cache should reduce costs by 80-99% after initial tests!**

---

## Next Steps After Testing

Once you verify everything works locally:

1. **Commit changes** to your branch
2. **Push branch** to remote
3. **Deploy to production** Convex environment
4. **Test on staging/production** before going live

## Questions?

Check these files for more details:
- [DISCOVERY_IMPLEMENTATION_GUIDE.md](./DISCOVERY_IMPLEMENTATION_GUIDE.md) - Full feature documentation
- [INTEGRATION_CODE_SNIPPETS.md](./INTEGRATION_CODE_SNIPPETS.md) - Copy-paste integration code
