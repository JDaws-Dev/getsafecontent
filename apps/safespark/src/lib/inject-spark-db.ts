// Injects the spark.db SDK shim + the runtime project id into a kid's
// project HTML before it's handed to an <iframe srcDoc>. The shim is
// served by the Convex deployment so the same code reaches /make
// previews and /s/<shareId> share viewers.

export function injectSparkDb(html: string, projectId: string | null | undefined): string {
  if (!html) return html;
  const convexSite = process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? '';
  if (!convexSite) return html;
  const pidLiteral = projectId ? JSON.stringify(projectId) : 'null';
  const inject = `
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
