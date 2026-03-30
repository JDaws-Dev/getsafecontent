import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Search, Sparkles, Clock, History, ChevronRight, Check,
  Shield, AlertCircle, Loader2, X, ChevronLeft, ChevronRight as ChevronRightIcon,
  Image as ImageIcon, Camera, Mic, Sun, Moon, Volume2, VolumeX, GitBranch, Users, ArrowLeft,
  BookOpen
} from 'lucide-react';
import mermaid from 'mermaid';
import { useTheme } from '../contexts/ThemeContext';

// Initialize mermaid once
mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });

// Fun placeholder suggestions for kids
const SUGGESTIONS = [
  'How do volcanoes erupt?',
  'What is the biggest animal?',
  'How do airplanes fly?',
  'Why is the sky blue?',
  'How do plants grow?',
  'What are black holes?',
  'How do computers work?',
  'Why do we have seasons?',
  'What is the solar system?',
  'How do fish breathe underwater?',
  'What makes rainbows appear?',
  'How do magnets work?',
  'What are dinosaurs?',
  'How does the moon glow?',
  'Why do cats purr?',
  'What is electricity?',
  'How do birds fly?',
  'What causes earthquakes?',
];

const FUN_FACT_EMOJIS = ['🌟', '🔬', '🌍', '🚀', '🧠', '⚡', '🦕', '🌊', '🎯', '💫'];

const LOADING_MESSAGES = [
  'Looking that up...',
  'Finding answers...',
  'Almost there...',
  'Exploring the topic...',
  'Gathering info...',
];

const SEARCH_COOLDOWN_MS = 2000;

// Check if browser supports speech recognition
const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

// Get Tailwind color class
function getColorClass(color) {
  const colors = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    gray: 'bg-gray-500',
    cyan: 'bg-cyan-500',
    teal: 'bg-teal-500',
  };
  return colors[color] || 'bg-blue-500';
}

// Left-border color mapping for section cards
function getBorderColorClass(index) {
  const borders = [
    'border-l-violet-500',
    'border-l-blue-500',
    'border-l-teal-500',
    'border-l-orange-500',
    'border-l-pink-500',
  ];
  return borders[index % borders.length];
}

// Age range label helper
function getAgeLabel(profile) {
  if (profile.ageRange) {
    return profile.ageRange.min === profile.ageRange.max
      ? `Age ${profile.ageRange.min}`
      : `Ages ${profile.ageRange.min}-${profile.ageRange.max}`;
  }
  if (profile.age) return `Age ${profile.age}`;
  return null;
}

// Strip markdown from AI responses
function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s/g, '')        // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')     // italic
    .replace(/__([^_]+)__/g, '$1')     // bold alt
    .replace(/_([^_]+)_/g, '$1')       // italic alt
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^[-*]\s/gm, '')          // list items
    .trim();
}

// ========== Expandable Summary Component ==========
function ExpandableSummary({ text, className = '' }) {
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
        className={`text-white/95 leading-relaxed text-[15px] ${!expanded && needsTruncation ? 'line-clamp-3' : ''}`}
      >
        {strippedText}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-white/70 hover:text-white text-sm font-medium transition-colors flex items-center gap-1"
        >
          {expanded ? 'Show less' : 'Show more'}
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        </button>
      )}
    </div>
  );
}

