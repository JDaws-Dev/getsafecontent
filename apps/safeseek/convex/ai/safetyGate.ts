/**
 * The shared safety gate — one screening path for every kid-facing AI surface.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The gate used to live inline inside `search.searchFromKid`, which meant it
 * protected exactly one entry point. Research mode called straight through to
 * a web-page rewriter with no intent classifier, no blocked-topics check and
 * no injection filter, so a question the Learn tab refused still returned
 * rewritten pages one tab over. Anything new (lessons, quizzes) would have
 * inherited the same hole.
 *
 * So the sequence moved here verbatim and every surface calls it:
 *
 *   1. sanitize + prompt-injection filter
 *   2. intent classification (cached 30d by normalized query text)
 *   3. concern-rephrase guard  — a concern block survives a reworded retry
 *   4. category block decision — strictness, blocked topics, ALLOWED topics
 *   5. loop detection          — same question ~4x in 30 minutes
 *
 * Steps 3-5 are search-shaped (they read and write this kid's query history),
 * so a caller that isn't a search — the tutor, say — can switch them off with
 * `recordBlocks: false` / `checkLoop: false` and still get 1, 2 and 4.
 *
 * Plain functions, not Convex functions: the callers are already actions with
 * OPENAI_API_KEY in their environment, exactly like the other `ai/` modules.
 */

import { sanitizeQuery, detectPromptInjection } from "./inputFilter";
import {
  classifyIntent,
  shouldBlockCategory,
  redirectMessage,
  type IntentCategory,
} from "./intentClassifier";
import { isLoop, loopMessage, queryOverlap, CONCERN_REPHRASE_OVERLAP } from "./loopDetector";
// The canonical intent-cache key normalizer. Imported rather than copied: a
// local re-implementation that drifted by one `.replace` would silently give
// the gate a different cache key from search's, so every query would miss the
// cache and re-bill the classifier.
import { normalizeForIntentCache } from "../intentCache";

/**
 * How long a concern block (ED / self-harm) suppresses substantially-similar
 * rephrases from the same kid. Long enough to cover a sitting, short enough
 * that it never becomes a silent permanent ban on a topic.
 */
export const CONCERN_REPHRASE_WINDOW_MS = 30 * 60 * 1000;

export type GateIntent = {
  category: string;
  confidence: number;
  rationale: string;
  degraded?: boolean;
};

export type GateResult =
  | { allowed: true; sanitized: string; intent: GateIntent }
  | {
      allowed: false;
      sanitized: string;
      intent: GateIntent | null;
      /** Machine reason, e.g. "self_harm_signal", "loop_detected", "injection_blocked". */
      reason: string;
      /** Kid-facing copy. Never engineer-speak: this goes straight on screen. */
      message: string;
      /** Intent category when one was determined. */
      category?: string;
      /** True when a parent alert was raised for this block. */
      alerted: boolean;
    };

/**
 * The minimum surface of a Convex action ctx that the gate needs. Typed
 * loosely on purpose so this file stays free of generated-API imports and can
 * be called from any action.
 */
type GateCtx = {
  runQuery: (ref: any, args: any) => Promise<any>;
  runMutation: (ref: any, args: any) => Promise<any>;
  scheduler: { runAfter: (ms: number, ref: any, args: any) => Promise<any> };
};

type GateRefs = {
  intentCacheGet: any;
  intentCachePut: any;
  insertBlockedSearch: any;
  recordConcernAlert: any;
  getRecentConcernBlocks: any;
  getRecentQueriesForLoopCheck: any;
  sendParentEmail: any;
  noteClassifierDegraded: any;
  sendClassifierDownAlert: any;
};

export type GateOptions = {
  kidProfileId: any;
  userId: any;
  /** Raw kid input, pre-sanitization. */
  query: string;
  /** Kid profile fields the block decision needs. */
  contentStrictness?: string;
  blockedTopics?: string[];
  allowedTopics?: string[];
  /** Which surface is asking — recorded on blocks so the parent sees where. */
  surface: "search" | "research" | "tutor" | "lesson" | "quiz";
  openaiApiKey: string | undefined;
  /** Write blockedSearches rows for blocks. Off for surfaces that aren't searches. */
  recordBlocks?: boolean;
  /** Run the concern-rephrase guard (reads this kid's recent concern blocks). */
  checkRephrase?: boolean;
  /** Run the repetition detector. */
  checkLoop?: boolean;
};

