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
  const convexCloud = process.env.NEXT_PUBLIC_CONVEX_URL ?? '';
  const convexSite =
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ??
    convexCloud.replace(/\.convex\.cloud(\/?)$/i, '.convex.site$1');
  if (!convexSite) return html;
  const pidLiteral = projectId ? JSON.stringify(projectId) : 'null';
  // CSP injection — caps what the kid's iframe can talk to over the network.
  // The iframe has `sandbox="allow-scripts allow-same-origin allow-pointer-lock"` so JS inside
  // it can read the parent's localStorage (which holds Marketing JWT etc.)
  // — without this CSP, a prompt-injected LLM emission could exfiltrate
  // tokens to an attacker URL via fetch(). CSP `connect-src` blocks that.
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
  const inject = `
<meta http-equiv="Content-Security-Policy" content="${cspContent}">
${mobileTouchCss}
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
