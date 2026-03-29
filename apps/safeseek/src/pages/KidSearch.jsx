import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Search, Sparkles, ArrowLeft, Clock, History, ChevronRight,
  Shield, AlertCircle, Loader2, X, ChevronLeft, ChevronRight as ChevronRightIcon,
  Image as ImageIcon
} from 'lucide-react';

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

// Age range label helper
function getAgeRangeLabel(profile) {
  if (profile.ageRange) return `Ages ${profile.ageRange.min}-${profile.ageRange.max}`;
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
                {image.source === 'wikipedia' ? 'Wikipedia' : 'Google'}
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
              className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:scale-[0.98]"
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
                    ? 'bg-white/90 text-blue-700'
                    : 'bg-white/90 text-cyan-700'
                }`}>
                  {image.source === 'wikipedia' ? 'Wiki' : 'Google'}
                </span>
              )}
              {/* Title caption */}
              {image.title && (
                <div className="px-2 py-1.5 bg-white">
                  <p className="text-xs text-gray-600 truncate leading-tight">{image.title}</p>
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

// ========== Animated Loading Dots ==========
function LoadingDots() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-6 animate-pulse">
        <Search className="w-8 h-8 text-blue-500" />
      </div>
      <p className="text-gray-600 text-lg font-medium">{LOADING_MESSAGES[msgIndex]}</p>
      <div className="flex items-center gap-1.5 mt-3">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// ========== Main Component ==========
export default function KidSearch() {
  const { familyCode: urlFamilyCode } = useParams();
  const navigate = useNavigate();

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
  const [showHistory, setShowHistory] = useState(false);
  const [timesUp, setTimesUp] = useState(false);
  const [error, setError] = useState('');
  const [codeShake, setCodeShake] = useState(false);

  // Search mode: 'learn' (text answers) or 'images' (image grid)
  const [searchMode, setSearchMode] = useState('learn');

  // Image state
  const [images, setImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Debounce state
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimerRef = useRef(null);

  const searchInputRef = useRef(null);
  const performSearch = useAction(api.search.searchFromKid);

  // Additional state for new response format
  const [sections, setSections] = useState([]);
  const [funFacts, setFunFacts] = useState([]);
  const [relatedQuestions, setRelatedQuestions] = useState([]);

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
    };
  }, []);

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

    // Check time limits before each search
    if (canSearchStatus && !canSearchStatus.canSearch) {
      setTimesUp(true);
      return;
    }

    setSearching(true);
    setBlocked(false);
    setBlockedMessage('');
    setResults(null);
    setAiSummary('');
    setSections([]);
    setFunFacts([]);
    setRelatedQuestions([]);
    setImages([]);

    try {
      const data = await performSearch({
        kidProfileId: selectedProfile._id,
        query: query.trim(),
      });

      if (!data.safe || data.blocked) {
        setBlocked(true);
        setBlockedMessage(data.answer || "That's not something I can help with right now. Try asking about something else!");
        setRelatedQuestions(data.relatedQuestions || []);
      } else {
        setAiSummary(data.answer || '');
        setSections(data.sections || []);
        setFunFacts(data.funFacts || []);
        setRelatedQuestions(data.relatedQuestions || []);
        setImages(data.images || []);
        setResults(data.sections || []);
      }
    } catch (err) {
      console.error('[KidSearch] Search error:', err);
      setBlockedMessage('Oops! Something went wrong. Try again in a moment.');
      setBlocked(true);
    } finally {
      setSearching(false);
      startCooldown();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    // Auto-submit
    searchInputRef.current?.focus();
  };

  const handleImageClick = (index) => {
    setLightboxIndex(index);
  };

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  // Compute remaining searches status
  const searchesRemaining = canSearchStatus?.remainingSearches;
  const hasSearchLimit = searchesRemaining !== undefined && searchesRemaining !== null;
  const isSearchLimitLow = hasSearchLimit && searchesRemaining <= 5;

  // ========== FAMILY CODE ENTRY ==========
  if (!familyCode || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          {/* Logo */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Search className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">SafeSeek</h1>
          <p className="text-gray-500 mb-8 text-sm">Enter your family code to start searching</p>

          {error && (
            <p className={`text-red-500 text-sm mb-4 ${codeShake ? 'animate-shake' : ''}`}>
              {error}
            </p>
          )}

          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full text-center text-2xl font-mono font-bold tracking-widest bg-white border-2 border-gray-200 rounded-xl px-4 py-4 text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 uppercase transition-all duration-200"
              placeholder="------"
              autoFocus
            />
            <button
              type="submit"
              disabled={codeInput.length < 4}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 rounded-xl font-semibold text-lg shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
            >
              Start Searching
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-6">
            Ask your parent for the family code
          </p>
        </div>

        {/* Shake animation */}
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
          .animate-shake { animation: shake 0.5s ease-in-out; }
        `}</style>
      </div>
    );
  }

  // ========== PROFILE SELECTION ==========
  if (!selectedProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
              <Search className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">SafeSeek</span>
          </div>
          <button
            onClick={() => {
              setFamilyCode('');
              setCodeInput('');
              navigate('/search');
            }}
            className="text-gray-500 hover:text-gray-700 text-sm transition flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Change Code
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Who's Searching?</h1>
          <p className="text-gray-600 mb-8">Select your profile</p>

          {kidProfiles && kidProfiles.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-6 max-w-2xl">
              {kidProfiles.map((profile) => (
                <button
                  key={profile._id}
                  onClick={() => setSelectedProfile(profile)}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition transform hover:scale-105 active:scale-[0.98]"
                >
                  <div
                    className={`w-20 h-20 rounded-full shadow-md flex items-center justify-center text-white text-2xl font-bold ${getColorClass(profile.color)}`}
                  >
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-gray-900 font-semibold text-lg">{profile.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100 max-w-sm">
              <div className="w-20 h-20 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <Search className="w-10 h-10 text-blue-600" />
              </div>
              <p className="text-gray-700 font-medium mb-2">No profiles found for this family code.</p>
              <p className="text-gray-500 text-sm">Ask your parent to create a profile for you.</p>
            </div>
          )}

          {/* Family Code Display */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">Family Code</p>
            <p className="text-gray-400 font-mono text-lg tracking-widest">{familyCode}</p>
          </div>

          {/* Parent Login Link */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-500 text-sm">
              Are you a parent?{' '}
              <a href="/login" className="text-blue-500 hover:text-blue-600 font-medium">
                Log in here →
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
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          {/* Icon */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
            isOutsideHours ? 'bg-blue-100' : 'bg-orange-100'
          }`}>
            <Clock className={`w-8 h-8 ${isOutsideHours ? 'text-blue-500' : 'text-orange-500'}`} />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isOutsideHours ? 'Not Search Time Yet' : "Time's Up!"}
          </h2>

          <p className="text-gray-600 mb-2">
            {isOutsideHours
              ? "It's outside your allowed search hours right now."
              : "You've used all your searches for today."}
          </p>

          {isOutsideHours && canSearchStatus?.allowedHoursStart !== undefined && canSearchStatus?.allowedHoursEnd !== undefined && (
            <p className="text-sm text-blue-600 font-medium mb-6">
              Come back between {formatHour(canSearchStatus.allowedHoursStart)} and {formatHour(canSearchStatus.allowedHoursEnd)}!
            </p>
          )}

          {!isOutsideHours && canSearchStatus?.dailyLimit !== undefined && (
            <p className="text-sm text-orange-600 font-medium mb-6">
              You've done {canSearchStatus.dailyLimit} searches today. Come back tomorrow!
            </p>
          )}

          {!isOutsideHours && canSearchStatus?.dailyLimit === undefined && (
            <p className="text-sm text-gray-500 mb-6">Come back tomorrow for more exploring!</p>
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white">
      {/* Lightbox */}
      {lightboxIndex !== null && images.length > 0 && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}

      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          {/* Left: logo + brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg hidden sm:inline">SafeSeek</span>
          </div>

          {/* Right: search count + profile + history */}
          <div className="flex items-center gap-3">
            {hasSearchLimit && (
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                isSearchLimitLow
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                <Clock className="w-3 h-3" />
                {searchesRemaining} left
              </span>
            )}
            <button
              onClick={() => setSelectedProfile(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200 active:scale-[0.98]"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${getColorClass(selectedProfile.color)}`}
              >
                {selectedProfile.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{selectedProfile.name}</span>
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2 rounded-xl transition-all duration-200 active:scale-[0.98] ${
                showHistory ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Search history"
            >
              <History className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sticky Search Bar */}
      <div className="sticky top-[52px] z-10 bg-white/95 backdrop-blur-md py-3 px-4 border-b border-gray-100/50">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you want to learn about?"
                className="w-full text-[16px] bg-gray-50 border-2 border-gray-200 rounded-2xl pl-12 pr-32 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200"
                autoFocus
              />
              {/* Mode toggle pills inside search bar */}
              <div className="absolute right-2 flex items-center gap-1">
                {query && (
                  <button
                    type="submit"
                    disabled={searching || cooldown}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-xl font-medium text-sm hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
                  >
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : cooldown ? 'Wait...' : 'Search'}
                  </button>
                )}
              </div>
            </div>

            {/* Mode toggle below input */}
            <div className="flex items-center gap-1 mt-2.5">
              <button
                type="button"
                onClick={() => setSearchMode('learn')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                  searchMode === 'learn'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Learn
              </button>
              <button
                type="button"
                onClick={() => setSearchMode('images')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                  searchMode === 'images'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Images
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Search History Panel */}
        {showHistory && kidSearchHistory && kidSearchHistory.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Searches
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
            <div className="space-y-1">
              {kidSearchHistory.map((entry) => (
                <button
                  key={entry._id}
                  onClick={() => {
                    handleSuggestionClick(entry.query);
                    setShowHistory(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all duration-200 flex items-center gap-2 active:scale-[0.98]"
                >
                  <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="truncate flex-1">{entry.query}</span>
                  {entry._creationTime && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatRelativeTime(entry._creationTime)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {searching && <LoadingDots />}

        {/* Blocked Message */}
        {blocked && !searching && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Oops!</h2>
            <p className="text-gray-600 text-lg max-w-md mx-auto">
              {blockedMessage}
            </p>

            {/* Related questions as suggestion buttons when blocked */}
            {relatedQuestions.length > 0 && (
              <div className="mt-6 max-w-md mx-auto">
                <p className="text-sm font-medium text-gray-500 mb-3">Try one of these instead:</p>
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
                      className="text-sm bg-white border border-blue-200 rounded-full px-5 py-2.5 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm active:scale-[0.98]"
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
                className="mt-6 text-blue-600 hover:text-blue-700 font-medium py-3 transition-colors"
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
                      className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 aspect-[4/3] active:scale-[0.98]"
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
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <p className="text-sm text-blue-800 leading-relaxed line-clamp-3">{stripMarkdown(aiSummary)}</p>
                    <button
                      onClick={() => setSearchMode('learn')}
                      className="text-xs text-blue-600 font-medium mt-2 hover:underline py-1"
                    >
                      Read full answer &rarr;
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500">No images found for this search.</p>
                <button
                  onClick={() => setSearchMode('learn')}
                  className="text-sm text-blue-600 font-medium mt-3 hover:underline py-1"
                >
                  Switch to Learn mode &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* Results: Learn Mode */}
        {results && !searching && !blocked && searchMode === 'learn' && (
          <div className="space-y-5">
            {/* AI Answer — hero card */}
            {aiSummary && (
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 shadow-lg text-white">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="font-bold text-lg">Here's what I found!</h2>
                </div>
                <p className="text-white/95 leading-relaxed text-[15px]">{stripMarkdown(aiSummary)}</p>
              </div>
            )}

            {/* Image Gallery */}
            {images.length > 0 && (
              <ImageGallery images={images} onImageClick={handleImageClick} />
            )}

            {/* Sections — individual cards */}
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
                  return (
                    <div key={index} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className={`bg-gradient-to-r ${gradient} px-5 py-3`}>
                        <h3 className="font-bold text-white flex items-center gap-2">
                          <span className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </span>
                          {section.heading}
                        </h3>
                      </div>
                      <div className="px-5 py-4">
                        <p className="text-gray-700 leading-relaxed">{stripMarkdown(section.content)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Fun Facts — standout card */}
            {funFacts.length > 0 && (
              <div className="bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl p-5 shadow-md text-white">
                <p className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span className="text-2xl">💡</span> Did you know?
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
                <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-500" />
                  Keep exploring
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {relatedQuestions.map((q, index) => (
                    <button
                      key={index}
                      onClick={() => { setQuery(q); }}
                      className="text-left bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 active:scale-[0.98] flex items-center gap-3 group"
                    >
                      <div className="w-8 h-8 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                        <Search className="w-4 h-4 text-blue-500" />
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
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  No results found. Try searching for something different!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state - suggestions */}
        {!results && !searching && !blocked && (
          <div className="text-center pt-12">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What are you curious about?</h2>
            <p className="text-gray-500 mb-8 text-sm">Type a question or try one of these:</p>
            <div className="flex flex-wrap justify-center gap-2.5 max-w-lg mx-auto">
              {randomSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 active:scale-[0.98]"
                >
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
