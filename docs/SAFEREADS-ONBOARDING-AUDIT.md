# SafeReads Onboarding & Kid Flow Audit

**Date:** April 1, 2026
**Auditor:** Claude Opus 4.6
**Scope:** Family code system, kid profile setup, kid login flow, session management, first-time experience

---

## Summary

The SafeReads kid-facing experience is well-built with polished UI, but has several gaps in the end-to-end flow. The most critical issues are: (1) family codes are not auto-generated during signup/provisioning, (2) the kid login flow has no subscription check so expired users' kids can read indefinitely, (3) the onboarding wizard doesn't mention the family code or kid login at all, and (4) the `ensureSafeReadsUser` mutation (auto-provisioning fallback) doesn't set a family code.

**Critical:** 2 | **High:** 5 | **Medium:** 7 | **Low:** 4

---

## Issues

### 1. Family code NOT auto-generated on signup

- **Severity:** Critical
- **Where:** `convex/provisionUserInternal.ts` (line 68-78) and `convex/userSync.ts` (line 60-67)
- **Details:** When a new user is provisioned (via webhook or auto-provisioning), `familyCode` is only set if explicitly passed in the args. The `ensureSafeReadsUser` mutation (the fallback auto-provisioning in `dashboard/layout.tsx`) never passes `familyCode` at all. The provisioning HTTP endpoint only passes it if `body.familyCode` exists, which depends on the Marketing webhook sending it. If a user signs up fresh and the webhook doesn't include a familyCode, they get none.
- **Impact:** New users have no family code until they manually go to Settings and click "Generate Family Code." This is a hidden step that breaks the "signup to kid reading" flow.
- **Fix:** Auto-generate a family code in `provisionUserInternal.ts` when creating a new user (if no familyCode is provided). Also add family code generation to `ensureSafeReadsUser`.

### 2. Kid login flow does NOT check parent subscription status

