# SafeTunes Android TWA (Trusted Web Activity)

This directory contains the Android app wrapper for SafeTunes using Trusted Web Activity (TWA).

## What is TWA?

TWA allows you to wrap a Progressive Web App (PWA) in an Android app shell, giving it a native app experience while using your existing web app code.

## Prerequisites

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java JDK 17+** - Usually bundled with Android Studio
3. **Google Play Console account** - $25 one-time fee

## Setup Steps

### 1. Install Bubblewrap (Google's TWA tool)

```bash
npm install -g @anthropic/anthropic-sdk
npm install -g @nicknisi/bubblewrap
# OR use npx:
npx @nicknisi/bubblewrap init
```

### 2. Initialize the TWA project

```bash
cd android-twa
npx bubblewrap init --manifest https://getsafetunes.com/manifest.json
```

### 3. Build the APK

```bash
npx bubblewrap build
```

### 4. Test on device

```bash
adb install app-release-signed.apk
```

## Configuration

The `twa-manifest.json` file contains all the TWA configuration:
- App name and package ID
- Theme colors
- Icon paths
- Start URL
- Digital Asset Links configuration

## Digital Asset Links

For the TWA to show without the browser bar, you need to verify domain ownership:

1. Build the app to get your signing key fingerprint
2. Add `/.well-known/assetlinks.json` to your website
3. The assetlinks.json file is in this directory - deploy it to your site

## Play Store Submission

1. Build a signed AAB (Android App Bundle):
   ```bash
   npx bubblewrap build --aab
   ```

2. Create a new app in Google Play Console

3. Upload the AAB file

4. Fill out store listing, content rating, etc.

5. Submit for review

## Files in this directory

- `twa-manifest.json` - TWA configuration
- `assetlinks.json` - Digital Asset Links (deploy to website)
- `README.md` - This file

## Troubleshooting

### Browser bar showing?
- Verify assetlinks.json is accessible at `https://getsafetunes.com/.well-known/assetlinks.json`
- Check the SHA256 fingerprint matches your signing key

### App crashing?
- Ensure you have internet permission in AndroidManifest.xml
- Check logcat for errors: `adb logcat | grep SafeTunes`
