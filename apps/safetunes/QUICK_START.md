# SafeTunes - Quick Start Guide

## 🚀 Ready to Launch!

Everything is set up and ready. You just need to initialize Convex manually (it requires interactive input).

## Step 1: Initialize Convex (Interactive - Do This Now!)

Open a terminal in this project directory and run:

```bash
npx convex dev
```

You'll be prompted with:
1. **"What would you like to configure?"**
   - Select: **"create a new project"**

2. **"Project name?"**
   - Enter: **"safetunes"** (or any name you prefer)

3. Convex will:
   - Create your cloud project
   - Generate `convex/_generated/` directory
   - Display your deployment URL

## Step 2: Copy Your Deployment URL

After `npx convex dev` runs, you'll see output like:

```
✔ Deployment URL: https://xxxxx.convex.cloud
```

**Copy that URL!**

## Step 3: Create .env File

Create a file called `.env` (no extension) in the project root:

```bash
# .env
VITE_CONVEX_URL=https://xxxxx.convex.cloud

# Optional - Add when you have Apple Music configured
VITE_MUSICKIT_DEVELOPER_TOKEN=
VITE_MUSICKIT_APP_NAME=SafeTunes
```

Replace `https://xxxxx.convex.cloud` with your actual deployment URL.

## Step 4: Restart Development Server

1. **Keep `npx convex dev` running** in one terminal
2. Open a **new terminal** and run:

```bash
npm run dev
```

## Step 5: Test It Out!

1. Visit: http://localhost:5173/
2. Click "Get Started" or go to http://localhost:5173/admin
3. Try searching for albums (will show placeholder data initially)
4. Click "Approve" on an album
5. Refresh the page - your approval should persist! ✨

## 🎯 What's Working Now

✅ Convex database integration
✅ Real-time data synchronization
✅ Album approval persistence
✅ Album search (MusicKit integration ready)
✅ Mobile-responsive UI
✅ Landing page
✅ Admin dashboard

## 🔄 Still To Do

After getting Convex running:

1. **Authentication**
   - Implement user signup/login
   - Add password hashing (bcryptjs)
   - Connect to Convex users table

2. **Kid Profiles**
   - Create kid profile management UI
   - Implement PIN authentication
   - Connect to Convex kidProfiles table

3. **Player Interface**
   - Display approved albums for kids
   - Filter by selected kid profile

4. **Apple Music Setup**
   - Get Apple Developer account
   - Configure MusicKit token
   - Test real music playback

5. **Stripe Integration**
   - Set up subscription billing
   - Connect to signup flow

## 📱 Development URLs

- **Landing Page:** http://localhost:5173/
- **Admin Dashboard:** http://localhost:5173/admin
- **Player (Kids):** http://localhost:5173/player
- **Signup:** http://localhost:5173/signup
- **Login:** http://localhost:5173/login
- **Kid Login:** http://localhost:5173/child-login

## 🛠️ Two Terminals Required

**Terminal 1 - Convex Backend:**
```bash
npx convex dev
```
Leave this running. It watches your `convex/` directory.

**Terminal 2 - React Frontend:**
```bash
npm run dev
```
Your web app at http://localhost:5173/

## 🐛 Troubleshooting

### "Cannot find module convex/_generated/api"
- Make sure `npx convex dev` is running
- Check that `convex/_generated/` directory exists
- Restart your dev server

### "VITE_CONVEX_URL is not defined"
- Check that `.env` file exists in project root
- Make sure it contains `VITE_CONVEX_URL=...`
- Restart both terminals

### Changes not appearing
- Make sure both terminals are running
- Check browser console for errors
- Try hard refresh (Cmd+Shift+R)

## 📊 View Your Data

Once Convex is running, visit:
**https://dashboard.convex.dev/**

You can:
- View all your tables
- See real-time data updates
- Run queries manually
- Check logs and performance

## 🎉 You're All Set!

Once you complete Steps 1-4 above, you'll have a fully functional real-time database for SafeTunes!

---

**Questions?** Check these docs:
- `CONVEX_SETUP.md` - Detailed setup guide
- `CONVEX_INTEGRATION_SUMMARY.md` - What we built
- `README.md` - Project overview
