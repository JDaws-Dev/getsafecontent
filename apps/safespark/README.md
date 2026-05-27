# BELLA — Bella AI Training

A kid-friendly AI training lab for Bella (12). Runs on her Chromebook through a normal browser. Bright, playful, encouraging. Helps her practice asking, checking, improving, building, making images, and shipping tiny entrepreneurial experiments.

She'll name it. Until then, the user-facing label says *"placeholder name — Bella names me soon"*.

## Concept — Codex Notes

BELLA is not meant to be "ChatGPT for kids" or a shortcut machine for homework. The point is to teach kids how to utilize AI well in a world where AI will be everywhere.

The strongest version of the product is a supervised AI learning lab where kids practice using AI as a tool: asking better questions, checking answers, improving outputs, and turning ideas into real projects. Games, images, apps, automations, research, and tiny business ideas are the practice field, not disconnected features.

The core skill loop is:

1. **Ask** — What am I trying to make or understand?
2. **Guide** — What does the AI need to know to help well?
3. **Check** — What might be wrong, missing, lazy, unsafe, or overconfident?
4. **Improve** — What feedback would make the output better?
5. **Own** — What part is mine, and what part did AI help with?

That last step matters most. BELLA should teach kids to use AI for scaffolding, examples, debugging, brainstorming, and technical execution without outsourcing their voice, values, effort, taste, or responsibility.

The product's job is not just to give kids access to AI. They will have access everywhere. The value is helping them build good habits before bad ones form.

### Direction Correction — Codex Notes

This is the Bella AI training project. It is not SafeFamily, and it should not become a family-safety product by drift.

SafeFamily can be useful as a pattern library for supervised kid access, parent visibility, device/session handling, and conservative defaults. Those ideas should be borrowed only when they directly support the Bella AI training experience. They should not become the product frame, the brand promise, or the center of the roadmap.

The core product question is:

> How do we teach a kid to use AI well, with judgment, creativity, and ownership?

That means the main build priorities should be training-loop features:

1. **Prompt practice** — help Bella learn how to ask clearly, add context, define constraints, and request useful output formats.
2. **Verification habits** — teach her to check facts, inspect API responses, notice hallucinations, and ask "how do we know?"
3. **Iteration skill** — make improving a weak AI answer feel normal: critique, revise, compare, and explain what changed.
4. **Creative ownership** — keep her responsible for taste, voice, ideas, values, and final decisions while AI helps with execution.
5. **Real projects** — apps, APIs, images, automations, lessons, and tiny businesses should be the practice field for AI literacy.

Parent controls and access management are supporting infrastructure. They matter, but they are not the product. The UI should make the learning loop visible before it makes supervision visible.

#### Codex Working Priorities

For the next pass, Codex should evaluate the codebase through the training-product lens:

- Does `/chat` actively coach better AI usage, or does it just answer?
- Does `/apis` teach "AI + live data" as a repeatable skill, not just provide a list of endpoints?
- Does `/learn` connect lessons to the actual chat/build/make workflows?
- Does the project/studio area help Bella reflect on what she made, what AI did, and what she changed?
- Does the parent dashboard show learning progress and habits, not merely surveillance/activity?

Do not spend the next engineering pass primarily on SafeFamily/session architecture unless it directly blocks the Bella AI training loop.

### Current Code Review — 2026-05-24

Codex review after the recent Claude Code changes:

- `npm run build` passes on Next.js 16.2.6, and the app statically includes `/apis`, `/chat`, `/start`, `/parent`, `/studio`, `/learn`, and `/literacy`.
- `npm run lint` still fails. Current buckets: React 19 `set-state-in-effect` errors, `module` variable naming in dynamic route pages, unescaped quotes on the homepage, and several unused variables/imports.
- The SafeFamily direction is only partially wired. `/start` creates a `kidSessions` row and stores `lumiKidSession`, but `/chat` still depends on Clerk identity through `api.users.getCurrent`. A no-Clerk kid can reach `/chat`, but no Convex user, space, conversation, stats, or messages resolve from the kid session token yet.
- The parent dashboard has also not fully moved to SafeFamily sessions. It still uses legacy learner rows and `linkedKidProfileId` to decide which kid is active and which activity to show, so `/start`-based kid usage will not naturally appear in the dashboard.
- Convex authorization remains the largest technical risk. Several queries/mutations accept arbitrary `userId`, `conversationId`, `projectId`, or `parentUserId` values without verifying the caller owns the record or is that kid's parent.
- `upsertFromClerk` should not trust client-submitted `clerkUserId` or `email` for role assignment. It should derive identity from `ctx.auth.getUserIdentity()` and make parent promotion server-authoritative.
- `/apis` is still blocked for the signed-out kid flow because middleware only treats `/`, `/start`, and `/chat` as public. A signed-out request to `/apis` gets Clerk's protect rewrite/404.
- The API library still includes kid-facing examples that currently fail or mislead: Bored API DNS failure, SWAPI TLS failure, Numbers API 404, OpenWeather 401 without a key, and Disney marked Tier 2 while saying no key is needed.
- `npm audit --omit=dev` reports moderate advisories through `next/postcss` and `convex/ws`; do not apply the suggested force fix blindly because it proposes breaking downgrades.

Recommended next order:

1. Re-center `/chat`, `/learn`, `/apis`, and `/studio` around the AI training loop: ask, guide, check, improve, own.
2. Make `/apis` a reliable AI-literacy lab with only working Tier 1 examples and clear Tier 2 parent/key setup.
3. Tighten the system prompt and UI copy so Bella is coached to verify, iterate, and own the creative decisions.
4. Fix lint so React 19 rules become a useful gate instead of background noise.
5. Only then revisit access/session architecture, borrowing from supervised kid-access patterns where it serves this training product.

### Session Log — 2026-05-24 (Claude Code response to Codex review)

This block tracks what got addressed after Codex's 2026-05-24 review, what
shipped in the same session, and what's still outstanding.

#### Addressed this session

- **`upsertFromClerk` is now server-authoritative.** Previously trusted
  client-submitted `clerkUserId` + `email`, which would let anyone
  promote themselves to parent by submitting `jedaws@gmail.com`. Now
  derives both from `ctx.auth.getUserIdentity()`; only `displayName`
  comes from the client. Throws if no Clerk session.
- **Role sync on existing users.** Previously `upsertFromClerk` only
  set role on insert; existing users were stuck on whatever role they
  got at first signup. Now patches `role` from `learner` → `parent`
  when `PARENT_EMAIL` matches. Demotion intentionally NOT mirrored.
- **`debugMe` diagnostic query.** Returns `{ signedIn, clerkEmail,
  hasUserRow, role, configuredParentEmail, emailMatches }` for
  triaging "why isn't the parent dashboard showing up."
