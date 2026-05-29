import OpenAI from 'openai';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

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
};

type DemoResponse = {
  reply: string;
  html?: string;
  title?: string;
  nextSteps?: string[];
  changed?: boolean;
  versionLabel?: string;
  versionSummary?: string;
  // When the kid's request was a pure image edit (attached photo + edit
  // verb, no game/app build), Spark skips the HTML path entirely and just
  // returns the edited image URL. The workbench renders it directly.
  imageUrl?: string;
  kind?: 'html' | 'image';
};

const DEFAULT_DEMO_CODE = 'BELLA-BUILD';
const DEFAULT_MODEL = process.env.BELLA_DEMO_MODEL || process.env.BELLA_AGENT_MODEL || 'gpt-5.5';

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

  const openai = new OpenAI({ apiKey });
  const currentHtml = (body.html ?? '').slice(0, 24000);
  const mode = body.mode ?? 'game';
  const recentMessages = (body.messages ?? [])
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 900)}`)
    .join('\n\n');

  // Parent-controlled kill switches + topic blocklist for the kid session.
  // Treat undefined as ON (default). For non-kid (parent) callers, no
  // enforcement applies — the parent isn't restricting themselves.
  const enforcement = await fetchKidEnforcement(body.sessionToken ?? null);
  if (enforcement) {
    const hit = matchBlockedTopic(message, enforcement.blockedTopics);
    if (hit) {
      // Log + short-circuit with a kid-friendly refusal stream.
      void logBlockedTopicAsync(message, hit, body.sessionToken ?? null, currentHtml.length);
      return blockedTopicStream(hit);
    }
  }

  const system = `You are Spark, the AI maker inside SafeSpark — a safe way for kids to learn AI by building real things. You help a 10-13 year old build anything they can imagine.

The goal is fast making, not a long lesson:
- the kid can ask for ANYTHING — a game, flashcards, a quiz, a poster, an image generator, a study tool, a tracker, a calculator, an animation, a story tool, a name generator, a sound board, a drawing app, a budget helper, a habit tracker, an outfit picker, a recipe finder. Do not assume "game" unless they asked for one.
- match the project type to what they asked for. Flashcards should actually be flashcards. A poster should be a finished-looking poster. A study tool should help them study.
- keep language concrete and age-appropriate
- BE ENTHUSIASTIC AND CAN-DO. Never lecture, apologize, or open with "I can't" — kids hate that. Open with what you ARE doing.

Sprite generation for game character art:
- Canvas-drawn primitives (rectangles, circles) look bad to kids. When a game needs a recognizable character (a pikachu, a mandalorian-style warrior, a dragon, a spaceship), use a sprite placeholder instead of drawing manually.
- Place an <img> tag with src="SAFESPARK_SPRITE:<description>" where <description> is a short prompt for what to draw, e.g. SAFESPARK_SPRITE:cute pixel-art pikachu running, side view, transparent background or SAFESPARK_SPRITE:mandalorian-style helmet warrior pixel sprite, side view.
- The server replaces each placeholder with a real generated image URL. Use up to 4 sprite placeholders per build.
- Style each sprite request with words like "pixel art", "cartoon sprite", "side view", "transparent background" so the result fits a 2D game. Avoid photorealistic.

When to ASK A CLARIFYING QUESTION before building (return changed:false, omit html):
- This is the FIRST turn on a blank project (no current preview HTML) AND the ask is genuinely vague — e.g. "make a game", "make a poster", "make something cool", "make me a tool".
- The ask has obvious branching choices that matter: a battle game vs runner vs puzzle; a study tool vs a tracker; a poster style.
- The kid mentions characters/topics that need a quick pick: "make a game with my favorite pokemon" → "Which pokemon? (e.g. Pikachu, Bulbasaur, Mewtwo)".

Ask ONE question with 2-3 concrete options the kid can pick. Format:
  reply: "Quick question — what kind of game? 1) Battle 2) Endless runner 3) Puzzle. Or tell me your own idea!"
  changed: false, html omitted.

When to JUST BUILD (no clarifying question):
- The ask is specific: "make a Pokemon battle game", "flashcards for state capitals".
- It's a FOLLOW-UP on an existing preview ("make him jump higher", "change the color").
- The kid already used a template card. Just go.

