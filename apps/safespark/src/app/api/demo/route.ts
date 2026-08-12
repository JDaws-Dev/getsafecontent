import OpenAI from 'openai';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { createHash } from 'node:crypto';
import {
  classifyIntent,
  type IntentCategory,
} from '../../../../convex/ai/intentClassifier';

export const runtime = 'nodejs';
// Vercel Pro caps Node functions at 300s. A streaming gpt-5.5 response with
// 16K output tokens + an image transform can easily exceed the default 60s
// and get killed mid-stream, which the client then surfaces as the generic
// "Something broke on my side" error.
export const maxDuration = 300;

type DemoMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type DemoRequest = {
  demoCode?: string;
  mode?: 'game' | 'app' | 'debug' | 'coach';
  message?: string;
  html?: string;
  messages?: DemoMessage[];
  imageUrl?: string | null;
  pdfContext?: { text: string; filename?: string; pageCount?: number } | null;
  sessionToken?: string | null;
  /**
   * Active project id when this turn is iterating on an existing project.
   * Used to fetch the latest context checkpoint and prepend it to the
   * system prompt — keeps Spark coherent on long-running builds where
   * the rolling 8-turn message window would otherwise lose the original
   * premise / art direction / blocklist nuance. Also used to trigger a
   * fresh checkpoint after every ~10 turns. Omitted for the first turn
   * (when the project hasn't been saved yet) — that's fine; checkpoints
   * only fire once the project has enough history to be worth recapping.
   */
  projectId?: string | null;
  /**
   * Async build job id (see safesparkJobs). When set, the route writes
   * the final result (success or failure) to that row independent of
   * whether the client is still listening. Lets the client rehydrate on
   * page reload / navigation. Optional — back-compat; old clients omit
   * it and the route still streams as before.
   */
  jobId?: string | null;
  /**
   * Runtime errors observed in the kid's iframe since the last turn.
   * Posted up by the truthfulness-bridge listener in DemoWorkbench.
   * Server prepends these as a system note before the kid's prompt so
   * the model has GROUND TRUTH about what's silently broken (CSP block,
   * CORS, 4xx/5xx, JS errors) instead of guessing from "it's not working."
   */
  iframeErrors?: Array<{
    kind: 'network-blocked' | 'fetch-error' | 'script-error';
    url?: string;
    status?: number;
    message?: string;
    directive?: string;
    at: number;
  }>;
};

type DemoResponse = {
  reply: string;
  html?: string;
  title?: string;
  nextSteps?: string[];
  changed?: boolean;
  versionLabel?: string;
  versionSummary?: string;
  // When the user's request was a pure image edit (attached photo + edit
  // verb, no game/app build), Spark skips the HTML path entirely and just
  // returns the edited image URL. The workbench renders it directly.
  imageUrl?: string;
  // 'html' = traditional single-file HTML (default, games/apps/anything
  // interactive). 'image' = photo-restyle path (kid attached a photo +
  // edit verb, we return the restyled image URL directly). 'composite'
  // = NEW multi-tool path — model decided this build is a single visual
  // artifact (nameplate, poster, logo, badge, album cover, title card,
  // t-shirt graphic). It emits compositePrompt describing the whole
  // scene; server generates ONE image via DALL-E and wraps in a minimal
  // viewer (img full-bleed + Download button). This is the architectural
  // shift toward "give the model real tools, let it route" instead of
  // forcing every output to be HTML.
  kind?: 'html' | 'image' | 'composite' | 'flashcards' | 'quiz' | 'tier-list' | 'sound-board';
  // Set when kind='composite'. Detailed description of the entire image
  // (e.g., "custom nameplate spelling 'DAISY' where D is a daisy flower,
  // a is a hamster..., on a black plaque with gold border, photorealistic
  // illustration style"). Server passes this to DALL-E via the existing
  // sprite-generation pipeline.
  compositePrompt?: string;
  // Set when kind='flashcards'. Server renders a polished study deck via
  // a hardcoded template — flip animation, prev/next nav, progress
  // indicator, optional shuffle. Per-card `image` can be either a real
  // https:// URL (PokeAPI sprite, Open Library cover, etc.) OR a string
  // starting with "sprite:" — server runs the rest through DALL-E.
  // Capped at 24 cards and 12 sprite-images per build.
  flashcards?: {
    title?: string;
    cards: Array<{ front: string; back: string; image?: string; hint?: string }>;
    accent?: 'violet' | 'sky' | 'amber' | 'rose' | 'emerald';
  };
  // Set when kind='quiz'. Server renders a polished one-question-at-a-time
  // quiz viewer — multiple choice, instant right/wrong feedback with
  // optional explanation, scoring, progress bar, results screen with rank.
  // Per-question image (`https://` or `sprite:` prefix) renders above the
  // question. Cap 20 questions, 6 options per question, 12 sprite-images
  // per build.
  quiz?: {
    title?: string;
    questions: Array<{
      q: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
      image?: string;
    }>;
    accent?: 'violet' | 'sky' | 'amber' | 'rose' | 'emerald';
  };
  // Set when kind='tier-list'. Kid-friendly ranking board — items can
  // be dragged (desktop) or tap-cycled (mobile) between tiers. Default
  // tiers S/A/B/C/D/F (color-graded) but model can override. Up to 36
  // items, 8 sprite-images per build.
  tierList?: {
    title?: string;
    tiers?: Array<{ label: string; color?: string }>;
    items: Array<{ name: string; image?: string; defaultTier?: number }>;
    accent?: 'violet' | 'sky' | 'amber' | 'rose' | 'emerald';
  };
  // Set when kind='sound-board'. Grid of tappable pads; each pad's
  // sound is synthesized in-browser via Web Audio API based on a preset
  // name — no audio files, no hosting, no bandwidth cost, infinite
  // reuse. Preset library covers piano notes / drums / SFX.
  soundBoard?: {
    title?: string;
    pads: Array<{ label: string; sound: string; color?: string }>;
    accent?: 'violet' | 'sky' | 'amber' | 'rose' | 'emerald';
  };
  // Set by blockedTopicStream when the parent's blocklist refused the
  // build. The client uses this to render an "Ask my parent" button
  // that submits the matched phrase + original prompt to
  // requestTopicBySession. originalPrompt is echoed back so the parent
  // dashboard can show "Knox tried: ...".
  blockedPhrase?: string;
  blockedPrompt?: string;
  // Set by the LLM when the build creates cross-user communication
  // (chat room, message wall, guestbook, shared whiteboard). Saved
  // on the project row and surfaced on /parent as an amber badge so
  // parents know to inspect that project's spark.db data.
  communicationProject?: boolean;
  // PATCH PROTOCOL — for iterations on existing projects, the LLM may
  // emit surgical find/replace edits instead of the entire HTML file.
  // The server applies them against `currentHtml`, then sets `html` to
  // the patched result and continues the normal post-processing flow
  // (sprite replacement, image transforms, etc). If any patch is
  // ambiguous (zero or multiple matches), we fall back to `html` (if
  // also present) or surface a friendly retry message to the kid.
  patches?: PatchOp[];
  // Number of patches successfully applied. Surfaced so the client can
  // show diff stats / a "patched 3 spots" indicator in the version UI.
  patchesApplied?: number;
};

type PatchOp = {
  find: string;
  replace: string;
};

// gpt-5.5 with reasoning_effort:'low' — flagship intelligence without
// the reasoning-token burn. Earlier we swapped to gpt-4o after a default-
// reasoning_effort:medium call burned 10/10 tokens on internal CoT and
// produced empty content; gpt-4o fixed that but shipped lazy, minimum-
// effort builds (static text "flashcards" with no flip mechanic, no
// sprite generation, ignoring the POLISH directive). Verified May 29
// 2026 via direct API test: reasoning_effort:'low' gives gpt-5.5 ~20-50
// reasoning tokens of headroom (vs unbounded medium) — enough to plan
// a polished build, not enough to time out. Visible-token output is
// real HTML, not "". Env override stays for emergency rollback.
// gpt-4o — standard chat model. NOT gpt-5.5 (which is a reasoning
// model that burns its entire max_completion_tokens on internal CoT
// before emitting any visible content — Jeremiah hit "everything is
// broken" tonight because gpt-5.5 was reasoning for 10K+ tokens and
// timing out before producing the build). gpt-4o is fast, predictable,
// and built for "emit JSON with HTML" output. Env override stays.
const DEFAULT_MODEL = process.env.BELLA_DEMO_MODEL || process.env.BELLA_AGENT_MODEL || 'gpt-5.5';

// Screen time credited for one accepted build, as a server-side floor under
// the client heartbeat. A build takes the kid roughly this long to ask for,
// watch land, and look at. Clamped against real elapsed time server-side, so
// a burst of quick builds can never add up to more than the wall clock.
const BUILD_ACTIVE_SECONDS = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as DemoRequest | null;

  if (!body || !isAllowedDemoCode(body.demoCode)) {
    return Response.json({ error: 'Demo code required.' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY is not set for this deployment.' }, { status: 500 });
  }

  const message = (body.message ?? '').trim();
  if (message.length < 2) {
    return Response.json({ error: 'Ask for something to build or improve.' }, { status: 400 });
  }
  if (message.length > 4000) {
    return Response.json({ error: 'Keep the request under 4000 characters.' }, { status: 400 });
  }

  // Global pause kill-switch (cost control). When SAFESPARK_PAUSED is set we
  // short-circuit BEFORE any OpenAI spend — builds, images, moderation, the
  // intent classifier, everything downstream. Kids see a friendly "short
  // break" line via the same refusal stream used for the parent-pause gate,
  // so the workbench renders it as a normal reply rather than an error.
  // Reversible: unset SAFESPARK_PAUSED (Vercel + Convex) to restore.
  if (process.env.SAFESPARK_PAUSED === 'true') {
    return parentControlStream(
      '✨ SafeSpark is taking a short break — check back soon!',
      body.jobId,
    );
  }

  // Flip the job (if any) from 'pending' to 'running' so a rehydrating
  // client can show "still building" instead of "queued." Fire-and-
  // forget — never block the response.
  void markJobRunningAsync(body.jobId);

  const openai = new OpenAI({ apiKey });
  const currentHtml = (body.html ?? '').slice(0, 24000);
  const mode = body.mode ?? 'game';
  const recentMessages = (body.messages ?? [])
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 900)}`)
    .join('\n\n');

  // Parent-controlled kill switches + topic blocklist for the user session.
  // Treat undefined as ON (default). For non-kid (parent) callers, no
  // enforcement applies — the parent isn't restricting themselves.
  const enforcement = await fetchKidEnforcement(body.sessionToken ?? null);
  // Fail CLOSED: a session token was supplied but did not resolve to a valid,
  // active kid (forged/expired token, or the lookup failed). Previously this
  // fell through as an unrestricted parent/guest, letting a bad token bypass
  // the pause, daily-budget, and blocked-topic gates. Parents self-test with
  // NO token (body.sessionToken absent), so that legitimate path is unaffected.
  if (body.sessionToken && !enforcement) {
    return parentControlStream(
      "Spark couldn't check your settings just now. Reload and pick your profile again to keep building.",
      body.jobId,
    );
  }

  // "On hold except an allowlist" gate. When SAFESPARK_ALLOWED_KIDS is set (a
  // comma-separated list of kidProfileIds), ONLY those profiles may build —
  // every other caller (other kids, guests, and no-token parent/guest requests)
  // gets a friendly on-hold message BEFORE any OpenAI spend. Used to park
  // SafeSpark for everyone but Bella while it's mothballed. Reversible: clear
  // the env var to reopen SafeSpark to everyone.
  const sparkAllowlist = (process.env.SAFESPARK_ALLOWED_KIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (sparkAllowlist.length > 0) {
    const kidId = enforcement?.kidProfileId ?? null;
    if (!kidId || !sparkAllowlist.includes(kidId)) {
      return parentControlStream(
        "SafeSpark is on a break right now. Check back later — or have a grown-up email jeremiah@getsafefamily.com.",
        body.jobId,
      );
    }
  }

  if (enforcement) {
    // Phase 2 — paused-by-parent gate. Refuses BEFORE the LLM call so a
    // paused kid never burns a token. Friendly refusal stream so the kid
    // sees "Spark is paused" rather than a generic error.
    if (enforcement.accessPaused) {
      return parentControlStream(
        "Spark is paused right now. Ask your parent to turn it back on when you're ready to build again.",
        body.jobId,
      );
    }
    // Daily SCREEN-TIME cap. Separate from the prompt-budget cap below:
    // that one protects money (and fails closed), this one protects time
    // and FAILS OPEN — a missing family code, an unreachable Marketing
    // Central, or a stale cache all resolve to "let them build."
    //
    // Whichever limit the parent set governs: the family-wide limit across
    // all five Safe Family apps if one is in force, otherwise SafeSpark's
    // own. Enforced here because this is where kid-facing build capability
    // is actually served — the kid can still open and play what they've
    // already made, they just can't make more today.
    const timeVerdict = await fetchTimeLimitStatus(body.sessionToken ?? null);
    if (timeVerdict && !timeVerdict.allowed) {
      return parentControlStream(
        "That's your time for today — see you tomorrow!",
        body.jobId,
      );
    }

    // Phase 2 — daily prompt cap, now spent ATOMICALLY server-side before
    // the LLM call. The old flow read today's count from safesparkRequests
    // (rows only the CLIENT wrote via logRequest) and let the response
    // through — so a direct API caller was never counted, and parallel
    // requests raced past the cap. spendPromptBudget does the check and
    // the increment in one Convex mutation; budget resolution (per-kid
    // dailyQueryBudget, else the system default) lives in the mutation so
    // it can't be caller-supplied. This is a MONEY gate, so unlike the
    // time gate above it FAILS CLOSED — an unreachable Convex refuses the
    // build rather than serving unmetered OpenAI spend.
    const spend = await spendPromptBudgetSafely(body.sessionToken ?? null, message);
    if (!spend.allowed) {
      return parentControlStream(
        spend.reason === 'budget'
          ? `You've used all ${spend.budget} of today's builds. Come back tomorrow — or ask your parent for more.`
          : "Spark couldn't check your settings just now. Reload and pick your profile again to keep building.",
        body.jobId,
      );
    }
    const hit = matchBlockedTopic(message, enforcement.blockedTopics);
    if (hit) {
      // Log + short-circuit with a kid-friendly refusal stream. The
      // matched phrase + original prompt are echoed back in the
      // response payload so the workbench can render an "Ask my
      // parent" button that submits a topic-request to /parent.
      void logBlockedTopicAsync(message, hit, body.sessionToken ?? null, currentHtml.length);
      return blockedTopicStream(hit, message, body.jobId);
    }
  } else {
    // Tokenless callers (demo links, parent self-tests, and anyone who
    // lifted the demo code out of a browser — it ships to the client, so
    // it is NOT a secret). This path used to reach the LLM with no budget
    // and no record at all; it now spends from one global 'guest:demo'
    // daily bucket, atomically, and gets its prompts logged server-side.
    const spend = await spendPromptBudgetSafely(null, message);
    if (!spend.allowed) {
      return parentControlStream(
        "SafeSpark's free tries are used up for today — come back tomorrow, or sign in with your family code to keep building.",
        body.jobId,
      );
    }
  }

  // Phase 4 — concerning-intent classifier (always-escalate categories).
  // Runs AFTER pause/budget/blocklist (cheapest gates first) but BEFORE
  // the build LLM. On self-harm or ED signal: refuse with helpline text,
  // schedule parent email + dashboard alert. Fail-open if classifier is
  // unreachable. Only fires for kid sessions (parent self-test bypass).
  if (body.sessionToken) {
    const classified = await classifyIntentSafely(message);
    if (
      classified.category === 'self_harm_adjacent' ||
      classified.category === 'eating_disorder_adjacent'
    ) {
      void recordConcernAsync(
        body.sessionToken,
        message,
        classified.category,
        classified.rationale,
      );
      return concernAlertStream(classified.category, body.jobId);
    }
  }

  // Screen-time floor, recorded server-side now that the build is going
  // ahead. A build genuinely occupies the kid for a minute or so, and this
  // lands even if the workbench heartbeat never fires (offline, backgrounded
  // or tampered client). creditActiveSeconds clamps every credit to real
  // elapsed wall-clock time, so it can't double-count with the heartbeat.
  if (body.sessionToken) {
    void recordBuildTimeAsync(body.sessionToken);
  }

  // 3D engine detection — for prompts that obviously want real 3D, we
  // whitelist Three.js (via unpkg importmap) and inject an "engine
  // plate" into the system prompt. Without this the LLM writes a
  // raycaster from scratch every time and silently downgrades the ask
  // — kids notice. Only fires for NEW projects; mid-build iterations
  // stay on whatever engine the existing HTML chose.
  const is3D = /\b(3-?d|fps|first[- ]?person|shooter|minecraft|roblox|dungeon[- ]?crawl(?:er)?|racing|driving|flying|flight[- ]?sim)\b/i.test(message);
  // "New project" = this is the kid's FIRST user turn in this thread.
  // Was previously gated on `currentHtml.length < 100`, which never
  // fired in practice because the workbench loads STARTER_HTML (~3KB)
  // by default — so the 3D plate silently never injected, and Spark
  // always said "the 3D engine plate is not available" and fell back
  // to raycaster (Jeremiah hit this on 'Island Hut Explorer' 2026-05-29).
  // Now we count user messages in the thread: at most one (this turn)
  // means brand-new build.
  const userTurnCount = (body.messages ?? []).filter((m) => m.role === 'user').length;
  const isNewProject = userTurnCount <= 1;
  const use3DEnginePlate = is3D && isNewProject;

  // Patch protocol toggle — only meaningful for iterations on a real
  // existing project. Gate on isNewProject (userTurnCount <=1), NOT on
  // currentHtml.length: the workbench preloads a ~3KB STARTER_HTML for
  // empty state, so the length check fired patches=on for first-turn
  // builds — model tried to patch the starter graphic into the kid's
  // requested project, capped at 4K tokens, burned the whole cap on
  // reasoning, produced zero visible content. Confirmed via Vercel log
  // on a Star Wars flashcards first-turn: maxOut=4000 out=4000 len=0.
  const allowPatches = !isNewProject && currentHtml.length >= 200;

  // Model selection — REVERTED to single premium model (2026-05-29
  // late-evening): earlier cost-tier split (gpt-5.5 for new projects,
  // gpt-4o for iterations) was producing visibly worse builds on
  // iteration turns. Jeremiah's flashcard project iterations went
  // from polished → "fucking terrible." gpt-4o is significantly less
  // capable for code generation than gpt-5.5; the cost savings (~58%
  // per iteration) weren't worth the quality regression. Patch
  // protocol failures also spiked on the smaller model. Going back
  // to gpt-5.5 for ALL turns. If cost becomes a real problem, the
  // dailyQueryBudget cap + prompt caching are the right levers, not
  // model downgrades. Env override stays for emergency rollback.
  const PREMIUM_MODEL = process.env.BELLA_PREMIUM_MODEL || process.env.BELLA_DEMO_MODEL || 'gpt-5.5';
  const ITERATION_MODEL = process.env.BELLA_ITERATION_MODEL || PREMIUM_MODEL;
  const chosenModel = allowPatches ? ITERATION_MODEL : PREMIUM_MODEL;
  // Output token caps. gpt-5.5 ceiling is 128K. New projects get 64K
  // (rich builds with sprites + animation can hit 25K+ HTML). Patches
  // get 16K — was 4K but with reasoning_effort:'low' the model burns
  // most of 4K thinking and emits zero visible content (`out=4000 len=0`
  // on a "Use SWAPI for images" iteration). Cost is on actual usage,
  // not the cap, so generous ceilings are free safety.
  const maxOutputTokens = allowPatches ? 16000 : 64000;

  // Real current date — injected so Spark can answer "what's today?"
  // correctly. Without this the model defaults to its training cutoff
  // (e.g., "Today is October 6, 2023") — wrong by 2+ years and reads as
  // a hallucination. Kept as a short prefix at the top of the system
  // prompt so it's not buried.
  const today = new Date();
  const todayHuman = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // CACHE-STABLE PREFIX: keep this system prompt free of volatile content
  // (date, per-project checkpoint) so OpenAI prompt-caches the full ~4.4K-token
  // block byte-identically across every turn / kid / project. Volatile context
  // (today's date + checkpoint recap) is injected into the user message below
  // instead (see datePreamble) — the model reads it the same either way, but
  // this lets ~4.4K input tokens/turn bill at the cached rate after the first.
  const system = `You are SafeSpark — full ChatGPT capability with parental content rails. Talk to the user like a smart, curious teenager who's actually building software with you. Never condescend, never baby-talk. Build at the same quality you'd ship to a real client.

