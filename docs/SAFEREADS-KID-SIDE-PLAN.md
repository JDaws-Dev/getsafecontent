# SafeReads Kid Side - Implementation Plan

## Overview

Build the kid-facing side of SafeReads. Kids get their own login via family code, see a bookshelf of parent-approved books, search for new books, and request parent approval.

## Architecture Decisions

### Extend Existing `kids` Table vs. New `kidProfiles` Table

The existing `kids` table (userId, name, age, profileId) is minimal. Rather than creating a separate `kidProfiles` table (which would duplicate SafeTunes' pattern unnecessarily), we will **extend the existing `kids` table** with new fields: `color`, `pin`, `readingLevel`, `createdAt`. This avoids migration complexity and keeps the existing wishlists/dashboard references working.

### Existing `wishlists` Table vs. New `approvedBooks` Table

The existing `wishlists` table is parent-curated "books I want to check out for this kid." The new `approvedBooks` concept is different: "books this kid is allowed to read." These are separate concepts, so we create a new `approvedBooks` table. A wishlist book becomes an approved book when the parent explicitly approves it.

### Family Codes

SafeTunes stores `familyCode` on the `users` table directly. SafeReads currently has no family code concept. We will add a `familyCodes` table (same as the spec) to keep it clean and allow code regeneration without modifying the users table.

## Schema Changes (convex/schema.ts)

### Modify Existing Tables

**`kids` table** - Add fields:
- `color: v.optional(v.string())` - Avatar color
- `pin: v.optional(v.string())` - Optional 4-digit PIN
- `readingLevel: v.optional(v.string())` - Reading level
- `createdAt: v.optional(v.number())` - Creation timestamp

### New Tables

```
approvedBooks: {
  userId: v.id("users"),        // parent
  kidId: v.id("kids"),          // which kid
  googleBookId: v.string(),
  title: v.string(),
  author: v.string(),
  coverUrl: v.optional(v.string()),
  addedAt: v.number(),
  addedBy: v.string(),          // "parent" | "request_approved"
  notes: v.optional(v.string()),
}
  .index("by_user", ["userId"])
  .index("by_kid", ["kidId"])
  .index("by_kid_and_book", ["kidId", "googleBookId"])

bookRequests: {
  kidId: v.id("kids"),
  userId: v.id("users"),        // parent
  googleBookId: v.string(),
  title: v.string(),
  author: v.string(),
  coverUrl: v.optional(v.string()),
  status: v.string(),           // "pending" | "approved" | "denied"
  requestedAt: v.number(),
  respondedAt: v.optional(v.number()),
  denyReason: v.optional(v.string()),
}
  .index("by_kid", ["kidId"])
  .index("by_user", ["userId"])
  .index("by_user_and_status", ["userId", "status"])
  .index("by_kid_and_book", ["kidId", "googleBookId"])

readingProgress: {
  kidId: v.id("kids"),
  googleBookId: v.string(),
  currentPage: v.optional(v.number()),
  totalPages: v.optional(v.number()),
  percentComplete: v.number(),
  lastReadAt: v.number(),
  startedAt: v.number(),
  finishedAt: v.optional(v.number()),
}
  .index("by_kid", ["kidId"])
  .index("by_kid_and_book", ["kidId", "googleBookId"])

familyCodes: {
  userId: v.id("users"),
  code: v.string(),
  createdAt: v.number(),
}
  .index("by_user", ["userId"])
  .index("by_code", ["code"])
```

## Backend Files

### convex/familyCodes.ts
- `generate` mutation - Create 6-char alphanumeric code for user (delete old one first)
- `getByUser` query - Get family code for a user
- `validateCode` query - Look up code, return user info + kid profiles
- Algorithm: Same as SafeTunes (random 6-char uppercase alphanumeric)

### convex/kidProfiles.ts (extending existing convex/kids.ts)
- Add to existing `kids.ts`:
  - `verifyPin` query - Check PIN for a kid
  - `getByFamilyCode` query - Get kids for a family code (uses familyCodes table)
  - Update `create` mutation to accept color, pin, readingLevel, createdAt
  - Update `update` mutation to accept color, pin, readingLevel

### convex/approvedBooks.ts
- `addForKid` mutation - Parent adds a book to kid's approved shelf
- `removeForKid` mutation - Parent removes a book
- `listForKid` query - Get all approved books for a kid
- `isApproved` query - Check if a specific book is approved for a kid

### convex/bookRequests.ts
- `create` mutation - Kid requests a book (creates pending request)
- `approve` mutation - Parent approves (creates approvedBook, updates status)
- `deny` mutation - Parent denies with optional reason
- `listPendingByUser` query - Get all pending requests for a parent
- `listByKid` query - Get all requests for a kid
- `countPendingByUser` query - Count pending requests (for badge)

### convex/readingProgress.ts
- `update` mutation - Update reading progress
- `getForKid` query - Get all reading progress for a kid
- `getForBook` query - Get progress for a specific kid+book

## Frontend Pages (src/app/play/)

### /play (page.tsx)
Family code entry. Fun, colorful design. Input for 6-char code. Checks localStorage first for returning kids.

### /play/profiles (page.tsx)
Profile selection grid after valid family code. Colored circle avatars with names. PIN entry modal if profile has a PIN.

### /play/home (page.tsx)
Kid's main screen:
- "Currently Reading" section (books with progress)
- "My Bookshelf" grid of approved books
- Quick search shortcut
- Simple reading stats

### /play/search (page.tsx)
Book search using Google Books API (reuses existing SafeReads search action):
- Search bar
- Results grid (title, cover, author, short description)
- "Ask Parent" button on each result
- Status indicator for already-requested/already-approved books

### /play/read/[bookId] (page.tsx)
Book detail + placeholder reader:
- Book info (cover, title, author, description)
- Reading progress tracker
- "Coming Soon: Read in App" placeholder
- "Start Reading" button that just updates progress

## Frontend Components (src/components/kid/)

### FamilyCodeEntry.tsx
- Large, spaced character input boxes (6 boxes)
- Fun colors, friendly language ("Enter your family code!")
- Auto-submit on 6 chars
- Error state with shake animation

### ProfileSelector.tsx
- Grid of colored circle avatars
- Name below each
- Optional PIN entry modal (4-digit numeric keypad)
- "Not your family? Use a different code" link

### KidBookshelf.tsx
- Responsive grid of BookCard components
- Empty state: "No books yet! Search for books and ask your parent to approve them."

### BookCard.tsx
- Book cover image (or placeholder)
- Title (truncated)
- Author
- Progress bar (if reading progress exists)

### BookSearch.tsx
- Search input with magnifying glass icon
- Debounced search (300ms)
- Results as BookCard with "Ask Parent" button
- Loading skeleton

### RequestButton.tsx
- "Ask Parent" button
- States: default, loading, requested (checkmark), approved (already on shelf)

### KidNav.tsx
- Bottom navigation bar (fixed)
- Three tabs: Home (house icon), Search (magnifying glass), My Books (bookshelf icon)
- Active state indicator

## Parent Side Updates

### Dashboard (src/app/dashboard/page.tsx)
- Add "Pending Requests" badge next to Kids section
- Link to requests review page

### New: /dashboard/requests (page.tsx)
- List of pending book requests from all kids
- Each request shows: book info, kid who requested, AI analysis link
- Approve/Deny buttons with optional deny reason

### Settings additions
- Family Code display + copy button + regenerate
- Kid profile management (add color, PIN, reading level fields)

## Kid Session Management

Stored in localStorage:
- `safereads_family_code` - The 6-char family code
- `safereads_kid_profile` - JSON of selected kid profile

No JWT needed for kids. Family code validates against Convex on each page load.

## File Creation Order

1. Schema changes (convex/schema.ts)
2. Backend: familyCodes.ts, updates to kids.ts, approvedBooks.ts, bookRequests.ts, readingProgress.ts
3. Kid components: FamilyCodeEntry, ProfileSelector, KidBookshelf, BookCard, BookSearch, RequestButton, KidNav
4. Kid pages: /play, /play/profiles, /play/home, /play/search, /play/read/[bookId]
5. Parent updates: requests page, dashboard badge, settings additions

## Design Tokens (Kid Side)

Use the existing SafeReads parchment/ink palette but with more vibrant kid-friendly accents:
- Primary actions: emerald-500 / emerald-600
- Request buttons: amber-500 / amber-600
- Avatars: predefined color set (red, blue, green, purple, orange, pink, teal, yellow)
- Backgrounds: white with subtle gradients
- Large touch targets (min 44px)
- Rounded corners (xl/2xl)
- Playful but not childish - appropriate for ages 6-14

## What's NOT Included

- epub.js reader integration (placeholder only)
- Reading time limits
- Badges/gamification
- Library card integration
- Audio read-along
- Push notifications
