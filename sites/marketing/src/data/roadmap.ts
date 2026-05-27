/**
 * Safe Family — consolidated work board.
 *
 * Single source of truth across the portfolio. Renders at
 * `/admin/roadmap`. Edit this file directly — both Claude Code and
 * Codex have read/write access, so it's the canonical place to track
 * "what needs to be done across the 5 apps + marketing site."
 *
 * Sources rolled up here as of 2026-05-27:
 *   - CODEX.md (two 5-app platform audits, May 27)
 *   - beads `bd list` (10 open as of May 27)
 *   - apps/safespark/NEXT_PASS.md
 *   - apps/safespark/MIGRATION_SAFETY.md
 *   - CLAUDE.md scattered footer TODOs
 *   - In-flight session TODOs (kid login cross-app nav, Clerk retirement,
 *     /parent/setup dual-auth, etc.)
 *
 * Workflow:
 *   1. New work → add a row here with status 'open'
 *   2. Start work → flip status to 'in-progress'
 *   3. Complete → flip to 'done' (keeps history visible; prune quarterly)
 *   4. Blocked → flip to 'blocked' and add a `blockedBy` note
 *
 * Priority guide (matches beads + Codex audit conventions):
 *   P0 — must be fixed before paid acquisition / launch
 *   P1 — should be fixed before scale; affects trust or onboarding
 *   P2 — quality / consistency / cleanup
 *   P3 — nice-to-have / growth experiments
 */

export type App =
  | "platform" // cross-cutting infrastructure
  | "marketing" // sites/marketing (getsafefamily.com)
  | "safetunes"
  | "safetube"
  | "safereads"
  | "safestudy" // apps/safeseek + getsafestudy.com
  | "safespark"
  | "monorepo"; // workspace structure, shared packages, lint config

export type Priority = "P0" | "P1" | "P2" | "P3";

export type Status = "open" | "in-progress" | "blocked" | "done";

export type Source =
  | "codex-audit" // from CODEX.md
  | "beads" // tracked in beads (`bd show <id>`)
  | "session-todo" // captured during a Claude Code session
  | "support-case" // surfaced by a real customer
  | "self-audit"; // discovered while doing other work

export interface RoadmapItem {
  id: string; // short kebab-case, stable for URL anchors
  title: string;
  app: App;
  priority: Priority;
  status: Status;
  source: Source;
  /** Short rationale + acceptance criteria. Aim for 1-3 sentences. */
  description?: string;
  /** beads issue id when applicable (`bd show safecontent-xxx`). */
  bead?: string;
  /** What's stopping this from moving (only meaningful when status='blocked'). */
  blockedBy?: string;
  /** Where the work lives — file paths or doc references. */
  refs?: string[];
  /** Free-form append-only notes (decisions, partial work, gotchas). */
  notes?: string;
  /** ISO date string when status last changed. */
  updatedAt?: string;
}

// =============================================================================
// P0 — Launch blockers
// =============================================================================