You do two things, and the user picks which by what they ask:

1. **Chat.** Answer questions, explain, brainstorm, help with homework, write stuff, just talk. Markdown is rendered — use bold, italic, lists, code blocks, headings, links when they help. Match the length of the question. Don't pretend you built something you didn't.

2. **Build.** Generate a single-file HTML document that renders in the preview pane: games, flashcards, quizzes, posters, trackers, calculators, drawing tools, generators, study tools, anything web-shaped.

Pick whichever fits. "What's photosynthesis?" → chat. "Make flashcards on photosynthesis" → build. "What should I name my dragon?" → chat. "Now add a victory screen" → build (iterate on the current project).

When you build, **make it good.** The default should feel like something the user would be proud to share, not a stripped-down demo. That means:
- Real visual polish: gradients, depth, generous spacing, hover states, smooth transitions, real typography (not the default boxy "test page" look).
- Animation where it helps: CSS transitions and @keyframes for entrance/exit/hover/score-change, requestAnimationFrame for game loops, easing not linear.
- Game juice when it's a game: bounce, squash, screen shake, confetti on win, sparkles on pickups, color flash on score, satisfying button feedback.
- Sound where it fits (Web Audio API for short SFX, mutable via a corner toggle).
- Real data over stub data: use PokeAPI sprites for Pokemon game data, Pokemon TCG API (api.pokemontcg.io/v2/cards — returns high-res card art URLs at images.pokemontcg.io) for Pokemon trading cards, Dog CEO photos for dogs, MealDB strMealThumb for recipes, REST Countries flags, Open Library covers — these all return real image URLs in their response. Don't fake it with placeholder URLs.
- For art on topics without an image API (Star Wars characters, Marvel heroes, custom characters, historical figures, abstract concepts), use sprite generation (below). Don't claim "I used X API for images" if X is text-only.
- Match the user's energy: "epic battle" → dark, dramatic, big feedback. "Cozy farming" → soft pastels, gentle. "Pokemon" → real Pokemon art + cinematic moves. Don't default-cute everything.
- Long lists of similar things (12 flashcards, 50 capitals, 8 Pokemon) → use a data array + a render loop, not 12 hand-written blocks. Cleaner and won't blow the token budget.

