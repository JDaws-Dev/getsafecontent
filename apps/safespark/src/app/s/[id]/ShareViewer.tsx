'use client';

import { useEffect, useState } from 'react';
import { Maximize2, X } from 'lucide-react';

type Props = {
  title: string;
  srcDoc: string;
};

/**
 * Client component for the share viewer's iframe + fullscreen toggle.
 * The page itself stays a server component (preserves the metadata SEO)
 * — only the interactive part lives here.
 *
 * Fullscreen behavior: iOS Safari refuses `iframe.requestFullscreen()`,
 * so we use a CSS-based fullscreen overlay (the same pattern the
 * workbench uses for its "Play fullscreen" button). When `fullscreen`
 * is true, a fixed-position black layer covers the entire viewport with
 * the iframe + a Done pill. Esc key + body scroll lock both wired up.
 */
export default function ShareViewer({ title, srcDoc }: Props) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  return (
    <>
      {/* touch-action:none + overscroll-behavior:none stop iOS from
          eating two-finger pinch / swipe-back / pull-to-refresh —
          so the game gets clean touch events. The viewport meta on
          the page (user-scalable=no) handles the actual pinch-zoom
          disable; these CSS props handle the scroll/refresh class. */}
      <div
        className="relative flex-1 bg-brand-cream-2 p-3"
        style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      >
        <iframe
          title={title}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          allow="fullscreen"
          className="h-full w-full rounded-2xl bg-white shadow-inner"
          style={{ touchAction: 'none' }}
        />
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute right-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-brand-navy/85 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur transition hover:bg-brand-navy"
          aria-label="Play fullscreen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Fullscreen
        </button>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black"
          style={{ touchAction: 'none', overscrollBehavior: 'none' }}
        >
          <iframe
            title={`${title} (fullscreen)`}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin allow-pointer-lock"
            allow="fullscreen"
            className="h-full w-full"
            style={{ touchAction: 'none' }}
          />
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-brand-navy shadow-lg hover:bg-white"
            aria-label="Exit fullscreen"
          >
            <X className="h-3.5 w-3.5" />
            Done
          </button>
        </div>
      )}
    </>
  );
}
