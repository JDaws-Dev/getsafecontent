# SafeSpark — Next Pass Notes

Open threads to revisit. None block the current SafeSpark v1 on
getsafespark.com.

---

## Auth migration: drop Clerk, adopt SafeFamily central auth

SafeSpark uses Clerk because it inherited from the BELLA codebase.
The other Safe Family apps use `@convex-dev/auth` against the central
marketing Convex (`adamant-crow-705`). Continuing on Clerk is throwaway
work — the Clerk URL leak, the production-domain promotion, the JWT
template re-creation all evaporate the moment we move to the family
auth model.

**Migration steps (do this with the monorepo move below):**
1. Add `@convex-dev/auth` to deps; remove `@clerk/nextjs`.
2. Copy the marketing auth.ts pattern (Password + Google + ResendOTP).
3. Point auth.config.ts at the central marketing CONVEX_SITE_URL
   (matches `safereads/convex/auth.config.ts` pattern).
4. Wire SafeSpark to central marketing `/verifyAppAccess` to gate
   premium features.
5. Replace `/sign-in`, `/sign-up`, `proxy.ts` Clerk middleware,
   `users.upsertFromClerk`, and the `clerkUserId` foreign-key with
   the Convex Auth user table + the family schema.
6. Migrate the existing 8 Clerk users to central marketing accounts
   (manual one-shot or a small script).
7. Drop the Clerk env vars from Vercel.

**Why not do this now:** the queue still has features that don't
depend on auth (PDF upload, image refinement, database SDK, kid
kill switches — already shipped). Keep building those while Clerk
limps along. When we move to the monorepo, do the auth migration in
the same chunk of work so we don't run two auth systems in parallel.

---

## Merge into the safecontent monorepo

SafeSpark started as a standalone repo (BELLA) and has since become a
clear member of the Safe Family lineup (palette, footer, admin endpoints,
contact email, founder pattern all aligned with the siblings). Time to
move it under `~/Projects/safecontent/apps/safespark/` alongside
safetube / safetunes / safereads / safestudy.

**Don't move yet — finish these first:**

1. **Three parallel agents currently running** in worktrees of this repo
   (kid kill switches, sticky mobile CTA — already merged, lint cleanup).
   Move would orphan their branches.
2. **Big functional items** in the queue (PDF upload, image refinement,
   database SDK) — keep doing them in-place where the structure is known.
3. **Delete the trainer code** physically. It's currently redirected away
   but still in the bundle. The monorepo apps don't carry that baggage,
   so strip it before moving:
   - `src/app/{chat,learn,literacy,journey,studio,apis,build,claim}/`
   - `convex/{chat,enrichment,wikipedia,gamification,images,messages,conversations,dailyCardsAction,spaces,activity}.ts`
   - `curriculum/`
   - `src/lib/{apis,free-play-powers,gamification,personality,system-prompt,up-next}.ts`
   - All redirect rules in `next.config.ts` for those routes
   - The `claim` / `journey` / `studio` / `learn[/slug]` / `literacy[/slug]`
     route files
4. **Lint pass** on the resulting clean codebase so the move starts from
   zero warnings.

**Then the move itself (~2-3 hr):**

- Copy to `safecontent/apps/safespark/`
- Adopt monorepo package.json conventions (workspace deps, shared
  `packages/ui`, monorepo lint/build config)
- Update Convex `convex.json` paths in the new location
- Update Vercel project linkage (`vercel.json` or `--cwd` flag in deploy)
- Add SafeSpark card to `safecontent/sites/marketing/src/components/landing/AppCards.tsx`
- Add `safespark` to the marketing Convex `verifyAppAccess` whitelist
- Add `/setupOnboarding` + `/provisionUser` HTTP endpoints so the central
  marketing onboarding flow can create kid profiles for SafeSpark families
- Smoke-test prod domain (getsafespark.com), Clerk auth, kid-login flow

---

## Databases for kid projects

**Current state:** Spark builds single-file HTML projects that run entirely
client-side. A kid's game can:
- Persist per-device with `localStorage` (own high score on this browser)
- Fetch from public APIs (PokeAPI, Open Trivia DB, Dog CEO, etc.)
- Embed uploaded images from Convex storage

**What it can NOT do today:**
- A leaderboard where everyone's high score shows up across devices
- A shared message board, chat room, multiplayer game state
- A real "Save to my account / load on another device" persistence inside
  a kid-built project
- Any project where the kid stores user-generated content from other players

**To unlock this we need a "kid-safe database" SDK that Spark can inject:**
- A Convex-backed per-project shared key-value or table store
- A `<script>` injected into the kid's HTML that exposes
  `spark.db.get(key)` / `spark.db.set(key, value)` / `spark.db.append(key, item)`
- Auth scoped to the project so one kid's database can't read another's
- Rate limits + size caps so a kid can't accidentally rack up costs
- Moderation pass on stored values (no swears in leaderboards)
- Probably a /spark/projects/[id]/db route or admin viewer

This is a meaningful product unlock — it turns single-file projects into
"real apps that grow data." Particularly important for the trainer
relaunch because "data + AI" is the lesson kids need next.

---

## Trainer relaunch

The Lumi/Bella trainer routes (`/chat`, `/learn`, `/literacy`, `/journey`,
`/studio`, `/apis`, `/build`, `/claim`) are tabled for SafeSpark v1 — they
redirect to `/` via `next.config.ts`. Code is still in the repo (until the
monorepo move; see top of this file).

When we pick the trainer back up:
- Decide whether the trainer is a *separate* product or a deeper layer
  inside SafeSpark (current code is built assuming the latter — shared
  sessions, families, kid profiles, etc.)
- Discuss databases (above) as a first-class part of the trainer's
  "what kids learn"
- Pick the brand again — is it "SafeSpark trainer," "Lumi," something else?
- Review the curriculum sequence (16 literacy + 7 quests) for what stays,
  what gets folded into SafeSpark, what gets cut
- See `TRAINING_PLAN.md` for the new shape: 15 bite-sized lessons in
  3 tracks (prompting / APIs+databases / AI literacy), no gatekeeping,
  parent-toggle requires it.
