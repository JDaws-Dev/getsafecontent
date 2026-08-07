# CODEX Evaluation And Launch Todo Plan

This document captures Codex's independent evaluation and recommended launch work for the Safe Family suite. It is intended to stay separate from existing Claude Code notes, progress logs, and implementation summaries.

## Scope

Reviewed:
- `sites/marketing`
- `apps/safetunes`
- `apps/safetube`
- `apps/safereads`

Focus areas:
- Account creation
- Login
- Forgot/reset password
- Provisioning and entitlement sync
- Core feature completeness
- UI/UX quality
- Launch readiness

## High-Level Assessment

Current rough scores after verification:
- Feature set: `8/10`
- UI/UX: `8/10`
- Operational reliability: `6.5/10`
- Launch readiness: `7/10`

Summary:
- The suite is feature-rich and directionally strong.
- UI cohesion across the products is good.
- The biggest previously identified auth issues have been reduced.
- The main remaining launch risks are end-to-end verification, quality gates, and operational observability.

## Verified Status Of Earlier Findings

### Fixed / No Longer Open

- Central login debug leakage
  - Verified fixed in the current repo.
  - Plaintext password logging, hash logging, and debug-heavy login responses have been removed from the central login flow.

- Password reset silent-success behavior
  - Verified improved in the current repo.
  - The reset-request flow now fails if the email send action fails instead of always returning success.

- SafeReads revocation / inactive-state handling
  - Verified fixed in the current repo.
  - SafeReads provisioning now preserves `inactive` and `expired`.
  - The marketing webhook no longer skips SafeReads revocation.

- Cross-app password sync as a required launch feature
  - Re-evaluated.
  - The dedicated sync API routes were removed, and the apps are currently using central JWT auth rather than relying on local cross-app password propagation.
  - This is not an open P1 launch blocker if JWT-only auth is the intended architecture.

### Still Open

- The biggest remaining auth risk is verification, not a known code defect.
  - The central auth paths now need repeated end-to-end confirmation across real account types and app entry points.

- Residual auth cleanup in the active marketing flow has been addressed on the `codex-auth-cleanup` branch.
  - Removed the leftover forgot-password `_debug` response payload.
  - Removed the dead `trigger-sync` call from the marketing reset-password page.
  - Removed the password-reset `emailId` field from the public response.
  - Removed the unused `_debug` payload from the internal credential helper.
  - Fixed all three app auth contexts so forgot-password now respects backend failures instead of always advancing on non-`OAUTH_ONLY` responses.
  - Fixed the login-page reset shortcuts in all three apps so they no longer show false success on delivery failure.
  - Normalized reset-email storage in SafeTube and SafeReads forgot-password flows to match the submitted email.
  - Updated stale E2E language around password "sync" to reflect central JWT auth, and added coverage for reset-email delivery failure handling on all three apps.
  - Fixed SafeTube login to correctly handle `PASSWORD_RESET_REQUIRED` and `OAUTH_ONLY`, matching SafeTunes and SafeReads.
  - Added Playwright coverage for login edge states across all three apps: `OAUTH_ONLY`, `PASSWORD_RESET_REQUIRED`, `INCOMPLETE_SIGNUP`, and `NOT_ENTITLED`.
  - Fixed all three app login screens so `INCOMPLETE_SIGNUP` enters the one-time reset/setup flow instead of falling back to a generic error.

## Feature Evaluation

### SafeTunes

Strengths:
- Richest feature surface of the three apps
- Parent/kid separation is clear
- Family code child access exists
- Onboarding, admin dashboard, requests, and Apple Music integration are all present

Weaknesses:
- Parent dashboard experience is crowded
- Large feature surface increases brittleness
- More lint/runtime-risk patterns in core components than the other apps

Assessment:
- Strong product depth
- Highest complexity and highest maintenance risk

### SafeTube

Strengths:
- Clearest information architecture
- Parent dashboard is easier to reason about than SafeTunes
- Family-code kid flow is central and visible
- Strong whitelist-first product story
- AI review/search positioning is a clear differentiator

Weaknesses:
- Still depends on the same central auth weaknesses
- Needs stronger verification of kid-flow and account lifecycle edge cases

Assessment:
- Cleanest overall app structure
- Best candidate for the suite’s reference UX