const P0: RoadmapItem[] = [
  {
    id: "auth-clerk-retirement",
    title: "Retire Clerk from SafeSpark (dual-auth → federated only)",
    app: "safespark",
    priority: "P1", // dropped from P0 — dual-auth migration shipped, retirement is cleanup
    status: "open",
    source: "session-todo",
    description:
      "Dual-auth (Clerk + Marketing JWT) is live as of 2026-05-27. Both existing Clerk users (jedaws, soonerjace) and the 23 backfilled lifetime users can authenticate. Retirement: drop ClerkProvider, delete /sign-in routes, refactor 7 src files that still import @clerk/nextjs, remove env vars. Defer until existing Clerk users have either migrated naturally or been emailed to do so.",
    refs: [
      "apps/safespark/src/components/ConvexClientProvider.tsx",
      "apps/safespark/convex/auth.config.ts",
      "apps/safespark/src/app/sign-in/",
      "apps/safespark/src/app/sign-up/",
    ],
    notes: "Task #14 in current session. Coordinated with safecontent-ntm.",
  },
  {
    id: "parent-setup-dual-auth",
    title: "Wire /parent/setup and /parent/profile/[id] for dual-auth",
    app: "safespark",
    priority: "P0",
    status: "done",
    source: "support-case",
    description:
      "Fixed 2026-05-27. Root cause was in convex/users.ts getCurrent — only resolved by clerkUserId, no email fallback. Federated users got null forever, page stalled. Same fix applied to convex/kidProfiles.ts getForCurrentKid. /parent/profile/[id] frontend refactored to dual-auth pattern. Convex deployed to giddy-peacock-124, frontend deploy pending.",
    refs: [
      "apps/safespark/src/app/parent/setup/page.tsx",
      "apps/safespark/src/app/parent/profile/[id]/page.tsx",
      "apps/safespark/convex/users.ts",
      "apps/safespark/convex/kidProfiles.ts",
    ],
    updatedAt: "2026-05-27",
  },
  {
    id: "app-registry",
    title: "Canonical 5-app registry (one source of truth for app catalog)",
    app: "platform",
    priority: "P0",
    status: "open",
    source: "codex-audit",
    description:
      "Single shared list for safetunes/safetube/safereads/safestudy/safespark with id, display name, domain, Convex endpoint, price eligibility, accent color, in-bundle flag. Replace every scattered literal union and ALL_APPS array. SafeSpark is currently being forced through casts because AppName unions are 4-app and ALL_APPS_WITH_SPARK is a bolt-on.",
    refs: [
      "sites/marketing/src/lib/provisioning.ts",
      "sites/marketing/src/app/api/checkout/route.ts",
      "sites/marketing/src/app/api/stripe/webhook/route.ts",
      "sites/marketing/convex/accounts.ts",
      "sites/marketing/convex/migrations.ts",
    ],
    notes: "Codex audit P0 #2 (2026-05-27). Touches ~15 files; high-leverage cleanup.",
  },
  {
    id: "appselector-5app",
    title: "AppSelector + AccountForm + signup pages: 5-app model",
    app: "marketing",
    priority: "P0",
    status: "open",
    source: "codex-audit",
    description:
      "AppSelector still models only 4 apps and says 'All 4 apps'. AccountForm says '7 days free - all 4 apps'. Several signup/success/setup/account/admin pages default to 4 apps. Single-plan unified-pricing flow works ($14.99 grants all 5), but a customer entering via legacy single-app links still sees 4-app copy.",
    refs: [
      "sites/marketing/src/components/signup/AppSelector.tsx",
      "sites/marketing/src/components/signup/AccountForm.tsx",
      "sites/marketing/src/app/signup/page.tsx",
      "sites/marketing/src/app/success/page.tsx",
      "sites/marketing/src/app/setup/page.tsx",
      "sites/marketing/src/app/account/page.tsx",
    ],
  },
  {
    id: "security-gitignore",
    title: "Expand root .gitignore + remove tracked sensitive artifacts",
    app: "platform",
    priority: "P0",
    status: "open",
    source: "codex-audit",
    description:
      "Root .gitignore only excludes .vercel and .playwright-mcp/. Tracked artifacts include apps/safeseek/.env.prod, Android keystores, APK/AAB/idsig files, and build output bundles. Ignore .env* (except examples), .DS_Store, .next, dist, coverage, Playwright reports, Android build outputs.",
    refs: [".gitignore", "apps/safeseek/.env.prod"],
    notes:
      "Codex audit P0 #3. Rotate any key that was committed or appears in git history.",
  },
  {
    id: "security-admin-keys",
    title: "Remove hardcoded admin fallback keys; fail closed",
    app: "platform",
    priority: "P0",
    status: "open",
    source: "codex-audit",
    description:
      "Hardcoded admin fallback keys exist in SafeTunes, SafeTube, SafeReads, SafeSpark, and sync/provision/admin Convex functions. Admin auth should fail closed when env vars are missing. Prefer header auth over query-string keys for POST/admin operations.",
    refs: [
      "apps/safetunes/convex/http.ts",
      "apps/safetube/convex/http.ts",
      "apps/safereads/convex/provisionUser.ts",
      "apps/safereads/convex/syncFamilyCode.ts",
      "apps/safespark/convex/provisionUser.ts",
    ],
  },
  {
    id: "security-promo-codes",
    title: "Move lifetime promo code validation server-side only",
    app: "marketing",
    priority: "P0",
    status: "open",
    source: "codex-audit",
    description:
      "DAWSFRIEND and DEWITT are hardcoded in BOTH client and server code. UI affordance is fine; the list of valid lifetime codes should live only in server/Convex state with usage limits and audit logs.",
    refs: ["sites/marketing/convex/accounts.ts"],
  },
  {
    id: "quality-lint",
    title: "Make `npm run lint` meaningful and passing in every app",
    app: "platform",
    priority: "P0",
    status: "open",
    source: "codex-audit",
    description:
      "Lint status: Marketing 72 err / 2557 warn (scans .vercel/output); SafeReads 24 err / 36 warn; SafeTunes 280 err / 35 warn; SafeSpark 36 err / 32 warn (scans .claude/worktrees); SafeStudy ESLint v9 config missing; SafeTube eslint not installed at all. Add shared ignore patterns for generated/build/worktree folders. Fix or downgrade noisy new React-compiler rules.",
    notes: "Codex audit P0 #4. Quality gate work blocks E2E test work that depends on it.",
  },
  {
    id: "admin-auth-google-redirect",
    title: "Admin /admin-login Google OAuth — whitelist redirect URI in Google Cloud",
    app: "marketing",
    priority: "P0",
    status: "blocked",
    source: "self-audit",
    description:
      "NextAuth Google OAuth at /admin-login appears broken — Jeremiah hit it trying to reach /admin/roadmap after a federated login. NextAuth endpoints respond healthy (/providers, /csrf both return valid JSON). The redirect_uri NextAuth sends (https://getsafefamily.com/api/admin-auth/callback/google) is almost certainly not whitelisted in the Google Cloud OAuth client. Fix: add to Authorized redirect URIs in https://console.cloud.google.com/apis/credentials for OAuth client 60981898692-rf7qqn60061niahq5ksj4ckiecqe3be7.",
    blockedBy: "Requires Jeremiah's access to Google Cloud Console (2 min fix).",
    updatedAt: "2026-05-27",
  },
  {
    id: "admin-auth-unify",
    title: "Consolidate admin auth onto Marketing Central (drop separate Google OAuth)",
    app: "marketing",
    priority: "P2",
    status: "open",
    source: "self-audit",
    description:
      "Marketing has two parallel auth systems: /login (Convex Auth, customers) and /admin-login (NextAuth Google, admin only). They share no session. Jeremiah hit this tonight trying to reach /admin after a customer-side login. Long-term fix: expand admin layout to also accept jedaws@gmail.com via Marketing Central JWT — one auth surface, one session.",
    refs: ["sites/marketing/src/app/admin/layout.tsx", "sites/marketing/src/lib/auth.ts"],
    updatedAt: "2026-05-27",
  },
  {
    id: "auth-password-reset-emails",
    title: "Fix password reset emails not sending",
    app: "marketing",
    priority: "P0",
    status: "in-progress",
    source: "beads",
    bead: "safecontent-ntm.2",
    description:
      "Endpoint returns success but no email arrives. Triggered tonight when sending Michelle a reset code — Marketing returned 200 but unconfirmed delivery. Validate Resend integration in Marketing Central's /requestPasswordReset flow.",
    refs: ["sites/marketing/convex/passwordReset.ts", "sites/marketing/convex/emails.ts"],
  },
];