- **Severity:** Critical
- **Where:** `src/app/play/page.tsx`, `src/app/play/home/page.tsx`, `convex/familyCodes.ts` (`validateCode`)
- **Details:** The `validateCode` query returns kid profiles for any valid family code without checking the parent's `subscriptionStatus`. The `/play/home` page only checks localStorage for a kid profile -- it never verifies the parent still has an active subscription. A parent whose subscription expires (or is cancelled) still has kids with full access indefinitely.
- **Impact:** Revenue leakage. Expired/cancelled users' kids continue to access the full kid experience with no degradation.
- **Fix:** Add a subscription status check to `validateCode` (return null or a `{ subscriptionExpired: true }` flag if the parent's status is not active/trial/lifetime). Also add periodic re-validation in the kid home page.

### 3. `provisionUser.ts` body type missing `familyCode` field

- **Severity:** High
- **Where:** `convex/provisionUser.ts` lines 58-67 (type definition) and line 104 (usage)
- **Details:** The `body` type definition does not include `familyCode`, but line 104 accesses `body.familyCode`. This compiles because TypeScript's type narrowing on the `await request.json()` call is loose, but it's a latent type safety issue.
- **Fix:** Add `familyCode?: string | null;` to the body type definition.

### 4. Onboarding wizard does NOT mention family code or kid login

- **Severity:** High
- **Where:** `src/app/onboarding/page.tsx`
- **Details:** The 3-step onboarding wizard (Welcome -> Add Kids -> Done) never mentions the family code system, the `/play` URL, or how to set up the kid-facing experience. Step 1 says "Add Your Kids" but only collects name and age -- no color, PIN, or reading level (the KidForm is used but the onboarding `addKid` function only stores `{ name, age }` via `KidFormValues`). After onboarding, kids created here have no color (defaults to purple), no PIN, and no reading level.
- **Impact:** Parents complete onboarding without knowing (a) their kids can have their own reading experience, (b) they need a family code, or (c) where to find it. The kid profiles created during onboarding are incomplete (no color/PIN/readingLevel).
- **Fix:** Add a step to the onboarding wizard that: generates/displays the family code, explains `/play`, and collects full kid profile data (color, PIN, reading level). Or at minimum, show the family code on the "You're All Set" screen.

### 5. Onboarding creates kids with incomplete data

- **Severity:** High
- **Where:** `src/app/onboarding/page.tsx` lines 50-53 and 64-69
- **Details:** The `addKid` function in onboarding accepts `KidFormValues` (which includes color, pin, readingLevel) but the `handleComplete` function only passes `{ name, age }` to `createKid`. The KidForm component IS rendered, so users CAN fill in color/PIN/reading level, but those values are silently discarded because the `addKid` function stores kids as `AddedKid = { name: string; age?: number }`, dropping the extra fields.
- **Fix:** Change the `AddedKid` type to match `KidFormValues` and pass all fields to `createKid` in `handleComplete`.

### 6. Settings page "Generate new code" button calls `generate` not `regenerate`

- **Severity:** High
- **Where:** `src/app/dashboard/settings/page.tsx` lines 261-276
- **Details:** The "Generate new code" button (shown when a code already exists) calls `generateFamilyCode` which is `api.familyCodes.generate`. The `generate` mutation checks if the user already has a code and returns the existing one if so (line 37-39 of `familyCodes.ts`). This means the "Generate new code" button is a no-op when a code exists -- it just returns the same code.
- **Fix:** Wire the "Generate new code" button to `api.familyCodes.regenerate` instead.

### 7. Dead `familyCodes` table in schema

- **Severity:** Medium
- **Where:** `convex/schema.ts` lines 249-255
- **Details:** The schema defines a `familyCodes` table with fields `userId`, `code`, `createdAt`. But the actual family code system stores codes on `users.familyCode`. No code references the `familyCodes` table. This is dead schema that wastes mental energy during code review.
- **Fix:** Remove the `familyCodes` table from the schema (requires a migration if data exists in prod).

### 8. No "0 profiles" handling in kid flow (partially handled)

- **Severity:** Medium
- **Where:** `src/app/play/page.tsx` lines 121-139
- **Details:** When a valid code is entered but there are 0 kid profiles, the page shows "No reader profiles yet -- Ask your parent to add your profile." This is correct UX, but it doesn't give the parent a link or instructions on HOW to add profiles. There's no deep link to the kid management page.
- **Fix:** Add a link like "Parents: tap here to add profiles" that goes to `/dashboard/kids` (or at least `/` to login).

### 9. PIN verification uses a Convex query (not mutation) -- unlimited attempts

- **Severity:** Medium
- **Where:** `convex/kids.ts` lines 123-133, `src/components/kid/ProfileSelector.tsx`
- **Details:** The `verifyPin` function is a query that does a simple string comparison. There's no rate limiting, no lockout after N failed attempts, and no logging. A persistent kid (or anyone with the family code) can brute-force a 4-digit PIN by trying all 10,000 combinations. The PIN is stored in plaintext.
- **Fix:** (a) Add an attempt counter with lockout (e.g., 5 attempts then 5-minute cooldown). (b) Consider hashing PINs. (c) At minimum, add client-side rate limiting.

### 10. Kid session never expires

- **Severity:** Medium
- **Where:** `src/app/play/home/page.tsx` lines 151-162, `src/components/kid/ProfileSelector.tsx` lines 93-105
- **Details:** The kid session is stored in localStorage (`safereads_kid_profile` and `safereads_family_code`) with no expiration. Once a kid logs in, they stay logged in forever unless they explicitly exit or localStorage is cleared. There's no session TTL.
- **Impact:** On shared devices, a kid's session persists indefinitely. If the parent changes the family code, the kid's old session still works because `/play/home` only checks for the existence of `safereads_kid_profile` in localStorage -- it doesn't re-validate the family code.
- **Fix:** Add a timestamp to the session data and re-validate the family code periodically (e.g., every 24 hours or on each app open).

### 11. Changing family code doesn't invalidate existing kid sessions

- **Severity:** Medium
- **Where:** `convex/familyCodes.ts` (`regenerate`), `src/app/play/home/page.tsx`
- **Details:** When a parent regenerates their family code, existing kid sessions (stored in localStorage with the old code) remain valid because the kid home page never re-validates the code. Only the `/play` entry page validates the code.
- **Fix:** The kid home page should periodically validate the stored family code against Convex, or the session should include a code validation check.

### 12. Profile deletion while kid is logged in is not handled

- **Severity:** Medium
- **Where:** `src/app/play/home/page.tsx`, `convex/kids.ts` (`remove`)
- **Details:** If a parent deletes a kid profile while that kid is logged in on another device, the kid's localStorage still holds the deleted profile's `_id`. Convex queries using that ID will return null, which could cause errors or blank states rather than a graceful redirect to profile selection.
- **Fix:** The kid home page should check if the profile still exists (via a Convex query) and redirect to `/play` if not found.

### 13. Kid profile editing while logged in shows stale data

- **Severity:** Medium
- **Where:** `src/app/play/home/page.tsx` lines 151-162
- **Details:** The kid home page reads the profile from localStorage (parsed once on mount). If the parent changes the kid's name, age, or color, the kid's session continues showing the old data until they log out and back in.
- **Fix:** Fetch the kid profile from Convex on mount (using the stored `_id`) and merge with localStorage data, or just use Convex as source of truth for display data.

### 14. `handleSwitchProfile` keeps family code, `handleLogout` removes both

- **Severity:** Low
- **Where:** `src/components/kid/KidNav.tsx` lines 37-46
- **Details:** "Switch" removes only `safereads_kid_profile` and navigates to `/play`, keeping the family code. "Exit" removes both and does a full page reload. This is actually correct behavior (switch = pick a different sibling, exit = fully leave). But the distinction isn't clear to a kid -- both buttons look similar and a kid might not understand the difference.
- **Fix:** Consider making "Switch" go directly to the profile selector (skipping the code entry), and make "Exit" more visually distinct (e.g., red color or a confirmation dialog).

### 15. No onboarding wizard -- just a simple 3-step flow

- **Severity:** Low
- **Where:** `src/app/onboarding/page.tsx`
- **Details:** Unlike SafeStudy which has a full onboarding wizard with kid settings, SafeReads has a minimal 3-step flow (Welcome, Add Kids, Done). It doesn't guide parents through setting up content sensitivity profiles, the family code, or the kid experience. This is a missed opportunity.
- **Fix:** Consider expanding the onboarding to include: (a) content sensitivity profile creation, (b) family code generation + display, (c) kid login instructions.

### 16. Multiple kids on different devices with same code -- works fine

- **Severity:** Low (not an issue)
- **Where:** N/A
- **Details:** Multiple kids CAN be logged in on different devices simultaneously with the same family code. Each selects their own profile. This is correct and expected behavior.

### 17. `ensureSafeReadsUser` doesn't set `onboardingComplete` for returning users

- **Severity:** Low
- **Where:** `convex/userSync.ts` line 66
- **Details:** The auto-provisioning fallback creates users with `onboardingComplete: false`. This means even a returning user who already completed onboarding on another app will be forced through the SafeReads onboarding again. This is actually probably desired behavior since SafeReads onboarding is app-specific, but it's worth noting.

### 18. `body.familyCode` accessed without TypeScript type safety

- **Severity:** Low (duplicate of #3, noting for completeness)
- **Where:** `convex/provisionUser.ts` line 104
- **Details:** `body.familyCode` is accessed but not defined in the body type. TypeScript doesn't catch this because the body is typed from `request.json()` which returns `any` effectively.

---

## Audit Checklist Answers

### Family Code

| # | Question | Answer |
|---|----------|--------|
| 1 | Auto-generated on signup? | **NO.** Only set if explicitly passed via provisioning. Critical gap. |
| 2 | Where do they generate one? | Settings page -> "Generate Family Code" button. Not obvious for new users. |
| 3 | Displayed prominently enough? | Yes, when it exists -- large mono font, green card, emerald styling. Good. |
| 4 | Easy to copy? | Yes -- Copy button with clipboard API and "Copied!" feedback. Good. |
| 5 | Can they regenerate? | **Broken.** Button calls `generate` which returns existing code. Should call `regenerate`. |
| 6 | Syncs from other apps? | Partially. Provisioning accepts familyCode param, but it depends on webhook sending it. |
| 7 | No family code + kid tries to enter? | Kid gets "That code doesn't match any family." Works correctly. |

### Kid Profile Creation

| # | Question | Answer |
|---|----------|--------|
| 8 | Where do parents create profiles? | Dashboard -> Kids tab (bottom nav) or during onboarding. |
| 9 | Required fields? | Only `name`. Age, color, PIN, reading level are all optional. |
| 10 | Onboarding wizard guides them? | Minimally -- step 2 lets them add kids but drops color/PIN/readingLevel data. |
| 11 | Create from kid login page? | **No.** Kid login page says "Ask your parent" with no link to parent setup. |
| 12 | 0 profiles + valid code? | Shows "No reader profiles yet" message with a "Try a different code" button. Correct but could link to parent setup. |

### Kid Login Flow

| # | Question | Answer |
|---|----------|--------|
| 13 | Invalid code? | Shows error: "That code doesn't match any family." with shake animation. Good. |
| 14 | Single profile auto-select? | **No.** Even with 1 profile, still shows the profile picker. Minor UX friction. |
| 15 | Wrong PIN handling? | Shows "Wrong PIN. Try again." Clears PIN. No lockout, no attempt limit. |
| 16 | What's stored in localStorage? | `safereads_family_code` (string) and `safereads_kid_profile` (JSON: _id, name, age, color). No sensitive data. Adequate security for kid use case. |
| 17 | Switch profiles without re-entering code? | **Yes.** "Switch" button in nav removes profile but keeps code, goes to `/play` which detects saved code and shows profile picker. Good. |
| 18 | Parent deletes profile while kid logged in? | **Not handled.** Stale localStorage, Convex queries will return null. Could cause blank states or errors. |

### Session Management

| # | Question | Answer |
|---|----------|--------|
| 19 | Session duration? | **Infinite.** No TTL on localStorage. |
| 20 | Exit/logout for kids? | **Yes.** "Exit" button in KidNav clears localStorage and redirects to `/play`. Good. |
| 21 | Close and reopen browser? | Auto-redirects to `/play/home` (localStorage persists). |
| 22 | Multiple kids, different devices? | Works fine. Each device has its own localStorage. |

### Edge Cases

| # | Question | Answer |
|---|----------|--------|
| 23 | Parent has account, no kid profiles? | Dashboard works fine. Kids page shows "Add Your First Child" prompt. Family code section in settings shows "Generate Family Code" button. |
| 24 | Subscription expires while kid reading? | **Kid keeps full access.** No subscription check in kid flow. Critical gap. |
| 25 | Parent changes family code while kid using old one? | **Kid's session remains valid.** Old code in localStorage is never re-validated after initial login. |
| 26 | Kid profile edited while kid logged in? | **Stale data.** Profile data is read from localStorage once on mount, not refreshed from Convex. |

### First-Time Experience

| # | Question | Answer |
|---|----------|--------|
| 27 | Clear path from signup to kid reading? | **No.** Multiple hidden steps. See recommended flow below. |
| 28 | How many steps? | **Too many.** See breakdown below. |
| 29 | Dead ends or confusing states? | Yes -- after onboarding, no mention of family code or kid experience. Parent must discover Settings -> Family Code on their own. |

---

## Current First-Time Flow (signup to kid reading)

1. Sign up on getsafefamily.com (select SafeReads)
2. Stripe checkout + payment
3. Webhook provisions user in SafeReads
4. Login at getsafereads.com
5. Onboarding: Welcome -> Add Kids (name + age only) -> Done
6. Land on dashboard -- **no mention of family code**
7. Parent must discover: Settings -> "Generate Family Code" button
8. Parent must generate the code
9. Parent must somehow know to go to `/play` on kid's device
10. Parent must give kid the code
11. Kid enters code on `/play`
12. Kid selects profile
13. Kid can now browse books

**Total steps from signup to kid reading: 13**
**Steps that are non-obvious or hidden: 3 (steps 7, 8, 9)**

---

## Recommended Ideal First-Time Flow

1. Sign up on getsafefamily.com (select SafeReads)
2. Stripe checkout + payment
3. Webhook provisions user in SafeReads **with auto-generated family code**
4. Login at getsafereads.com
5. Onboarding Step 1: Welcome to SafeReads
6. Onboarding Step 2: Add Your Kids (full form: name, age, color, PIN, reading level)
7. Onboarding Step 3: **Your Family Code** -- display the code prominently, explain that kids go to `getsafereads.com/play`, offer to copy or share
8. Onboarding Step 4: You're All Set -- "Start searching books" + "Set up your kid's device"
9. Parent gives kid the code (or enters it on kid's device)
10. Kid enters code, selects profile, starts reading

**Total steps: 10**
**Hidden steps: 0**

---

## Priority Fix Order

1. **Auto-generate family code on provisioning** (Critical, #1) -- immediate fix
2. **Add subscription check to kid flow** (Critical, #2) -- revenue protection
3. **Fix "Generate new code" button** (High, #6) -- calls wrong mutation, quick fix
4. **Fix onboarding to pass full kid data** (High, #5) -- data loss bug
5. **Add family code step to onboarding wizard** (High, #4) -- UX gap
6. **Add familyCode to provisionUser body type** (High, #3) -- type safety
7. **Add session re-validation** (Medium, #10, #11) -- security improvement
8. **Handle deleted profile gracefully** (Medium, #12) -- error prevention
9. **Add PIN attempt limiting** (Medium, #9) -- security hardening
10. **Remove dead familyCodes table** (Medium, #7) -- code hygiene
11. **Improve 0-profiles message** (Medium, #8) -- UX polish
12. **Refresh profile data from Convex** (Medium, #13) -- data freshness

---

*Generated by Claude Opus 4.6 on April 1, 2026*