### SafeReads

Strengths:
- Most polished parent dashboard feel
- Good quick actions and clear dashboard hierarchy
- Search, scan, advisor/chat, kids, and wishlist concepts are cohesive
- Settings and account surfaces are more modern than the other apps

Weaknesses:
- Shared account and entitlement edge cases are weaker than the UI suggests
- Revocation handling is currently unreliable
- Some account flows still feel split between local app and central Safe Family account

Assessment:
- Best dashboard UX
- Needs backend/account hardening more than feature expansion

## UI/UX Evaluation

### What Works Well

- Strong brand cohesion across marketing and the three products
- Each app has a distinct but related visual identity
- SafeTube has the best navigation and information architecture
- SafeReads has the strongest parent dashboard presentation
- SafeTunes has high product richness and strong niche resonance

### Main UI/UX Risks

- Shared account boundaries are visible to users
  - central auth vs local app state
  - upgrade vs inactive vs expired handling
  - settings sometimes point users out to broader Safe Family surfaces

- SafeTunes has the most dashboard complexity
  - powerful, but easier to overwhelm first-time users

- State UX is inconsistent
  - loading
  - inactive
  - expired
  - password reset edge cases
  - provisioning delay states

## Launch Todo Plan

## P0 Verification

- Verify password reset email delivery end-to-end.
  - Run repeated real-world checks against the current repo/deployment:
    - existing password user
    - incomplete signup user
    - Google-only user
    - nonexistent email
  - Confirm the UI behavior matches backend behavior in each case.
  - Confirm each app now surfaces delivery failure correctly instead of navigating users into a dead-end reset flow.

- Verify login end-to-end across real account types.
  - Cover:
    - valid password account
    - invalid password
    - Google-only account
    - incomplete-signup account
    - password-reset-required account
  - Confirm the HTTP responses and frontend copy are aligned.
  - The mocked UI coverage for the main auth edge states now exists; what remains is live end-to-end verification against real accounts.

- Verify JWT-only auth assumptions across the three apps.
  - Confirm each app is relying on central token verification rather than local password state.
  - Confirm reset-password success in marketing does not depend on any removed sync endpoint.
  - Confirm app settings and login flows do not still imply cross-app password propagation.
  - Rename or split legacy E2E files whose filenames still imply password "sync" when the architecture is central JWT auth.

## P1 Subscription / Provisioning Reliability

- Unify provisioning logic in one place.
  - Consolidate grant/revoke logic into one server-side helper in marketing.
  - Make Stripe webhook, promo signup, and admin provisioning all use the same path.
  - Standardize payloads sent to app backends:
    - `email`
    - `passwordHash | null`
    - `subscriptionStatus`
    - `entitledToThisApp`
    - `isOAuthUser`
    - `stripeCustomerId`
    - `subscriptionId`

- Harden central user creation during checkout/webhook.
  - Ensure central account creation/update is deterministic for:
    - password signup
    - Google signup
    - promo signup
    - direct Stripe/webhook-only entry paths
  - Add idempotency checks by email and Stripe subscription ID.

- Add provisioning observability.
  - Record structured events for:
    - create
    - grant
    - revoke
    - password sync
    - onboarding setup
    - failed provisioning
  - Surface them in an admin UI or at minimum a queryable table.

## P1 Auth UX Consistency

- Normalize inactive/expired/canceled handling across all apps.
  - Define one behavior matrix:
    - `inactive`: valid account, no entitlement, show upgrade prompt
    - `expired` / `canceled` / `past_due`: block with billing recovery CTA
    - `trial`: active with trial messaging
  - Apply consistently in SafeTunes, SafeTube, and SafeReads.

- Tighten forgot/reset flow copy.
  - Use the same structure and wording across apps.
  - Make Google-only behavior explicit and route users back to Google login cleanly.

- Add explicit post-reset expectation messaging.
  - After reset success, say the Safe Family password has been updated.
  - If cross-app password sync is not part of the architecture anymore, do not imply that other apps were updated locally.

## P1 Testing

- Add end-to-end account lifecycle coverage.
  - Cover:
    - signup with password
    - signup with Google
    - login success
    - OAuth-only rejection
    - forgot password
    - reset password
    - upgrade from single app to bundle
    - downgrade from bundle to one app
    - cancellation / entitlement removal
    - legacy user fallback

