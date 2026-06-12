/**
 * SafeSpark text-to-speech via OpenAI TTS-1.
 *
 * Goal: replace the browser's Web Speech Synthesis ("computer voice")
 * with a warm, natural voice that's kid-friendly. OpenAI TTS-1 picked
 * over ElevenLabs because at ~$0.015/1k chars it's ~15× cheaper and
 * already on our existing OpenAI bill — no new vendor.
 *
 * Cost protection:
 *  - Hash-cache on (text, voice, model). Kids re-listen to the same
 *    Spark reply constantly; cache hits are free reads.
 *  - Per-kid daily call cap (default 50) so a spam-tapping kid can't
 *    blow up the monthly OpenAI bill. Parents can raise via dashboard
 *    later (not yet wired).
 *  - Fail open on errors → SpeakButton falls back to Web Speech.
 */

import { v } from 'convex/values';
import { action, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';

const MODEL = 'tts-1';
const DEFAULT_VOICE = 'nova';
const ALLOWED_VOICES = new Set(['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer']);
const MAX_CHARS = 1200; // ~one paragraph; longer texts get truncated
const DEFAULT_DAILY_CAP = 50;

type TtsResult = {
  ok: true;
  audioBase64: string;
  cached: boolean;
} | {
  ok: false;
  reason: 'budget' | 'unavailable' | 'invalid';
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function todayUTC(now: number): string {
  const d = new Date(now);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const synthesize = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
    // Optional kid scoping for the daily cap. Action is public so the
    // SpeakButton can call it directly; the kid resolution + budget
    // check happen via internal helpers below.
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<TtsResult> => {
    const text = args.text.trim().slice(0, MAX_CHARS);
    if (!text) return { ok: false, reason: 'invalid' };

    const voice = args.voice && ALLOWED_VOICES.has(args.voice) ? args.voice : DEFAULT_VOICE;
    const hash = await sha256Hex(`${MODEL}|${voice}|${text}`);

    // Cache lookup first — free path.
    const cached = await ctx.runQuery(internal.ai.tts._getCache, { hash });
    if (cached) {
      await ctx.runMutation(internal.ai.tts._touchCache, { id: cached._id });
      // Count cache hits against budget too, but cheaply (no API call).
      if (args.sessionToken) {
        await ctx.runMutation(internal.ai.tts._incrementUsage, {
          sessionToken: args.sessionToken,
          cached: true,
        });
      }
      return { ok: true, audioBase64: cached.audioBase64, cached: true };
    }

    // Cap check before paying OpenAI. Cache hits don't bill, so they
    // pass through cheaply above — only fresh synthesis counts toward
    // the cap meaningfully (we still record both for parent visibility).
    if (args.sessionToken) {
      const allowed = await ctx.runQuery(internal.ai.tts._checkBudget, {
        sessionToken: args.sessionToken,
      });
      if (!allowed) return { ok: false, reason: 'budget' };
    }

    // Global pause kill-switch (cost control). Block fresh OpenAI synthesis;
    // cache hits above still serve for free, and SpeakButton falls back to
    // the browser's built-in voice, so kids still hear text — at $0 spend.
    if (process.env.SAFESPARK_PAUSED === 'true') return { ok: false, reason: 'unavailable' };

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { ok: false, reason: 'unavailable' };

    let audioBase64: string;
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          voice,
          input: text,
          response_format: 'mp3',
          speed: 1.0,
        }),
      });
      if (!response.ok) return { ok: false, reason: 'unavailable' };
      const buf = await response.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // btoa works on binary strings; chunk to avoid call-stack limits
      // on multi-hundred-KB audio.
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
      }
      audioBase64 = btoa(binary);
    } catch {
      return { ok: false, reason: 'unavailable' };
    }

    await ctx.runMutation(internal.ai.tts._writeCache, {
      hash,
      voice,
      audioBase64,
    });
    if (args.sessionToken) {
      await ctx.runMutation(internal.ai.tts._incrementUsage, {
        sessionToken: args.sessionToken,
        cached: false,
      });
    }

    return { ok: true, audioBase64, cached: false };
  },
});

export const _getCache = internalQuery({
  args: { hash: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('safesparkTtsCache')
      .withIndex('by_hash', (q) => q.eq('hash', args.hash))
      .first();
  },
});

export const _touchCache = internalMutation({
  args: { id: v.id('safesparkTtsCache') },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return;
    await ctx.db.patch(args.id, {
      lastUsedAt: Date.now(),
      hitCount: (row.hitCount ?? 0) + 1,
    });
  },
});

export const _writeCache = internalMutation({
  args: {
    hash: v.string(),
    voice: v.string(),
    audioBase64: v.string(),
  },
  handler: async (ctx, args) => {
    // Defensive: if another concurrent action just wrote the same hash,
    // skip rather than create a duplicate.
    const existing = await ctx.db
      .query('safesparkTtsCache')
      .withIndex('by_hash', (q) => q.eq('hash', args.hash))
      .first();
    if (existing) return existing._id;
    const now = Date.now();
    return await ctx.db.insert('safesparkTtsCache', {
      hash: args.hash,
      voice: args.voice,
      audioBase64: args.audioBase64,
      sizeBytes: args.audioBase64.length,
      createdAt: now,
      lastUsedAt: now,
      hitCount: 1,
    });
  },
});

export const _checkBudget = internalQuery({
  args: { sessionToken: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) return true; // unknown session → permissive; cache + dailyQueryBudget already protect
    // Independent TTS cap — deliberately NOT profile.dailyQueryBudget (the
    // BUILD cap). Coupling them meant raising a kid's build budget silently
    // raised allowed TTS spend, and gave no way to cap TTS on its own.
    // Cache hits don't count (only fresh syntheses bill OpenAI). Tunable
    // via SAFESPARK_TTS_DAILY_CAP without a deploy.
    const cap = Number(process.env.SAFESPARK_TTS_DAILY_CAP) || DEFAULT_DAILY_CAP;
    const day = todayUTC(Date.now());
    const usage = await ctx.db
      .query('safesparkTtsUsage')
      .withIndex('by_kid_day', (q) =>
        q.eq('kidProfileId', session.kidProfileId).eq('yearMonthDay', day),
      )
      .first();
    if (!usage) return true;
    return usage.calls < cap;
  },
});

export const _incrementUsage = internalMutation({
  args: { sessionToken: v.string(), cached: v.boolean() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('kidSessions')
      .withIndex('by_token', (q) => q.eq('sessionToken', args.sessionToken))
      .first();
    if (!session) return;
    const day = todayUTC(Date.now());
    const existing = await ctx.db
      .query('safesparkTtsUsage')
      .withIndex('by_kid_day', (q) =>
        q.eq('kidProfileId', session.kidProfileId).eq('yearMonthDay', day),
      )
      .first();
    const now = Date.now();
    if (!existing) {
      await ctx.db.insert('safesparkTtsUsage', {
        kidProfileId: session.kidProfileId,
        yearMonthDay: day,
        calls: args.cached ? 0 : 1,
        cachedHits: args.cached ? 1 : 0,
        updatedAt: now,
      });
      return;
    }
    await ctx.db.patch(existing._id, {
      calls: existing.calls + (args.cached ? 0 : 1),
      cachedHits: existing.cachedHits + (args.cached ? 1 : 0),
      updatedAt: now,
    });
  },
});
