import { Shield } from 'lucide-react';
import { getResearchSiteColors } from './utils';

export default function ResearchCard({ source }) {
  const colors = getResearchSiteColors(source.siteDomain);
  const initial = source.siteName.charAt(0).toUpperCase();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header bar with site branding */}
      <div
        className="px-5 py-3 flex items-center gap-3"
        style={{ backgroundColor: colors.bg }}
      >
        {/* Site icon (first letter fallback) */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{
            backgroundColor: colors.accent,
            color: colors.text,
          }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-sm truncate"
            style={{ color: colors.text }}
          >
            {source.title}
          </h3>
          <p
            className="text-xs opacity-80"
            style={{ color: colors.text }}
          >
            {source.siteName}
          </p>
        </div>
        {/* Verified badge */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 flex-shrink-0">
          <Shield className="w-3 h-3" style={{ color: colors.text }} />
          <span className="text-[10px] font-semibold" style={{ color: colors.text }}>
            Verified
          </span>
        </div>
      </div>

      {/* Article content */}
      <div className="px-5 py-4">
        <p className="text-gray-700 dark:text-gray-200 leading-relaxed text-[15px] whitespace-pre-line">
          {source.content}
        </p>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Shield className="w-3 h-3 text-green-500" />
          Verified source · {source.siteDomain}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Summarized by SafeStudy
        </span>
      </div>
    </div>
  );
}