- Add backend integration tests for provisioning.
  - Test central user states:
    - no auth account
    - password account
    - OAuth account
    - inactive user
    - existing local user with conflicting password
  - Assert correct provisioning and revocation results per app.

## P2 SafeTunes

- Simplify dashboard information architecture.
  - Reduce primary-tab complexity.
  - Move lower-frequency or advanced actions behind secondary UI.
  - Keep the main parent mental model simple.

- Reduce codebase noise and dead variants.
  - Remove or archive backup and old page files not meant for production use.
  - Keep preview artifacts out of the core shipped experience where possible.

- Stabilize player/admin surfaces flagged by lint.
  - Prioritize hook-order, dependency, and effect-state issues in core components.
  - Focus especially on player behavior and auth-gated dashboard surfaces.

## P2 SafeTube

- Use SafeTube as the IA model for the suite.
  - It has the clearest route and dashboard structure.
  - Reuse its simplicity as a benchmark for the other apps.

- Validate family-code kid flow thoroughly.
  - Test:
    - invalid code
    - no profiles
    - paused access
    - trial expiry
    - returning kid state

- Review hidden auto-provisioning behavior.
  - Verify local-user auto-creation does not create loops or duplicate records.
  - Verify onboarding redirects do not fire unexpectedly.

## P2 SafeReads

- Preserve the dashboard UX, fix account edges.
  - Keep the dashboard patterns.
  - Focus work on auth gating, settings/account consistency, and entitlement handling.

- Improve search/scan reliability messaging.
  - Add clear fallback guidance for:
    - scan failure
    - no book match
    - retry path
    - manual search fallback

- Fix current app-shell/runtime-risk issues.
  - Address state-in-effect and provider-level issues in auth context, reset password, and app shell providers.

## P2 Marketing / UI-UX

- Finish Google OAuth or remove incomplete affordances.
  - If Google login is user-facing, complete the provisioning and entitlement path.
  - If not, remove or de-emphasize incomplete entry points.

- Create first-class marketing `terms` and `privacy` pages.
  - Stop depending on app-specific legal pages from the shared signup flow.

- Improve launch-state trust cues.
  - Clarify:
    - one account for all Safe Family apps
    - where billing is managed
    - where support lives
  - Reduce product-boundary confusion.

- Standardize empty/loading/error states.
  - Use consistent CTA placement, copy tone, and visual treatment across the three apps.

## P3 Codebase / Ops Cleanup

- Exclude generated output from lint.
  - Remove `.vercel/output`, build artifacts, and similar generated files from lint scope.
  - Restore signal to the quality gate.

- Make each app pass meaningful `lint` and `build`.
  - Resolve existing known failures per app.
  - Treat quality gates as launch blockers for account/auth surfaces.

- Add a launch operations dashboard.
  - Track at minimum:
    - signup success rate
    - login failure rate
    - reset email delivery success
    - provisioning failures by app
    - entitlement mismatch count
    - Stripe webhook failures

## Suggested Execution Order

1. Final auth cleanup (`_debug` leak, stale sync call, reset-path verification)
2. End-to-end account lifecycle tests
3. Provisioning consolidation and observability
4. SafeTunes dashboard simplification and runtime cleanup
5. SafeReads account-edge cleanup
6. Marketing legal/OAuth/trust UX polish
7. Quality gate cleanup and launch dashboard

## Definition Of Done For Launch

- No sensitive auth data or debug-only account signals in auth responses
- Password reset works reliably for intended account types and fails clearly when it cannot complete
- Subscription downgrade/cancel removes access correctly in all apps
- Signup, login, forgot password, reset password, onboarding, upgrade, and cancellation are covered by E2E tests
- Each app passes meaningful build and lint checks
- Operations can detect and inspect provisioning failures quickly

---

# Codex Notes — 5-App Platform Audit

Date: 2026-05-27

Scope:
- `sites/marketing`
- `apps/safetunes`
- `apps/safetube`
- `apps/safereads`
- `apps/safeseek` / SafeStudy
- `apps/safespark`

This section updates the older 3-4 app launch notes above. The platform now presents itself as a 5-app Safe Family suite, but code, pricing, copy, provisioning, admin tools, and schemas are not fully aligned to that reality yet.