// =============================================================================
// P1 — Pre-scale quality / trust
// =============================================================================

const P1: RoadmapItem[] = [
  {
    id: "kid-login-cross-app-nav",
    title: "Kid login pages: easy cross-app nav to the other 4 kid pages",
    app: "platform",
    priority: "P1",
    status: "open",
    source: "session-todo",
    description:
      "Unified `users.familyCode` means the same 6-char code works on all 5 apps. Surface a small 'Other Safe Family apps' row on each kid login (pre-auth) and/or a switcher (post-auth) so kids can hop without re-typing.",
    notes: "Task #13. Touches each app's kid login route.",
  },
  {
    id: "safespark-starter-pad",
    title: "SafeSpark: silent 'Starter Pad' first-build failures + retry policy",
    app: "safespark",
    priority: "P1",
    status: "open",
    source: "beads",
    bead: "safecontent-cnm",
    description:
      "First-build streaming requests fail silently for some kids on the Starter Pad. Need detection + structured retry, plus surfacing to the parent dashboard for visibility.",
  },
  {
    id: "safespark-undo-affordance",
    title: "SafeSpark: discoverable 'go back to last working version' in /make",
    app: "safespark",
    priority: "P1",
    status: "open",
    source: "beads",
    bead: "safecontent-rkz",
    description:
      "Knox's 20-min undo struggle. Kid was multiple AI iterations deep and couldn't find a way back to a working version. Version history exists in the data model — just needs UI.",
  },
  {
    id: "trial-expiration-cron",
    title: "Add trial expiration cron to all apps",
    app: "platform",
    priority: "P1",
    status: "in-progress",
    source: "beads",
    bead: "safecontent-veh",
    description:
      "SafeStudy fix shipped 2026-05-27 (commit 1be49718) — trialEndsAt was never set on Marketing-provisioned users. Same pattern likely affects the other 3 apps. Audit each app's provisioning code for the same drift; add `missingEndDate` warn-counter to crons.",
    notes:
      "SafeStudy half-done. Pattern: provisionUserInternal must set trialEndsAt when status='trial'.",
  },
  {
    id: "transactional-emails-audit",
    title: "Audit and fix transactional emails + admin notifications",
    app: "marketing",
    priority: "P1",
    status: "open",
    source: "beads",
    bead: "safecontent-l2w",
    description:
      "Verify welcome / trial-expiring / trial-expired / payment-failed / cancellation emails actually fire across all 5 apps. Admin notifications for new signups, failed provisions, and cancellation reasons should consolidate (not 5 separate emails per event).",
  },
  {
    id: "marketing-safetube-wedge",
    title: "Lead cold traffic with SafeTube; keep bundle as upsell",
    app: "marketing",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "SafeTube is the clearest paid-acquisition wedge — YouTube without the algorithm. Bundle should be the upsell after trial start, in onboarding, and in lifecycle email. Don't make every cold visitor decode 5 apps.",
    notes:
      "Conflicts somewhat with the May 27 marketing-strategy doc that says affiliate seeding first; both can be true (different channels).",
  },
  {
    id: "marketing-product-proof",
    title: "Add product proof (real screenshots) above the fold",
    app: "marketing",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "Bundle page is conceptually strong but not inspectable. Add 5 compact product screenshots or a 'see it working' strip before testimonials. Especially parent dashboards and child-safe experiences.",
  },
  {
    id: "marketing-cta-language",
    title: "Standardize CTA language: 'Start free trial' primary, 'See how it works' secondary",
    app: "marketing",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "Current verbs include 'Start Free Trial', 'Get All 5 Apps', 'Get Started', 'Get 7 Days Free', 'Start Protecting Today', and app-specific price CTAs. Inconsistent CTAs dilute click-through signal and complicate analytics. Pick one primary verb, use it everywhere.",
  },
  {
    id: "marketing-testimonials-trust",
    title: "Improve testimonial trust (real customer count, founder note, real screenshots)",
    app: "marketing",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "Current reviews are plausible but too similar in rhythm. Add real customer count, one qualified testimonial, real screenshots/video, founder note. Codex audit also flags Emily T.'s 'mobile UI could be snappier' as undercutting on the landing page.",
  },
  {
    id: "marketing-legal-claims",
    title: "Clarify legal/compliance claims (COPPA, encryption, 'nothing slips through')",
    app: "marketing",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "Claims like COPPA compliant, data encrypted, no data selling, no bypass, 'nothing slips through' need supporting policy and product behavior. Avoid absolute safety claims where AI/API systems can fail.",
  },
  {
    id: "shared-family-code-input",
    title: "Create shared family-code entry component",
    app: "monorepo",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "SafeReads has the strongest kid entry pattern (segmented 6-character input). Promote to packages/ui and reuse across all 5 apps. Includes friendly helper text, app-specific icon/color, parent-login escape hatch, consistent validation.",
    refs: ["packages/ui/"],
    notes:
      "packages/ui/ scaffold already exists from Apr 19 work but never finished — see CLAUDE.md.",
  },
  {
    id: "kid-routes-cookie-suppress",
    title: "Suppress cookie/marketing consent on kid routes",
    app: "platform",
    priority: "P1",
    status: "in-progress",
    source: "codex-audit",
    description:
      "SafeTunes kid login still shows cookie controls (partially fixed Apr 19, still appears on some routes). Kid routes should not ask children to consent to tracking. Apply same gating to SafeTube, SafeStudy if applicable.",
  },
  {
    id: "safestudy-rename",
    title: "Finish SafeSeek → SafeStudy rename at code/UI/package level",
    app: "safestudy",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "Product is SafeStudy publicly; codebase still uses 'safeseek' for package name, internal routes, and some UI strings. Decide whether internal id should match the public name or stay as 'safeseek'.",
    refs: ["apps/safeseek/package.json"],
  },
  {
    id: "safestudy-markdown",
    title: "SafeStudy: render AI markdown instead of raw **bold** / headings",
    app: "safestudy",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "AI tutor responses currently show raw markdown markers. Use a markdown renderer with age-appropriate formatting + citations/provenance where possible.",
  },
  {
    id: "safereads-reader-polish",
    title: "SafeReads: book search/results + reader polish",
    app: "safereads",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "Duplicate read CTAs, placeholder Gutenberg covers, duplicate results across genre/search, raw labels like '[page i]' or 'Free -- Read Now', bottom-nav overlap in reader. Some partially fixed Apr 19; needs full sweep.",
  },
  {
    id: "safereads-central-schema-drift",
    title: "SafeReads: align embedded central-account fields with 5-app model",
    app: "safereads",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "apps/safereads/convex/schema.ts has embedded central-users entitlement shape that only covers 3 apps. Also apps/safereads/convex/accounts.ts ALL_APPS constant is missing SafeStudy (caught self-audit May 27). Decide one source of truth.",
    refs: [
      "apps/safereads/convex/schema.ts",
      "apps/safereads/convex/accounts.ts",
    ],
  },
  {
    id: "safetube-kid-login-warmth",
    title: "SafeTube: warmer kid family-code screen (improve disabled-button feel)",
    app: "safetube",
    priority: "P1",
    status: "in-progress",
    source: "codex-audit",
    description:
      "Apr 19 partially improved (placeholder + always-enabled button). Codex audit still flags it as sterile vs SafeReads' segmented input. Adopt shared family-code component once it exists.",
  },
  {
    id: "safetunes-kid-cookie-banner",
    title: "SafeTunes: remove cookie banner from kid routes (verify post-Apr-19 fix)",
    app: "safetunes",
    priority: "P1",
    status: "in-progress",
    source: "codex-audit",
    description:
      "Apr 19 added route-based suppression. Verify it covers all kid routes Codex audit observed.",
  },
  {
    id: "safetunes-landing-clutter",
    title: "SafeTunes: reduce landing-page CTA/nav clutter; add sticky mobile CTA",
    app: "safetunes",
    priority: "P1",
    status: "open",
    source: "codex-audit",
  },
  {
    id: "safetunes-lint-cleanup",
    title: "SafeTunes: 280 lint errors — stale components + hook issues",
    app: "safetunes",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "Largest lint surface in portfolio. Mostly stale components + hook issues. Address as part of P0 quality-lint work.",
  },
  {
    id: "safespark-clerk-dev-keys",
    title: "SafeSpark: Clerk in production is using pk_test_xxx keys",
    app: "safespark",
    priority: "P1",
    status: "open",
    source: "self-audit",
    description:
      "Screenshot of Michelle's bounce-loop login showed Clerk modal with 'Development mode' tag. SafeSpark's /sign-in is a dev sandbox in prod. Pre-existing from bella era. Becomes moot once Clerk is fully retired (auth-clerk-retirement) but worth flagging — explains why /sign-in 'works' for jedaws + soonerjace but no one else.",
    notes: "Discovered 2026-05-27.",
  },
  {
    id: "safespark-launch-metrics",
    title: "SafeSpark: launch metrics (AI cost, blocked topics, image transforms, failures)",
    app: "safespark",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "Variable-cost product needs visibility into per-kid and per-family AI spend, blocked-topic frequency, image transform count, and failed-generation count. Parent dashboard should expose at least usage cap status.",
  },
  {
    id: "failed-provision-safespark",
    title: "Add SafeSpark to failed-provision admin tools",
    app: "marketing",
    priority: "P1",
    status: "open",
    source: "codex-audit",
    description:
      "Existing failed-provision/retry/admin routes are mostly 4-app typed. SafeSpark must appear in failed provisioning dashboards, retry tools, and user-detail views if it's being sold.",
    refs: ["sites/marketing/src/app/admin/failed-provisions/page.tsx"],
  },
];

