'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders Spark's CHAT-mode assistant replies as markdown.
 *
 * Why this exists: in CHAT mode (vs MAKE mode) Spark answers questions
 * like "explain photosynthesis" — those answers want paragraphs,
 * bullets, bold, code blocks for math, etc. Plain text rendering made
 * everything a wall of text.
 *
 * Style notes:
 * - Component overrides reuse the bubble's slate text styling so the
 *   markdown blends in (no jarring jump in font/size from the
 *   surrounding `text-sm font-semibold text-slate-700` bubble).
 * - Links open in a new tab with noopener/noreferrer. We do NOT
 *   suppress link clicks — Spark's system prompt steers it away from
 *   emitting random URLs, and CHAT-mode replies aren't surfacing them
 *   in practice. If that changes, easiest hardening is to render
 *   <a> as a plain <span>.
 * - The working-placeholder bubble ("Spark is on it…") is rendered
 *   separately in DemoWorkbench and never passes through here.
 */
export function MessageMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-0 text-sm font-semibold leading-relaxed text-slate-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-900">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children, className }) => {
            // react-markdown passes a className like "language-js" for
            // fenced blocks; inline code has no className. Use that to
            // distinguish.
            const isBlock = typeof className === 'string' && className.startsWith('language-');
            if (isBlock) {
              return (
                <code className={className}>{children}</code>
              );
            }
            return (
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px] text-slate-800">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-2 overflow-x-auto rounded-lg bg-slate-100 p-3 font-mono text-[13px] leading-relaxed text-slate-800 last:mb-0">
              {children}
            </pre>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-600 underline hover:text-violet-700"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h1 className="mb-2 mt-1 text-base font-bold text-slate-900 last:mb-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-1 text-[15px] font-bold text-slate-900 last:mb-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-1 text-sm font-bold text-slate-900 last:mb-0">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-4 border-slate-200 pl-3 italic text-slate-600 last:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