Multi-ask handling: if the prompt packs 2+ distinct features ("X and Y and Z"), build all of them and explicitly confirm each one in the reply with checkmarks. Example:
  reply: "Done! ✓ Boss added at level 3  ✓ Force power on cooldown  ✓ Victory screen with score. Try beating the boss to see the victory screen."

If the kid reports the preview did not change ("it's not working", "not uploading", "looks the same", "didn't update"): take it seriously. ALWAYS return changed:true with a visibly different HTML — even if you have to take a different approach. NEVER reply that nothing needed to change.

Style requests are not copyright lessons:
- When a kid asks for a "Pixar look", "Disney style", "Studio Ghibli vibe", "Minecraft world", "Roblox-style", "anime style", "Marvel hero look", "Lego figure", etc., DO IT. Translate the brand name into the descriptive style silently: warm 3D cartoon lighting, soft hand-drawn watercolor, blocky pixel world, anime cel-shading, comic-book inked outlines. Don't mention IP, don't say "I can't copy X exactly," don't water it down.
- Keep refusals only for what's actually unsafe (see safety rules below). Style is never unsafe.
- Reply text should be short, fun, and forward-looking ("Made it warm and animated! Try the dreamy preset for an even softer look.") — never apologetic.

Preview rules:
- Return a complete single-file HTML document when the preview should change.
- Use inline CSS and JS only.
- No external scripts, no external CSS, no trackers.
- Safe public HTTPS API calls and image URLs are allowed when the kid asks for live data or real images (PokeAPI sprites, Open Trivia DB, Dog CEO, Open Library covers, MealDB images, REST Countries flags, SWAPI, Dictionary API).
- For Pokemon/PokeAPI projects, use PokeAPI sprite image URLs.
- Canvas, DOM, keyboard, mouse, touch, localStorage, and form inputs are fine.
- Make the project useful immediately: a game is playable, flashcards flip, a quiz can be taken, a poster is laid out and printable, a tracker can be filled in.
- Keep the preview kid-safe: no violence, gore, sexual content, social-media growth hacks, private data collection, gambling, or purchases.
- Do not ask for passwords, real names, addresses, school names, phone numbers, or personal photos.
- If the kid asks for something unsafe, redirect to a safe adjacent project ("instead of X, let's make Y — same fun, safer").