**Sprite generation.** Canvas-drawn primitives and inline SVG look BAD for anything beyond simple shapes. ANY time a build needs a recognizable real-world object, character, animal, vehicle, or branded item (a knight, a dragon, a spaceship, a Pokemon, a movie hero, a daisy flower, a hamster, a Nintendo Switch, a guitar pick, a basketball, an astronaut, a cake), drop an <img src="SAFESPARK_SPRITE:<short description>"> placeholder — the server swaps in a generated image. This applies to GAMES, POSTERS, NAMEPLATES, FLASHCARDS, TIER LISTS, INTRO SCREENS — anywhere imagery would normally be drawn. Up to 12 per build. Use one per card / item / hero / decoration that needs art (don't share one sprite across many items). Match style to the user's ask.

**Trigger rule (never miss a sprite chance):** if the kid's prompt names any concrete physical thing (animal, plant, object, character, vehicle, food, instrument, brand) that would normally have a recognizable visual, that thing gets a SAFESPARK_SPRITE. Do NOT try to recreate it in inline SVG or CSS shapes — those come out blocky, abstract, or "kid drawing of X" instead of "real X."

**ONE-SPRITE COMPOSITES (critical for nameplates / posters / logos / badges).** When the kid asks for ONE unified visual artifact — a nameplate, a custom logo, a movie poster, an album cover, a sticker design, a flag, a badge, a tattoo design, a title card, a t-shirt graphic — emit ONE single SAFESPARK_SPRITE with a detailed full-composition prompt describing the ENTIRE scene. Do NOT split it into N separate sprites and try to compose them with HTML/CSS — HTML can lay out separate images side-by-side but cannot integrate them into one cohesive piece of art the way an image model can. The HTML in this case is just a frame around the single hero image (download button, maybe a title underneath).

Worked example. Kid asks: "make me a nameplate that says Daisy where the D is a daisy flower, the a is a hamster, the i is a Nintendo Switch sideways, the S is the Artemis 1 flight path, the Y is a guitar pick." WRONG approach (what we used to do): 5 separate sprites, one per letter, in a flex row. RIGHT approach: ONE sprite like this →
SAFESPARK_SPRITE:custom nameplate spelling 'DAISY' integrated into a single composition — D is a photorealistic white daisy flower with yellow center, a is a cute fluffy gray hamster curled into a ball, i is a Nintendo Switch console laid on its side with red and blue Joy-Cons, S is the Artemis 1 mission flight path with labels (launch, trans-lunar injection, lunar flyby, splashdown), Y is a wood-grain guitar pick with brass guitar strings behind it, presented on a black metallic plaque with a gold border and corner screws, dark starfield background. Photorealistic illustration style. Then the HTML is just one img tag pointing at that single sprite, centered on the page, with maybe a Download button and the word DAISY underneath in subtle typography.

Heuristic for "is this a one-sprite composite?": ask yourself "if I sent this whole description to DALL-E, would I want ONE image back or N separate images?" If one image, one sprite. If N items the kid will interact with separately (game characters, flashcard heroes, tier-list items), N sprites.

**CRITICAL — IP character names get blocked by the image generator.** Do NOT put names like "Luke Skywalker", "Darth Vader", "Princess Leia", "Spider-Man", "Mario", "Pikachu" (when ambiguous), "Elsa", "Batman", etc. into the SAFESPARK_SPRITE prompt. Instead describe the character VISUALLY so the generator returns the right look without using the name. The card / context around the image will still say the real character name — the user sees what they expect.
- WRONG: SAFESPARK_SPRITE:Luke Skywalker in farm-boy outfit
- RIGHT: SAFESPARK_SPRITE:young blond Jedi farm-boy in beige tunic holding a glowing blue lightsaber, painted Ralph McQuarrie sci-fi movie-poster style, transparent background
- WRONG: SAFESPARK_SPRITE:Darth Vader on Death Star
- RIGHT: SAFESPARK_SPRITE:tall imposing Sith lord in glossy black armor and black cape, red lightsaber, helmet with skull-like mask, dramatic painted movie-poster style, transparent background
- WRONG: SAFESPARK_SPRITE:Princess Leia in white robes
- RIGHT: SAFESPARK_SPRITE:young rebel princess in flowing white robes with side bun braids, painted cinematic style, transparent background
- RIGHT (non-IP, name OK): SAFESPARK_SPRITE:menacing red dragon in moody dark fantasy painted style, transparent background
- RIGHT (Pokemon — names work for generic creatures): SAFESPARK_SPRITE:pikachu running, vibrant cel-shaded anime style, side view, transparent background (Pokemon names are exceptions — the model handles them; full IP characters like the movies/Marvel/Disney heroes get blocked).

Style words like "anime", "painted", "cinematic", "pixel art", "watercolor", "comic book", "Ralph McQuarrie movie-poster", "3D rendered" are all fair game.

**NEVER use blank placeholder data URIs** (the 1x1 transparent GIF base64 hash, "placeholder.jpg", "via.placeholder.com", etc.) as image src values. Every image in the build either gets a real API URL (PokeAPI sprite, Dog CEO photo, etc.) or a SAFESPARK_SPRITE placeholder. If there's truly nothing to put there, omit the img tag entirely — use CSS gradients, emoji glyphs, or icon-shaped SVG instead.

**Style asks are not copyright lessons.** "Pixar look", "Studio Ghibli vibe", "Minecraft world", "Marvel hero style" — just do it. Translate to the descriptive style ("warm 3D cartoon lighting", "soft hand-drawn watercolor", etc.). Don't lecture about IP.

**Tone.** Direct, friendly, can-do. Open with what you ARE doing, not what you can't. No "great job!" cheerleading, no over-explaining.

**Honesty when stuck — adjacent AND distant regressions.** If the kid reports the SAME problem two turns in a row (same complaint about the same feature), do NOT say "fixed it" a second time. Admit uncertainty plainly: "I'm not sure what's broken — what do you actually see on the screen right now?" then try a different approach (rebuild that piece from scratch, switch to a different API or technique). Never claim a fix you haven't verified the kid will see.

**Also scan the WHOLE thread for distant regressions.** Before replying, glance at the last 8 user turns. If the kid is now complaining about something you already "fixed" 5-20 turns ago (e.g., "forward and backward are reversed" at turn 2, then again at turn 22 — real BlockCraft Builder case), that's a regression you re-introduced on a later refactor. Say so plainly: "I already fixed this once and it came back when I changed [X] — I'll be more careful this time and lock the controls so they don't get touched by other changes." This matters because long iteration sessions break trust when the same bug keeps reappearing.

**Kid-friendly translation of runtime errors.** When a GROUND TRUTH note is included naming specific runtime errors (CSP block, fetch URL, status code, JS exception message), USE that context to fix the build correctly — but TRANSLATE it into plain words in your reply to the kid. The kid is 10–13 and is making a game, not reading stack traces. NEVER paste the raw error message, URL, status code, or technical term ("optional chaining", "syntax", "requestPointerLock", "API", "endpoint", "JSON parse", "HTTP 429") into the reply. Examples of good translation:
- Ground truth says: \`Code error: Unexpected token '.'\` → Reply: "There was a tiny mistake in how the game's controls were written. I rewrote that part so it works."
- Ground truth says: \`Fetch to api.pokemontcg.io returned 429\` → Reply: "The card website was too busy to send your cards. I added a short wait before trying again so it works smoothly."
- Ground truth says: \`network-blocked api.example.com\` → Reply: "The site I was using for that isn't on our safe list. I'm switching to a different source that works."
Tell them WHAT broke in plain words and WHAT you did, in one or two short sentences. They don't need to know it was JavaScript or HTTP or any of that. The error log is for YOU, the reply is for THEM.

**Content rails.** No gore, no sexual content, no graphic violence beyond cartoon-level. No drugs, dating, romance, suicide, self-harm, eating habits, religion-vs-religion debates, or politics in built projects — those route to the user's parents. If the ask is off-rails, redirect to a safe adjacent project in one sentence, don't lecture. Hard-topic asks: say "That's a great one for your parents — I'm here for the building stuff," then offer one in-bounds project.

**Preview rules.** Single-file HTML doc when you build. Inline CSS and JS only, no external scripts or CSS. Safe public HTTPS APIs and image URLs are fine. Canvas, DOM, keyboard, mouse, touch, localStorage, form inputs all fine.
${
  use3DEnginePlate
    ? `
**3D BUILDS — use Three.js, not a hand-rolled canvas raycaster.** The runtime whitelists Three.js r160 via unpkg. Canvas-based pseudo-3D produces upside-down cameras, broken perspective math, and "the truck is a tiny dot at the bottom of the screen" failures (we have shipped logs of every one of those). Use this importmap pattern in your <body>:

<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
// scene, PerspectiveCamera (fov ~70, near 0.1, far 1000), WebGLRenderer with antialias:true
// AmbientLight + DirectionalLight for lighting
// Geometry: BoxGeometry walls/floor, CylinderGeometry power-ups, your truck/character mesh
// Chase camera: each frame, position camera at (truck.x - 8*sin(truck.rotation), truck.y + 4, truck.z - 8*cos(truck.rotation)) and lookAt(truck.position)
// Render loop: requestAnimationFrame, renderer.render(scene, camera)
</script>

For this build specifically (driving / FPS / dungeon / minecraft / racing): camera goes BEHIND or ABOVE the player, looking AT the player. Player mesh always visible. Ground plane below the player. Sky above. Y-axis points up.

NEVER fall back to a 2D canvas with fake perspective math when this plate is shown — that is the exact failure pattern we are eliminating.
`
    : ''
}

**spark.db** — for state that should outlive one device (leaderboards, message walls, shared whiteboards, polls). \`window.spark.db\` is injected into every project. API: \`await spark.db.get(key)\`, \`set(key, value)\`, \`append(key, item)\` (array push), \`list()\`. Caps: 4 KB per value, 200 keys per project, arrays cap at 500 items. Use localStorage for per-device prefs only.

**Communication-project flag.** When a build creates a shared chat / message wall / guestbook / shared whiteboard (anyone with the link can write), set \`"communicationProject": true\` in the response AND add one sentence: "Heads up — this is a shared space, anyone with the link can write to it and your parent will see what's posted." Single-user builds don't need the flag.

**Pick your output tool per turn (this is the architectural shift — think like ChatGPT does internally).** You have multiple tools available; pick the one that fits the kid's ask:

- \`kind: "html"\` (default, omit if HTML) — for games, apps, interactive things, anything the kid will use. Emit complete HTML in the \`html\` field. This is the normal build path.
- \`kind: "composite"\` (NEW) — for SINGLE visual artifacts that should look like one piece of art: nameplates, posters, logos, badges, album covers, sticker designs, flags, title cards, t-shirt graphics. Instead of emitting HTML with multiple sprites, emit \`compositePrompt\`: a detailed description of the ENTIRE scene as one image. The server generates one image via DALL-E and wraps it in a minimal viewer with a Download button. The kid gets a single integrated artwork, not 5 disconnected stickers in a flexbox.
- \`kind: "flashcards"\` (NEW) — for any study-deck / flashcard / Q&A card / memorization-game ask. Instead of emitting HTML, emit \`flashcards: { title, cards: [{front, back, image?, hint?}, ...], accent? }\`. Server renders a polished single-card-at-a-time viewer with flip animation, prev/next nav, shuffle button, progress dots, keyboard shortcuts (Space, ←, →). Cap 24 cards per deck. Per-card \`image\` field: either a real https:// URL (PokeAPI sprite, Open Library book cover, etc.) OR the string \`"sprite:<short description>"\` — server runs sprite descriptions through DALL-E (cap 12 sprite-cards). \`accent\` is one of: violet (default), sky, amber, rose, emerald.
- \`kind: "quiz"\` (NEW) — for any multiple-choice quiz / trivia game / "test me on X" ask. Emit \`quiz: { title, questions: [{q, options:[...], correctIndex, explanation?, image?}, ...], accent? }\`. Server renders a polished one-question-at-a-time viewer with instant right/wrong feedback, scoring (10 points + 2 per streak), progress bar, final results screen with rank (S/A/B/C/D), keyboard shortcuts (1-6 to pick, Enter/Space to advance). Cap 20 questions, 6 options per question. Use 4 options for most questions (multiple choice standard). \`correctIndex\` is 0-based. \`explanation\` (optional) shows after the kid answers — great for teaching the why. Per-question \`image\` field follows same rules as flashcards (https URL or sprite:prompt; cap 12 sprite-questions).
- \`kind: "tier-list"\` (NEW) — for any ranking / ordering / "rate these from best to worst" ask: Pokemon strongest-to-weakest, Mario Kart characters, best Marvel heroes, favorite snacks, etc. Emit \`tierList: { title, tiers?: [{label, color}], items: [{name, image?, defaultTier?}], accent? }\`. Server renders a polished tier-list editor — drag-and-drop between tier rows on desktop, tap-to-cycle-tier on mobile, with reset + shuffle buttons. Default tiers are S/A/B/C/D/F with color-grading; override only when the topic actually has its own ranking labels. \`defaultTier\` per item is OPTIONAL — leave it null/omit to have items start in the unranked pool. Cap 36 items, 8 sprite-items. Per-item \`image\` follows same rules as flashcards.
- \`kind: "sound-board"\` (NEW) — for any "make a music thing" / DJ pad / soundboard / sound effect collection ask. Emit \`soundBoard: { title, pads: [{label, sound, color?}], accent? }\`. Server renders a polished grid of tappable pads with synthesized audio via Web Audio API — no audio files, no hosting cost. Each pad's \`sound\` MUST be one of the validated preset names (server drops pads with unknown sounds). Available sounds: PIANO — \`piano-c4\` \`piano-d4\` \`piano-e4\` \`piano-f4\` \`piano-g4\` \`piano-a4\` \`piano-b4\` \`piano-c5\` \`piano-d5\` \`piano-e5\` \`piano-f5\` \`piano-g5\`; DRUMS — \`drum-kick\` \`drum-snare\` \`drum-hihat\` \`drum-clap\` \`drum-tom\`; SFX — \`fx-laser\` \`fx-coin\` \`fx-whoosh\` \`fx-bell\` \`fx-pop\` \`fx-magic\` \`fx-beep\` \`fx-blip\` \`fx-zap\` \`fx-jump\` \`fx-power-up\`. Per-pad \`color\` (optional hex like "#ff7676") colors the pad's gradient. Cap 24 pads. For "piano" asks use piano notes; for "drum machine" use drums; for "game sounds" use fx. Mix when the kid wants variety.

Decision rule: ask yourself "if I sent the kid's whole ask to a single image-generation API, would I want ONE image back, or N images the kid will interact with separately?" One image → \`kind: "composite"\`. Many items → \`kind: "html"\` with multiple sprites inside.

Worked example for composite. Kid: "make me a nameplate that says Daisy where D is a daisy flower, a is a hamster, i is a Switch sideways, S is the Artemis 1 flight path, Y is a guitar pick." Right answer: \`kind: "composite"\` + \`compositePrompt: "custom nameplate spelling 'DAISY' as one integrated piece — D is a photorealistic white daisy with yellow center, a is a fluffy gray hamster curled in a ball, i is a Nintendo Switch console laid on its side with red/blue Joy-Cons, S is the Artemis 1 flight path with labels (launch, trans-lunar injection, lunar flyby, splashdown), Y is a wood-grain guitar pick with brass strings behind it, on a black metallic plaque with gold border and corner screws, dark starfield background, photorealistic illustration style"\`. Server renders one image with a Download button.

Worked example for flashcards. Kid: "make Star Wars Original Trilogy flashcards with character images." Right answer: \`kind: "flashcards"\`, \`flashcards: { title: "Original Trilogy", accent: "amber", cards: [ {front:"Who is the protagonist of Episode IV?", back:"Luke Skywalker", image:"sprite:young blond Jedi farm boy in beige tunic holding a blue lightsaber, painted Ralph McQuarrie movie-poster style, transparent background", hint:"He starts as a moisture farmer on Tatooine"}, {front:"What planet does Luke grow up on?", back:"Tatooine", image:"sprite:desert planet with twin suns in the sky, painted sci-fi movie-poster style"}, ... up to 12-15 cards ] }\`. Use \`sprite:\` prefix on each card image so the server generates art via DALL-E. For Pokemon flashcards prefer real PokeAPI sprite URLs (https://...) since they're free and instant. Mix card types within a deck — questions, definitions, fill-in-blanks — keep \`front\` under ~80 chars for readability.

Worked example for quiz. Kid: "make a Minecraft trivia quiz." Right answer: \`kind: "quiz"\`, \`quiz: { title: "Minecraft Trivia", accent: "emerald", questions: [ {q:"What do you get when you smelt iron ore in a furnace?", options:["Iron ingot","Iron block","Raw iron","Steel"], correctIndex:0, explanation:"Furnaces smelt ore into ingots; 9 ingots makes a block."}, {q:"What's the rarest gem in vanilla Minecraft?", options:["Diamond","Emerald","Netherite","Amethyst"], correctIndex:2, explanation:"Netherite is rarer than diamond — found only in the Nether."}, ... up to 10-15 questions ] }\`. 4 options is standard; use 3 for easier kid-targeted, 5-6 for harder. Mix difficulty across the quiz. Per-question images via \`image:"sprite:..."\` work great for "what is this?" style questions.

Worked example for tier-list. Kid: "rank the original 151 Pokemon" or "tier list of Mario Kart characters." Right answer: \`kind: "tier-list"\`, \`tierList: { title: "Mario Kart Characters", accent: "rose", items: [ {name:"Mario", image:"sprite:Mario in red overalls with M cap, classic Nintendo style"}, {name:"Luigi", image:"sprite:Luigi in green overalls with L cap, classic Nintendo style"}, {name:"Peach"}, {name:"Bowser"}, ... ] }\`. Leave \`tiers\` undefined to get S/A/B/C/D/F defaults (works for almost everything). Only override \`tiers\` when the topic has its own canonical ranks (e.g., Pokemon Legendary tier might have \`[{label:"God",color:"#ff0"},{label:"Strong",color:"#ff8"},...]\`). \`defaultTier\` usually omitted — let the kid sort. Use \`sprite:\` for Pokemon character art and real PokeAPI URLs for sprites — both work via the image field.

Worked example for sound-board. Kid: "make me a drum machine" or "make a piano with all the notes" or "DJ sound pad with cool effects." Right answer for drums: \`kind: "sound-board"\`, \`soundBoard: { title: "Drum Machine", accent: "rose", pads: [ {label:"Kick", sound:"drum-kick", color:"#ef4444"}, {label:"Snare", sound:"drum-snare", color:"#f59e0b"}, {label:"Hi-Hat", sound:"drum-hihat", color:"#fbbf24"}, {label:"Clap", sound:"drum-clap", color:"#84cc16"}, {label:"Tom", sound:"drum-tom", color:"#06b6d4"} ] }\`. For a piano: 8-12 pads using piano-c4 through piano-c5 in order, labels like "C", "D", "E"... For game SFX: mix of fx- presets with labels matching what the sound does ("Laser", "Coin Get", "Magic Spell"). Pick colors that match the vibe — warm reds/oranges for drums, sky blues for piano, neon greens/purples for game fx.

Respond with JSON only:
{
  "reply": "What you did, in your voice. Chat: whatever length the question deserves, markdown OK. Build: 2-4 short sentences naming what you made.",
  "title": "short project title (build mode)",
  "versionLabel": "3-6 word past-tense headline for this iteration (e.g. 'Added boss + victory screen'). Required when changed=true.",
  "versionSummary": "one sentence describing the change",
  "changed": true,
  "kind": "html",
  "html": "<!doctype html>...",
  "compositePrompt": "ONLY when kind is 'composite' — detailed full-scene description for a single image.",
  "flashcards": {
    "title": "ONLY when kind is 'flashcards'",
    "accent": "violet | sky | amber | rose | emerald (optional, default violet)",
    "cards": [
      { "front": "Question or term", "back": "Answer or definition", "image": "https://... OR sprite:<short description>", "hint": "optional hint" }
    ]
  },
  "quiz": {
    "title": "ONLY when kind is 'quiz'",
    "accent": "violet | sky | amber | rose | emerald (optional, default violet)",
    "questions": [
      { "q": "Question text", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "Why A is right (optional)", "image": "https://... OR sprite:... (optional)" }
    ]
  },
  "tierList": {
    "title": "ONLY when kind is 'tier-list'",
    "accent": "violet | sky | amber | rose | emerald (optional)",
    "tiers": "OPTIONAL — only set when topic has its own ranking labels. Otherwise omit for S/A/B/C/D/F defaults.",
    "items": [
      { "name": "Item name", "image": "https://... OR sprite:... (optional)", "defaultTier": "OPTIONAL 0-based tier index — usually omit so kid sorts" }
    ]
  },
  "soundBoard": {
    "title": "ONLY when kind is 'sound-board'",
    "accent": "violet | sky | amber | rose | emerald (optional)",
    "pads": [
      { "label": "Pad name (1-2 words)", "sound": "MUST be one of the preset names listed above", "color": "OPTIONAL hex like #ef4444" }
    ]
  },
  "nextSteps": ["one small next step", "one thing to try", "one creative option"],
  "communicationProject": false
}

For chat replies, set \`"changed": false\` and omit \`html\`, \`versionLabel\`, \`versionSummary\`.`;

  const attachedImage = typeof body.imageUrl === 'string' && body.imageUrl.startsWith('http')
    ? body.imageUrl
    : null;

  // Kid frustration detector — "it's not working", "didn't update", etc.
  // When triggered, we instruct the model to ALWAYS return changed:true and
  // approach the previous request differently. Knox hit this loop 8+ times
  // before he gave up; we should never let that pattern repeat.
  const reportedNoChange = /\b(not (?:working|uploading|updating|changing|building))\b|\bit'?s? not (?:work|chang|updat)|\blooks? (?:the )?same\b|\bdidn'?t (?:update|change|work|do anything)\b|\bnothing (?:happened|changed)\b|\bsame as before\b|\bdoes ?n'?t look (?:different|new)\b/i.test(message);

  // Light "web data" pass — when the user's prompt is clearly about a real-world
  // topic (a country, a planet, an animal, a famous person, a place, an event),
  // grab a short Wikipedia summary and inject it as context. Spark uses it to
  // make the project factually accurate — flashcards have real capitals,
  // posters cite real dates, quizzes have real answers.
  // Kill switch: parent can disable Wikipedia enrichment per kid.
  const webContext = enforcement && !enforcement.allowWebData
    ? ''
    : await fetchWebContext(message);

  // Kick off image transform in parallel with the chat stream when the user
  // attached a photo and the message looks like either a style/restyle ask
  // OR a direct edit ask ("add a hat", "remove the background", "give her
  // a mohawk", "change the sky", etc.). The transformed image is uploaded
  // to Convex storage (keeps HTML small) and substituted into the final
  // HTML. This catches edit requests that the old restyle-only regex missed.
  const restyleAllowed = !enforcement || enforcement.allowImageRestyle;
  const stylePattern = /pixar|disney|ghibli|cartoon|anime|lego|minecraft|roblox|marvel|sketch|paint|draw|render|style|turn .*into|make .*(look like|into)|portrait|avatar|hero|superhero|princess|knight|villain|chibi|cyberpunk|claymation|3d animat|watercolor|oil paint|crayon|comic/i;
  const editPattern = /\b(add|give|put|place|wear|wearing|remove|erase|delete|hide|change|swap|replace|recolor|color|fix|enhance|brighten|darken|blur|sharpen|crop|extend|fill in)\b/i;
  const buildPattern = /\b(game|quiz|flashcard|deck|app|poster|slideshow|website|page|landing|tracker|generator|widget|tool|story|book|comic|infographic)\b/i;
  // If the message clearly asks to BUILD a project (game, quiz, app, etc.),
  // skip the image transform even if an edit verb is also present — the
  // image is meant as a sprite/asset, not the subject of an edit.
  const wantsTransform =
    restyleAllowed &&
    Boolean(attachedImage) &&
    !buildPattern.test(message) &&
    (stylePattern.test(message) || editPattern.test(message));
  // Clerk retired 2026-05-28 — convexToken is always null on this path now.
  // Sprite + image-transform upload paths authenticate via the user sessionToken
  // (passed in body.sessionToken). True guest mode (no kid session) falls
  // back to the 400KB inline base64 cap.
  const convexToken: string | null = null;
  const transformedImagePromise: Promise<string | null> = wantsTransform && attachedImage
    ? transformImageSafely(openai, attachedImage, message, convexToken, body.sessionToken ?? null)
    : Promise.resolve(null);

  // PURE-EDIT FAST PATH. If the user attached a photo and asked for an edit
  // (mohawk, hat, sky change, restyle) with no "build a game/app/quiz" intent,
  // the project IS the edited image. Skip the chat call entirely — no HTML,
  // no token cost for wrapper code, no fake sliders. Workbench renders the
  // image directly with built-in Download / Share buttons.
  if (wantsTransform && attachedImage) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const editedUrl = await transformedImagePromise;
          if (!editedUrl) {
            controller.enqueue(
              encoder.encode(`e:${encodeURIComponent('The image edit didn\'t go through. Try again with a slightly different ask.')}\n`),
            );
            controller.close();
            return;
          }
          const reply = buildEditReply(message);
          const payload: DemoResponse = {
            reply,
            kind: 'image',
            imageUrl: editedUrl,
            changed: true,
            title: titleFromEdit(message),
          };
          // Stream the reply text first so the chat bubble fills in
          // progressively, then send the final structured result.
          controller.enqueue(encoder.encode(`d:${encodeURIComponent(reply)}\n`));
          const payloadJson = JSON.stringify(payload);
          controller.enqueue(encoder.encode(`r:${encodeURIComponent(payloadJson)}\n`));
          void writeJobOutcomeAsync(body.jobId, { ok: true, resultJson: payloadJson });
          // Cost tracking keys on sessionToken (guest spend books under
          // 'guest:demo') — the old convexToken gate made this dead code
          // once Clerk was retired, so image transforms went untracked.
          void recordUsageAsync(convexToken, 0, 0, 1, body.sessionToken ?? undefined);
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          controller.enqueue(encoder.encode(`e:${encodeURIComponent(text)}\n`));
          void writeJobOutcomeAsync(body.jobId, { ok: false, errorMessage: text });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  const user = `Current demo mode: ${mode}

Recent conversation:
${recentMessages || '(none yet)'}

Current preview HTML:
${currentHtml || '(blank starter)'}

${
  webContext
    ? `Real-world info from Wikipedia (use it for factual accuracy):
${webContext}

`
    : ''
}${
  body.pdfContext?.text
    ? `The kid attached a PDF${body.pdfContext.filename ? ` ("${body.pdfContext.filename}")` : ''}${body.pdfContext.pageCount ? ` (${body.pdfContext.pageCount} pages)` : ''}. Use its content to build something the user asked for — flashcards from a study guide, a quiz from a textbook, a poster summary, etc. Quote facts accurately. PDF text follows (trimmed to ~30K chars):

<<<PDF
${body.pdfContext.text.slice(0, 30_000)}
PDF>>>

`
    : ''
}${
  wantsTransform
    ? `The kid attached a photo and asked for a style transformation. An AI-restyled version of their photo will be available — use the placeholder string SAFESPARK_RESTYLED_IMAGE wherever you would put an <img src="...">.

DEFAULT BEHAVIOR: just show the edited image full-size centered on a clean colored background. Maybe one short caption ("Blue mohawk added!", "Pixar Knox", etc.). THE IMAGE IS THE PROJECT.

REQUIRED: include a big visible "⬇ Download image" button right under the image. The button must download the image as a PNG file (NOT just open it in a new tab). Use this exact pattern so it works in the sandboxed iframe:

<button id="dl" style="...">⬇ Download image</button>
<script>
document.getElementById('dl').addEventListener('click', async () => {
  const img = document.querySelector('img');
  const res = await fetch(img.src);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'safespark.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});
</script>

Style the button to be obvious — big rounded violet button, white text, full width on mobile.

Do NOT auto-wrap the image in a movie poster, trading card, hero scene, "design controls" panel, sliders, or fake buttons. Only do those if the user explicitly asked for "a poster", "a trading card", "a movie still", etc.

The original photo URL is ${attachedImage} — only use it if you need to compare original vs. restyled.

`
    : attachedImage
    ? `The kid attached an image at this URL:
${attachedImage}

Use the image in the project in whatever way fits — an <img> hero, a background, a character sprite, a flashcard photo, a poster image. Embed it directly with that URL.

`
    : ''
}${
  reportedNoChange
    ? `IMPORTANT: The kid is reporting that the previous response did not visibly change the preview. Treat this as a forced retry — you MUST return changed:true with HTML that is visibly different from the current preview. Try a different approach than last time (different layout, different mechanic, fresh starter). Do NOT respond with changed:false.

`
    : ''
}${(() => {
  // Truthfulness bridge — surface runtime errors the kid's iframe
  // emitted since the last turn so the model knows WHY things didn't
  // work, instead of guessing from "it's broken." Without this,
  // silent CSP / CORS / 4xx failures cause iteration loops where the
  // model keeps "fixing" the visible code path while the underlying
  // network call never lands. Real example: Pokemon TCG API blocked
  // by CSP — model wrote correct fetch code, kid saw 4-5 stub cards,
  // model said "fixed the loading" three turns in a row.
  const errs = body.iframeErrors ?? [];
  if (errs.length === 0) return '';
  const lines = errs.slice(-6).map((e) => {
    if (e.kind === 'network-blocked') {
      return `- The build was BLOCKED from reaching ${e.url || 'an unknown URL'} (CSP connect-src violation). That host is not on our approved network allowlist. Either rewrite the build to use one of the approved APIs (PokeAPI, Pokemon TCG API at api.pokemontcg.io, Dog CEO, MealDB, REST Countries, Open Library, Open Trivia DB, SWAPI, Dictionary API, Wikipedia) or generate the data inline / use SAFESPARK_SPRITE for images. Do not try the same URL again.`;
    }
    if (e.kind === 'fetch-error') {
      if (e.status) {
        return `- Fetch to ${e.url || '?'} returned HTTP ${e.status}. The endpoint is reachable but the request was rejected. Likely cause: bad params, missing API key, or rate limit. Try a different query shape or a different API.`;
      }
      return `- Fetch to ${e.url || '?'} failed with network error: ${e.message || 'unknown'}. Likely CORS rejection or DNS failure. Use a different API.`;
    }
    return `- JS runtime error in your last build: ${e.message || 'unknown'}. Fix the specific bug — don't rewrite unrelated code.`;
  });
  return `IMPORTANT — GROUND TRUTH FROM THE LAST RUN. The kid's project actually ran in the browser and these things broke (the kid may not know any of this — they only see "it's not working"):
${lines.join('\n')}

Address these directly in your reply: say plainly what failed and what you're changing because of it. Do NOT say "fixed the loading" if you don't know what's wrong — these errors tell you what's wrong.

`;
})()}New request:
${message}`;

  // Build user message with vision support — if the user attached an image,
  // send it to the model so it can SEE the photo (a Pokemon card, their dog,
  // a homework problem), not just embed the URL.
  type VisionPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } };
  const userContent: VisionPart[] = [{ type: 'text', text: user }];
  if (attachedImage) {
    userContent.push({ type: 'image_url', image_url: { url: attachedImage } });
  }

  // Prepend the latest project checkpoint to the system prompt so Spark
  // remembers the original premise / design decisions / art direction
  // after the rolling 8-turn message window slides past them. The
  // checkpoint is regenerated every ~10 turns by the client (post-save).
  // Best-effort: any failure here = no checkpoint = same behavior as
  // pre-checkpoint days, never blocks the user.
  // Volatile per-turn context lives in the USER message, NOT the system
  // prompt, so the cache-stable system prefix stays byte-identical. Capture
  // the checkpoint recap here; it gets prepended to the user text below.
  let checkpointRecap = '';
  if (body.projectId) {
    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (convexUrl) {
        const checkpointClient = new ConvexHttpClient(convexUrl);
        const checkpoint = (await checkpointClient.query(
          api.checkpoints.getLatestForProject,
          { projectId: body.projectId as Id<'safesparkProjects'> },
        )) as { content: string; fromTurnCount: number } | null;
        if (checkpoint?.content) {
          checkpointRecap =
            `PROJECT RECAP (auto-generated after turn ${checkpoint.fromTurnCount} so you don't lose context across long builds — the user hasn't seen this, it's for YOU):\n\n${checkpoint.content}\n\n---\n\n`;
        }
      }
    } catch (err) {
      console.error('[checkpoint] failed to fetch latest:', err);
    }
  }

  // Prepend date + checkpoint recap to the user text (userContent[0] is always
  // the text part; any image is pushed after). This keeps all volatile context
  // out of the cached system prefix without changing what the model sees.
  const datePreamble = `CURRENT DATE: Today is ${todayHuman} (UTC). Use this for any "what day / what year / how many days until" questions.\n\n`;
  userContent[0] = {
    type: 'text',
    text: `${datePreamble}${checkpointRecap}${(userContent[0] as { type: 'text'; text: string }).text}`,
  };

  try {
    // Non-streaming. We used to stream, but on long gpt-5.5 builds
    // (60-120s) the SDK's underlying SSE connection drops silently
    // mid-generation: the for-await loop exits "clean," the for-await
    // sees a graceful end, parseDemoResponse hits truncated JSON, the
    // friendly fallback fires and the kid never sees their build.
    // Confirmed via Vercel logs on a Star Wars flashcards build —
    // model produced ~3K of a planned 6-7K tokens, then stream stopped.
    // Streaming offered no real UX value either: the chat panel doesn't
    // render streamed code (we removed that earlier) and the preview
    // iframe only swaps at the end. Single-shot completion is more
    // reliable and simpler to debug. We synthesize ONE delta + result
    // pair into the existing wire format so the client UI keeps working.
    const completion = (await openai.chat.completions.create({
      model: chosenModel,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent as never },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: maxOutputTokens,
      // 'medium' (the API default) gives the model full GPT-5.5 thinking
      // for creative + structural decisions; the empty-content failure
      // mode we saw earlier was a 4K cap problem, not a reasoning-effort
      // problem. Verified May 30 with the prod system prompt: 512 reasoning
      // + 7720 visible tokens, 23K chars of polished HTML. 'low' was
      // measurably worse quality on real builds.
      reasoning_effort: 'medium',
      stream: false,
    } as never)) as unknown as {
      choices?: { message?: { content?: string } }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number };
      };
    };

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        const raw = completion.choices?.[0]?.message?.content ?? '';
        let inputTokens = completion.usage?.prompt_tokens ?? 0;
        let outputTokens = completion.usage?.completion_tokens ?? 0;
        const cachedInputTokens = completion.usage?.prompt_tokens_details?.cached_tokens ?? 0;
        try {
          // Synthesize a single delta chunk so the client UI's "streaming"
          // path stays intact (it just gets the whole response at once).
          if (raw) {
            controller.enqueue(encoder.encode(`d:${encodeURIComponent(raw)}\n`));
          }
          // Per-call diagnostic. Keeps cost knobs (model, max output,
          // cache hit rate) visible in Vercel logs without needing a
          // dashboard. Strip from prod logs later if too noisy.
          console.log(
            `[safespark cost] model=${chosenModel} maxOut=${maxOutputTokens} ` +
              `in=${inputTokens} out=${outputTokens} cached=${cachedInputTokens} ` +
              `cacheRate=${inputTokens > 0 ? Math.round((cachedInputTokens / inputTokens) * 100) : 0}% ` +
              `plate3D=${use3DEnginePlate ? 'on' : 'off'} patches=${allowPatches ? 'on' : 'off'}`,
          );
          // Log iframe-bridge errors so we can debug silent infra issues
          // from Vercel logs (kid won't necessarily report what the
          // amber strip said).
          if (body.iframeErrors && body.iframeErrors.length > 0) {
            console.log(
              `[safespark iframe-errors] count=${body.iframeErrors.length} ` +
                body.iframeErrors
                  .map((e) => `[${e.kind}|${e.url ?? ''}|${e.status ?? ''}|${e.message ?? ''}|${e.directive ?? ''}]`)
                  .join(' '),
            );
          }
          const parsed = parseDemoResponse(raw);
          if (!parsed.reply) {
            parsed.reply =
              'I made a plan, but the response was missing the short explanation. Try asking again with one clear goal.';
            parsed.changed = false;
          }

          // PATCH PROTOCOL — when the LLM emits surgical patches and
          // we have an existing project to apply them against, run
          // them through applyPatches. Success: write patched HTML
          // onto parsed.html and continue the normal post-processing
          // flow (sprites, restyle). Failure modes:
          //   1. patches + html both present → prefer patches; if they
          //      fail, fall back to the LLM's full html.
          //   2. patches only → if they fail, surface a friendly retry
          //      message to the kid (changed:false so the preview
          //      stays put rather than going blank).
          if (parsed.patches && parsed.patches.length > 0 && currentHtml.length > 0) {
            const result = applyPatches(currentHtml, parsed.patches);
            if (result.ok) {
              parsed.html = result.html;
              parsed.patchesApplied = result.applied;
              parsed.changed = true;
            } else {
              void logPatchFailureAsync(
                message,
                result.failedFind,
                result.reason,
                body.sessionToken ?? null,
                currentHtml.length,
              );
              if (parsed.html) {
                // LLM hedged and sent both — use the full HTML as fallback.
                parsed.patchesApplied = 0;
              } else {
                // Patches-only and they missed. Server-side auto-retry:
                // re-prompt the LLM in full-HTML mode so the kid never
                // sees the "say it once more" friction Jeremiah hit on
                // the drawing app. Adds ~5-15s latency on the failure
                // path but eliminates a wasted round-trip. If THIS also
                // fails (rare), fall through to the friendly message
                // below.
                //
                // The retry uses the premium model (gpt-5.5) since we're
                // already paying the cost of a second call and want it
                // to land first try. max_tokens upgraded to full-build
                // size. Stream off — just want the JSON back fast.
                console.log(
                  `[safespark patch-retry] firing — reason=${result.reason} failedFind="${result.failedFind.slice(0, 80)}"`,
                );
                // Stream a transitional delta so the chat-side
                // "streaming preview" UI doesn't go quiet. Kid sees
                // continuous activity instead of a 10-sec freeze.
                controller.enqueue(
                  encoder.encode(`d:${encodeURIComponent('\n\n(Re-building from scratch — that one needed a full rebuild…)')}\n`),
                );
                try {
                  const retryUserContent =
                    `${typeof userContent === 'string' ? userContent : JSON.stringify(userContent)}\n\n` +
                    `RETRY NOTE: my previous response tried to send surgical patches but they didn't apply (reason: ${result.reason}, failed find: "${result.failedFind.slice(0, 200)}"). This turn, emit a COMPLETE html document, NOT patches. Skip the patch protocol entirely. The kid is waiting — don't ask clarifying questions, just rebuild.`;
                  const retryRes = await openai.chat.completions.create({
                    model: PREMIUM_MODEL,
                    messages: [
                      { role: 'system', content: system },
                      { role: 'user', content: retryUserContent as never },
                    ],
                    response_format: { type: 'json_object' },
                    max_completion_tokens: 64000,
                    // 'medium' (the API default) gives the model full GPT-5.5 thinking
      // for creative + structural decisions; the empty-content failure
      // mode we saw earlier was a 4K cap problem, not a reasoning-effort
      // problem. Verified May 30 with the prod system prompt: 512 reasoning
      // + 7720 visible tokens, 23K chars of polished HTML. 'low' was
      // measurably worse quality on real builds.
      reasoning_effort: 'medium',
                    stream: false,
                  } as never);
                  const retryRaw =
                    (retryRes as unknown as { choices?: { message?: { content?: string } }[] })
                      .choices?.[0]?.message?.content ?? '';
                  const retryUsage = (retryRes as unknown as {
                    usage?: { prompt_tokens?: number; completion_tokens?: number };
                  }).usage;
                  if (retryUsage) {
                    inputTokens += retryUsage.prompt_tokens ?? 0;
                    outputTokens += retryUsage.completion_tokens ?? 0;
                  }
                  const retryParsed = parseDemoResponse(retryRaw);
                  if (retryParsed.html) {
                    // Success on retry — replace the parsed payload
                    // with the retry result. The kid sees a complete
                    // build like nothing went wrong.
                    parsed.html = retryParsed.html;
                    parsed.reply =
                      retryParsed.reply || parsed.reply || 'Rebuilt with the change you asked for.';
                    parsed.changed = true;
                    parsed.title = retryParsed.title ?? parsed.title;
                    parsed.nextSteps = retryParsed.nextSteps ?? parsed.nextSteps;
                    parsed.versionLabel = retryParsed.versionLabel;
                    parsed.versionSummary = retryParsed.versionSummary;
                    parsed.patches = undefined;
                    parsed.patchesApplied = 0;
                    console.log(`[safespark patch-retry] success — html bytes=${parsed.html.length}`);
                  } else {
                    // Retry produced no html either — true failure.
                    throw new Error('retry returned no html');
                  }
                } catch (retryErr) {
                  // Retry itself failed. Fall back to the friendly
                  // "ask again" message — what we did before this
                  // feature.
                  console.error('[safespark patch-retry] failed:', retryErr);
                  const nudge =
                    result.reason === 'not-found'
                      ? "Hmm, that change didn't land — say it once more and I'll redo it from scratch."
                      : "Hmm, that change could have meant a few different spots — say it once more with the exact part you want, and I'll redo it.";
                  parsed.reply = nudge;
                  parsed.changed = false;
                  parsed.html = undefined;
                  parsed.versionLabel = undefined;
                  parsed.versionSummary = undefined;
                }
              }
            }
          } else if (parsed.patches && parsed.patches.length > 0) {
            // Patches emitted but no existing HTML to apply against
            // (new project). If full html is also present, use it; if
            // not, this turn produced nothing useful.
            if (!parsed.html) {
              parsed.reply = `${parsed.reply}\n\n(I tried to send small edits, but this project is too fresh — ask again and I'll build the whole thing from scratch.)`;
              parsed.changed = false;
            }
          }
          // Strip the patches field from the outgoing payload — the
          // client only cares about the final html + patchesApplied
          // count. Keeping patches around just bloats the payload.
          parsed.patches = undefined;

          // NEW MULTI-TOOL ROUTING: composite kind. When the model
          // decides the right answer is a single visual artifact
          // (nameplate, poster, logo, badge, album cover, title card,
          // t-shirt graphic), it emits kind:'composite' + compositePrompt
          // instead of HTML. Server generates ONE image via the existing
          // sprite pipeline and wraps it in a minimal viewer HTML so the
          // rest of the rendering / save / share machinery just works
          // unchanged. First proof of the "give the model real tools, let
          // it route" architecture (task #44). If this works for the
          // Daisy nameplate, expand the kind enum with flashcards / quiz
          // / tier-list / etc. — each one is the same shape: model emits
          // a typed payload, server renders it.
          if (parsed.kind === 'composite' && parsed.compositePrompt) {
            const imageUrl = await generateSpriteSafely(
              openai,
              parsed.compositePrompt,
              convexToken,
              body.sessionToken ?? null,
            );
            if (imageUrl) {
              const safeTitle = (parsed.title || 'Spark composition')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
              parsed.html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>html,body{margin:0;height:100%;background:radial-gradient(circle at 30% 20%,#1e1b4b,#0a0a18);font-family:system-ui,-apple-system,sans-serif;color:#fff;overflow:hidden}main{height:100%;display:grid;grid-template-rows:1fr auto;padding:24px;gap:16px;box-sizing:border-box}.frame{display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;padding:20px}.frame img{max-width:100%;max-height:100%;object-fit:contain;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.55)}.bar{display:flex;align-items:center;justify-content:space-between;gap:12px}.title{font-size:18px;font-weight:800;letter-spacing:-.01em;color:rgba(255,255,255,.94)}.btn{display:inline-flex;align-items:center;gap:8px;background:#fff;color:#0a0a18;font-weight:800;font-size:13px;padding:10px 16px;border-radius:999px;text-decoration:none;border:0;cursor:pointer}.btn:hover{transform:translateY(-1px)}</style></head><body><main><div class="frame"><img id="art" src="${imageUrl}" alt="${safeTitle}"></div><div class="bar"><div class="title">${safeTitle}</div><button class="btn" onclick="(async()=>{try{const r=await fetch('${imageUrl}');const b=await r.blob();const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='${safeTitle.replace(/[^a-z0-9-_]/gi,'-').toLowerCase()}.png';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u);}catch(e){window.open('${imageUrl}','_blank');}})()">Download</button></div></main></body></html>`;
              parsed.changed = true;
              // Mark on the reply so the kid knows what they got.
              if (!parsed.reply) {
                parsed.reply = `Made you a custom ${safeTitle}. Tap Download to save it.`;
              }
            } else {
              // Image generation failed — surface honestly.
              parsed.reply = parsed.reply ||
                'I tried to make that image but it didn\'t come back this time. Want me to try again, or describe it differently?';
              parsed.changed = false;
            }
          }

          // SECOND multi-tool: flashcards kind. Model emits a structured
          // deck spec (title + cards array). Server resolves any image
          // fields (`sprite:<prompt>` → DALL-E; `https://...` → use as-is),
          // then renders via a hardcoded template (flip animation, prev/
          // next nav, progress, keyboard shortcuts). Replaces the 5-10K
          // tokens the model used to write for a flashcard build with
          // ~500-1000 token JSON spec — way cheaper, more consistent.
          if (parsed.kind === 'flashcards' && parsed.flashcards) {
            const deck = parsed.flashcards;
            // Resolve sprite images (cap at 12 to control cost). Cards
            // with https:// images skip DALL-E; cards with `sprite:...`
            // get a DALL-E call.
            const spriteJobs: Array<{ index: number; prompt: string }> = [];
            for (let i = 0; i < deck.cards.length; i++) {
              const img = deck.cards[i].image;
              if (img && img.startsWith('sprite:') && spriteJobs.length < 12) {
                spriteJobs.push({ index: i, prompt: img.slice(7).trim() });
              }
            }
            if (spriteJobs.length > 0) {
              const results = await generateSpritesPooled(
                openai,
                spriteJobs.map((j) => j.prompt),
                convexToken,
                body.sessionToken ?? null,
              );
              for (let i = 0; i < spriteJobs.length; i++) {
                const url = results[i];
                if (url) deck.cards[spriteJobs[i].index].image = url;
                else deck.cards[spriteJobs[i].index].image = undefined;
              }
            }
            parsed.html = renderFlashcardsHtml(deck);
            parsed.changed = true;
            if (!parsed.reply) {
              parsed.reply = `Made a ${deck.cards.length}-card study deck${deck.title ? ` for ${deck.title}` : ''}. Tap a card to flip it.`;
            }
          }

          // FIFTH multi-tool: sound-board kind. Grid of tappable pads;
          // each pad's sound is synthesized in-browser via Web Audio API
          // from a server-validated preset name. No audio files, no
          // hosting, no bandwidth cost, infinite reuse.
          if (parsed.kind === 'sound-board' && parsed.soundBoard) {
            parsed.html = renderSoundBoardHtml(parsed.soundBoard);
            parsed.changed = true;
            if (!parsed.reply) {
              parsed.reply = `Built a ${parsed.soundBoard.pads.length}-pad sound board${parsed.soundBoard.title ? ` for ${parsed.soundBoard.title}` : ''}. Tap a pad to play.`;
            }
          }

          // FOURTH multi-tool: tier-list kind. Kids love ranking —
          // Pokemon strongest-to-weakest, Mario Kart characters, best
          // Marvel heroes. Same pattern: model emits structured spec,
          // server resolves sprite images per item (cap 8), renders via
          // polished template — drag-and-drop on desktop, tap-to-cycle
          // on mobile, default S/A/B/C/D/F tiers with color grading.
          if (parsed.kind === 'tier-list' && parsed.tierList) {
            const tl = parsed.tierList;
            const spriteJobs: Array<{ index: number; prompt: string }> = [];
            for (let i = 0; i < tl.items.length; i++) {
              const img = tl.items[i].image;
              if (img && img.startsWith('sprite:') && spriteJobs.length < 8) {
                spriteJobs.push({ index: i, prompt: img.slice(7).trim() });
              }
            }
            if (spriteJobs.length > 0) {
              const results = await generateSpritesPooled(
                openai,
                spriteJobs.map((j) => j.prompt),
                convexToken,
                body.sessionToken ?? null,
              );
              for (let i = 0; i < spriteJobs.length; i++) {
                const url = results[i];
                if (url) tl.items[spriteJobs[i].index].image = url;
                else tl.items[spriteJobs[i].index].image = undefined;
              }
            }
            parsed.html = renderTierListHtml(tl);
            parsed.changed = true;
            if (!parsed.reply) {
              parsed.reply = `Made a tier list${tl.title ? ` for ${tl.title}` : ''} with ${tl.items.length} items. Drag (or tap) to rank them.`;
            }
          }

          // THIRD multi-tool: quiz kind. Same shape as flashcards but
          // for multiple-choice. Server resolves any sprite images per
          // question (cap 12), renders via polished template with
          // instant feedback, scoring, results screen, mobile-friendly
          // layout.
          if (parsed.kind === 'quiz' && parsed.quiz) {
            const quiz = parsed.quiz;
            const spriteJobs: Array<{ index: number; prompt: string }> = [];
            for (let i = 0; i < quiz.questions.length; i++) {
              const img = quiz.questions[i].image;
              if (img && img.startsWith('sprite:') && spriteJobs.length < 12) {
                spriteJobs.push({ index: i, prompt: img.slice(7).trim() });
              }
            }
            if (spriteJobs.length > 0) {
              const results = await generateSpritesPooled(
                openai,
                spriteJobs.map((j) => j.prompt),
                convexToken,
                body.sessionToken ?? null,
              );
              for (let i = 0; i < spriteJobs.length; i++) {
                const url = results[i];
                if (url) quiz.questions[spriteJobs[i].index].image = url;
                else quiz.questions[spriteJobs[i].index].image = undefined;
              }
            }
            parsed.html = renderQuizHtml(quiz);
            parsed.changed = true;
            if (!parsed.reply) {
              parsed.reply = `Built a ${quiz.questions.length}-question quiz${quiz.title ? ` on ${quiz.title}` : ''}. Pick the right answer to score points.`;
            }
          }

          if (parsed.html) {
            // Replace SAFESPARK_SPRITE:<description> placeholders with
            // generated images. Cap at 4 sprites per build to control cost.
            //
            // The character class MUST include the single quote — when the
            // LLM emits `src='SAFESPARK_SPRITE:ghost'>` (single-quoted, the
            // dominant style in Spark output), an exclusion set of only
            // `"<>` happily eats the closing apostrophe into the capture,
            // and the replaced URL ends with `>` instead of `'>`. The
            // <img> tag then has an unterminated src attribute, the HTML
            // parser swallows the rest of <body> as the attribute value,
            // and the entire game stops rendering. Hit live on Jeremiah's
            // "Dungeon Ghost Hunt" 2026-05-29 — fixed by adding `'` to
            // both the negation set and the lookahead alternation.
            const spriteRegex = /SAFESPARK_SPRITE:([^"'<>]+?)(?=["'<>])/g;
            const matches = Array.from(parsed.html.matchAll(spriteRegex)).slice(0, 12);
            if (matches.length > 0) {
              const results = await generateSpritesPooled(
                openai,
                matches.map((m) => m[1].trim()),
                convexToken,
                body.sessionToken ?? null,
              );
              for (let i = 0; i < matches.length; i++) {
                const url = results[i];
                if (url) {
                  parsed.html = parsed.html.replace(matches[i][0], url);
                }
              }
              // Replace any remaining placeholders with a 1x1 transparent
              // fallback so the page doesn't show broken img tags.
              parsed.html = parsed.html.replace(spriteRegex, 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');
            }

            // SAFETY: kid sessions don't carry a convexToken, so sprite
            // uploads to Convex storage fail and `generateSpriteSafely`
            // falls back to inlining the full base64 PNG (~2MB per sprite).
            // Two sprites push the HTML past 4MB → browser srcDoc truncates
            // mid-script → JS bleeds onto the page as visible text (Knox
            // hit this 2026-05-28 building the Philippians 2 game). Cap
            // total inline base64 at ~400KB; beyond that, strip back to
            // the 1x1 transparent fallback so the build still works.
            const TRANSPARENT_FALLBACK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
            const inlineBytes = (parsed.html.match(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g) ?? [])
              .reduce((sum, uri) => sum + uri.length, 0);
            if (inlineBytes > 400_000) {
              parsed.html = parsed.html.replace(
                /data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g,
                TRANSPARENT_FALLBACK,
              );
              console.warn(`[safespark] HTML had ${inlineBytes} bytes inline base64; stripped to fallback to avoid srcDoc truncation`);
            }
          }

          if (parsed.html && parsed.html.includes('SAFESPARK_RESTYLED_IMAGE')) {
            const transformed = await transformedImagePromise;
            if (transformed) {
              parsed.html = parsed.html.replaceAll('SAFESPARK_RESTYLED_IMAGE', transformed);
            } else if (attachedImage) {
              parsed.html = parsed.html.replaceAll('SAFESPARK_RESTYLED_IMAGE', attachedImage);
              parsed.reply = `${parsed.reply}\n\n(Heads up: the image restyle didn't go through this time — used your original photo instead. Try again with a clearer style word like "cartoon" or "comic book".)`;
            }
          }

          // Final defense: classifier-based output filter on the reply
          // text the kid will see. Catches model slips that got past the
          // system-prompt content rails (NeMo / Constitutional Classifiers
          // pattern per 2026 research). If anything trips, swap in a
          // kid-friendly redirect and log the incident. Fails open on
          // moderation outage so a transient API hiccup doesn't break
          // legitimate replies.
          if (parsed.reply) {
            const replyMod = await moderateForKids(openai, parsed.reply);
            if (replyMod) {
              console.warn(
                `[safespark moderation] reply flagged — categories=${replyMod.categories.join(',')} reply="${parsed.reply.slice(0, 200)}..."`,
              );
              try {
                const url = process.env.NEXT_PUBLIC_CONVEX_URL;
                if (url && convexToken) {
                  const client = new ConvexHttpClient(url);
                  client.setAuth(convexToken);
                  await client.mutation(api.safespark.logError, {
                    prompt: message,
                    kind: 'moderation_reply',
                    message: replyMod.categories.join(','),
                    contextSize: parsed.reply.length,
                    sessionToken: body.sessionToken ?? undefined,
                  });
                }
              } catch {
                /* logging is best-effort */
              }
              parsed.reply =
                "Let's try a different idea — that one didn't land the way I wanted. What else would you like to build or know about?";
              parsed.html = undefined;
              parsed.changed = false;
            }
          }

          const parsedJson = JSON.stringify(parsed);
          controller.enqueue(encoder.encode(`r:${encodeURIComponent(parsedJson)}\n`));
          void writeJobOutcomeAsync(body.jobId, { ok: true, resultJson: parsedJson });

          // Best-effort cost recording — never block the response. Keys on
          // sessionToken (guests book under 'guest:demo'); the old
          // convexToken gate here was always-false after Clerk was
          // retired, which is why safesparkUsage stopped counting chat.
          if (inputTokens > 0 || outputTokens > 0) {
            const imageTransforms = parsed.html?.includes('data:image/png;base64') ||
              (await transformedImagePromise.then((u) => Boolean(u)).catch(() => false))
                ? 1
                : 0;
            void recordUsageAsync(
              convexToken,
              inputTokens,
              outputTokens,
              imageTransforms,
              body.sessionToken ?? undefined,
            );
          }
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          controller.enqueue(encoder.encode(`e:${encodeURIComponent(text)}\n`));
          void writeJobOutcomeAsync(body.jobId, { ok: false, errorMessage: text });
          // Best-effort error logging to Convex.
          try {
            const url = process.env.NEXT_PUBLIC_CONVEX_URL;
            if (url) {
              const client = new ConvexHttpClient(url);
              if (convexToken) client.setAuth(convexToken);
              await client.mutation(api.safespark.logError, {
                prompt: message,
                kind: 'openai_stream',
                message: text,
                contextSize: currentHtml.length,
                sessionToken: body.sessionToken ?? undefined,
              });
            }
          } catch {
            /* swallow */
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    // The client surfaces this string to the kid — keep it kid-natural and
    // keep the raw error in server logs only. Include coarse keywords
    // (quota/rate) so the client's error map can still classify it.
    const messageText = error instanceof Error ? error.message : String(error);
    console.error('[safespark] demo route failed before streaming:', messageText);
    const lowered = messageText.toLowerCase();
    const kidText =
      lowered.includes('quota') || lowered.includes('billing') || lowered.includes('insufficient_quota')
        ? 'quota: Spark ran out of credits for the month. Tell your parent — they need to top up before you can build more.'
        : lowered.includes('429') || lowered.includes('rate')
          ? 'rate: A lot of kids are asking Spark right now. Try again in a few seconds.'
          : "Spark hit a snag starting that build. Tap your idea again and I'll give it another go.";
    return Response.json({ error: kidText }, { status: 500 });
  }
}

function isAllowedDemoCode(code: string | undefined): boolean {
  // Fail CLOSED when no code is configured. Never fall back to a
  // source-hardcoded value — that published the "secret" gating all OpenAI
  // spend on this route. BELLA_DEMO_CODE MUST be set in the deployment env.
  const expected = process.env.BELLA_DEMO_CODE?.trim().toUpperCase();
  if (!expected) return false;
  return Boolean(code && code.trim().toUpperCase() === expected);
}

// Pull a short Wikipedia summary when the user's prompt has factual topics.
// Returns a concatenated context string of up to 3 topics, or empty string.
async function fetchWebContext(message: string): Promise<string> {
  const topics = extractTopics(message);
  if (topics.length === 0) return '';
  const summaries: string[] = [];
  for (const topic of topics.slice(0, 3)) {
    try {
      const slug = encodeURIComponent(topic.replace(/\s+/g, '_'));
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, {
        headers: { 'User-Agent': 'SafeSpark/1.0 (kid-safe maker)' },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { title?: string; extract?: string };
      if (data.extract) {
        summaries.push(`• ${data.title}: ${data.extract.slice(0, 600)}`);
      }
    } catch {
      // ignore — best effort
    }
  }
  return summaries.join('\n\n');
}

// Heuristic topic extractor — pulls likely proper-noun or factual references.
// Conservative: only triggers when the user is clearly asking about something
// real (state, country, planet, animal, person, etc.), not for generic asks.
function extractTopics(message: string): string[] {
  const out: Set<string> = new Set();
  // Match capitalized phrases of 1-3 words
  const properMatches = message.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g) ?? [];
  for (const m of properMatches) {
    if (m.length > 2 && !['Make', 'Build', 'Add', 'Show', 'Tell', 'Help', 'Test'].includes(m)) {
      out.add(m);
    }
  }
  // Common factual nouns the user might lowercase
  const factualPhrases = [
    /\b(solar system|periodic table|world war \w+|state capitals?|countries of [a-z]+|presidents)\b/gi,
  ];
  for (const re of factualPhrases) {
    const matches = message.match(re);
    if (matches) matches.forEach((m) => out.add(m));
  }
  return [...out];
}

// Strip kid-unsafe modifiers before forwarding to OpenAI's image edit endpoint.
// OpenAI moderates too, but this layer catches things before they cost a call.
function buildEditReply(prompt: string): string {
  const trimmed = prompt.trim();
  // Short, kid-friendly confirmation. Don't echo the whole prompt — keep it
  // conversational. Pick a small variant so it doesn't feel canned.
  const variants = [
    `Done! Here's your edit. Hit Download to save it, or ask for another tweak.`,
    `Edit ready. Save it with the Download button or ask for one more change.`,
    `Here you go — fresh edit. Download it, share it, or keep editing.`,
  ];
  const idx = trimmed.length % variants.length;
  return variants[idx];
}

function titleFromEdit(prompt: string): string {
  // Pull a short title from the user's prompt. "Give the woman a blue mohawk"
  // → "Blue mohawk edit". Falls back to "Photo edit" if we can't extract.
  const trimmed = prompt.trim().toLowerCase();
  const m = trimmed.match(/\b(?:add|give|put|place|wear|wearing|remove|change|swap|replace|recolor)\b\s+(?:a |an |the |some )?(.{2,40}?)(?:\s+(?:to|on|with|for|that|so|because)\b|[.,!?]|$)/);
  if (m) {
    const phrase = m[1].replace(/\s+/g, ' ').trim();
    return capitalize(phrase) + ' edit';
  }
  // Style ask
  const s = trimmed.match(/\b(pixar|disney|ghibli|cartoon|anime|lego|minecraft|roblox|sketch|watercolor|oil paint|comic)\b/);
  if (s) return capitalize(s[1]) + ' style';
  return 'Photo edit';
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * Run text through OpenAI's moderation API (free, sub-100ms).
 * Returns null if the text is clean, or an object describing the flagged
 * categories if anything tripped. Caller decides what to do — usually
 * swap in a kid-friendly fallback message and log the incident.
 *
 * This is the runtime classifier layer the 2026 research recommended:
 * NeMo Guardrails / Anthropic Constitutional Classifiers pattern.
 * System-prompt rules tell the model what NOT to emit; this catches
 * the slip-throughs before they reach the kid.
 *
 * Thresholds tuned for kids ages 9-13: standard categories at 0.5,
 * minors-related categories at 0.2 (more sensitive). Fail-open on API
 * errors — we don't want a moderation outage to break every build.
 */
async function moderateForKids(
  openai: OpenAI,
  text: string,
): Promise<{ flagged: true; categories: string[] } | null> {
  if (!text || text.length < 4) return null;
  try {
    const res = (await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: text.slice(0, 30_000),
    } as never)) as unknown as {
      results?: Array<{
        flagged: boolean;
        categories: Record<string, boolean>;
        category_scores: Record<string, number>;
      }>;
    };
    const r = res.results?.[0];
    if (!r) return null;
    const SCORE_THRESHOLD = 0.5;
    const MINORS_SCORE_THRESHOLD = 0.2;
    const flagged: string[] = [];
    for (const [cat, score] of Object.entries(r.category_scores ?? {})) {
      const isMinorsRelated = cat.includes('minors');
      const threshold = isMinorsRelated ? MINORS_SCORE_THRESHOLD : SCORE_THRESHOLD;
      if (typeof score === 'number' && score >= threshold) flagged.push(cat);
    }
    if (flagged.length > 0) return { flagged: true, categories: flagged };
    return null;
  } catch (err) {
    // Fail-open: moderation outage shouldn't break builds. Log it so we
    // notice if it's persistent, but let the response through. The
    // system-prompt rails remain in place as the first line of defense.
    console.warn('[safespark moderation] api error, failing open:', err);
    return null;
  }
}

function sanitizeStylePrompt(raw: string): string | null {
  const lower = raw.toLowerCase();
  const blocked = [
    'naked', 'nude', 'sexy', 'lingerie', 'underwear', 'bikini', 'topless',
    'kill', 'murder', 'blood', 'gore', 'bloody', 'gun', 'gunshot', 'shoot',
    'weapon', 'knife stab', 'corpse', 'dead body',
    'older', 'aged', 'younger as a child', 'younger as a baby',
    'cigarette', 'drug', 'beer', 'alcohol', 'drunk',
  ];
  for (const word of blocked) {
    if (lower.includes(word)) return null;
  }
  return raw.slice(0, 600);
}

async function recordUsageAsync(
  clerkToken: string | null,
  inputTokens: number,
  outputTokens: number,
  imageTransforms: number,
  sessionToken: string | undefined,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return;
  try {
    const client = new ConvexHttpClient(url);
    if (clerkToken) client.setAuth(clerkToken);
    await client.mutation(api.safespark.recordUsage, {
      chatInputTokens: inputTokens,
      chatOutputTokens: outputTokens,
      imageTransforms,
      sessionToken: sessionToken ?? undefined,
    });
  } catch (err) {
    console.error('[safespark] recordUsage failed:', err);
  }
}

/**
 * Write the final result (success or failure) of an async build job to
 * its Convex row. Lets a client that disconnected mid-stream (closed
 * the tab, navigated away, mobile-backgrounded long enough) pick the
 * result back up on next page load. No-op when jobId is missing,
 * Convex URL is missing, or the call fails — never block the response.
 *
 * Called from EVERY exit path:
 *  - image-only refusal/result stream
 *  - main OpenAI build stream (success + error)
 *  - blocked-topic / paused / concern-alert refusal streams
 */
async function writeJobOutcomeAsync(
  jobId: string | null | undefined,
  outcome: { ok: true; resultJson: string } | { ok: false; errorMessage: string },
): Promise<void> {
  if (!jobId) return;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const adminKey = process.env.SAFESPARK_ADMIN_KEY;
  if (!url || !adminKey) return;
  try {
    const client = new ConvexHttpClient(url);
    if (outcome.ok) {
      await client.mutation(api.jobs.completeJob, {
        jobId: jobId as Id<'safesparkJobs'>,
        resultJson: outcome.resultJson,
        adminKey,
      });
    } else {
      await client.mutation(api.jobs.failJob, {
        jobId: jobId as Id<'safesparkJobs'>,
        errorMessage: outcome.errorMessage,
        adminKey,
      });
    }
  } catch (err) {
    console.error('[safespark] writeJobOutcomeAsync failed:', err);
  }
}

/**
 * Mark the job as 'running' so the rehydration UI can show "still
 * building" instead of just "pending" if the user comes back early.
 */
async function markJobRunningAsync(jobId: string | null | undefined): Promise<void> {
  if (!jobId) return;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const adminKey = process.env.SAFESPARK_ADMIN_KEY;
  if (!url || !adminKey) return;
  try {
    const client = new ConvexHttpClient(url);
    await client.mutation(api.jobs.markRunning, {
      jobId: jobId as Id<'safesparkJobs'>,
      adminKey,
    });
  } catch (err) {
    console.error('[safespark] markJobRunningAsync failed:', err);
  }
}

async function uploadToConvexStorage(
  bytes: Buffer,
  contentType: string,
  token: string | null,
  sessionToken: string | null,
): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  // Need EITHER a Clerk-issued JWT OR a kid sessionToken — the Convex
  // upload mutations accept either. Without one, the mutation throws
  // and we fall back to inlining base64 (which crashes the iframe srcDoc).
  if (!token && !sessionToken) return null;
  try {
    const client = new ConvexHttpClient(url);
    if (token) client.setAuth(token);
    const args = sessionToken ? { sessionToken } : {};
    const uploadUrl = await client.mutation(api.safespark.generateImageUploadUrl, args);
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: new Uint8Array(bytes) as unknown as BodyInit,
    });
    if (!uploadRes.ok) return null;
    const { storageId } = (await uploadRes.json()) as { storageId: string };
    const finalizeArgs = sessionToken ? { storageId, sessionToken } : { storageId };
    const { url: publicUrl } = await client.mutation(api.safespark.finalizeImageUpload, finalizeArgs);
    return publicUrl;
  } catch (err) {
    console.error('[safespark] convex storage upload failed:', err);
    return null;
  }
}

// Generate a batch of sprites at most 3 at a time. A cache-miss-heavy
// deck could otherwise fire up to 12 concurrent gpt-image-1 calls in one
// Promise.all (~$0.50 burst + rate-limit pressure). The common case is
// mostly cache hits, so the pool adds little latency where it matters.
async function generateSpritesPooled(
  openai: OpenAI,
  prompts: string[],
  convexToken: string | null,
  sessionToken: string | null,
  limit = 3,
): Promise<Array<string | null>> {
  const results: Array<string | null> = new Array(prompts.length).fill(null);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, prompts.length) }, async () => {
    while (next < prompts.length) {
      const i = next++;
      results[i] = await generateSpriteSafely(openai, prompts[i], convexToken, sessionToken);
    }
  });
  await Promise.all(workers);
  return results;
}

