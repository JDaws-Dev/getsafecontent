# Convex Setup Guide for SafeTunes

## Overview
SafeTunes now uses Convex as its real-time database backend. Convex provides instant synchronization between the admin dashboard and player interface, with TypeScript-first development.

## Initial Setup

### 1. Install Convex (Already Done)
```bash
npm install convex
```

### 2. Initialize Convex Project
```bash
npx convex dev
```

This will:
- Create a Convex project in the cloud
- Generate a deployment URL
- Set up the `convex/_generated` directory with TypeScript types
- Start watching for changes

During initialization, you'll be prompted to:
1. Log in to your Convex account (or create one)
2. Create a new project or select an existing one
3. Choose a project name (suggest: "safetunes")

### 3. Configure Environment Variables

After running `npx convex dev`, copy your deployment URL to `.env`:

```bash
# .env
VITE_CONVEX_URL=https://your-deployment-url.convex.cloud
```

The URL will be displayed in the terminal after running `npx convex dev`.

### 4. Run Development Server

In one terminal:
```bash
npx convex dev
```

In another terminal:
```bash
npm run dev
```

## Database Schema

### Tables

#### `users`
Parent/admin accounts
- `email`: User's email (indexed)
- `passwordHash`: Hashed password
- `name`: User's display name
- `createdAt`: Timestamp
- `subscriptionStatus`: "trial", "active", "canceled"
- `subscriptionId`: Stripe subscription ID (optional)

#### `kidProfiles`
Child profiles with PINs
- `userId`: Reference to parent user
- `name`: Child's name
- `avatar`: Avatar emoji/image (optional)
- `color`: Theme color (optional)
- `pin`: 4-digit PIN for login
- `createdAt`: Timestamp

#### `approvedAlbums`
Albums approved by parents
- `userId`: Parent who approved
- `kidProfileId`: Specific kid (optional, null = all kids)
- `appleAlbumId`: Apple Music album ID
- `albumName`: Album title
- `artistName`: Artist name
- `artworkUrl`: Album artwork URL
- `releaseYear`: Release year
- `trackCount`: Number of tracks
- `genres`: Array of genre names
- `isExplicit`: Boolean for explicit content
- `approvedAt`: Timestamp

#### `albumRequests`
Kids can request albums for parent approval
- `kidProfileId`: Kid who requested
- `userId`: Parent to review
- `appleAlbumId`: Apple Music album ID
- `albumName`: Album title
- `artistName`: Artist name
- `artworkUrl`: Album artwork URL
- `status`: "pending", "approved", "denied"
- `requestedAt`: Timestamp
- `reviewedAt`: Timestamp (optional)

## Available Queries & Mutations

### Users (`convex/users.ts`)
- `getUserByEmail(email)` - Find user by email
- `getUser(userId)` - Get user by ID
- `createUser(email, passwordHash, name)` - Create new user
- `updateSubscriptionStatus(userId, status, subscriptionId)` - Update subscription
- `updateUser(userId, name, email)` - Update user profile

### Kid Profiles (`convex/kidProfiles.ts`)
- `getKidProfiles(userId)` - Get all kids for a parent
- `getKidProfile(profileId)` - Get single profile
- `verifyKidPin(profileId, pin)` - Verify PIN login
- `createKidProfile(userId, name, avatar, color, pin)` - Create new kid
- `updateKidProfile(profileId, ...)` - Update profile
- `deleteKidProfile(profileId)` - Delete profile

### Albums (`convex/albums.ts`)
- `getApprovedAlbums(userId)` - Get all approved albums for parent
- `getApprovedAlbumsForKid(kidProfileId)` - Get albums for specific kid
- `isAlbumApproved(userId, appleAlbumId)` - Check if album is approved
- `approveAlbum(userId, kidProfileId, albumData)` - Approve an album
- `removeApprovedAlbum(albumId)` - Remove approval
- `approveMultipleAlbums(userId, kidProfileId, albums[])` - Bulk approve (for playlist import)

### Album Requests (`convex/albumRequests.ts`)
- `getPendingRequests(userId)` - Get pending requests for parent
- `getRequestsByKid(kidProfileId)` - Get requests from a kid
- `createAlbumRequest(kidProfileId, userId, albumData)` - Create request
- `approveRequest(requestId)` - Approve and add to approved albums
- `denyRequest(requestId)` - Deny request

## Using Convex in Components

