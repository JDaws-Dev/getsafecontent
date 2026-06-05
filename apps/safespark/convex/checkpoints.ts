import { v } from 'convex/values';
import OpenAI from 'openai';
import { action, internalMutation, internalQuery, query } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

/**
 * Per-project context checkpoints — the fix for "Spark forgot what my game
 * was about" (Knox, 2026-05-28).
 *
 * The /api/demo handler sends only the last 8 message turns to the LLM
 * (each capped at 900 chars). That's fine for short builds, but a kid
 * iterating on the same project for days will lose the original game
 * premise, art direction, blocklist context, and player preferences as
 * the rolling window slides past them.
 *
 * The fix is a periodic LLM-generated markdown recap stored per project:
 *   - Triggered every ~10 turns OR every 48 hours of activity
 *   - One small gpt-4o-mini call summarizes premise + design + recent work
 *   - Latest checkpoint is prepended to the system prompt on future turns
 *
 * Cost: ~$0.0001 per checkpoint at gpt-4o-mini rates (one in/out per ~10
 * turns of usage). Trivial vs. the per-turn build cost.
 *
 * Cadence is enforced by `maybeCreateCheckpoint` — call it from the demo
 * route after each successful turn; it no-ops unless the trigger fires.
 */

const CHECKPOINT_MODEL = process.env.BELLA_CHECKPOINT_MODEL || 'gpt-4o-mini';
const TURNS_BETWEEN_CHECKPOINTS = 10;
// The FIRST recap fires sooner so a fast-moving new build establishes its
// premise + art direction in project memory early, instead of running on just
// the rolling 8-message window for its first ~10 turns. Later recaps cadence
// at TURNS_BETWEEN_CHECKPOINTS.
const FIRST_CHECKPOINT_AT = 5;
const STALE_AFTER_MS = 48 * 60 * 60 * 1000; // 48h
const RECAP_MAX_OUTPUT_TOKENS = 700;
const HTML_SNIPPET_BYTES = 4000; // first/last slice we feed the recap LLM
const RECENT_MESSAGES_FOR_RECAP = 20;

/** Latest checkpoint for a project, or null. Public — clients can read. */
export const getLatestForProject = query({
  args: { projectId: v.id('safesparkProjects') },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('safesparkCheckpoints')
      .withIndex('by_project_latest', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .first();
    if (!row) return null;
    return {
      id: row._id,
      content: row.content,
      fromTurnCount: row.fromTurnCount,
      createdAt: row.createdAt,
    };
  },
});

/** Internal — read full project + latest checkpoint for the recap action. */
export const _getProjectAndLatestCheckpoint = internalQuery({
  args: { projectId: v.id('safesparkProjects') },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    const latest = await ctx.db
      .query('safesparkCheckpoints')
      .withIndex('by_project_latest', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .first();
    return {
      project: {
        id: project._id,
        clerkUserId: project.clerkUserId,
        title: project.title,
        html: project.html,
        messages: project.messages,
        nextSteps: project.nextSteps ?? [],
        updatedAt: project.updatedAt,
      },
      latest: latest
        ? { fromTurnCount: latest.fromTurnCount, createdAt: latest.createdAt }
        : null,
    };
  },
});

