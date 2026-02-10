# Convex Integration Summary

## What We've Done

### ✅ Completed Steps

1. **Installed Convex**
   - Added `convex` package to dependencies
   - Package installed successfully

2. **Created Database Schema** (`convex/schema.ts`)
   - `users` table - Parent/admin accounts
   - `kidProfiles` table - Child profiles with PINs
   - `approvedAlbums` table - Approved albums by parents
   - `albumRequests` table - Album requests from kids
   - All tables have proper indexes for efficient queries

3. **Created Queries & Mutations**
   - `convex/users.ts` - User management
   - `convex/kidProfiles.ts` - Kid profile operations
   - `convex/albums.ts` - Album approval/removal
   - `convex/albumRequests.ts` - Request workflow

4. **Updated React App**
   - Added `ConvexProvider` to `App.jsx`
   - Created `AuthProvider` in `src/hooks/useAuth.jsx`
   - Updated `AlbumSearch` component to use Convex mutations
   - Updated `.env.example` to include `VITE_CONVEX_URL`

5. **Created Documentation**
   - `CONVEX_SETUP.md` - Complete setup guide
   - `CONVEX_INTEGRATION_SUMMARY.md` - This file

---

## 🚀 Next Steps to Get Running

### Step 1: Initialize Convex Project

Run this command to create your Convex deployment:

```bash
npx convex dev
```

You'll be prompted to:
1. **Log in** or create a Convex account
2. **Create a new project** (name it "safetunes")
3. Convex will generate your deployment URL

This command will:
- Generate `convex/_generated/` directory with TypeScript types
- Start watching for changes in your `convex/` directory
- Give you a deployment URL

### Step 2: Configure Environment

After `npx convex dev` runs, copy your deployment URL (it will look like `https://xxxxx.convex.cloud`) and create a `.env` file:

```bash
# .env
VITE_CONVEX_URL=https://your-deployment-url.convex.cloud
VITE_MUSICKIT_DEVELOPER_TOKEN=your_musickit_token
VITE_MUSICKIT_APP_NAME=SafeTunes
```

### Step 3: Restart Vite Dev Server

The current `npm run dev` process may have errors because the Convex files aren't generated yet. After running `npx convex dev`:

1. Stop the current dev server (Ctrl+C)
2. Run `npm run dev` again

### Step 4: Test the Integration

Once everything is running:
1. Visit http://localhost:5173/admin
2. Try searching for albums (will use placeholder data if MusicKit not configured)
3. Click "Approve" on an album
4. The album should be saved to Convex and persist across refreshes

---

## Development Workflow

You'll need **two terminal windows** running simultaneously:

**Terminal 1: Convex Dev Server**
```bash
npx convex dev
```
This watches your Convex functions and syncs changes.

**Terminal 2: Vite Dev Server**
```bash
npm run dev
```
This runs your React app.

---

## Current File Structure

```
/AppleMusicWhitelist
├── convex/
│   ├── _generated/          # Auto-generated (after npx convex dev)
│   ├── schema.ts            # Database schema ✅
│   ├── users.ts             # User queries/mutations ✅
│   ├── kidProfiles.ts       # Kid profile operations ✅
│   ├── albums.ts            # Album approval ✅
│   ├── albumRequests.ts     # Request workflow ✅
│   └── tsconfig.json        # TypeScript config ✅
├── src/
│   ├── hooks/
│   │   └── useAuth.jsx      # Auth context ✅
│   ├── components/
│   │   └── admin/
│   │       └── AlbumSearch.jsx  # Updated to use Convex ✅
│   └── App.jsx              # With ConvexProvider ✅
├── .env.example             # Updated ✅
├── CONVEX_SETUP.md          # Setup guide ✅
└── CONVEX_INTEGRATION_SUMMARY.md  # This file ✅
```

---

## What's Different from Firebase?

### Before (Firebase)
```javascript
// Firebase Realtime Database
const dbRef = ref(database, 'approvedAlbums');
const snapshot = await get(dbRef);
// Manual subscription management, complex data modeling
```

### After (Convex)
```javascript
// Convex - Reactive queries
const approvedAlbums = useQuery(api.albums.getApprovedAlbums, {
  userId: user._id
});
// Auto-updates, TypeScript types, simple data modeling
```

### Benefits of Convex

1. **TypeScript-first** - Full type safety
2. **Real-time by default** - No manual subscription code
3. **Better developer experience** - Schema validation, easy debugging
4. **Simpler queries** - No complex path management
5. **Free tier** - More generous than Firebase
6. **Dashboard** - Better data viewing at dashboard.convex.dev

---

## Components Updated

### ✅ AlbumSearch.jsx
- Uses `useQuery` to get approved albums
- Uses `useMutation` to approve albums
- Automatically syncs across all connected clients

### 🔄 Still Need Updates

These components still need to be migrated from placeholder data to Convex:

1. **AdminDashboard.jsx** - Dashboard stats, recent albums
2. **ApprovedAlbumsList.jsx** - Display approved albums
3. **PlayerInterface.jsx** - Show approved albums for kids
4. **LoginPage.jsx** - User authentication
5. **SignupPage.jsx** - User registration
6. **ChildLoginPage.jsx** - Kid profile selection and PIN verification

---

## Authentication Flow (To Implement)

### Parent Signup/Login
1. User enters email/password
2. Hash password (use bcryptjs)
3. Call `createUser` mutation
4. Store user ID in `useAuth` context
5. Redirect to admin dashboard

### Kid Login
1. Show kid profiles (from `getKidProfiles`)
2. User selects profile
3. Enter 4-digit PIN
4. Call `verifyKidPin` query
5. Store kid profile in session
6. Redirect to player

---

## Example: Updating a Component to Use Convex

Here's a template for updating other components:

```javascript
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { user } = useAuth();

  // Query data
  const data = useQuery(
    api.tableName.queryName,
    user ? { userId: user._id } : 'skip'
  );

  // Mutation
  const updateData = useMutation(api.tableName.mutationName);

  const handleAction = async () => {
    await updateData({
      userId: user._id,
      // ... other params
    });
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      {data.map(item => (
        <div key={item._id}>{item.name}</div>
      ))}
    </div>
  );
}
```

---

## Troubleshooting

### Error: "Cannot find module convex/_generated/api"
**Solution:** Run `npx convex dev` first to generate the API types.

### Error: "VITE_CONVEX_URL is not defined"
**Solution:**
1. Make sure `.env` exists with `VITE_CONVEX_URL=your-url`
2. Restart Vite dev server

### Changes not appearing
**Solution:** Make sure both `npx convex dev` and `npm run dev` are running.

### Type errors in Convex functions
**Solution:** Use `v` from `convex/values` for all argument validation.

---

## Production Deployment Checklist

- [ ] Run `npx convex deploy` to create production deployment
- [ ] Get production Convex URL
- [ ] Set `VITE_CONVEX_URL` in Vercel/Netlify environment variables
- [ ] Deploy frontend with updated env vars
- [ ] Test authentication flow
- [ ] Test album approval/removal
- [ ] Test real-time sync between admin and player

---

## Resources

- **Convex Docs:** https://docs.convex.dev/
- **Convex Dashboard:** https://dashboard.convex.dev/
- **React Quickstart:** https://docs.convex.dev/quickstart/react
- **Schema Design:** https://docs.convex.dev/database/schemas

---

*Ready to run! Execute `npx convex dev` to get started.* 🚀