## Executive Summary

The strongest product insight is still clear: parents want real YouTube, real Apple Music, real books, safe search, and now safe AI creation with parent-controlled boundaries. The individual products have real depth, especially SafeTunes, SafeTube, SafeReads, and SafeStudy.

The main launch risk is no longer "do we have enough features?" It is consistency and operational trust:
- public copy promises "all 5 apps"
- multiple checkout/provisioning/success/admin paths still treat the suite as 4 apps
- hardcoded admin fallback keys and tracked build/signing artifacts create security exposure
- quality gates are not reliable enough to prove launch readiness
- kid entry, pricing, CTA language, and app naming drift across products

Do not spend first effort on visual polish. Fix platform consistency, secrets/artifact hygiene, provisioning, and quality gates first.

## P0 Platform Consistency

- Resolve the 4-app vs 5-app contradiction everywhere.
  - Marketing hero and sticky CTA now say 5 apps / `$14.99`.
  - Older captured marketing page and several code paths still say 4 apps / `$9.99`.
  - `AppSelector`, `AccountForm`, `success/page`, `setup/page`, admin pages, promo signup, onboarding, checkout session parsing, subscription preview/update routes, email copy, blog CTAs, and app landing pages all need one canonical plan model.

- Decide SafeSpark pricing and entitlement semantics.
  - SafeSpark landing says free early access / no card.
  - Marketing sells SafeSpark as part of the paid 5-app `$14.99` bundle.
  - `lib/provisioning.ts` comments describe SafeSpark as excluded from the `$9.99` base bundle because of variable AI cost.
  - The launch offer must be explicit: included, add-on, or early-access free.

- Create one canonical app registry.
  - Current code repeats app lists across marketing pages, Convex functions, Next API routes, webhooks, admin pages, account pages, onboarding, newsletter copy, and tests.
  - The app list should include ids, display names, domains, Convex endpoint, price eligibility, accent color, and whether the app is in the current public bundle.

## P0 Security / Repo Hygiene

- Expand `.gitignore`.
  - Current root `.gitignore` only ignores `.vercel` and `.playwright-mcp`.
  - Ignore `.env*` except examples, `.DS_Store`, `.next`, `dist`, coverage, Playwright reports, Android build outputs, APK/AAB/idsig files, and local automation folders.

- Remove tracked sensitive/build artifacts.
  - Tracked artifacts found include `apps/safeseek/.env.prod`, Android keystores, APKs, AABs, and build output bundles.
  - Rotate any key that was committed or documented in source/history.

- Remove hardcoded admin fallback keys.
  - Hardcoded admin fallback keys exist in SafeTunes, SafeTube, SafeReads, SafeSpark, and sync/provision/admin Convex functions.
  - Admin auth should fail closed when env vars are missing.
  - Prefer header auth over query-string keys for POST/admin operations.

- Move lifetime promo code validation server-side only.
  - Client-side code exposes `DAWSFRIEND` and `DEWITT`.
  - UI may show "valid code" affordance, but the list of valid lifetime codes should live only in server/Convex state with usage limits/audit logs.

## P0 Provisioning / Auth

- Make every provisioning path handle all 5 apps deliberately.
  - Some routes support `safespark`; many still validate only `safetunes`, `safetube`, `safereads`, `safestudy`.
  - Promo signup currently grants the 4-app set.
  - Admin provision/retry/delete/grant-lifetime routes are mostly 4-app only.
  - Success/setup/account pages still default to 4 apps in several places.

- Fix TypeScript/domain model drift.
  - Checkout route builds a 5-app list by casting `safespark` into a 4-app type.
  - This hides real entitlement errors.

- Consolidate central account schema ownership.
  - Marketing central schema supports 5 apps.
  - SafeReads schema still contains older central-account fields for only 3 apps.
  - Decide one source of truth and remove/quarantine stale central-account logic in app schemas.

- Add failed-provision recovery paths for SafeSpark.
  - Existing failed-provision/admin routes are mostly 4-app typed.
  - SafeSpark must appear in failed provisioning dashboards, retry tools, and user detail views if it is sold.

## P0 Quality Gates

