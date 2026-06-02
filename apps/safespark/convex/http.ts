import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal, api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import provisionUser from './provisionUser';

const http = httpRouter();

// SafeFamily platform contract — every sibling app exposes the same admin
// endpoints with a shared admin key, callable by the central operator (or
// the marketing Convex). Auth: ?key=<SAFESPARK_ADMIN_KEY env var>.

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function ok(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function checkAdminKey(url: URL): boolean {
  const key = url.searchParams.get('key');
  const expected = process.env.SAFESPARK_ADMIN_KEY;
  return Boolean(expected) && key === expected;
}

http.route({
  path: '/adminDashboard',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    if (!checkAdminKey(url)) return unauthorized();
    const data = await ctx.runQuery(internal.safespark.adminSnapshot, {});
    return ok(data);
  }),
});

http.route({
  path: '/adminDashboard',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }),
});

http.route({
  path: '/grantLifetime',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    if (!checkAdminKey(url)) return unauthorized();
    const email = url.searchParams.get('email');
    if (!email) return ok({ ok: false, error: 'email required' });
    const result = await ctx.runMutation(internal.safespark.adminSetSubscription, {
      email,
      status: 'lifetime',
    });
    return ok(result);
  }),
});

http.route({
  path: '/setSubscriptionStatus',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    if (!checkAdminKey(url)) return unauthorized();
    const email = url.searchParams.get('email');
    const status = url.searchParams.get('status');
    if (!email || !status) return ok({ ok: false, error: 'email + status required' });
    if (!['trial', 'active', 'lifetime', 'cancelled', 'expired'].includes(status)) {
      return ok({ ok: false, error: 'invalid status' });
    }
    const result = await ctx.runMutation(internal.safespark.adminSetSubscription, {
      email,
      status: status as 'trial' | 'active' | 'lifetime' | 'cancelled' | 'expired',
    });
    return ok(result);
  }),
});

http.route({
  path: '/deleteUser',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    if (!checkAdminKey(url)) return unauthorized();
    const email = url.searchParams.get('email');
    if (!email) return ok({ ok: false, error: 'email required' });
    const result = await ctx.runMutation(internal.safespark.adminDeleteUser, { email });
    return ok(result);
  }),
});

http.route({
  path: '/syncFamilyCode',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    if (!checkAdminKey(url)) return unauthorized();
    const email = url.searchParams.get('email');
    const code = url.searchParams.get('code');
    if (!email) return ok({ ok: false, error: 'email required' });
    const result = await ctx.runMutation(internal.safespark.adminSyncFamilyCode, {
      email,
      code: code ?? undefined,
    });
    return ok(result);
  }),
});

// /provisionUser — receives provisioning calls from Marketing Central
// when a Safe Family subscription includes the SafeSpark tier. Mirrors
// the contract used by SafeReads/SafeStudy/SafeTunes/SafeTube.
http.route({
  path: '/provisionUser',
  method: 'POST',
  handler: provisionUser,
});
http.route({
  path: '/provisionUser',
  method: 'OPTIONS',
  handler: provisionUser,
});

// -----------------------------------------------------------------------------
// spark.db — kid-project shared key/value store HTTP layer.
//
// The kid's published HTML can't authenticate to Convex (it has no Clerk
// JWT or Convex Auth identity — it's just a sandboxed iframe), so the SDK
// shim talks to these endpoints, which run as anonymous httpActions.
// Auth model: project-scoped. Anyone who knows a projectId can read/write
// data for that project — the same trust model as a localStorage-backed
// leaderboard, but shared across devices. Owner can wipe via the dashboard.
// -----------------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const;

function corsOk(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

for (const path of ['/sparkdb/get', '/sparkdb/set', '/sparkdb/append', '/sparkdb/list']) {
  http.route({
    path,
    method: 'OPTIONS',
    handler: httpAction(async () => corsPreflight()),
  });
}

http.route({
  path: '/sparkdb/get',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as
      | { projectId?: string; key?: string }
      | null;
    if (!body?.projectId || !body.key) {
      return corsOk({ error: 'projectId and key required' }, 400);
    }
    const result = await ctx.runQuery(api.sparkdb.dbGet, {
      projectId: body.projectId as Id<'safesparkProjects'>,
      key: body.key,
    });
    return corsOk({ value: result?.value ?? null, updatedAt: result?.updatedAt ?? null });
  }),
});

http.route({
  path: '/sparkdb/list',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as { projectId?: string } | null;
    if (!body?.projectId) return corsOk({ error: 'projectId required' }, 400);
    const result = await ctx.runQuery(api.sparkdb.dbList, {
      projectId: body.projectId as Id<'safesparkProjects'>,
    });
    return corsOk({ items: result });
  }),
});

http.route({
  path: '/sparkdb/set',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as
      | { projectId?: string; key?: string; value?: unknown }
      | null;
    if (!body?.projectId || !body.key || body.value === undefined) {
      return corsOk({ error: 'projectId, key, value required' }, 400);
    }
    try {
      const result = await ctx.runMutation(api.sparkdb.dbSet, {
        projectId: body.projectId as Id<'safesparkProjects'>,
        key: body.key,
        value: JSON.stringify(body.value),
      });
      return corsOk({ ok: true, updatedAt: result.updatedAt });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'set failed';
      return corsOk({ ok: false, error: msg }, 400);
    }
  }),
});

