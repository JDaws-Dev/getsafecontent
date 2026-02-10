import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import musicKitService from '../../config/musickit';
import {
  MiniPlayer,
  FullScreenPlayer,
  RequestRow,
  FilterPills,
  SearchBar,
  EmptyState,
  LibraryTabs,
  AlbumGrid,
  ArtistList,
  SongList,
  GenreList,
  PlaylistList,
  SongActionsModal
} from './KidPlayerComponents';
import {
  HomeTab,
  PlaylistsTab
} from './KidPlayerTabs';
import { validateSearchQuery, filterSearchResults } from '../../utils/contentFilter';
import DiscoveryPage from './DiscoveryPage';
import KidSearchResults from './KidSearchResults';
import { useToast } from '../../contexts/ToastContext';
import { HiddenArtworkPlaceholder, SafeTunesLogo } from '../shared/SafeTunesLogo';
import AppleMusicAuth from '../admin/AppleMusicAuth';
import { useExpoPushToken } from '../../hooks/useExpoPushToken';
import { triggerHaptic } from '../../hooks/useHaptic';

// Bible verses about guarding your eyes and mind (ESV)
const BIBLE_VERSES = [
  {
    verse: "Finally, brothers, whatever is true, whatever is honorable, whatever is just, whatever is pure, whatever is lovely, whatever is commendable, if there is any excellence, if there is anything worthy of praise, think about these things.",
    reference: "Philippians 4:8 (ESV)"
  },
  {
    verse: "I will not set before my eyes anything that is worthless.",
    reference: "Psalm 101:3 (ESV)"
  },
  {
    verse: "Turn my eyes from looking at worthless things; and give me life in your ways.",
    reference: "Psalm 119:37 (ESV)"
  },
  {
    verse: "Keep your heart with all vigilance, for from it flow the springs of life.",
    reference: "Proverbs 4:23 (ESV)"
  },
  {
    verse: "Do not be conformed to this world, but be transformed by the renewal of your mind, that by testing you may discern what is the will of God, what is good and acceptable and perfect.",
    reference: "Romans 12:2 (ESV)"
  }
];