- **Orphan kidProfile migration.** `families.ensureForParent` now does
  a migration pass: any kidProfiles owned by the parent without a
  `familyId` get attached to the family record. Fixes the bug where
  `/start` found the family but the profile picker was empty for
  parents whose kids predated the families table.
- **`KidLoginPanel` on parent dashboard.** Gradient banner at the top
  of `/parent` showing the 6-char family code with an "Open kid
  login →" button that opens `/start` in a new tab. The kid login
  was previously undiscoverable from the parent UI.
- **`ensureForParent` moved out of render.** Previously called as a
  side effect inside the component body (React anti-pattern). Moved
  to `useEffect` so it fires deterministically when family is null.
- **Chat surfaces stripped from parent flows.** Parents are
  supervisory, not chat users. Removed "Open Lumi as [kid]" /
  "back to chat" / chat-launcher buttons from parent dashboard
  and setup wizard. `/chat` now auto-redirects parents to `/parent`
  (or `/parent/setup` if they have no profiles). Landing page CTA
  for signed-in users changed from "Open Lumi →" to "Open
  dashboard →".
- **API library scaffolded** at `/apis` with 18 curated APIs in
  9 categories, filterable by tier and category, with a
  "Build with this" handoff to `/chat` via `sessionStorage`.
  Curriculum module 2b "Make Your App Talk to the Internet"
  added between First Web App and First Automation. New
  "API Tinkerer" achievement (+75 XP) for module completion.
- **Game mode** (mode_game) shipped — kids describe a game in
  Build/Game mode, and Lumi helps turn it into a playable-game
  build plan. System prompt explicit: "they are NOT here to learn
  coding."
- **Music mode** shipped — theory, chord progressions, song
  structure, lyric reactions. Does NOT write lyrics or generate
  songs. When kid asks about Suno, Lumi explains we don't use it
  here on purpose.
- **Skill-development boundary in system prompt.** New top-of-
  prompt rule: "AI is for technical execution; the kid is for
  creative skill-building." Concrete refusals on essays, journal
  entries, songs they're submitting, art they should be drawing
  themselves. Concrete green-lights on coding, automation,
  reference imagery.
- **SafeFamily Phase 1.** `families` table with 6-char codes
  (4 safe letters + 2 safe digits, no ambiguous chars).
  `kidSessions` table with opaque tokens. `/start` route works
  end-to-end on the kid side: family code → profile picker
  with avatars → optional 4-digit PIN → session token stashed
  in `localStorage` as `lumiKidSession`.
- **Sex (not pronouns) on kid profiles.** Replaced pronoun
  selector with boy/girl per Jeremiah's conservative Christian
  worldview ask. Natural pronouns derived from biological sex.
  Gender identity questions added to the parent-territory rule.
- **Renamed → Wren → reverted.** Mass-renamed Lumi to Wren in
  one commit, then reverted to Lumi the same session per
  Jeremiah's reaction ("Wren is bad. Don't make changes to the
  name on the site till I like it"). The name is still Lumi
  in the code; brand decision is pending.

#### Outstanding from Codex review (NOT addressed yet)

- **Convex authorization helpers.** Several queries/mutations still
  accept arbitrary `userId` / `conversationId` / `projectId` /
  `parentUserId` without verifying the caller owns the record or
  is that kid's parent. Needs a `requireOwn(ctx, resourceUserId)`
  helper applied to: `kidProfiles.listByParent`, `conversations.*`,
  `messages.*`, `projects.*`, `gamification.*`. **This is the
  largest remaining technical risk.**
- **Kid session model end-to-end.** `/start` creates the session
  but `/chat` still uses Clerk identity via `api.users.getCurrent`.
  A no-Clerk kid landing at `/chat` gets no Convex user, no
  spaces, no conversations, no stats. Same gap on parent
  dashboard — it reads legacy `learner` user rows via
  `linkedKidProfileId` instead of resolving kid sessions.
- **`/apis` is not in the public middleware list.** Signed-out
  kid hitting `/apis` gets Clerk's protect rewrite. Should join
  `/`, `/start`, `/chat` as public.
- **`npm run lint` fails.** Buckets: React 19 `set-state-in-effect`
  errors, `module` variable naming in dynamic route pages,
  unescaped quotes on the homepage, several unused variables/
  imports. Build passes but lint is noise instead of gate.
- **API library has broken examples.**
  - Bored API: DNS failed — remove
  - SWAPI: expired SSL cert — replace with `swapi.tech` or remove
  - Numbers API: returned 404 — fix endpoint or remove
  - OpenWeather: 401 without key — Tier 2, "peek" shouldn't link
    to a 401 URL
  - Disney API: mis-tagged Tier 2 (description says no key needed) —
    move to Tier 1 or actually require key
- **Middleware → proxy.ts rename.** Next 16 deprecates
  `src/middleware.ts` in favor of `src/proxy.ts`. Build warns
  on every run.
- **Activity log doesn't track auth/family events.** Codex's
  observability ask (provisioning events) is unaddressed.
  Adding `auth_event` and `family_event` kinds is ~30 min.
- **No end-to-end tests.** Codex listed signup / login / forgot /
  reset / onboarding / upgrade / cancellation as launch-required
  E2E. BELLA has 0/8.

#### Recommended next-pass order

Direction update: this historical Claude list is not the current product priority. The current priority is the Bella AI training project described in the Codex notes above, not a SafeFamily-style session rebuild.

1. **Convex authorization helpers** — biggest security gap. Block
   anyone from reading another family's data by guessing IDs.
2. **Kid session resolved end-to-end** — chat, spaces, conversations,
   stats all read from `lumiKidSession` → resolve to (familyId,
   kidProfileId), drop the linkedKidProfileId fallback.
3. **API library cleanup** — prune broken endpoints, fix tier labels,
   add `/apis` to public middleware.
4. **Lint fixes** — React 19 set-state-in-effect, unescaped quotes,
   unused imports, dynamic-route `module` variable renames.
5. **Middleware → proxy.ts** when touching auth routing.
6. **Activity log: auth + family events** for parent dashboard
   observability.
7. **Sell mode UI + Lemonsqueezy integration** (the revenue stack).
   Domain reseller comes after.
8. **Brand name decision** (see below).

#### Naming — finalists (decision pending)

After 6 rounds of agent research, four candidates have cleared the
"`.com` available + zero kids/AI/edtech collisions" bar:

| Name | Domain | Type | Note |
|------|--------|------|------|
| **Roan** | `tryroan.com`, `roanai.com`, `helloroan.com` | Real unisex name, "rowan tree" / "little red-haired one" | Genuinely unisex (Nameberry boy #530, girl #4566). Bare `.com` taken (parked). |
| **Cassia** | `hellocassia.com`, `cassiakids.com`, `cassiaapp.com` | Real girl name on the rise for tweens 2026 | Girl-coded; Jeremiah later required unisex. |
| **Brewaroo** | `brewaroo.com` (bare) | Compound verb-name, "-aroo" kid-bounce | Bare `.com` AVAILABLE. Zero collisions in any lane. Unisex. |
| **Wisp** | `wispkids.com` | Single word, will-o'-the-wisp evocative | Runner-up to Roan. Slight Wren-trap risk (delicate feel). |

Rejected: Lumi (crowded), AIVRIA (invented fragments), ULMIE
(made-up word), Wren (somber/bird-bony per Jeremiah), Lark
(bird-themed), Nellie (old-grandma-coded), Pluck/Stoke (USPTO
or B2B baggage), every single bare-`.com` English verb (all
squatted).

Brewaroo is the only candidate with a TRULY clean bare `.com`.
Roan has the warmest "real-name + relationship" feel. **Decision
is Jeremiah's** and the codebase will not change names again
until he locks one in.

### API Library Follow-Up

The API library is conceptually a strong addition. It teaches the right lesson: AI can help write code, but useful apps often need live data from real systems. That fits the larger goal of teaching kids how to utilize AI instead of merely chatting with it.

Current implementation notes from Codex:

- `/apis` now loads publicly, but it still needs to work with the same kid access model as `/start` and `/chat`. The API library handoff pushes a signed-out kid into `/chat`, where the kid-session token is not resolved yet.
- The `/apis` → `/chat` handoff via `sessionStorage` is the right product shape, but the current React effect implementation trips React 19 lint rules. It should be refactored so prefilling Build mode does not rely on synchronous `setState` inside effects.
- The curated API list should only include working kid-pasteable examples in the "peek" button. Some candidates need pruning or replacement: Bored API DNS failed, SWAPI had an expired SSL certificate, Numbers API returned 404, and key-required APIs should not present a pasteable example unless the URL works with a demo key.
- Tier labels should be made strict: Tier 1 means a kid can click and see data immediately with no setup; Tier 2 means parent/API-key/OAuth setup is required. Anything in between should be described explicitly.

This feature should become a core AI-literacy lab: pick a live API, ask AI to build with it, inspect what data came back, then improve the app. That is exactly the habit BELLA should teach.

### Gamified Learning Research — Codex Notes

Research pass looked at Duolingo, Khan Academy, Brilliant, Mimo, CodeCombat, Quizizz, and Kahoot-style classroom products.

What to lift:

- **Mastery beats raw activity.** Khan's current streak/course-level model is tied to earning proficiency in skills, not just logging in. BELLA should reward verified learning habits: checking a source, improving a prompt, shipping a project, explaining what AI did, and supervising an agent.
- **Weekly streaks are healthier than daily streak pressure.** A weekly "learning streak" tied to completing one meaningful skill/project is a better fit for a kid than daily pressure. Daily streaks can become performative or stressful.
- **Visible next step matters.** Khan shows "up next" and course-level progress. BELLA should always show one suggested next move: next literacy lesson, next project quest, or "finish the loop" on an active project.
- **Learn-by-doing is the core loop.** Brilliant and Mimo both emphasize interactive problem solving and real practice over passive video. BELLA should keep every lesson anchored to a mini-action in chat, APIs, images, apps, or reflection.
- **Projects should be portfolio artifacts.** Mimo's project/portfolio angle and CodeCombat's playable levels suggest BELLA's Studio should be more than a gallery. Each saved project should include: what I asked AI, what I checked, what I changed, and what is mine.
- **Game mechanics should support learning, not distort it.** Duolingo-style XP, leagues, and streaks are powerful, but leaderboards/hearts can incentivize grinding, speedrunning, fear of mistakes, or competing instead of learning. BELLA should avoid public leaderboards, punitive hearts, and XP farming.
- **Power-ups are useful if they are learning tools.** Quizizz power-ups are engaging but mostly score modifiers. BELLA's version should be capability unlocks that teach better behavior: Source Check, Prompt Upgrade, Compare Versions, Explain the Tool, Agent Plan Review.
- **Narrative progression fits BELLA.** CodeCombat's levels and quests work because the learner can see progress through a world. BELLA can frame progression as becoming an AI pilot: Explorer → Prompt Builder → Source Checker → Tool User → Project Shipper → Agent Supervisor.

Candidate implementation ideas:

1. Add a **Weekly Skill Streak**: continues when Bella completes one meaningful skill in a week, not when she merely opens the app.
2. Add an **Up Next** card on `/chat`, `/learn`, and `/journey` based on incomplete literacy/project modules.
3. Add **AI Skill Badges** for observable habits: "Checked a source," "Improved a prompt," "Compared two versions," "Used live API data," "Wrote an agent plan."
4. Upgrade Studio projects into **reflection cards** with fields: AI helped with, I changed, I checked, final owner decision.
5. Add **Power Tools** as unlocked helper actions inside chat: improve prompt, ask for source, compare versions, make an agent plan.
6. Avoid public leagues, competitive leaderboards, hearts, or failure penalties. BELLA should reward curiosity and carefulness, not compulsive grinding.

### UI/UX Evaluation — Codex Notes

Codex reviewed the current user-facing surfaces after the Claude changes: `/`, `/chat`, `/learn`, `/literacy`, `/apis`, `/journey`, `/studio`, `/start`, and `/parent`.

What is working well:

- **The learning direction is now visible.** `/learn`, `/literacy`, and `/apis` clearly present AI as a skill kids practice, not just a chatbot they consume. The best current framing is "Learn the skill. Then build the thing."
- **The literacy progression has a strong spine.** Foundation → Judgment → Tools → Workflow → Agents gives kids a full mental model: what AI is, when to trust it, how to use tools, how to iterate, and how to supervise agents.
- **The API library is one of the strongest product surfaces.** Peek → Pick → Build is concrete, repeatable, and teaches a habit most AI-native kids will need: inspect live data before asking AI to build with it.
- **The app has useful game mechanics.** XP, badges, locked modes, and a journey map make progress visible without needing a public leaderboard. Capability unlocks fit this product better than competitive mechanics.
- **The chat empty states are moving in the right direction.** The prompts now nudge kids toward better AI use: improve a prompt, verify an answer, learn the loop, and understand agents.

What feels stale or confusing:

- **The homepage still over-indexes on modes, games, personality, and parent control.** Those are useful ingredients, but the first product impression should be the AI training loop: ask, guide, check, improve, own.
- **Navigation vocabulary is crowded.** Kids see Chat, Make, Build, Game, Music, Learn, Lessons, AI Skills, APIs, Journey, and Studio. Those are individually understandable, but the combined information architecture feels busy.
- **"Learn" means two things.** There is a Learn chat mode, a `/learn` curriculum page, and a separate `/literacy` page. The product needs one obvious path: Learn the AI skill → practice in chat/tools → save the result.
- **Studio is still mostly a gallery.** For this product, Studio should become a portfolio/reflection surface. Each saved thing should eventually capture: what I asked AI, what AI helped with, what I checked, what I changed, and what decision was mine.
- **Journey shows progress, but not enough "next best step."** It has levels, quests, literacy, powers, and badges. It should also have one dominant Up Next card so kids do not have to choose from every possible route at once.
- **The parent dashboard reads more like monitoring than learning progress.** Activity, budget, conversations, and projects are valuable, but the dashboard should lead with learning habits: prompt quality, verification, iteration, project ownership, and agent supervision.
- **Mobile navigation is thin.** The main chat links are hidden on small screens, while the mode tabs remain. A kid on mobile can switch modes but has less obvious access to Journey, Lessons, APIs, and Studio.
- **Some code/copy still carries older eras.** `wrenBuildModeStarter` keys, a SafeFamily comment in `/start`, and the homepage "game builds" note were stale. Codex cleaned those specific low-risk items and kept backward compatibility for old session keys.

Recommended next UX order:

1. **Rewrite the homepage around the training loop.** First viewport: "Kids learn to use AI well" plus the five-part loop. Move games, personality, and safety lower as supporting proof.
2. **Simplify the main navigation.** Consider four primary destinations: Chat, Learn, Build Lab, Journey. Studio can appear when unlocked. APIs can live under Build Lab or Learn until it deserves top-level space.
3. **Add an Up Next card.** Put it on `/chat`, `/learn`, and `/journey`; compute from incomplete literacy lessons, project quests, and active projects.
4. **Turn Studio into reflection cards.** Do not just save artifacts. Save the AI-use process attached to the artifact.
5. **Reframe parent dashboard around skill growth.** Keep safety/accountability, but lead with evidence of better AI habits instead of raw surveillance.
6. **Make mobile a first-class learning path.** Add a compact bottom nav or menu so the kid can reach Chat, Learn, Journey, and Studio without relying on hidden desktop links.

### External Builder Dependency Correction — Codex Notes

The product should not depend on third-party AI app builders as the normal kid workflow. External builders are useful references, but they pull Bella out of the learning environment and make the product feel like a wrapper around someone else's tool.

Current direction:

- **Build Lab belongs inside BELLA.** Lumi should help Bella define the goal, one-screen scope, data model, behavior, visual direction, and tests inside this app.
- **No external builder launchers in the kid UI.** Build and Game mode should produce internal plans and artifacts, not send kids to a separate AI builder.
- **Studio should preserve the process.** The saved artifact should eventually include what Bella asked, what AI helped with, what she checked, what she changed, and what decision was hers.
- **Implementation can arrive in stages.** First: internal Build Lab plans. Next: generated files/previews. Later: hosted/exported projects. The learning loop stays in BELLA at every stage.

### Full Experience Audit — Codex Notes

Codex audited the full experience across the public site, kid start flow, chat, curriculum, API lab, journey, studio, parent dashboard, Convex data access, and live deployment smoke checks.

#### Improvement Pass — Codex Notes

Implemented immediately after the audit:

- **Kid sessions now resolve into learner rows.** `kidSessions.start` creates or reuses a synthetic learner user linked to the selected kid profile. This lets the current user-keyed spaces, conversations, stats, projects, activity, and budget tables work for the family-code flow without a broad schema migration.
- **Chat accepts the kid-session actor.** `/chat` reads `lumiKidSession`, resolves the kid profile/user, ensures default spaces, creates conversations, shows the kid's name, passes the session token to chat/image actions, and hides Clerk account UI for kid sessions.
- **Signed-out `/chat` no longer looks broken.** A kid without a valid session now sees a clear "Enter family code" card instead of a disabled composer with no explanation.
- **Image generation and chat budget/XP now work for session kids.** The Convex chat and image actions use either Clerk identity or the kid-session actor for budget tracking, activity logging, project saving, and XP awards.
- **Parent conversation links no longer 404.** Added `/parent/conversation/[id]` as a read-only transcript view behind Clerk protection.
- **Lint noise was reduced.** Current lint has 0 errors and only generated-file/config warnings.

#### Authorization Hardening Pass — Codex Notes

Implemented after the kid-session bridge:

- **Added a shared Convex actor helper.** `convex/actors.ts` resolves the caller as either a Clerk user or a kid-session token, then exposes ownership checks for users, spaces, conversations, messages, projects, and kid profiles.
- **Hardened core user-keyed tables.** Spaces, conversations, messages, projects, gamification, budget, activity, families, kid profiles, and learner listing now verify the caller can access the target user/profile/record.
- **Threaded `sessionToken` through chat reads and writes.** `/chat` now passes the kid-session token into spaces, stats, conversation creation, message reads, user messages, image generation, and Studio saves.
- **Hardened parent transcript reads.** The parent transcript route now depends on Convex checks that verify parent access to the kid's linked learner row.
- **Kept the current schema intact.** This is a pragmatic hardening layer over the existing user-keyed data model, not a full family-scoped schema migration.

#### Kid Progress Continuity Pass — Codex Notes

Implemented after authorization hardening:

- **Journey is now kid-session aware.** `/journey` is public to the family-code flow, resolves `lumiKidSession`, and shows the active kid's XP, quests, literacy progress, powers, and badges through the hardened stats query.
- **Studio is now kid-session aware.** `/studio` is public to the family-code flow, resolves the active kid, lists that kid's projects, and passes the session token into pin/delete mutations.
- **Lesson completion works for family-code kids.** The completion button now resolves the session kid, awards XP to the linked learner row, and passes the session token into the hardened gamification mutation.
- **Coach settings work for session kids.** Settings moments now pass the session token into profile updates.
- **Signed-out lesson pages no longer show a dead completion button.** They show a clear family-code CTA before progress can be saved.
- **Global celebration toasts now follow the active kid session.** Toasts use the session kid's stats instead of only Clerk stats.

#### Coach Settings Reframe — Codex Notes

Implemented after the product framing check:

- **Removed the AI-companion framing from the main experience.** User-facing copy no longer sells "a real relationship," "Lumi's personality," catchphrases, or co-designing an AI friend.
- **Reframed unlocks as Coach Settings.** The same underlying schema fields remain for compatibility, but the product now explains these as practical AI-tool settings: better questions, concrete examples, workflow help, useful memory, and feedback directness.
- **Changed system-prompt framing.** Lumi is now described as an AI training helper/coach, not a virtual friend or sidekick relationship.
- **Changed settings modals.** Memory and feedback directness are presented as tool configuration. The old catchphrase customization is no longer triggered.
- **Updated homepage positioning.** The public copy now says kids learn to tune the tool, not befriend it.

#### Mastery Evidence Pass — Codex Notes

Implemented after the coach-settings reframe:

- **Lesson completion now requires proof of learning.** Before XP is awarded, the kid chooses one AI habit they practiced: asked better, checked it, improved it, owned it, or built with it.
- **Evidence is stored with XP events.** `xpEvents` now has optional `evidenceKind` and `evidenceText` fields for module completion records.
- **Journey shows recent learning evidence.** `/journey` now surfaces the latest completion notes so progress is tied to actual AI-use habits, not only XP totals.
- **This directly addresses XP farming.** The app still stays lightweight, but completing a lesson now asks the kid to name what they actually did.

#### Learning Progression Audit — Codex Notes

Implemented after reviewing the latest curriculum against kid-facing AI-literacy frameworks:

- **The spine is right.** BELLA's progression should stay practical: understand what AI is, learn judgment, use tools, improve outputs, own the final work, then supervise agents. That aligns with UNESCO's student framework emphasis on human-centered judgment, ethics, AI techniques, and AI system design; AI4K12's model of perception, reasoning, learning, interaction, and societal impact; and Common Sense Education's focus on AI mechanics, risks, misinformation, chatbots, and ethical use.
- **Added `L14-private-data`.** Context privacy was already mentioned, but kids need a standalone habit for hiding names, summarizing, and checking permissions before sharing files, photos, account details, school info, or someone else's private message.
- **Added `L15-ai-influence`.** This fills the missing "AI outside the chatbot" layer: recommendations, feeds, ads, flattery, and systems that steer attention or choices.
- **Added `L16-output-scorecard`.** The workflow needed a concrete kid-level checklist before kids turn in, post, send, sell, or ship AI-assisted work. The scorecard checks whether the work is right, complete, up to date, private, theirs, and tested.
- **Created a final Advanced Checks stage.** These lessons now sit after agents so the sequence ends with real-world safeguards instead of stopping at capability.
- **Added `L17-ai-skills-capstone`.** The literacy track now ends with transfer proof: the kid uses at least three AI powers on one real mini-project and explains what they checked, improved, and owned.
- **Tightened the chat coach prompt.** Lumi now quietly applies the same scorecard, private-detail habit, and "is this pushing me?" checks during normal chat instead of leaving them only in the lesson pages.
- **Added lesson-to-chat practice.** Each AI literacy lesson now has a "Practice with Lumi" step that opens chat with a lesson-specific practice prompt, so the kid can do the skill before writing the XP reflection.
- **Added free-play lesson unlocks.** Each AI literacy lesson now unlocks a reusable free-play power in chat, such as Prompt Builder, Source Checker, Privacy Shield, Agent Plan, or Output Scorecard. Lesson pages now preview the exact free-play power the kid earns by finishing that lesson.
- **Made free-play powers persistent.** Unlocked powers now live in a chat tray above the composer, so kids can use them during normal free play. Selecting a power loads its helper prompt into the composer instead of auto-sending it, which keeps the kid in control and avoids accidental mode behavior.
- **Added mastery proof for literacy lessons.** Each AI literacy practice now has lesson-specific proof criteria. The completion card requires the kid to check those criteria and write a stronger proof note before XP/unlocks are awarded, then saves the proof checks inside the learning evidence note.
- **Added misconception checks before XP.** Literacy completion now includes one kid-level scenario question per lesson. The kid has to choose the safe/correct AI habit before the proof checklist can unlock XP.
- **Added Up Next guidance.** Chat, Learn, and Journey now point to one recommended next learning move based on completed modules, so kids are not left choosing from every lesson, quest, power, and mode at once.
- **Added Build Lab v1.** `/build` now gives kids an internal structured build-plan tool: goal, audience, data, one-screen scope, behavior, style, tests, and ownership proof. Plans save to Studio as tagged Build Lab notes, so the product no longer has to send kids to an outside builder to capture the learning loop.
- **Moved API handoff into Build Lab.** API cards now send "Build with this" into `/build` with the API starter loaded into the plan instead of dumping the kid back into generic chat.
- **Extended Up Next into Studio.** Studio now shows the same recommended next learning move as Chat/Learn/Journey and marks Build Lab notes as plan-proof artifacts.
- **Made lessons action-first.** Project and AI literacy lesson pages now start with a short mission card and concrete steps. The longer reading still exists, but it is tucked behind a "read the guide if you need help" disclosure so the page feels like doing, not homework.
- **Made lesson starts interactive.** Literacy lessons now open with a skill sprint: one misconception check with instant feedback, a kid-written move, mastery checkboxes, and a proof-note starter. Project quests now open with a project sprint that asks for the tiny idea, AI's job, what to check, what to improve, and what stays the kid's. This moves BELLA closer to challenge -> try -> feedback -> improve -> proof instead of read -> reflect.
- **Added LumiAI Maker.** `/lumi` is a separate no-account coaching surface for one-off sessions with another kid: AI build helper, sandboxed live preview, previous projects in local browser storage, optional code view, share links, and HTML export. It does not save to Bella profiles, XP, Studio, or the parent dashboard, so the main training product stays clean. The kid-facing URL is `https://lumiai-maker.vercel.app/lumi`; the older `/demo` path remains only as a compatibility route.
- **Simplified the maker UX.** Removed the developer-cockpit layout, always-visible code panel, and unexplained Game/App/Fix/Coach modes. The first screen is now preview-first, with New, Projects, Share, optional View code, and one prompt box.
- **Allowed safe public data/images.** The demo AI can now use safe public HTTPS APIs and image URLs when the kid asks for them. Pokemon projects should use PokeAPI sprite URLs instead of claiming the preview cannot use network images.
- **Added API toys to LumiAI Maker.** `/lumi` now includes a kid-readable API definition plus no-key API cards for Pokemon, trivia, books, dogs, dictionary, countries, Star Wars, and recipes. Each card explains what it is good for, offers a peek link, and can start a simple project with that API context.
- **Scaled-down site direction.** The near-term product is a kid-friendly ChatGPT/Codex for making things, not a heavy training course. A kid should be able to say "make me a Pokemon battle game," watch the result appear, play it, ask for changes, save it, and share it.
- **Target maker layout.** The UI should have chat/history on the left and the live result on the right. Code is hidden by default behind "View code." Voice-to-text belongs in the composer because some 10-13 year olds may not type well yet. The interface should feel like a simple AI workbench, not a dashboard full of modes.
- **Learning through making.** The learning should happen inside the build loop: ask for something, test what AI made, notice what is wrong or missing, ask for a better version, and understand what APIs/data/code are doing because the project needs them.
- **Persistence and sharing direction.** Browser localStorage is only a temporary/no-account fallback. The real version should connect projects/tabs to a signed-in user email, restore chat history and generated results across devices, and create stable user share links for games/apps they want to send to family and friends.
- **What this is not.** Do not turn the scaled-down maker into SafeFamily, a lesson-heavy curriculum page, a dependency on Bolt/v0/other builders, or a developer cockpit. The sharp version is: a kid talks to Lumi, builds real little games/apps with AI, sees the result instantly, learns by improving it, and can save/share projects under their account.
- **Kid-AI competitor agent notes.** Current overlaps include MiniCoder, Pixel Arcade Studio, Xyplor, WildCoders, TinkerSchool, Kidgeni, StoryQuest, KoKo, and classroom incumbents like Code.org, Canva, and Adobe Express for Education. The repeated pattern: instant playable output, private-by-default sharing, parent visibility for under-13 kids, moderated galleries if any public sharing exists, and a clear stance that kids are learning to instruct/iterate with AI rather than just "learning coding."
- **Fixed stale lesson framing.** Lesson 6 no longer claims it is the final AI Literacy quest or frames unlocks as getting "all" of Lumi.
- **Updated public copy from 13 to 16 literacy lessons plus capstone.** `/`, `/learn`, `/literacy`, `/journey`, and this README now reflect the expanded track.

Research references checked:

- [UNESCO AI competency framework for students](https://www.unesco.org/en/articles/ai-competency-framework-students?hub=84624)
- [AI4K12 Five Big Ideas / K-12 AI guidelines](https://ai4k12.org/)
- [Common Sense Education AI literacy lessons for grades 6-12](https://www.commonsense.org/education/collections/ai-literacy-lessons-for-grades-6-12)

#### Competitive Research — Codex Notes

Research pass looked at AI tutor products, classroom AI platforms, AI-literacy curricula, coding/building programs, and gamified learning apps.

Market map:

- **AI tutors:** Khanmigo, Flint, Synthesis-style tutors, and similar tools focus on helping a student learn school subjects. They are strongest at hints, explanations, practice, citations, and teacher/school alignment. They are not primarily about teaching the kid how to operate AI as a tool.
- **Teacher-controlled classroom AI:** MagicSchool for Students, SchoolAI Spaces, Brisk Boost, Curipod, Snorkl, and Flint-for-schools focus on safe student AI activities, teacher dashboards, real-time feedback, and controlled prompts. Their strongest lesson for BELLA is structure: students should enter guided activities, not a blank chatbot.
- **AI-literacy curricula:** Common Sense Education, Day of AI / MIT RAISE, Code.org, AI4K12, and UNESCO provide the broad concept map: how AI works, privacy, bias, misinformation, ethics, human choice, and societal impact. They are credible references, but most are classroom curriculum rather than a daily kid product.
- **Kid AI/coding/building programs:** AI Project Academy, Koda Academy, Tynker, MIT App Inventor, Machine Learning for Kids, and similar programs win with real projects. Kids build something, present it, and keep a portfolio. This is close to BELLA's Build Lab direction.
- **Gamified learning apps:** Brilliant, Mimo, CodeCombat, and Duolingo show what keeps kids moving: short lessons, immediate feedback, visible progress, levels, streaks, and projects. The caution is that XP and streaks can become the goal unless tied to real evidence of skill.

What appears to be working:

- **Guided practice beats open chat.** SchoolAI Spaces, MagicSchool student rooms, Brisk Boost, and Snorkl all package AI into teacher-designed activities. BELLA should keep moving away from "ask anything" as the main learning unit and toward lesson-specific practice prompts, Build Lab plans, and scorecards.
- **Make thinking visible.** Snorkl's strength is that students record, draw, write, revise, and get feedback on their reasoning. BELLA should capture the kid's prompt, check, improvement, and ownership note as part of the artifact, not only the final output.
- **Projects create pull.** AI Project Academy, Tynker, MIT App Inventor, Machine Learning for Kids, Mimo, and CodeCombat all use making as the reward. BELLA should make Build Lab and Studio the center of motivation: "I made something and can explain how AI helped."
- **Immediate feedback matters.** Brilliant, Mimo, Snorkl, and CodeCombat all give fast response to each small action. BELLA's lesson pages should keep adding interactive checks instead of relying on reading plus a completion note.
- **Teacher/parent visibility is table stakes.** SchoolAI, MagicSchool, Brisk, Flint, and Snorkl all make adult oversight part of the product. BELLA should keep parent visibility, but frame it as learning evidence and coaching, not surveillance.
- **Age-specific language matters.** Common Sense and Day of AI split materials by grade bands. BELLA should continue targeting 10-13 with short sentences, concrete scenarios, and no adult product jargon.

What BELLA should avoid:

- **Being only an AI tutor.** Khanmigo/Flint are better positioned for school-subject tutoring. BELLA's sharper lane is "learn to use AI well."
- **Being only curriculum PDFs in an app.** Common Sense and Day of AI already cover curriculum. BELLA needs the practice loop: read, try with AI, check, improve, save proof.
- **Being a generic chatbot wrapper.** Blank chat is not enough for 10-13 year olds. They need prompts, choices, examples, and next steps.
- **Over-gamifying.** Duolingo-style mechanics are useful for habit, but public leaderboards, XP farming, and streak anxiety would fight the goal of thoughtful AI use.
- **Depending on outside builders.** Koda, Mimo Build, and other AI-building tools show demand, but BELLA should keep the kid inside its own Build Lab so the learning process is captured.

Product takeaways for BELLA:

1. **Own the "AI operator literacy" lane.** The pitch is not "AI tutor" or "coding class." It is "kids learn how to ask, check, improve, build, and stay in charge of AI."
2. **Turn lessons into guided activities.** The new "Practice with Lumi" bridge is the right direction. Next step: each lesson should have an embedded challenge state and simple pass criteria.
3. **Make Studio a learning portfolio.** Store final artifacts plus prompt, source/check, revision, and ownership note.
4. **Build Lab is the key differentiator.** A kid should make real small apps, API projects, posters, automations, and pitches while learning the AI-use loop.
5. **Parent dashboard should show growth.** Show evidence of skills practiced: better prompts, sources checked, safer sharing, revised outputs, and agent plans reviewed.
6. **Keep the language young but serious.** Target ages 10-13 with concrete examples: homework, friends, games, APIs, posters, family projects, buying/posting/sending decisions.

#### Agent Research Pass — Codex Notes

Two parallel Codex agents reviewed the next product risk areas:

- **Market demand testing.** There is no exact "Facebook Marketplace for apps" equivalent. The best Bella test is a parent-facing intent stack: local parent/homeschool/STEM community posts, a simple landing page, a waitlist, a refundable founder cohort, 20 parent interviews, and a 6-10 family concierge pilot before overbuilding. Strong early signal would be 15-25 qualified parent replies from a few posts, 8+ waitlist joins, 3+ booked calls, or 10-20 refundable deposits from under 200 qualified visits.
- **Validation audience.** Test parents as buyers, not kids as leads. Keep the first experiments parent-email-only, avoid directly recruiting minors, and treat any kid data as child-sensitive because the target range includes kids under 13.
- **Educational design audit.** The expert-learning review agreed the product's strongest lane is "kids learn to direct AI." The biggest risk is rewarding lesson finishing instead of demonstrated skill. That led directly to the new misconception checks before XP.
- **Recommended learning loop.** Challenge, guided try, kid move, feedback, improve, proof, unlock, transfer. Bella should keep moving lesson pages toward this loop and make free-play powers structured tools over time.

#### Traction Research — Codex Agent Notes

The traction wedge should be parent anxiety plus future-readiness, not generic AI excitement. Common Sense Media reported that 7 in 10 teens had used generative AI, while only 37% of parents whose teen used AI knew it. That gap is the pain: kids are already learning AI habits somewhere, and parents do not have a clear way to guide them.

Patterns to lift:

- **Parent trust first.** AI-for-kids products such as ThinkaBit, Big Thinkers, KidsAiTools, and LittleLit lead with safety, age fit, parent control, and structured AI literacy. Bella should make the trust layer visible without becoming a surveillance product.
- **Proof-based gamification.** Duolingo shows how streaks and social mechanics can drive behavior, but Brilliant's public positioning emphasizes great interactive learning first. Bella should keep using unlocks and progress, but tie them to proof: checked sources, better prompts, version-two improvements, Build Lab plans, and ownership notes.
- **Hands-on creation.** Tynker-style learning works because kids make things through stories, games, and projects. Bella's equivalent is not "learn coding"; it is "learn AI by building useful, explainable things."
- **Specific searchable outcomes.** Outschool's growth pattern suggests parents respond to concrete outcomes and trusted formats. Bella should package tests as specific offers: "7-Day AI Skills Challenge," "First AI Project," or "AI Literacy Night," not just "an AI app for kids."
- **Fake-door validation.** Before building more, test specific CTAs: waitlist, refundable pilot deposit, parent feedback call, parent guide download, and 7-day challenge signup.

Best channels for Bella:

1. **Facebook parent and homeschool groups.** This is the closest app version of a Facebook Marketplace demand test. Post the problem and pilot ask, not a polished startup pitch.
2. **Local parent communities.** PTA groups, homeschool co-ops, library STEM clubs, scout/sports parent chats, after-school directors.
3. **Short-form demos.** Show a kid using AI well: asking a better question, checking a claim, improving a project, explaining what stayed theirs.
4. **Teacher/homeschool facilitator pack.** A free "First AI Project" or "AI Literacy Night" kit may spread faster than a consumer app link.
5. **Landing page offer tests.** Test three offers side by side: AI Safety Starter, 7-Day AI Skills Challenge, Build Lab for Kids.

Positioning to test:

- **Best wedge:** "Bella teaches 10-13 year olds how to use AI without becoming dependent on it."
- **Sharper promise:** "Your kid learns how to ask AI better questions, check its answers, protect private info, build small projects, and explain what they made."
- **Differentiator:** "Most AI tools give kids answers. Bella teaches kids how to think with AI, verify it, and make something real."

Parent post hooks to test:

- "My 11-year-old is going to use AI whether I like it or not. I'm building a kid-safe way to teach them how to use it without blindly trusting it."
- "Would you let your 10-13 year old use AI if they first had to learn privacy, fact-checking, prompt habits, and when not to use it?"
- "AI literacy for middle schoolers: not cheating, not chatbot babysitting, not coding bootcamp. Just practical skills for the world they're growing up in."
- "I'm testing a 7-day AI skills challenge for kids ages 10-13. Parent gets a short proof report after each lesson. Looking for 10 families."
- "Most kids learn AI from random apps or classmates. Bella gives them a safer path: ask, check, improve, explain."

30-day validation plan:

1. **Week 1: landing page and posts.** Build one parent-facing page with three offers: AI Safety Starter, 7-Day AI Skills Challenge, and Build Lab for Kids. Add CTAs for waitlist, $10 refundable pilot deposit, and parent feedback call. Post three copy variants in parent/homeschool groups.
2. **Week 2: interviews and observation.** Run 10 parent interviews and 5 kid sessions. Ask what the kid uses AI for, what scares the parent, what school says, and whether they would pay for guided AI literacy.
3. **Week 3: live pilot.** Host a free "First AI Project" pilot for 5-10 families. Have each kid complete one literacy lesson and one Build Lab artifact. Send parents a proof report: what the kid made, what AI helped with, what they checked.
4. **Week 4: ask for commitment.** Test $19-$39 early access, a $49 family pilot, or a homeschool pod license. Ask for referrals directly: "Do you know another parent worried about AI at school?"

Demand thresholds:

- **Strong signal:** 100+ qualified parent emails in 30 days, 10+ deposits or paid commitments, 30%+ of interviewed parents say the problem is urgent this school year, 50%+ of pilot kids complete a second session without parent pushing, and 25%+ of pilot parents refer another parent.
- **Weak signal:** "Cool idea" comments without emails, kids only using free play and skipping lessons, parents only wanting a free guide, or early interest mostly coming from tech-founder friends rather than normal parents/homeschoolers.

What to avoid:

- Do not position Bella as "ChatGPT for kids." It sounds risky and generic.
- Do not sell "AI tutor" first. That is a crowded trust lane.
- Do not rely on Product Hunt/startup audiences as the main validation channel. Parents of 10-13 year olds are the buyer.
- Do not over-index on streaks, badges, or leaderboards. Bella should reward proof of learning.
- Do not promise "your kid will get ahead with AI" unless the sentence also includes safely, critically, and independently.
- Do not depend on external builders. Bella's edge is internal learn-by-doing.

Traction research references:

- [Common Sense Media generative AI teen report](https://www.commonsensemedia.org/sites/default/files/research/report/2024-the-dawn-of-the-ai-era_final-release-for-web.pdf)
- [Duolingo FY2024 annual report](https://duolingo.gcs-web.com/static-files/d0adccff-bfe0-4d10-a5bc-f116d746afd2)
- [Brilliant About](https://brilliant.org/about/)
- [Tynker Schools](https://www.tynker.com/school/)
- [ThinkaBit](https://thinkabit.app/)
- [Big Thinkers](https://www.bigthinkers.ai/)
- [KidsAiTools](https://www.kidsaitools.com/en)
- [LittleLit AI press release](https://www.pr.com/press-release/944073)
- [TechCrunch on Outschool growth](https://techcrunch.com/2020/09/18/outschool-newly-profitable-raises-a-45m-series-b-for-virtual-small-group-classes/)
- [Future Foundry fake-door testing](https://www.future-foundry.io/experiments/fake-door)

Competitive references checked:

- [Khanmigo](https://www.khanacademy.org/khan-labs)
- [MagicSchool for Students](https://www.magicschool.ai/magicstudent)
- [SchoolAI Spaces](https://schoolai.com/products/spaces)
- [Snorkl](https://help.snorkl.app/en/articles/12615061-what-is-snorkl)
- [Brisk Teaching / Brisk Boost](https://help.briskteaching.com/hc/en-us/articles/38789659161364-What-is-Brisk-Teaching)
- [Flint K12](https://flintk12.com/)
- [Day of AI / MIT RAISE](https://dayofai.org/curriculum/)
- [Code.org AI education](https://code.org/ai?trk=public_post-text)
- [AI Project Academy](https://www.aiprojectacademy.com/)
- [MIT App Inventor](https://outreach.mit.edu/program/mit-app-inventor/)
- [Brilliant](https://brilliant.org/)
- [Mimo](https://mimo.org/mimo-coding-app)
- [CodeCombat](https://codecombat.zendesk.com/hc/en-us/articles/1500009108462-What-is-CodeCombat)

Current remaining findings:

1. **Build Lab still needs previews and project lifecycle.** The first route now creates and saves structured plans, but it does not yet generate files, show a running preview, version changes, or track a plan from idea to shipped project.
2. **Studio needs to become a fuller learning portfolio.** Build Lab plans are tagged and filterable, but image projects and saved notes should also capture what I asked AI, what AI helped with, what I checked, what I changed, and what decision was mine.
3. **The parent dashboard should lead with skill growth.** Activity, budget, transcripts, and projects matter, but the dashboard should foreground learning habits: prompt quality, checking, improving, ownership, privacy, and agent supervision.
4. **The legacy `/claim` flow still conflicts with the family-code flow.** `/claim` asks for a 6-digit join code, while the current parent setup produces a 6-character family code. Pick one kid access story.
5. **Mobile navigation is too thin for the full learning loop.** A kid should be able to reach Chat, Learn, Build Lab, Journey, and Studio from a compact mobile nav.
6. **Lower-traffic helper functions still deserve an auth review.** The core chat/progress/project path is hardened; future generated artifact routes and legacy helpers should keep using the actor resolver pattern.

Recommended build order:

1. **Turn Studio into reflection cards.** Attach the AI-use process to each saved artifact, starting with Build Lab plans and image projects.
2. **Add Build Lab previews/versioning.** Let a saved plan move into a simple preview or generated-file state, then keep revisions and test results attached to the same project.
3. **Rebuild parent dashboard around learning habits.** Keep accountability, but lead with evidence of better AI use instead of raw monitoring.
4. **Remove or rewrite `/claim`.** The current product shape is family-code profile selection with optional PIN, not a separate six-digit claim-code flow.
5. **Make mobile navigation explicit.** Add a compact bottom nav or menu for Chat, Learn, Build Lab, Journey, and Studio.
6. **Keep naming aligned with AI training.** The metadata now says Bella AI Training; continue removing older generic sidekick/family-safety framing as it appears.

## Architecture

- **Next.js 16.2.6** (App Router, Turbopack) on **Vercel**
- **Convex** for the database + live-streaming chat (assistant tokens are written into a Convex document; Convex live queries push them to the UI in real time — no SSE plumbing needed)
- **Clerk** for auth (Bella as `learner`, Jeremiah as `parent`)
- **OpenAI** for the agent (current default configured in Convex)
- **OpenAI gpt-image-1.5** for image generation + identity-preserving edits
- **Tailwind v4** + bright-playful theme (violet/pink/amber)

## Local setup

```bash
cd /Users/jeremiahdaws/Projects/BELLA
cp .env.example .env.local
# Fill the placeholders in .env.local

# Boot Convex dev (creates a project + writes NEXT_PUBLIC_CONVEX_URL into .env.local on first run)
npx convex dev

# In a second terminal:
npm run dev
```

Open <http://localhost:3000>. Sign up with Jeremiah's email first (auto-promotes to `parent` via PARENT_EMAIL). Sign up with Bella's email second (auto-assigned `learner`).

## Modes

The chat modes are selectable via top tabs:

| Mode | What it does |
|------|--------------|
| **Chat** | Open-ended. Whatever's on her mind. |
| **Build** | Creates Build Lab plans for tiny apps: goal, screen, behavior, data, style, and tests. |
| **Learn** | Walks through curriculum modules — prompt basics, Apps Script, first business, etc. |
| **Make** | Generates images via gpt-image-1.5; can edit a photo she uploads. |
| **Game** | Designs a playable browser game as an internal Build Lab spec. |
| **Music** | Helps with theory, structure, chord progressions, and feedback without writing songs for her. |

Switching mode starts a fresh conversation so context stays clean.

## Curriculum

Lives in `curriculum/` as markdown. The `/learn` route reads the project quests; `/literacy` reads the AI literacy sequence.

AI literacy progression:

1. Foundation — what AI is, tokens, hallucinations
2. Judgment — search vs AI, when not to use it, better prompts, context, sources
3. Tools — APIs, files, code, images, and live data
4. Workflow — iterate, own the final work, use ask/guide/check/improve/own
5. Agents — AI that plans, uses tools, and needs supervision
6. Advanced checks — private data, AI influence, and the output scorecard before real-world use
7. Capstone — one real mini-project using at least three AI powers

Project quests:

1. Prompting basics — how words shape what AI makes
2. First web app — plan a tiny Build Lab app in under an hour
3. First API app — make an app talk to live data
4. First automation — Google Apps Script for one annoying task
5. First image — make a poster, refine the prompt
6. First business pitch — what makes a $5 thing worth $5
7. First customer — sell the thing

## Parent dashboard

`/parent` is gated to the email in `PARENT_EMAIL`. Shows:
- Recent conversations (read-only, full transcripts)
- Daily activity summary cards
- Projects Bella saved
- Budget meter — Anthropic + OpenAI spend MTD vs cap

## Cost ceiling

The `budgetUsage` table tracks monthly token spend. The agent reads remaining-pct on each turn; under 20% it tells her honestly and offers smaller versions of expensive asks.

## Hosting

Vercel free tier for the frontend + Convex serverless for the backend. No domain yet — use the auto Vercel subdomain until Bella picks one.

## Sibling repos

- **JARVIS** — Jeremiah's (Telegram bot, local Mac)
- **ANNA** — Michelle's (Telegram bot, local Mac)
- **MOZART** — Andrew's (Telegram bot, local Mac)
- **BELLA** — Bella's (web app, hosted, kid-tuned) ← *this one*

Different access pattern from the siblings on purpose — Bella's Chromebook lockdown forecloses Telegram.