Current lint status from audit:
- Marketing: lint scans `.vercel/output`, creating thousands of generated warnings plus real source errors.
- SafeReads: 24 lint errors.
- SafeTunes: 280 lint errors.
- SafeSpark: 36 lint errors and lint also scans `.claude/worktrees`.
- SafeSeek/SafeStudy: ESLint v9 config missing.
- SafeTube: `eslint` command missing.

Required work:
- Add shared ignore patterns for generated/build/worktree folders.
- Fix or explicitly downgrade noisy new React compiler lint rules if they are not part of the launch bar.
- Make `npm run lint` meaningful and passing in each app.
- Add a top-level quality command once the monorepo is real.

## P1 Marketing / Sales

- Lead cold traffic with one wedge, not the whole bundle.
  - SafeTube is the clearest paid-acquisition wedge: YouTube without the algorithm.
  - Bundle should be the upsell after trial start, in onboarding, and in lifecycle email.

- Add above-the-fold proof of the actual product.
  - Current bundle page is conceptually strong but not inspectable enough.
  - Add 5 compact product screenshots or a "see it working" strip before testimonials.

- Standardize CTA language.
  - Current verbs include "Start Free Trial", "Get All 5 Apps", "Get Started", "Get 7 Days Free", "Start Protecting Today", and app-specific price CTAs.
  - Recommended primary CTA: `Start free trial`.
  - Secondary app CTA: `See how it works`.

- Improve testimonial trust.
  - Current reviews are plausible but too similar in rhythm.
  - Add real customer count, one qualified testimonial, real screenshots/video, and a founder note.

- Clarify legal/compliance claims.
  - Claims like COPPA compliant, data encrypted, no data selling, no bypass, and "nothing slips through" need supporting policy and product behavior.
  - Avoid absolute safety claims where AI/API systems can fail.

## P1 UX / Design System

- Create a shared family-code entry component.
  - SafeReads has the strongest kid entry pattern.
  - Reuse segmented 6-character input, friendly helper text, app-specific icon/color, parent-login escape hatch, and consistent validation.

- Suppress cookie/marketing consent UI on kid routes.
  - SafeTunes kid login screenshot shows cookie controls.
  - Kid routes should not ask children to consent to tracking.

- Standardize kid route naming.
  - SafeTunes: `/play`
  - SafeTube: `/play`
  - SafeReads: `/read`
  - SafeStudy: mixed `/play`, `/search`, root behavior
  - SafeSpark: `/start` then `/make`
  - Document the convention and use consistent nav labels.

- Standardize primary CTA style.
  - Product accent colors can differ, but primary conversion buttons should feel like the same family.

- Add shared avatar/profile picker.
  - Several profile pickers use similar or identical generic avatars.
  - Kids need visual distinction by color/icon.

## P1 App Notes

### SafeTunes

Strengths:
- Deepest product surface.
- Strong music-specific controls: album/song approval, requests, artwork hiding, Apple Music integration.
- Strong niche positioning for families who want discernment rather than blanket blocking.

Needs:
- Remove cookie banner from kid routes.
- Reduce landing-page CTA/nav clutter.
- Add sticky mobile CTA.
- Clean stale/unused components and lint failures.
- Make first-run path explicit: create kid profile -> connect Apple Music -> approve first album/song -> kid can play.

### SafeTube

Strengths:
- Clearest single-app wedge.
- "No algorithm, approved channels/videos only" is easy to understand.
- Good candidate for acquisition landing page.

Needs:
- Improve kid family-code screen; grey disabled button reads as broken.
- Make "Safe Family" cross-link visible or remove it.
- Keep CTA copy consistent with the suite.
- Ensure channel/video request and parent review flows are included in E2E.

### SafeReads

Strengths:
- Strongest visual identity.
- Best kid code-entry experience.
- Book + reading UX feels differentiated.

Needs:
- Remove duplicate reading CTAs.
- Replace ugly fallback covers with tasteful typography cards.
- Dedupe book/search/genre results.
- Fix bottom-nav overlap and reader distraction.
- Strip leaked Gutenberg/page markers.
- Align older schema/account fields with central 5-app model.

### SafeStudy (`apps/safeseek`)

Strengths:
- Strong market opportunity: safe search + tutor + research.
- Best modern hero design among app landing pages.
- Parent dashboard is clean and scannable.