function ChildDashboard({ onLogout }) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [kidProfile, setKidProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Register for push notifications (mobile app)
  useExpoPushToken({ kidProfileId: kidProfile?._id });

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('safetunes_child_tab', activeTab);
  }, [activeTab]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumTracks, setAlbumTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const [isShuffleOn, setIsShuffleOn] = useState(false);

  // Navigation state for drill-down (iTunes-style)
  const [libraryView, setLibraryView] = useState('home'); // 'home' | 'artist' | 'genre'
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // New Library tab state (iOS-style pill tabs)
  const [libraryTab, setLibraryTab] = useState('Albums'); // 'Playlists' | 'Artists' | 'Albums' | 'Songs' | 'Genres'

  // Library section collapse state (legacy - keeping for backwards compat)
  const [libraryCollapsed, setLibraryCollapsed] = useState({
    artists: true,
    genres: true,
    albums: true,
    songs: true,
  });

  // Apple Music search state (for requesting new music)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(null);
  const [expandedAlbums, setExpandedAlbums] = useState({}); // Track which albums are expanded
  const [loadingAlbumTracks, setLoadingAlbumTracks] = useState({}); // Track loading state per album
  const [blockedMessage, setBlockedMessage] = useState(null); // For showing blocked search message with Bible verse

  // Playlist state
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [selectedSongForPlaylist, setSelectedSongForPlaylist] = useState(null);
  const [selectedAlbumForPlaylist, setSelectedAlbumForPlaylist] = useState(null);
  const [selectedPlaylistView, setSelectedPlaylistView] = useState(null);
  const [songToRemoveFromPlaylist, setSongToRemoveFromPlaylist] = useState(null); // { playlistId, song } for confirmation
  const [songContextMenu, setSongContextMenu] = useState(null); // { song, x, y } for context menu

  // Request confirmation modal state (for adding notes)
  const [requestConfirmModal, setRequestConfirmModal] = useState(null); // { type: 'album' | 'song', item: object }
  const [requestNote, setRequestNote] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Requests sub-tab state
  const [requestsSubTab, setRequestsSubTab] = useState('search'); // 'search' or 'status'

  // My Requested Items tab state
  const [myRequestsTab, setMyRequestsTab] = useState('pending'); // 'pending', 'approved', 'denied'

  // Apple Music connection state
  const [isMusicKitAuthorized, setIsMusicKitAuthorized] = useState(false);
  const [isConnectingMusic, setIsConnectingMusic] = useState(false);

  // New Player state for MiniPlayer/FullScreenPlayer
  const [showFullScreenPlayer, setShowFullScreenPlayer] = useState(false);
  const [playerState, setPlayerState] = useState({
    isPlaying: false,
    currentTrack: null,
    progress: 0,
    duration: 0,
    volume: 1,
    isShuffleOn: false,
    isRepeatOn: false,
    source: null, // 'discover' | 'library' | null - tracks where playback originated
  });
  const lastTrackedTrackIdRef = useRef(null);

  // Track the current playback source and related album info for "Add to Library" functionality
  const [playbackContext, setPlaybackContext] = useState({
    source: null, // 'discover' | 'library'
    album: null,  // Album info when playing from Discover
    artist: null, // Artist info when playing from Discover
  });

  // Lyrics state with caching (for inline display in full screen player)
  const [lyricsState, setLyricsState] = useState({
    lyrics: null,
    isLoading: false,
    error: null,
    cachedSongId: null
  });
  const lyricsCache = useRef(new Map()); // Cache lyrics by song ID

  // Queue state (for inline display in full screen player)
  const [queueState, setQueueState] = useState({
    items: [],
    currentIndex: 0
  });
  const queueUpdateTimeoutRef = useRef(null); // Debounce queue updates to prevent rapid re-renders

  // Song actions modal state (context menu from full screen player or library)
  const [showSongActionsModal, setShowSongActionsModal] = useState(false);
  const [selectedSongForActions, setSelectedSongForActions] = useState(null); // Track selected from Library list

  // Request filter state (for new UI)
  const [requestFilter, setRequestFilter] = useState('All');

  // See All views state
  const [showSeeAllRecentlyPlayed, setShowSeeAllRecentlyPlayed] = useState(false);
  const [showSeeAllOnRepeat, setShowSeeAllOnRepeat] = useState(false);

  // Sleep timer state
  const [sleepTimer, setSleepTimer] = useState(null); // { minutes: number, endTime: Date } or null
  const sleepTimerRef = useRef(null);

  // Listen for native volume changes (hardware buttons) and sync slider
  useEffect(() => {
    const isNativeApp = typeof window !== 'undefined' && window.isInSafeTunesApp;
    if (!isNativeApp) return;

    const handleNativeVolumeChange = (event) => {
      const { volume } = event.detail;
      console.log('[Volume] Native volume changed to:', volume);
      setPlayerState(prev => ({ ...prev, volume }));
      // Also sync MusicKit volume to match system
      musicKitService.setVolume(volume);
    };

    window.addEventListener('nativeVolumeChange', handleNativeVolumeChange);
    return () => {
      window.removeEventListener('nativeVolumeChange', handleNativeVolumeChange);
    };
  }, []);

  // Get kid profile from session
  useEffect(() => {
    const profileData = localStorage.getItem('safetunes_kid_profile');
    if (!profileData) {
      navigate('/child-login');
      return;
    }
    const profile = JSON.parse(profileData);

    // If userId is missing (old localStorage data), force re-login
    if (!profile.userId) {
      console.warn('Kid profile missing userId - clearing session');
      localStorage.removeItem('safetunes_kid_profile');
      navigate('/child-login');
      return;
    }

    setKidProfile(profile);
  }, [navigate]);


  // Initialize MusicKit with timeout (prevents iOS blocking)
  useEffect(() => {
    const initMusicKit = async () => {
      try {
        // Use a timeout to prevent blocking on iOS
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MusicKit init timeout')), 8000)
        );

        await Promise.race([
          musicKitService.initialize(),
          timeoutPromise
        ]);
        // Check initial authorization status
        setIsMusicKitAuthorized(musicKitService.checkAuthorization());
      } catch (err) {
        console.warn('MusicKit initialization issue:', err.message);
        // Don't block - MusicKit might still work or will be initialized later
        if (musicKitService.music) {
          setIsMusicKitAuthorized(musicKitService.checkAuthorization());
        }
      }
    };
    initMusicKit();
  }, []);

  // Monitor MusicKit authorization status
  useEffect(() => {
    const checkAuthStatus = () => {
      if (musicKitService.music) {
        setIsMusicKitAuthorized(musicKitService.checkAuthorization());
      }
    };

    // Check immediately
    checkAuthStatus();

    // Listen for authorization changes
    if (musicKitService.music) {
      musicKitService.addEventListener('authorizationStatusDidChange', checkAuthStatus);

      return () => {
        musicKitService.removeEventListener('authorizationStatusDidChange', checkAuthStatus);
      };
    }
  }, [musicKitService.music]);

  // Mutations - declare before effects that use them
  const createAlbumRequest = useMutation(api.albumRequests.createAlbumRequest);
  const createSongRequest = useMutation(api.songRequests.createSongRequest);
  const reviewAlbumOverviewAction = useAction(api.ai.contentReview.reviewAlbumOverview);
  const createPlaylistMutation = useMutation(api.playlists.createPlaylist);
  const addSongToPlaylistMutation = useMutation(api.playlists.addSongToPlaylist);
  const addSongsToPlaylistMutation = useMutation(api.playlists.addSongsToPlaylist);
  const deletePlaylistMutation = useMutation(api.playlists.deletePlaylist);
  const removeSongFromPlaylistMutation = useMutation(api.playlists.removeSongFromPlaylist);
  const addRecentlyPlayedMutation = useMutation(api.recentlyPlayed.addRecentlyPlayed);
  const logBlockedSearch = useMutation(api.blockedSearches.logBlockedSearch);
  const addListeningTimeMutation = useMutation(api.timeControls.addListeningTime);
  const addDiscoverAlbumToLibrary = useMutation(api.albums.addDiscoverAlbumToKidLibrary);
  const storeAlbumTracks = useMutation(api.albums.storeAlbumTracks);

  // Sync MusicKit state with new player state
  useEffect(() => {
    const updatePlayerState = () => {
      const state = musicKitService.getPlaybackState();
      if (state) {
        const track = state.nowPlayingItem;
        setPlayerState(prev => ({
          ...prev,
          isPlaying: state.isPlaying,
          currentTrack: track ? {
            title: track.title || track.attributes?.name,
            artistName: track.artistName || track.attributes?.artistName,
            albumName: track.albumName || track.attributes?.albumName,
            artwork: track.artwork || { url: track.attributes?.artwork?.url },
            id: track.id || track.attributes?.playParams?.id,
          } : null,
          progress: state.currentPlaybackTime || 0,
          duration: state.currentPlaybackDuration || 0,
        }));

        // Sync queue state so skip buttons have accurate info
        // Debounce queue updates to prevent rapid re-renders that cause DOM reconciliation errors
        if (queueUpdateTimeoutRef.current) {
          clearTimeout(queueUpdateTimeoutRef.current);
        }
        queueUpdateTimeoutRef.current = setTimeout(() => {
          const rawQueue = musicKitService.getQueue();
          const position = musicKitService.getQueuePosition();
          if (rawQueue.length > 0) {
            const normalizedQueue = rawQueue.map(item => ({
              ...item,
              title: item.title || item.attributes?.name || item.name || 'Unknown Track',
              name: item.name || item.attributes?.name || item.title || 'Unknown Track',
              songName: item.songName || item.attributes?.name || item.title || item.name || 'Unknown Track',
              artistName: item.artistName || item.attributes?.artistName || 'Unknown Artist',
              artworkUrl: item.artworkUrl || item.artwork?.url || item.attributes?.artwork?.url,
              artwork: item.artwork || (item.attributes?.artwork ? { url: item.attributes.artwork.url } : null),
              id: item.id || item.attributes?.playParams?.id,
            }));
            setQueueState({ items: normalizedQueue, currentIndex: position });
          }
        }, 100); // 100ms debounce to let MusicKit settle after skip

        // Track recently played
        if (track && kidProfile) {
          const trackId = track.id || track.attributes?.playParams?.id;
          if (trackId && trackId !== lastTrackedTrackIdRef.current) {
            lastTrackedTrackIdRef.current = trackId;
            const artworkUrl = track.artwork?.url || track.attributes?.artwork?.url;
            addRecentlyPlayedMutation({
              kidProfileId: kidProfile._id,
              userId: kidProfile.userId,
              itemType: 'song',
              itemId: String(trackId),
              itemName: track.title || track.attributes?.name || 'Unknown Song',
              artistName: track.artistName || track.attributes?.artistName,
              artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
            }).catch(err => console.error('Failed to track song:', err));
          }
        }
      }
    };

    const music = musicKitService.music;
    if (music) {
      music.addEventListener('playbackStateDidChange', updatePlayerState);
      music.addEventListener('nowPlayingItemDidChange', updatePlayerState);
      music.addEventListener('playbackTimeDidChange', updatePlayerState);
      updatePlayerState(); // Initial sync
      return () => {
        music.removeEventListener('playbackStateDidChange', updatePlayerState);
        music.removeEventListener('nowPlayingItemDidChange', updatePlayerState);
        music.removeEventListener('playbackTimeDidChange', updatePlayerState);
        // Clean up queue update debounce timeout
        if (queueUpdateTimeoutRef.current) {
          clearTimeout(queueUpdateTimeoutRef.current);
        }
      };
    }
  }, [musicKitService.music, kidProfile, addRecentlyPlayedMutation]);

  // Player control handlers for new UI
  const handlePlayerPlayPause = () => {
    if (playerState.isPlaying) {
      musicKitService.pause();
    } else {
      musicKitService.play();
    }
  };

  const handlePlayerSkipNext = () => musicKitService.skipToNext();
  const handlePlayerSkipPrevious = () => musicKitService.skipToPrevious();

  const handlePlayerSeek = (time) => {
    if (musicKitService.music) {
      musicKitService.music.seekToTime(time);
    }
  };

  const handlePlayerVolumeChange = (vol) => {
    setPlayerState(prev => ({ ...prev, volume: vol }));
    // In native app, set BOTH system volume AND MusicKit volume
    // System volume controls device speaker, MusicKit volume controls the audio stream
    const isNativeApp = /SafeTunesApp/.test(navigator.userAgent) || window.isInSafeTunesApp;
    console.log('[Volume] Setting volume:', vol, 'isNativeApp:', isNativeApp, 'hasNativeVolume:', !!window.setNativeVolume);

    // Always set MusicKit volume - this controls the actual audio stream
    musicKitService.setVolume(vol);

    // Also set native system volume if in app (for device speaker control)
    if (isNativeApp && window.setNativeVolume) {
      window.setNativeVolume(vol);
    }
  };

  const handlePlayerShuffleToggle = () => {
    const newState = musicKitService.toggleShuffle();
    setPlayerState(prev => ({ ...prev, isShuffleOn: newState }));
  };

  const handlePlayerRepeatToggle = () => {
    const newMode = musicKitService.toggleRepeat();
    // repeatMode: 0=off, 1=one, 2=all - we treat both 1 and 2 as "on"
    setPlayerState(prev => ({ ...prev, isRepeatOn: newMode > 0, repeatMode: newMode }));
  };

  // Check if artwork should be hidden for current track
  const shouldHideCurrentTrackArtwork = () => {
    // Global override from parent settings
    if (globalHideArtwork) return true;
    if (!playerState.currentTrack) return false;
    const trackId = String(playerState.currentTrack.id || '');
    if (!trackId) return false;

    // Check song by ID (normalize to string for comparison)
    const song = approvedSongs?.find(s => String(s.appleSongId) === trackId);
    if (song?.hideArtwork) return true;

    // Check album by name (case-insensitive)
    const albumName = playerState.currentTrack.albumName;
    if (albumName) {
      const albumNameLower = albumName.toLowerCase().trim();
      const album = approvedAlbums?.find(a =>
        a.albumName?.toLowerCase().trim() === albumNameLower
      );
      if (album?.hideArtwork) return true;
    }

    // Also check song's parent album by looking up the song's albumName
    if (song?.albumName) {
      const songAlbumLower = song.albumName.toLowerCase().trim();
      const parentAlbum = approvedAlbums?.find(a =>
        a.albumName?.toLowerCase().trim() === songAlbumLower
      );
      if (parentAlbum?.hideArtwork) return true;
    }

    return false;
  };

  // Open lyrics modal with caching (uses Musixmatch via Convex backend)
  const handleOpenLyrics = async () => {
    const currentTrack = playerState.currentTrack;
    if (!currentTrack) {
      showToast('No song is currently playing', 'info');
      return;
    }

    const trackName = currentTrack.name || currentTrack.title;
    const artistName = currentTrack.artistName || currentTrack.artist;
    const cacheKey = `${trackName}:${artistName}`;

    if (!trackName || !artistName) {
      showToast('Cannot find track information', 'info');
      return;
    }

    // Check local cache first (for this session)
    if (lyricsCache.current.has(cacheKey)) {
      console.log('🎵 Lyrics found in session cache for:', cacheKey);
      setLyricsState({
        lyrics: lyricsCache.current.get(cacheKey),
        isLoading: false,
        error: null,
        cachedSongId: cacheKey
      });
      return;
    }

    // Not in cache - fetch from Musixmatch via Convex
    setLyricsState({
      lyrics: null,
      isLoading: true,
      error: null,
      cachedSongId: null
    });

    try {
      console.log('🎵 Fetching lyrics from Musixmatch for:', trackName, 'by', artistName);
      const result = await fetchLyricsAction({
        trackName,
        artistName,
      });

      if (result.success && result.lyrics) {
        // Cache the lyrics locally
        lyricsCache.current.set(cacheKey, result.lyrics);
        console.log('🎵 Lyrics cached for:', cacheKey, '(source:', result.source, ')');

        setLyricsState({
          lyrics: result.lyrics,
          isLoading: false,
          error: null,
          cachedSongId: cacheKey
        });
      } else {
        setLyricsState({
          lyrics: null,
          isLoading: false,
          error: result.error || 'Lyrics not found for this song',
          cachedSongId: null
        });
      }
    } catch (error) {
      console.error('Failed to fetch lyrics:', error);
      setLyricsState({
        lyrics: null,
        isLoading: false,
        error: 'Could not load lyrics. Please try again.',
        cachedSongId: null
      });
    }
  };

  // Open queue modal (refresh queue data for inline display)
  const handleOpenQueue = () => {
    const rawQueue = musicKitService.getQueue();
    const position = musicKitService.getQueuePosition();

    // Normalize queue items to have consistent property names
    const normalizedQueue = rawQueue.map(item => ({
      ...item,
      // Normalize track name
      title: item.title || item.attributes?.name || item.name || 'Unknown Track',
      name: item.name || item.attributes?.name || item.title || 'Unknown Track',
      songName: item.songName || item.attributes?.name || item.title || item.name || 'Unknown Track',
      // Normalize artist name
      artistName: item.artistName || item.attributes?.artistName || 'Unknown Artist',
      // Normalize artwork
      artworkUrl: item.artworkUrl || item.artwork?.url || item.attributes?.artwork?.url,
      artwork: item.artwork || (item.attributes?.artwork ? { url: item.attributes.artwork.url } : null),
      // Keep ID
      id: item.id || item.attributes?.playParams?.id,
    }));

    setQueueState({
      items: normalizedQueue,
      currentIndex: position
    });
  };

  // Play track from queue at specific index
  const handlePlayQueueTrack = async (index) => {
    try {
      if (musicKitService.music && musicKitService.music.queue) {
        await musicKitService.music.changeToMediaAtIndex(index);
      }
    } catch (error) {
      console.error('Failed to play track from queue:', error);
      showToast('Could not play selected track', 'error');
    }
  };

  // Add song to queue (play next)
  const handleAddToQueue = async (song, playNext = true) => {
    const songId = song.appleSongId || song.id;
    if (!songId) {
      showToast('Cannot add this song to queue', 'error');
      return;
    }

    // Check if there's something playing first
    if (!playerState.currentTrack) {
      showToast('Start playing a song first to build a queue', 'info');
      return;
    }

    try {
      const success = await musicKitService.addToQueue(songId, playNext);
      if (success) {
        showToast(playNext ? 'Added to Play Next' : 'Added to queue', 'success');
        // Refresh queue state with normalized items
        handleOpenQueue();
      } else {
        showToast('Could not add to queue - start playing a song first', 'info');
      }
    } catch (error) {
      console.error('Failed to add to queue:', error);
      showToast('Failed to add to queue', 'error');
    }
  };

  // AirPlay handler
  const handleAirplay = () => {
    // AirPlay is handled natively by the browser/device
    // We can show a helpful message
    showToast('Use your device\'s AirPlay/Cast controls to stream to other devices', 'info');
  };

  // Time limit state
  const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);
  const [showMusicPausedModal, setShowMusicPausedModal] = useState(false);
  const [listeningStartTime, setListeningStartTime] = useState(null);
  const listeningStartTimeRef = useRef(null);
  const [sessionMinutesSaved, setSessionMinutesSaved] = useState(0); // Track minutes saved in current session

  // Fetch time limit settings
  const timeLimitSettings = useQuery(
    api.timeControls.getTimeLimitSettings,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  );

  // Fetch real-time kid profile data (for musicPaused status that parent can toggle)
  const liveKidProfile = useQuery(
    api.kidProfiles.getKidProfile,
    kidProfile ? { profileId: kidProfile._id } : 'skip'
  );

  // Fetch parent user settings (for globalHideArtwork)
  const parentUser = useQuery(
    api.users.getUser,
    kidProfile?.userId ? { userId: kidProfile.userId } : 'skip'
  );

  // Global hide artwork setting from parent
  const globalHideArtwork = parentUser?.globalHideArtwork || false;

  // Fetch approved albums (includes both full albums and albums with individual approved songs)
  const approvedAlbums = useQuery(
    api.albums.getAlbumsWithApprovedSongs,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  );

  // Fetch approved songs
  const approvedSongs = useQuery(
    api.songs.getApprovedSongsForKid,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  );

  // Fetch playlists
  const playlists = useQuery(
    api.playlists.getPlaylistsForKid,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  );

  // Fetch kid's requests (pending, approved, denied)
  const kidRequests = useQuery(
    api.kidRequests.getKidRequests,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  ) || [];

  // Get count of unviewed reviewed requests for badge
  const unviewedCount = useQuery(
    api.kidRequests.getUnviewedCount,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  ) || 0;

  // Mutation to mark requests as viewed
  const markAllRequestsAsViewed = useMutation(api.kidRequests.markAllRequestsAsViewed);

  // Action to fetch lyrics from Musixmatch (via Convex backend with caching)
  const fetchLyricsAction = useAction(api.ai.lyrics.fetchLyrics);

  // Fetch album requests (to show pending requests)
  const albumRequests = useQuery(
    api.albumRequests.getRequestsForKid,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  );

  // Fetch song requests (to show pending song requests)
  const songRequests = useQuery(
    api.songRequests.getSongRequestsForKid,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  );

  // Fetch recently played
  const recentlyPlayedRaw = useQuery(
    api.recentlyPlayed.getRecentlyPlayed,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  );

  // SECURITY: Filter recently played to only show approved content
  // Recently Played: Chronological history (most recent first)
  const recentlyPlayedData = useMemo(() => {
    if (!recentlyPlayedRaw || !approvedSongs) return [];

    const approvedSongIds = new Set(approvedSongs.map(s => s.appleSongId));

    return recentlyPlayedRaw.filter(item =>
      item.itemType === 'song' && approvedSongIds.has(item.itemId)
    );
  }, [recentlyPlayedRaw, approvedSongs]);

  // Fetch most played songs (On Repeat)
  const mostPlayedRaw = useQuery(
    api.recentlyPlayed.getMostPlayed,
    kidProfile ? { kidProfileId: kidProfile._id, limit: 50 } : 'skip'
  );

  // SECURITY: Filter most played to only show approved content
  // On Repeat: Songs sorted by play count (most played first)
  const onRepeatData = useMemo(() => {
    if (!mostPlayedRaw || !approvedSongs) return [];

    const approvedSongIds = new Set(approvedSongs.map(s => s.appleSongId));

    return mostPlayedRaw.filter(item =>
      item.itemType === 'song' && approvedSongIds.has(item.itemId)
    );
  }, [mostPlayedRaw, approvedSongs]);

  // Helper functions
  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  // Helper to check if artwork should be hidden for an album
  const shouldHideAlbumArtwork = (albumIdOrName) => {
    if (globalHideArtwork) return true;
    if (!approvedAlbums) return false;
    // Try matching by ID first, then by name (case-insensitive)
    const album = approvedAlbums.find(a =>
      a.appleAlbumId === albumIdOrName ||
      a.albumName?.toLowerCase().trim() === String(albumIdOrName || '').toLowerCase().trim()
    );
    return album?.hideArtwork || false;
  };

  // Helper to check if artwork should be hidden for a song
  const shouldHideSongArtwork = (songId) => {
    if (globalHideArtwork) return true;
    if (!approvedSongs) return false;
    const song = approvedSongs.find(s => String(s.appleSongId) === String(songId));
    return song?.hideArtwork || false;
  };

  // Helper to check if artwork should be hidden for a song (including album check)
  // Used for playlist songs which may have hidden album artwork
  const shouldHideSongArtworkFull = (songIdOrSong) => {
    if (globalHideArtwork) return true;
    const songId = typeof songIdOrSong === 'string' ? songIdOrSong : songIdOrSong?.appleSongId;
    const albumName = typeof songIdOrSong === 'object' ? songIdOrSong?.albumName : null;

    // Check if song itself has hideArtwork
    if (approvedSongs) {
      const song = approvedSongs.find(s => String(s.appleSongId) === String(songId));
      if (song?.hideArtwork) return true;
      // If we got the song from approvedSongs, use its album name
      if (!albumName && song?.albumName && approvedAlbums) {
        const songAlbumLower = song.albumName.toLowerCase().trim();
        const album = approvedAlbums.find(a => a.albumName?.toLowerCase().trim() === songAlbumLower);
        if (album?.hideArtwork) return true;
      }
    }

    // Check if album has hideArtwork (using passed albumName)
    if (albumName && approvedAlbums) {
      const albumNameLower = albumName.toLowerCase().trim();
      const album = approvedAlbums.find(a => a.albumName?.toLowerCase().trim() === albumNameLower);
      if (album?.hideArtwork) return true;
    }

    return false;
  };

  // Helper to check if artwork should be hidden for a playlist
  // Playlists use the first song's artwork, so we need to check if that song's album has hideArtwork
  const shouldHidePlaylistArtwork = (playlist) => {
    if (globalHideArtwork) return true;
    if (!playlist?.songs || playlist.songs.length === 0) return false;
    const firstSong = playlist.songs[0];

    // First check if the song itself has hideArtwork set
    if (firstSong.appleSongId && approvedSongs) {
      const approvedSong = approvedSongs.find(s => s.appleSongId === firstSong.appleSongId);
      if (approvedSong?.hideArtwork) return true;
    }

    // Check by appleAlbumId first (most accurate)
    if (firstSong.appleAlbumId && approvedAlbums) {
      const albumById = approvedAlbums.find(a => a.appleAlbumId === firstSong.appleAlbumId);
      if (albumById?.hideArtwork) return true;
    }

    // Fallback: check by album name
    if (firstSong.albumName && approvedAlbums) {
      const album = approvedAlbums.find(a => a.albumName === firstSong.albumName);
      if (album?.hideArtwork) return true;
    }

    return false;
  };

  // Helper to check if artwork should be hidden for a recently played item
  const shouldHideRecentlyPlayedArtwork = (item) => {
    if (globalHideArtwork) return true;
    if (item.itemType === 'album') return shouldHideAlbumArtwork(item.itemId);
    if (item.itemType === 'song') return shouldHideSongArtwork(item.itemId);
    if (item.itemType === 'playlist') return !item.artworkUrl;
    return false;
  };

  // State for time-of-day modal
  const [showTimeOfDayModal, setShowTimeOfDayModal] = useState(false);

  // Helper to check if playback is allowed (music paused, time-of-day, or daily limit)
  const checkCanPlay = () => {
    // First check if parent has paused music access
    if (liveKidProfile?.musicPaused) {
      setShowMusicPausedModal(true);
      return false;
    }

    // Check time-of-day restrictions
    if (timeLimitSettings?.isOutsideAllowedHours) {
      setShowTimeOfDayModal(true);
      return false;
    }

    // Then check daily time limit
    if (!timeLimitSettings?.isEnabled) return true;

    // Calculate current total including any ongoing session time
    const savedMinutes = timeLimitSettings.usedMinutes || 0;
    let sessionMinutes = 0;
    if (listeningStartTime) {
      sessionMinutes = Math.floor((Date.now() - listeningStartTime) / 60000) - sessionMinutesSaved;
    }
    const totalMinutes = savedMinutes + sessionMinutes;
    const limitMinutes = timeLimitSettings.limitMinutes;

    console.log(`[checkCanPlay] saved=${savedMinutes}, session=${sessionMinutes}, total=${totalMinutes}, limit=${limitMinutes}`);

    if (limitMinutes && totalMinutes >= limitMinutes) {
      setShowTimeLimitModal(true);
      return false;
    }
    return true;
  };

  // Helper to format time for display
  const formatTimeRemaining = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  // Keep ref in sync with state for use in event listener
  useEffect(() => {
    listeningStartTimeRef.current = listeningStartTime;
  }, [listeningStartTime]);

  // Auto-stop playback if parent pauses music access
  useEffect(() => {
    if (liveKidProfile?.musicPaused && playerState.isPlaying) {
      // Parent paused music - stop playback immediately
      musicKitService.pause();
      setShowMusicPausedModal(true);
    }
  }, [liveKidProfile?.musicPaused, playerState.isPlaying]);

  // Track listening time when playback state changes (always track, regardless of time limit settings)
  useEffect(() => {
    if (!kidProfile) return;

    const handlePlaybackChange = async () => {
      const music = musicKitService.music;
      if (!music) return;

      const isPlaying = music.playbackState === 2; // 2 = playing
      const startTime = listeningStartTimeRef.current;

      if (isPlaying && !startTime) {
        // Started playing - record start time
        const now = Date.now();
        listeningStartTimeRef.current = now;
        setListeningStartTime(now);
      } else if (!isPlaying && startTime) {
        // Stopped playing - calculate and add listening time
        const elapsed = Date.now() - startTime;
        const minutes = Math.round(elapsed / 60000);

        if (minutes > 0) {
          try {
            await addListeningTimeMutation({
              kidProfileId: kidProfile._id,
              minutes,
            });
          } catch (error) {
            console.error('Failed to track listening time:', error);
          }
        }
        listeningStartTimeRef.current = null;
        setListeningStartTime(null);
      }
    };

    // Set up listener
    const music = musicKitService.music;
    if (music) {
      music.addEventListener('playbackStateDidChange', handlePlaybackChange);
      return () => {
        music.removeEventListener('playbackStateDidChange', handlePlaybackChange);
      };
    }
  }, [kidProfile, addListeningTimeMutation]);

  // Check time limit periodically during playback and save time incrementally
  useEffect(() => {
    if (!kidProfile || !timeLimitSettings?.isEnabled || !listeningStartTime) return;

    const intervalId = setInterval(async () => {
      const music = musicKitService.music;
      if (!music || music.playbackState !== 2) return; // Only check if playing

      // Calculate time listened in this session since last save
      const elapsed = Date.now() - listeningStartTime;
      const totalSessionMinutes = Math.floor(elapsed / 60000);
      const minutesToSave = totalSessionMinutes - sessionMinutesSaved;

      // Save time every minute during playback (not just when stopped)
      if (minutesToSave >= 1) {
        try {
          await addListeningTimeMutation({
            kidProfileId: kidProfile._id,
            minutes: minutesToSave,
          });
          setSessionMinutesSaved(totalSessionMinutes);
          console.log(`[TimeLimit] Saved ${minutesToSave} minutes. Session total: ${totalSessionMinutes}m`);
        } catch (error) {
          console.error('Failed to save listening time:', error);
        }
      }

      // Check if we've exceeded the limit using fresh calculation
      // usedMinutes from query + any unsaved session time
      const savedMinutes = timeLimitSettings.usedMinutes || 0;
      const unsavedMinutes = totalSessionMinutes - sessionMinutesSaved;
      const totalMinutes = savedMinutes + unsavedMinutes;

      console.log(`[TimeLimit] Check: saved=${savedMinutes}, session=${totalSessionMinutes}, unsaved=${unsavedMinutes}, total=${totalMinutes}, limit=${timeLimitSettings.limitMinutes}`);

      if (timeLimitSettings.limitMinutes && totalMinutes >= timeLimitSettings.limitMinutes) {
        // Time limit reached - stop playback
        try {
          await music.pause();
          setShowTimeLimitModal(true);

          // Save any remaining unsaved time
          if (unsavedMinutes > 0) {
            await addListeningTimeMutation({
              kidProfileId: kidProfile._id,
              minutes: unsavedMinutes,
            });
          }

          // Reset session tracking
          listeningStartTimeRef.current = null;
          setListeningStartTime(null);
          setSessionMinutesSaved(0);
          console.log('[TimeLimit] Limit reached - playback stopped');
        } catch (error) {
          console.error('Failed to pause playback:', error);
        }
      }
    }, 10000); // Check every 10 seconds (more responsive)

    return () => clearInterval(intervalId);
  }, [kidProfile, timeLimitSettings, listeningStartTime, sessionMinutesSaved, addListeningTimeMutation]);

  // Reset session minutes when playback stops
  useEffect(() => {
    if (!listeningStartTime) {
      setSessionMinutesSaved(0);
    }
  }, [listeningStartTime]);

  // Helper to play a recently played item
  const handlePlayRecentlyPlayed = (item) => {
    if (!checkCanPlay()) return;

    if (item.itemType === 'album') {
      handlePlayAlbum({ appleAlbumId: item.itemId, albumName: item.itemName, artistName: item.artistName, artworkUrl: item.artworkUrl });
    } else if (item.itemType === 'song') {
      handlePlaySong({ appleSongId: item.itemId, songName: item.itemName, artistName: item.artistName, artworkUrl: item.artworkUrl });
    } else if (item.itemType === 'playlist') {
      const playlist = playlists?.find(p => p._id === item.itemId);
      if (playlist) handlePlayPlaylist(playlist);
    }
  };

  const handleLogout = () => {
    // If onLogout prop is provided (when rendered from ChildLoginPage), use it
    // This allows the parent component to manage state properly
    if (onLogout) {
      onLogout();
    } else {
      // Fallback: Remove only the kid profile, keep family code so they can switch to another child
      localStorage.removeItem('safetunes_kid_profile');
      // In native app, go to app landing page; on web, go to /play
      const isNativeApp = /SafeTunesApp/.test(navigator.userAgent) || window.isInSafeTunesApp;
      navigate(isNativeApp ? '/app' : '/play');
    }
  };

  const handleConnectAppleMusic = async () => {
    try {
      setIsConnectingMusic(true);
      await musicKitService.authorize();
      setIsMusicKitAuthorized(true);
    } catch (error) {
      console.error('Failed to connect to Apple Music:', error);
      showToast('Failed to connect to Apple Music. Please try again.', 'error');
    } finally {
      setIsConnectingMusic(false);
    }
  };

  const handleDisconnectAppleMusic = async () => {
    try {
      await musicKitService.unauthorize();
      setIsMusicKitAuthorized(false);
    } catch (error) {
      console.error('Failed to disconnect from Apple Music:', error);
      showToast('Failed to disconnect from Apple Music. Please try again.', 'error');
    }
  };

  const handlePlayAlbum = async (album) => {
    triggerHaptic('medium');
    // Check time limit before playing
    if (!checkCanPlay()) return;

    try {
      const albumId = album.appleAlbumId || album.id;
      const isFromDiscover = album.fromDiscover === true;

      // If from Discover page, all tracks are pre-approved - skip approval checks
      if (isFromDiscover) {
        const allTracks = await musicKitService.getAlbumTracks(albumId);

        if (allTracks.length === 0) {
          showToast('No tracks found in this album.', 'warning');
          return;
        }

        console.log('🎵 PLAYING FROM DISCOVER:', {
          albumName: album.albumName,
          trackCount: allTracks.length
        });

        // Set playback context for Discover source
        setPlaybackContext({
          source: 'discover',
          album: {
            appleAlbumId: albumId,
            albumName: album.albumName,
            artistName: album.artistName,
            artworkUrl: album.artworkUrl,
          },
          artist: album.artistName,
        });

        await musicKitService.playApprovedSongs(allTracks);
        setSelectedAlbum(null);

        // Track recently played
        if (kidProfile) {
          const artworkUrl = album.artworkUrl || album.attributes?.artwork?.url;
          await addRecentlyPlayedMutation({
            kidProfileId: kidProfile._id,
            userId: kidProfile.userId,
            itemType: 'album',
            itemId: String(albumId),
            itemName: album.albumName || album.attributes?.name || 'Unknown Album',
            artistName: album.artistName || album.attributes?.artistName,
            artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
          });
        }
        return;
      }

      // If album already has approvedSongs embedded (from Library), use those directly
      // This is faster and works even if appleAlbumId is null
      if (album.approvedSongs && Array.isArray(album.approvedSongs) && album.approvedSongs.length > 0) {
        console.log('🎵 PLAYING FROM LIBRARY (pre-loaded songs):', {
          albumName: album.albumName,
          trackCount: album.approvedSongs.length
        });

        // Clear Discover context - playing from Library
        setPlaybackContext({ source: 'library', album: null, artist: null });

        // Convert approvedSongs to format MusicKit expects (just need song IDs)
        const tracksToPlay = album.approvedSongs.map(song => ({
          id: song.appleSongId,
          attributes: {
            name: song.songName,
            artistName: song.artistName,
          }
        }));

        await musicKitService.playApprovedSongs(tracksToPlay);
        setSelectedAlbum(null);

        // Track recently played
        if (kidProfile) {
          const artworkUrl = album.artworkUrl || album.attributes?.artwork?.url;
          await addRecentlyPlayedMutation({
            kidProfileId: kidProfile._id,
            userId: kidProfile.userId,
            itemType: 'album',
            itemId: String(albumId || album.albumName),
            itemName: album.albumName || album.attributes?.name || 'Unknown Album',
            artistName: album.artistName || album.attributes?.artistName,
            artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
          });
        }
        return;
      }

      // Fallback: fetch from API (for albums without pre-loaded songs)
      if (!albumId) {
        showToast('Cannot play this album - missing album ID', 'error');
        return;
      }

      // Check if this album is approved for this kid
      const isAlbumApproved = approvedAlbums.some(a =>
        a.appleAlbumId === albumId &&
        (!a.kidProfileId || a.kidProfileId === kidProfile._id)
      );

      // Get all tracks from the album
      const allTracks = await musicKitService.getAlbumTracks(albumId);

      let approvedTracks;

      // Get approved song IDs for this album
      const approvedSongIds = new Set(
        approvedSongs
          .filter(s => s.kidProfileId === kidProfile._id || !s.kidProfileId)
          .map(s => s.appleSongId)
      );

      // Check if there are any individual song approvals for this album
      const hasIndividualApprovals = approvedSongs.some(s =>
        (s.kidProfileId === kidProfile._id || !s.kidProfileId) &&
        s.albumName === album.albumName
      );

      console.log('🎵 ALBUM PLAYBACK DEBUG:', {
        albumName: album.albumName,
        isAlbumApproved,
        hasIndividualApprovals,
        approvedSongsForThisAlbum: approvedSongs.filter(s => s.albumName === album.albumName),
        approvedSongIdsCount: approvedSongIds.size,
      });

      if (isAlbumApproved && !hasIndividualApprovals) {
        // If the whole album is approved and no individual songs managed, all tracks are playable
        approvedTracks = allTracks;
      } else if (isAlbumApproved && hasIndividualApprovals) {
        // If album is approved but individual songs are managed, filter to approved songs only
        approvedTracks = allTracks.filter(track => {
          const trackId = track.id || track.attributes?.playParams?.id;
          return approvedSongIds.has(trackId);
        });
      } else {
        // If only individual songs are approved (no album approval), filter to those
        approvedTracks = allTracks.filter(track => {
          const trackId = track.id || track.attributes?.playParams?.id;
          return approvedSongIds.has(trackId);
        });
      }

      if (approvedTracks.length === 0) {
        showToast('No approved songs found in this album. Please ask your parents to approve some songs first.', 'warning');
        return;
      }

      // Play approved tracks
      console.log('🎵 About to play approved tracks:', {
        trackCount: approvedTracks.length,
        firstTrack: approvedTracks[0],
        trackIds: approvedTracks.map(t => t.id || t.attributes?.playParams?.id).filter(Boolean)
      });
      await musicKitService.playApprovedSongs(approvedTracks);

      // Close album modal when playing
      setSelectedAlbum(null);

      // Track recently played
      if (kidProfile) {
        const artworkUrl = album.artworkUrl || album.attributes?.artwork?.url;
        await addRecentlyPlayedMutation({
          kidProfileId: kidProfile._id,
          userId: kidProfile.userId,
          itemType: 'album',
          itemId: String(albumId),
          itemName: album.albumName || album.attributes?.name || 'Unknown Album',
          artistName: album.artistName || album.attributes?.artistName,
          artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
        });
      }
    } catch (err) {
      console.error('Failed to play album:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        name: err.name,
        stack: err.stack
      });

      // Check if it's a subscription issue
      if (err.message && err.message.includes('CONTENT_UNAVAILABLE')) {
        showToast('Unable to play this album. This requires an active Apple Music subscription. Please make sure you are signed in to Apple Music with a paid subscription account.', 'error');
      } else if (err.message && err.message.includes('subscription')) {
        showToast('Unable to play this album. Please make sure you have an active Apple Music subscription.', 'error');
      } else {
        showToast(`Unable to play this album: ${err.message || 'Unknown error'}`, 'error');
      }
    }
  };

  const handlePlaySong = async (song, albumTracksContext = null) => {
    triggerHaptic('medium');
    // Check time limit before playing
    if (!checkCanPlay()) return;

    try {
      const songId = song.appleSongId || song.id;
      const isFromDiscover = song.fromDiscover === true;

      // Set playback context based on source
      if (isFromDiscover) {
        setPlaybackContext({
          source: 'discover',
          album: song.albumName ? {
            albumName: song.albumName,
            artistName: song.artistName,
            artworkUrl: song.artworkUrl,
          } : null,
          artist: song.artistName,
          currentSong: {
            appleSongId: songId,
            songName: song.songName || song.name,
            artistName: song.artistName,
            albumName: song.albumName,
            artworkUrl: song.artworkUrl,
          }
        });
      } else {
        setPlaybackContext({ source: 'library', album: null, artist: null, currentSong: null });
      }

      // If we have album tracks context (playing from album view), queue all tracks
      if (albumTracksContext && albumTracksContext.length > 1) {
        console.log('🎵 Playing song with album context - queueing all tracks');

        // Find the index of the current song
        const songIndex = albumTracksContext.findIndex(track => {
          const trackId = track.id || track.appleSongId;
          return trackId === songId;
        });

        if (songIndex !== -1) {
          // Play all approved tracks starting from the selected song
          await musicKitService.playApprovedSongs(albumTracksContext, songIndex);
        } else {
          // Fallback: just play the single song (with metadata for library ID conversion)
          await musicKitService.playSong(songId, {
            songName: song.songName || song.attributes?.name,
            artistName: song.artistName || song.attributes?.artistName
          });
        }
      } else {
        // No album context, play just this song (with metadata for library ID conversion)
        await musicKitService.playSong(songId, {
          songName: song.songName || song.attributes?.name,
          artistName: song.artistName || song.attributes?.artistName
        });
      }

      // Track recently played
      if (kidProfile) {
        try {
          const artworkUrl = song.artworkUrl || song.attributes?.artwork?.url;
          const durationMs = song.durationInMillis || song.attributes?.durationInMillis;
          console.log('🔄 Tracking recently played song:', {
            songName: song.songName || song.attributes?.name,
            artistName: song.artistName || song.attributes?.artistName,
            songId: String(songId),
            durationMs
          });
          await addRecentlyPlayedMutation({
            kidProfileId: kidProfile._id,
            userId: kidProfile.userId,
            itemType: 'song',
            itemId: String(songId),
            itemName: song.songName || song.attributes?.name || 'Unknown Song',
            artistName: song.artistName || song.attributes?.artistName,
            artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
            durationInMillis: durationMs,
          });
          console.log('✅ Recently played tracked successfully');
        } catch (error) {
          console.error('❌ Failed to track recently played:', error);
        }
      }
    } catch (err) {
      console.error('Failed to play song:', err);
      showToast('Unable to play this song. Please make sure you have an active Apple Music subscription.', 'error');
    }
  };

  const handleViewTracks = async (album) => {
    console.log('🎵 ALBUM CLICKED:', album);
    setSelectedAlbum(album);
    setLoadingTracks(true);
    try {
      // Check if this is a partial album (individual songs only)
      if (!album.appleAlbumId && album.approvedSongs && album.approvedSongs.length > 0) {
        // For partial albums, show the approved songs directly
        console.log('🎵 PARTIAL ALBUM - showing approved songs:', album.approvedSongs.length);
        const tracksWithFormat = album.approvedSongs.map(song => ({
          id: song.appleSongId,
          attributes: {
            name: song.songName,
            artistName: song.artistName,
            durationInMillis: song.durationInMillis,
            playParams: { id: song.appleSongId }
          }
        }));
        setAlbumTracks(tracksWithFormat);
        setLoadingTracks(false);
        return;
      }

      const albumId = album.appleAlbumId || album.id;
      console.log('🎵 EXTRACTED ALBUM ID:', albumId);

      if (!albumId) {
        console.error('🎵 NO ALBUM ID - cannot fetch tracks');
        setAlbumTracks([]);
        setLoadingTracks(false);
        return;
      }

      const allTracks = await musicKitService.getAlbumTracks(albumId);

      // Check if this album is fully approved or has individual song approvals
      const isAlbumApproved = approvedAlbums.some(a =>
        a.appleAlbumId === albumId &&
        (!a.kidProfileId || a.kidProfileId === kidProfile._id)
      );

      // Check if there are individual song approvals for this album
      const hasIndividualApprovals = approvedSongs.some(s =>
        (s.kidProfileId === kidProfile._id || !s.kidProfileId) &&
        s.albumName === album.albumName
      );

      console.log('🎵 VIEW TRACKS DEBUG:', {
        albumName: album.albumName,
        isAlbumApproved,
        hasIndividualApprovals,
        allTracksCount: allTracks.length,
      });

      let tracksToShow;

      if (isAlbumApproved && !hasIndividualApprovals) {
        // Show all tracks if album is fully approved and no individual song management
        tracksToShow = allTracks;
      } else if (hasIndividualApprovals) {
        // Filter to only approved songs if individual song management is active
        const approvedSongIds = new Set(
          approvedSongs
            .filter(s => s.kidProfileId === kidProfile._id || !s.kidProfileId)
            .map(s => s.appleSongId)
        );
        tracksToShow = allTracks.filter(track => {
          const trackId = track.id || track.attributes?.playParams?.id;
          return approvedSongIds.has(trackId);
        });
      } else {
        // No album approval and no individual songs - shouldn't happen, but show empty
        tracksToShow = [];
      }

      console.log('🎵 FILTERED TRACKS:', tracksToShow.length, 'of', allTracks.length);
      setAlbumTracks(tracksToShow);
    } catch (err) {
      console.error('Failed to load tracks:', err);
      // FALLBACK: If Apple Music API fails (404 - album removed or ID changed),
      // show the approved songs we have stored in our database
      if (album.approvedSongs && album.approvedSongs.length > 0) {
        console.log('🎵 API FAILED - Falling back to stored approved songs:', album.approvedSongs.length);
        const fallbackTracks = album.approvedSongs.map(song => ({
          id: song.appleSongId,
          attributes: {
            name: song.songName,
            artistName: song.artistName,
            durationInMillis: song.durationInMillis,
            artwork: song.artworkUrl ? { url: song.artworkUrl } : null,
            playParams: { id: song.appleSongId }
          }
        }));
        setAlbumTracks(fallbackTracks);
      } else {
        setAlbumTracks([]);
      }
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleShuffle = async () => {
    const newShuffleState = !isShuffleOn;
    setIsShuffleOn(newShuffleState);

    if (musicKitService.music) {
      try {
        // Set shuffle mode in MusicKit
        musicKitService.music.shuffleMode = newShuffleState ? 1 : 0;

        // If turning shuffle ON and we have approved songs, shuffle and play all approved songs
        if (newShuffleState && approvedSongs && approvedSongs.length > 0) {
          // Get all approved songs and shuffle them
          const allApprovedSongs = [...approvedSongs];

          // Shuffle the array
          for (let i = allApprovedSongs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allApprovedSongs[i], allApprovedSongs[j]] = [allApprovedSongs[j], allApprovedSongs[i]];
          }

          // Format for playApprovedSongs
          const tracks = allApprovedSongs.map(song => ({
            id: song.appleSongId,
            attributes: {
              name: song.songName,
              artistName: song.artistName,
              artwork: song.artworkUrl ? {
                url: song.artworkUrl.replace('{w}', '{w}').replace('{h}', '{h}')
              } : null
            }
          }));

          // Play shuffled approved songs
          await musicKitService.playApprovedSongs(tracks, 0);
          showToast(`🎲 Shuffling ${tracks.length} approved songs!`, 'success');
        } else if (!newShuffleState) {
          showToast('Shuffle off', 'info');
        }
      } catch (err) {
        console.error('Failed to set shuffle:', err);
        showToast('Failed to shuffle. Please try again.', 'error');
      }
    }
  };

  // Sleep Timer handlers
  const handleSetSleepTimer = (minutes) => {
    // Clear any existing timer
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
    }

    if (minutes === -1) {
      // "End of track" - set timer for remaining duration
      const remainingMs = (playerState.duration - playerState.progress) * 1000;
      const endTime = new Date(Date.now() + remainingMs);
      setSleepTimer({ minutes: -1, endTime });

      sleepTimerRef.current = setTimeout(() => {
        musicKitService.pause();
        setSleepTimer(null);
        showToast('💤 Sleep timer ended. Good night!', 'info');
      }, remainingMs);

      showToast(`💤 Music will stop at end of track`, 'success');
    } else {
      // Set timer for specified minutes
      const ms = minutes * 60 * 1000;
      const endTime = new Date(Date.now() + ms);
      setSleepTimer({ minutes, endTime });

      sleepTimerRef.current = setTimeout(() => {
        musicKitService.pause();
        setSleepTimer(null);
        showToast('💤 Sleep timer ended. Good night!', 'info');
      }, ms);

      showToast(`💤 Sleep timer set for ${minutes} minutes`, 'success');
    }
  };

  const handleCancelSleepTimer = () => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimer(null);
    showToast('Sleep timer cancelled', 'info');
  };

  // Cleanup sleep timer on unmount
  useEffect(() => {
    return () => {
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
      }
    };
  }, []);

  // Apple Music search - now searches both albums and songs
  const handleAppleMusicSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Validate search query for inappropriate content
    const validation = validateSearchQuery(searchQuery);
    if (!validation.isValid) {
      // Log the blocked search
      if (validation.blockedKeyword && kidProfile?.userId && kidProfile?._id) {
        try {
          await logBlockedSearch({
            userId: kidProfile.userId,
            kidProfileId: kidProfile._id,
            searchQuery: searchQuery,
            blockedReason: `Blocked keyword: "${validation.blockedKeyword}"`,
          });
        } catch (err) {
          console.error('Failed to log blocked search:', err);
        }
      }

      // Show blocked message with random Bible verse
      const randomVerse = BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)];
      setBlockedMessage({
        message: validation.message,
        verse: randomVerse
      });
      setSearchResults([]);
      setSearchQuery('');
      return;
    }

    // Clear any blocked message
    setBlockedMessage(null);
    setIsSearching(true);
    setSearchResults([]);
    setExpandedAlbums({});

    try {
      // Search for songs, albums, AND artists (like Add tab does)
      const results = await musicKitService.search(searchQuery, {
        types: 'songs,albums,artists',
        limit: 25,
      });

      console.log('Search results:', results);

      const songs = results.data?.results?.songs?.data || [];
      let albums = results.data?.results?.albums?.data || [];
      const artists = results.data?.results?.artists?.data || [];

      // Smart album enrichment: If an artist matches the query, fetch their albums
      // This fixes the issue where searching "Rolling Stones" only shows albums NAMED that
      // instead of albums BY that artist
      const queryLower = searchQuery.toLowerCase().trim();

      // Helper to normalize artist names - strips common prefixes like "The", "A", "An"
      const normalizeArtistName = (name) => {
        const lower = name.toLowerCase().trim();
        return lower.replace(/^(the|a|an)\s+/i, '');
      };

      const queryNormalized = normalizeArtistName(queryLower);

      const matchingArtist = artists.find(artist => {
        const artistName = artist.attributes?.name?.toLowerCase() || '';
        const artistNormalized = normalizeArtistName(artistName);

        // Match strategies (handles "Rolling Stones" vs "The Rolling Stones"):
        return artistName === queryLower ||
               artistNormalized === queryNormalized ||
               artistName.startsWith(queryLower) ||
               artistNormalized.startsWith(queryNormalized) ||
               queryLower.startsWith(artistName) ||
               queryNormalized.startsWith(artistNormalized) ||
               (queryNormalized.length >= 3 && artistNormalized.includes(queryNormalized));
      });

      if (matchingArtist) {
        try {
          // Fetch the artist's actual albums
          const artistAlbumsData = await musicKitService.getArtistAlbums(matchingArtist.id);
          if (artistAlbumsData && artistAlbumsData.length > 0) {
            // Mark these as artist albums and prioritize them
            const artistAlbums = artistAlbumsData.map(album => ({
              ...album,
              resultType: 'album',
              itemType: 'album',
              isArtistAlbum: true
            }));

            // Filter out text-matched albums that aren't by the matching artist
            const matchingArtistName = matchingArtist.attributes?.name?.toLowerCase();
            const filteredTextAlbums = albums.filter(album => {
              const albumArtist = album.attributes?.artistName?.toLowerCase() || '';
              return albumArtist.includes(matchingArtistName) || matchingArtistName.includes(albumArtist);
            });

            // Merge artist albums with filtered text albums, deduplicating by ID
            const seenIds = new Set();
            albums = [];

            // Add artist albums first (prioritized)
            for (const album of artistAlbums) {
              if (!seenIds.has(album.id)) {
                seenIds.add(album.id);
                albums.push(album);
              }
            }

            // Then add any filtered text-matched albums that weren't duplicates
            for (const album of filteredTextAlbums) {
              if (!seenIds.has(album.id)) {
                seenIds.add(album.id);
                albums.push({ ...album, resultType: 'album', itemType: 'album' });
              }
            }
          }
        } catch (artistErr) {
          console.warn('Failed to fetch artist albums:', artistErr);
        }
      }

      // Mark items with their type for rendering
      const albumItems = albums.map(item => ({ ...item, itemType: 'album', resultType: 'album' }));
      const songItems = songs.map(item => ({ ...item, itemType: 'song', resultType: 'song' }));
      const artistItems = artists.map(item => ({ ...item, itemType: 'artist', resultType: 'artist' }));

      // Combine all results - artists first (for Top Result), then albums, then songs
      const mixed = [...artistItems, ...albumItems, ...songItems];

      // Filter results to remove inappropriate content
      const filteredResults = mixed.filter(item => {
        // Don't filter artists - they're just navigation
        if (item.resultType === 'artist') return true;

        const name = item.attributes?.name || '';
        const artist = item.attributes?.artistName || '';
        const isExplicit = item.attributes?.contentRating === 'explicit';

        return filterSearchResults([{
          name,
          artist,
          contentRating: item.attributes?.contentRating,
          isExplicit
        }]).length > 0;
      });

      setSearchResults(filteredResults);
    } catch (err) {
      console.error('Search failed:', err);
      showToast('Search failed. Please try again.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle album expansion and load tracks
  const handleToggleAlbumExpansion = async (albumId) => {
    if (expandedAlbums[albumId]) {
      // Collapse
      setExpandedAlbums(prev => ({ ...prev, [albumId]: null }));
    } else {
      // Expand and load tracks
      setLoadingAlbumTracks(prev => ({ ...prev, [albumId]: true }));
      try {
        // Ensure MusicKit is initialized before fetching tracks
        if (!musicKitService.isInitialized) {
          await musicKitService.initialize();
        }
        const tracks = await musicKitService.getAlbumTracks(albumId);
        console.log('🎵 Album tracks loaded:', { albumId, trackCount: tracks?.length });
        setExpandedAlbums(prev => ({ ...prev, [albumId]: tracks || [] }));
      } catch (err) {
        console.error('Failed to load tracks:', err);
        showToast('Failed to load album tracks. Please try again.', 'error');
        setExpandedAlbums(prev => ({ ...prev, [albumId]: null }));
      } finally {
        setLoadingAlbumTracks(prev => ({ ...prev, [albumId]: false }));
      }
    }
  };

  // Request album - opens confirmation modal
  const handleRequest = (item) => {
    if (!kidProfile) return;
    setRequestNote('');
    setRequestConfirmModal({ type: 'album', item });
  };

  // Request individual song - opens confirmation modal
  const handleSongRequest = (song, albumName = null) => {
    if (!kidProfile) return;
    setRequestNote('');
    setRequestConfirmModal({ type: 'song', item: song, albumName });
  };

  // Submit the request (called from confirmation modal)
  const handleSubmitRequest = async () => {
    if (!kidProfile || !requestConfirmModal) return;

    setIsSubmittingRequest(true);

    try {
      if (requestConfirmModal.type === 'album') {
        const item = requestConfirmModal.item;
        const albumId = String(item.id);

        const itemData = {
          kidProfileId: kidProfile._id,
          userId: kidProfile.userId,
          appleAlbumId: albumId,
          albumName: item.attributes?.name || 'Unknown',
          artistName: item.attributes?.artistName || 'Unknown',
          artworkUrl: item.attributes?.artwork?.url || null,
          kidNote: requestNote.trim() || undefined,
        };

        await createAlbumRequest(itemData);
        setRequestSuccess(albumId);
      } else {
        // Song request
        const song = requestConfirmModal.item;
        const songId = String(song.id);

        const songData = {
          kidProfileId: kidProfile._id,
          userId: kidProfile.userId,
          appleSongId: songId,
          songName: song.attributes?.name || 'Unknown',
          artistName: song.attributes?.artistName || 'Unknown',
          albumName: requestConfirmModal.albumName || song.attributes?.albumName || null,
          artworkUrl: song.attributes?.artwork?.url || null,
          kidNote: requestNote.trim() || undefined,
        };

        await createSongRequest(songData);
        setRequestSuccess(songId);
      }

      // Close modal and reset
      setRequestConfirmModal(null);
      setRequestNote('');
      setTimeout(() => setRequestSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to create request:', err);
      showToast('Failed to send request. Please try again.', 'error');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Check if item is already approved
  const isAlbumApproved = (appleAlbumId) => {
    const idStr = String(appleAlbumId);
    return approvedAlbums?.some(a => a.appleAlbumId === idStr);
  };

  const isSongApproved = (appleSongId) => {
    const idStr = String(appleSongId);
    return approvedSongs?.some(s => s.appleSongId === idStr);
  };

  // Check if item has been requested (pending approval)
  const isAlbumRequested = (appleAlbumId) => {
    const idStr = String(appleAlbumId);
    return albumRequests?.some(r => r.appleAlbumId === idStr && r.status === 'pending') || false;
  };

  const isSongRequested = (appleSongId) => {
    const idStr = String(appleSongId);
    return songRequests?.some(r => r.appleSongId === idStr && r.status === 'pending') || false;
  };

  // Playlist handlers
  const handleCreatePlaylist = async () => {
    if (!playlistName.trim() || !kidProfile) return;

    try {
      await createPlaylistMutation({
        kidProfileId: kidProfile._id,
        userId: kidProfile.userId,
        name: playlistName.trim(),
        description: playlistDescription.trim() || undefined,
      });

      setPlaylistName('');
      setPlaylistDescription('');
      setShowCreatePlaylist(false);
    } catch (err) {
      console.error('Failed to create playlist:', err);
      showToast('Failed to create playlist', 'error');
    }
  };

  const handleAddSongToPlaylist = async (playlistId) => {
    if (!selectedSongForPlaylist) return;

    try {
      await addSongToPlaylistMutation({
        playlistId,
        song: {
          appleSongId: selectedSongForPlaylist.appleSongId || selectedSongForPlaylist.id,
          songName: selectedSongForPlaylist.songName || selectedSongForPlaylist.attributes?.name,
          artistName: selectedSongForPlaylist.artistName || selectedSongForPlaylist.attributes?.artistName,
          albumName: selectedSongForPlaylist.albumName || selectedSongForPlaylist.attributes?.albumName,
          artworkUrl: selectedSongForPlaylist.artworkUrl || selectedSongForPlaylist.attributes?.artwork?.url,
          durationInMillis: selectedSongForPlaylist.durationInMillis || selectedSongForPlaylist.attributes?.durationInMillis,
        },
      });

      setShowAddToPlaylist(false);
      setSelectedSongForPlaylist(null);
    } catch (err) {
      console.error('Failed to add song to playlist:', err);
      showToast('Failed to add song', 'error');
    }
  };

  const handleAddAlbumToPlaylist = async (playlistId) => {
    if (!selectedAlbumForPlaylist) return;

    try {
      // Get album tracks first
      const albumId = selectedAlbumForPlaylist.appleAlbumId || selectedAlbumForPlaylist.id;
      const tracks = await musicKitService.getAlbumTracks(albumId);

      if (tracks.length === 0) {
        showToast('No tracks found in this album', 'warning');
        return;
      }

      // Convert tracks to song format
      const songs = tracks.map(track => ({
        appleSongId: track.id,
        songName: track.attributes?.name || 'Unknown',
        artistName: track.attributes?.artistName || selectedAlbumForPlaylist.artistName,
        albumName: selectedAlbumForPlaylist.albumName || selectedAlbumForPlaylist.attributes?.name,
        artworkUrl: selectedAlbumForPlaylist.artworkUrl || selectedAlbumForPlaylist.attributes?.artwork?.url,
        durationInMillis: track.attributes?.durationInMillis,
      }));

      const addedCount = await addSongsToPlaylistMutation({
        playlistId,
        songs,
      });

      setShowAddToPlaylist(false);
      setSelectedAlbumForPlaylist(null);
      showToast(`Added ${addedCount} songs to playlist`, 'success');
    } catch (err) {
      console.error('Failed to add album to playlist:', err);
      showToast('Failed to add album', 'error');
    }
  };

  const handleDeletePlaylist = async (playlistId) => {
    if (!confirm('Delete this playlist?')) return;

    try {
      await deletePlaylistMutation({ playlistId });
      setSelectedPlaylistView(null);
    } catch (err) {
      console.error('Failed to delete playlist:', err);
      showToast('Failed to delete playlist', 'error');
    }
  };

  const handleRemoveSongFromPlaylist = async (playlistId, appleSongId) => {
    try {
      await removeSongFromPlaylistMutation({ playlistId, appleSongId });
      // Update local selectedPlaylistView state to reflect the change immediately
      if (selectedPlaylistView && selectedPlaylistView._id === playlistId) {
        setSelectedPlaylistView(prev => ({
          ...prev,
          songs: prev.songs.filter(s => s.appleSongId !== appleSongId)
        }));
      }
      showToast('Song removed from playlist', 'success');
    } catch (err) {
      console.error('Failed to remove song:', err);
      showToast('Failed to remove song', 'error');
    }
  };

  const confirmRemoveSongFromPlaylist = (playlistId, song) => {
    setSongToRemoveFromPlaylist({ playlistId, song });
  };

  const executeRemoveSongFromPlaylist = async () => {
    if (!songToRemoveFromPlaylist) return;
    await handleRemoveSongFromPlaylist(
      songToRemoveFromPlaylist.playlistId,
      songToRemoveFromPlaylist.song.appleSongId
    );
    setSongToRemoveFromPlaylist(null);
  };

  const handlePlayPlaylist = async (playlist) => {
    // Check time limit before playing
    if (!checkCanPlay()) return;

    if (!playlist.songs || playlist.songs.length === 0) {
      showToast('This playlist is empty', 'warning');
      return;
    }

    try {
      // SECURITY: All songs in playlists should already be approved,
      // but we use playApprovedSongs for consistency and safety
      const tracks = playlist.songs.map(song => ({
        id: song.appleSongId,
        attributes: {
          name: song.songName,
          artistName: song.artistName,
          playParams: {
            id: song.appleSongId
          }
        }
      }));

      await musicKitService.playApprovedSongs(tracks);

      // Track recently played
      if (kidProfile) {
        const artworkUrl = playlist.songs[0]?.artworkUrl;
        await addRecentlyPlayedMutation({
          kidProfileId: kidProfile._id,
          userId: kidProfile.userId,
          itemType: 'playlist',
          itemId: playlist._id || String(playlist.id),
          itemName: playlist.name,
          artistName: `${playlist.songs.length} songs`,
          artworkUrl: artworkUrl ? artworkUrl.replace('{w}', '300').replace('{h}', '300') : undefined,
        });
      }
    } catch (err) {
      console.error('Failed to play playlist:', err);
      showToast('Unable to play playlist. Please make sure you have an active Apple Music subscription.', 'error');
    }
  };

  // Filter library content based on search and sort alphabetically
  const filteredAlbums = (approvedAlbums?.filter(album => {
    if (librarySearchQuery === '') return true;

    const query = librarySearchQuery.toLowerCase();

    // Search album name, artist, genres
    if (album.albumName.toLowerCase().includes(query)) return true;
    if (album.artistName.toLowerCase().includes(query)) return true;
    if (album.genres && album.genres.some(g => g.toLowerCase().includes(query))) return true;

    // Search song names within this album
    if (album.approvedSongs && Array.isArray(album.approvedSongs)) {
      return album.approvedSongs.some(song =>
        song.songName.toLowerCase().includes(query) ||
        song.artistName.toLowerCase().includes(query)
      );
    }

    return false;
  }) || []).sort((a, b) => a.albumName.localeCompare(b.albumName));

  // Filter songs (individually approved songs - used in "New Songs" section on home tab)
  const filteredSongs = (approvedSongs?.filter(song =>
    librarySearchQuery === '' ||
    song.songName.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
    song.artistName.toLowerCase().includes(librarySearchQuery.toLowerCase())
  ) || []).sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0));

  // Create list of ALL songs (from all albums + standalone songs)
  // Now includes songs from full albums since tracks are stored in the database
  const allLibrarySongs = useMemo(() => {
    const songsMap = new Map();

    // Add songs from ALL albums (both full and partial)
    approvedAlbums?.forEach(album => {
      if (album.approvedSongs && Array.isArray(album.approvedSongs)) {
        album.approvedSongs.forEach(song => {
          const songId = song.appleSongId;
          if (songId && !songsMap.has(songId)) {
            songsMap.set(songId, {
              ...song,
              _id: `${album.appleAlbumId}-${songId}`,
              artworkUrl: album.artworkUrl,
              hideArtwork: album.hideArtwork,
              albumName: album.albumName,
            });
          }
        });
      }
    });

    // Add standalone individually approved songs
    approvedSongs?.forEach(song => {
      const songId = song.appleSongId || song._id;
      if (!songsMap.has(songId)) {
        songsMap.set(songId, song);
      }
    });

    return Array.from(songsMap.values());
  }, [approvedAlbums, approvedSongs]);

  // Filter all library songs based on search
  const filteredLibrarySongs = allLibrarySongs.filter(song =>
    librarySearchQuery === '' ||
    song.songName.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
    song.artistName.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
    (song.albumName && song.albumName.toLowerCase().includes(librarySearchQuery.toLowerCase()))
  ).sort((a, b) => a.songName.localeCompare(b.songName));

  // Group albums by artist
  const artistsMap = new Map();
  filteredAlbums.forEach(album => {
    if (!artistsMap.has(album.artistName)) {
      artistsMap.set(album.artistName, []);
    }
    artistsMap.get(album.artistName).push(album);
  });
  const artists = Array.from(artistsMap.entries())
    .map(([name, albums]) => ({ name, albums, count: albums.length }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Group albums by genre (use only primary/first genre)
  const genresMap = new Map();
  const genericGenres = ['Music']; // Filter out overly generic genres

  filteredAlbums.forEach(album => {
    if (album.genres && Array.isArray(album.genres) && album.genres.length > 0) {
      // Find the first non-generic genre (primary genre)
      const primaryGenre = album.genres.find(g => !genericGenres.includes(g));

      if (primaryGenre) {
        if (!genresMap.has(primaryGenre)) {
          genresMap.set(primaryGenre, []);
        }
        genresMap.get(primaryGenre).push(album);
      }
    }
  });
  const genres = Array.from(genresMap.entries())
    .map(([name, albums]) => ({ name, albums, count: albums.length }))
    .sort((a, b) => b.count - a.count); // Sort by most albums

  // Create unified search results (Apple Music style) - flat list when searching
  const unifiedSearchResults = useMemo(() => {
    if (!librarySearchQuery) return [];

    const results = [];

    // Add matching songs (highest priority)
    filteredLibrarySongs.forEach(song => {
      results.push({
        type: 'song',
        id: song._id || song.appleSongId,
        name: song.songName,
        subtitle: song.artistName,
        albumName: song.albumName,
        artworkUrl: song.artworkUrl,
        hideArtwork: song.hideArtwork,
        data: song
      });
    });

    // Add matching artists
    artists.forEach(artist => {
      results.push({
        type: 'artist',
        id: artist.name,
        name: artist.name,
        subtitle: `${artist.count} ${artist.count === 1 ? 'album' : 'albums'}`,
        artworkUrl: artist.albums[0]?.artworkUrl, // Use first album's artwork
        data: artist
      });
    });

    // Add matching albums
    filteredAlbums.forEach((album, index) => {
      results.push({
        type: 'album',
        id: album._id || album.appleAlbumId || `album-${album.albumName}-${index}`,
        name: album.albumName,
        subtitle: album.artistName,
        artworkUrl: album.artworkUrl,
        hideArtwork: album.hideArtwork,
        data: album
      });
    });

    // Add matching genres
    genres.forEach(genre => {
      results.push({
        type: 'genre',
        id: genre.name,
        name: genre.name,
        subtitle: `${genre.count} ${genre.count === 1 ? 'album' : 'albums'}`,
        artworkUrl: genre.albums[0]?.artworkUrl, // Use first album's artwork
        data: genre
      });
    });

    return results;
  }, [librarySearchQuery, filteredLibrarySongs, artists, filteredAlbums, genres]);

  if (!kidProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 pb-16 md:pb-32">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-40 border-b-2 border-purple-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${getColorClass(kidProfile.color)} flex items-center justify-center text-white p-2 shadow-lg`}>
                {getAvatarIcon(kidProfile.avatar)}
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{kidProfile.name}'s Music</h1>
                <p className="text-xs text-purple-600 font-medium">SafeTunes Player</p>
              </div>
              <h1 className="sm:hidden text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{kidProfile.name}</h1>
            </div>

            {/* Time Remaining Badge (when time limit is enabled) */}
            {timeLimitSettings?.isEnabled && timeLimitSettings?.remainingMinutes !== null && (
              <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                timeLimitSettings.remainingMinutes <= 5
                  ? 'bg-red-100 text-red-700'
                  : timeLimitSettings.remainingMinutes <= 15
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatTimeRemaining(timeLimitSettings.remainingMinutes)} left</span>
              </div>
            )}

            {/* Mobile Controls */}
            <div className="md:hidden flex items-center gap-2">
              {/* Time remaining on mobile */}
              {timeLimitSettings?.isEnabled && timeLimitSettings?.remainingMinutes !== null && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                  timeLimitSettings.remainingMinutes <= 5
                    ? 'bg-red-100 text-red-700'
                    : timeLimitSettings.remainingMinutes <= 15
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatTimeRemaining(timeLimitSettings.remainingMinutes)}</span>
                </div>
              )}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2.5 text-gray-700 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 bg-gray-100 rounded-xl transition-all shadow-md"
                title="Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:block">
            <nav className="flex gap-2 -mb-px">
              <button
                onClick={() => setActiveTab('home')}
                className={`py-3 px-6 border-b-3 font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 rounded-t-xl ${
                  activeTab === 'home'
                    ? 'border-purple-600 bg-gradient-to-t from-purple-50 to-transparent text-purple-700'
                    : 'border-transparent text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Home</span>
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className={`py-3 px-6 border-b-3 font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 rounded-t-xl ${
                  activeTab === 'library'
                    ? 'border-blue-600 bg-gradient-to-t from-blue-50 to-transparent text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span>Library</span>
              </button>
              <button
                onClick={() => setActiveTab('discover')}
                className={`py-3 px-6 border-b-3 font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 rounded-t-xl ${
                  activeTab === 'discover'
                    ? 'border-pink-600 bg-gradient-to-t from-pink-50 to-transparent text-pink-700'
                    : 'border-transparent text-gray-600 hover:text-pink-600 hover:bg-pink-50/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Discover</span>
              </button>
              <button
                onClick={() => setActiveTab('playlists')}
                className={`py-3 px-6 border-b-3 font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 rounded-t-xl ${
                  activeTab === 'playlists'
                    ? 'border-green-600 bg-gradient-to-t from-green-50 to-transparent text-green-700'
                    : 'border-transparent text-gray-600 hover:text-green-600 hover:bg-green-50/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span>Playlists</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('requests');
                  if (unviewedCount > 0 && kidProfile) {
                    markAllRequestsAsViewed({ kidProfileId: kidProfile._id });
                  }
                }}
                className={`py-3 px-6 border-b-3 font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 relative rounded-t-xl ${
                  activeTab === 'requests'
                    ? 'border-orange-600 bg-gradient-to-t from-orange-50 to-transparent text-orange-700'
                    : 'border-transparent text-gray-600 hover:text-orange-600 hover:bg-orange-50/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Requests</span>
                {unviewedCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-br from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
                    {unviewedCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-3 px-6 border-b-3 font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 rounded-t-xl ${
                  activeTab === 'settings'
                    ? 'border-gray-600 bg-gradient-to-t from-gray-50 to-transparent text-gray-700'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Dropdown Menu */}
      {showMobileMenu && (
        <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}>
          <div className="absolute top-16 right-4 bg-white rounded-lg shadow-xl py-2 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setActiveTab('settings');
                setShowMobileMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 transition flex items-center gap-3 text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 pb-32 md:pb-6">

        {/* Apple Music Authorization - Kids need their own Apple Music via Family Sharing */}
        <AppleMusicAuth showOnlyWhenDisconnected={true} />

        {/* Old MusicPlayer removed - now using new MiniPlayer/FullScreenPlayer at bottom of file */}

        {/* Library Search Bar removed - now part of Library tab header */}

        {/* Old search tab removed - now part of Requests tab */}
        {false && activeTab === 'search' && (
          <div className="space-y-6">
            {/* Helpful Message */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-1">Request New Music</h3>
                  <p className="text-sm text-purple-800">
                    Search for new albums and songs to request. Your parent will review and approve them for you to listen to.
                  </p>
                </div>
              </div>
            </div>

            {/* Request Search Bar */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <form onSubmit={handleAppleMusicSearch}>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search Apple Music..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent text-base"
                  />
                  {searchQuery && !isSearching && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Blocked Search Message with Bible Verse */}
            {blockedMessage && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-red-900 text-base sm:text-lg mb-1">Content Blocked</h3>
                      <p className="text-sm sm:text-base text-red-800">{blockedMessage.message}</p>
                    </div>
                  </div>

                  {/* Bible Verse Card */}
                  <div className="bg-white border border-red-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900">God's Word says:</p>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 italic mb-2 leading-relaxed">
                      "{blockedMessage.verse.verse}"
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-purple-700">— {blockedMessage.verse.reference}</p>
                  </div>

                  {/* Dismiss Button */}
                  <button
                    onClick={() => setBlockedMessage(null)}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Mixed Search Results - Albums and Songs */}
            {searchResults.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {searchResults
                  .filter(item => !item.attributes?.contentRating || item.attributes?.contentRating !== 'explicit')
                  .map((item) => {
                    const isAlbum = item.itemType === 'album';
                    const isExpanded = expandedAlbums[item.id];
                    const alreadyApproved = isAlbum ? isAlbumApproved(item.id) : isSongApproved(item.id);
                    const alreadyRequested = isAlbum ? isAlbumRequested(item.id) : isSongRequested(item.id);
                    const justRequested = requestSuccess === String(item.id);

                    return (
                      <div key={item.id} className="border-b border-gray-100 last:border-b-0">
                        {/* Main Item Row */}
                        <div className="flex items-center gap-3 p-4 hover:bg-gray-50 transition">
                          {/* Icon */}
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm text-gray-900 truncate">
                                {item.attributes?.name}
                              </h3>
                              {isAlbum ? (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex-shrink-0 font-medium">
                                  Album
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex-shrink-0 font-medium">
                                  Song
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 truncate">{item.attributes?.artistName}</p>
                            {!isAlbum && item.attributes?.albumName && (
                              <p className="text-xs text-gray-500 truncate">{item.attributes?.albumName}</p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isAlbum && (
                              <button
                                onClick={() => handleToggleAlbumExpansion(item.id)}
                                className="p-2 hover:bg-gray-200 rounded-full transition"
                                title={isExpanded ? "Collapse" : "View tracks"}
                              >
                                <svg
                                  className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}

                            {alreadyApproved ? (
                              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center" title="Already approved">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : (alreadyRequested || justRequested) ? (
                              <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center" title="Request pending">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            ) : (
                              <button
                                onClick={() => isAlbum ? handleRequest(item) : handleSongRequest(item)}
                                className="w-8 h-8 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center transition"
                                title={`Request ${isAlbum ? 'album' : 'song'}`}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Loading Tracks */}
                        {isAlbum && loadingAlbumTracks[item.id] && (
                          <div className="bg-gray-50 border-t border-gray-200 px-4 py-6 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                            <span className="ml-3 text-sm text-gray-500">Loading tracks...</span>
                          </div>
                        )}

                        {/* Expanded Album Tracks */}
                        {isAlbum && !loadingAlbumTracks[item.id] && Array.isArray(expandedAlbums[item.id]) && expandedAlbums[item.id].length > 0 && (
                          <div className="bg-gray-50 border-t border-gray-200">
                            <div className="px-4 py-3">
                              <h4 className="text-xs font-semibold text-gray-700 mb-2">Tracks ({expandedAlbums[item.id].length}):</h4>
                              <div className="space-y-1">
                                {expandedAlbums[item.id].map((track, index) => {
                                  // Check individual track status (not album)
                                  const trackApproved = isSongApproved(track.id);
                                  const trackAlreadyRequested = isSongRequested(track.id);
                                  const trackJustRequested = requestSuccess === String(track.id);

                                  return (
                                    <div key={track.id} className="flex items-center gap-3 py-2 px-2 hover:bg-white rounded-lg transition">
                                      <span className="text-xs text-gray-500 w-6 text-center flex-shrink-0">
                                        {index + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 truncate">{track.attributes?.name}</p>
                                      </div>
                                      {trackApproved ? (
                                        <div className="w-7 h-7 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0" title="Song approved">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </div>
                                      ) : (trackAlreadyRequested || trackJustRequested) ? (
                                        <div className="w-7 h-7 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0" title="Song requested">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => handleSongRequest(track, item.attributes?.name)}
                                          className="w-7 h-7 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center transition flex-shrink-0"
                                          title="Request this song"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* No Results */}
            {!isSearching && searchResults.length === 0 && searchQuery && (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>No results found. Try a different search.</p>
              </div>
            )}
          </div>
        )}

        {/* Library Content */}
        {activeTab !== 'search' && (
          <>
            {!approvedAlbums || !approvedSongs ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your music...</p>
              </div>
            ) : ((activeTab === 'home' || activeTab === 'library') && filteredAlbums.length === 0) ? (
              <div className="text-center py-16 px-4">
                <div className="relative inline-block mb-6">
                  <div className="text-8xl animate-bounce">🎵</div>
                  <div className="absolute -top-2 -right-2 text-4xl animate-pulse">✨</div>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent mb-3">
                  {librarySearchQuery ? 'No results found' : 'Your music library is waiting!'}
                </h2>
                <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
                  {librarySearchQuery ? 'Try searching for something else' : 'Ask your parent to approve some awesome tunes and start vibing! 🎧'}
                </p>
                {!librarySearchQuery && (
                  <button
                    onClick={() => setActiveTab('search')}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95"
                  >
                    🔍 Request Music
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Home Tab - New Native-style Design */}
                {activeTab === 'home' && !showSeeAllRecentlyPlayed && !showSeeAllOnRepeat && (
                  <HomeTab
                    userName={kidProfile?.name?.split(' ')[0] || 'Friend'}
                    recentlyPlayed={recentlyPlayedData || []}
                    freshlyApproved={
                      // Only show albums approved in the last 3 days
                      filteredAlbums?.filter(album => {
                        const threeDaysAgo = Date.now() - (3 * 24 * 60 * 60 * 1000);
                        return album.approvedAt && album.approvedAt > threeDaysAgo;
                      }).slice(0, 8) || []
                    }
                    onRepeat={onRepeatData?.slice(0, 6) || []}
                    onPlayItem={(item) => {
                      // Recently played items have itemType and itemId
                      if (item.itemType) {
                        handlePlayRecentlyPlayed(item);
                      } else if (item.appleSongId) {
                        handlePlaySong(item);
                      } else if (item.appleAlbumId) {
                        handlePlayAlbum(item);
                      } else {
                        // Fallback - try to play as recently played
                        handlePlayRecentlyPlayed(item);
                      }
                    }}
                    onViewAlbum={(album) => handleViewTracks(album)}
                    onSeeAllRecent={() => setShowSeeAllRecentlyPlayed(true)}
                    onSeeAllNew={() => setActiveTab('library')}
                    onSeeAllOnRepeat={() => setShowSeeAllOnRepeat(true)}
                    shouldHideArtwork={(item) => {
                      if (item.hideArtwork) return true;
                      if (item.itemType === 'song') return shouldHideSongArtwork(item.itemId);
                      if (item.itemType === 'album') return shouldHideAlbumArtwork(item.itemId);
                      return shouldHideRecentlyPlayedArtwork(item);
                    }}
                  />
                )}

                {/* See All Recently Played - Shows last 50 played songs */}
                {activeTab === 'home' && showSeeAllRecentlyPlayed && (
                  <div className="min-h-screen bg-white">
                    {/* Header with back button */}
                    <div className="px-4 pt-6 pb-4">
                      <button
                        onClick={() => setShowSeeAllRecentlyPlayed(false)}
                        className="flex items-center gap-2 text-purple-600 font-medium mb-3"
                      >
                        <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Back to Home
                      </button>
                      <h1 className="text-2xl font-bold text-gray-900">Recently Played</h1>
                      <p className="text-gray-500 text-sm mt-1">Your listening history</p>
                    </div>

                    {/* Songs List */}
                    <div className="px-4 pb-32">
                      {recentlyPlayedData && recentlyPlayedData.length > 0 ? (
                        <div className="space-y-1">
                          {recentlyPlayedData.slice(0, 50).map((item, index) => {
                            const artworkUrl = item.artworkUrl?.replace('{w}', '100').replace('{h}', '100');
                            const hideArtwork = item.hideArtwork ||
                              (item.itemType === 'song' ? shouldHideSongArtwork(item.itemId) :
                               item.itemType === 'album' ? shouldHideAlbumArtwork(item.itemId) :
                               shouldHideRecentlyPlayedArtwork(item));

                            return (
                              <button
                                key={item._id || item.itemId || `recent-${index}`}
                                onClick={() => {
                                  if (item.itemType === 'song' || item.appleSongId) {
                                    handlePlaySong(item);
                                  } else if (item.appleAlbumId || item._id) {
                                    handlePlayAlbum(item);
                                  } else {
                                    handlePlayRecentlyPlayed(item);
                                  }
                                }}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors active:bg-gray-100"
                              >
                                {/* Artwork */}
                                <div className="relative w-12 h-12 flex-shrink-0">
                                  {hideArtwork || !artworkUrl ? (
                                    <HiddenArtworkPlaceholder size="md" />
                                  ) : (
                                    <img
                                      src={artworkUrl}
                                      alt={item.itemName || item.name || item.albumName}
                                      className="w-full h-full rounded-lg object-cover"
                                    />
                                  )}
                                </div>

                                {/* Song Info */}
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-medium text-gray-900 truncate">
                                    {item.itemName || item.name || item.albumName}
                                  </p>
                                  <p className="text-sm text-gray-500 truncate">
                                    {item.artistName}
                                  </p>
                                </div>

                                {/* Play indicator */}
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                  </svg>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">No listening history yet</h3>
                          <p className="text-gray-500 text-sm max-w-xs">
                            Start playing some music to see your history here!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* See All On Repeat - Shows most played songs sorted by play count */}
                {activeTab === 'home' && showSeeAllOnRepeat && (
                  <div className="min-h-screen bg-white">
                    {/* Header with back button */}
                    <div className="px-4 pt-6 pb-4">
                      <button
                        onClick={() => setShowSeeAllOnRepeat(false)}
                        className="flex items-center gap-2 text-purple-600 font-medium mb-3"
                      >
                        <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Back to Home
                      </button>
                      <h1 className="text-2xl font-bold text-gray-900">On Repeat</h1>
                      <p className="text-gray-500 text-sm mt-1">Your most played songs</p>
                    </div>

                    {/* Songs List */}
                    <div className="px-4 pb-32">
                      {onRepeatData && onRepeatData.length > 0 ? (
                        <div className="space-y-1">
                          {onRepeatData.slice(0, 50).map((item, index) => {
                            const artworkUrl = item.artworkUrl?.replace('{w}', '100').replace('{h}', '100');
                            const hideArtwork = item.hideArtwork ||
                              (item.itemType === 'song' ? shouldHideSongArtwork(item.itemId) :
                               item.itemType === 'album' ? shouldHideAlbumArtwork(item.itemId) :
                               shouldHideRecentlyPlayedArtwork(item));

                            return (
                              <button
                                key={item._id || item.itemId || `repeat-${index}`}
                                onClick={() => {
                                  if (item.itemType === 'song' || item.appleSongId) {
                                    handlePlaySong(item);
                                  } else if (item.appleAlbumId || item._id) {
                                    handlePlayAlbum(item);
                                  } else {
                                    handlePlayRecentlyPlayed(item);
                                  }
                                }}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors active:bg-gray-100"
                              >
                                {/* Rank Number */}
                                <div className="w-6 text-center flex-shrink-0">
                                  <span className="text-sm font-bold text-gray-400">{index + 1}</span>
                                </div>

                                {/* Artwork */}
                                <div className="relative w-12 h-12 flex-shrink-0">
                                  {hideArtwork || !artworkUrl ? (
                                    <HiddenArtworkPlaceholder size="md" />
                                  ) : (
                                    <img
                                      src={artworkUrl}
                                      alt={item.itemName || item.name || item.albumName}
                                      className="w-full h-full rounded-lg object-cover"
                                    />
                                  )}
                                </div>

                                {/* Song Info */}
                                <div className="flex-1 min-w-0 text-left">
                                  <p className="font-medium text-gray-900 truncate">
                                    {item.itemName || item.name || item.albumName}
                                  </p>
                                  <p className="text-sm text-gray-500 truncate">
                                    {item.artistName}
                                  </p>
                                </div>

                                {/* Play Count Badge */}
                                <div className="flex-shrink-0 px-2 py-1 bg-purple-100 rounded-full">
                                  <span className="text-xs font-semibold text-purple-700">
                                    {item.playCount || 1}×
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
                            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">No favorites yet</h3>
                          <p className="text-gray-500 text-sm max-w-xs">
                            Keep listening! Songs you play multiple times will appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Old Home Tab content preserved but disabled */}
                {false && activeTab === 'home-old' && (
                  <div className="space-y-8">
                    {/* Recently Added Albums - preserved for reference */}
                    {filteredAlbums.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                          <span className="text-2xl">✨</span>
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                            Fresh Drops
                          </h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                          {filteredAlbums.slice(0, 4).map((album, index) => (
                            <div
                              key={album._id || `album-${index}`}
                              onClick={() => handleViewTracks(album)}
                              className="group bg-white rounded-2xl p-4 hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer"
                            >
                              <div className="relative mb-3">
                                {album.hideArtwork ? (
                                  <div className="w-full aspect-square bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-md">
                                    <SafeTunesLogo className="w-16 h-16 text-white/70" />
                                  </div>
                                ) : (
                                  <img
                                    src={album.artworkUrl?.replace('{w}', '300').replace('{h}', '300') || '/placeholder-album.png'}
                                    alt={album.albumName}
                                    className="w-full aspect-square object-cover rounded-xl shadow-md group-hover:shadow-xl transition-shadow"
                                  />
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayAlbum(album);
                                  }}
                                  className="absolute bottom-2 right-2 w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 group-hover:scale-110"
                                >
                                  <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                  </svg>
                                </button>
                              </div>
                              <h3 className="font-bold text-sm text-gray-900 truncate mb-1">{album.albumName}</h3>
                              <p className="text-xs text-gray-600 truncate">{album.artistName}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recently Added Songs */}
                    {filteredSongs.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                          <span className="text-2xl">🎵</span>
                          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-orange-600 bg-clip-text text-transparent">
                            Hot Tracks
                          </h2>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                          {filteredSongs.slice(0, 4).map((song, index) => {
                            const isCurrentlyPlaying = playerState.currentTrack?.id === song.appleSongId;
                            return (
                              <button
                                key={song._id || `song-${index}`}
                                onClick={() => handlePlaySong(song)}
                                className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 active:bg-gray-100 transition text-left ${
                                  index !== Math.min(filteredSongs.length, 4) - 1 ? 'border-b border-gray-100' : ''
                                } ${isCurrentlyPlaying ? 'bg-purple-50' : ''}`}
                              >
                                <span className={`w-6 text-center text-sm font-medium flex-shrink-0 ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-400'}`}>
                                  {isCurrentlyPlaying ? (
                                    <span className="flex items-center justify-center gap-0.5">
                                      <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '8px' }}></span>
                                      <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '12px', animationDelay: '0.1s' }}></span>
                                      <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '6px', animationDelay: '0.2s' }}></span>
                                    </span>
                                  ) : (
                                    index + 1
                                  )}
                                </span>
                                {song.hideArtwork || !song.artworkUrl ? (
                                  <div className="w-12 h-12 bg-gradient-to-br from-pink-400 via-purple-400 to-orange-400 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                    </svg>
                                  </div>
                                ) : (
                                  <img
                                    src={song.artworkUrl?.replace('{w}', '80').replace('{h}', '80')}
                                    alt={song.songName}
                                    className="w-12 h-12 rounded-lg flex-shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className={`font-medium truncate ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-900'}`}>{song.songName}</h3>
                                  <p className={`text-sm truncate ${isCurrentlyPlaying ? 'text-purple-500' : 'text-gray-500'}`}>{song.artistName}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Library Tab - iOS-style with pill tabs */}
                {activeTab === 'library' && (
                  <div className="space-y-4">
                    {/* Library Header - only show when NOT in drill-down view */}
                    {libraryView === 'home' && (
                      <>
                        {/* Page Title */}
                        <h1 className="text-2xl font-bold text-gray-900">
                          {librarySearchQuery ? 'Search Results' : 'Library'}
                        </h1>

                        {/* Library Search */}
                        <div className="relative">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search your library..."
                            value={librarySearchQuery}
                            onChange={(e) => setLibrarySearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                          />
                          {librarySearchQuery && (
                            <button
                              onClick={() => setLibrarySearchQuery('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Library Tabs - iOS style pill tabs (hide when searching) */}
                        {!librarySearchQuery && (
                          <LibraryTabs
                            tabs={['Playlists', 'Artists', 'Albums', 'Songs', 'Genres']}
                            selected={libraryTab}
                            onChange={setLibraryTab}
                          />
                        )}
                      </>
                    )}

                    {/* Unified Search Results (Apple Music style) */}
                    {librarySearchQuery && unifiedSearchResults.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                          <span className="text-2xl">🔍</span>
                          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {unifiedSearchResults.length} {unifiedSearchResults.length === 1 ? 'Result' : 'Results'}
                          </h2>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                          {unifiedSearchResults.map((result, index) => (
                            <div
                              key={`${result.type}-${result.id}`}
                              onClick={() => {
                                if (result.type === 'song') {
                                  handlePlaySong(result.data);
                                } else if (result.type === 'artist') {
                                  setSelectedArtist(result.data);
                                  setLibraryView('artist');
                                  setLibrarySearchQuery(''); // Clear search when navigating
                                } else if (result.type === 'album') {
                                  handleViewTracks(result.data);
                                } else if (result.type === 'genre') {
                                  setSelectedGenre(result.data);
                                  setLibraryView('genre');
                                  setLibrarySearchQuery(''); // Clear search when navigating
                                }
                              }}
                              className={`flex items-center gap-4 p-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all cursor-pointer ${
                                index !== unifiedSearchResults.length - 1 ? 'border-b border-gray-100' : ''
                              }`}
                            >
                              {/* Artwork/Icon */}
                              <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-md">
                                {result.artworkUrl && !result.hideArtwork ? (
                                  <img
                                    src={result.artworkUrl.replace('{w}', '100').replace('{h}', '100')}
                                    alt={result.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <svg className="w-6 h-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                    {result.type === 'song' && (
                                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                    )}
                                    {result.type === 'album' && (
                                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                    )}
                                    {result.type === 'artist' && (
                                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    )}
                                    {result.type === 'genre' && (
                                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
                                    )}
                                  </svg>
                                )}
                              </div>

                              {/* Text Content */}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 truncate">{result.name}</p>
                                <p className="text-sm text-gray-600 truncate">{result.subtitle}</p>
                                {result.albumName && (
                                  <p className="text-xs text-gray-500 truncate">{result.albumName}</p>
                                )}
                              </div>

                              {/* Type Badge & Action */}
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-xs font-bold text-purple-500 uppercase tracking-wide bg-purple-100 px-2 py-1 rounded-lg">
                                  {result.type}
                                </span>
                                {result.type === 'song' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePlaySong(result.data);
                                    }}
                                    className="p-2.5 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full transition-all shadow-lg hover:shadow-xl active:scale-95"
                                  >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                    </svg>
                                  </button>
                                ) : (
                                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Results Message */}
                    {librarySearchQuery && unifiedSearchResults.length === 0 && (
                      <div className="text-center py-12 px-4">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">No Results Found</h3>
                        <p className="text-gray-600">
                          Try searching for a different song, artist, album, or genre
                        </p>
                      </div>
                    )}

                    {/* Tab-based Library Content (only show when NOT searching) */}
                    {!librarySearchQuery && libraryView === 'home' && (
                      <div className="space-y-4">
                        {/* Playlists Tab */}
                        {libraryTab === 'Playlists' && (
                          <>
                            {playlists && playlists.length > 0 ? (
                              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                {playlists.map((playlist, index) => (
                                  <div
                                    key={playlist._id}
                                    onClick={() => {
                                      setSelectedPlaylistView(playlist);
                                      setActiveTab('playlists');
                                    }}
                                    className={`flex items-center gap-4 p-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all cursor-pointer ${
                                      index !== playlists.length - 1 ? 'border-b border-gray-100' : ''
                                    }`}
                                  >
                                    {/* Playlist Artwork */}
                                    {playlist.songs && playlist.songs.length > 0 && playlist.songs[0].artworkUrl && !shouldHidePlaylistArtwork(playlist) ? (
                                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                                        <img
                                          src={playlist.songs[0].artworkUrl.replace('{w}', '100').replace('{h}', '100')}
                                          alt={playlist.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-14 h-14 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                                        <SafeTunesLogo className="w-8 h-8 text-white/70" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-gray-900 truncate">{playlist.name}</p>
                                      <p className="text-sm text-gray-600">{playlist.songs?.length || 0} songs</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePlayPlaylist(playlist);
                                        }}
                                        className="p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full transition-all shadow-lg active:scale-95"
                                      >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                        </svg>
                                      </button>
                                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <EmptyState
                                icon={<svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" /></svg>}
                                title="No playlists yet"
                                subtitle="Create your first playlist to organize your music"
                              />
                            )}
                          </>
                        )}

                        {/* Artists Tab */}
                        {libraryTab === 'Artists' && (
                          <>
                            {artists.length > 0 ? (
                              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                {artists.map((artist, index) => (
                                  <div
                                    key={artist.name}
                                    onClick={() => {
                                      setSelectedArtist(artist);
                                      setLibraryView('artist');
                                    }}
                                    className={`flex items-center gap-4 p-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all cursor-pointer ${
                                      index !== artists.length - 1 ? 'border-b border-gray-100' : ''
                                    }`}
                                  >
                                    {/* Artist Circle Avatar */}
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0 shadow-md">
                                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-gray-900 truncate">{artist.name}</p>
                                      <p className="text-sm text-gray-600">{artist.count} {artist.count === 1 ? 'album' : 'albums'}</p>
                                    </div>
                                    <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <EmptyState
                                icon={<svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>}
                                title="No artists yet"
                                subtitle="Add some music to see your artists here"
                              />
                            )}
                          </>
                        )}

                        {/* Albums Tab */}
                        {libraryTab === 'Albums' && (
                          <>
                            {filteredAlbums.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {filteredAlbums.map((album, index) => (
                                  <div
                                    key={album._id || `album-grid-${index}`}
                                    onClick={() => handleViewTracks(album)}
                                    className="group bg-white rounded-2xl p-3 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                                  >
                                    <div className="relative mb-2">
                                      {album.hideArtwork ? (
                                        <div className="w-full aspect-square bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-md">
                                          <SafeTunesLogo className="w-12 h-12 text-white/70" />
                                        </div>
                                      ) : (
                                        <img
                                          src={album.artworkUrl?.replace('{w}', '300').replace('{h}', '300') || '/placeholder-album.png'}
                                          alt={album.albumName}
                                          className="w-full aspect-square object-cover rounded-xl shadow-md"
                                        />
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePlayAlbum(album);
                                        }}
                                        className="absolute bottom-2 right-2 w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                                      >
                                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                        </svg>
                                      </button>
                                    </div>
                                    <h3 className="font-semibold text-sm text-gray-900 truncate">{album.albumName}</h3>
                                    <p className="text-xs text-gray-500 truncate">{album.artistName}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <EmptyState
                                icon={<svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" /></svg>}
                                title="No albums yet"
                                subtitle="Your approved albums will appear here"
                              />
                            )}
                          </>
                        )}

                        {/* Songs Tab */}
                        {libraryTab === 'Songs' && (
                          <>
                            {filteredLibrarySongs.length > 0 ? (
                              <>
                                {/* Shuffle All Button */}
                                <button
                                  onClick={async () => {
                                    if (filteredLibrarySongs.length > 0) {
                                      // Shuffle the songs
                                      const shuffled = [...filteredLibrarySongs].sort(() => Math.random() - 0.5);
                                      // Convert to track format for playApprovedSongs
                                      const tracks = shuffled.map(song => ({
                                        id: song.appleSongId,
                                        appleSongId: song.appleSongId,
                                        name: song.songName,
                                        songName: song.songName,
                                        artistName: song.artistName,
                                        albumName: song.albumName,
                                        artworkUrl: song.artworkUrl,
                                        attributes: {
                                          name: song.songName,
                                          artistName: song.artistName,
                                          albumName: song.albumName,
                                          artwork: song.artworkUrl ? { url: song.artworkUrl } : null
                                        }
                                      }));
                                      // Play with all tracks as context (starting at index 0)
                                      handlePlaySong(shuffled[0], tracks);
                                      showToast(`🎲 Shuffling ${shuffled.length} songs!`, 'success');
                                    }
                                  }}
                                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M2.93 3.93a1 1 0 011.41 0l4.83 4.83-4.83 4.83a1 1 0 01-1.41-1.41L6.1 9.01 2.93 5.84a1 1 0 010-1.41zm10.66 0a1 1 0 011.41 0l4.83 4.83a1 1 0 010 1.41l-4.83 4.83a1 1 0 01-1.41-1.41l3.17-3.17H7a1 1 0 110-2h9.76l-3.17-3.17a1 1 0 010-1.42z" />
                                  </svg>
                                  Shuffle All ({filteredLibrarySongs.length})
                                </button>
                                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                  {filteredLibrarySongs.map((song, index) => {
                                    const isCurrentlyPlaying = playerState.currentTrack?.id === song.appleSongId;
                                    return (
                                      <div
                                        key={song._id || `lib-song-${index}`}
                                        className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition cursor-pointer ${
                                          index !== filteredLibrarySongs.length - 1 ? 'border-b border-gray-100' : ''
                                        } ${isCurrentlyPlaying ? 'bg-purple-50' : ''}`}
                                      >
                                        <span className={`w-6 text-center text-sm font-medium flex-shrink-0 ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-400'}`}>
                                          {isCurrentlyPlaying ? (
                                            <span className="flex items-center justify-center gap-0.5">
                                              <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '8px' }}></span>
                                              <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '12px', animationDelay: '0.1s' }}></span>
                                              <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '6px', animationDelay: '0.2s' }}></span>
                                            </span>
                                          ) : (
                                            index + 1
                                          )}
                                        </span>
                                        {/* Clickable area for playing song */}
                                        <div
                                          className="flex items-center gap-3 flex-1 min-w-0"
                                          onClick={() => handlePlaySong(song)}
                                        >
                                          {song.hideArtwork ? (
                                            <HiddenArtworkPlaceholder size="md" />
                                          ) : (
                                            <img
                                              src={song.artworkUrl?.replace('{w}', '80').replace('{h}', '80')}
                                              alt={song.songName}
                                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                            />
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-900'}`}>{song.songName}</p>
                                            <p className={`text-sm truncate ${isCurrentlyPlaying ? 'text-purple-500' : 'text-gray-500'}`}>{song.artistName}</p>
                                          </div>
                                        </div>
                                        {/* Three-dot menu */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Convert song to track format for the actions modal
                                            const trackForModal = {
                                              id: song.appleSongId,
                                              appleSongId: song.appleSongId,
                                              name: song.songName,
                                              title: song.songName,
                                              artistName: song.artistName,
                                              albumName: song.albumName,
                                              artworkUrl: song.artworkUrl,
                                              hideArtwork: song.hideArtwork,
                                            };
                                            setSelectedSongForActions(trackForModal);
                                            setShowSongActionsModal(true);
                                          }}
                                          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition flex-shrink-0"
                                        >
                                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                          </svg>
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <EmptyState
                                icon={<svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" /></svg>}
                                title="No songs yet"
                                subtitle="Your approved songs will appear here"
                              />
                            )}
                          </>
                        )}

                        {/* Genres Tab */}
                        {libraryTab === 'Genres' && (
                          <>
                            {genres.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {genres.map((genre) => (
                                  <button
                                    key={genre.name}
                                    onClick={() => {
                                      setSelectedGenre(genre);
                                      setLibraryView('genre');
                                    }}
                                    className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl p-4 text-left shadow-lg transition-all active:scale-[0.98]"
                                  >
                                    <p className="font-bold text-lg truncate">{genre.name}</p>
                                    <p className="text-sm text-white/80">{genre.count} {genre.count === 1 ? 'album' : 'albums'}</p>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <EmptyState
                                icon={<svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" /></svg>}
                                title="No genres yet"
                                subtitle="Add some albums to see genres here"
                              />
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Artist View - Show artist's albums */}
                    {libraryView === 'artist' && selectedArtist && (
                      <div className="space-y-4">
                        {/* Back button and header */}
                        <div className="flex items-center gap-3 px-2">
                          <button
                            onClick={() => {
                              setLibraryView('home');
                              setSelectedArtist(null);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                          >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">{selectedArtist.name}</h2>
                            <p className="text-sm text-gray-600">{selectedArtist.count} {selectedArtist.count === 1 ? 'album' : 'albums'}</p>
                          </div>
                        </div>

                        {/* Albums grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                          {selectedArtist.albums.map((album, index) => (
                            <div
                              key={album._id || `artist-album-${index}`}
                              onClick={() => handleViewTracks(album)}
                              className="group bg-white rounded-xl p-4 hover:shadow-lg transition cursor-pointer"
                            >
                              <div className="relative mb-3">
                                {album.hideArtwork ? (
                                  <div className="w-full aspect-square bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center">
                                    <SafeTunesLogo className="w-16 h-16 text-white/70" />
                                  </div>
                                ) : (
                                  <img
                                    src={album.artworkUrl?.replace('{w}', '300').replace('{h}', '300') || '/placeholder-album.png'}
                                    alt={album.albumName}
                                    className="w-full aspect-square object-cover rounded-lg"
                                  />
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayAlbum(album);
                                  }}
                                  className="absolute bottom-2 right-2 w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                                >
                                  <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                  </svg>
                                </button>
                              </div>
                              <h3 className="font-semibold text-sm text-gray-900 truncate mb-1">{album.albumName}</h3>
                              <p className="text-xs text-gray-600 truncate">{album.artistName}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Genre View - Show genre's albums */}
                    {libraryView === 'genre' && selectedGenre && (
                      <div className="space-y-4">
                        {/* Back button and header */}
                        <div className="flex items-center gap-3 px-2">
                          <button
                            onClick={() => {
                              setLibraryView('home');
                              setSelectedGenre(null);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                          >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">{selectedGenre.name}</h2>
                            <p className="text-sm text-gray-600">{selectedGenre.count} {selectedGenre.count === 1 ? 'album' : 'albums'}</p>
                          </div>
                        </div>

                        {/* Albums grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                          {selectedGenre.albums.map((album, index) => (
                            <div
                              key={album._id || `genre-album-${index}`}
                              onClick={() => handleViewTracks(album)}
                              className="group bg-white rounded-xl p-4 hover:shadow-lg transition cursor-pointer"
                            >
                              <div className="relative mb-3">
                                {album.hideArtwork ? (
                                  <div className="w-full aspect-square bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center">
                                    <SafeTunesLogo className="w-16 h-16 text-white/70" />
                                  </div>
                                ) : (
                                  <img
                                    src={album.artworkUrl?.replace('{w}', '300').replace('{h}', '300') || '/placeholder-album.png'}
                                    alt={album.albumName}
                                    className="w-full aspect-square object-cover rounded-lg"
                                  />
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayAlbum(album);
                                  }}
                                  className="absolute bottom-2 right-2 w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                                >
                                  <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                  </svg>
                                </button>
                              </div>
                              <h3 className="font-semibold text-sm text-gray-900 truncate mb-1">{album.albumName}</h3>
                              <p className="text-xs text-gray-600 truncate">{album.artistName}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Albums Tab - All Albums */}
                {activeTab === 'albums' && filteredAlbums.length > 0 && (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                        {filteredAlbums.map((album, index) => (
                          <div
                            key={album._id || `all-album-grid-${index}`}
                            className="group bg-white rounded-xl p-4 hover:shadow-lg transition cursor-pointer"
                          >
                            <div className="relative mb-3">
                              <img
                                src={album.artworkUrl?.replace('{w}', '300').replace('{h}', '300') || '/placeholder-album.png'}
                                alt={album.albumName}
                                className="w-full aspect-square object-cover rounded-lg"
                              />
                              <button
                                onClick={() => handlePlayAlbum(album)}
                                className="absolute bottom-2 right-2 w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                              >
                                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                </svg>
                              </button>
                            </div>
                            <h3 className="font-semibold text-sm text-gray-900 truncate mb-1">{album.albumName}</h3>
                            <p className="text-xs text-gray-600 truncate mb-2">{album.artistName}</p>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewTracks(album);
                                }}
                                className="flex-1 py-1.5 text-xs text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition"
                              >
                                Tracks
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAlbumForPlaylist(album);
                                  setShowAddToPlaylist(true);
                                }}
                                className="flex-1 py-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition flex items-center justify-center gap-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {filteredAlbums.map((album, index) => (
                          <div
                            key={album._id || `all-album-list-${index}`}
                            className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition ${
                              index !== filteredAlbums.length - 1 ? 'border-b border-gray-100' : ''
                            }`}
                          >
                            <img
                              src={album.artworkUrl?.replace('{w}', '80').replace('{h}', '80') || '/placeholder-album.png'}
                              alt={album.albumName}
                              className="w-16 h-16 rounded-lg flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{album.albumName}</h3>
                              <p className="text-sm text-gray-600 truncate">{album.artistName}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {album.trackCount || 0} tracks
                                {album.releaseYear && ` • ${album.releaseYear}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleViewTracks(album)}
                                className="hidden sm:block px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition"
                              >
                                Tracks
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAlbumForPlaylist(album);
                                  setShowAddToPlaylist(true);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                                title="Add to playlist"
                              >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handlePlayAlbum(album)}
                                className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Discover Tab - Uses existing DiscoveryPage with parent-curated featured content */}
                {activeTab === 'discover' && (
                  <DiscoveryPage
                    kidProfile={kidProfile}
                    onPlaySong={handlePlaySong}
                    onPlayAlbum={handlePlayAlbum}
                    currentSong={playerState.currentTrack}
                    isPlaying={playerState.isPlaying}
                    globalHideArtwork={globalHideArtwork}
                  />
                )}

                {/* Playlists Tab */}
                {activeTab === 'playlists' && (
                  <div className="space-y-6">
                    {!selectedPlaylistView ? (
                      <PlaylistsTab
                        playlists={playlists || []}
                        onCreatePlaylist={() => setShowCreatePlaylist(true)}
                        onPlaylistClick={(playlist) => setSelectedPlaylistView(playlist)}
                        onPlayPlaylist={(playlist) => handlePlayPlaylist(playlist)}
                        shouldHidePlaylistArtwork={shouldHidePlaylistArtwork}
                      />
                    ) : (
                      /* Playlist Detail View */
                      <div className="space-y-4">
                        {/* Back Button & Header */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedPlaylistView(null)}
                            className="p-2 hover:bg-gray-100 rounded-full transition"
                          >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <h2 className="text-2xl font-bold text-gray-900 flex-1">{selectedPlaylistView.name}</h2>
                        </div>

                        {/* Playlist Info Card */}
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                          <div className="flex items-start gap-4 mb-4">
                            {selectedPlaylistView.songs && selectedPlaylistView.songs.length > 0 && selectedPlaylistView.songs[0].artworkUrl && !shouldHidePlaylistArtwork(selectedPlaylistView) ? (
                              <img
                                src={selectedPlaylistView.songs[0].artworkUrl.replace('{w}', '120').replace('{h}', '120')}
                                alt={selectedPlaylistView.name}
                                className="w-24 h-24 rounded-lg flex-shrink-0"
                              />
                            ) : (
                              <div className="w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                <SafeTunesLogo className="w-12 h-12 text-white/70" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedPlaylistView.name}</h3>
                              {selectedPlaylistView.description && (
                                <p className="text-sm text-gray-600 mb-2">{selectedPlaylistView.description}</p>
                              )}
                              <p className="text-sm text-gray-500">{selectedPlaylistView.songs?.length || 0} songs</p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePlayPlaylist(selectedPlaylistView)}
                              disabled={!selectedPlaylistView.songs || selectedPlaylistView.songs.length === 0}
                              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                              </svg>
                              Play All
                            </button>
                            <button
                              onClick={() => handleDeletePlaylist(selectedPlaylistView._id)}
                              className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-600 font-semibold rounded-lg transition"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Songs List */}
                        {selectedPlaylistView.songs && selectedPlaylistView.songs.length > 0 ? (
                          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            {selectedPlaylistView.songs.map((song, index) => {
                              // Convert playlist songs to track format for queueing
                              const playlistTracks = selectedPlaylistView.songs.map(s => ({
                                id: s.appleSongId,
                                appleSongId: s.appleSongId,
                                songName: s.songName,
                                artistName: s.artistName,
                                albumName: s.albumName,
                                artworkUrl: s.artworkUrl,
                                durationInMillis: s.durationInMillis,
                              }));
                              const isCurrentlyPlaying = playerState.currentTrack?.id === song.appleSongId;
                              return (
                                <div
                                  key={song.appleSongId}
                                  className={`flex items-center gap-3 p-3 hover:bg-gray-50 transition ${
                                    index !== selectedPlaylistView.songs.length - 1 ? 'border-b border-gray-100' : ''
                                  } ${isCurrentlyPlaying ? 'bg-purple-50' : ''}`}
                                >
                                  <button
                                    onClick={() => handlePlaySong({ appleSongId: song.appleSongId }, playlistTracks)}
                                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                  >
                                    <span className={`w-6 text-center text-sm font-medium flex-shrink-0 ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-400'}`}>
                                      {isCurrentlyPlaying ? (
                                        <span className="flex items-center justify-center gap-0.5">
                                          <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '8px' }}></span>
                                          <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '12px', animationDelay: '0.1s' }}></span>
                                          <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '6px', animationDelay: '0.2s' }}></span>
                                        </span>
                                      ) : (
                                        index + 1
                                      )}
                                    </span>
                                    {song.artworkUrl && !shouldHideSongArtworkFull(song) ? (
                                      <img
                                        src={song.artworkUrl.replace('{w}', '60').replace('{h}', '60')}
                                        alt={song.songName}
                                        className="w-12 h-12 rounded-lg flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <SafeTunesLogo className="w-6 h-6 text-white/70" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <h3 className={`font-medium text-sm truncate ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-900'}`}>{song.songName}</h3>
                                      <p className={`text-xs truncate ${isCurrentlyPlaying ? 'text-purple-500' : 'text-gray-500'}`}>{song.artistName}</p>
                                    </div>
                                  </button>
                                  <button
                                    onClick={() => confirmRemoveSongFromPlaylist(selectedPlaylistView._id, song)}
                                    className="p-2 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-lg transition flex-shrink-0"
                                    title="Remove from playlist"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-white rounded-xl">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                            <p className="text-gray-500">No songs in this playlist yet</p>
                            <p className="text-sm text-gray-400 mt-1">Add songs from your library</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Remove Song from Playlist Confirmation Modal */}
        {songToRemoveFromPlaylist && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70] p-4" onClick={() => setSongToRemoveFromPlaylist(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Remove Song?</h2>
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 truncate">{songToRemoveFromPlaylist.song.songName}</p>
                <p className="text-sm text-gray-500 truncate">{songToRemoveFromPlaylist.song.artistName}</p>
              </div>
              <p className="text-gray-600 mb-6">Are you sure you want to remove this song from the playlist?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSongToRemoveFromPlaylist(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRemoveSongFromPlaylist}
                  className="flex-1 py-3 px-4 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add to Playlist Modal */}
        {showAddToPlaylist && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[210] p-4" onClick={() => {
            setShowAddToPlaylist(false);
            setSelectedSongForPlaylist(null);
            setSelectedAlbumForPlaylist(null);
          }}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Add to Playlist
              </h2>

              {selectedAlbumForPlaylist && (
                <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Adding album:</p>
                  <p className="font-semibold text-gray-900">{selectedAlbumForPlaylist.albumName}</p>
                  <p className="text-sm text-gray-500">{selectedAlbumForPlaylist.artistName}</p>
                </div>
              )}

              {selectedSongForPlaylist && (
                <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Adding song:</p>
                  <p className="font-semibold text-gray-900">{selectedSongForPlaylist.songName}</p>
                  <p className="text-sm text-gray-500">{selectedSongForPlaylist.artistName}</p>
                </div>
              )}

              {!playlists || playlists.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">You don't have any playlists yet.</p>
                  <button
                    onClick={() => {
                      setShowAddToPlaylist(false);
                      setShowCreatePlaylist(true);
                    }}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
                  >
                    Create Your First Playlist
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist._id}
                      onClick={() => {
                        if (selectedSongForPlaylist) {
                          handleAddSongToPlaylist(playlist._id);
                        } else if (selectedAlbumForPlaylist) {
                          handleAddAlbumToPlaylist(playlist._id);
                        }
                      }}
                      className="w-full p-4 bg-gray-50 hover:bg-purple-50 rounded-lg transition text-left flex items-center gap-3"
                    >
                      {playlist.songs && playlist.songs.length > 0 && playlist.songs[0].artworkUrl && !shouldHidePlaylistArtwork(playlist) ? (
                        <img
                          src={playlist.songs[0].artworkUrl.replace('{w}', '60').replace('{h}', '60')}
                          alt={playlist.name}
                          className="w-12 h-12 rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <SafeTunesLogo className="w-6 h-6 text-white/70" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{playlist.name}</p>
                        <p className="text-sm text-gray-500">{playlist.songs?.length || 0} songs</p>
                      </div>
                      <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setShowAddToPlaylist(false);
                  setSelectedSongForPlaylist(null);
                  setSelectedAlbumForPlaylist(null);
                }}
                className="w-full mt-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Request Confirmation Modal */}
        {requestConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => !isSubmittingRequest && setRequestConfirmModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start gap-4 mb-4">
                {/* Hide album artwork in request modal - show music note placeholder instead */}
                <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">
                    Request {requestConfirmModal.type === 'album' ? 'Album' : 'Song'}
                  </h2>
                  <p className="text-gray-900 font-medium truncate">
                    {requestConfirmModal.item.attributes?.name}
                  </p>
                  <p className="text-gray-500 text-sm truncate">
                    {requestConfirmModal.item.attributes?.artistName}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Why do you want this? (optional)
                  </label>
                  <textarea
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder="Tell your parent why you want this music..."
                    rows={3}
                    maxLength={200}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none text-sm"
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {requestNote.length}/200
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-700">
                    Adding a note helps your parent understand why you want this music!
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setRequestConfirmModal(null);
                    setRequestNote('');
                  }}
                  disabled={isSubmittingRequest}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRequest}
                  disabled={isSubmittingRequest}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingRequest ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Playlist Modal */}
        {showCreatePlaylist && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowCreatePlaylist(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Playlist</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Playlist Name</label>
                  <input
                    type="text"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="My Awesome Playlist"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                  <textarea
                    value={playlistDescription}
                    onChange={(e) => setPlaylistDescription(e.target.value)}
                    placeholder="Songs for..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreatePlaylist(false);
                    setPlaylistName('');
                    setPlaylistDescription('');
                  }}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  disabled={!playlistName.trim()}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Track List Modal */}
        {selectedAlbum && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[110] p-4 overflow-hidden" onClick={() => setSelectedAlbum(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-6 border-b border-gray-200 overflow-hidden">
                <div className="flex items-start gap-4 mb-4 overflow-hidden">
                  {shouldHideAlbumArtwork(selectedAlbum.appleAlbumId) ? (
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                    </div>
                  ) : (
                    <img
                      src={selectedAlbum.artworkUrl?.replace('{w}', '120').replace('{h}', '120')}
                      alt={selectedAlbum.albumName}
                      className="w-24 h-24 rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1 truncate">{selectedAlbum.albumName}</h2>
                    <p className="text-gray-600 truncate">{selectedAlbum.artistName}</p>
                    <p className="text-sm text-gray-500 mt-1">{albumTracks.length} tracks</p>
                  </div>
                  <button
                    onClick={() => setSelectedAlbum(null)}
                    className="text-gray-400 hover:text-gray-600 p-2 flex-shrink-0"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handlePlayAlbum(selectedAlbum)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    Play Album
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAlbumForPlaylist(selectedAlbum);
                      setShowAddToPlaylist(true);
                    }}
                    className="flex-1 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 px-4 py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add to Playlist
                  </button>
                </div>
              </div>

              {/* Tracks */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-6">
                {loadingTracks ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading tracks...</p>
                  </div>
                ) : albumTracks.length > 0 ? (
                  <div className="space-y-2">
                    {albumTracks.map((track, index) => {
                      const isCurrentlyPlaying = playerState.currentTrack?.id === track.id;
                      const songData = {
                        appleSongId: track.id,
                        songName: track.attributes?.name || 'Unknown',
                        artistName: track.attributes?.artistName || selectedAlbum.artistName,
                        albumName: selectedAlbum.albumName,
                        artworkUrl: selectedAlbum.artworkUrl,
                        durationInMillis: track.attributes?.durationInMillis
                      };
                      return (
                        <div
                          key={track.id}
                          className={`flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition overflow-hidden ${isCurrentlyPlaying ? 'bg-purple-50' : ''}`}
                        >
                          <button
                            onClick={() => handlePlaySong(songData, albumTracks)}
                            className="flex-1 min-w-0 flex items-center gap-3 text-left"
                          >
                            <span className={`w-6 text-center text-sm font-medium flex-shrink-0 ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-400'}`}>
                              {isCurrentlyPlaying ? (
                                <span className="flex items-center justify-center gap-0.5">
                                  <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '8px' }}></span>
                                  <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '12px', animationDelay: '0.1s' }}></span>
                                  <span className={`w-0.5 bg-purple-600 rounded-full ${playerState.isPlaying ? 'animate-pulse' : ''}`} style={{ height: '6px', animationDelay: '0.2s' }}></span>
                                </span>
                              ) : (
                                index + 1
                              )}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium truncate ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-900'}`}>{track.attributes?.name || 'Unknown'}</p>
                              <p className={`text-sm ${isCurrentlyPlaying ? 'text-purple-500' : 'text-gray-500'}`}>
                                {track.attributes?.durationInMillis ?
                                  `${Math.floor(track.attributes.durationInMillis / 60000)}:${String(Math.floor((track.attributes.durationInMillis % 60000) / 1000)).padStart(2, '0')}`
                                  : '--:--'
                                }
                              </p>
                            </div>
                          </button>
                          {/* 3-dot menu button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSongContextMenu(songContextMenu?.song?.appleSongId === songData.appleSongId ? null : { song: songData });
                            }}
                            className="p-2 hover:bg-gray-200 rounded-full transition flex-shrink-0"
                          >
                            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>No tracks available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {/* Requests Header - matching design system */}
            <div className="px-4 pt-6 pb-2">
              <h1 className="text-3xl font-bold text-gray-900">Request</h1>
              <p className="text-gray-500 mt-1">Ask for new music to add</p>
            </div>

            {/* Sub-tab Switcher */}
            <div className="px-4">
              <div className="bg-gray-100 rounded-xl p-1 flex gap-1">
                <button
                  onClick={() => setRequestsSubTab('search')}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    requestsSubTab === 'search'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find Music
                </button>
                <button
                  onClick={() => {
                    setRequestsSubTab('status');
                    if (unviewedCount > 0 && kidProfile) {
                      markAllRequestsAsViewed({ kidProfileId: kidProfile._id });
                    }
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 relative ${
                    requestsSubTab === 'status'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  My Requests
                  {unviewedCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unviewedCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Find New Music Sub-tab */}
            {requestsSubTab === 'search' && (
              <div className="space-y-6">

            {/* Request Search Bar */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <form onSubmit={handleAppleMusicSearch}>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search Apple Music..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent text-base"
                  />
                  {searchQuery && !isSearching && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Blocked Search Message */}
            {blockedMessage && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-red-900 text-base sm:text-lg mb-1">Content Blocked</h3>
                      <p className="text-sm sm:text-base text-red-800">{blockedMessage.message}</p>
                    </div>
                  </div>
                  <div className="bg-white border border-red-200 rounded-lg p-3 sm:p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs sm:text-sm font-semibold text-gray-900">God's Word says:</p>
                    </div>
                    <p className="text-sm sm:text-base text-gray-700 italic mb-2 leading-relaxed">
                      "{blockedMessage.verse.verse}"
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-purple-700">— {blockedMessage.verse.reference}</p>
                  </div>
                  <button
                    onClick={() => setBlockedMessage(null)}
                    className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Search Results - New Apple Music style */}
            {searchResults.length > 0 && (
              <KidSearchResults
                results={searchResults}
                searchQuery={searchQuery}
                onClear={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                onAlbumRequest={handleRequest}
                onSongRequest={handleSongRequest}
                isAlbumApproved={isAlbumApproved}
                isAlbumRequested={isAlbumRequested}
                isSongApproved={isSongApproved}
                isSongRequested={isSongRequested}
                requestSuccess={requestSuccess}
                expandedAlbums={expandedAlbums}
                onToggleAlbumExpansion={handleToggleAlbumExpansion}
                loadingAlbumTracks={loadingAlbumTracks}
                onArtistTap={async (artist) => {
                  // TODO: Could add artist drill-down in future
                  // For now, search for artist's music
                  setSearchQuery(artist.attributes?.name || '');
                  // Trigger new search
                  const results = await musicKitService.search(artist.attributes?.name || '', {
                    types: ['songs', 'albums'],
                    limit: 25
                  });
                  if (results) {
                    const combined = [
                      ...(results.songs || []).map(s => ({ ...s, itemType: 'song', resultType: 'song' })),
                      ...(results.albums || []).map(a => ({ ...a, itemType: 'album', resultType: 'album' }))
                    ];
                    setSearchResults(combined);
                  }
                }}
              />
            )}

              </div>
            )}

            {/* My Requested Items Sub-tab - NEW iOS-STYLE DESIGN */}
            {requestsSubTab === 'status' && (
              <div className="space-y-4">
                {/* Filter Pills */}
                {(() => {
                  try {
                  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                  const safeKidRequests = Array.isArray(kidRequests) ? kidRequests : [];
                  const pendingCount = safeKidRequests.filter(function(r) { return r && r.status === 'pending'; }).length;
                  const approvedCount = safeKidRequests.filter(function(r) {
                    return r && (r.status === 'approved' || r.status === 'partially_approved') && r.reviewedAt && r.reviewedAt > sevenDaysAgo;
                  }).length;
                  const deniedCount = safeKidRequests.filter(function(r) { return r && r.status === 'denied'; }).length;

                  const counts = {
                    All: safeKidRequests.length,
                    Pending: pendingCount,
                    Approved: approvedCount,
                    Denied: deniedCount,
                  };

                  // Filter logic
                  const getFilteredRequests = function() {
                    if (requestFilter === 'All') return safeKidRequests;
                    if (requestFilter === 'Pending') return safeKidRequests.filter(function(r) { return r && r.status === 'pending'; });
                    if (requestFilter === 'Approved') {
                      return safeKidRequests.filter(function(r) {
                        return r && (r.status === 'approved' || r.status === 'partially_approved') && r.reviewedAt && r.reviewedAt > sevenDaysAgo;
                      });
                    }
                    if (requestFilter === 'Denied') {
                      return safeKidRequests.filter(function(r) { return r && r.status === 'denied'; });
                    }
                    return safeKidRequests;
                  };

                  const filteredRequests = getFilteredRequests();

                  return (
                    <>
                      <FilterPills
                        options={['All', 'Pending', 'Approved', 'Denied']}
                        selected={requestFilter}
                        onChange={setRequestFilter}
                        counts={counts}
                      />

                      {/* Request List - iOS Style */}
                      {filteredRequests.length > 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                          {filteredRequests.map(function(request) {
                            if (!request || !request._id) return null;
                            return (
                              <RequestRow
                                key={request._id}
                                item={{
                                  name: request.requestType === 'album' ? (request.albumName || 'Unknown Album') : (request.songName || 'Unknown Song'),
                                  artistName: request.artistName || 'Unknown Artist',
                                  artworkUrl: request.artworkUrl || '',
                                  type: request.requestType || 'album',
                                }}
                                status={request.status || 'pending'}
                                hideArtwork={request.status === 'pending' || request.status === 'denied'}
                                denialReason={request.denialReason || null}
                                partialApprovalNote={request.partialApprovalNote || null}
                                reviewedAt={request.reviewedAt || null}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <EmptyState
                          title={
                            requestFilter === 'All' ? 'No Requests Yet' :
                            requestFilter === 'Pending' ? 'No Pending Requests' :
                            requestFilter === 'Approved' ? 'No Approved Requests' :
                            'No Denied Requests'
                          }
                          description={
                            requestFilter === 'All' ? 'When you request new music, it will appear here. Your parent will review and approve or deny your requests.' :
                            requestFilter === 'Pending' ? "You don't have any requests waiting for review. Search for music to add more!" :
                            requestFilter === 'Approved' ? 'No requests have been approved in the last 7 days. Check back when your parent approves your requests!' :
                            'No requests have been denied in the last 7 days. This is good news!'
                          }
                        />
                      )}
                    </>
                  );
                  } catch (err) {
                    console.error('Request filter error:', err);
                    return <div className="text-center py-8 text-gray-500">Unable to load requests</div>;
                  }
                })()}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Settings Header Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">⚙️</span>
                  <h2 className="text-xl font-bold text-white">Settings</h2>
                </div>
                <p className="text-white/90">Manage your account and preferences</p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12"></div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
              {/* Profile Info */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                <div className={`w-16 h-16 rounded-full ${getColorClass(kidProfile.color)} flex items-center justify-center text-white p-3 shadow-lg`}>
                  {getAvatarIcon(kidProfile.avatar)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{kidProfile.name}</h3>
                  <p className="text-sm text-purple-600 font-medium">Kid Profile</p>
                </div>
              </div>

              {/* Apple Music Connection Status */}
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🎵</span>
                  <h3 className="font-bold text-gray-900">Apple Music</h3>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${isMusicKitAuthorized ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {isMusicKitAuthorized ? 'Connected' : 'Not Connected'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {isMusicKitAuthorized
                            ? 'You can play your approved music'
                            : 'Connect to play music'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {isMusicKitAuthorized ? (
                    <button
                      onClick={handleDisconnectAppleMusic}
                      className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectAppleMusic}
                      disabled={isConnectingMusic}
                      className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isConnectingMusic ? 'Connecting...' : 'Connect to Apple Music'}
                    </button>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full py-4 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-5">
          {/* Home */}
          <button
            onClick={() => setActiveTab('home')}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-all ${
              activeTab === 'home' ? 'bg-purple-50' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1 text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'home' ? 2.5 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className={`text-xs transition-all ${activeTab === 'home' ? 'font-semibold' : 'font-normal'}`}>Home</span>
            </div>
            {activeTab === 'home' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>

          {/* Library */}
          <button
            onClick={() => setActiveTab('library')}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-all ${
              activeTab === 'library' ? 'bg-purple-50' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1 text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'library' ? 2.5 : 2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className={`text-xs transition-all ${activeTab === 'library' ? 'font-semibold' : 'font-normal'}`}>Library</span>
            </div>
            {activeTab === 'library' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>

          {/* Discover */}
          <button
            onClick={() => setActiveTab('discover')}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-all ${
              activeTab === 'discover' ? 'bg-purple-50' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1 text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'discover' ? 2.5 : 2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className={`text-xs transition-all ${activeTab === 'discover' ? 'font-semibold' : 'font-normal'}`}>Discover</span>
            </div>
            {activeTab === 'discover' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>

          {/* Playlists */}
          <button
            onClick={() => setActiveTab('playlists')}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-all ${
              activeTab === 'playlists' ? 'bg-purple-50' : ''
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1 text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'playlists' ? 2.5 : 2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className={`text-xs transition-all ${activeTab === 'playlists' ? 'font-semibold' : 'font-normal'}`}>Playlists</span>
            </div>
            {activeTab === 'playlists' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>

          {/* Request */}
          <button
            onClick={() => {
              setActiveTab('requests');
              if (unviewedCount > 0 && kidProfile) {
                markAllRequestsAsViewed({ kidProfileId: kidProfile._id });
              }
            }}
            className={`relative flex flex-col items-center justify-center gap-1 py-3 transition-all ${
              activeTab === 'requests' ? 'bg-purple-50' : ''
            }`}
          >
            <div className="relative flex flex-col items-center justify-center gap-1 text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'requests' ? 2.5 : 2} d="M12 4v16m8-8H4" />
              </svg>
              <span className={`text-xs transition-all ${activeTab === 'requests' ? 'font-semibold' : 'font-normal'}`}>Request</span>
              {unviewedCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unviewedCount}
                </span>
              )}
            </div>
            {activeTab === 'requests' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-purple-600"></div>
            )}
          </button>
        </div>
      </nav>

      {/* Time Limit Reached Modal */}
      {showTimeLimitModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Time's Up!</h3>
            <p className="text-gray-600 mb-4">
              You've used your {timeLimitSettings?.limitMinutes && formatTimeRemaining(timeLimitSettings.limitMinutes)} of music time for today.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Take a break and come back tomorrow for more music! 🎵
            </p>
            <button
              onClick={() => setShowTimeLimitModal(false)}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Music Access Paused Modal - shown when parent has paused music access */}
      {showMusicPausedModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Music Paused</h3>
            <p className="text-gray-600 mb-4">
              Your parent has paused music access right now.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Check back later when they turn it back on!
            </p>
            <button
              onClick={() => setShowMusicPausedModal(false)}
              className="w-full py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Time-of-Day Restriction Modal - shown when outside allowed hours */}
      {showTimeOfDayModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Not Music Time Yet!</h3>
            <p className="text-gray-600 mb-4">
              {timeLimitSettings?.timeOfDayMessage || 'Music is not available right now.'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Come back during allowed hours! ☀️
            </p>
            <button
              onClick={() => setShowTimeOfDayModal(false)}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-yellow-600 transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* New MiniPlayer - shows when track is playing */}
      {playerState.currentTrack && (
        <MiniPlayer
          track={playerState.currentTrack}
          isPlaying={playerState.isPlaying}
          progress={playerState.progress}
          duration={playerState.duration}
          onPlayPause={handlePlayerPlayPause}
          onExpand={() => setShowFullScreenPlayer(true)}
          onClose={() => {
            musicKitService.stop();
            setPlayerState(prev => ({ ...prev, currentTrack: null }));
          }}
          hideArtwork={shouldHideCurrentTrackArtwork()}
        />
      )}

      {/* New FullScreenPlayer */}
      <FullScreenPlayer
        track={playerState.currentTrack}
        isPlaying={playerState.isPlaying}
        isOpen={showFullScreenPlayer}
        progress={playerState.progress}
        duration={playerState.duration}
        volume={playerState.volume}
        isShuffleOn={playerState.isShuffleOn}
        isRepeatOn={playerState.isRepeatOn}
        hideArtwork={shouldHideCurrentTrackArtwork()}
        playbackSource={playbackContext.source}
        // Inline queue and lyrics props
        queue={queueState.items}
        currentQueueIndex={queueState.currentIndex}
        lyrics={lyricsState.lyrics}
        lyricsLoading={lyricsState.isLoading}
        onPlayQueueItem={handlePlayQueueTrack}
        onClose={() => setShowFullScreenPlayer(false)}
        onPlayPause={handlePlayerPlayPause}
        onSkipNext={handlePlayerSkipNext}
        onSkipPrevious={handlePlayerSkipPrevious}
        onSeek={handlePlayerSeek}
        onVolumeChange={handlePlayerVolumeChange}
        onShuffleToggle={handlePlayerShuffleToggle}
        onRepeatToggle={handlePlayerRepeatToggle}
        onOpenLyrics={handleOpenLyrics}
        onOpenQueue={handleOpenQueue}
        onMoreOptions={() => setShowSongActionsModal(true)}
        // Sleep timer props
        sleepTimer={sleepTimer}
        onSetSleepTimer={handleSetSleepTimer}
        onCancelSleepTimer={handleCancelSleepTimer}
      />

      {/* Song Actions Modal (Context Menu) */}
      <SongActionsModal
        isOpen={showSongActionsModal}
        onClose={() => {
          setShowSongActionsModal(false);
          setSelectedSongForActions(null); // Clear selection when closing
        }}
        track={selectedSongForActions || playerState.currentTrack}
        hideArtwork={selectedSongForActions?.hideArtwork || shouldHideCurrentTrackArtwork()}
        playbackSource={selectedSongForActions ? null : playbackContext.source}
        onPlayNext={selectedSongForActions ? () => {
          // Add song to play next in queue
          showToast('Added to play next', 'success');
          setShowSongActionsModal(false);
          setSelectedSongForActions(null);
        } : undefined}
        onAddToQueue={selectedSongForActions ? () => {
          // Add song to end of queue
          showToast('Added to queue', 'success');
          setShowSongActionsModal(false);
          setSelectedSongForActions(null);
        } : undefined}
        onAddToPlaylist={() => {
          const track = selectedSongForActions || playerState.currentTrack;
          if (track) {
            // Convert track to song format for playlist modal
            setSelectedSongForPlaylist({
              appleSongId: track.id || track.appleSongId,
              songName: track.name || track.title || track.songName,
              artistName: track.artistName,
              albumName: track.albumName,
              artworkUrl: track.artwork?.url || track.artworkUrl
            });
            setShowAddToPlaylist(true);
            setShowSongActionsModal(false);
            setSelectedSongForActions(null);
          }
        }}
        onViewAlbum={() => {
          // Find the album by name and show the album modal with tracks
          const track = selectedSongForActions || playerState.currentTrack;
          const albumName = track?.albumName;
          if (albumName && approvedAlbums) {
            const album = approvedAlbums.find(a => a.albumName === albumName);
            if (album) {
              setShowSongActionsModal(false);
              setSelectedSongForActions(null);
              // Use handleViewTracks to properly fetch and display album tracks
              handleViewTracks(album);
            } else {
              showToast('Album not found in library', 'info');
            }
          }
        }}
        onViewArtist={() => {
          // Navigate to artist view
          const track = selectedSongForActions || playerState.currentTrack;
          const artistName = track?.artistName;
          if (artistName && artists) {
            const artist = artists.find(a => a.name === artistName);
            if (artist) {
              setSelectedArtist(artist);
              setLibraryView('artist');
              setActiveTab('library');
              setShowFullScreenPlayer(false);
              setShowSongActionsModal(false);
              setSelectedSongForActions(null);
            } else {
              showToast('Artist not found in library', 'info');
            }
          }
        }}
        // Discover-specific: Add to Library options
        onAddSongToLibrary={playbackContext.source === 'discover' ? async () => {
          // For now, adding a single song requires adding the whole album first
          // This could be enhanced to add just the song in the future
          showToast('To add songs, please add the album to your library first.', 'info');
        } : undefined}
        onAddAlbumToLibrary={playbackContext.source === 'discover' && playbackContext.album ? async () => {
          try {
            const album = playbackContext.album;
            if (!album?.appleAlbumId) {
              showToast('Cannot add this album - missing album ID', 'error');
              return;
            }

            // First, store the album tracks
            const tracks = await musicKitService.getAlbumTracks(album.appleAlbumId);
            if (tracks && tracks.length > 0) {
              await storeAlbumTracks({
                userId: kidProfile.userId,
                appleAlbumId: album.appleAlbumId,
                tracks: tracks.map((track, index) => ({
                  appleSongId: track.id,
                  songName: track.attributes?.name,
                  artistName: track.attributes?.artistName,
                  trackNumber: index + 1,
                  durationInMillis: track.attributes?.durationInMillis,
                  isExplicit: track.attributes?.contentRating === 'explicit',
                })),
              });
            }

            // Then add to kid's library
            const result = await addDiscoverAlbumToLibrary({
              userId: kidProfile.userId,
              kidProfileId: kidProfile._id,
              appleAlbumId: album.appleAlbumId,
              albumName: album.albumName,
              artistName: album.artistName,
              artworkUrl: album.artworkUrl,
            });

            showToast(`Added "${album.albumName}" to your library!`, 'success');
            setShowSongActionsModal(false);
          } catch (err) {
            console.error('Failed to add album to library:', err);
            showToast('Failed to add album. Please try again.', 'error');
          }
        } : undefined}
        onAddArtistToLibrary={playbackContext.source === 'discover' ? async () => {
          // Adding all albums by an artist would require fetching all their albums
          // For now, show a message suggesting they add individual albums
          showToast('Browse Discover to find more albums by this artist.', 'info');
        } : undefined}
      />

      {/* Song Context Menu (for album tracks) */}
      {songContextMenu && (
        <div
          className="fixed inset-0 z-[200] flex items-end lg:items-center justify-center lg:p-8"
          onClick={() => setSongContextMenu(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Menu */}
          <div
            className="relative w-full max-w-lg bg-white rounded-t-3xl lg:rounded-3xl animate-slide-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle - only on mobile */}
            <div className="flex justify-center py-3 lg:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Song Info Header */}
            <div className="px-6 pb-4 lg:pt-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                {songContextMenu.song.artworkUrl ? (
                  <img
                    src={songContextMenu.song.artworkUrl?.replace('{w}', '64').replace('{h}', '64')}
                    alt={songContextMenu.song.songName}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0 shadow"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{songContextMenu.song.songName}</h3>
                  <p className="text-gray-500 text-sm truncate">{songContextMenu.song.artistName}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="py-2">
              <button
                onClick={() => {
                  handleAddToQueue(songContextMenu.song, true);
                  setSongContextMenu(null);
                }}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                </svg>
                <span className="font-medium text-gray-900">Play Next</span>
              </button>
              <button
                onClick={() => {
                  handleAddToQueue(songContextMenu.song, false);
                  setSongContextMenu(null);
                }}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="font-medium text-gray-900">Add to Queue</span>
              </button>
              <button
                onClick={() => {
                  setSelectedSongForPlaylist(songContextMenu.song);
                  setShowAddToPlaylist(true);
                  setSongContextMenu(null);
                }}
                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 active:bg-gray-100 transition"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium text-gray-900">Add to Playlist</span>
              </button>
            </div>

            {/* Cancel Button */}
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={() => setSongContextMenu(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>

          <style>{`
            @keyframes slide-up {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            .animate-slide-up {
              animation: slide-up 0.3s ease-out;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default ChildDashboard;
