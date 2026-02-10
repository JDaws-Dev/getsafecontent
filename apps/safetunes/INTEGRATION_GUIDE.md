# Quick Integration Guide

## How to Add These Components to Your Landing Page

You have 5 new conversion-optimized components ready to drop into your existing landing page. Here's how:

### Step 1: Import the Components

Add these imports at the top of `src/pages/LandingPage.jsx`:

```jsx
import ImprovedHero from '../components/landing/ImprovedHero';
import ComparisonTable from '../components/landing/ComparisonTable';
import InteractiveFeaturePreview from '../components/landing/InteractiveFeaturePreview';
import InstallationGuide from '../components/landing/InstallationGuide';
import StickyCTA from '../components/landing/StickyCTA';
```

### Step 2: Update Your Landing Page Structure

Replace/add sections in this recommended order:

```jsx
function LandingPage() {
  return (
    <>
      {/* NEW: Improved hero with better copy */}
      <ImprovedHero />

      {/* NEW: Interactive tabbed feature preview */}
      <InteractiveFeaturePreview />

      {/* NEW: Competitor comparison table */}
      <ComparisonTable />

      {/* KEEP: Your existing social proof section */}
      {/* <SocialProof /> or whatever you have */}

      {/* NEW: Installation guide addressing web app objection */}
      <InstallationGuide />

      {/* KEEP: Your existing features section */}
      {/* But update the Bible verse line to say "(optional setting)" */}

      {/* KEEP: Your existing pricing section */}

      {/* KEEP: Your existing FAQ section */}

      {/* KEEP: Your existing footer */}

      {/* NEW: Mobile sticky CTA (appears after scroll) */}
      <StickyCTA />
    </>
  );
}
```

### Step 3: Add IDs for Anchor Links

The hero has a "See How It Works" button that links to `#how-it-works`. Add this ID:

```jsx
<InteractiveFeaturePreview id="how-it-works" />
```

Or update the component file to include:
```jsx
<section id="how-it-works" className="py-20 bg-white">
```

### Step 4: Replace Screenshot Placeholders

The components have gray placeholder boxes labeled like:
- "Insert Parent Dashboard Screenshot"
- "Insert Kid Player Screenshot"
- etc.

To replace them:

1. Go to `src/components/landing/ImprovedHero.jsx`
2. Find the placeholder `<div>` around line 120
3. Replace with an `<img>` tag:
```jsx
<img
  src="/screenshots/kid-player.png"
  alt="Kid's music player interface"
  className="w-full h-full object-cover rounded-2xl"
/>
```

Repeat for:
- `InteractiveFeaturePreview.jsx` (has 3 placeholders for each tab)
- `ImprovedHero.jsx` (has 1 main screenshot)

### Step 5: Update Copy in Existing Sections

**In your existing Features section**, update the Bible verse line:

From:
```
"Bible verses when content is blocked"
```

To:
```
"Faith-based encouragement (optional setting)"
```

This invites secular parents without alienating Christian parents.

### Step 6: Test on Mobile

1. Open dev tools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Choose iPhone 12 Pro
4. Scroll down 300px - sticky CTA should appear
5. Click X to dismiss - should disappear
6. Refresh and scroll again - should reappear

### Step 7: Deploy

Once you're happy with it locally:

```bash
git add -A
git commit -m "Integrate conversion-optimized components"
git push origin landing-page-conversion-improvements
```

Then merge to main and deploy to Vercel.

---

## Component Details

### ImprovedHero
- **Replaces:** Your current hero section
- **New headline:** "Real Music. Real Protection. Zero Worry."
- **Alternatives in comments:** A/B test different headlines
- **Key addition:** Explicitly states "BYOM Apple Music subscription"

### ComparisonTable
- **Add after:** Features preview
- **Shows:** Side-by-side vs Spotify Kids and Apple Music Restrictions
- **Visual:** Green checkmarks for SafeTunes advantages
- **CTA:** "Start Free Trial" button at bottom

### InteractiveFeaturePreview
- **Add near top:** Right after hero
- **3 tabs:** Parent Approves, Kid Listens, Kid Requests
- **Dynamic:** Content changes when clicking tabs
- **Needs:** 3 screenshots (one per tab)

### InstallationGuide
- **Add after:** Comparison table
- **Addresses:** "Is this an app?" objection
- **Shows:** How to "Add to Home Screen" on iOS
- **Teaches:** Guided Access to lock kids in the app
- **Reassures:** Native app coming Q1 2026

### StickyCTA
- **Add:** At the very end (before closing </> tag)
- **Mobile only:** Hides on desktop (md:hidden)
- **Appears:** After scrolling 300px down
- **Dismissable:** X button to close
- **Converts:** Mobile visitors before they scroll away

---

## Optional Enhancements

### 1. Add Real Screenshots

You have these in `public/screenshots/`:
- 1_ADMIN DASHBOARD.png
- KID HOME.png
- KID_LIBRARY.png
- KID_PLAY SCREEN.png

Map them to:
- **Parent Dashboard Screenshot** → `1_ADMIN DASHBOARD.png`
- **Kid Player Screenshot** → `KID_PLAY SCREEN.png`
- **Kid Library Screenshot** → `KID_LIBRARY.png`

### 2. A/B Test Headlines

The ImprovedHero component has 3 headline options in comments. Try each for a week and see which converts better.

### 3. Add Video Demo

In `InteractiveFeaturePreview.jsx`, replace one of the screenshot placeholders with a video:

```jsx
<video autoplay loop muted className="rounded-xl">
  <source src="/demo.mp4" type="video/mp4" />
</video>
```

### 4. Track Conversions

Add Google Analytics events to CTAs:

```jsx
<a
  href="/signup"
  onClick={() => gtag('event', 'cta_click', { location: 'sticky_mobile' })}
>
  Start Free Trial
</a>
```

---

## Troubleshooting

### "lucide-react icons not found"

Install if missing:
```bash
npm install lucide-react
```

### "Components not showing up"

Make sure you:
1. Imported them correctly
2. Added them to the JSX return statement
3. Checked browser console for errors

### "Sticky CTA shows on desktop"

It should hide on desktop. Check Tailwind's responsive class is working:
```jsx
className="... md:hidden"
```

### "Tabs not switching in InteractiveFeaturePreview"

Check React state is working. Open console and look for errors.

---

## Need Help?

Check [CONVERSION_IMPROVEMENTS.md](CONVERSION_IMPROVEMENTS.md) for the full strategic review and design details.
