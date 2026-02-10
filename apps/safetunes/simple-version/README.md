# SafeTunes - Simple Version

## Super Easy Setup - NO BUILD TOOLS REQUIRED!

This is a simplified version that works without npm, Vite, or any build process. Just open the HTML files in your browser!

## How to Use

### Option 1: Double-Click to Open
1. Navigate to the `simple-version` folder
2. **Double-click `index.html`** to see the player interface
3. **Double-click `admin.html`** to see the admin dashboard

### Option 2: Open in Browser
1. Right-click on `index.html` → Open With → Your Browser (Chrome, Safari, Firefox)
2. Right-click on `admin.html` → Open With → Your Browser

## What You'll See

### Player Interface (`index.html`)
- Kid-friendly music player
- 6 colorful demo albums
- Click albums to "play" them (shows alert for now)
- Link to admin dashboard

### Admin Dashboard (`admin.html`)
- **Login password:** `admin`
- Search for albums (shows demo results)
- Approve albums by clicking "Approve" button
- View all approved albums in "Approved Albums" tab
- Remove albums from approved list

## Features

✅ Works immediately - no installation needed
✅ Beautiful Tailwind CSS styling via CDN
✅ Fully functional demo with placeholder data
✅ Responsive design (works on mobile/tablet/desktop)
✅ Clean, modern UI

## Differences from Full Version

This simple version:
- Uses Tailwind CSS CDN (instant, no build needed)
- Uses vanilla JavaScript (no React)
- Stores data in memory (resets on page refresh)
- Shows demo/placeholder data

The full version (in parent directory):
- Uses React + Vite (requires npm/build tools)
- Can integrate with Firebase for persistent data
- Can integrate with Apple MusicKit for real music

## Next Steps

Once you're happy with how it looks, you can:
1. Add Firebase integration for data persistence
2. Add Apple MusicKit for real music search and playback
3. Deploy to a web host (Netlify, Vercel, GitHub Pages)

## File Locations

On your computer:
```
/Users/jeremiahdaws/AppleMusicWhitelist/simple-version/
  ├── index.html (Player page)
  ├── admin.html (Admin dashboard)
  └── README.md (This file)
```

Just open these files in your browser and enjoy!