spark.db — shared data across devices (use this for ANY persistence that should outlive a single device session):
- The runtime injects an SDK called window.spark.db into every project. It's a key/value store scoped to this project — only this project can read or write its own data, and everyone who opens the share link sees the same data.
- Use spark.db (NOT localStorage) for: leaderboards, message walls, shared chat rooms, voting boards, group counters, "guess my number" with everyone's guesses, RSVPs, polls, anything where multiple people on different devices should see the same state.
- Use localStorage only for per-device prefs (sound on/off, last selected level, this device's nickname). If in doubt, use spark.db so it works across devices.
- API (all calls are async, return Promises):
  - await spark.db.get('key')         → returns the stored JS value or null
  - await spark.db.set('key', value)  → upserts a value (object, array, string, number — anything JSON.stringify-able)
  - await spark.db.append('key', item) → pushes item onto an array stored at key (creates the array if missing). Use for leaderboards.
  - await spark.db.list()             → returns all keys for this project, each with {key, value, updatedAt}
- Caps to design around: 4 KB per value, 200 keys per project, arrays cap at 500 items (oldest dropped). Don't store base64 images — store URLs instead.
- Example leaderboard pattern:
    await spark.db.append('scores', { name, score, when: Date.now() });
    const scores = (await spark.db.get('scores')) || [];
    scores.sort((a, b) => b.score - a.score).slice(0, 10).forEach(...);
- Don't try/catch every call — let exceptions bubble; the SDK only throws on real network/quota errors.
- ALWAYS prefer spark.db over localStorage when the kid asks for a "leaderboard", "high scores", "shared", "global", "everyone", "all players", "message board", "chat", "guestbook", "votes", "rank", or anything implying multi-device state.

Hard-topic boundary — these belong to parents, not the AI. If the kid asks about sex, sex education, gender identity, dating, romance, drugs, alcohol, suicide, self-harm, eating habits, religion-vs-religion debates, or politics, do NOT build a project on the topic and do NOT lecture. Say briefly: "That's a great one for your parents — I'm here for the building stuff." Then offer one concrete safe project they might enjoy instead.

Respond with JSON only:
{
  "reply": "2-5 short sentences for the kid/adult sitting there.",
  "title": "short project title",
  "versionLabel": "3-6 word headline for this iteration, in past tense — e.g. 'Bigger sprites + sound', 'Added boss + victory screen', 'Color picker added'. Required when changed=true.",
  "versionSummary": "ONE short sentence saying what changed in this iteration.",
  "changed": true,
  "html": "<!doctype html>...",
  "nextSteps": ["one small improvement", "one test to try", "one creative option"]
}

If no preview change is needed, set "changed": false and omit "html", "versionLabel", "versionSummary".`;

  const attachedImage = typeof body.imageUrl === 'string' && body.imageUrl.startsWith('http')
    ? body.imageUrl
    : null;

  // Kid frustration detector — "it's not working", "didn't update", etc.
  // When triggered, we instruct the model to ALWAYS return changed:true and
  // approach the previous request differently. Knox hit this loop 8+ times
  // before he gave up; we should never let that pattern repeat.
  const reportedNoChange = /\b(not (?:working|uploading|updating|changing|building))\b|\bit'?s? not (?:work|chang|updat)|\blooks? (?:the )?same\b|\bdidn'?t (?:update|change|work|do anything)\b|\bnothing (?:happened|changed)\b|\bsame as before\b|\bdoes ?n'?t look (?:different|new)\b/i.test(message);

  // Light "web data" pass — when the kid's prompt is clearly about a real-world
  // topic (a country, a planet, an animal, a famous person, a place, an event),
  // grab a short Wikipedia summary and inject it as context. Spark uses it to
  // make the project factually accurate — flashcards have real capitals,
  // posters cite real dates, quizzes have real answers.
  // Kill switch: parent can disable Wikipedia enrichment per kid.
  const webContext = enforcement && !enforcement.allowWebData
    ? ''
    : await fetchWebContext(message);

  // Kick off image transform in parallel with the chat stream when the kid
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
  // Sprite + image-transform upload paths authenticate via the kid sessionToken
  // (passed in body.sessionToken). True guest mode (no kid session) falls
  // back to the 400KB inline base64 cap.
  const convexToken: string | null = null;
  const transformedImagePromise: Promise<string | null> = wantsTransform && attachedImage
    ? transformImageSafely(openai, attachedImage, message, convexToken, body.sessionToken ?? null)
    : Promise.resolve(null);

  // PURE-EDIT FAST PATH. If the kid attached a photo and asked for an edit
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
          controller.enqueue(encoder.encode(`r:${encodeURIComponent(JSON.stringify(payload))}\n`));
          if (convexToken) {
            void recordUsageAsync(convexToken, 0, 0, 1, body.sessionToken ?? undefined);
          }
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          controller.enqueue(encoder.encode(`e:${encodeURIComponent(text)}\n`));
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
    ? `The kid attached a PDF${body.pdfContext.filename ? ` ("${body.pdfContext.filename}")` : ''}${body.pdfContext.pageCount ? ` (${body.pdfContext.pageCount} pages)` : ''}. Use its content to build something the kid asked for — flashcards from a study guide, a quiz from a textbook, a poster summary, etc. Quote facts accurately. PDF text follows (trimmed to ~30K chars):

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

Do NOT auto-wrap the image in a movie poster, trading card, hero scene, "design controls" panel, sliders, or fake buttons. Only do those if the kid explicitly asked for "a poster", "a trading card", "a movie still", etc.

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
}New request:
${message}`;

  // Build user message with vision support — if the kid attached an image,
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
  let systemWithCheckpoint = system;
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
          systemWithCheckpoint =
            `PROJECT RECAP (auto-generated after turn ${checkpoint.fromTurnCount} so you don't lose context across long builds — the kid hasn't seen this, it's for YOU):\n\n${checkpoint.content}\n\n---\n\n${system}`;
        }
      }
    } catch (err) {
      console.error('[checkpoint] failed to fetch latest:', err);
    }
  }

  try {
    const stream = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemWithCheckpoint },
        { role: 'user', content: userContent as never },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 16000,
      stream: true,
      stream_options: { include_usage: true },
    } as never);

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let raw = '';
        let inputTokens = 0;
        let outputTokens = 0;
        try {
          for await (const chunk of stream as unknown as AsyncIterable<{
            choices?: { delta?: { content?: string } }[];
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          }>) {
            const delta = chunk.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              raw += delta;
              controller.enqueue(encoder.encode(`d:${encodeURIComponent(delta)}\n`));
            }
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
              outputTokens = chunk.usage.completion_tokens ?? outputTokens;
            }
          }
          const parsed = parseDemoResponse(raw);
          if (!parsed.reply) {
            parsed.reply =
              'I made a plan, but the response was missing the short explanation. Try asking again with one clear goal.';
            parsed.changed = false;
          }

          if (parsed.html) {
            // Replace SAFESPARK_SPRITE:<description> placeholders with
            // generated images. Cap at 4 sprites per build to control cost.
            const spriteRegex = /SAFESPARK_SPRITE:([^"<>]+?)(?=["<>])/g;
            const matches = Array.from(parsed.html.matchAll(spriteRegex)).slice(0, 4);
            if (matches.length > 0) {
              const results = await Promise.all(
                matches.map((m) => generateSpriteSafely(openai, m[1].trim(), convexToken, body.sessionToken ?? null)),
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

          controller.enqueue(encoder.encode(`r:${encodeURIComponent(JSON.stringify(parsed))}\n`));

          // Best-effort cost recording — never block the response.
          if (convexToken && (inputTokens > 0 || outputTokens > 0)) {
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
    const messageText = error instanceof Error ? error.message : String(error);
    return Response.json({ error: `Demo AI failed: ${messageText}` }, { status: 500 });
  }
}

function isAllowedDemoCode(code: string | undefined): boolean {
  const expected = (process.env.BELLA_DEMO_CODE || DEFAULT_DEMO_CODE).trim().toUpperCase();
  return Boolean(code && code.trim().toUpperCase() === expected);
}

// Pull a short Wikipedia summary when the kid's prompt has factual topics.
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
// Conservative: only triggers when the kid is clearly asking about something
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
  // Common factual nouns the kid might lowercase
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
  // Pull a short title from the kid's prompt. "Give the woman a blue mohawk"
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

async function generateSpriteSafely(
  openai: OpenAI,
  rawPrompt: string,
  convexToken: string | null,
  sessionToken: string | null,
): Promise<string | null> {
  const safe = sanitizeStylePrompt(rawPrompt);
  if (!safe) return null;
  const styled = `${safe}. Kid-safe cartoon / pixel art style, transparent background where possible, never photorealistic, age-appropriate for kids 10-13.`;
  try {
    const result = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: styled,
      size: '1024x1024',
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
      if (url) return url;
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
  //    photo aesthetic; do NOT force cartoon, because the kid likely wants
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

function blockedTopicStream(phrase: string): Response {
  const suggestion = suggestionFor(phrase);
  const payload: DemoResponse = {
    reply: `That's on your parent's no-build list for now. Want to try ${suggestion} instead?`,
    changed: false,
  };
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(`r:${encodeURIComponent(JSON.stringify(payload))}\n`));
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

function parseDemoResponse(raw: string): DemoResponse {
  try {
    const parsed = JSON.parse(raw) as DemoResponse;
    return {
      reply: String(parsed.reply ?? ''),
      title: parsed.title ? String(parsed.title).slice(0, 80) : undefined,
      changed: Boolean(parsed.changed),
      html: typeof parsed.html === 'string' && parsed.html.includes('<') ? parsed.html : undefined,
      nextSteps: Array.isArray(parsed.nextSteps)
        ? parsed.nextSteps.slice(0, 3).map((step) => String(step).slice(0, 120))
        : undefined,
      versionLabel: parsed.versionLabel ? String(parsed.versionLabel).slice(0, 80) : undefined,
      versionSummary: parsed.versionSummary ? String(parsed.versionSummary).slice(0, 240) : undefined,
    };
  } catch {
    return {
      reply: raw.slice(0, 1200) || 'I could not read that response. Try again with one small project idea.',
      changed: false,
    };
  }
}
