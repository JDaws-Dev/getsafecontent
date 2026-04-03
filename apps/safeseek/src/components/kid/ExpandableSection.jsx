import { useState } from 'react';
import { stripMarkdown } from './utils';

export default function ExpandableSection({ content, heading, rootQuery, borderColor, onDeepDive, expandAction, kidProfileId }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedContent, setExpandedContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReadMore = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (expandedContent) {
      setExpanded(true);
      return;
    }
    setLoading(true);
    try {
      const result = await expandAction({
        kidProfileId,
        topic: rootQuery,
        subtopic: heading,
        currentContent: content,
      });
      if (result?.content) {
        setExpandedContent(stripMarkdown(result.content));
      }
      setExpanded(true);
    } catch {
      // Fallback — just navigate to new search
      onDeepDive(rootQuery + ' ' + heading);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-5 py-4">
      <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{stripMarkdown(content)}</p>
      {expanded && expandedContent && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {expandedContent.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
              {paragraph}
            </p>
          ))}
        </div>
      )}
      <button
        onClick={handleReadMore}
        disabled={loading}
        className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium disabled:opacity-50"
      >
        {loading ? 'Loading...' : expanded ? 'Show less ↑' : 'Read more ↓'}
      </button>
    </div>
  );
}