/** Internal — write a new checkpoint row. */
export const _saveCheckpoint = internalMutation({
  args: {
    projectId: v.id('safesparkProjects'),
    clerkUserId: v.string(),
    content: v.string(),
    fromTurnCount: v.number(),
    htmlSize: v.number(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('safesparkCheckpoints', {
      projectId: args.projectId,
      clerkUserId: args.clerkUserId,
      content: args.content,
      fromTurnCount: args.fromTurnCount,
      htmlSize: args.htmlSize,
      model: args.model,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

/**
 * Action — best-effort generate a fresh checkpoint for a project.
 *
 * Cadence: skips if the latest checkpoint was made within
 * TURNS_BETWEEN_CHECKPOINTS messages AND within STALE_AFTER_MS. Otherwise
 * sends a compact summary prompt to gpt-4o-mini and stores the result.
 *
 * Failures are swallowed — checkpoints are an optimization, not a hard
 * requirement. The demo route should `void`-await this call so it never
 * blocks the user-facing response.
 */
export const maybeCreateCheckpoint = action({
  args: {
    projectId: v.id('safesparkProjects'),
    apiKey: v.optional(v.string()), // tests / local; falls back to env
  },
  handler: async (ctx, args): Promise<{ created: boolean; reason: string }> => {
    const data = await ctx.runQuery(
      internal.checkpoints._getProjectAndLatestCheckpoint,
      { projectId: args.projectId },
    );
    if (!data) return { created: false, reason: 'project not found' };
    const { project, latest } = data;
    const totalTurns = project.messages.length;

    // Bail if the project is too short for even the first recap. The first
    // checkpoint fires at FIRST_CHECKPOINT_AT; subsequent ones cadence at
    // TURNS_BETWEEN_CHECKPOINTS via the "recent checkpoint covers this" gate
    // below.
    const minTurns = latest ? TURNS_BETWEEN_CHECKPOINTS : FIRST_CHECKPOINT_AT;
    if (totalTurns < minTurns) {
      return { created: false, reason: 'too few turns' };
    }

    // Bail if a recent checkpoint already covers this state.
    if (latest) {
      const turnsSince = totalTurns - latest.fromTurnCount;
      const msSince = Date.now() - latest.createdAt;
      if (turnsSince < TURNS_BETWEEN_CHECKPOINTS && msSince < STALE_AFTER_MS) {
        return { created: false, reason: 'recent checkpoint covers this' };
      }
    }

    // Global pause kill-switch (cost control). Checkpoints are summary
    // calls triggered by builds; with builds paused this rarely fires, but
    // gate it so no path can spend while SAFESPARK_PAUSED is set.
    if (process.env.SAFESPARK_PAUSED === 'true') return { created: false, reason: 'paused' };

    const apiKey = args.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return { created: false, reason: 'no OPENAI_API_KEY' };

    const openai = new OpenAI({ apiKey });

    // Compact context for the recap: project title + first/last slice of
    // HTML + last N messages. We don't need the full HTML — the recap is
    // a high-level "what we built" not a code review.
    const html = project.html ?? '';
    const htmlSnippet =
      html.length <= HTML_SNIPPET_BYTES
        ? html
        : `${html.slice(0, HTML_SNIPPET_BYTES / 2)}\n... [truncated ${html.length - HTML_SNIPPET_BYTES} chars] ...\n${html.slice(-HTML_SNIPPET_BYTES / 2)}`;
    const recentMessages = project.messages
      .slice(-RECENT_MESSAGES_FOR_RECAP)
      .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 800)}`)
      .join('\n\n');

    const system = `You are summarizing a kid's in-progress project on SafeSpark, an AI maker for ages 9-15. The kid will keep iterating on this project across many sessions. Your recap will be prepended to the AI's system prompt on future turns so it doesn't forget what the project IS, what's been built, what the kid wants.

Write in concise markdown. Be specific — name the game premise, art style, characters, key mechanics, and recent decisions. Don't editorialize. Don't lecture. Don't suggest "next steps" — that's the kid's job. ~400-500 words max. Use these sections, in order:

# {Project title}
**Premise:** One sentence describing what this thing IS.

## What we've built
- bulleted list of concrete features / scenes / characters that exist in the current code
- include art direction (sprite style, color palette, mood)

## Design decisions the kid has made
- choices about mechanics, controls, win conditions, content
- things they've explicitly asked for OR explicitly rejected

## Recent work (last ~10 turns)
- what changed most recently
- what they're working on RIGHT NOW

## Code anchors
- 3-5 bullets naming key functions, variables, or DOM IDs in the code so future edits can reference them precisely (e.g. "main game loop: requestAnimationFrame in startGame()", "enemy sprite: img with id #enemy")`;

    const user = `Project title: ${project.title}

Current HTML (first/last slice):
\`\`\`html
${htmlSnippet}
\`\`\`

Last ${RECENT_MESSAGES_FOR_RECAP} messages of the conversation:
${recentMessages}`;

    let content = '';
    try {
      const completion = await openai.chat.completions.create({
        model: CHECKPOINT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_completion_tokens: RECAP_MAX_OUTPUT_TOKENS,
      });
      content = completion.choices?.[0]?.message?.content?.trim() ?? '';
    } catch (err) {
      console.error('[checkpoint] OpenAI failed', err);
      return { created: false, reason: 'openai error' };
    }

    if (!content) return { created: false, reason: 'empty recap' };

    await ctx.runMutation(internal.checkpoints._saveCheckpoint, {
      projectId: project.id as Id<'safesparkProjects'>,
      clerkUserId: project.clerkUserId,
      content,
      fromTurnCount: totalTurns,
      htmlSize: html.length,
      model: CHECKPOINT_MODEL,
    });

    return { created: true, reason: `${totalTurns} turns, ${content.length} chars` };
  },
});