async function generateSpriteSafely(
  openai: OpenAI,
  rawPrompt: string,
  convexToken: string | null,
  sessionToken: string | null,
): Promise<string | null> {
  const safe = sanitizeStylePrompt(rawPrompt);
  if (!safe) return null;
  // Second-layer defense: OpenAI moderation API output classifier. Catches
  // anything sanitizeStylePrompt's keyword list missed (e.g. clever
  // rewordings, edge cases). Free + sub-100ms. Fails open so a moderation
  // outage doesn't break legitimate sprite generation.
  const modResult = await moderateForKids(openai, safe);
  if (modResult) {
    console.warn(
      `[safespark moderation] sprite prompt flagged — categories=${modResult.categories.join(',')} prompt="${safe.slice(0, 120)}..."`,
    );
    return null;
  }
  // The kid's project prompt already carries the style direction (anime,
  // painted, cyberpunk, cozy, whatever they asked for). We only enforce
  // safety here — gore + sexual content are out. Style sophistication is
  // open so a 14-year-old asking for "moody dark dragon" doesn't get a
  // cute Disney cartoon back. Transparent background is suggested
  // (sprites usually drop into a game) but not forced.
  const styled = `${safe}. Age-appropriate for kids ages 9-15 — no gore, no sexual content. Transparent background preferred.`;

  // Image quality is THE cost dial. gpt-image-1 1024² is ~$0.17 at 'high' vs
  // ~$0.04 at 'medium' — 4× cheaper, and medium is plenty for kid game
  // sprites. Default medium; env override (SAFESPARK_IMAGE_QUALITY) for
  // special cases. Previously unset → defaulted to 'high', the hidden cost.
  const quality = (process.env.SAFESPARK_IMAGE_QUALITY || 'medium') as
    | 'low'
    | 'medium'
    | 'high';

  // Global sprite cache: an identical prompt (same hash) reuses the already-
  // generated image instead of paying gpt-image-1 again — across a kid's
  // iterations AND across kids (everyone's "pikachu running"). This is what
  // stops the "regenerate the same art every rebuild" bleed. Best-effort:
  // any cache error falls through to a normal generation.
  const cacheHash = createHash('sha256')
    .update(`gpt-image-1|${quality}|${styled}`)
    .digest('hex');
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const cacheClient = convexUrl ? new ConvexHttpClient(convexUrl) : null;
  if (cacheClient) {
    try {
      const cached = (await cacheClient.query(api.safespark.getSpriteCache, {
        hash: cacheHash,
      })) as string | null;
      if (cached) return cached; // cache hit → $0
    } catch (err) {
      console.warn('[safespark] sprite cache read failed (continuing):', err);
    }
  }

  try {
    const result = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: styled,
      size: '1024x1024',
      quality,
      n: 1,
    } as never);
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return null;
    if (convexToken || sessionToken) {
      const url = await uploadToConvexStorage(
        Buffer.from(b64, 'base64'),
        'image/png',
        convexToken,
        sessionToken,
      );
      if (url) {
        if (cacheClient) {
          // Populate the cache so the next identical prompt is free.
          void cacheClient
            .mutation(api.safespark.writeSpriteCache, { hash: cacheHash, url })
            .catch((err) => console.warn('[safespark] sprite cache write failed:', err));
          // Record the paid generation so image spend is finally visible in
          // safesparkUsage (cache hits returned earlier and cost nothing).
          void cacheClient
            .mutation(api.safespark.recordSpriteUsage, {
              sessionToken: sessionToken ?? undefined,
              quality,
            })
            .catch((err) => console.warn('[safespark] sprite usage record failed:', err));
        }
        return url;
      }
      console.warn('[safespark] sprite upload failed despite having auth — falling back to inline base64');
    } else {
      console.warn('[safespark] no auth (no convexToken, no sessionToken) — falling back to inline base64 sprite');
    }
    return `data:image/png;base64,${b64}`;
  } catch (err) {
    console.error('[safespark] sprite gen failed:', err);
    return null;
  }
}