http.route({
  path: '/sparkdb/append',
  method: 'POST',
  handler: httpAction(async (ctx, req) => {
    const body = (await req.json().catch(() => null)) as
      | { projectId?: string; key?: string; item?: unknown }
      | null;
    if (!body?.projectId || !body.key || body.item === undefined) {
      return corsOk({ error: 'projectId, key, item required' }, 400);
    }
    try {
      const result = await ctx.runMutation(api.sparkdb.dbAppend, {
        projectId: body.projectId as Id<'safesparkProjects'>,
        key: body.key,
        item: JSON.stringify(body.item),
      });
      return corsOk({ ok: true, updatedAt: result.updatedAt, length: result.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'append failed';
      return corsOk({ ok: false, error: msg }, 400);
    }
  }),
});

// SDK shim. Served as text/javascript so kid HTML can include it via:
//   <script src="https://giddy-peacock-124.convex.site/sparkdb.js"></script>
// The projectId is provided at runtime via window.__SPARK_PROJECT_ID__,
// set by the iframe wrapper in /make and /s/[id].
http.route({
  path: '/sparkdb.js',
  method: 'GET',
  handler: httpAction(async () => {
    const js = `(function(){
  if (window.spark && window.spark.db) return;
  var origin = '${process.env.CONVEX_SITE_URL ?? ''}';
  function pid() {
    return window.__SPARK_PROJECT_ID__ || (new URLSearchParams(location.search)).get('sparkProjectId') || null;
  }
  async function call(path, body) {
    var p = pid();
    if (!p) throw new Error('spark.db: no project id — open this from /make or a /s/ share link.');
    var res = await fetch(origin + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ projectId: p }, body || {})),
    });
    var json = await res.json();
    if (json && json.error) throw new Error(json.error);
    return json;
  }
  window.spark = window.spark || {};
  window.spark.db = {
    async get(key) { var r = await call('/sparkdb/get', { key: key }); return r.value == null ? null : JSON.parse(r.value); },
    async set(key, value) { return call('/sparkdb/set', { key: key, value: value }); },
    async append(key, item) { return call('/sparkdb/append', { key: key, item: item }); },
    async list() { var r = await call('/sparkdb/list', {}); return (r.items||[]).map(function(x){ return { key: x.key, value: JSON.parse(x.value), updatedAt: x.updatedAt }; }); },
  };
})();`;
    return new Response(js, {
      status: 200,
      headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        ...corsHeaders,
      },
    });
  }),
});

// Operator inspection endpoints. Admin-key gated like /adminDashboard,
// but return data about kid-Spark interactions specifically so the
// SafeFamily operator (or any tooling holding the admin key) can read
// project threads and search the system. Added 2026-05-29 so Jeremiah
// can hand "look at my dungeon game" to a script/agent and have it
// actually look.

// GET /opsReviewFeed?key=... [&promptLimit=...&blockedLimit=...&concernLimit=...]
http.route({
  path: '/opsReviewFeed',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    if (!checkAdminKey(url)) return unauthorized();
    const promptLimit = Number(url.searchParams.get('promptLimit') ?? 200);
    const blockedLimit = Number(url.searchParams.get('blockedLimit') ?? 100);
    const concernLimit = Number(url.searchParams.get('concernLimit') ?? 50);
    const data = await ctx.runQuery(internal.safespark._opsReviewFeedInternal, {
      promptLimit: Number.isFinite(promptLimit) ? promptLimit : 200,
      blockedLimit: Number.isFinite(blockedLimit) ? blockedLimit : 100,
      concernLimit: Number.isFinite(concernLimit) ? concernLimit : 50,
    });
    return ok(data);
  }),
});

// GET /opsSearchProjects?key=...&q=dungeon[&limit=25]
http.route({
  path: '/opsSearchProjects',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    if (!checkAdminKey(url)) return unauthorized();
    const q = url.searchParams.get('q') ?? '';
    const limit = Number(url.searchParams.get('limit') ?? 25);
    const data = await ctx.runQuery(internal.safespark._opsSearchProjectsInternal, {
      query: q,
      limit: Number.isFinite(limit) ? limit : 25,
    });
    return ok({ query: q, count: data.length, results: data });
  }),
});

// GET /opsGetProject?key=...&id=<projectId>
http.route({
  path: '/opsGetProject',
  method: 'GET',
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    if (!checkAdminKey(url)) return unauthorized();
    const idParam = url.searchParams.get('id');
    if (!idParam) return ok({ ok: false, error: 'id required' });
    const data = await ctx.runQuery(internal.safespark._opsGetProjectInternal, {
      projectId: idParam as Id<'safesparkProjects'>,
    });
    if (!data) return ok({ ok: false, error: 'project not found' });
    return ok({ ok: true, project: data });
  }),
});

export default http;