// =============================================================================
// P2 — Quality / consistency / polish
// =============================================================================

const P2: RoadmapItem[] = [
  {
    id: "auth-e2e-tests",
    title: "Add end-to-end auth test suite",
    app: "platform",
    priority: "P2",
    status: "open",
    source: "beads",
    bead: "safecontent-ntm.5",
    description:
      "Signup, login, forgot password, reset password, onboarding, upgrade, cancellation covered by E2E tests across all 5 apps.",
  },
  {
    id: "auth-e2e-ci",
    title: "Automate auth E2E cancellation + CI execution",
    app: "platform",
    priority: "P2",
    status: "open",
    source: "beads",
    bead: "safecontent-397",
  },
  {
    id: "safespark-kid-identity-errors",
    title: "SafeSpark: kid identity lost in error logs when parent is signed in",
    app: "safespark",
    priority: "P2",
    status: "open",
    source: "beads",
    bead: "safecontent-4pi",
    description:
      "safesparkErrors row attributes errors to the parent's identity when a kid session is also active. Needs tagging logic that prefers kid context when both are present.",
  },
  {
    id: "safetunes-first-run-path",
    title: "SafeTunes: explicit first-run path (create kid → connect Apple → approve → kid plays)",
    app: "safetunes",
    priority: "P2",
    status: "open",
    source: "codex-audit",
  },
  {
    id: "safetube-channel-request-e2e",
    title: "SafeTube: include channel/video request + parent review in E2E",
    app: "safetube",
    priority: "P2",
    status: "open",
    source: "codex-audit",
  },
  {
    id: "safespark-worktrees-lint",
    title: "SafeSpark: exclude .claude/worktrees from lint",
    app: "safespark",
    priority: "P2",
    status: "done",
    source: "codex-audit",
    description:
      "Fixed 2026-05-27 — added to apps/safespark/.gitignore. Lint config also needs updating but the worktrees folder is now ignored at the source.",
    notes: "Shipped in commit cc5175ab.",
  },
  {
    id: "shared-ui-package",
    title: "packages/ui shared component library (finish scaffolding)",
    app: "monorepo",
    priority: "P2",
    status: "in-progress",
    source: "codex-audit",
    description:
      "Scaffolded Apr 19 with FamilyCodeInput. Push the rest: profile picker, password strength, app badges/cards, empty/loading/error states, trial/upgrade prompts.",
    refs: ["packages/ui/"],
  },
  {
    id: "shared-observability",
    title: "Shared activation metrics across all 5 apps",
    app: "monorepo",
    priority: "P2",
    status: "open",
    source: "codex-audit",
    description:
      "Track: trial start, activation, first kid profile, first approved item, first kid session, failed provisioning, failed webhook, entitlement mismatch. Plus app-specific milestones.",
  },
  {
    id: "monorepo-workspace",
    title: "Top-level package.json workspace (turn the apps/ folders into a real monorepo)",
    app: "monorepo",
    priority: "P2",
    status: "open",
    source: "codex-audit",
    description:
      "Currently each app has separate installs and no top-level package manifest. Shared UI / app registry / auth types / lint config / scripts should live at root.",
  },
  {
    id: "safereads-vercel-autodeploy",
    title: "SafeReads: investigate why Vercel auto-deploy isn't firing on git push",
    app: "safereads",
    priority: "P2",
    status: "open",
    source: "self-audit",
    description:
      "Discovered May 27 — every SafeReads deploy attempt since April 19 had failed with `● Error`. Multiple commits triggered zero builds even after the TS fix shipped. Vercel project Git integration may have detached after the run of failed builds.",
    notes:
      "Manual `vercel --prod` works. Need to check Vercel project settings → Git → Connected Repository.",
  },
];