### Example: Querying Data
```javascript
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

function MyComponent() {
  const approvedAlbums = useQuery(
    api.albums.getApprovedAlbums,
    { userId: user._id }
  );

  if (!approvedAlbums) return <div>Loading...</div>;

  return (
    <div>
      {approvedAlbums.map(album => (
        <div key={album._id}>{album.albumName}</div>
      ))}
    </div>
  );
}
```

### Example: Mutating Data
```javascript
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

function MyComponent() {
  const approveAlbum = useMutation(api.albums.approveAlbum);

  const handleApprove = async (albumData) => {
    try {
      await approveAlbum({
        userId: user._id,
        appleAlbumId: albumData.id,
        albumName: albumData.name,
        artistName: albumData.artist,
        // ... other fields
      });
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  return <button onClick={() => handleApprove(album)}>Approve</button>;
}
```

## Real-time Updates

Convex automatically keeps your UI in sync! When a parent approves an album in the admin dashboard, the player interface updates instantly without needing to refresh.

## Development Workflow

1. Make changes to schema or functions in `convex/` directory
2. Convex dev server automatically detects changes and redeploys
3. TypeScript types regenerate in `convex/_generated/`
4. Your app automatically gets the latest data

## Production Deployment

### 1. Deploy Convex Functions
```bash
npx convex deploy --prod
```

This creates a production deployment separate from dev.

### 2. Set Production Environment Variable
Update your hosting platform (Vercel/Netlify) with:
```
VITE_CONVEX_URL=https://your-production-url.convex.cloud
```

### 3. Configure Convex Environment Variables
If you need environment-specific values in Convex functions:
```bash
npx convex env set STRIPE_SECRET_KEY your_key_here
```

## Current Database Configuration (Updated: November 17, 2025)

### Development Database
- **URL:** `https://reminiscent-cod-488.convex.cloud`
- **Type:** dev
- **Purpose:** Local development and testing
- **Data:** Currently synced with production (1 user, 2 kid profiles, 7 albums, 102 songs)

### Production Database
- **URL:** `https://formal-chihuahua-623.convex.cloud`
- **Type:** prod
- **Purpose:** Live site at getsafetunes.com
- **Data:** Currently synced with dev (1 user, 2 kid profiles, 7 albums, 102 songs)

### Database Statistics Utility
Check database contents anytime with:
```bash
# Check dev database
npx convex run databaseStats:getDatabaseStats

# Check production database
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex run databaseStats:getDatabaseStats
```

This will show counts for:
- Users (with emails and family codes)
- Kid profiles (with names)
- Approved albums and songs
- Album and song requests
- Playlists
- Recently played tracks
- Blocked searches

### Important Notes
- Both databases are **currently in sync** but will diverge as production users sign up
- Local changes go to **dev database only**
- Production users create data in **production database only**
- This separation is **correct and recommended** for production apps

## Migrating from Firebase (If Applicable)

The Firebase config file (`src/config/firebase.js`) can be removed once all components are migrated to Convex. The Convex setup provides all the same functionality:

- **Firebase Realtime Database** → Convex queries (with better TypeScript support)
- **Firebase Auth** → Custom auth with `users` table + session management
- **Firebase Storage** → Use Convex file storage or external CDN for images

## Troubleshooting

### "Cannot find module convex/_generated/api"
- Run `npx convex dev` to generate TypeScript types
- Make sure `convex/tsconfig.json` exists

### "ConvexReactClient is not defined"
- Check that `VITE_CONVEX_URL` is set in `.env`
- Restart your dev server after adding env variables

### Changes not reflecting
- Ensure `npx convex dev` is running in a separate terminal
- Check the Convex terminal for deployment errors
- Clear browser cache and hard refresh

### Type errors in convex functions
- Make sure you're using `v` from `convex/values` for validation
- Check that table names in schema match your queries

## Resources

- [Convex Docs](https://docs.convex.dev/)
- [Convex React Quick Start](https://docs.convex.dev/quickstart/react)
- [Convex Dashboard](https://dashboard.convex.dev/) - View data, logs, and metrics

## Next Steps

1. Run `npx convex dev` to initialize your project
2. Copy the deployment URL to `.env` as `VITE_CONVEX_URL`
3. Restart your Vite dev server (`npm run dev`)
4. Test the admin dashboard album approval flow
5. Implement authentication (signup/login) with Convex users table
6. Add kid profile management
7. Build out the player interface to show approved albums

---

*Convex provides a better developer experience than Firebase with TypeScript-first development, automatic schema validation, and instant real-time updates!*