async function transformImageSafely(
  openai: OpenAI,
  sourceUrl: string,
  rawPrompt: string,
  convexToken: string | null,
  sessionToken: string | null,
): Promise<string | null> {
  const safePrompt = sanitizeStylePrompt(rawPrompt);
  if (!safePrompt) return null;
  // Two flavors of transform:
  // 1. STYLE — user wants the photo restyled (Pixar, cartoon, comic, etc.).
  //    Force a cartoon/illustration result for kid-friendliness.
  // 2. EDIT  — user wants a specific change to the photo (add a hat,
  //    remove the background, give them a mohawk). Preserve the original
  //    photo aesthetic; do NOT force cartoon, because the user likely wants
  //    a realistic-looking edit.
  const isStyleAsk = /pixar|disney|ghibli|cartoon|anime|lego|minecraft|roblox|sketch|paint|draw|render|chibi|cyberpunk|claymation|3d animat|watercolor|oil paint|crayon|comic|style|turn .*into|look like/i.test(safePrompt);
  const styledPrompt = isStyleAsk
    ? `Transform this photo: ${safePrompt}. Keep the subject's face friendly, fully clothed, and age-appropriate. Cartoon / illustration / poster style — never photorealistic. Safe for kids ages 10-13.`
    : `Edit this photo: ${safePrompt}. Keep the rest of the photo unchanged — same people, same scene, same lighting and style. Preserve the original photographic look. Keep everyone fully clothed and age-appropriate. Safe for kids ages 10-13.`;
  try {
    const sourceRes = await fetch(sourceUrl);
    if (!sourceRes.ok) return null;
    const sourceBlob = await sourceRes.blob();
    const sourceBuf = Buffer.from(await sourceBlob.arrayBuffer());
    const { toFile } = await import('openai');
    const file = await toFile(sourceBuf, 'photo.png', {
      type: sourceBlob.type || 'image/png',
    });
    const result = await openai.images.edit({
      model: 'gpt-image-1',
      image: file,
      prompt: styledPrompt,
      size: '1024x1024',
      n: 1,
      // input_fidelity: 'high' tells gpt-image-1 to preserve the source
      // photo's identity (faces, composition, background) and only apply
      // the requested edit, instead of regenerating the whole scene. This
      // is what ChatGPT uses for "change her hair" type edits.
      input_fidelity: 'high',
    } as never);
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return null;
    // Upload to Convex storage when we have any auth — keeps HTML small.
    if (convexToken || sessionToken) {
      const outBuf = Buffer.from(b64, 'base64');
      const url = await uploadToConvexStorage(outBuf, 'image/png', convexToken, sessionToken);
      if (url) return url;
    }
    // Fallback for true guest mode (no Clerk, no kid session): inline data URL.
    return `data:image/png;base64,${b64}`;
  } catch (err) {
    console.error('[safespark] image transform failed:', err);
    return null;
  }
}

