// Injects the spark.db SDK shim + the runtime project id into a kid's
// project HTML before it's handed to an <iframe srcDoc>. The shim is
// served by the Convex deployment so the same code reaches /make
// previews and /s/<shareId> share viewers.

export function injectSparkDb(html: string, projectId: string | null | undefined): string {
  if (!html) return html;
  // The SDK shim lives on Convex's HTTP action surface, served from the
  // .site host. Prefer an explicit NEXT_PUBLIC_CONVEX_SITE_URL when set,
  // otherwise derive it from NEXT_PUBLIC_CONVEX_URL (which is always set
  // in any environment that's actually talking to Convex) by swapping
  // `.convex.cloud` for `.convex.site`. This makes the inject work on
  // Vercel without depending on a second env var to be remembered.
  // trim(): the Vercel env var carried a trailing newline (added via a
  // piped `vercel env add`), which defeated the $-anchored replace below —
  // the injected script src became `…convex.cloud\n/sparkdb.js` (404) and
  // spark.db was silently dead in every preview/share. Found 2026-06-12.
  const convexCloud = (process.env.NEXT_PUBLIC_CONVEX_URL ?? '').trim();
  const convexSite = (
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim() ||
    convexCloud.replace(/\.convex\.cloud(\/?)$/i, '.convex.site$1')
  );
  if (!convexSite) return html;
  const pidLiteral = projectId ? JSON.stringify(projectId) : 'null';
  // CSP injection — caps what the kid's iframe can talk to over the network.
  // All render surfaces use sandbox WITHOUT allow-same-origin (opaque
  // origin) as of 2026-06-12, so generated code can no longer read the
  // parent's localStorage (Marketing JWT, kid session tokens). The CSP
  // remains as the second layer: even an opaque iframe can fetch(), and
  // `connect-src` keeps egress limited to the approved public APIs.
  // Added 2026-05-29 safety audit (D2). Allowlist matches the public APIs
  // the system prompt explicitly approves for live data in kid projects.
  const cspContent = [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:",
    // Network egress whitelist — only known-safe APIs the prompt approves.
    // 'self' covers same-origin fetches; the convex domains cover spark.db.
    `connect-src 'self' ${convexSite} https://*.convex.site https://*.convex.cloud https://pokeapi.co https://raw.githubusercontent.com https://opentdb.com https://dog.ceo https://openlibrary.org https://covers.openlibrary.org https://www.themealdb.com https://restcountries.com https://swapi.dev https://api.dictionaryapi.dev https://en.wikipedia.org https://api.pokemontcg.io https://images.pokemontcg.io`,
    // Form submission to anywhere = exfil vector. Block.
    "form-action 'self'",
    // Prevent the iframe from framing further untrusted content.
    "frame-src 'none'",
    "frame-ancestors 'self'",
  ].join('; ');
  // Truthfulness bridge — when the iframe's network requests fail (CSP
  // block, CORS rejection, 4xx/5xx, network error), postMessage the
  // parent so the chat can show an HONEST inline note instead of letting
  // the model silently iterate on the wrong layer. Without this, a kid
  // hits "only loads 4 cards" → model says "fixed loading" → nothing
  // changed → kid gives up. The parent (DemoWorkbench) catches these
  // events and (a) renders an inline chat note in plain English, (b)
  // stores them to prepend as system context on the kid's NEXT prompt
  // so the model finally has ground truth.
  const errorBridge = `
<script>
(function(){
  function send(payload){ try{ parent.postMessage(Object.assign({source:'spark-iframe'}, payload), '*'); } catch(e){} }
  // CSP connect-src blocks fire this event. blockedURI is the host that
  // got rejected. We surface it as a "network blocked" report.
  document.addEventListener('securitypolicyviolation', function(e){
    if(e.effectiveDirective && /connect-src|default-src/.test(e.effectiveDirective)){
      send({ type:'spark:network-blocked', url:e.blockedURI||'', directive:e.effectiveDirective });
    }
  });
  // Wrap fetch so we catch 4xx/5xx + network errors (CORS rejections,
  // DNS failures, timeouts). Don't break the project's own error handling.
  // Skip AbortError — almost always intentional dev cancellation (kid's
  // code uses AbortController to cancel in-flight requests when switching
  // pages / pressing reload / hitting its own timeout). Surfacing those
  // as "couldn't reach X" misleads the kid into thinking the API is down
  // when their own code just canceled the request.
  var _fetch = window.fetch;
  if(typeof _fetch === 'function'){
    window.fetch = function(input, init){
      var url = '';
      try{ url = typeof input === 'string' ? input : (input && input.url) || ''; }catch(e){}
      return _fetch.apply(this, arguments).then(function(res){
        if(res && !res.ok && res.status >= 400){
          send({ type:'spark:fetch-error', url:url, status:res.status });
        }
        return res;
      }).catch(function(err){
        var name = err && err.name;
        if(name === 'AbortError') { throw err; }
        send({ type:'spark:fetch-error', url:url, message:(err&&err.message)||String(err) });
        throw err;
      });
    };
  }
  // Uncaught JS errors — model bugs, not infra. Surface the message + line
  // so the model can debug instead of guessing.
  window.addEventListener('error', function(e){
    send({ type:'spark:script-error', message:(e.error&&e.error.message)||e.message||'', filename:e.filename||'', line:e.lineno||0 });
  });
  window.addEventListener('unhandledrejection', function(e){
    var m = (e.reason && (e.reason.message||String(e.reason))) || '';
    send({ type:'spark:script-error', message:m, kind:'promise' });
  });
})();
</script>
`;
  // Mobile-friendly touch defaults for kid-built games. Without these,
  // iOS Safari eats two-finger pinch (shrinks the canvas), swipe-from-
  // left (navigates back), and pull-down (refreshes). The page's
  // viewport meta handles pinch-zoom, this handles the gesture class.
  // user-select:none prevents long-press from selecting random UI text.
  const mobileTouchCss = `
<style>
  html, body {
    touch-action: none;
    overscroll-behavior: none;
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
  /* Re-enable selection on explicit text inputs inside the kid's build. */
  input, textarea, [contenteditable] {
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
  }
</style>
`;
  // Opaque-origin storage shim. The sandbox (no allow-same-origin) makes
  // window.localStorage/sessionStorage THROW on access — and the system
  // prompt tells the model localStorage is fine for per-device prefs, so
  // generated games use it. Shadow both with in-memory stores so those
  // games run instead of crashing (this was already silently breaking
  // localStorage games in the share viewer, which has always been opaque).
  // Persistence across reloads is lost in the sandbox; spark.db is the
  // blessed path for anything durable. Must run before the error bridge,
  // the sparkdb shim, and all project code.
  const storageShim = `
<script>
(function(){
  function memStorage(){
    var mem = Object.create(null);
    return {
      getItem: function(k){ k = String(k); return k in mem ? mem[k] : null; },
      setItem: function(k, v){ mem[String(k)] = String(v); },
      removeItem: function(k){ delete mem[String(k)]; },
      clear: function(){ mem = Object.create(null); },
      key: function(i){ var ks = Object.keys(mem); return i >= 0 && i < ks.length ? ks[i] : null; },
      get length(){ return Object.keys(mem).length; }
    };
  }
  function needsShim(name){
    try { void window[name].length; return false; } catch (e) { return true; }
  }
  ['localStorage', 'sessionStorage'].forEach(function(name){
    if (needsShim(name)) {
      try { Object.defineProperty(window, name, { value: memStorage(), configurable: true }); } catch (e) {}
    }
  });
})();
</script>
`;
  const inject = `
<meta http-equiv="Content-Security-Policy" content="${cspContent}">
${mobileTouchCss}
${storageShim}
${errorBridge}
<script>window.__SPARK_PROJECT_ID__ = ${pidLiteral};</script>
<script src="${convexSite}/sparkdb.js"></script>
`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${inject}`);
  }
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${inject}`);
  }
  return inject + html;
}