Needs:
- Finish SafeSeek -> SafeStudy rename at code/UI/package level.
- Render AI markdown instead of showing raw `**bold**` / headings.
- Keep `/play` or another stable kid route rather than blurring root/parent/kid entry.
- Upgrade kid family-code entry to shared component.
- Fix ESLint config.

### SafeSpark

Strengths:
- Strong new category: safe AI maker, not just AI answers.
- Clear future-skill positioning.
- Parent dashboard has useful usage caps and family-code model.

Needs:
- Resolve paid vs free early-access contradiction.
- Align Clerk/family-code/federated auth story with the rest of Safe Family.
- Remove hardcoded admin key fallback.
- Exclude `.claude/worktrees` from lint.
- Make version rollback/disaster recovery discoverable in `/make`.
- Add launch metrics around AI usage cost, blocked topics, image transforms, and failed generations.

## P2 Engineering / Monorepo

- Add a real top-level package/workspace setup.
  - Current repo has separate app installs and no visible top-level package manifest in the audit.
  - Shared UI, shared app registry, shared auth types, shared lint config, and shared scripts should live at the root.

- Move repeated UI into `packages/ui`.
  - Family code input.
  - Profile picker.
  - Password strength.
  - App badges/cards.
  - Empty/loading/error states.
  - Trial/upgrade prompts.

- Add shared observability.
  - Track trial start, activation, first kid profile, first approved item, first kid session, failed provisioning, failed webhook, and entitlement mismatch.

- Add app-specific activation metrics:
  - SafeTunes: first Apple Music connection, first approved song/album, first kid play.
  - SafeTube: first approved channel/video, first kid watch.
  - SafeReads: first analysis, first child read/book request.
  - SafeStudy: first successful search, first tutor session, first blocked/requested topic.
  - SafeSpark: first generated project, first saved/shared project, first blocked unsafe prompt.

## Suggested Next Work Order

1. Security/repo hygiene: `.gitignore`, remove tracked artifacts, rotate exposed keys, fail closed on missing admin env.
2. Canonical app registry and plan model: one source for 4-app legacy vs 5-app launch behavior.
3. Provisioning/auth updates for SafeSpark across checkout, webhook, promo, admin, success, setup, account, and failed-provision flows.
4. Quality gates: fix lint config/ignores, make each app lintable.
5. Shared family-code UI and kid-route cleanup.
6. Marketing offer cleanup: one CTA language, one price model, stronger product proof.
7. App-specific UX fixes, starting with SafeStudy naming/markdown and SafeReads reader/search polish.

---

# Codex Notes - 5-App Platform Audit (2026-05-27)

This dated note captures the deeper all-app audit so a later session can resume without rediscovering the same issues. Scope reviewed: `apps/safetunes`, `apps/safetube`, `apps/safereads`, `apps/safeseek` / SafeStudy, `apps/safespark`, and `sites/marketing`.

## Executive Read

The product direction is strong. SafeTube is the clearest acquisition wedge, SafeReads has the strongest brand/design identity, SafeStudy has a compelling education angle, SafeTunes appears most feature-rich, and SafeSpark adds a fresh creative promise. The main launch blocker is platform consistency, not lack of product surface.

The codebase is currently split between old 3-app, 4-app, and new 5-app assumptions. Marketing copy says "all 5" in some places, signup and entitlement flows still say or validate "all 4" in others, and app schemas/provisioning code do not share a single source of truth. That creates a serious risk that paid users buy one promise and receive a different account state.

## P0 Revisit First

1. Decide the current public offer in one sentence.
   - Current conflict: marketing hero/code has "Get All 5 Apps - $14.99/mo", but screenshots and signup components still show "Four apps", "$9.99", or "all 4 apps".
   - Pick one launch truth before editing: either "5-app family bundle at $14.99/mo" or "SafeTube-first trial with bundle upsell".

2. Centralize the app registry.
   - Create one shared list for `safetunes`, `safetube`, `safereads`, `safestudy`, `safespark`.
   - Use it for pricing copy, signup selection, provisioning, success/setup pages, account pages, admin tools, and checkout metadata.
   - Avoid scattered literal unions like `type AppName = "safetunes" | "safetube" | "safereads" | "safestudy"` because SafeSpark is already being forced through casts.