// ========== Image Lightbox Component ==========
function ImageLightbox({ images, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const image = images[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [currentIndex, images.length, onClose]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full mx-4 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Navigation - left */}
        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-14 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Navigation - right */}
        {currentIndex < images.length - 1 && (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-14 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition z-10"
            aria-label="Next image"
          >
            <ChevronRightIcon className="w-6 h-6" />
          </button>
        )}

        {/* Image */}
        <img
          src={image.url}
          alt={image.title || ''}
          className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
          referrerPolicy="no-referrer"
        />

        {/* Caption area */}
        <div className="mt-4 text-center px-4">
          {image.title && (
            <p className="text-white text-base font-medium">{image.title}</p>
          )}
          <div className="flex items-center justify-center gap-3 mt-2">
            {image.source && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                image.source === 'wikipedia'
                  ? 'bg-white/15 text-blue-200'
                  : 'bg-white/15 text-cyan-200'
              }`}>
                {image.source === 'wikipedia' ? 'Wikipedia' : 'SafeNet'}
              </span>
            )}
            <span className="text-white/50 text-xs">
              {currentIndex + 1} of {images.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== Image Gallery Component ==========
function ImageGallery({ images, onImageClick }) {
  const [failedImages, setFailedImages] = useState(new Set());
  const scrollRef = useRef(null);

  const visibleImages = images.filter((_, i) => !failedImages.has(i));
  const hasWikipediaImages = visibleImages.some((img) => img.source === 'wikipedia');

  const handleError = (index) => {
    setFailedImages((prev) => new Set(prev).add(index));
  };

  if (visibleImages.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Responsive: 1 col if 1 image, 2 cols if 2-4, 3 cols if 5+ */}
      <div
        ref={scrollRef}
        className={`grid gap-3 ${
          visibleImages.length === 1 ? 'grid-cols-1 max-w-md' :
          visibleImages.length <= 4 ? 'grid-cols-2' :
          'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        {images.map((image, index) => {
          if (failedImages.has(index)) return null;
          return (
            <button
              key={index}
              onClick={() => onImageClick(index)}
              className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:scale-[0.98]"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={image.thumbnail || image.url}
                  alt={image.title || ''}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => handleError(index)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              {/* Source badge */}
              {image.source && (
                <span className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-semibold shadow-sm ${
                  image.source === 'wikipedia'
                    ? 'bg-white/90 text-blue-700 dark:bg-gray-800/90 dark:text-blue-300'
                    : 'bg-white/90 text-cyan-700 dark:bg-gray-800/90 dark:text-cyan-300'
                }`}>
                  {image.source === 'wikipedia' ? 'Wiki' : 'SafeNet'}
                </span>
              )}
              {/* Title caption */}
              {image.title && (
                <div className="px-2 py-1.5 bg-white dark:bg-gray-800">
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate leading-tight">{image.title}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Wikipedia attribution */}
      {hasWikipediaImages && (
        <p className="text-[11px] text-gray-400 pl-1">
          Images from Wikipedia under Creative Commons license
        </p>
      )}
    </div>
  );
}

// ========== Diagram Card Component ==========
let diagramCounter = 0;
function DiagramCard({ code }) {
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
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700">
        <GitBranch className="w-5 h-5 text-blue-500" />
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Visual Diagram</h3>
      </div>
      <div
        ref={containerRef}
        className="p-4 flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgHtml }}
      />
    </div>
  );
}

// ========== Read Aloud Button Component ==========
function ReadAloudButton({ text, className = '', iconSize = 'w-4 h-4' }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const handleToggle = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const stripped = stripMarkdown(text);
    if (!stripped) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(stripped);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`transition-colors ${className}`}
      aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
      title={isSpeaking ? 'Stop reading' : 'Read aloud'}
    >
      {isSpeaking ? (
        <VolumeX className={iconSize} />
      ) : (
        <Volume2 className={iconSize} />
      )}
    </button>
  );
}

// ========== Expandable Section — "Read more" expands inline ==========
function ExpandableSection({ content, heading, rootQuery, borderColor, onDeepDive, expandAction, kidProfileId }) {
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
    <div className={`px-5 py-4 border-l-4 ${borderColor}`}>
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

// ========== Skeleton Loading State ==========
function SearchSkeleton() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-5 py-4">
      {/* Quick Answer skeleton */}
      <div className="relative rounded-2xl h-32 bg-gradient-to-br from-blue-400/60 to-cyan-400/60 animate-pulse overflow-hidden">
        <div className="absolute inset-0 animate-shimmer" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded bg-white/30" />
            <div className="h-4 w-28 rounded bg-white/30" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-white/20" />
            <div className="h-3 w-5/6 rounded bg-white/20" />
            <div className="h-3 w-3/4 rounded bg-white/20" />
          </div>
        </div>
      </div>

      {/* Image thumbnails skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="relative rounded-xl aspect-[4/3] bg-gray-200 dark:bg-gray-700 animate-pulse overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        ))}
      </div>

      {/* Section card skeletons */}
      {[0, 1].map((i) => {
        const gradients = [
          'from-violet-400/60 to-purple-400/60',
          'from-blue-400/60 to-indigo-400/60',
        ];
        return (
          <div key={i} className="relative rounded-2xl h-24 bg-gray-100 dark:bg-gray-800 animate-pulse overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
            <div className={`h-10 rounded-t-2xl bg-gradient-to-r ${gradients[i]}`}>
              <div className="flex items-center gap-2 px-5 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/20" />
                <div className="h-4 w-32 rounded bg-white/30" />
              </div>
            </div>
            <div className="px-5 py-3">
              <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        );
      })}

      {/* Did you know skeleton */}
      <div className="relative rounded-2xl h-20 bg-amber-50 dark:bg-amber-900/30 animate-pulse overflow-hidden">
        <div className="absolute inset-0 animate-shimmer" />
        <div className="p-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-200/60 dark:bg-amber-700/60" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-28 rounded bg-amber-200/60 dark:bg-amber-700/60" />
            <div className="h-3 w-3/4 rounded bg-amber-200/40 dark:bg-amber-700/40" />
          </div>
        </div>
      </div>

      {/* Rotating text messages */}
      <div className="text-center pt-2">
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium transition-opacity duration-300">
          {LOADING_MESSAGES[msgIndex]}
        </p>
      </div>
    </div>
  );
}

// ========== Site Color Mapping for Research Cards ==========
const SITE_COLORS = {
  'nasa.gov': { bg: '#1B3A7A', text: 'white', accent: '#3B6FD4' },
  'nationalgeographic.com': { bg: '#FFCC00', text: '#1a1a1a', accent: '#E6B800' },
  'britannica.com': { bg: '#0A2240', text: 'white', accent: '#1A4270' },
  'smithsonianmag.com': { bg: '#B91C1C', text: 'white', accent: '#DC2626' },
  'sciencekids.co.nz': { bg: '#059669', text: 'white', accent: '#10B981' },
  'natgeokids.com': { bg: '#F59E0B', text: '#1a1a1a', accent: '#D97706' },
  'dkfindout.com': { bg: '#7C3AED', text: 'white', accent: '#8B5CF6' },
  'khanacademy.org': { bg: '#14BF96', text: 'white', accent: '#10D4A6' },
  'pbs.org': { bg: '#1B5299', text: 'white', accent: '#2563EB' },
};

function getResearchSiteColors(domain) {
  return SITE_COLORS[domain] || { bg: '#4B5563', text: 'white', accent: '#6B7280' };
}

// ========== Research Source Card Component ==========
function ResearchCard({ source }) {
  const colors = getResearchSiteColors(source.siteDomain);
  const initial = source.siteName.charAt(0).toUpperCase();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
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
          Summarized by SafeNet
        </span>
      </div>
    </div>
  );
}

// ========== Research Skeleton Loading ==========
function ResearchSkeleton() {
  const [msgIndex, setMsgIndex] = useState(0);
  const messages = ['Finding trusted sources...', 'Reading articles...', 'Rewriting for your level...'];

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 py-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
          {/* Header skeleton */}
          <div className="px-5 py-3 bg-gray-200 dark:bg-gray-700 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-300 dark:bg-gray-600" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-gray-300 dark:bg-gray-600" />
              <div className="h-2.5 w-1/3 rounded bg-gray-300 dark:bg-gray-600" />
            </div>
          </div>
          {/* Content skeleton */}
          <div className="px-5 py-4 space-y-2.5">
            <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-3 w-4/5 rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
          {/* Footer skeleton */}
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-between">
            <div className="h-5 w-32 rounded-full bg-gray-100 dark:bg-gray-700" />
            <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      ))}
      <div className="text-center pt-2">
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium transition-opacity duration-300">
          {messages[msgIndex]}
        </p>
      </div>
    </div>
  );
}

// ========== Main Component ==========
export default function KidSearch() {
  const { familyCode: urlFamilyCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();

  // State
  const [familyCode, setFamilyCode] = useState(urlFamilyCode || '');
  const [codeInput, setCodeInput] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');
  const [canRequest, setCanRequest] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [timesUp, setTimesUp] = useState(false);
  const [error, setError] = useState('');
  const [codeShake, setCodeShake] = useState(false);

  // Search mode: 'learn' (text answers) or 'images' (image grid)
  const [searchMode, setSearchMode] = useState(searchParams.get('mode') || 'learn');

  // Image state
  const [images, setImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Research state
  const [researchResults, setResearchResults] = useState([]);
  const [researchLoading, setResearchLoading] = useState(false);

  // Navigation history for back button
  const [searchStack, setSearchStack] = useState([]);
  // Root query — the original topic (prevents "walt disney early life family background family background")
  const [rootQuery, setRootQuery] = useState('');

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef(null);

  // Debounce state
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimerRef = useRef(null);

  // Voice search state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const searchInputRef = useRef(null);
  const performSearch = useAction(api.search.searchFromKid);
  const performResearch = useAction(api.research.researchFromKid);
  const expandSection = useAction(api.search.expandSection);
  const createTopicRequest = useMutation(api.topicRequests.createRequest);

  // Track whether we already auto-searched from URL params
  const autoSearchedRef = useRef(false);

  // Additional state for new response format
  const [sections, setSections] = useState([]);
  const [funFacts, setFunFacts] = useState([]);
  const [relatedQuestions, setRelatedQuestions] = useState([]);
  const [searchTime, setSearchTime] = useState(null);
  const [diagram, setDiagram] = useState(null);
  const searchStartRef = useRef(null);

  // Random suggestions (pick 6 from the pool)
  const randomSuggestions = useMemo(() => {
    const shuffled = [...SUGGESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }, []);

  // Get user by family code
  const user = useQuery(
    api.users.getUserByFamilyCode,
    familyCode ? { familyCode } : 'skip'
  );

  // Get kid profiles for this user
  const kidProfiles = useQuery(
    api.kidProfiles.getProfiles,
    user?._id ? { userId: user._id } : 'skip'
  );

  // Check if kid can search (time limits)
  const canSearchStatus = useQuery(
    api.timeLimits.canSearch,
    selectedProfile?._id ? { kidProfileId: selectedProfile._id } : 'skip'
  );

  // Get search history for this kid
  const kidSearchHistory = useQuery(
    api.searchQueries.getSearchHistory,
    selectedProfile?._id ? { kidProfileId: selectedProfile._id, limit: 20 } : 'skip'
  );

  // Recently approved topic requests
  const approvedRequests = useQuery(
    api.topicRequests.getRecentlyApproved,
    selectedProfile?._id ? { kidProfileId: selectedProfile._id } : 'skip'
  );

  // Validate family code
  useEffect(() => {
    if (familyCode && user === null) {
      setError('Invalid family code');
      setCodeShake(true);
      setTimeout(() => setCodeShake(false), 600);
    } else {
      setError('');
    }
  }, [familyCode, user]);

  // Update URL when code changes
  useEffect(() => {
    if (familyCode && user) {
      navigate(`/search/${familyCode}`, { replace: true });
    }
  }, [familyCode, user, navigate]);

  // Check time limits
  useEffect(() => {
    if (canSearchStatus && !canSearchStatus.canSearch) {
      setTimesUp(true);
    } else {
      setTimesUp(false);
    }
  }, [canSearchStatus]);

  // Focus search input when profile is selected
  useEffect(() => {
    if (selectedProfile && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [selectedProfile]);

  // Clean up cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Auto-search from URL query params on mount
  useEffect(() => {
    if (selectedProfile && !autoSearchedRef.current) {
      const qParam = searchParams.get('q');
      if (qParam) {
        autoSearchedRef.current = true;
        setQuery(qParam);
        // Trigger search after state settles
        setTimeout(() => {
          const form = searchInputRef.current?.closest('form');
          if (form) form.requestSubmit();
        }, 100);
      }
    }
  }, [selectedProfile, searchParams]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter suggestions when query changes
  useEffect(() => {
    if (query.trim().length < 2) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const matched = [];

    // Recent searches first (with type marker), deduplicated by query text
    if (kidSearchHistory) {
      const seen = new Set();
      const recentMatches = kidSearchHistory
        .filter((entry) => {
          const lower = entry.query.toLowerCase();
          if (seen.has(lower) || !lower.includes(lowerQuery)) return false;
          seen.add(lower);
          return true;
        })
        .slice(0, 3)
        .map((entry) => ({ text: entry.query, type: 'recent' }));
      matched.push(...recentMatches);
    }

    // Then SUGGESTIONS
    const suggestionMatches = SUGGESTIONS
      .filter((s) => {
        const lower = s.toLowerCase();
        // Avoid duplicates with recent searches
        return lower.includes(lowerQuery) && !matched.some((m) => m.text.toLowerCase() === lower);
      })
      .slice(0, 6 - matched.length)
      .map((s) => ({ text: s, type: 'suggestion' }));
    matched.push(...suggestionMatches);

    const capped = matched.slice(0, 6);
    setFilteredSuggestions(capped);
    setShowSuggestions(capped.length > 0);
    setSelectedSuggestionIndex(-1);
  }, [query, kidSearchHistory]);

  const startCooldown = useCallback(() => {
    setCooldown(true);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setCooldown(false);
    }, SEARCH_COOLDOWN_MS);
  }, []);

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    if (codeInput.trim()) {
      setFamilyCode(codeInput.trim().toUpperCase());
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || !selectedProfile || cooldown) return;

    // Close suggestions
    setShowSuggestions(false);

    // Check time limits before each search
    if (canSearchStatus && !canSearchStatus.canSearch) {
      setTimesUp(true);
      return;
    }

    // Update URL with query params
    const params = new URLSearchParams();
    params.set('q', query.trim());
    if (searchMode !== 'learn') params.set('mode', searchMode);
    navigate(`/search/${familyCode}?${params.toString()}`, { replace: true });

    // Push current query to back stack (if we had a previous search)
    if (query.trim() && results) {
      setSearchStack((prev) => [...prev.slice(-10), query.trim()]);
    }
    // Set root query if this is a fresh search (not from a section "learn more" click)
    if (!rootQuery || !query.trim().includes(rootQuery)) {
      setRootQuery(query.trim());
    }

    searchStartRef.current = Date.now();
    setSearchTime(null);
    setSearching(true);
    setBlocked(false);
    setBlockedMessage('');
    setCanRequest(false);
    setAlreadyRequested(false);
    setRequestSent(false);
    setResults(null);
    setAiSummary('');
    setSections([]);
    setFunFacts([]);
    setRelatedQuestions([]);
    setImages([]);
    setDiagram(null);
    setResearchResults([]);
    setResearchLoading(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    // If in research mode, also trigger research search in parallel
    if (searchMode === 'research') {
      handleResearchSearch(query.trim());
    }

    try {
      const data = await performSearch({
        kidProfileId: selectedProfile._id,
        query: query.trim(),
      });

      if (!data.safe || data.blocked) {
        setBlocked(true);
        setBlockedMessage(data.answer || "That's not something I can help with right now. Try asking about something else!");
        setRelatedQuestions(data.relatedQuestions || []);
        setCanRequest(data.canRequest || false);
        setAlreadyRequested(data.alreadyRequested || false);
      } else {
        setAiSummary(data.answer || '');
        setSections(data.sections || []);
        setFunFacts(data.funFacts || []);
        setRelatedQuestions(data.relatedQuestions || []);
        setImages(data.images || []);
        setDiagram(data.diagram || null);
        setResults(data.sections || []);
      }
    } catch (err) {
      console.error('[KidSearch] Search error:', err);
      setBlockedMessage('Oops! Something went wrong. Try again in a moment.');
      setBlocked(true);
    } finally {
      setSearching(false);
      if (searchStartRef.current) {
        setSearchTime(((Date.now() - searchStartRef.current) / 1000).toFixed(1));
      }
      startCooldown();
    }
  };

  const handleSuggestionClick = useCallback((suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    // Auto-submit the search
    setTimeout(() => {
      const form = searchInputRef.current?.closest('form');
      if (form) form.requestSubmit();
    }, 50);
  }, []);

  const handleInputKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(filteredSuggestions[selectedSuggestionIndex].text);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleImageClick = (index) => {
    setLightboxIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const handleResearchSearch = async (searchQuery) => {
    if (!searchQuery?.trim() || !selectedProfile) return;
    setResearchLoading(true);
    setResearchResults([]);
    try {
      const data = await performResearch({
        kidProfileId: selectedProfile._id,
        query: searchQuery.trim(),
      });
      setResearchResults(data.sources || []);
    } catch (err) {
      console.error('[KidSearch] Research error:', err);
    } finally {
      setResearchLoading(false);
    }
  };

  const handleModeToggle = (mode) => {
    setSearchMode(mode);
    // Update URL mode param if there is a current query
    if (query.trim()) {
      const params = new URLSearchParams();
      params.set('q', query.trim());
      if (mode !== 'learn') params.set('mode', mode);
      navigate(`/search/${familyCode}?${params.toString()}`, { replace: true });
    }
    // If switching to research and we have a query but no research results yet, trigger research
    if (mode === 'research' && query.trim() && researchResults.length === 0 && !researchLoading && results) {
      handleResearchSearch(query);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setResults(null);
    setAiSummary('');
    setSections([]);
    setFunFacts([]);
    setRelatedQuestions([]);
    setImages([]);
    setDiagram(null);
    setBlocked(false);
    setBlockedMessage('');
    setResearchResults([]);
    setResearchLoading(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    // Clear URL params
    navigate(`/search/${familyCode}`, { replace: true });
    searchInputRef.current?.focus();
  };

  // ========== Voice Search Handlers ==========
  const stopListening = useCallback(() => {
    setIsListening(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;

    // Stop any existing session
    stopListening();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      // Reset silence timer on each result
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setQuery(transcript);

      // Start 5-second silence timer
      silenceTimerRef.current = setTimeout(() => {
        recognition.stop();
      }, 5000);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      // Auto-submit if there is text
      setTimeout(() => {
        const form = searchInputRef.current?.closest('form');
        if (form && searchInputRef.current?.value?.trim()) {
          form.requestSubmit();
        }
      }, 100);
    };

    recognition.onerror = (event) => {
      console.error('[VoiceSearch] Error:', event.error);
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    recognition.start();
  }, [stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // ========== Dark Mode Toggle ==========
  const toggleDarkMode = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  // Compute remaining searches status
  const searchesRemaining = canSearchStatus?.remainingSearches;
  const hasSearchLimit = searchesRemaining !== undefined && searchesRemaining !== null;
  const isSearchLimitLow = hasSearchLimit && searchesRemaining <= 5;

  const isDark = resolvedTheme === 'dark';

  // ========== FAMILY CODE ENTRY ==========
  if (!familyCode || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-slate-900 flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          {/* Logo */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Search className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">SafeNet</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Enter your family code to start searching</p>

          {error && (
            <div className={`bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4 ${codeShake ? 'animate-shake' : ''}`}>
              {error}
            </div>
          )}

          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full text-center text-2xl font-mono font-bold tracking-widest bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-4 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 uppercase transition-all duration-200"
              placeholder="------"
              autoFocus
            />
            <button
              type="submit"
              disabled={codeInput.length < 4}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white py-3 rounded-xl font-semibold text-lg shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
            >
              Start Searching
            </button>
          </form>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
            Ask your parent for the family code
          </p>
        </div>
      </div>
    );
  }

  // ========== PROFILE SELECTION ==========
  if (!selectedProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-cyan-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-900 animate-gradient-shift flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
              <Search className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg">SafeNet</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => {
                setFamilyCode('');
                setCodeInput('');
                navigate('/search');
              }}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Change Code
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Who's Searching?</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">AI-powered search, built for kids</p>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Select your profile</p>

          {kidProfiles && kidProfiles.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-6 max-w-2xl">
              {kidProfiles.map((profile) => (
                <button
                  key={profile._id}
                  onClick={() => setSelectedProfile(profile)}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-500 transition transform hover:scale-105 active:scale-[0.98]"
                >
                  <div
                    className={`w-20 h-20 rounded-full shadow-md flex items-center justify-center text-white text-2xl font-bold ${getColorClass(profile.color)}`}
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-900 dark:text-white font-semibold text-lg">{profile.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 max-w-sm">
              <div className="w-20 h-20 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                <Search className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-gray-700 dark:text-gray-200 font-medium mb-2">No profiles found for this family code.</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Ask your parent to create a profile for you.</p>
            </div>
          )}

          {/* Family Code Display */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">Your family's secret code</p>
            <span className="inline-block mt-1 px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-lg tracking-widest rounded-full border border-gray-200 dark:border-gray-700">{familyCode}</span>
          </div>

          {/* Parent Login Link */}
          <div className="mt-8 pt-8 border-t border-gray-200/60 dark:border-gray-700/60">
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
              Are you a parent?{' '}
              <a href="/login" className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                Log in here &rarr;
              </a>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ========== TIME'S UP MODAL ==========
  if (timesUp) {
    const isOutsideHours = canSearchStatus?.reason === 'outside_allowed_hours';
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
            isOutsideHours ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-orange-100 dark:bg-orange-900/40'
          }`}>
            <Clock className={`w-8 h-8 ${isOutsideHours ? 'text-blue-500' : 'text-orange-500'}`} />
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {isOutsideHours ? 'Not Search Time Yet' : "Time's Up!"}
          </h2>

          <p className="text-gray-600 dark:text-gray-300 mb-2">
            {isOutsideHours
              ? "It's outside your allowed search hours right now."
              : "You've used all your searches for today."}
          </p>

          {isOutsideHours && canSearchStatus?.allowedHoursStart !== undefined && canSearchStatus?.allowedHoursEnd !== undefined && (
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-6">
              Come back between {formatHour(canSearchStatus.allowedHoursStart)} and {formatHour(canSearchStatus.allowedHoursEnd)}!
            </p>
          )}

          {!isOutsideHours && canSearchStatus?.dailyLimit !== undefined && (
            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-6">
              You've done {canSearchStatus.dailyLimit} searches today. Come back tomorrow!
            </p>
          )}

          {!isOutsideHours && canSearchStatus?.dailyLimit === undefined && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Come back tomorrow for more exploring!</p>
          )}

          <button
            onClick={() => {
              setTimesUp(false);
              setSelectedProfile(null);
            }}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-3 rounded-xl font-semibold text-lg shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            Got it!
          </button>
        </div>
      </div>
    );
  }

  // ========== MAIN SEARCH INTERFACE ==========
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white dark:from-gray-900 dark:to-slate-900">
      {/* Lightbox */}
      {lightboxIndex !== null && images.length > 0 && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm dark:shadow-gray-950/30">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          {/* Left: back button + logo + brand */}
          <div className="flex items-center gap-2">
            {searchStack.length > 0 && (
              <button
                onClick={() => {
                  const prev = searchStack[searchStack.length - 1];
                  setSearchStack((s) => s.slice(0, -1));
                  setQuery(prev);
                  setTimeout(() => {
                    const form = searchInputRef.current?.closest('form');
                    if (form) form.requestSubmit();
                  }, 50);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition active:scale-95"
                title="Go back to previous search"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg hidden sm:inline">SafeNet</span>
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
              <Shield className="w-3 h-3" />
              <span className="hidden sm:inline">SafeSearch On</span>
            </div>
          </div>

          {/* Right: search count + profile + dark mode + history */}
          <div className="flex items-center gap-3">
            {hasSearchLimit && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                isSearchLimitLow
                  ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
                  : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
              }`}>
                <Clock className="w-3 h-3" />
                {searchesRemaining} left
              </span>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${getColorClass(selectedProfile.color)}`}
              >
                {selectedProfile.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{selectedProfile.name}</span>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-xs text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 ml-1 transition-colors"
                aria-label="Switch profile"
                title="Switch profile"
              >
                <Users className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.98] ${
                showHistory
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sticky Search Bar */}
      <div className="sticky top-[52px] z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md py-3 px-4 border-b border-gray-100/50 dark:border-gray-800/50">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onFocus={() => {
                  if (query.trim().length >= 2 && filteredSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder={isListening ? 'Listening...' : 'What do you want to learn about?'}
                className="w-full text-[16px] bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-2xl pl-12 pr-36 py-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-200"
                autoFocus
                autoComplete="off"
              />
              {/* Clear button + mic + submit inside search bar */}
              <div className="absolute right-2 flex items-center gap-1">
                {query && !searching && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {SpeechRecognition && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-2 rounded-xl transition-all duration-200 ${
                      isListening
                        ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/40 animate-pulse'
                        : 'text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    aria-label={isListening ? 'Stop listening' : 'Voice search'}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
                {query && (
                  <button
                    type="submit"
                    disabled={searching || cooldown}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl font-medium text-sm hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
                  >
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : cooldown ? (
                      <Loader2 className="w-4 h-4 animate-spin opacity-50" />
                    ) : 'Search'}
                  </button>
                )}
              </div>
            </div>

            {/* Autocomplete Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden"
              >
                {filteredSuggestions.map((item, index) => (
                  <button
                    key={`${item.type}-${item.text}`}
                    type="button"
                    onClick={() => handleSuggestionClick(item.text)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors text-sm ${
                      index === selectedSuggestionIndex
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    {item.type === 'recent' ? (
                      <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    ) : (
                      <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    )}
                    <span className="truncate">{item.text}</span>
                    {item.type === 'recent' && (
                      <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">Recent</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Mode toggle */}
            <div className="flex items-center gap-1 mt-2.5">
              <button
                type="button"
                onClick={() => handleModeToggle('learn')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                  searchMode === 'learn'
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Learn
              </button>
              {selectedProfile?.allowImageSearch !== false && (
                <button
                  type="button"
                  onClick={() => handleModeToggle('images')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                    searchMode === 'images'
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <ImageIcon className="w-4 h-4" />
                  Images
                </button>
              )}
              <button
                type="button"
                onClick={() => handleModeToggle('research')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                  searchMode === 'research'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Research
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Search History Panel */}
        {showHistory && kidSearchHistory && kidSearchHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Searches
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="space-y-1">
              {kidSearchHistory.filter((entry, index, arr) => {
                // Deduplicate by query text, keeping only the most recent (first) occurrence
                return arr.findIndex((e) => e.query.toLowerCase() === entry.query.toLowerCase()) === index;
              }).map((entry) => (
                <button
                  key={entry._id}
                  onClick={() => {
                    handleSuggestionClick(entry.query);
                    setShowHistory(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 rounded-xl transition-all duration-200 flex items-center gap-2 active:scale-[0.98]"
                >
                  <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="truncate flex-1">{entry.query}</span>
                  {entry._creationTime && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {formatRelativeTime(entry._creationTime)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State - Skeleton */}
        {searching && <SearchSkeleton />}

        {/* Blocked Message */}
        {blocked && !searching && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Oops!</h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg max-w-md mx-auto">
              {blockedMessage}
            </p>

            {/* Ask My Parent button */}
            {canRequest && (
              <div className="mt-4">
                {requestSent || alreadyRequested ? (
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {alreadyRequested && !requestSent ? 'Already requested — waiting for your parent' : 'Request sent!'}
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        await createTopicRequest({
                          kidProfileId: selectedProfile._id,
                          query: query.trim(),
                          reason: blockedMessage,
                        });
                        setRequestSent(true);
                      } catch (err) {
                        console.error('[KidSearch] Topic request error:', err);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors shadow-sm active:scale-[0.98]"
                  >
                    <Users className="w-4 h-4" />
                    Ask My Parent
                  </button>
                )}
              </div>
            )}

            {/* Related questions as suggestion buttons when blocked */}
            {relatedQuestions.length > 0 && (
              <div className="mt-6 max-w-md mx-auto">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Try one of these instead:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {relatedQuestions.map((q, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(q);
                        setBlocked(false);
                        setBlockedMessage('');
                        setRelatedQuestions([]);
                        searchInputRef.current?.focus();
                      }}
                      className="text-sm bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-full px-5 py-2.5 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 shadow-sm active:scale-[0.98]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {relatedQuestions.length === 0 && (
              <button
                onClick={() => {
                  setQuery('');
                  setBlocked(false);
                  searchInputRef.current?.focus();
                }}
                className="mt-6 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-3 transition-colors"
              >
                Try a different search
              </button>
            )}
          </div>
        )}

        {/* Results: Images Mode */}
        {results && !searching && !blocked && searchMode === 'images' && (
          <div className="space-y-4">
            {images.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setLightboxIndex(index)}
                      className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 aspect-[4/3] active:scale-[0.98]"
                    >
                      <img
                        src={image.thumbnail || image.url}
                        alt={image.title || ''}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {image.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-white text-xs truncate">{image.title}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {/* Brief AI summary below images */}
                {aiSummary && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed line-clamp-3">{stripMarkdown(aiSummary)}</p>
                    <button
                      onClick={() => handleModeToggle('learn')}
                      className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-2 hover:underline py-1"
                    >
                      Read full answer &rarr;
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Empty state for Images mode — friendly, not dead-end */
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <Camera className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Images will appear here when you search!</h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto mb-5">
                  Try searching for animals, planets, volcanoes, or anything you're curious about.
                </p>
                <button
                  onClick={() => handleModeToggle('learn')}
                  className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline py-1 inline-flex items-center gap-1"
                >
                  Switch to Learn mode <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results: Research Mode */}
        {searchMode === 'research' && !searching && !blocked && (
          <div className="space-y-4">
            {researchLoading && <ResearchSkeleton />}
            {!researchLoading && researchResults.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  {researchResults.length} verified source{researchResults.length !== 1 ? 's' : ''} found
                </p>
                {researchResults.map((source, index) => (
                  <ResearchCard key={index} source={source} />
                ))}
              </div>
            )}
            {!researchLoading && researchResults.length === 0 && results && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <BookOpen className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">No articles found for this topic</h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto mb-5">
                  Try searching for a different topic like animals, space, history, or science.
                </p>
                <button
                  onClick={() => handleModeToggle('learn')}
                  className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline py-1 inline-flex items-center gap-1"
                >
                  Switch to Learn mode <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {!researchLoading && !results && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                  <BookOpen className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Read real articles about any topic</h3>
                <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">
                  Search for a topic, then tap Research to read real articles about it.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Results: Learn Mode */}
        {results && !searching && !blocked && searchMode === 'learn' && (
          <div className="space-y-5">
            {/* Search timing */}
            {searchTime && (
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Found answer in {searchTime}s{images.length > 0 ? ` · ${images.length} images` : ''}
              </p>
            )}

            {/* AI Answer — hero card with expandable summary */}
            {aiSummary && (
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 shadow-lg text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-white/80" />
                  <h2 className="font-bold text-base">Quick Answer</h2>
                  <ReadAloudButton
                    text={aiSummary}
                    className="ml-auto p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15"
                    iconSize="w-4 h-4"
                  />
                </div>
                <ExpandableSummary text={aiSummary} />
              </div>
            )}

            {/* Inline images — just 2 in Learn mode (full gallery in Images tab) */}
            {images.length > 0 && selectedProfile?.allowImageSearch !== false && (
              <div className="flex gap-3">
                {images.slice(0, 2).map((image, index) => (
                  <button
                    key={index}
                    onClick={() => handleImageClick(index)}
                    className="flex-1 max-w-[200px] group relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition bg-gray-100 aspect-[4/3]"
                  >
                    <img
                      src={image.thumbnail || image.url}
                      alt={image.title || ''}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </button>
                ))}
                {images.length > 2 && (
                  <button
                    onClick={() => setSearchMode('images')}
                    className="flex items-center justify-center px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition"
                  >
                    +{images.length - 2} more →
                  </button>
                )}
              </div>
            )}

            {/* Visual Diagram */}
            {diagram && diagram !== 'null' && (
              <DiagramCard code={diagram} />
            )}

            {/* Sections — individual cards with rounded-t-xl headers and left border */}
            {sections.length > 0 && (
              <div className="space-y-3">
                {sections.map((section, index) => {
                  const sectionColors = [
                    'from-violet-500 to-purple-500',
                    'from-blue-500 to-indigo-500',
                    'from-teal-500 to-emerald-500',
                    'from-orange-500 to-amber-500',
                    'from-pink-500 to-rose-500',
                  ];
                  const gradient = sectionColors[index % sectionColors.length];
                  const borderColor = getBorderColorClass(index);
                  return (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                      <div className={`bg-gradient-to-r ${gradient} px-5 py-3 rounded-t-xl`}>
                        <h3 className="font-bold text-white flex items-center gap-2">
                          <span className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </span>
                          <button
                            onClick={() => handleSuggestionClick(rootQuery + ' ' + section.heading)}
                            className="hover:underline text-left flex-1"
                            title={`Search "${section.heading}"`}
                          >
                            {section.heading}
                          </button>
                          <ReadAloudButton
                            text={section.content}
                            className="ml-auto p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/15"
                            iconSize="w-3.5 h-3.5"
                          />
                        </h3>
                      </div>
                      <ExpandableSection
                        content={section.content}
                        heading={section.heading}
                        rootQuery={rootQuery}
                        borderColor={borderColor}
                        onDeepDive={(q) => handleSuggestionClick(q)}
                        expandAction={expandSection}
                        kidProfileId={selectedProfile?._id}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Fun Facts — standout card with pulsing lightbulb */}
            {funFacts.length > 0 && (
              <div className="bg-gradient-to-br from-amber-400 to-orange-400 dark:from-amber-500 dark:to-orange-500 rounded-2xl p-5 shadow-md text-white">
                <p className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="text-2xl animate-pulse-glow">💡</span> Did you know?
                </p>
                <ul className="space-y-3">
                  {funFacts.map((fact, index) => (
                    <li key={index} className="text-white/95 leading-relaxed flex items-start gap-2.5 text-[15px]">
                      <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-bold">
                        {index + 1}
                      </span>
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related Questions — cards, not pills */}
            {relatedQuestions.length > 0 && (
              <div>
                <p className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-500" />
                  Keep exploring
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {relatedQuestions.map((q, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(q)}
                      className="text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group"
                    >
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/60 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                        <Search className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      </div>
                      <span className="text-sm font-medium">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No content */}
            {!aiSummary && sections.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No results found. Try searching for something different!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state - personalized greeting + suggestions */}
        {!results && !searching && !blocked && (
          <div className="text-center pt-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              <Search className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Hi {selectedProfile.name}! What do you want to learn?
            </h2>
            <p className="text-gray-400 dark:text-gray-500 mb-6 text-sm">Ask me anything or try one of these</p>

            {/* Approved request notifications */}
            {approvedRequests && approvedRequests.length > 0 && (
              <div className="mb-6 max-w-lg mx-auto space-y-2">
                {approvedRequests.map((req) => (
                  <button
                    key={req._id}
                    onClick={() => handleSuggestionClick(req.query)}
                    className="w-full flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-left hover:bg-green-100 dark:hover:bg-green-900/30 transition active:scale-[0.98]"
                  >
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">Approved!</p>
                      <p className="text-xs text-green-600 dark:text-green-400 truncate">You can now search for "{req.query}"</p>
                    </div>
                    <Search className="w-4 h-4 text-green-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto">
              {randomSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-xl text-sm hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 active:scale-[0.98] flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Search className="w-4 h-4 text-blue-400" />
                  </div>
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== Helper Functions ==========

function formatHour(hour) {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return '';
}