// =============================================================================
// P3 — Growth / nice-to-have
// =============================================================================

const P3: RoadmapItem[] = [
  {
    id: "safespark-myles-activation",
    title: "SafeSpark: Myles Rhee onboarding nudge (dormant kid profile)",
    app: "safespark",
    priority: "P3",
    status: "open",
    source: "beads",
    bead: "safecontent-6oi",
    description:
      "Myles has a created kid profile but no activity. Decide on onboarding nudge — email parent? In-app suggestion? Or accept that some profiles never activate.",
  },
  {
    id: "safespark-database-sdk",
    title: "SafeSpark: kid-safe database SDK for project persistence",
    app: "safespark",
    priority: "P3",
    status: "open",
    source: "session-todo",
    description:
      "Allow kid-built projects to persist shared state (leaderboards, message boards, etc.) via window.spark.db. Already shipped per the AGENTS.md update — verify and close, or expand.",
    refs: ["apps/safespark/convex/sparkdb.ts", "apps/safespark/AGENTS.md"],
    notes: "May already be done; needs verification.",
  },
  {
    id: "safespark-trainer-relaunch",
    title: "SafeSpark trainer (Lumi) relaunch decision",
    app: "safespark",
    priority: "P3",
    status: "open",
    source: "session-todo",
    description:
      "Trainer routes (/chat /learn /literacy /journey /studio /apis /build /claim) are tabled and redirected to /. Decide whether to bring them back as a deeper layer or separate product.",
    refs: ["apps/safespark/NEXT_PASS.md", "apps/safespark/TRAINING_PLAN.md"],
  },
  {
    id: "marketing-strategy-execution",
    title: "Execute May 6 marketing strategy (affiliate seeding first)",
    app: "marketing",
    priority: "P3",
    status: "open",
    source: "session-todo",
    description:
      "Per docs/MARKETING-STRATEGY-2026-05.md: affiliate seeding to ~10 Christian/homeschool mom creators is the highest-ROI first dollar at current scale, not Meta cold traffic. Bundle upsells on each app's thank-you page. Lead creative: 'Search History Reveal' using SafeStudy intent classifier data.",
    refs: ["docs/MARKETING-STRATEGY-2026-05.md"],
    notes:
      "Not strictly P3 by impact — could be your highest growth lever — but it's marked here because it's primarily founder execution, not engineering.",
  },
  {
    id: "fpea-2027",
    title: "FPEA Florida Homeschool Convention 2027 registration",
    app: "marketing",
    priority: "P3",
    status: "open",
    source: "session-todo",
    description:
      "Missed 2026 (May 21-23) — largest single FL homeschool-mom audience. Plan 2027 well in advance; exhibitor slots typically open in fall.",
  },
];