3. Fix security hygiene before launch or paid traffic.
   - `.gitignore` is currently too small and only ignores `.vercel` plus `.playwright-mcp/`.
   - Tracked sensitive/build artifacts were found, including `apps/safeseek/.env.prod`, Android keystores, APK/AAB/idsig outputs, and generated build directories.
   - Hardcoded admin fallbacks exist across Convex/admin code. Rotate anything that has been committed.
   - Stop passing admin keys in query params where possible.
   - Remove or protect lifetime promo codes hardcoded in both client and server code.

4. Restore quality gates app by app.
   - `apps/safetube`: `npm run lint` fails because `eslint` is not installed.
   - `apps/safeseek`: `npm run lint` fails because ESLint v9 cannot find `eslint.config.*`.
   - `apps/safereads`: lint has 24 errors / 36 warnings.
   - `apps/safetunes`: lint has 280 errors / 35 warnings.
   - `apps/safespark`: lint has 36 errors / 32 warnings and is linting `.claude/worktrees`.
   - `sites/marketing`: lint has 72 errors / 2557 warnings and is linting `.vercel/output`.

5. Stop checking generated/vendor output.
   - Exclude `.next`, `.vercel/output`, mobile build outputs, APK/AAB/idsig files, caches, and screenshots unless intentionally retained as docs.

## P1 Platform Consistency

Marketing currently behaves like several launch eras layered together. Specific areas to revisit:

- `sites/marketing/src/components/landing/Hero.tsx`: newer 5-app offer appears here.
- `sites/marketing/src/components/landing/AppCards.tsx`: lists 5 apps.
- `sites/marketing/src/components/landing/PricingSection.tsx`: still contains legacy app price IDs and older monthly framing.
- `sites/marketing/src/components/signup/AppSelector.tsx`: still models only four apps and says "All 4 apps".
- `sites/marketing/src/components/signup/AccountForm.tsx`: says "7 days free - all 4 apps".
- `sites/marketing/src/app/signup/page.tsx`: has unified plan handling, but selected app state is still four-app oriented.
- `sites/marketing/src/app/success/page.tsx`, `setup`, `account`, admin provisioning, onboarding setup, promo signup, and auth password sync need a 5-app pass.
- `sites/marketing/src/app/api/checkout/route.ts`: supports `plan: "unified"` but still has a 4-app `AppName` union and casts `safespark`.
- `sites/marketing/src/lib/provisioning.ts`: has both `ALL_APPS` and `ALL_APPS_WITH_SPARK`, which makes SafeSpark feel bolted on.

Recommendation: make marketing/account/provisioning read from one app catalog file with id, display name, route, icon, price eligibility, entitlement key, and provisioning target. Then remove local app lists.

## P1 Sales And Marketability

The bundle is easier to sell after a parent believes one app solves an urgent pain. The strongest cold wedge is SafeTube:

- The pain is obvious: YouTube safety, recommendation spirals, parental control frustration.
- The promise is concrete: a parent dashboard that actually works.
- The app is easier to demonstrate in screenshots and ads than a five-app suite.

Recommended funnel:

1. Lead with SafeTube as the primary paid acquisition page.
2. Offer "includes the full GetSafeContent suite" as the expansion value.
3. Use the all-5 bundle as an upsell and retention story, not the first thing every cold visitor must understand.
4. Keep cross-app cards below the first proof section.
5. Add real product screenshots above the fold, especially parent dashboards and child-safe experiences.

Current marketing strengths:

- The category is emotionally legible for parents.
- Product names are memorable.
- App pages have better-than-average positioning.
- SafeReads and SafeStudy have distinctive voices.

Current marketing gaps:

- No single pricing truth.
- Not enough proof above the fold.
- Too few real screenshots in the main purchase path.
- Generic bundle framing can dilute the sharpness of each app.
- Needs testimonials, concrete safety claims, parent activation steps, and a founder story or trust section.

## P1 UI And UX Findings

General:

- Parent-facing pages are visually stronger than kid login/entry screens.
- Kid entry screens should feel warm, simple, and safe. Several currently feel sterile or disabled until input is entered.
- CTAs need consistent verbs: start trial, create account, open dashboard, continue setup.
- Cookie banners and marketing chrome should not appear on child-facing login/play routes.
- Mobile sticky CTAs are needed on long sales pages.

