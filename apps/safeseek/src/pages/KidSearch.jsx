import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTheme } from '../contexts/ThemeContext';

// Extracted components
import FamilyCodeEntry from '../components/kid/FamilyCodeEntry';
import ProfileSelection from '../components/kid/ProfileSelection';
import TimeLimitModal from '../components/kid/TimeLimitModal';
import SearchHeader from '../components/kid/SearchHeader';
import SafeFamilySwitcher from '../components/SafeFamilySwitcher';
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

// Utilities
import {
  SUGGESTIONS,
  SEARCH_COOLDOWN_MS,
  SpeechRecognition,
  pickCuriosityPrompts,
} from '../components/kid/utils';

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

  // ========== Tutor Handlers ==========

  // Initialize tutor greeting when profile is selected
  useEffect(() => {
    if (selectedProfile && tutorMessages.length === 0) {
      setTutorMessages([{
        role: 'tutor',
        content: `Hi ${selectedProfile.name}! I'm your tutor. What are you working on today?`,
        timestamp: Date.now(),
      }]);
    }
  }, [selectedProfile?._id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        searchStack={searchStack}
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
        onSwitchProfile={() => setSelectedProfile(null)}
        onOpenApps={() => setAppsOpen(true)}
        onToggleDarkMode={toggleDarkMode}
        onToggleRequestsInbox={() => setShowRequestsInbox(!showRequestsInbox)}
      />

      {/* Sticky Search Bar */}
      <SearchBar
        query={query}
        setQuery={setQuery}
        searching={searching}
        cooldown={cooldown}
        isListening={isListening}
        searchMode={searchMode}
        selectedProfile={selectedProfile}
        showSuggestions={showSuggestions}
        filteredSuggestions={filteredSuggestions}
        selectedSuggestionIndex={selectedSuggestionIndex}
        searchInputRef={searchInputRef}
        suggestionsRef={suggestionsRef}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        onToggleListening={toggleListening}
        onModeToggle={handleModeToggle}
        onSuggestionClick={handleSuggestionClick}
        onInputKeyDown={handleInputKeyDown}
        onInputFocus={() => {
          if (query.trim().length >= 2 && filteredSuggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
      />

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Requests Inbox */}
        {showRequestsInbox && (
          <RequestsInbox
            kidRequests={kidRequests}
            onClose={() => setShowRequestsInbox(false)}
            onSearchRequest={(q) => { handleSuggestionClick(q); setShowRequestsInbox(false); }}
          />
        )}

        {/*
          Apr 2026: SearchHistoryPanel is no longer rendered on the kid side.
          Showing kids their prior searches reinforces the synonym-shuffling
          loop. Parent dashboard (AdminDashboard) still has full history.
        */}

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
      </div>

      {/* Other Safe Family apps — modal sheet */}
      {appsOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setAppsOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAppsOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p className="mb-1 text-center text-lg font-bold text-gray-900 dark:text-white">Jump to another app</p>
            <p className="mb-5 text-center text-sm text-gray-500 dark:text-gray-400">
              Same family code — no need to type it again.
            </p>
            <SafeFamilySwitcher current="safestudy" familyCode={familyCode} />
          </div>
        </div>
      )}
    </div>
  );
}
