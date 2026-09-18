import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '../contexts/ThemeContext';
import { isEmbedded, redirectKidToHubPlay } from '../lib/embed';

// Extracted components
import FamilyCodeEntry from '../components/kid/FamilyCodeEntry';
import ProfileSelection from '../components/kid/ProfileSelection';
import TimeLimitModal from '../components/kid/TimeLimitModal';
import PausedNotice from '../components/kid/PausedNotice';
import SearchHeader from '../components/kid/SearchHeader';
import SearchBar from '../components/kid/SearchBar';
import RequestsInbox from '../components/kid/RequestsInbox';
// SearchHistoryPanel: removed from kid UI Apr 2026 (reinforced loop behavior).
// Component kept in repo for parent dashboard / admin use.
import SearchSkeleton from '../components/kid/SearchSkeleton';
import BlockedMessage from '../components/kid/BlockedMessage';
import ImagesResults from '../components/kid/ImagesResults';
import ResearchResults from '../components/kid/ResearchResults';
import TutorChat from '../components/kid/TutorChat';
import LearnResults from '../components/kid/LearnResults';
import EmptyState from '../components/kid/EmptyState';
import ImageLightbox from '../components/kid/ImageLightbox';
import AppsSheet from '../components/kid/AppsSheet';
// Daily program (Sep 2026): home-first, with lessons, review, quizzes, My Stuff.
import KidHome from '../components/kid/KidHome';
import LessonView from '../components/kid/LessonView';
import ReviewDeck from '../components/kid/ReviewDeck';
import QuizView from '../components/kid/QuizView';
import MyStuff from '../components/kid/MyStuff';

// Utilities
import {
  SUGGESTIONS,
  SEARCH_COOLDOWN_MS,
  SpeechRecognition,
  pickCuriosityPrompts,
  isAccessBlockReason,
  friendlyFailure,
} from '../components/kid/utils';

