import { useState, useEffect, useRef } from 'react';
import { GitBranch } from 'lucide-react';
import mermaid from 'mermaid';
import { useTheme } from '../../contexts/ThemeContext';

// Initialize mermaid once
mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });

let diagramCounter = 0;

export default function DiagramCard({ code }) {
  const containerRef = useRef(null);
  const [svgHtml, setSvgHtml] = useState(null);
  const [error, setError] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!code || !containerRef.current) return;

    // Update mermaid theme based on dark mode
    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
    });

    const id = 'diagram-' + (++diagramCounter);
    let cancelled = false;

    mermaid.render(id, code).then(({ svg }) => {
      if (!cancelled) setSvgHtml(svg);
    }).catch(() => {
      if (!cancelled) setError(true);
    });

    return () => { cancelled = true; };
  }, [code, resolvedTheme]);

  if (error || !code) return null;
  if (!svgHtml) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700">
        <GitBranch className="w-4 h-4 text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Diagram</h3>
      </div>
      <div
        ref={containerRef}
        className="p-4 flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    </div>
  );
}
