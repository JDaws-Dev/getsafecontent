# SafeTunes - Setup Guide

## Project Setup

This project is built with:
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Firebase** - Backend database (to be configured)
- **Apple MusicKit JS** - Music playback (to be configured)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then edit `.env` and add your Firebase and Apple MusicKit credentials.

### 3. Firebase Setup (Required for production)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Realtime Database
4. Enable Authentication (Email/Password)
5. Copy your Firebase config values to `.env`

### 4. Apple MusicKit Setup (Required for music playback)

1. Enroll in Apple Developer Program ($99/year)
2. Create a MusicKit identifier in your Apple Developer account
3. Generate a MusicKit developer token
4. Add the token to `.env`

See: [MusicKit JS Documentation](https://developer.apple.com/documentation/musickit/musickit-js)

### 5. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

## Project Structure

```
src/
├── components/
│   ├── admin/              # Admin dashboard components
│   │   ├── Login.jsx
│   │   ├── AdminDashboard.jsx
│   │   ├── AlbumSearch.jsx
│   │   └── ApprovedAlbumsList.jsx
│   ├── player/             # Player interface components
│   │   ├── PlayerInterface.jsx
│   │   └── AlbumGrid.jsx
│   └── shared/             # Shared components (future)
├── config/
│   └── firebase.js         # Firebase configuration
├── pages/
│   ├── AdminPage.jsx       # /admin route
│   └── PlayerPage.jsx      # /play route (kid setup)
├── App.jsx                 # Main app with routing
├── main.jsx               # App entry point
└── index.css              # Tailwind imports
```

## Available Routes

- **`/play`** - Kid setup and login (give this URL to kids to set up their device)
- **`/admin`** - Parent admin dashboard (password protected)

## Current Status

### ✅ Completed
- Project scaffolding with Vite + React
- Tailwind CSS configuration
- Routing setup (React Router)
- Admin dashboard UI
  - Login page (demo password: "admin")
  - Album search interface (placeholder)
  - Approved albums list
- Player interface UI
  - Album grid display
- Firebase configuration file
- Basic responsive design

### 🚧 Todo
- [ ] Integrate Firebase Realtime Database
  - Save approved albums
  - Real-time sync between admin and player
- [ ] Implement Apple MusicKit JS
  - Album search functionality
  - Music playback
  - Album artwork loading
- [ ] Add authentication with Firebase Auth
- [ ] Add kid profile support (multiple children)
- [ ] Implement album track listing view
- [ ] Add music playback controls
- [ ] Deploy to hosting (Vercel/Netlify)

## Development Notes

### Demo Credentials
- **Admin password:** `admin` (hardcoded for now)

### Placeholder Data
The app currently shows placeholder data since MusicKit and Firebase are not yet configured. Once you add your credentials:
1. Album search will use real Apple Music data
2. Approved albums will be saved to Firebase
3. The player will show real albums approved by parents

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Next Steps

1. **Set up Firebase** - Create a Firebase project and add credentials
2. **Get Apple Developer Account** - Required for MusicKit access
3. **Implement MusicKit search** - Replace placeholder album search
4. **Connect Firebase** - Save/load approved albums
5. **Test with real music** - Ensure playback works correctly
6. **Deploy** - Host on Vercel or Netlify

## Resources

- [MusicKit JS Documentation](https://developer.apple.com/documentation/musickit/musickit-js)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

## Recent Changes (January 2025)

### URL Routes & Kid Login
- **Kid Login URL**: Updated to `/play` for simpler device setup
  - Parents whitelist entire domain: `getsafetunes.com`
  - Kids access login at: `getsafetunes.com/play`
  - Landing page includes helper banner directing to `/play`

### Parent Dashboard Enhancements
- **Recent Activity Tracking**: Shows last 3 songs played per kid on home dashboard
  - Click "View All" to see full modal with up to 50 recent songs
  - Tracks playback from album track lists and player controls
  - Auto-tracking when songs change (skip, auto-advance, etc.)
- **Navigation Changes**: Removed dedicated Kids tab, added kid filter to Library tab
- **Kid Activity Cards**: Display kid profile info, album/track counts, and recent listening

### Bug Fixes
- Fixed album artwork display in recent activity (Apple Music URL template handling)
- Fixed song tracking when playing from album track lists
- Fixed tracking when using next/previous buttons in music player
- Corrected domain typos in support documentation

### Technical Implementation
- Added `onTrackChange` callback to MusicPlayer component
- Implemented `useRef` for deduplication in track change events
- Created KidActivityCard component with expandable modal
- Updated all device setup guides (Chromebook, iPad, Android, Kindle)

## Support

For issues or questions, refer to the main README.md or project documentation.