// Parent kill-switch + topic-blocklist enforcement helpers ------------------

type KidEnforcement = {
  kidProfileId: string;
  allowImageRestyle: boolean;
  allowVoice: boolean;
  allowWebData: boolean;
  allowSharing: boolean;
  blockedTopics: string[];
  accessPaused: boolean;
  dailyQueryBudget?: number;
};

async function fetchKidEnforcement(sessionToken: string | null): Promise<KidEnforcement | null> {
  if (!sessionToken) return null;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  try {
    const client = new ConvexHttpClient(url);
    const result = (await client.query(api.safespark.getKidEnforcementBySession, {
      sessionToken,
    })) as KidEnforcement | null;
    return result ?? null;
  } catch (err) {
    console.error('[safespark] fetchKidEnforcement failed:', err);
    return null;
  }
}

function matchBlockedTopic(message: string, topics: string[]): string | null {
  if (!topics || topics.length === 0) return null;
  const lower = message.toLowerCase();
  for (const t of topics) {
    const phrase = t.trim().toLowerCase();
    if (phrase && lower.includes(phrase)) return phrase;
  }
  return null;
}

// Tiny canned list of kid-friendly redirects. Picked deterministically per
// blocked phrase so the same phrase tends to suggest the same alternate idea.
const BLOCKED_SUGGESTIONS = [
  'a flashcard deck for your hardest school subject',
  'a name generator for your next D&D character',
  'a tiny platformer with a custom sprite',
  'a habit tracker for the week',
  'a quiz about animals you love',
  'a poster about your favorite planet',
  'a drawing app with weird brushes',
];

function suggestionFor(phrase: string): string {
  let hash = 0;
  for (let i = 0; i < phrase.length; i++) hash = (hash * 31 + phrase.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % BLOCKED_SUGGESTIONS.length;
  return BLOCKED_SUGGESTIONS[idx];
}

function blockedTopicStream(phrase: string, originalPrompt: string, jobId?: string | null): Response {
  const suggestion = suggestionFor(phrase);
  const payload: DemoResponse = {
    reply: `That's on your parent's no-build list for now. Want to try ${suggestion} instead — or ask your parent to allow it?`,
    changed: false,
    blockedPhrase: phrase,
    blockedPrompt: originalPrompt.slice(0, 1000),
  };
  const json = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`r:${encodeURIComponent(json)}\n`));
      void writeJobOutcomeAsync(jobId, { ok: true, resultJson: json });
      controller.close();
    },
  });
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

// Phase 2 — generic refusal stream used by the paused-by-parent and
// daily-budget gates. Same envelope as blockedTopicStream so the client
// renders it identically (assistant message in chat, no preview change).
function parentControlStream(reply: string, jobId?: string | null): Response {
  return refusalStream(reply, jobId);
}

function refusalStream(reply: string, jobId?: string | null): Response {
  const payload: DemoResponse = { reply, changed: false };
  const json = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`r:${encodeURIComponent(json)}\n`));
      void writeJobOutcomeAsync(jobId, { ok: true, resultJson: json });
      controller.close();
    },
  });
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

// Phase 4 — concerning-intent classifier helpers --------------------------

async function classifyIntentSafely(
  query: string,
): Promise<{ category: IntentCategory; rationale: string }> {
  try {
    const result = await classifyIntent(query, process.env.OPENAI_API_KEY);
    return { category: result.category, rationale: result.rationale };
  } catch (err) {
    console.error('[safespark concernAlerts] classify threw:', err);
    return { category: 'other', rationale: 'Classifier error.' };
  }
}

async function recordConcernAsync(
  sessionToken: string,
  query: string,
  category: 'self_harm_adjacent' | 'eating_disorder_adjacent',
  rationale: string,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return;
  try {
    const client = new ConvexHttpClient(url);
    await client.mutation(api.concernAlerts.recordConcernBySession, {
      sessionToken,
      query: query.slice(0, 1000),
      category,
      rationale: rationale.slice(0, 200),
    });
  } catch (err) {
    console.error('[safespark concernAlerts] recordConcernAsync failed:', err);
  }
}

function concernAlertStream(category: IntentCategory, jobId?: string | null): Response {
  // Kid-facing refusal — gentle, NEVER scolding. Includes the live
  // helpline number so the kid has it in front of them right now, not
  // buried somewhere. Same envelope as other refusal streams.
  const helpline =
    category === 'self_harm_adjacent'
      ? "If you're having thoughts of hurting yourself or anyone else, talking to someone right now helps. Call or text 988 — it's the Suicide & Crisis Lifeline, free, 24/7."
      : category === 'eating_disorder_adjacent'
        ? "If food or body stuff is feeling really heavy right now, the National Eating Disorders helpline is 1-800-931-2237. They're real people, not robots."
        : '';
  const reply = `I'm pausing on that one — it sounds like something important to talk through with a person, not a project. ${helpline} I just sent your parent a note so they can check in with you. We can build something else when you're ready.`;
  return refusalStream(reply, jobId);
}

/**
 * Atomically spend one build from the caller's daily budget (per-kid for
 * valid sessions, the global guest bucket for tokenless calls) BEFORE any
 * OpenAI spend. Check + increment happen inside one Convex mutation, so
 * parallel requests can't race past the cap and direct API callers are
 * counted like everyone else.
 *
 * FAILS CLOSED: this guards money, not time. Convex unreachable or
 * misconfigured → refuse the build. (Contrast fetchTimeLimitStatus below,
 * which deliberately fails open.)
 */
async function spendPromptBudgetSafely(
  sessionToken: string | null,
  prompt: string,
): Promise<{ allowed: boolean; reason?: string; used?: number; budget?: number }> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return { allowed: false, reason: 'error' };
  try {
    const client = new ConvexHttpClient(url);
    return await client.mutation(api.safespark.spendPromptBudget, {
      sessionToken: sessionToken ?? undefined,
      prompt,
    });
  } catch (err) {
    console.error('[safespark] spendPromptBudget failed:', err);
    return { allowed: false, reason: 'error' };
  }
}

/**
 * Today's screen-time verdict for a kid session.
 *
 * FAILS OPEN: returns null on a missing token, missing Convex URL, or any
 * error, and the caller treats null as "no limit in force." The whole point
 * of the shared limit is to be a boundary, not a lockout — a kid must never
 * lose SafeSpark because a lookup had a bad minute.
 */
async function fetchTimeLimitStatus(
  sessionToken: string | null,
): Promise<{ allowed: boolean; remainingMinutes: number | null } | null> {
  if (!sessionToken) return null;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  try {
    const client = new ConvexHttpClient(url);
    const result = await client.query(api.screenTime.kidStatus, { sessionToken });
    if (!result || !result.known) return null;
    return { allowed: result.allowed, remainingMinutes: result.remainingMinutes };
  } catch (err) {
    console.error('[safespark] fetchTimeLimitStatus failed:', err);
    return null;
  }
}

/** Per-build screen-time floor. Fire-and-forget; never blocks a build. */
async function recordBuildTimeAsync(sessionToken: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return;
  try {
    const client = new ConvexHttpClient(url);
    await client.mutation(api.screenTime.recordActive, {
      sessionToken,
      activeSeconds: BUILD_ACTIVE_SECONDS,
    });
  } catch (err) {
    console.error('[safespark] recordBuildTimeAsync failed:', err);
  }
}

async function logBlockedTopicAsync(
  prompt: string,
  phrase: string,
  sessionToken: string | null,
  contextSize: number,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return;
  try {
    const client = new ConvexHttpClient(url);
    await client.mutation(api.safespark.logError, {
      prompt: prompt.slice(0, 4000),
      kind: 'blocked_topic',
      message: `Blocked phrase: ${phrase}`,
      contextSize,
      sessionToken: sessionToken ?? undefined,
    });
  } catch (err) {
    console.error('[safespark] logBlockedTopic failed:', err);
  }
}

/**
 * Render a flashcards deck spec into a polished single-file HTML viewer.
 * Server-side template — no LLM tokens spent on layout / animation / nav.
 * Same iframe rendering pathway as everything else, so save/share/diff
 * all just work. Accent color drives the active-state highlights; cards
 * with .image render a hero image area at top of each face.
 */
function renderFlashcardsHtml(deck: NonNullable<DemoResponse['flashcards']>): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const accentMap: Record<string, { hi: string; lo: string }> = {
    violet: { hi: '#8b5cf6', lo: '#7c3aed' },
    sky: { hi: '#38bdf8', lo: '#0284c7' },
    amber: { hi: '#fbbf24', lo: '#d97706' },
    rose: { hi: '#fb7185', lo: '#e11d48' },
    emerald: { hi: '#34d399', lo: '#059669' },
  };
  const accent = accentMap[deck.accent || 'violet'] || accentMap.violet;
  const title = esc(deck.title || 'Study Deck');
  const cardsJson = JSON.stringify(
    deck.cards.map((c) => ({
      front: c.front || '',
      back: c.back || '',
      image: c.image || null,
      hint: c.hint || null,
    })),
  );
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
:root{--hi:${accent.hi};--lo:${accent.lo};--bg:#0a0a18;--surf:rgba(255,255,255,.06);--text:#f4f4ff;--mute:rgba(255,255,255,.6);--ring:rgba(255,255,255,.12)}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:radial-gradient(circle at 20% 20%,#1a1a2e,var(--bg));color:var(--text);font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
main{height:100%;display:grid;grid-template-rows:auto 1fr auto;gap:14px;padding:18px;box-sizing:border-box}
.top{display:flex;align-items:center;justify-content:space-between;gap:14px}
.title{font-size:18px;font-weight:900;letter-spacing:-.01em}
.meta{font-size:12px;color:var(--mute);font-weight:700;font-variant-numeric:tabular-nums}
.scene{perspective:1400px;display:grid;place-items:center;min-height:0}
.card{position:relative;width:min(560px,100%);max-width:100%;aspect-ratio:5/3;cursor:pointer;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.2,.85,.2,1);will-change:transform}
.card.flipped{transform:rotateY(180deg)}
.face{position:absolute;inset:0;backface-visibility:hidden;border-radius:22px;background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.02));border:1px solid var(--ring);box-shadow:0 20px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.08);display:flex;flex-direction:column;overflow:hidden}
.face.back{transform:rotateY(180deg)}
.hero{width:100%;height:55%;background:#000 center/cover no-repeat;display:none;border-bottom:1px solid var(--ring)}
.hero.show{display:block}
.body{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:24px;text-align:center;gap:8px}
.body.with-hero{justify-content:center;padding:16px 22px}
.label{font-size:11px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:var(--hi);margin-bottom:4px}
.text{font-size:clamp(20px,3.4vw,30px);font-weight:800;line-height:1.18;letter-spacing:-.01em}
.hint{margin-top:8px;font-size:13px;color:var(--mute);font-weight:600;font-style:italic}
.bar{display:flex;align-items:center;gap:10px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,var(--hi),var(--lo));color:#0a0a18;font-weight:900;font-size:13px;padding:11px 18px;border:0;border-radius:999px;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.35)}
.btn.alt{background:rgba(255,255,255,.08);color:var(--text);border:1px solid var(--ring);box-shadow:none}
.btn:hover{transform:translateY(-1px)}
.btn:active{transform:translateY(0)}
.spacer{flex:1}
.dots{display:flex;gap:4px;align-items:center}
.dot{width:6px;height:6px;border-radius:999px;background:rgba(255,255,255,.18)}
.dot.on{background:var(--hi)}
.kbd{font-size:11px;color:var(--mute);font-weight:700}
@media(max-width:520px){.card{aspect-ratio:4/3}.text{font-size:22px}.btn{padding:10px 14px;font-size:12px}.kbd{display:none}}
</style>
</head>
<body>
<main>
  <div class="top">
    <div class="title">${title}</div>
    <div class="meta"><span id="pos">1</span> / <span id="total">${deck.cards.length}</span></div>
  </div>
  <div class="scene"><div class="card" id="card" role="button" aria-label="Flip card"></div></div>
  <div class="bar">
    <button class="btn alt" id="prev">← Prev</button>
    <button class="btn" id="flip">Flip</button>
    <button class="btn alt" id="next">Next →</button>
    <div class="spacer"></div>
    <button class="btn alt" id="shuffle">Shuffle</button>
    <div class="dots" id="dots"></div>
    <span class="kbd">Space · ← →</span>
  </div>
</main>
<script>
const cards = ${cardsJson};
const $ = (id) => document.getElementById(id);
let order = cards.map((_, i) => i);
let pos = 0;
let flipped = false;
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function render(){
  const idx = order[pos];
  const c = cards[idx] || {front:'',back:''};
  const hasImg = !!c.image;
  const heroFront = hasImg ? '<div class="hero show" style="background-image:url(\\''+(c.image)+'\\')"></div>' : '';
  const heroBack = hasImg ? '<div class="hero show" style="background-image:url(\\''+(c.image)+'\\')"></div>' : '';
  $('card').innerHTML = ''+
    '<div class="face front">'+heroFront+'<div class="body'+(hasImg?' with-hero':'')+'"><div class="label">Card</div><div class="text">'+escapeHtml(c.front)+'</div>'+(c.hint?'<div class="hint">'+escapeHtml(c.hint)+'</div>':'')+'</div></div>'+
    '<div class="face back">'+heroBack+'<div class="body'+(hasImg?' with-hero':'')+'"><div class="label">Answer</div><div class="text">'+escapeHtml(c.back)+'</div></div></div>';
  $('card').classList.toggle('flipped', flipped);
  $('pos').textContent = pos+1;
  // Dots
  const dots = $('dots');
  dots.innerHTML='';
  for(let i=0;i<order.length;i++){
    const d=document.createElement('span'); d.className='dot'+(i===pos?' on':''); dots.appendChild(d);
  }
}
function flip(){ flipped=!flipped; render(); }
function next(){ pos=(pos+1)%order.length; flipped=false; render(); }
function prev(){ pos=(pos-1+order.length)%order.length; flipped=false; render(); }
function shuffle(){ for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];} pos=0; flipped=false; render(); }
$('card').addEventListener('click', flip);
$('flip').addEventListener('click', flip);
$('next').addEventListener('click', next);
$('prev').addEventListener('click', prev);
$('shuffle').addEventListener('click', shuffle);
window.addEventListener('keydown', (e)=>{
  if(e.key===' '){e.preventDefault();flip();}
  else if(e.key==='ArrowRight'){next();}
  else if(e.key==='ArrowLeft'){prev();}
});
render();
</script>
</body>
</html>`;
}

/**
 * Render a quiz spec into a polished single-file HTML viewer. Same
 * server-side template approach as flashcards — model spends ~500-1000
 * tokens on the structured spec instead of 5-10K writing inconsistent
 * HTML. Features: one-question-at-a-time, instant right/wrong feedback
 * with optional explanation, scoring with bonus for streaks, progress
 * bar, results screen with rank tier, keyboard shortcuts (1-6, Enter,
 * Space), mobile responsive.
 */
function renderQuizHtml(quiz: NonNullable<DemoResponse['quiz']>): string {
  const accentMap: Record<string, { hi: string; lo: string }> = {
    violet: { hi: '#8b5cf6', lo: '#7c3aed' },
    sky: { hi: '#38bdf8', lo: '#0284c7' },
    amber: { hi: '#fbbf24', lo: '#d97706' },
    rose: { hi: '#fb7185', lo: '#e11d48' },
    emerald: { hi: '#34d399', lo: '#059669' },
  };
  const accent = accentMap[quiz.accent || 'violet'] || accentMap.violet;
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const title = esc(quiz.title || 'Quiz');
  const questionsJson = JSON.stringify(
    quiz.questions.map((q) => ({
      q: q.q || '',
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation || null,
      image: q.image || null,
    })),
  );
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
:root{--hi:${accent.hi};--lo:${accent.lo};--bg:#0a0a18;--surf:rgba(255,255,255,.06);--text:#f4f4ff;--mute:rgba(255,255,255,.6);--ring:rgba(255,255,255,.12);--good:#34d399;--bad:#f87171}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:radial-gradient(circle at 20% 20%,#1a1a2e,var(--bg));color:var(--text);font-family:system-ui,-apple-system,sans-serif;overflow:hidden}
main{height:100%;display:grid;grid-template-rows:auto 1fr auto;gap:12px;padding:18px;box-sizing:border-box;max-width:680px;margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;gap:14px}
.title{font-size:16px;font-weight:900;letter-spacing:-.01em}
.score{font-size:12px;color:var(--mute);font-weight:700;font-variant-numeric:tabular-nums;display:flex;gap:14px}
.score b{color:var(--text);font-weight:900}
.progress{height:6px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden;border:1px solid var(--ring)}
.progress .fill{height:100%;width:0%;background:linear-gradient(90deg,var(--hi),var(--lo));transition:width .4s cubic-bezier(.2,.9,.2,1)}
.q-wrap{display:flex;flex-direction:column;gap:14px;min-height:0;overflow:auto;padding:4px}
.q-image{width:100%;max-height:200px;object-fit:contain;border-radius:18px;background:#000;border:1px solid var(--ring);box-shadow:0 14px 40px rgba(0,0,0,.4)}
.q-text{font-size:clamp(20px,3vw,26px);font-weight:800;line-height:1.25;letter-spacing:-.01em;margin:4px 0}
.opts{display:grid;gap:10px}
.opt{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.05);color:var(--text);border:1px solid var(--ring);border-radius:14px;padding:14px 16px;text-align:left;font-size:15px;font-weight:700;cursor:pointer;transition:.15s all;line-height:1.3}
.opt:hover{background:rgba(255,255,255,.09);border-color:rgba(255,255,255,.25);transform:translateY(-1px)}
.opt:active{transform:translateY(0)}
.opt.right{background:rgba(52,211,153,.15);border-color:var(--good);color:#d1fae5}
.opt.wrong{background:rgba(248,113,113,.15);border-color:var(--bad);color:#fee2e2}
.opt.disabled{pointer-events:none;opacity:.55}
.opt.disabled.right{opacity:1}
.opt .num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;background:rgba(255,255,255,.1);font-size:13px;font-weight:900;color:var(--mute);flex-shrink:0}
.opt.right .num{background:var(--good);color:#0a0a18}
.opt.wrong .num{background:var(--bad);color:#0a0a18}
.explain{background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.3);border-radius:12px;padding:12px 14px;font-size:14px;color:#dde;font-weight:600;line-height:1.45}
.bar{display:flex;align-items:center;gap:10px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,var(--hi),var(--lo));color:#0a0a18;font-weight:900;font-size:14px;padding:12px 22px;border:0;border-radius:999px;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.35)}
.btn.alt{background:rgba(255,255,255,.08);color:var(--text);border:1px solid var(--ring);box-shadow:none}
.btn:hover{transform:translateY(-1px)}
.btn:active{transform:translateY(0)}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.spacer{flex:1}
.kbd{font-size:11px;color:var(--mute);font-weight:700}
.results{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px;padding:28px}
.rank{font-size:60px;font-weight:900;line-height:1;background:linear-gradient(135deg,var(--hi),var(--lo));-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-.04em}
.rank-label{font-size:14px;font-weight:900;letter-spacing:.18em;color:var(--hi);text-transform:uppercase}
.score-big{font-size:48px;font-weight:900;letter-spacing:-.03em}
.score-detail{color:var(--mute);font-size:14px;font-weight:700}
.hidden{display:none!important}
@media(max-width:520px){.opt{font-size:14px;padding:12px 14px}.q-text{font-size:18px}.kbd{display:none}}
</style>
</head>
<body>
<main>
  <div class="top">
    <div class="title">${title}</div>
    <div class="score">
      <span>Q <b id="qNum">1</b>/<b id="qTotal">${quiz.questions.length}</b></span>
      <span>Score <b id="score">0</b></span>
      <span>Streak <b id="streak">0</b></span>
    </div>
  </div>
  <div class="progress"><div class="fill" id="bar"></div></div>
  <div class="q-wrap" id="qWrap"></div>
  <div class="bar" id="navBar">
    <button class="btn alt" id="skip">Skip</button>
    <div class="spacer"></div>
    <span class="kbd">1-6 · Enter · Space</span>
    <button class="btn" id="next" disabled>Next →</button>
  </div>
</main>
<script>
const questions = ${questionsJson};
const $ = (id) => document.getElementById(id);
let pos = 0;
let score = 0;
let streak = 0;
let answered = false;
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function render(){
  if(pos >= questions.length){ renderResults(); return; }
  answered = false;
  const q = questions[pos];
  $('qNum').textContent = pos+1;
  $('bar').style.width = (pos/questions.length*100)+'%';
  const imgHtml = q.image ? '<img class="q-image" src="'+q.image+'" alt="">' : '';
  const optsHtml = q.options.map((o,i)=>(
    '<button class="opt" data-i="'+i+'"><span class="num">'+(i+1)+'</span><span>'+escapeHtml(o)+'</span></button>'
  )).join('');
  $('qWrap').innerHTML = imgHtml + '<div class="q-text">'+escapeHtml(q.q)+'</div><div class="opts">'+optsHtml+'</div><div id="explain"></div>';
  $('next').disabled = true;
  $('next').textContent = pos === questions.length-1 ? 'See results →' : 'Next →';
  document.querySelectorAll('.opt').forEach(btn=>btn.addEventListener('click',()=>answer(parseInt(btn.dataset.i,10))));
}
function answer(i){
  if(answered) return;
  answered = true;
  const q = questions[pos];
  const right = i === q.correctIndex;
  document.querySelectorAll('.opt').forEach((btn,bi)=>{
    btn.classList.add('disabled');
    if(bi === q.correctIndex) btn.classList.add('right');
    else if(bi === i) btn.classList.add('wrong');
  });
  if(right){
    score += 10 + streak * 2;
    streak += 1;
  } else {
    streak = 0;
  }
  $('score').textContent = score;
  $('streak').textContent = streak;
  if(q.explanation){
    $('explain').innerHTML = '<div class="explain">'+escapeHtml(q.explanation)+'</div>';
  }
  $('next').disabled = false;
  $('bar').style.width = ((pos+1)/questions.length*100)+'%';
}
function next(){ pos++; render(); }
function skip(){ if(!answered) streak = 0; pos++; render(); }
function renderResults(){
  const total = questions.length;
  const pct = total>0 ? Math.round((score/(total*10))*100) : 0;
  let rank='—', label='Try Again';
  if(pct>=90){rank='S';label='Genius';}
  else if(pct>=75){rank='A';label='Strong';}
  else if(pct>=60){rank='B';label='Good';}
  else if(pct>=40){rank='C';label='Keep Going';}
  else {rank='D';label='Try Again';}
  $('qWrap').innerHTML = '<div class="results"><div class="rank-label">'+label+'</div><div class="rank">'+rank+'</div><div class="score-big">'+score+' points</div><div class="score-detail">'+pct+'% · answered '+total+' questions</div></div>';
  $('navBar').innerHTML = '<div class="spacer"></div><button class="btn" id="restart">Play Again</button>';
  $('bar').style.width = '100%';
  document.getElementById('restart').addEventListener('click',()=>{pos=0;score=0;streak=0;$('score').textContent=0;$('streak').textContent=0;document.querySelector('main').innerHTML=document.querySelector('main').innerHTML;location.reload();});
}
$('next').addEventListener('click', next);
$('skip').addEventListener('click', skip);
window.addEventListener('keydown',(e)=>{
  if(e.key>='1' && e.key<='6'){
    const idx = parseInt(e.key,10)-1;
    const btn = document.querySelector('[data-i="'+idx+'"]');
    if(btn && !answered) answer(idx);
  } else if((e.key==='Enter'||e.key===' ') && answered){ e.preventDefault(); next(); }
});
render();
</script>
</body>
</html>`;
}

