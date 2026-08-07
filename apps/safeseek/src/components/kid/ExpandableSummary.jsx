import { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { stripMarkdown } from './utils';

export default function ExpandableSummary({ text, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      // Check if text exceeds 3 lines (approx 4.5em at current line-height)
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * 3;
      setNeedsTruncation(textRef.current.scrollHeight > maxHeight + 4);
    }
  }, [text]);

  const strippedText = stripMarkdown(text);

  return (
    <div className={className}>
      <p
        ref={textRef}
        className={`text-gray-700 dark:text-gray-200 leading-relaxed text-[15px] ${!expanded && needsTruncation ? 'line-clamp-3' : ''}`}
      >
        {strippedText}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 text-sm font-medium transition-colors flex items-center gap-1"
        >
          {expanded ? 'Show less' : 'Show more'}
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        </button>
      )}
    </div>
  );
}
