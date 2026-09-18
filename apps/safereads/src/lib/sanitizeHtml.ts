/**
 * Sanitize the HTML of a public-domain book before it is rendered in the kid
 * reader.
 *
 * The reader fetches whole Project Gutenberg files live from gutenberg.org and
 * used to inject them with `dangerouslySetInnerHTML` untouched. Gutenberg is
 * trustworthy, but "trust a third-party host to never serve a script to a
 * child's browser" is not a control. This keeps the book — headings,
 * paragraphs, emphasis, lists, tables, images, in-page anchors — and drops
 * everything that can run code, load a frame, submit a form, or point at a
 * javascript: URL.
 *
 * Small on purpose: an allow-list of tags and attributes rather than a
 * dependency. Runs in the browser with DOMParser (which never executes
 * scripts while parsing); the regex fallback only exists for non-DOM contexts.
 */

// Removed with their contents.
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "applet",
  "link", "meta", "base", "head", "title", "noscript", "template",
  "form", "input", "textarea", "select", "option", "button",
  "svg", "math", "canvas", "audio", "video", "source", "track",
]);

// Kept as-is (children still walked).
const ALLOWED = new Set([
  "p", "div", "span", "br", "hr", "wbr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "em", "strong", "i", "b", "u", "s", "small", "big", "sub", "sup", "tt",
  "cite", "q", "abbr", "mark", "ins", "del", "kbd", "var", "samp", "dfn",
  "blockquote", "pre", "code", "address", "center", "font",
  "ul", "ol", "li", "dl", "dt", "dd",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
  "img", "a", "figure", "figcaption",
  "section", "article", "header", "footer", "aside", "main",
]);

// Everything else (unknown or unusual tags) is unwrapped: the tag goes, its
// children stay, so no text is lost.

const GLOBAL_ATTRS = new Set(["id", "class", "title", "lang", "dir", "align", "valign", "width", "height", "style"]);
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "name"]),
  img: new Set(["src", "alt"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  ol: new Set(["start", "type"]),
  li: new Set(["value"]),
  col: new Set(["span"]),
  colgroup: new Set(["span"]),
  font: new Set(["color", "size", "face"]),
};

function safeUrl(value: string, allowFragment: boolean): string | null {
  const v = value.trim();
  if (!v) return null;
  if (allowFragment && v.startsWith("#")) return v;
  // Block javascript:, data:, vbscript:, and anything else that isn't plain web.
  if (/^https?:\/\//i.test(v)) return v;
  return null;
}

function safeStyle(value: string): string | null {
  // Inline styles can't run script, but url() and expression() have been
  // abuse vectors; strip a style that contains either rather than parsing CSS.
  if (/url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:/i.test(value)) return null;
  return value;
}

function cleanElement(el: Element) {
  const tag = el.tagName.toLowerCase();
  const allowedForTag = TAG_ATTRS[tag];
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    const value = attr.value;

    // Event handlers and anything namespaced/odd.
    if (name.startsWith("on") || name.includes(":")) {
      el.removeAttribute(attr.name);
      continue;
    }
    const permitted = GLOBAL_ATTRS.has(name) || (allowedForTag?.has(name) ?? false);
    if (!permitted) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === "href") {
      const safe = safeUrl(value, true);
      if (safe === null) el.removeAttribute(attr.name);
      else {
        el.setAttribute("href", safe);
        if (!safe.startsWith("#")) {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
      }
    } else if (name === "src") {
      const safe = safeUrl(value, false);
      if (safe === null) el.removeAttribute(attr.name);
      else el.setAttribute("src", safe);
    } else if (name === "style") {
      const safe = safeStyle(value);
      if (safe === null) el.removeAttribute(attr.name);
    }
  }
}

function walk(node: Node) {
  let child = node.firstChild;
  while (child) {
    const next = child.nextSibling;

    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      child = next;
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child = next;
      continue;
    }

    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (DROP_WITH_CONTENT.has(tag)) {
      el.remove();
      child = next;
      continue;
    }
    if (!ALLOWED.has(tag)) {
      // Unwrap: keep the children, lose the tag. The children land where the
      // tag was, so keep walking from the first of them.
      const first = el.firstChild;
      while (el.firstChild) node.insertBefore(el.firstChild, el);
      el.remove();
      child = first ?? next;
      continue;
    }

    cleanElement(el);
    walk(el);
    child = next;
  }
}

/** Last-resort fallback when there is no DOM (never expected in the reader). */
function regexFallback(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|link|meta|base|form|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|link|meta|base|input|form)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "");
}

export function sanitizeBookHtml(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return regexFallback(html);
  }
  const doc = new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, "text/html");
  walk(doc.body);
  return doc.body.innerHTML;
}