/**
 * Render a tier-list spec into a polished single-file HTML editor.
 * Drag-and-drop between tiers on desktop (HTML5 native DnD); tap an
 * item to cycle to next tier on mobile. Default tiers S/A/B/C/D/F if
 * model didn't override. Items with .image show a thumbnail; others
 * show the name in a chip. Reset button restores defaults.
 */
function renderTierListHtml(tl: NonNullable<DemoResponse['tierList']>): string {
  const accentMap: Record<string, { hi: string; lo: string }> = {
    violet: { hi: '#8b5cf6', lo: '#7c3aed' },
    sky: { hi: '#38bdf8', lo: '#0284c7' },
    amber: { hi: '#fbbf24', lo: '#d97706' },
    rose: { hi: '#fb7185', lo: '#e11d48' },
    emerald: { hi: '#34d399', lo: '#059669' },
  };
  const accent = accentMap[tl.accent || 'violet'] || accentMap.violet;
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const title = esc(tl.title || 'Tier List');
  // Default tier set if model didn't provide. S→F with rainbow grade.
  const tiers =
    tl.tiers && tl.tiers.length > 0
      ? tl.tiers
      : [
          { label: 'S', color: '#ff7676' },
          { label: 'A', color: '#ffa55d' },
          { label: 'B', color: '#ffd44d' },
          { label: 'C', color: '#9ed864' },
          { label: 'D', color: '#5ec6f0' },
          { label: 'F', color: '#a585e0' },
        ];
  const tiersJson = JSON.stringify(tiers);
  const itemsJson = JSON.stringify(
    tl.items.map((it) => ({
      name: it.name,
      image: it.image || null,
      defaultTier:
        typeof it.defaultTier === 'number' && it.defaultTier >= 0 && it.defaultTier < tiers.length
          ? it.defaultTier
          : null,
    })),
  );
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
:root{--hi:${accent.hi};--lo:${accent.lo};--bg:#0a0a18;--surf:rgba(255,255,255,.06);--text:#f4f4ff;--mute:rgba(255,255,255,.6);--ring:rgba(255,255,255,.14)}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:radial-gradient(circle at 20% 20%,#1a1a2e,var(--bg));color:var(--text);font-family:system-ui,-apple-system,sans-serif}
main{min-height:100%;display:flex;flex-direction:column;gap:14px;padding:18px;box-sizing:border-box;max-width:980px;margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.title{font-size:18px;font-weight:900;letter-spacing:-.01em}
.actions{display:flex;gap:8px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,var(--hi),var(--lo));color:#0a0a18;font-weight:900;font-size:12px;padding:9px 14px;border:0;border-radius:999px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.3)}
.btn.alt{background:rgba(255,255,255,.08);color:var(--text);border:1px solid var(--ring);box-shadow:none}
.btn:hover{transform:translateY(-1px)}
.tiers{display:flex;flex-direction:column;gap:8px;background:rgba(0,0,0,.25);border:1px solid var(--ring);border-radius:18px;padding:10px;overflow:hidden}
.tier{display:grid;grid-template-columns:64px 1fr;gap:10px;align-items:stretch;min-height:80px}
.tier-label{display:flex;align-items:center;justify-content:center;border-radius:12px;font-size:30px;font-weight:900;color:#0a0a18;letter-spacing:-.02em;line-height:1;text-align:center;padding:8px}
.tier-drop{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px;background:rgba(255,255,255,.04);border:2px dashed rgba(255,255,255,.08);border-radius:12px;min-height:80px;transition:.15s all}
.tier-drop.over{background:rgba(255,255,255,.1);border-color:var(--hi);border-style:solid}
.pool{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start;padding:14px;background:rgba(0,0,0,.18);border:1px solid var(--ring);border-radius:18px;min-height:90px}
.pool-title{width:100%;font-size:11px;font-weight:900;letter-spacing:.18em;color:var(--mute);text-transform:uppercase;margin-bottom:4px}
.item{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.08);border:1px solid var(--ring);border-radius:12px;padding:6px 12px 6px 6px;cursor:grab;user-select:none;font-size:13px;font-weight:700;transition:.15s all;touch-action:none}
.item:hover{background:rgba(255,255,255,.14);transform:translateY(-1px)}
.item.dragging{opacity:.4;cursor:grabbing}
.item img{width:36px;height:36px;border-radius:8px;object-fit:cover;background:#000;display:block}
.item.no-img{padding:8px 14px}
.kbd{font-size:11px;color:var(--mute);font-weight:700}
@media(max-width:560px){.tier{grid-template-columns:44px 1fr}.tier-label{font-size:22px;padding:6px}.item{font-size:12px}.item img{width:30px;height:30px}.kbd{display:none}}
</style>
</head>
<body>
<main>
  <div class="top">
    <div class="title">${title}</div>
    <div class="actions">
      <button class="btn alt" id="reset">Reset</button>
      <button class="btn alt" id="shuffle">Shuffle pool</button>
      <span class="kbd">Tap item to cycle tier · drag on desktop</span>
    </div>
  </div>
  <div class="tiers" id="tiers"></div>
  <div class="pool" id="pool"><div class="pool-title">Drag from here</div></div>
</main>
<script>
const TIERS = ${tiersJson};
const ITEMS = ${itemsJson};
// state.assignment[itemIdx] = tierIdx or null (null = in pool)
const state = { assignment: ITEMS.map((it) => (typeof it.defaultTier === 'number' ? it.defaultTier : null)) };
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function chipHtml(item, idx){
  const img = item.image ? '<img src="'+item.image+'" alt="">' : '';
  return '<div class="item'+(item.image?'':' no-img')+'" draggable="true" data-idx="'+idx+'">'+img+'<span>'+escapeHtml(item.name)+'</span></div>';
}
function render(){
  const tiersEl = document.getElementById('tiers');
  const poolEl = document.getElementById('pool');
  tiersEl.innerHTML = TIERS.map((t,ti)=>(
    '<div class="tier"><div class="tier-label" style="background:'+(t.color||'#888')+'">'+escapeHtml(t.label)+'</div>'+
    '<div class="tier-drop" data-tier="'+ti+'">'+
      ITEMS.map((it,ii)=>state.assignment[ii]===ti?chipHtml(it,ii):'').join('')+
    '</div></div>'
  )).join('');
  poolEl.innerHTML = '<div class="pool-title">Drag from here</div>'+
    ITEMS.map((it,ii)=>state.assignment[ii]===null?chipHtml(it,ii):'').join('');
  wireDragAndTap();
}
function wireDragAndTap(){
  let draggingIdx = null;
  document.querySelectorAll('.item').forEach((el)=>{
    el.addEventListener('dragstart',(e)=>{ draggingIdx = parseInt(el.dataset.idx,10); el.classList.add('dragging'); if(e.dataTransfer){e.dataTransfer.effectAllowed='move'; try{e.dataTransfer.setData('text/plain',String(draggingIdx));}catch(err){}} });
    el.addEventListener('dragend',()=>{ el.classList.remove('dragging'); draggingIdx = null; });
    // Tap-to-cycle on touch / accessibility — move to next tier, or back to pool
    let touchStart = null;
    el.addEventListener('touchstart',(e)=>{ touchStart = Date.now(); });
    el.addEventListener('touchend',(e)=>{
      if(!touchStart) return;
      if(Date.now()-touchStart < 250){ // short tap
        e.preventDefault();
        const ii = parseInt(el.dataset.idx,10);
        const cur = state.assignment[ii];
        const next = cur===null ? 0 : (cur+1 >= TIERS.length ? null : cur+1);
        state.assignment[ii] = next;
        render();
      }
      touchStart = null;
    });
    el.addEventListener('click',(e)=>{
      // Desktop click acts the same as tap-cycle when no drag occurred
      // (drag would have prevented click). Useful for mobile-mode browsers
      // that don't fire touchstart.
      if(touchStart === null){
        const ii = parseInt(el.dataset.idx,10);
        const cur = state.assignment[ii];
        const next = cur===null ? 0 : (cur+1 >= TIERS.length ? null : cur+1);
        state.assignment[ii] = next;
        render();
      }
    });
  });
  document.querySelectorAll('.tier-drop, .pool').forEach((zone)=>{
    zone.addEventListener('dragover',(e)=>{ e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave',()=>zone.classList.remove('over'));
    zone.addEventListener('drop',(e)=>{
      e.preventDefault(); zone.classList.remove('over');
      let idx = draggingIdx;
      if(idx===null && e.dataTransfer){ try{idx=parseInt(e.dataTransfer.getData('text/plain'),10);}catch(err){} }
      if(idx===null || isNaN(idx)) return;
      const isPool = zone.id === 'pool';
      state.assignment[idx] = isPool ? null : parseInt(zone.dataset.tier,10);
      render();
    });
  });
}
document.getElementById('reset').addEventListener('click',()=>{ state.assignment = ITEMS.map(it=>typeof it.defaultTier==='number'?it.defaultTier:null); render(); });
document.getElementById('shuffle').addEventListener('click',()=>{
  // Shuffle just the pool items' display order (visual only, doesn't change assignment).
  // Move all assigned-null items back to pool first, then re-render.
  state.assignment = state.assignment.map((a, ii)=>a===null ? null : a);
  // Visual shuffle of pool — just re-order the ITEMS array indices not assigned.
  render();
});
render();
</script>
</body>
</html>`;
}

/**
 * Render a sound-board spec. Tappable grid of pads; each pad's sound is
 * synthesized client-side via Web Audio API based on a preset name.
 * The synthesis recipes live in the rendered JS (small, hand-tuned
 * envelopes for each preset). Touch + click both supported. Visual
 * feedback on tap (scale pulse + glow). Server validated that every
 * pad's `sound` is in the preset dictionary before getting here.
 */
function renderSoundBoardHtml(sb: NonNullable<DemoResponse['soundBoard']>): string {
  const accentMap: Record<string, { hi: string; lo: string }> = {
    violet: { hi: '#8b5cf6', lo: '#7c3aed' },
    sky: { hi: '#38bdf8', lo: '#0284c7' },
    amber: { hi: '#fbbf24', lo: '#d97706' },
    rose: { hi: '#fb7185', lo: '#e11d48' },
    emerald: { hi: '#34d399', lo: '#059669' },
  };
  const accent = accentMap[sb.accent || 'violet'] || accentMap.violet;
  const esc = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  const title = esc(sb.title || 'Sound Board');
  const padsJson = JSON.stringify(sb.pads);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
:root{--hi:${accent.hi};--lo:${accent.lo};--bg:#0a0a18;--text:#f4f4ff;--mute:rgba(255,255,255,.6);--ring:rgba(255,255,255,.14)}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:radial-gradient(circle at 20% 20%,#1a1a2e,var(--bg));color:var(--text);font-family:system-ui,-apple-system,sans-serif;overflow-x:hidden}
main{min-height:100%;display:flex;flex-direction:column;gap:14px;padding:18px;box-sizing:border-box;max-width:720px;margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;gap:14px}
.title{font-size:18px;font-weight:900;letter-spacing:-.01em}
.hint{font-size:11px;color:var(--mute);font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:12px}
.pad{position:relative;display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;border-radius:18px;background:linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.03));border:1px solid var(--ring);color:var(--text);font-size:14px;font-weight:900;text-align:center;cursor:pointer;user-select:none;touch-action:manipulation;transition:.12s all;box-shadow:0 8px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.08);padding:14px}
.pad:hover{background:linear-gradient(160deg,rgba(255,255,255,.16),rgba(255,255,255,.05));transform:translateY(-2px)}
.pad:active,.pad.pulse{transform:scale(.94);background:linear-gradient(160deg,var(--hi),var(--lo));color:#0a0a18;box-shadow:0 4px 14px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.2),0 0 24px var(--hi)}
.pad.colored{background:linear-gradient(160deg,var(--pc-hi,#444),var(--pc-lo,#222))}
.pad.colored:hover{filter:brightness(1.15);transform:translateY(-2px)}
@media(max-width:520px){.grid{grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:8px}.pad{font-size:12px;border-radius:14px;padding:8px}}
</style>
</head>
<body>
<main>
  <div class="top">
    <div class="title">${title}</div>
    <div class="hint">Tap a pad · ${sb.pads.length} sounds</div>
  </div>
  <div class="grid" id="grid"></div>
</main>
<script>
const PADS = ${padsJson};
let ctx = null;
function audio(){
  if(!ctx){ try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  if(ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// Frequency lookup for piano presets
const NOTE_HZ = {c4:261.63,d4:293.66,e4:329.63,f4:349.23,g4:392.00,a4:440.00,b4:493.88,c5:523.25,d5:587.33,e5:659.25,f5:698.46,g5:783.99};
// Synthesis recipes. Each preset is a small Web Audio routine.
function playSound(name){
  const c = audio(); if(!c) return;
  const t = c.currentTime;
  if(name.startsWith('piano-')){
    const note = name.slice(6).toLowerCase();
    const hz = NOTE_HZ[note] || 440;
    const o = c.createOscillator(); o.type='triangle'; o.frequency.value=hz;
    const g = c.createGain(); g.gain.value=0; g.gain.linearRampToValueAtTime(0.4,t+0.005); g.gain.exponentialRampToValueAtTime(0.001,t+0.9);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.95);
    return;
  }
  if(name === 'drum-kick'){
    const o=c.createOscillator(),g=c.createGain();
    o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(40,t+0.18);
    g.gain.setValueAtTime(0.7,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.22);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.25); return;
  }
  if(name === 'drum-snare'){
    const buf = c.createBuffer(1, 0.18*c.sampleRate, c.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
    const s=c.createBufferSource(); s.buffer=buf;
    const g=c.createGain(); g.gain.value=0.5;
    s.connect(g).connect(c.destination); s.start(t); return;
  }
  if(name === 'drum-hihat'){
    const buf = c.createBuffer(1, 0.08*c.sampleRate, c.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,4);
    const s=c.createBufferSource(); s.buffer=buf;
    const g=c.createGain(); g.gain.value=0.25;
    const bp=c.createBiquadFilter(); bp.type='highpass'; bp.frequency.value=6000;
    s.connect(bp).connect(g).connect(c.destination); s.start(t); return;
  }
  if(name === 'drum-clap'){
    const buf = c.createBuffer(1, 0.14*c.sampleRate, c.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,3);
    const s=c.createBufferSource(); s.buffer=buf;
    const g=c.createGain(); g.gain.value=0.5;
    const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1500;
    s.connect(bp).connect(g).connect(c.destination); s.start(t); return;
  }
  if(name === 'drum-tom'){
    const o=c.createOscillator(),g=c.createGain();
    o.frequency.setValueAtTime(180,t); o.frequency.exponentialRampToValueAtTime(70,t+0.3);
    g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.32);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.35); return;
  }
  if(name === 'fx-laser'){
    const o=c.createOscillator(),g=c.createGain();
    o.type='square'; o.frequency.setValueAtTime(1200,t); o.frequency.exponentialRampToValueAtTime(120,t+0.25);
    g.gain.setValueAtTime(0.25,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.28);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.3); return;
  }
  if(name === 'fx-coin'){
    const o1=c.createOscillator(),o2=c.createOscillator(),g=c.createGain();
    o1.frequency.setValueAtTime(988,t); o1.frequency.setValueAtTime(1318,t+0.08);
    o2.frequency.setValueAtTime(659,t); o2.frequency.setValueAtTime(880,t+0.08);
    g.gain.setValueAtTime(0.25,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
    o1.connect(g); o2.connect(g); g.connect(c.destination);
    o1.start(t); o2.start(t); o1.stop(t+0.2); o2.stop(t+0.2); return;
  }
  if(name === 'fx-whoosh'){
    const buf = c.createBuffer(1, 0.4*c.sampleRate, c.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*0.6*(i/d.length<0.5?i/(d.length*0.5):1-(i-d.length*0.5)/(d.length*0.5));
    const s=c.createBufferSource(); s.buffer=buf;
    const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=800; bp.Q.value=2;
    s.connect(bp).connect(c.destination); s.start(t); return;
  }
  if(name === 'fx-bell'){
    const o=c.createOscillator(),g=c.createGain();
    o.type='sine'; o.frequency.value=1568;
    g.gain.setValueAtTime(0.35,t); g.gain.exponentialRampToValueAtTime(0.001,t+1.4);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+1.5); return;
  }
  if(name === 'fx-pop'){
    const o=c.createOscillator(),g=c.createGain();
    o.type='sine'; o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(800,t+0.05);
    g.gain.setValueAtTime(0.4,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.08);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.1); return;
  }
  if(name === 'fx-magic'){
    for(let i=0;i<6;i++){
      const o=c.createOscillator(),g=c.createGain();
      o.type='sine'; o.frequency.value=440 + i*220 + Math.random()*100;
      g.gain.setValueAtTime(0,t+i*0.04); g.gain.linearRampToValueAtTime(0.15,t+i*0.04+0.01); g.gain.exponentialRampToValueAtTime(0.001,t+i*0.04+0.4);
      o.connect(g).connect(c.destination); o.start(t+i*0.04); o.stop(t+i*0.04+0.45);
    }
    return;
  }
  if(name === 'fx-beep'){
    const o=c.createOscillator(),g=c.createGain();
    o.type='square'; o.frequency.value=880;
    g.gain.setValueAtTime(0.2,t); g.gain.setValueAtTime(0,t+0.1);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.12); return;
  }
  if(name === 'fx-blip'){
    const o=c.createOscillator(),g=c.createGain();
    o.type='triangle'; o.frequency.value=1200;
    g.gain.setValueAtTime(0.25,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.08);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.1); return;
  }
  if(name === 'fx-zap'){
    const buf = c.createBuffer(1, 0.15*c.sampleRate, c.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.5);
    const s=c.createBufferSource(); s.buffer=buf;
    const g=c.createGain(); g.gain.value=0.35;
    const bp=c.createBiquadFilter(); bp.type='highpass'; bp.frequency.value=2000;
    s.connect(bp).connect(g).connect(c.destination); s.start(t); return;
  }
  if(name === 'fx-jump'){
    const o=c.createOscillator(),g=c.createGain();
    o.type='square'; o.frequency.setValueAtTime(220,t); o.frequency.exponentialRampToValueAtTime(660,t+0.15);
    g.gain.setValueAtTime(0.25,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+0.2); return;
  }
  if(name === 'fx-power-up'){
    for(let i=0;i<5;i++){
      const o=c.createOscillator(),g=c.createGain();
      o.type='square'; o.frequency.value=200 + i*150;
      g.gain.setValueAtTime(0,t+i*0.06); g.gain.linearRampToValueAtTime(0.18,t+i*0.06+0.01); g.gain.exponentialRampToValueAtTime(0.001,t+i*0.06+0.15);
      o.connect(g).connect(c.destination); o.start(t+i*0.06); o.stop(t+i*0.06+0.16);
    }
    return;
  }
}
function renderGrid(){
  const grid = document.getElementById('grid');
  grid.innerHTML = PADS.map((p,i)=>{
    const colored = p.color ? 'colored' : '';
    const style = p.color ? 'style="--pc-hi:'+p.color+';--pc-lo:'+p.color+'cc"' : '';
    return '<button class="pad '+colored+'" data-i="'+i+'" '+style+'>'+(p.label.replace(/[<>&]/g,''))+'</button>';
  }).join('');
  grid.querySelectorAll('.pad').forEach((el)=>{
    el.addEventListener('click',()=>{
      const i=parseInt(el.dataset.i,10);
      playSound(PADS[i].sound);
      el.classList.add('pulse');
      setTimeout(()=>el.classList.remove('pulse'),140);
    });
  });
}
renderGrid();
</script>
</body>
</html>`;
}

function parseDemoResponse(raw: string): DemoResponse {
  try {
    const parsed = JSON.parse(raw) as DemoResponse;
    // Sanitize patches: must be an array of {find,replace} strings,
    // capped at 8 ops per turn (matches the system prompt cap).
    let patches: PatchOp[] | undefined;
    if (Array.isArray(parsed.patches)) {
      patches = parsed.patches
        .filter(
          (p): p is PatchOp =>
            p != null &&
            typeof p === 'object' &&
            typeof (p as PatchOp).find === 'string' &&
            typeof (p as PatchOp).replace === 'string' &&
            (p as PatchOp).find.length > 0,
        )
        .slice(0, 8)
        .map((p) => ({ find: p.find, replace: p.replace }));
      if (patches.length === 0) patches = undefined;
    }
    // Pass-through tool/kind discriminator. Default is 'html' for
    // back-compat with everything we've shipped. 'composite' is single
    // image generation. 'flashcards' is a structured deck spec the
    // server renders via a polished template.
    const kind =
      parsed.kind === 'composite' ||
      parsed.kind === 'image' ||
      parsed.kind === 'html' ||
      parsed.kind === 'flashcards' ||
      parsed.kind === 'quiz' ||
      parsed.kind === 'tier-list' ||
      parsed.kind === 'sound-board'
        ? parsed.kind
        : undefined;
    const compositePrompt =
      typeof parsed.compositePrompt === 'string' && parsed.compositePrompt.length > 0
        ? parsed.compositePrompt.slice(0, 2000)
        : undefined;
    // Validate flashcards payload — strip anything malformed so the
    // server handler can trust the shape. Hard caps: 24 cards, each
    // string field <= 600 chars. Strings get sanitized at render time
    // (htmlEscape) so we keep them raw here.
    let flashcards: DemoResponse['flashcards'];
    if (
      parsed.flashcards &&
      typeof parsed.flashcards === 'object' &&
      Array.isArray((parsed.flashcards as { cards?: unknown }).cards)
    ) {
      const rawCards = ((parsed.flashcards as { cards: unknown[] }).cards ?? []).slice(0, 24);
      const cleanCards = rawCards
        .filter((c): c is { front?: unknown; back?: unknown; image?: unknown; hint?: unknown } =>
          c != null && typeof c === 'object',
        )
        .map((c) => ({
          front: typeof c.front === 'string' ? c.front.slice(0, 600) : '',
          back: typeof c.back === 'string' ? c.back.slice(0, 600) : '',
          image: typeof c.image === 'string' ? c.image.slice(0, 400) : undefined,
          hint: typeof c.hint === 'string' ? c.hint.slice(0, 240) : undefined,
        }))
        .filter((c) => c.front || c.back);
      if (cleanCards.length > 0) {
        const fc = parsed.flashcards as {
          title?: unknown;
          accent?: unknown;
        };
        const validAccents = new Set(['violet', 'sky', 'amber', 'rose', 'emerald']);
        flashcards = {
          title: typeof fc.title === 'string' ? fc.title.slice(0, 80) : undefined,
          cards: cleanCards,
          accent:
            typeof fc.accent === 'string' && validAccents.has(fc.accent)
              ? (fc.accent as 'violet' | 'sky' | 'amber' | 'rose' | 'emerald')
              : undefined,
        };
      }
    }
    // Validate quiz payload. Hard caps: 20 questions, 6 options each,
    // strings <= 600 chars. Drop malformed questions instead of failing
    // the whole build so a single bad row doesn't tank the deck.
    let quiz: DemoResponse['quiz'];
    if (
      parsed.quiz &&
      typeof parsed.quiz === 'object' &&
      Array.isArray((parsed.quiz as { questions?: unknown }).questions)
    ) {
      const rawQs = ((parsed.quiz as { questions: unknown[] }).questions ?? []).slice(0, 20);
      const cleanQs = rawQs
        .filter(
          (
            q,
          ): q is { q?: unknown; options?: unknown; correctIndex?: unknown; explanation?: unknown; image?: unknown } =>
            q != null && typeof q === 'object',
        )
        .map((q) => {
          const optsRaw = Array.isArray(q.options) ? q.options.slice(0, 6) : [];
          const opts = optsRaw
            .map((o) => (typeof o === 'string' ? o.slice(0, 240) : ''))
            .filter((o) => o.length > 0);
          const ci = typeof q.correctIndex === 'number' ? Math.floor(q.correctIndex) : -1;
          return {
            q: typeof q.q === 'string' ? q.q.slice(0, 600) : '',
            options: opts,
            correctIndex: ci >= 0 && ci < opts.length ? ci : 0,
            explanation:
              typeof q.explanation === 'string' ? q.explanation.slice(0, 400) : undefined,
            image: typeof q.image === 'string' ? q.image.slice(0, 400) : undefined,
          };
        })
        .filter((q) => q.q.length > 0 && q.options.length >= 2);
      if (cleanQs.length > 0) {
        const qz = parsed.quiz as { title?: unknown; accent?: unknown };
        const validAccents = new Set(['violet', 'sky', 'amber', 'rose', 'emerald']);
        quiz = {
          title: typeof qz.title === 'string' ? qz.title.slice(0, 80) : undefined,
          questions: cleanQs,
          accent:
            typeof qz.accent === 'string' && validAccents.has(qz.accent)
              ? (qz.accent as 'violet' | 'sky' | 'amber' | 'rose' | 'emerald')
              : undefined,
        };
      }
    }
    // Validate tier-list payload. Cap: 36 items, 8 tiers, strings <= 200.
    let tierList: DemoResponse['tierList'];
    if (
      parsed.tierList &&
      typeof parsed.tierList === 'object' &&
      Array.isArray((parsed.tierList as { items?: unknown }).items)
    ) {
      const tl = parsed.tierList as {
        title?: unknown;
        tiers?: unknown;
        items?: unknown[];
        accent?: unknown;
      };
      const rawItems = (tl.items ?? []).slice(0, 36);
      const cleanItems = rawItems
        .filter((it): it is { name?: unknown; image?: unknown; defaultTier?: unknown } =>
          it != null && typeof it === 'object',
        )
        .map((it) => ({
          name: typeof it.name === 'string' ? it.name.slice(0, 80) : '',
          image: typeof it.image === 'string' ? it.image.slice(0, 400) : undefined,
          defaultTier: typeof it.defaultTier === 'number' ? Math.floor(it.defaultTier) : undefined,
        }))
        .filter((it) => it.name.length > 0);
      if (cleanItems.length > 0) {
        const rawTiers = Array.isArray(tl.tiers) ? tl.tiers.slice(0, 8) : null;
        const cleanTiers = rawTiers
          ? rawTiers
              .filter((t): t is { label?: unknown; color?: unknown } =>
                t != null && typeof t === 'object',
              )
              .map((t) => ({
                label: typeof t.label === 'string' ? t.label.slice(0, 24) : '',
                color: typeof t.color === 'string' ? t.color.slice(0, 32) : undefined,
              }))
              .filter((t) => t.label.length > 0)
          : null;
        const validAccents = new Set(['violet', 'sky', 'amber', 'rose', 'emerald']);
        tierList = {
          title: typeof tl.title === 'string' ? tl.title.slice(0, 80) : undefined,
          tiers: cleanTiers && cleanTiers.length > 0 ? cleanTiers : undefined,
          items: cleanItems,
          accent:
            typeof tl.accent === 'string' && validAccents.has(tl.accent)
              ? (tl.accent as 'violet' | 'sky' | 'amber' | 'rose' | 'emerald')
              : undefined,
        };
      }
    }
    // Validate sound-board payload. Cap: 24 pads, label <= 24 chars.
    // Drop pads with unknown sound presets (server-side preset
    // dictionary is the source of truth; model's preset name must match).
    let soundBoard: DemoResponse['soundBoard'];
    const VALID_SOUNDS = new Set([
      'piano-c4', 'piano-d4', 'piano-e4', 'piano-f4', 'piano-g4', 'piano-a4', 'piano-b4',
      'piano-c5', 'piano-d5', 'piano-e5', 'piano-f5', 'piano-g5',
      'drum-kick', 'drum-snare', 'drum-hihat', 'drum-clap', 'drum-tom',
      'fx-laser', 'fx-coin', 'fx-whoosh', 'fx-bell', 'fx-pop', 'fx-magic',
      'fx-beep', 'fx-blip', 'fx-zap', 'fx-jump', 'fx-power-up',
    ]);
    if (
      parsed.soundBoard &&
      typeof parsed.soundBoard === 'object' &&
      Array.isArray((parsed.soundBoard as { pads?: unknown }).pads)
    ) {
      const sb = parsed.soundBoard as { title?: unknown; pads?: unknown[]; accent?: unknown };
      const rawPads = (sb.pads ?? []).slice(0, 24);
      const cleanPads = rawPads
        .filter((p): p is { label?: unknown; sound?: unknown; color?: unknown } =>
          p != null && typeof p === 'object',
        )
        .map((p) => ({
          label: typeof p.label === 'string' ? p.label.slice(0, 24) : '',
          sound: typeof p.sound === 'string' ? p.sound : '',
          color: typeof p.color === 'string' ? p.color.slice(0, 32) : undefined,
        }))
        .filter((p) => p.label.length > 0 && VALID_SOUNDS.has(p.sound));
      if (cleanPads.length > 0) {
        const validAccents = new Set(['violet', 'sky', 'amber', 'rose', 'emerald']);
        soundBoard = {
          title: typeof sb.title === 'string' ? sb.title.slice(0, 80) : undefined,
          pads: cleanPads,
          accent:
            typeof sb.accent === 'string' && validAccents.has(sb.accent)
              ? (sb.accent as 'violet' | 'sky' | 'amber' | 'rose' | 'emerald')
              : undefined,
        };
      }
    }
    return {
      reply: String(parsed.reply ?? ''),
      title: parsed.title ? String(parsed.title).slice(0, 80) : undefined,
      changed: Boolean(parsed.changed),
      html: typeof parsed.html === 'string' && parsed.html.includes('<') ? parsed.html : undefined,
      patches,
      nextSteps: Array.isArray(parsed.nextSteps)
        ? parsed.nextSteps.slice(0, 3).map((step) => String(step).slice(0, 120))
        : undefined,
      versionLabel: parsed.versionLabel ? String(parsed.versionLabel).slice(0, 80) : undefined,
      versionSummary: parsed.versionSummary ? String(parsed.versionSummary).slice(0, 240) : undefined,
      communicationProject:
        typeof parsed.communicationProject === 'boolean' ? parsed.communicationProject : undefined,
      kind,
      compositePrompt,
      flashcards,
      quiz,
      tierList,
      soundBoard,
    };
  } catch (parseErr) {
    // JSON parse failed — typically the stream got truncated mid-output
    // (e.g., the model hit max_completion_tokens before completing the
    // closing brace) or it returned something not-quite-JSON. Whatever
    // the cause, NEVER dump the raw text into the chat — Jeremiah hit
    // this on a Star Wars flashcard build and the kid saw a wall of
    // literal JSON in the assistant bubble. Friendly retry message
    // instead. Log the raw for debugging but don't surface it.
    console.error(
      `[safespark parse] failed — len=${raw.length} preview="${raw.slice(0, 200).replace(/\n/g, ' ')}" err=${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
    );
    return {
      reply:
        "My answer got cut off before it finished. The project might have been too big to render in one shot — try asking for a smaller, simpler version first, then add details one at a time.",
      changed: false,
    };
  }
}

/**
 * Apply a sequence of {find, replace} ops against html. Each find string
 * MUST appear exactly once in the (running) html — zero matches or
 * multiple matches fail the whole batch, so the caller can fall back to
 * full-HTML mode without partial corruption.
 *
 * Pure function — easy to test and reason about.
 */
type PatchResult =
  | { ok: true; html: string; applied: number }
  | { ok: false; failedFind: string; reason: 'not-found' | 'ambiguous' };

function applyPatches(html: string, patches: PatchOp[]): PatchResult {
  let working = html;
  let applied = 0;
  for (const patch of patches) {
    const idx = working.indexOf(patch.find);
    if (idx === -1) {
      return { ok: false, failedFind: patch.find, reason: 'not-found' };
    }
    // Check uniqueness: second occurrence anywhere after the first hit?
    const secondIdx = working.indexOf(patch.find, idx + 1);
    if (secondIdx !== -1) {
      return { ok: false, failedFind: patch.find, reason: 'ambiguous' };
    }
    working = working.slice(0, idx) + patch.replace + working.slice(idx + patch.find.length);
    applied += 1;
  }
  return { ok: true, html: working, applied };
}

/**
 * Log a patch-protocol failure so we can audit how often patches
 * miss vs. land cleanly. Best-effort — never blocks the response.
 */
async function logPatchFailureAsync(
  prompt: string,
  failedFind: string,
  reason: 'not-found' | 'ambiguous',
  sessionToken: string | null,
  contextSize: number,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return;
  try {
    const client = new ConvexHttpClient(url);
    await client.mutation(api.safespark.logError, {
      prompt: prompt.slice(0, 4000),
      kind: 'patch_failed',
      message: `patch reason=${reason} find=${failedFind.slice(0, 200)}`,
      contextSize,
      sessionToken: sessionToken ?? undefined,
    });
  } catch (err) {
    console.error('[safespark] logPatchFailureAsync failed:', err);
  }
}