SafeTunes:

- Richest feature surface and likely highest complexity risk.
- Purple music branding is coherent, but several pages feel long and heavy.
- Kid login screenshot showed cookie banner over the child flow.
- Needs cleanup of stale components, unused code, hook issues, and admin fallbacks.
- Add stronger first-screen product proof and clearer parent dashboard CTA.

SafeTube:

- Clearest market wedge.
- Hero positioning is strong: "YouTube Parental Dashboard That Actually Works".
- Red/orange visual system fits the category.
- Kid login is too sterile and disabled-button-heavy; improve warmth, placeholder contrast, and visual feedback.
- Use SafeTube as the main acquisition funnel candidate.

SafeReads:

- Strongest brand identity: parchment/book styling, serif typography, and gentle reading mood.
- Book search/results need product polish: duplicate read CTAs, placeholder Gutenberg covers, duplicate results, raw labels such as `[page i]` or `Free -- Read Now`.
- Reader UX should avoid bottom nav overlap and distraction.
- Keep the distinctive visual identity, but tighten the actual reading workflow.

SafeStudy / SafeSeek:

- Strong education wedge: safe search plus tutor.
- Naming must be cleaned up. Code/package/routes still say SafeSeek in places while product appears as SafeStudy.
- Parent dashboard appears promising from docs/screens.
- Kid search entry should feel more inviting and less like a grey disabled form.
- AI answers should render markdown/lists cleanly, with age-appropriate formatting and citations/provenance where possible.

SafeSpark:

- Potentially exciting, but least integrated into the suite.
- Public page says free early access/no card while marketing bundle says included in paid all-5 subscription.
- Needs clear positioning: creative AI sandbox, story/game builder, or kid-safe coding lab.
- Needs a reliable "go back to last working version" affordance and stronger parent safety/onboarding story.
- Auth/provisioning should be brought into the same suite model instead of remaining separate.

## P1 Data And Auth Drift

Schema/provisioning drift is a launch risk:

- `sites/marketing/convex/schema.ts` appears to support five apps in central users/coupons/provisioning.
- `apps/safereads/convex/schema.ts` has an embedded central users entitlement shape that only covers three apps.
- `apps/safetube/convex/schema.ts` includes SafeTunes-looking fields such as `appleMusicAuthorized` and `globalHideArtwork`.
- `apps/safespark/convex/schema.ts` uses a Clerk-like model plus synthetic `marketing:<email>` identities and a separate family-code model.

Recommendation: define one entitlement contract and one provisioning result format. Every app should consume that contract rather than copying central account fields locally.

## P2 Codebase Cleanup

- Standardize scripts across all apps: `lint`, `typecheck`, `build`, and a minimal smoke test.
- Add root-level orchestration once apps are moved into the intended monorepo structure.
- Remove generated files and binary build outputs from git.
- Create root `.gitignore` coverage for Node, Next, Vite, Convex, mobile builds, logs, caches, local envs, and screenshots.
- Move secret-like values to env vars and document the required env names.
- Stop linting `.vercel/output`, `.next`, `.claude/worktrees`, and generated Convex outputs where inappropriate.
- Decide whether screenshots are documentation artifacts. If yes, move them under a named docs audit folder.

## Suggested Next Session Checklist

1. Create or update a bead issue for "P0: unify 5-app app registry, pricing, signup, provisioning".
2. Create or update a bead issue for "P0: security cleanup - secrets, env files, mobile signing artifacts, gitignore".
3. Pick the launch offer and write it at the top of this file before implementation starts.
4. Implement the shared app catalog in marketing.
5. Replace all four-app signup/provisioning/success/account references with catalog-driven logic.
6. Run one golden path: signup -> checkout or promo -> success -> setup -> open each app entitlement.
7. Then do app-by-app UX polish, starting with SafeTube acquisition and child login.

## Open Decisions

- Is the public suite now five apps at `$14.99/mo`, or is SafeSpark still early access outside paid bundle?
- Should cold traffic land on the suite page or a SafeTube-specific funnel?
- Should `safeseek` remain the internal app id while the product is SafeStudy, or should code/routes be renamed?
- Are lifetime friend/family promo codes still intended for production?
- Which app owns the canonical account and entitlement schema long term: marketing Convex or a separate shared backend?