// ========== Main Component ==========
export default function KidSearch() {
  const { familyCode: urlFamilyCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resolvedTheme, setTheme } = useTheme();

  // One kid front door: opened directly under the hub, hand off to /play/study
  // (the code rides along); inside the hub's kid tabs, hide our own switcher.
  // Declared before the boot effect below so we still see ?fc= before it is
  // stripped from the URL.
  const embedded = isEmbedded();
  useEffect(() => {
    const fc = urlFamilyCode || new URLSearchParams(window.location.search).get('fc');
    redirectKidToHubPlay(fc);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // State
  const [familyCode, setFamilyCode] = useState(urlFamilyCode || '');
  const [codeInput, setCodeInput] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [appsOpen, setAppsOpen] = useState(false);
  const [pinProfile, setPinProfile] = useState(null);
  const [pinInput, setPinInput] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState('');
  const [canRequest, setCanRequest] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [timesUp, setTimesUp] = useState(false);
  const [error, setError] = useState('');
  const [codeShake, setCodeShake] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(false);

  // Search mode: 'learn' (text answers) or 'images' (image grid)
  const [searchMode, setSearchMode] = useState(searchParams.get('mode') || 'learn');

  // Which screen the kid is on. Home-first: the search box is one thing you
  // can do, not the only thing. A deep link with ?q= or ?mode= still lands
  // straight in search, exactly as before.
  //   'home' | 'search' | 'lesson' | 'review' | 'quiz' | 'stuff'
  const [view, setView] = useState(() =>
    searchParams.get('q') || searchParams.get('mode') ? 'search' : 'home'
  );
  const [activeLessonId, setActiveLessonId] = useState(null);
  // { topic, subject, context, questions, loading, error }
  const [quiz, setQuiz] = useState(null);
  const [keepState, setKeepState] = useState('idle'); // 'idle' | 'saving' | 'kept'
  // True until ensureToday has had its say, so the home never flashes
  // "no lesson today" before the day's lessons have been generated.
  const [lessonsLoading, setLessonsLoading] = useState(true);

  // Image state
  const [images, setImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Research state
  const [researchResults, setResearchResults] = useState([]);
  const [researchLoading, setResearchLoading] = useState(false);

  // Tutor state
  const [tutorMessages, setTutorMessages] = useState([]);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorInput, setTutorInput] = useState('');
  const tutorEndRef = useRef(null);
  const tutorInputRef = useRef(null);

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
  const sendTutorMessage = useAction(api.tutor.sendMessage);
  const expandSection = useAction(api.search.expandSection);
  const createTopicRequest = useMutation(api.topicRequests.createRequest);

  // PIN verification (mutation-based for rate limiting)
  const verifyPin = useMutation(api.kidProfiles.verifyKidPin);

  // Cross-app kid pass: mint one for the signed-in kid (source) and redeem an
  // inbound one (destination). See convex/kidPass.ts.
  const [kidToken, setKidToken] = useState(null);
  const mintKidPass = useMutation(api.kidPass.mintKidPass);
  const redeemKidPass = useMutation(api.kidPass.redeemKidPass);

  // Boot: arriving from another Safe Family app's cross-app switcher.
  //   1) ?kt= (kid pass) — verify + land straight on the search dashboard as
  //      this kid, no PIN. Falls back to ?fc= behavior on any failure.
  //   2) ?fc= (bare family code) — pre-fill the code and skip to the profile
  //      picker. Same unified 6-char code works across all 5 apps.
  // Either credential is stripped from the URL immediately so it never lingers
  // in history / referrer; we keep working from the captured values. Skipped
  // for the route param path (/play/:familyCode) unless a ?kt= is present.
  useEffect(() => {
    let cancelled = false;
    const url = new URL(window.location.href);
    const ktParam = url.searchParams.get('kt');
    const fcParam = url.searchParams.get('fc');

    if (ktParam || fcParam) {
      url.searchParams.delete('kt');
      url.searchParams.delete('fc');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }

    const boot = async () => {
      // 1) Kid pass — arrived from a sibling app already signed in as this kid.
      if (ktParam) {
        try {
          const res = await redeemKidPass({ token: ktParam });
          if (cancelled) return;
          if (res?.ok && res.profile) {
            setFamilyCode(res.familyCode);
            setCodeInput(res.familyCode);
            setSelectedProfile(res.profile);
            return;
          }
          // Verified family but no matching profile here — pre-fill the code
          // and let the kid pick a profile.
          if (res?.familyCode) {
            setFamilyCode(res.familyCode);
            setCodeInput(res.familyCode);
            return;
          }
        } catch {
          // fall through to ?fc= handling
        }
      }

      // 2) Bare family code — skip straight to profile selection.
      if (cancelled || familyCode) return;
      if (!fcParam) return;
      const normalized = fcParam.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (normalized.length === 6) {
        setFamilyCode(normalized);
        setCodeInput(normalized);
      } else if (normalized.length > 0) {
        setCodeInput(normalized);
      }
    };

    boot();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mint a short-lived kid pass for the signed-in kid so the header switcher
  // can hand it to a sibling app (one tap, no PIN re-entry). Refreshed well
  // inside its 5-minute TTL so the links never go stale.
  useEffect(() => {
    if (!familyCode || !selectedProfile?.name) return undefined;
    let active = true;
    const refresh = async () => {
      try {
        const res = await mintKidPass({
          familyCode,
          kidName: selectedProfile.name,
          avatar: selectedProfile.icon,
          color: selectedProfile.color,
        });
        if (active && res?.token) setKidToken(res.token);
      } catch {
        // non-fatal — the switcher still works; the destination just asks for the PIN
      }
    };
    refresh();
    const id = setInterval(refresh, 4 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [familyCode, selectedProfile?.name, selectedProfile?.icon, selectedProfile?.color, mintKidPass]);

  useEffect(() => {
    if (!pinProfile || !pinInput.every(d => d !== '')) return;
    const pin = pinInput.join('');
    verifyPin({ profileId: pinProfile._id, pin }).then((result) => {
      if (result.valid) {
        setSelectedProfile(pinProfile);
        setPinProfile(null);
        setPinInput(['', '', '', '']);
        setPinError('');
      } else if (result.locked) {
        const mins = Math.ceil((result.remainingSeconds || 600) / 60);
        setPinError(`Too many attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`);
        setPinInput(['', '', '', '']);
      } else {
        const remaining = result.attemptsRemaining;
        setPinError(remaining != null ? `Wrong PIN (${remaining} attempt${remaining !== 1 ? 's' : ''} left)` : 'Wrong PIN');
        setPinInput(['', '', '', '']);
        pinRefs[0].current?.focus();
      }
    });
  }, [pinInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProfileClick = (profile) => {
    if (profile.hasPin) {
      setPinProfile(profile);
      setPinInput(['', '', '', '']);
      setPinError('');
      setTimeout(() => pinRefs[0].current?.focus(), 100);
    } else {
      setSelectedProfile(profile);
    }
  };

  const handlePinChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    setPinError('');
    const newPin = [...pinInput];
    newPin[index] = value;
    setPinInput(newPin);
    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pinInput[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  // Track whether we already auto-searched from URL params
  const autoSearchedRef = useRef(false);

  // Additional state for new response format
  const [sections, setSections] = useState([]);
  const [funFacts, setFunFacts] = useState([]);
  const [relatedQuestions, setRelatedQuestions] = useState([]);
  const [searchTime, setSearchTime] = useState(null);
  const [diagram, setDiagram] = useState(null);
  const searchStartRef = useRef(null);

  // Age-bucketed curiosity prompts (Apr 2026): pick 8 prompts appropriate
  // to the kid's age range, shuffled. Empty-state surface = "default action"
  // — make curiosity the path of least resistance.
  const randomSuggestions = useMemo(() => {
    return pickCuriosityPrompts(selectedProfile?.ageRange, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfile?._id]);

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

  // Kid-side search history fetch removed (Apr 2026): no longer rendered
  // anywhere on the kid surface. Parent dashboard fetches its own.

  // Kid's requests inbox
  const kidRequests = useQuery(
    api.topicRequests.getRequestsForKid,
    selectedProfile?._id ? { kidProfileId: selectedProfile._id } : 'skip'
  );
  const [showRequestsInbox, setShowRequestsInbox] = useState(false);
  const newApprovedCount = kidRequests?.filter(r => r.status === 'approved').length || 0;

  // ----- Daily program reads -----
  const kidProfileId = selectedProfile?._id;
  const kidToday = useQuery(api.progress.getKidToday, kidProfileId ? { kidProfileId } : 'skip');
  const todayLessons = useQuery(api.lessonQueries.getTodayLessons, kidProfileId ? { kidProfileId } : 'skip');
  const latestSession = useQuery(api.tutorSessions.getLatestSession, kidProfileId ? { kidProfileId } : 'skip');
  const ensureToday = useAction(api.lessons.ensureToday);
  const generateOneOff = useAction(api.lessons.generateOneOff);
  const regenerateLesson = useAction(api.lessons.regenerate);
  const quizMe = useAction(api.quiz.quizMe);
  const saveAnswer = useMutation(api.progress.saveAnswer);

  // Make sure today's lessons exist — once per profile, and only once we know
  // the kid is allowed to study right now. A paused or out-of-hours kid gets
  // nothing generated; the server also refuses on an inactive subscription.
  const ensuredFor = useRef('');
  const canStudyNow = canSearchStatus ? canSearchStatus.canSearch === true : null;
  useEffect(() => {
    if (!kidProfileId || canStudyNow === null) return;
    if (!canStudyNow) {
      // Out of time or paused: nothing to generate, nothing to wait for.
      setLessonsLoading(false);
      return;
    }
    if (ensuredFor.current === kidProfileId) return;
    ensuredFor.current = kidProfileId;
    setLessonsLoading(true);
    // No cancel guard on purpose: the time-limit verdict refreshes every
    // minute, and a cleanup tied to it would leave the loading flag stuck.
    ensureToday({ kidProfileId })
      .catch((err) => {
        console.error('[KidSearch] ensureToday failed:', err);
      })
      .finally(() => setLessonsLoading(false));
  }, [kidProfileId, canStudyNow, ensureToday]);

  // Switching to another kid starts them on their own home, not the previous
  // kid's lesson or quiz. The first pick keeps the view chosen from the URL.
  const viewInitFor = useRef(null);
  useEffect(() => {
    if (!kidProfileId) return;
    if (viewInitFor.current === kidProfileId) return;
    const first = viewInitFor.current === null;
    viewInitFor.current = kidProfileId;
    if (first) return;
    setView('home');
    setActiveLessonId(null);
    setQuiz(null);
    setKeepState('idle');
    setLessonsLoading(true);
    // The new kid's thread is seeded from their own saved session below; the
    // previous kid's messages must not show while that loads.
    setTutorMessages([]);
    setTutorInput('');
  }, [kidProfileId]);

  // Mirror the hub's universal family settings (PINs, ages, pauses, ...) into
  // this app as soon as the family code resolves — before the kid picks a
  // profile, so the picker already reflects what the parent set on the hub.
  // Fire-and-forget: a failed pull leaves the local profiles as they were.
  const pullFamilySync = useAction(api.familySync.pull);
  const familySyncedFor = useRef('');
  useEffect(() => {
    if (!familyCode || !user) return;
    if (familySyncedFor.current === familyCode) return;
    familySyncedFor.current = familyCode;
    pullFamilySync({ familyCode }).catch(() => {
      /* hub down — keep whatever we have */
    });
  }, [familyCode, user, pullFamilySync]);

  // Live copy of the selected profile — `selectedProfile` is a snapshot taken
  // at pick time, and a parent can pause a kid from the hub mid-session.
  const liveProfile = kidProfiles?.find((p) => p._id === selectedProfile?._id);
  const isPaused = (liveProfile ?? selectedProfile)?.accessPaused === true;

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

  // Keep the FAMILY-WIDE daily limit up to date while a kid is using SafeStudy.
  //
  // This reports the engaged minutes SafeStudy has seen to Marketing Central and
  // pulls back the combined total across all five apps. Without it the shared
  // limit sits dormant — a kid could burn their whole allowance in SafeTube and
  // SafeStudy would never find out.
  //
  // The timer only REFRESHES the verdict; it never creates usage. Minutes come
  // from what the kid actually did (searches and tutor messages), so a tab left
  // open on this screen contributes nothing.
  //
  // Deliberately fire-and-forget — a failed sync must never interrupt a kid's
  // search. The server already falls back to SafeStudy's own per-app limit
  // whenever the shared verdict is missing or stale.
  const syncSharedScreenTime = useAction(api.sharedScreenTime.sync);
  useEffect(() => {
    const kidProfileId = selectedProfile?._id;
    if (!kidProfileId) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      syncSharedScreenTime({ kidProfileId }).catch(() => {
        /* offline or central down — per-app limit still applies */
      });
    };
    run();
    const id = setInterval(run, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedProfile?._id, syncSharedScreenTime]);

  // Check time limits ("paused" has its own screen, not the time's-up modal)
  useEffect(() => {
    if (canSearchStatus && !canSearchStatus.canSearch && canSearchStatus.reason !== 'paused') {
      setTimesUp(true);
    } else {
      setTimesUp(false);
    }
  }, [canSearchStatus]);

  // Focus search input when profile is selected (results view only — on the
  // home screen the box sits below the fold and focusing it would scroll past
  // the lesson).
  useEffect(() => {
    if (selectedProfile && view === 'search' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [selectedProfile, view]);

  // Clean up cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* already stopped */ }
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

    // Apr 2026: removed "recent searches" branch from autocomplete. Resurfacing
    // the kid's prior queries reinforces the synonym-shuffle loop. Static
    // SUGGESTIONS list only.
    const matched = SUGGESTIONS
      .filter((s) => s.toLowerCase().includes(lowerQuery))
      .slice(0, 6)
      .map((s) => ({ text: s, type: 'suggestion' }));

    setFilteredSuggestions(matched);
    setShowSuggestions(matched.length > 0);
    setSelectedSuggestionIndex(-1);
  }, [query]);

  const startCooldown = useCallback(() => {
    setCooldown(true);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setCooldown(false);
    }, SEARCH_COOLDOWN_MS);
  }, []);

  const handleCodeSubmit = (code) => {
    if (code) {
      setFamilyCode(code);
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

    // A search always lands on the results screen, wherever it was typed.
    setView('search');
    setQuiz(null);
    setKeepState('idle');

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
      setBlockedMessage("Our search engine is taking a quick nap! Try again in a moment. Tip: write down your question so you don't forget it!");
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
    // The tutor needs no query, so tapping its tab from home opens it right away.
    if (mode === 'tutor') setView('search');
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
    // If switching to tutor with an active search, inject a context-aware greeting
    if (mode === 'tutor' && rootQuery && tutorMessages.length <= 1) {
      const topic = rootQuery;
      setTutorMessages([{
        role: 'tutor',
        content: `Hi ${selectedProfile?.name || 'there'}! I see you were learning about "${topic}" — want me to help you understand it better? Or you can ask me about anything else!`,
        timestamp: Date.now(),
      }]);
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
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
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

  // ========== Tutor Handlers ==========

  // Seed the tutor thread once per profile, from the saved session:
  //   - a session from the last day comes back as-is (no greeting, no restart)
  //   - an older one contributes only its topic ("Last time we worked on...")
  //   - no session at all gets the plain greeting
  // The server saves every exchange (convex/tutor.ts), so this is also what
  // makes a refresh pick up where the kid left off.
  const tutorSeededFor = useRef('');
  useEffect(() => {
    if (!selectedProfile?._id || latestSession === undefined) return;
    if (tutorSeededFor.current === selectedProfile._id) return;
    tutorSeededFor.current = selectedProfile._id;

    if (latestSession && !latestSession.stale && latestSession.messages?.length > 0) {
      setTutorMessages(
        latestSession.messages.map((m) => ({
          role: m.role === 'kid' ? 'kid' : 'tutor',
          content: m.content,
          timestamp: m.timestamp || latestSession.lastMessageAt || Date.now(),
        }))
      );
      return;
    }

    const lastTopic = latestSession?.topic ? String(latestSession.topic).trim().slice(0, 80) : '';
    setTutorMessages([{
      role: 'tutor',
      content: lastTopic
        ? `Hi ${selectedProfile.name}! Last time we worked on "${lastTopic}". Want to keep going with that, or start something new?`
        : `Hi ${selectedProfile.name}! I'm your tutor. What are you working on today?`,
      timestamp: Date.now(),
    }]);
  }, [selectedProfile?._id, selectedProfile?.name, latestSession]);

  // Auto-scroll tutor chat to bottom
  useEffect(() => {
    if (tutorEndRef.current) {
      tutorEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tutorMessages, tutorLoading]);

  const handleTutorSend = async (messageText) => {
    const text = (messageText || tutorInput).trim();
    if (!text || tutorLoading || !selectedProfile?._id) return;

    setTutorInput('');

    // Add kid message immediately
    const kidMessage = { role: 'kid', content: text, timestamp: Date.now() };
    const updatedMessages = [...tutorMessages, kidMessage];
    setTutorMessages(updatedMessages);
    setTutorLoading(true);

    try {
      // Build conversation history (exclude timestamps for the API)
      const history = updatedMessages
        .filter(m => m.role !== 'tutor' || updatedMessages.indexOf(m) > 0) // skip greeting for history
        .map(m => ({ role: m.role, content: m.content }));

      const result = await sendTutorMessage({
        kidProfileId: selectedProfile._id,
        messages: history.slice(0, -1), // all except the new message
        newMessage: text,
      });

      if (result.blocked) {
        setTutorMessages(prev => [...prev, {
          role: 'tutor',
          content: result.response,
          timestamp: Date.now(),
        }]);
      } else {
        setTutorMessages(prev => [...prev, {
          role: 'tutor',
          content: result.response,
          timestamp: Date.now(),
        }]);
      }
    } catch (err) {
      console.error('[Tutor] Error:', err);
      setTutorMessages(prev => [...prev, {
        role: 'tutor',
        content: "Hmm, my brain had a little hiccup! Can you ask me that again?",
        timestamp: Date.now(),
      }]);
    } finally {
      setTutorLoading(false);
    }
  };

  // Voice input handler for tutor
  const handleTutorVoice = useCallback(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setTutorInput(transcript);
    };

    recognition.onend = () => {
      // Auto-submit after voice ends
      setTimeout(() => {
        const input = tutorInputRef.current;
        if (input && input.value.trim()) {
          handleTutorSend(input.value.trim());
        }
      }, 200);
    };

    recognition.onerror = (event) => {
      console.error('[TutorVoice] Error:', event.error);
    };

    recognition.start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ========== Daily program handlers ==========

  const goHome = useCallback(() => {
    setView('home');
    setActiveLessonId(null);
    setQuiz(null);
    if (searchParams.get('q') || searchParams.get('mode')) {
      navigate(`/search/${familyCode}`, { replace: true });
    }
    window.scrollTo({ top: 0 });
  }, [familyCode, navigate, searchParams]);

  // Same gate as a search: no lesson or review for a kid who is out of time.
  const allowedNow = () => {
    if (canSearchStatus && !canSearchStatus.canSearch) {
      setTimesUp(true);
      return false;
    }
    return true;
  };

  const openLesson = (lessonId) => {
    if (!allowedNow()) return;
    setActiveLessonId(lessonId);
    setView('lesson');
    window.scrollTo({ top: 0 });
  };

  const openReview = () => {
    if (!allowedNow()) return;
    setView('review');
    window.scrollTo({ top: 0 });
  };

  const openStuff = () => {
    setView('stuff');
    window.scrollTo({ top: 0 });
  };

  // Open the tutor; from a lesson, start the kid off with the topic typed in.
  const openTutor = (topic) => {
    setSearchMode('tutor');
    setView('search');
    if (topic) {
      setTutorInput(`Can you help me with ${topic}?`);
      setTimeout(() => tutorInputRef.current?.focus(), 100);
    }
    window.scrollTo({ top: 0 });
  };

  // Generate a brand-new lesson for a topic the kid picked. Returns { opened }
  // when the screen already moved on, or { error } with the server's reason
  // code for the caller to word.
  const generateLesson = async (subject, topic) => {
    if (!kidProfileId) return { error: 'no_profile' };
    try {
      const res = await generateOneOff({ kidProfileId, subject, topic });
      if (res?.lessonId && !res.error) {
        setActiveLessonId(res.lessonId);
        setView('lesson');
        window.scrollTo({ top: 0 });
        return { opened: true };
      }
      if (isAccessBlockReason(res?.error)) {
        setTimesUp(true);
        return { opened: true };
      }
      return { error: res?.error || 'generation_failed' };
    } catch (err) {
      console.error('[KidSearch] lesson generation failed:', err);
      return { error: 'generation_failed' };
    }
  };

  // Retry a lesson whose body never arrived. Fills the SAME row (no second
  // lesson for the parent's week view to count); the live getLesson query
  // picks up the body, so the screen stays on this lesson.
  const retryLesson = async (lesson) => {
    try {
      const res = await regenerateLesson({ lessonId: lesson._id });
      if (res?.ok) return { opened: true };
      if (isAccessBlockReason(res?.error)) {
        setTimesUp(true);
        return { opened: true };
      }
      return { error: res?.error || 'generation_failed' };
    } catch (err) {
      console.error('[KidSearch] lesson retry failed:', err);
      return { error: 'generation_failed' };
    }
  };

  const pickTopic = async (topic) => {
    const res = await generateLesson('custom', topic);
    if (res?.error) return { error: friendlyFailure(res.error, 'that lesson') };
    return res;
  };

  // "Quiz me on this" from a finished Learn answer.
  const startQuiz = async () => {
    const topic = (rootQuery || query).trim();
    if (!topic || !kidProfileId) return;
    if (!allowedNow()) return;
    const context = [aiSummary, ...sections.map((sec) => `${sec.heading}: ${sec.content}`)]
      .filter(Boolean)
      .join('\n')
      .slice(0, 4000);
    setQuiz({ topic, subject: undefined, context, questions: [], loading: true, error: '' });
    setView('quiz');
    window.scrollTo({ top: 0 });
    try {
      const res = await quizMe({ kidProfileId, topic, context });
      if (res?.blocked) {
        if (isAccessBlockReason(res.reason)) {
          setTimesUp(true);
          setView('search');
          setQuiz(null);
          return;
        }
        setQuiz((q) => q && { ...q, loading: false, error: friendlyFailure(res.reason, 'a quiz') });
        return;
      }
      setQuiz((q) => q && { ...q, loading: false, questions: res?.questions || [] });
    } catch (err) {
      console.error('[KidSearch] quiz failed:', err);
      setQuiz((q) => q && { ...q, loading: false, error: friendlyFailure('unavailable', 'a quiz') });
    }
  };

  // "Keep this" on a Learn answer -> My Stuff.
  const keepAnswer = async () => {
    const title = (rootQuery || query).trim();
    if (!title || !aiSummary || !kidProfileId || keepState !== 'idle') return;
    setKeepState('saving');
    try {
      await saveAnswer({ kidProfileId, title, summary: aiSummary });
      setKeepState('kept');
    } catch (err) {
      console.error('[KidSearch] keep failed:', err);
      setKeepState('idle');
    }
  };

  // ========== FAMILY CODE ENTRY ==========
  if (!familyCode || !user) {
    return (
      <FamilyCodeEntry
        codeInput={codeInput}
        setCodeInput={setCodeInput}
        error={error}
        codeShake={codeShake}
        onSubmit={handleCodeSubmit}
      />
    );
  }

  // ========== PROFILE SELECTION ==========
  if (!selectedProfile) {
    return (
      <ProfileSelection
        familyCode={familyCode}
        kidProfiles={kidProfiles}
        pinProfile={pinProfile}
        pinInput={pinInput}
        pinError={pinError}
        isDark={isDark}
        onProfileClick={handleProfileClick}
        onPinChange={handlePinChange}
        onPinKeyDown={handlePinKeyDown}
        onPinCancel={() => { setPinProfile(null); setPinInput(['', '', '', '']); setPinError(''); }}
        onToggleDarkMode={toggleDarkMode}
        onChangeCode={() => {
          setFamilyCode('');
          setCodeInput('');
          navigate('/search');
        }}
        pinRefs={pinRefs}
      />
    );
  }

  // ========== PAUSED BY PARENT ==========
  if (isPaused || canSearchStatus?.reason === 'paused') {
    return (
      <PausedNotice
        profileName={selectedProfile.name}
        onSwitchProfile={() => setSelectedProfile(null)}
      />
    );
  }

  // ========== TIME'S UP MODAL ==========
  if (timesUp) {
    return (
      <TimeLimitModal
        canSearchStatus={canSearchStatus}
        onDismiss={() => {
          setTimesUp(false);
          setSelectedProfile(null);
        }}
      />
    );
  }

  // One set of props for the search bar wherever it is rendered (stuck under
  // the header on the results screen, inline below the lesson on home).
  const searchBarProps = {
    query,
    setQuery,
    searching,
    cooldown,
    isListening,
    searchMode,
    selectedProfile,
    showSuggestions,
    filteredSuggestions,
    selectedSuggestionIndex,
    searchInputRef,
    suggestionsRef,
    onSearch: handleSearch,
    onClearSearch: handleClearSearch,
    onToggleListening: toggleListening,
    onModeToggle: handleModeToggle,
    onSuggestionClick: handleSuggestionClick,
    onInputKeyDown: handleInputKeyDown,
    onInputFocus: () => {
      if (query.trim().length >= 2 && filteredSuggestions.length > 0) {
        setShowSuggestions(true);
      }
    },
  };

  // ========== MAIN SEARCH INTERFACE ==========
  return (
    <div className="min-h-screen bg-brand-cream dark:bg-gray-900">
      {/* Lightbox */}
      {lightboxIndex !== null && images.length > 0 && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={closeLightbox}
        />
      )}

      {/* Sticky Header */}
      <SearchHeader
        selectedProfile={selectedProfile}
        familyCode={familyCode}
        kidToken={kidToken}
        searchStack={view === 'search' ? searchStack : []}
        isDark={isDark}
        hasSearchLimit={hasSearchLimit}
        isSearchLimitLow={isSearchLimitLow}
        searchesRemaining={searchesRemaining}
        showRequestsInbox={showRequestsInbox}
        newApprovedCount={newApprovedCount}
        searchInputRef={searchInputRef}
        onBack={() => {
          const prev = searchStack[searchStack.length - 1];
          setSearchStack((s) => s.slice(0, -1));
          setQuery(prev);
          setTimeout(() => {
            const form = searchInputRef.current?.closest('form');
            if (form) form.requestSubmit();
          }, 50);
        }}
        onHome={view !== 'home' ? goHome : undefined}
        onSwitchProfile={() => setSelectedProfile(null)}
        onOpenApps={embedded ? undefined : () => setAppsOpen(true)}
        onToggleDarkMode={toggleDarkMode}
        onToggleRequestsInbox={() => setShowRequestsInbox(!showRequestsInbox)}
      />

      {/* Sticky Search Bar (results view). On home the same bar renders inline below the lesson. */}
      {view === 'search' && (
        <SearchBar {...searchBarProps} />
      )}

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Requests Inbox */}
        {showRequestsInbox && (
          <RequestsInbox
            kidRequests={kidRequests}
            onClose={() => setShowRequestsInbox(false)}
            onSearchRequest={(q) => { handleSuggestionClick(q); setShowRequestsInbox(false); }}
          />
        )}

        {/* ===== Home ===== */}
        {view === 'home' && (
          <KidHome
            profile={liveProfile ?? selectedProfile}
            today={kidToday}
            lessons={todayLessons}
            lessonsLoading={lessonsLoading}
            latestSession={latestSession}
            onOpenLesson={openLesson}
            onOpenReview={openReview}
            onOpenStuff={openStuff}
            onOpenTutor={() => openTutor()}
            onPickTopic={pickTopic}
          >
            <SearchBar {...searchBarProps} sticky={false} autoFocus={false} />
            <EmptyState
              selectedProfile={selectedProfile}
              introDismissed={introDismissed}
              randomSuggestions={randomSuggestions}
              onDismissIntro={() => setIntroDismissed(true)}
              onSuggestionClick={handleSuggestionClick}
              title="Curious about something?"
              subtitle="Ask anything, or try one of these"
              topPadding="pt-6"
            />
          </KidHome>
        )}

        {/* ===== Lesson ===== */}
        {view === 'lesson' && (
          <LessonView
            lessonId={activeLessonId}
            onBack={goHome}
            onRetry={retryLesson}
            onAskTutor={openTutor}
          />
        )}

        {/* ===== Review deck ===== */}
        {view === 'review' && (
          <ReviewDeck
            kidProfileId={kidProfileId}
            profile={liveProfile ?? selectedProfile}
            onBack={goHome}
          />
        )}

        {/* ===== Quiz ===== */}
        {view === 'quiz' && quiz && (
          <QuizView
            kidProfileId={kidProfileId}
            topic={quiz.topic}
            subject={quiz.subject}
            questions={quiz.questions}
            loading={quiz.loading}
            error={quiz.error}
            onBack={() => { setView('search'); setQuiz(null); window.scrollTo({ top: 0 }); }}
            onRetry={startQuiz}
            onReview={openReview}
          />
        )}

        {/* ===== My Stuff ===== */}
        {view === 'stuff' && (
          <MyStuff
            kidProfileId={kidProfileId}
            onBack={goHome}
            onOpenLesson={openLesson}
          />
        )}

        {/* ===== Search (Learn / Images / Research / Tutor) ===== */}
        {view === 'search' && (
          <>
            {/* Loading State - Skeleton */}
            {searching && <SearchSkeleton />}

            {/* Blocked Message */}
            {blocked && !searching && (
              <BlockedMessage
                blockedMessage={blockedMessage}
                canRequest={canRequest}
                alreadyRequested={alreadyRequested}
                requestSent={requestSent}
                relatedQuestions={relatedQuestions}
                query={query}
                selectedProfile={selectedProfile}
                searchInputRef={searchInputRef}
                onCreateRequest={async () => {
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
                onSuggestionClick={(q) => {
                  setQuery(q);
                  setBlocked(false);
                  setBlockedMessage('');
                  setRelatedQuestions([]);
                  searchInputRef.current?.focus();
                }}
                onClearBlocked={() => {
                  setQuery('');
                  setBlocked(false);
                  searchInputRef.current?.focus();
                }}
              />
            )}

            {/* Results: Images Mode */}
            {results && !searching && !blocked && searchMode === 'images' && (
              <ImagesResults
                images={images}
                aiSummary={aiSummary}
                onImageClick={(index) => setLightboxIndex(index)}
                onSwitchToLearn={() => handleModeToggle('learn')}
              />
            )}

            {/* Results: Research Mode */}
            {searchMode === 'research' && !searching && !blocked && (
              <ResearchResults
                researchResults={researchResults}
                researchLoading={researchLoading}
                hasResults={!!results}
                onSwitchToLearn={() => handleModeToggle('learn')}
              />
            )}

            {/* Results: Tutor Mode */}
            {searchMode === 'tutor' && (
              <TutorChat
                tutorMessages={tutorMessages}
                tutorLoading={tutorLoading}
                tutorInput={tutorInput}
                setTutorInput={setTutorInput}
                tutorEndRef={tutorEndRef}
                tutorInputRef={tutorInputRef}
                onSend={() => handleTutorSend()}
                onVoice={handleTutorVoice}
              />
            )}

            {/* Results: Learn Mode */}
            {results && !searching && !blocked && searchMode === 'learn' && (
              <LearnResults
                aiSummary={aiSummary}
                sections={sections}
                funFacts={funFacts}
                relatedQuestions={relatedQuestions}
                images={images}
                diagram={diagram}
                rootQuery={rootQuery}
                selectedProfile={selectedProfile}
                expandAction={expandSection}
                onSuggestionClick={handleSuggestionClick}
                onImageClick={handleImageClick}
                onSwitchToImages={() => setSearchMode('images')}
                onQuizMe={aiSummary ? startQuiz : undefined}
                onKeep={aiSummary ? keepAnswer : undefined}
                keepState={keepState}
              />
            )}

            {/* Empty state - clean, minimal */}
            {!results && !searching && !blocked && searchMode !== 'tutor' && (
              <EmptyState
                selectedProfile={selectedProfile}
                introDismissed={introDismissed}
                randomSuggestions={randomSuggestions}
                onDismissIntro={() => setIntroDismissed(true)}
                onSuggestionClick={handleSuggestionClick}
              />
            )}
          </>
        )}
      </div>

      {/* Other Safe Family apps — modal sheet */}
      {appsOpen && !embedded && (
        <AppsSheet familyCode={familyCode} onClose={() => setAppsOpen(false)} />
      )}
    </div>
  );
}