// =============================================================================
// Recently shipped — keeps a visible history for ~30 days, then prune
// =============================================================================

const RECENTLY_DONE: RoadmapItem[] = [
  {
    id: "safespark-dual-auth",
    title: "SafeSpark dual-auth: Clerk + Marketing Central JWT live",
    app: "safespark",
    priority: "P0",
    status: "done",
    source: "session-todo",
    description:
      "Federated auth path shipped end-to-end. 23 backfilled lifetime users can log in via /login with Marketing Central credentials. Existing Clerk users untouched. Commits 43df82b9 + 01215ea9 + 3f30fa63.",
    updatedAt: "2026-05-27",
  },
  {
    id: "safespark-lifetime-backfill",
    title: "Backfill SafeSpark entitlement to 23 lifetime users",
    app: "marketing",
    priority: "P1",
    status: "done",
    source: "session-todo",
    description:
      "Per pricing-pivot policy: existing comp users grandfathered onto 5-app suite; future DAWSFRIEND/DEWITT redemptions stay 4 apps. Commit 63fde935.",
    updatedAt: "2026-05-27",
  },
  {
    id: "unified-pricing-live",
    title: "Unified pricing live: $14.99/mo or $149/yr for all 5 apps",
    app: "marketing",
    priority: "P0",
    status: "done",
    source: "session-todo",
    description:
      "Collapsed 7 pricing tiers to 1. Existing $4.99 single-app subs grandfathered. Stripe Price IDs: price_1Tbm6RKgkIT46sg75fZzF2gj (monthly), price_1Tbm8OKgkIT46sg7YgWgQPDC (yearly). Commits 3a70c032 + 72450d1e.",
    updatedAt: "2026-05-27",
  },
  {
    id: "safestudy-trial-fix",
    title: "SafeStudy trial-expiration bug fix",
    app: "safestudy",
    priority: "P0",
    status: "done",
    source: "self-audit",
    description:
      "provisionUserInternal wasn't setting trialEndsAt — cron silently skipped trial users forever. Fixed in commit 1be49718.",
    updatedAt: "2026-05-27",
  },
  {
    id: "safereads-deploy-outage",
    title: "SafeReads back online after 50-day deploy outage",
    app: "safereads",
    priority: "P0",
    status: "done",
    source: "self-audit",
    description:
      "TypeScript error in convex/syncFamilyCode.ts had been blocking every Vercel deploy since April 19. Fix shipped + manual deploy. Auto-deploy issue captured as P2 (safereads-vercel-autodeploy).",
    updatedAt: "2026-05-27",
  },
  {
    id: "safereads-mobile-login",
    title: "SafeReads: mobile login button visible on landing nav",
    app: "safereads",
    priority: "P1",
    status: "done",
    source: "support-case",
    description: "Surfaced by Jeremiah's wife. Was `hidden sm:inline-flex`. Commit aef6bdca.",
    updatedAt: "2026-05-27",
  },
];

