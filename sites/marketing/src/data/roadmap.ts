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
    priority: "P1",
    status: "blocked",
    source: "beads",
    bead: "safecontent-ntm.2",
    description:
      "VERIFIED WORKING for the Marketing Central /requestPasswordReset flow. Resend delivery log confirms two emails to metrotter@gmail.com on 2026-05-27 (codes 722181 and 193284), both 'delivered' status. The bead may refer to a DIFFERENT email flow (e.g., per-app trial-expired notifications, or an older Convex Auth password reset). Need to identify which specific flow the bead is about before claiming fixed.",
    blockedBy: "Unclear which email flow the bead refers to — needs Jeremiah/Codex clarification.",
    refs: ["sites/marketing/convex/passwordReset.ts", "sites/marketing/convex/emails.ts"],
    updatedAt: "2026-05-27",
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

  // ===========================================================================
  // SafeSpark parental oversight — added 2026-05-28 after Jeremiah asked:
  // "if a kid builds a chat room or asks for a VPN, how does a parent stay aware?"
  //
  // SafeSpark's threat model is fundamentally different from the other 4 apps.
  // Those are consumption — kid plays approved music. SafeSpark is PRODUCTION —
  // kid creates artifacts that run code, persist data via spark.db (chat rooms,
  // leaderboards, message walls), can be publicly shared via /s/[id] URLs to
  // anyone with the link, and use AI image generation. The kid is effectively
  // a "publisher with an audience" once any project is shared.
  //
  // Three threats the current parent dashboard doesn't cover well:
  //   A. Kid builds chat room → friend pastes /s/xxx into a group chat →
  //      strangers join. Spark.db message wall fills with content parent
  //      never sees.
  //   B. Kid asks SafeSpark to help bypass parental controls. "Make a VPN"
  //      is obvious; non-obvious versions ("spoof my IP", "fake-homework-
  //      page-that-lets-me-chat") might slip past a naive filter.
  //   C. Hidden activity. Parent sees "X projects" count but not: actual
  //      rendered output, who accessed each share URL, spark.db contents,
  //      blocked-attempt history.
  //
  // SafeStudy already has the right pattern for most of this — intent
  // classifier, kidConcernAlerts table, always-escalate categories, weekly
  // parent digest. Many of these items are "port the SafeStudy machinery
  // to SafeSpark's maker context."
  // ===========================================================================

  {
    id: "safespark-oversight-bypass-block",
    title: "SafeSpark: pre-filter block on parental-control-bypass prompts",
    app: "safespark",
    priority: "P0",
    status: "open",
    source: "session-todo",
    description:
      "Before any prompt reaches the AI, regex/keyword filter for parental-control-bypass patterns: VPN, proxy, IP spoof, IP changer, hide activity, fake school page, fake homework, screen mirror to fool, bypass safe family. These don't proceed to AI at all — return a friendly redirect ('we can't help with that — talk to a parent if you want to know more'). Distinct from the intent classifier below, which handles nuanced/escalation cases. This is the hard block.",
    notes:
      "Mirrors SafeStudy's intent-classifier regex pre-filter for 'aesthetic-browsing' and 'self-image' patterns (apps/safestudy/convex/ai/intentClassifier.ts). Reuse that scaffolding.",
  },

  {
    id: "safespark-oversight-intent-classifier",
    title: "SafeSpark: intent classifier on every prompt (always-escalate categories)",
    app: "safespark",
    priority: "P0",
    status: "open",
    source: "session-todo",
    description:
      "GPT-classifier on every prompt that goes to the AI. Always-escalate categories: parental-control-bypass (subtle phrasings the regex misses), contact-with-strangers (chat apps, dating sims, public boards), personal-info-disclosure (forms collecting names/addresses), weapons, drugs, sexual content, self-harm. Stores intent + confidence + rationale on the prompt log. Strict mode blocks; moderate mode logs + parent-notifies; light mode logs only.",
    notes:
      "Port apps/safestudy/convex/ai/intentClassifier.ts. Tune categories for the maker context (different from a search-tutor context).",
  },

  {
    id: "safespark-oversight-concern-alerts",
    title: "SafeSpark: kidConcernAlerts table + parent email on escalation",
    app: "safespark",
    priority: "P0",
    status: "open",
    source: "session-todo",
    description:
      "When the intent classifier hits an always-escalate category, write to a kidConcernAlerts table (one row per incident, dedupe 24h on kidProfileId+prompt+category) AND email the parent immediately with the prompt, category, classifier rationale, and a link to the kid's profile in /parent. 988/help-line resources for self-harm/ED categories.",
    refs: [
      "apps/safestudy/convex/concernAlerts.ts (the pattern to port)",
      "apps/safestudy/convex/concernAlertQueries.ts",
    ],
  },

  {
    id: "safespark-oversight-share-approval-gate",
    title: "SafeSpark: pre-share parent approval gate (default-on for chat-shaped apps)",
    app: "safespark",
    priority: "P0",
    status: "open",
    source: "session-todo",
    description:
      "When a kid clicks Share on a project, the share URL doesn't go live until a parent approves. Default-on for apps detected as 'chat-shaped' (uses spark.db.append with text fields, shows form inputs to visitors, has 'message' or 'chat' or 'send' in markup). Parent toggle: 'I'll review every share' vs 'auto-approve, alert me'. The kid sees a friendly 'waiting for parent — usually under an hour' state.",
    notes:
      "Without this, the only thing standing between a kid building a public chat room and strangers using it is the kid's own judgment about who to share the URL with.",
  },

  {
    id: "safespark-oversight-chat-shape-detector",
    title: "SafeSpark: detect when a kid is building a chat/messaging app",
    app: "safespark",
    priority: "P1",
    status: "open",
    source: "session-todo",
    description:
      "Static analysis on the generated HTML/JS + spark.db schema: flag projects that use spark.db.append on text fields, render visitor input back to other visitors, show input forms to non-creator users, or include 'chat', 'message', 'comment', 'forum' in markup. Feeds the share-approval-gate decision above and surfaces in the parent dashboard as a 'this is a messaging app — kids you don't know can talk here' label.",
  },

  {
    id: "safespark-oversight-share-access-log",
    title: "SafeSpark: log every fetch of /s/[id] (timestamp, IP, country)",
    app: "safespark",
    priority: "P1",
    status: "open",
    source: "session-todo",
    description:
      "Currently /s/[id] serves the project HTML to anyone with the URL, no audit trail. Add a `shareAccessLog` table: row per fetch with timestamp, IP (hashed for storage), geo country (Vercel Edge geo header), referrer, user-agent fingerprint. Parent dashboard surfaces 'this share was opened 47 times today, mostly from 3 unique networks' + alerts on rapid distribution patterns (e.g., 'this share went from 0 to 200 opens in 10 minutes — looks like it was posted somewhere').",
  },

  {
    id: "safespark-oversight-project-content-viewer",
    title: "SafeSpark: parent dashboard shows actual project HTML + spark.db contents",
    app: "safespark",
    priority: "P1",
    status: "open",
    source: "session-todo",
    description:
      "Today /parent/profile/[id] shows project metadata (name, timestamps, prompt). Add: a 'View what your kid built' button that renders the project's HTML in an iframe AND shows the spark.db rows (messages, leaderboard entries, anything kids have added). Parent sees the actual current state, not just 'a project exists'.",
  },

  {
    id: "safespark-oversight-spark-db-moderation",
    title: "SafeSpark: moderate spark.db writes (personal info, profanity, contact info)",
    app: "safespark",
    priority: "P1",
    status: "open",
    source: "session-todo",
    description:
      "Every spark.db write goes through a moderation pass before persistence: regex for phone numbers, US addresses, full emails, social handles (@username, snap-username), profanity, URLs to unknown domains. Soft block in 'strict' mode (reject + show kid 'looks like that contained a phone number, try without'); tag in 'moderate' mode (save but surface to parent dashboard). Per-family strictness setting.",
  },

  {
    id: "safespark-oversight-weekly-digest",
    title: "SafeSpark: weekly parent digest (port SafeStudy's pattern)",
    app: "safespark",
    priority: "P1",
    status: "open",
    source: "session-todo",
    description:
      "Sunday evening email summarizing the week per kid: projects created, total spark.db writes, top prompt intent categories, concerning-prompt count, share activity (URLs opened, peak access), blocked-prompt count, AI spend. Parents skim once a week instead of needing to check the dashboard daily. Opt-out toggle.",
    refs: ["apps/safestudy/convex/weeklyDigest.ts (the pattern to port)"],
  },

  {
    id: "safespark-oversight-generated-code-scanner",
    title: "SafeSpark: scan AI-generated code for risky patterns before save",
    app: "safespark",
    priority: "P2",
    status: "open",
    source: "session-todo",
    description:
      "Static analysis on every AI-generated project before it's saved: detect <iframe>, eval(), Function() constructor, document.cookie reads, fetch() to non-allowlisted domains, localStorage cross-origin patterns, navigator.geolocation. Block the obvious bypasses (eval, untrusted iframe sources); flag the suspect ones (geolocation, untrusted fetch domains) to parent. Maker still ships, just with a flag.",
  },

  {
    id: "safespark-oversight-kill-switch",
    title: "SafeSpark: per-project parent kill switch + share revocation",
    app: "safespark",
    priority: "P2",
    status: "open",
    source: "session-todo",
    description:
      "Parent dashboard: each project has a 'Pause' button (project no longer loads in /make for the kid) and a 'Revoke share' button (/s/[id] returns 404 instead of the project). Both reversible. Necessary so a parent who sees something concerning in the weekly digest or live activity can stop it within 30 seconds without filing a support ticket.",
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