/**
 * Run the full screening sequence. Never throws: every failure path inside
 * fails OPEN (the kid is allowed through) because a classifier outage must not
 * take the product down — but a degraded classifier is escalated to the
 * operator, deduped to one email a day.
 */
export async function runSafetyGate(
  ctx: GateCtx,
  refs: GateRefs,
  opts: GateOptions,
): Promise<GateResult> {
  const {
    kidProfileId,
    userId,
    surface,
    openaiApiKey,
    recordBlocks = true,
    checkRephrase = true,
    checkLoop = true,
  } = opts;

  // --- 1. Sanitize + prompt-injection filter -------------------------------
  const sanitized = sanitizeQuery(opts.query);
  const injectionCheck = detectPromptInjection(sanitized);
  if (!injectionCheck.safe) {
    console.warn(
      `[safetyGate:${surface}] Prompt injection blocked: ${injectionCheck.reason} | query: "${opts.query.slice(0, 100)}"`,
    );
    return {
      allowed: false,
      sanitized,
      intent: null,
      reason: "injection_blocked",
      message: "I can't help with that question. Try asking something else!",
      alerted: false,
    };
  }

  // --- 2. Intent classification (cached by normalized query text) ----------
  const intentCacheKey = normalizeForIntentCache(sanitized);
  let intent: GateIntent | null = null;
  try {
    intent = (await ctx.runQuery(refs.intentCacheGet, {
      normalizedQuery: intentCacheKey,
    })) as GateIntent | null;
  } catch (err) {
    console.warn(`[safetyGate:${surface}] intent cache read failed:`, err);
  }

  if (!intent) {
    intent = (await classifyIntent(sanitized, openaiApiKey)) as GateIntent;
    if (!intent.degraded) {
      // Fire-and-forget; a cache-write failure must not affect the request.
      try {
        await ctx.runMutation(refs.intentCachePut, {
          normalizedQuery: intentCacheKey,
          category: intent.category,
          confidence: intent.confidence,
          rationale: intent.rationale,
        });
      } catch (err) {
        console.warn(`[safetyGate:${surface}] intent cache write failed:`, err);
      }
    }
  }

  // Fail-open is deliberate, but it must not be silent: while degraded, the
  // always-escalate ED/self-harm alerts can't fire from the LLM path.
  if (intent.degraded) {
    console.error(
      `[safetyGate:${surface}] intent classifier DEGRADED (${intent.rationale}) — query passed with regex-only screening`,
    );
    try {
      const shouldAlert = await ctx.runMutation(refs.noteClassifierDegraded, {
        rationale: intent.rationale,
      });
      if (shouldAlert) {
        await ctx.scheduler.runAfter(0, refs.sendClassifierDownAlert, {
          rationale: intent.rationale,
        });
      }
    } catch (err) {
      console.error(`[safetyGate:${surface}] failed to record classifier degradation:`, err);
    }
  }

  // --- 3. Concern-rephrase guard -------------------------------------------
  // A concern block used to last exactly one query. The classifier judges each
  // query independently, so dropping a single word re-classified the same
  // attempt as harmless and answered it seconds later ("legs workouts for
  // women" blocked 14:02 → "leg workouts for women" answered 14:02). The alert
  // fired and the kid got the content anyway, which made the escalation
  // theatre. We do NOT re-alert — the parent has already been told, and repeat
  // emails would train them to ignore these.
  if (checkRephrase) {
    let rephraseOf: { query: string; blockedReason: string } | null = null;
    try {
      const recentConcerns = await ctx.runQuery(refs.getRecentConcernBlocks, {
        kidProfileId,
        sinceMs: CONCERN_REPHRASE_WINDOW_MS,
      });
      for (const prior of recentConcerns ?? []) {
        if (queryOverlap(sanitized, prior.query) >= CONCERN_REPHRASE_OVERLAP) {
          rephraseOf = prior;
          break;
        }
      }
    } catch (err) {
      // Fail open — a lookup failure must never block a kid.
      console.warn(`[safetyGate:${surface}] concern-rephrase lookup failed:`, err);
    }

    if (rephraseOf) {
      const category =
        rephraseOf.blockedReason === "self_harm_signal"
          ? "self_harm_adjacent"
          : "eating_disorder_adjacent";
      if (recordBlocks) {
        await safeRecordBlock(ctx, refs, {
          kidProfileId,
          query: sanitized,
          blockedReason: rephraseOf.blockedReason,
          intentCategory: category,
          intentConfidence: intent.confidence,
          intentRationale: `Rephrase of a concern query blocked in the last 30 minutes ("${rephraseOf.query.slice(0, 80)}").`,
          surface,
        });
      }
      return {
        allowed: false,
        sanitized,
        intent,
        reason: rephraseOf.blockedReason,
        message: redirectMessage(category as IntentCategory),
        category,
        alerted: false,
      };
    }
  }

  // --- 4. Category block decision ------------------------------------------
  const decision = shouldBlockCategory(
    intent.category as IntentCategory,
    opts.contentStrictness || "moderate",
    opts.blockedTopics || [],
    intent.confidence,
    opts.allowedTopics || [],
  );

  if (decision.block) {
    if (recordBlocks) {
      await safeRecordBlock(ctx, refs, {
        kidProfileId,
        query: sanitized,
        blockedReason: decision.reason,
        intentCategory: intent.category,
        intentConfidence: intent.confidence,
        intentRationale: intent.rationale,
        surface,
      });
    }

    // Concern-level alerts (ED, self-harm) → log + schedule parent email.
    if (decision.alert) {
      try {
        await ctx.runMutation(refs.recordConcernAlert, {
          kidProfileId,
          userId,
          query: sanitized,
          category: intent.category,
          confidence: intent.confidence,
          rationale: intent.rationale,
          source: surface,
        });
        await ctx.scheduler.runAfter(0, refs.sendParentEmail, {
          kidProfileId,
          userId,
          query: sanitized,
          category: intent.category,
          rationale: intent.rationale,
          source: surface,
        });
      } catch (err) {
        console.error(`[safetyGate:${surface}] failed to raise concern alert:`, err);
      }
    }

    return {
      allowed: false,
      sanitized,
      intent,
      reason: decision.reason,
      message: redirectMessage(intent.category as IntentCategory),
      category: intent.category,
      alerted: decision.alert,
    };
  }

  // --- 5. Loop detector -----------------------------------------------------
  // Same thing ~4+ times in 30 minutes: catches synonym shuffling against the
  // blocker AND innocuous repetition. Colour rotation collapses to one key.
  if (checkLoop) {
    try {
      const recentQueries = await ctx.runQuery(refs.getRecentQueriesForLoopCheck, {
        kidProfileId,
        sinceMs: 30 * 60 * 1000,
      });
      const loopCheck = isLoop(sanitized, recentQueries ?? []);
      if (loopCheck.loop) {
        if (recordBlocks) {
          await safeRecordBlock(ctx, refs, {
            kidProfileId,
            query: sanitized,
            blockedReason: `loop_detected_${loopCheck.matchCount}_in_30min`,
            intentCategory: intent.category,
            intentConfidence: intent.confidence,
            intentRationale: intent.rationale,
            surface,
          });
        }
        return {
          allowed: false,
          sanitized,
          intent,
          reason: "loop_detected",
          message: loopMessage(),
          category: intent.category,
          alerted: false,
        };
      }
    } catch (err) {
      console.warn(`[safetyGate:${surface}] loop check failed:`, err);
    }
  }

  return { allowed: true, sanitized, intent };
}

/** Recording a block must never be the thing that breaks a request. */
async function safeRecordBlock(
  ctx: GateCtx,
  refs: GateRefs,
  args: {
    kidProfileId: any;
    query: string;
    blockedReason: string;
    intentCategory: string;
    intentConfidence: number;
    intentRationale: string;
    surface: string;
  },
) {
  try {
    await ctx.runMutation(refs.insertBlockedSearch, {
      kidProfileId: args.kidProfileId,
      query: args.query,
      blockedReason: args.blockedReason,
      searchedAt: Date.now(),
      intentCategory: args.intentCategory,
      intentConfidence: args.intentConfidence,
      intentRationale: args.intentRationale,
    });
  } catch (err) {
    console.error(`[safetyGate:${args.surface}] failed to record block:`, err);
  }
}