// =============================================================================

export const ROADMAP: RoadmapItem[] = [
  ...P0,
  ...P1,
  ...P2,
  ...P3,
  ...RECENTLY_DONE,
];

export const APP_META: Record<App, { name: string; color: string; domain?: string }> = {
  platform: { name: "Platform", color: "slate" },
  monorepo: { name: "Monorepo", color: "slate" },
  marketing: {
    name: "Marketing",
    color: "indigo",
    domain: "getsafefamily.com",
  },
  safetunes: { name: "SafeTunes", color: "purple", domain: "getsafetunes.com" },
  safetube: { name: "SafeTube", color: "red", domain: "getsafetube.com" },
  safereads: { name: "SafeReads", color: "emerald", domain: "getsafereads.com" },
  safestudy: { name: "SafeStudy", color: "cyan", domain: "getsafestudy.com" },
  safespark: { name: "SafeSpark", color: "amber", domain: "getsafespark.com" },
};

export const PRIORITY_META: Record<Priority, { label: string; description: string }> = {
  P0: { label: "P0", description: "Must fix before paid acquisition / launch" },
  P1: { label: "P1", description: "Should fix before scale; affects trust or onboarding" },
  P2: { label: "P2", description: "Quality / consistency / cleanup" },
  P3: { label: "P3", description: "Nice-to-have / growth experiments" },
};
