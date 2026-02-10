import { useState, useEffect } from 'react';
import { useQuery, useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import PersistentPlayer from './PersistentPlayer';
import ContentReviewModal from './ContentReviewModal';
import LyricsModal from './LyricsModal';
import AlbumOverviewModal from './AlbumOverviewModal';
import musicKitService from '../../config/musickit';
import { useToast } from '../common/Toast';
import EmptyState from '../common/EmptyState';
import { useConvex } from 'convex/react';

function AlbumRequests({ user }) {
  const { showToast, ToastContainer } = useToast();
  const convex = useConvex();

  const pendingAlbumRequests = useQuery(api.albumRequests.getPendingRequests,
    user ? { userId: user._id } : 'skip'
  ) || [];
  const pendingSongRequests = useQuery(api.songRequests.getPendingSongRequests,
    user ? { userId: user._id } : 'skip'
  ) || [];
  const deniedAlbumRequests = useQuery(api.albumRequests.getDeniedRequests,
    user ? { userId: user._id } : 'skip'
  ) || [];
  const deniedSongRequests = useQuery(api.songRequests.getDeniedSongRequests,
    user ? { userId: user._id } : 'skip'
  ) || [];
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Blocked searches
  const blockedSearches = useQuery(api.blockedSearches.getBlockedSearches,
    user ? { userId: user._id } : 'skip'
  ) || [];
  const unreadBlockedSearchesCount = useQuery(api.blockedSearches.getUnreadBlockedSearchesCount,
    user ? { userId: user._id } : 'skip'
  ) || 0;

  const approveAlbumRequest = useMutation(api.albumRequests.approveRequest);
  const denyAlbumRequest = useMutation(api.albumRequests.denyRequest);
  const undoAlbumApproval = useMutation(api.albumRequests.undoApproval);
  const undoAlbumDenial = useMutation(api.albumRequests.undoDenial);
  const approveDeniedAlbum = useMutation(api.albumRequests.approveDeniedRequest);
  const approveSongRequest = useMutation(api.songRequests.approveSongRequest);
  const denySongRequest = useMutation(api.songRequests.denySongRequest);
  const undoSongApproval = useMutation(api.songRequests.undoApproval);
  const undoSongDenial = useMutation(api.songRequests.undoDenial);
  const approveDeniedSong = useMutation(api.songRequests.approveDeniedSongRequest);
  const approveSong = useMutation(api.songs.approveSong);
  const removeApprovedSongByAppleId = useMutation(api.songs.removeApprovedSongByAppleId);
  const markAsPartiallyApproved = useMutation(api.albumRequests.markAsPartiallyApproved);
  const toggleArtworkMutation = useMutation(api.albums.toggleAlbumArtwork);
  const toggleSongArtworkMutation = useMutation(api.songs.toggleSongArtwork);
  const deleteBlockedSearch = useMutation(api.blockedSearches.deleteBlockedSearch);
  const clearAllBlockedSearches = useMutation(api.blockedSearches.clearAllBlockedSearches);
  const markAllBlockedSearchesAsRead = useMutation(api.blockedSearches.markAllBlockedSearchesAsRead);

  // Get all approved albums to check if request album has hidden artwork
  const approvedAlbums = useQuery(api.albums.getApprovedAlbums,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Track artwork visibility for unapproved albums locally
  const [unapprovedArtworkHidden, setUnapprovedArtworkHidden] = useState({});

  // Track expanded albums and their tracks
  const [expandedAlbums, setExpandedAlbums] = useState({});
  const [albumTracks, setAlbumTracks] = useState({});
  const [loadingTracks, setLoadingTracks] = useState({});
  const [approvedTrackIds, setApprovedTrackIds] = useState({}); // Track which songs have been individually approved

  // Track lyrics modal state
  const [lyricsModalOpen, setLyricsModalOpen] = useState(false);
  const [lyricsTrack, setLyricsTrack] = useState(null);

  // Track AI review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewingContent, setReviewingContent] = useState(null);

  // Track album overview modal state
  const [overviewModalOpen, setOverviewModalOpen] = useState(false);
  const [overviewAlbumData, setOverviewAlbumData] = useState(null);

  // Track auth state for music playback
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Track denial modal state
  const [denialModalOpen, setDenialModalOpen] = useState(false);
  const [denialData, setDenialData] = useState(null);
  const [denialReason, setDenialReason] = useState('');
  const [denialLoading, setDenialLoading] = useState(false);

  // Track partial approval modal state
  const [partialApprovalModalOpen, setPartialApprovalModalOpen] = useState(false);
  const [partialApprovalData, setPartialApprovalData] = useState(null);
  const [partialApprovalNote, setPartialApprovalNote] = useState('');
  const [partialApprovalLoading, setPartialApprovalLoading] = useState(false);

  // Track denied archive visibility
  const [showDeniedArchive, setShowDeniedArchive] = useState(false);

  // Track active tab for mobile view
  const [activeRequestTab, setActiveRequestTab] = useState('albums'); // 'albums', 'songs', 'blocked'

  // Batch selection state
  const [selectedAlbumIds, setSelectedAlbumIds] = useState(new Set());
  const [selectedSongIds, setSelectedSongIds] = useState(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Filter and sort state
  const [filterByKid, setFilterByKid] = useState('all'); // 'all' or kid._id
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' or 'oldest'

  // Helper: Get relative time string
  const getRelativeTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Helper: Check if request is new (less than 24 hours old)
  const isNewRequest = (timestamp) => {
    return Date.now() - timestamp < 86400000; // 24 hours
  };

  // Helper: Group blocked searches by date
  const groupBlockedByDate = (searches) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = { today: [], yesterday: [], thisWeek: [], earlier: [] };

    searches.forEach(search => {
      const searchDate = new Date(search.searchedAt);
      if (searchDate >= today) {
        groups.today.push(search);
      } else if (searchDate >= yesterday) {
        groups.yesterday.push(search);
      } else if (searchDate >= weekAgo) {
        groups.thisWeek.push(search);
      } else {
        groups.earlier.push(search);
      }
    });

    return groups;
  };

  // Quick deny reasons
  const quickDenyReasons = [
    'Not age-appropriate',
    'Contains explicit content',
    "Let's discuss first",
    'Too violent/scary',
    'Bad language'
  ];

  // More menu state (track which request has menu open)
  const [openMoreMenu, setOpenMoreMenu] = useState(null);

  // Batch confirmation state
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [batchConfirmAction, setBatchConfirmAction] = useState(null); // 'approve' or 'deny'

  // Undo state - track last batch action for reversal
  const [lastBatchAction, setLastBatchAction] = useState(null);
  // { action: 'approve' | 'deny', type: 'albums' | 'songs', requestIds: string[], timestamp: number }

  // Content warning state - track explicit flags fetched from Apple Music
  const [explicitInfo, setExplicitInfo] = useState({}); // { [appleId]: boolean }

  // Fetch explicit info for pending requests from Apple Music
  useEffect(() => {
    const fetchExplicitInfo = async () => {
      if (!musicKitService.isInitialized) return;

      const allRequests = [
        ...pendingAlbumRequests.map(r => ({ id: r.appleAlbumId, type: 'album' })),
        ...pendingSongRequests.map(r => ({ id: r.appleSongId, type: 'song' }))
      ];

      // Filter to only requests we haven't fetched yet
      const toFetch = allRequests.filter(r => explicitInfo[r.id] === undefined);
      if (toFetch.length === 0) return;

      const newInfo = { ...explicitInfo };

      for (const request of toFetch) {
        try {
          if (request.type === 'album') {
            const result = await musicKitService.searchAlbums(request.id.replace('al.', ''), 1);
            // Try to get album by ID directly
            const music = musicKitService.getMusicKitInstance();
            if (music) {
              try {
                const albumData = await music.api.music(`/v1/catalog/us/albums/${request.id}`);
                if (albumData?.data?.data?.[0]?.attributes?.contentRating === 'explicit') {
                  newInfo[request.id] = true;
                } else {
                  newInfo[request.id] = false;
                }
              } catch {
                newInfo[request.id] = false;
              }
            }
          } else {
            // Song
            const music = musicKitService.getMusicKitInstance();
            if (music) {
              try {
                const songData = await music.api.music(`/v1/catalog/us/songs/${request.id}`);
                if (songData?.data?.data?.[0]?.attributes?.contentRating === 'explicit') {
                  newInfo[request.id] = true;
                } else {
                  newInfo[request.id] = false;
                }
              } catch {
                newInfo[request.id] = false;
              }
            }
          }
        } catch (err) {
          console.error('[AlbumRequests] Error fetching explicit info:', err);
          newInfo[request.id] = false;
        }
      }

      setExplicitInfo(newInfo);
    };

    fetchExplicitInfo();
  }, [pendingAlbumRequests, pendingSongRequests]);

  // Helper: Check if request content is explicit
  const isExplicit = (request) => {
    const id = request.requestType === 'album' ? request.appleAlbumId : request.appleSongId;
    return explicitInfo[id] === true;
  };

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMoreMenu(null);
    if (openMoreMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMoreMenu]);

  // Get current requests based on active tab
  const currentRequests = activeRequestTab === 'albums'
    ? pendingAlbumRequests
    : activeRequestTab === 'songs'
      ? pendingSongRequests
      : [];

  // Batch selection helpers
  const toggleAlbumSelection = (requestId) => {
    setSelectedAlbumIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  const toggleSongSelection = (requestId) => {
    setSelectedSongIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  const selectAllAlbums = () => {
    if (selectedAlbumIds.size === pendingAlbumRequests.length) {
      setSelectedAlbumIds(new Set());
    } else {
      setSelectedAlbumIds(new Set(pendingAlbumRequests.map(r => r._id)));
    }
  };

  const selectAllSongs = () => {
    if (selectedSongIds.size === pendingSongRequests.length) {
      setSelectedSongIds(new Set());
    } else {
      setSelectedSongIds(new Set(pendingSongRequests.map(r => r._id)));
    }
  };

  const clearSelections = () => {
    setSelectedAlbumIds(new Set());
    setSelectedSongIds(new Set());
  };

  // Batch approve handler
  const handleBatchApprove = async () => {
    const selectedIds = activeRequestTab === 'albums' ? selectedAlbumIds : selectedSongIds;
    if (selectedIds.size === 0) return;

    setBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const requestId of selectedIds) {
        try {
          if (activeRequestTab === 'albums') {
            const request = pendingAlbumRequests.find(r => r._id === requestId);

            // Fetch album tracks
            let tracks = null;
            if (request?.appleAlbumId) {
              try {
                await musicKitService.initialize();
                const musicKitTracks = await musicKitService.getAlbumTracks(request.appleAlbumId);
                tracks = musicKitTracks.map((track, index) => ({
                  appleSongId: track.id,
                  songName: track.attributes?.name || '',
                  artistName: track.attributes?.artistName || request.artistName,
                  trackNumber: index + 1,
                  durationInMillis: track.attributes?.durationInMillis,
                  isExplicit: track.attributes?.contentRating === 'explicit',
                }));
              } catch (err) {
                console.error('Failed to fetch tracks for batch approval:', err);
              }
            }

            await approveAlbumRequest({ requestId, tracks });
          } else {
            await approveSongRequest({ requestId });
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to approve request ${requestId}:`, err);
          failCount++;
        }
      }

      // Track for undo (only if all succeeded)
      if (failCount === 0 && successCount > 0) {
        setLastBatchAction({
          action: 'approve',
          type: activeRequestTab,
          requestIds: Array.from(selectedIds),
          timestamp: Date.now()
        });
      }

      // Clear selections after batch operation
      clearSelections();

      // Show result toast with undo option
      if (failCount === 0) {
        showToast(
          <span className="flex items-center gap-2">
            {successCount} request{successCount !== 1 ? 's' : ''} approved
            <button
              onClick={() => handleUndoBatch()}
              className="underline font-medium hover:text-green-200"
            >
              Undo
            </button>
          </span>,
          'success',
          5000
        );
      } else {
        showToast(`${successCount} approved, ${failCount} failed`, 'warning');
      }
    } finally {
      setBatchProcessing(false);
    }
  };

  // Batch deny handler
  const handleBatchDeny = async () => {
    const selectedIds = activeRequestTab === 'albums' ? selectedAlbumIds : selectedSongIds;
    if (selectedIds.size === 0) return;

    // Ask for a common denial reason
    const reason = window.prompt(
      `Enter a reason for denying ${selectedIds.size} request${selectedIds.size !== 1 ? 's' : ''} (optional):`,
      ''
    );

    if (reason === null) return; // User cancelled

    setBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const requestId of selectedIds) {
        try {
          if (activeRequestTab === 'albums') {
            await denyAlbumRequest({
              requestId,
              denialReason: reason.trim() || undefined
            });
          } else {
            await denySongRequest({
              requestId,
              denialReason: reason.trim() || undefined
            });
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to deny request ${requestId}:`, err);
          failCount++;
        }
      }

      // Track for undo (only if all succeeded)
      if (failCount === 0 && successCount > 0) {
        setLastBatchAction({
          action: 'deny',
          type: activeRequestTab,
          requestIds: Array.from(selectedIds),
          timestamp: Date.now()
        });
      }

      // Clear selections after batch operation
      clearSelections();

      // Show result toast with undo option
      if (failCount === 0) {
        showToast(
          <span className="flex items-center gap-2">
            {successCount} request{successCount !== 1 ? 's' : ''} denied
            <button
              onClick={() => handleUndoBatch()}
              className="underline font-medium hover:text-green-200"
            >
              Undo
            </button>
          </span>,
          'success',
          5000
        );
      } else {
        showToast(`${successCount} denied, ${failCount} failed`, 'warning');
      }
    } finally {
      setBatchProcessing(false);
    }
  };

  // Undo batch action handler
  const handleUndoBatch = async () => {
    if (!lastBatchAction) return;

    // Only allow undo within 30 seconds
    if (Date.now() - lastBatchAction.timestamp > 30000) {
      showToast('Undo expired (30 second limit)', 'error');
      setLastBatchAction(null);
      return;
    }

    setBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const requestId of lastBatchAction.requestIds) {
        try {
          if (lastBatchAction.action === 'approve') {
            // Undo approval = use undoApproval mutation
            if (lastBatchAction.type === 'albums') {
              await undoAlbumApproval({ requestId });
            } else {
              await undoSongApproval({ requestId });
            }
          } else {
            // Undo denial = use undoDenial mutation
            if (lastBatchAction.type === 'albums') {
              await undoAlbumDenial({ requestId });
            } else {
              await undoSongDenial({ requestId });
            }
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to undo request ${requestId}:`, err);
          failCount++;
        }
      }

      // Clear the last action
      setLastBatchAction(null);

      // Show result
      if (failCount === 0) {
        showToast(`Undid ${successCount} request${successCount !== 1 ? 's' : ''}`, 'success');
      } else {
        showToast(`Undid ${successCount}, ${failCount} failed`, 'warning');
      }
    } finally {
      setBatchProcessing(false);
    }
  };

  // Mark blocked searches as read when viewing the blocked tab
  useEffect(() => {
    if (activeRequestTab === 'blocked' && unreadBlockedSearchesCount > 0) {
      markAllBlockedSearchesAsRead({ userId: user._id });
    }
  }, [activeRequestTab, unreadBlockedSearchesCount]);

  const getKidName = (kidProfileId) => {
    const kid = kidProfiles.find(k => k._id === kidProfileId);
    return kid ? kid.name : 'Unknown';
  };

  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  const getKidProfile = (kidProfileId) => {
    return kidProfiles.find(k => k._id === kidProfileId);
  };

  // Pre-load album tracks in background for faster AI Review
  useEffect(() => {
    const preloadTracks = async () => {
      // Only pre-load for album requests that don't have tracks loaded yet
      const albumsToPreload = pendingAlbumRequests.filter(
        request => request.appleAlbumId && !albumTracks[request.appleAlbumId]
      );

      if (albumsToPreload.length === 0) return;

      try {
        await musicKitService.initialize();

        // Pre-load tracks for each album (limit to first 5 to avoid overwhelming)
        for (const request of albumsToPreload.slice(0, 5)) {
          const albumId = request.appleAlbumId;

          // Skip if already loading or loaded
          if (loadingTracks[albumId] || albumTracks[albumId]) continue;

          try {
            const tracks = await musicKitService.getAlbumTracks(albumId);
            setAlbumTracks(prev => ({ ...prev, [albumId]: tracks }));
          } catch (err) {
            console.error(`Failed to pre-load tracks for album ${albumId}:`, err);
            // Silently fail - user can still load manually if needed
          }
        }
      } catch (err) {
        console.error('Failed to initialize MusicKit for pre-loading:', err);
      }
    };

    // Run pre-load after a short delay to avoid blocking initial render
    const timeoutId = setTimeout(preloadTracks, 1000);
    return () => clearTimeout(timeoutId);
  }, [pendingAlbumRequests, albumTracks, loadingTracks]);

  const getArtworkStatus = (request) => {
    // Create a unique key based on request type
    // For albums: use appleAlbumId
    // For songs: use appleSongId (so song artwork is independent)
    const artworkKey = request.requestType === 'album'
      ? request.appleAlbumId
      : request.appleSongId;

    if (!artworkKey) {
      return false;
    }

    // For album requests, check if already approved
    if (request.requestType === 'album') {
      const album = approvedAlbums.find(a => a.appleAlbumId === artworkKey);
      if (album) {
        return album.hideArtwork || false;
      }
    }

    // Otherwise check local state for unapproved items
    return unapprovedArtworkHidden[artworkKey] || false;
  };

  const toggleArtwork = async (request) => {
    // Create a unique key based on request type
    const artworkKey = request.requestType === 'album'
      ? request.appleAlbumId
      : request.appleSongId;

    if (!artworkKey) {
      console.error('Cannot toggle artwork: missing artwork key', request);
      return;
    }

    console.log('[toggleArtwork] Request:', {
      name: request.requestType === 'album' ? request.albumName : request.songName,
      artworkKey,
      requestType: request.requestType
    });

    const currentStatus = getArtworkStatus(request);

    console.log('[toggleArtwork] Status:', {
      currentStatus,
      willSetTo: !currentStatus
    });

    // For album requests that are already approved, update in database
    if (request.requestType === 'album') {
      const isApproved = approvedAlbums.find(a => a.appleAlbumId === request.appleAlbumId);
      if (isApproved) {
        try {
          await toggleArtworkMutation({
            userId: user._id,
            appleAlbumId: request.appleAlbumId,
            hideArtwork: !currentStatus,
          });
          console.log('[toggleArtwork] Updated approved album in database');
          return;
        } catch (error) {
          console.error('Failed to toggle artwork:', error);
          return;
        }
      }
    }

    // For unapproved items (both albums and songs), just toggle local state
    setUnapprovedArtworkHidden(prev => {
      const newState = {
        ...prev,
        [artworkKey]: !currentStatus
      };
      console.log('[toggleArtwork] New local state:', newState);
      return newState;
    });
  };

  const handleApprove = async (requestId, requestType) => {
    const requestName = requestType === 'album'
      ? pendingAlbumRequests.find(r => r._id === requestId)?.albumName
      : pendingSongRequests.find(r => r._id === requestId)?.songName;

    try {
      if (requestType === 'album') {
        const request = pendingAlbumRequests.find(r => r._id === requestId);

        // Fetch album tracks from MusicKit before approving
        let tracks = null;
        if (request?.appleAlbumId) {
          try {
            await musicKitService.initialize();
            const musicKitTracks = await musicKitService.getAlbumTracks(request.appleAlbumId);

            // Transform to match the expected format
            tracks = musicKitTracks.map((track, index) => ({
              appleSongId: track.id,
              songName: track.attributes?.name || '',
              artistName: track.attributes?.artistName || request.artistName,
              trackNumber: index + 1,
              durationInMillis: track.attributes?.durationInMillis,
              isExplicit: track.attributes?.contentRating === 'explicit',
            }));
          } catch (err) {
            console.error('Failed to fetch album tracks:', err);
            // Continue with approval even if tracks fail to load
          }
        }

        // Approve the request with tracks
        await approveAlbumRequest({ requestId, tracks });

        // If artwork was set to hidden before approval, apply it now
        if (request && unapprovedArtworkHidden[request.appleAlbumId]) {
          setTimeout(async () => {
            try {
              await toggleArtworkMutation({
                userId: user._id,
                appleAlbumId: request.appleAlbumId,
                hideArtwork: true,
              });
            } catch (err) {
              console.error('Failed to apply artwork setting:', err);
            }
          }, 500);

          setUnapprovedArtworkHidden(prev => {
            const updated = { ...prev };
            delete updated[request.appleAlbumId];
            return updated;
          });
        }
      } else {
        // Song request
        await approveSongRequest({ requestId });
      }

      // Show success toast with undo option
      showToast(`${requestName || 'Request'} approved`, 'success', {
        duration: 5000,
        undoAction: async () => {
          try {
            if (requestType === 'album') {
              await undoAlbumApproval({ requestId });
            } else {
              await undoSongApproval({ requestId });
            }
            showToast('Approval undone', 'info');
          } catch (err) {
            console.error('Failed to undo approval:', err);
            showToast('Failed to undo. Please try again.', 'error');
          }
        }
      });
    } catch (error) {
      console.error('Failed to approve request:', error);
      showToast('Failed to approve request. Please try again.', 'error');
    }
  };

  const handleDeny = async (requestId, requestType, requestName, appleAlbumId = null) => {
    // Open denial modal instead of using prompt()
    setDenialData({ requestId, requestType, requestName, appleAlbumId });
    setDenialReason('');
    setDenialModalOpen(true);
  };

  const submitDenial = async () => {
    if (!denialData) return;

    setDenialLoading(true);

    const requestId = denialData.requestId;
    const requestType = denialData.requestType;
    const requestName = denialData.requestName;
    const appleAlbumId = denialData.appleAlbumId;

    try {
      // If denying an album, first remove any individually approved songs from that album
      if (requestType === 'album' && appleAlbumId && albumTracks[appleAlbumId]) {
        const approvedSongsFromAlbum = albumTracks[appleAlbumId].filter(track => approvedTrackIds[track.id]);

        if (approvedSongsFromAlbum.length > 0) {
          // Remove each approved song
          for (const track of approvedSongsFromAlbum) {
            try {
              await removeApprovedSongByAppleId({
                userId: user._id,
                appleSongId: track.id,
              });
              // Clear from local state
              setApprovedTrackIds(prev => {
                const updated = { ...prev };
                delete updated[track.id];
                return updated;
              });
            } catch (err) {
              console.error(`Failed to remove approved song ${track.id}:`, err);
            }
          }
        }
      }

      // Now deny the request
      if (requestType === 'album') {
        await denyAlbumRequest({
          requestId,
          denialReason: denialReason.trim() || undefined
        });
      } else {
        await denySongRequest({
          requestId,
          denialReason: denialReason.trim() || undefined
        });
      }

      // Close modal
      setDenialModalOpen(false);
      setDenialData(null);
      setDenialReason('');

      // Show success toast with undo option
      showToast(`${requestName || 'Request'} denied`, 'success', {
        duration: 5000,
        undoAction: async () => {
          try {
            if (requestType === 'album') {
              await undoAlbumDenial({ requestId });
            } else {
              await undoSongDenial({ requestId });
            }
            showToast('Denial undone', 'info');
          } catch (err) {
            console.error('Failed to undo denial:', err);
            showToast('Failed to undo. Please try again.', 'error');
          }
        }
      });
    } catch (error) {
      console.error('Failed to deny request:', error);
      showToast('Failed to deny request. Please try again.', 'error');
    } finally {
      setDenialLoading(false);
    }
  };

  const handleApproveDenied = async (requestId, requestType, requestName) => {
    try {
      if (requestType === 'album') {
        // Find the request
        const request = deniedAlbumRequests.find(r => r._id === requestId);

        // Fetch album tracks from MusicKit before approving
        let tracks = null;
        if (request?.appleAlbumId) {
          try {
            await musicKitService.initialize();
            const musicKitTracks = await musicKitService.getAlbumTracks(request.appleAlbumId);

            // Transform to match the expected format
            tracks = musicKitTracks.map((track, index) => ({
              appleSongId: track.id,
              songName: track.attributes?.name || '',
              artistName: track.attributes?.artistName || request.artistName,
              trackNumber: index + 1,
              durationInMillis: track.attributes?.durationInMillis,
              isExplicit: track.attributes?.contentRating === 'explicit',
            }));
          } catch (err) {
            console.error('Failed to fetch album tracks:', err);
            // Continue with approval even if tracks fail to load
          }
        }

        await approveDeniedAlbum({ requestId, tracks });
      } else {
        await approveDeniedSong({ requestId });
      }

      showToast(`${requestName || 'Request'} approved`, 'success');
    } catch (error) {
      console.error('Failed to approve denied request:', error);
      showToast('Failed to approve request. Please try again.', 'error');
    }
  };

  const handleDoneReviewing = (requestId, requestName, appleAlbumId) => {
    // Count approved songs
    const approvedSongsCount = albumTracks[appleAlbumId]?.filter(track => approvedTrackIds[track.id])?.length || 0;

    // Open partial approval modal
    setPartialApprovalData({ requestId, requestName, appleAlbumId, approvedSongsCount });
    setPartialApprovalNote('');
    setPartialApprovalModalOpen(true);
  };

  const submitPartialApproval = async () => {
    if (!partialApprovalData) return;

    setPartialApprovalLoading(true);

    try {
      await markAsPartiallyApproved({
        requestId: partialApprovalData.requestId,
        partialApprovalNote: partialApprovalNote.trim() || undefined,
      });

      // Close modal
      setPartialApprovalModalOpen(false);
      setPartialApprovalData(null);
      setPartialApprovalNote('');

      // Show success toast
      showToast(`${partialApprovalData.requestName} marked as reviewed`, 'success');
    } catch (error) {
      console.error('Failed to mark as partially approved:', error);
      showToast('Failed to complete review. Please try again.', 'error');
    } finally {
      setPartialApprovalLoading(false);
    }
  };

  const handleAuthRequired = async () => {
    try {
      await musicKitService.authorize();
      setShowAuthPrompt(false);
    } catch (err) {
      console.error('Authorization failed:', err);
      showToast('Failed to authorize with Apple Music. Please try again.', 'error');
    }
  };

  const handlePlaySong = async (songId, songMeta = null) => {
    const isAuthorized = musicKitService.checkAuthorization();
    if (!isAuthorized) {
      handleAuthRequired();
      return;
    }

    try {
      await musicKitService.playSong(songId, songMeta);
    } catch (err) {
      console.error('Failed to play song:', err);
      showToast('Failed to play song. Please try again.', 'error');
    }
  };

  const toggleAlbumExpansion = async (request) => {
    const albumId = request.appleAlbumId || request._id;

    // If already expanded, collapse it
    if (expandedAlbums[albumId]) {
      setExpandedAlbums(prev => ({ ...prev, [albumId]: false }));
      return;
    }

    // Expand and load tracks if not already loaded
    setExpandedAlbums(prev => ({ ...prev, [albumId]: true }));

    if (!albumTracks[albumId]) {
      setLoadingTracks(prev => ({ ...prev, [albumId]: true }));
      try {
        // First, try to get tracks from database
        const dbTracks = await convex.query(api.songs.getAlbumTracks, {
          userId: user._id,
          appleAlbumId: request.appleAlbumId
        });

        if (dbTracks && dbTracks.length > 0) {
          // Transform database tracks to match the expected format
          const formattedTracks = dbTracks.map(track => ({
            id: track.appleSongId,
            attributes: {
              name: track.songName,
              artistName: track.artistName,
              trackNumber: track.trackNumber,
              durationInMillis: track.durationInMillis,
              contentRating: track.isExplicit ? 'explicit' : null,
            }
          }));
          setAlbumTracks(prev => ({ ...prev, [albumId]: formattedTracks }));
        } else {
          // Fallback to MusicKit API if no tracks in database
          await musicKitService.initialize();
          const tracks = await musicKitService.getAlbumTracks(request.appleAlbumId);
          setAlbumTracks(prev => ({ ...prev, [albumId]: tracks }));
        }
      } catch (err) {
        console.error('Failed to load tracks:', err);
        showToast('Failed to load tracks. Please try again.', 'error');
      } finally {
        setLoadingTracks(prev => ({ ...prev, [albumId]: false }));
      }
    }
  };

  const handlePlayTrack = async (tracks, trackIndex) => {
    const isAuthorized = musicKitService.checkAuthorization();
    if (!isAuthorized) {
      handleAuthRequired();
      return;
    }

    try {
      await musicKitService.playApprovedSongs(tracks, trackIndex);
    } catch (err) {
      console.error('Failed to play track:', err);
      showToast(err.message || 'Failed to play track', 'error');
    }
  };

  const formatDuration = (durationMs) => {
    if (!durationMs) return '--:--';
    const totalSeconds = Math.floor(durationMs / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Combine all requests with type indicator, filtering, and sorting
  const allRequests = [
    ...pendingAlbumRequests.map(r => ({ ...r, requestType: 'album' })),
    ...pendingSongRequests.map(r => ({ ...r, requestType: 'song' }))
  ]
    .filter(r => filterByKid === 'all' || r.kidProfileId === filterByKid)
    .sort((a, b) => sortOrder === 'newest' ? b.requestedAt - a.requestedAt : a.requestedAt - b.requestedAt);

  const allDeniedRequests = [
    ...deniedAlbumRequests.map(r => ({ ...r, requestType: 'album' })),
    ...deniedSongRequests.map(r => ({ ...r, requestType: 'song' }))
  ].sort((a, b) => b.reviewedAt - a.reviewedAt);

  if (allRequests.length === 0 && allDeniedRequests.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon="checkmark"
          title="All Caught Up!"
          description="No pending requests from your kids. They'll appear here when your kids request new music."
        />
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 max-w-lg mx-auto">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800">How do kids request music?</p>
              <p className="text-xs text-blue-600 mt-1">When your kids search for music that's not in their library, they can tap "Request" to send it here for your review.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {ToastContainer}
      <div className="space-y-4">
        {/* Persistent Player - sticks to top */}
        <PersistentPlayer onAuthRequired={handleAuthRequired} />

      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Music Requests</h2>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Review and approve content requested by your kids</p>
          </div>
        </div>

        {/* Show Denied Button - Full width on mobile, positioned nicely */}
        {allDeniedRequests.length > 0 && (
          <button
            onClick={() => setShowDeniedArchive(!showDeniedArchive)}
            className="w-full sm:w-auto mt-3 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition border border-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            {showDeniedArchive ? 'Hide' : 'Show'} Denied Archive ({allDeniedRequests.length})
          </button>
        )}
      </div>

      {/* Denied Archive Section */}
      {showDeniedArchive && allDeniedRequests.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <h3 className="text-lg font-bold text-red-900">Denied Requests Archive</h3>
            <span className="text-sm text-red-600">({allDeniedRequests.length})</span>
          </div>
          <p className="text-sm text-red-700 mb-4">
            Previously denied content. Click "Approve Anyway" to add to library.
          </p>

          <div className="space-y-3">
            {allDeniedRequests.map((request) => (
              <div
                key={request._id}
                className="bg-white rounded-lg border border-red-200 p-4 flex items-center gap-4"
              >
                {/* Artwork */}
                <div className="flex-shrink-0">
                  {request.artworkUrl ? (
                    <img
                      src={request.artworkUrl.replace('{w}', '80').replace('{h}', '80')}
                      alt={request.albumName || request.songName}
                      className="w-16 h-16 rounded object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded">
                      {request.requestType === 'album' ? 'ALBUM' : 'SONG'}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded">
                      DENIED
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900 truncate">
                    {request.albumName || request.songName}
                  </p>
                  <p className="text-sm text-gray-600 truncate">{request.artistName}</p>
                  {request.denialReason && (
                    <p className="text-xs text-red-600 mt-1 italic">
                      Reason: {request.denialReason}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Requested by {getKidName(request.kidProfileId)} • Denied {new Date(request.reviewedAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Approve Button */}
                <button
                  onClick={() => handleApproveDenied(request._id, request.requestType, request.albumName || request.songName)}
                  className="flex-shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition text-sm"
                >
                  Approve Anyway
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-4">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => { setActiveRequestTab('albums'); clearSelections(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeRequestTab === 'albums'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Albums ({pendingAlbumRequests.filter(r => filterByKid === 'all' || r.kidProfileId === filterByKid).length})
          </button>
          <button
            onClick={() => { setActiveRequestTab('songs'); clearSelections(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeRequestTab === 'songs'
                ? 'bg-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Songs ({pendingSongRequests.filter(r => filterByKid === 'all' || r.kidProfileId === filterByKid).length})
          </button>
          <button
            onClick={() => { setActiveRequestTab('blocked'); clearSelections(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition relative ${
              activeRequestTab === 'blocked'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Blocked ({blockedSearches.length})
            {unreadBlockedSearchesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {unreadBlockedSearchesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      {activeRequestTab !== 'blocked' && (pendingAlbumRequests.length > 0 || pendingSongRequests.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Filter by Kid */}
          {kidProfiles.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Filter:</span>
              <select
                value={filterByKid}
                onChange={(e) => { setFilterByKid(e.target.value); clearSelections(); }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="all">All kids</option>
                {kidProfiles.map(kid => (
                  <option key={kid._id} value={kid._id}>{kid.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Order */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort:</span>
            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 flex items-center gap-1.5"
            >
              {sortOrder === 'newest' ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  Newest first
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                  </svg>
                  Oldest first
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Batch Action Bar - Shows when items are selected or when there are requests */}
      {activeRequestTab !== 'blocked' && currentRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Select All Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  activeRequestTab === 'albums'
                    ? selectedAlbumIds.size === pendingAlbumRequests.length && pendingAlbumRequests.length > 0
                    : selectedSongIds.size === pendingSongRequests.length && pendingSongRequests.length > 0
                }
                onChange={activeRequestTab === 'albums' ? selectAllAlbums : selectAllSongs}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Select All ({activeRequestTab === 'albums' ? pendingAlbumRequests.length : pendingSongRequests.length})
              </span>
            </label>

            {/* Selection Count */}
            {(selectedAlbumIds.size > 0 || selectedSongIds.size > 0) && (
              <span className="text-sm text-gray-500">
                {activeRequestTab === 'albums' ? selectedAlbumIds.size : selectedSongIds.size} selected
              </span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Batch Action Buttons - Only show when items are selected */}
            {((activeRequestTab === 'albums' && selectedAlbumIds.size > 0) ||
              (activeRequestTab === 'songs' && selectedSongIds.size > 0)) && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setBatchConfirmAction('approve');
                    setBatchConfirmOpen(true);
                  }}
                  disabled={batchProcessing}
                  className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  {batchProcessing ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  Approve All
                </button>
                <button
                  onClick={() => {
                    setBatchConfirmAction('deny');
                    setBatchConfirmOpen(true);
                  }}
                  disabled={batchProcessing}
                  className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 text-gray-700 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Deny All
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Show blocked searches when blocked tab is active */}
        {activeRequestTab === 'blocked' && (
          <>
            {blockedSearches.length === 0 ? (
              <EmptyState
                icon="checkmark"
                title="No Blocked Searches"
                description="Your kids haven't tried searching for inappropriate content. Great job!"
              />
            ) : (
              <>
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-orange-900 font-medium">These searches were automatically blocked</p>
                      <p className="text-xs text-orange-700 mt-1">Review what your kids tried to search for and use it as an opportunity for conversation.</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to clear all blocked searches? This cannot be undone.')) {
                          try {
                            await clearAllBlockedSearches({ userId: user._id });
                            showToast('All blocked searches cleared', 'success');
                          } catch (err) {
                            console.error('Failed to clear searches:', err);
                            showToast('Failed to clear searches. Please try again.', 'error');
                          }
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg transition"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Blocked searches list - grouped by date */}
                {(() => {
                  const groups = groupBlockedByDate(blockedSearches);
                  const renderSearchCard = (search) => (
                    <div key={search._id} className="bg-white rounded-xl shadow-sm border border-red-100 p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Icon */}
                        <div className="flex-shrink-0 mx-auto sm:mx-0">
                          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 text-center sm:text-left">
                          <div className="flex flex-wrap items-center gap-2 mb-2 justify-center sm:justify-start">
                            <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                              BLOCKED
                            </span>
                            {isNewRequest(search.searchedAt) && (
                              <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                                NEW
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1 break-words">
                            "{search.searchQuery}"
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-semibold">{search.kidName}</span> • {getRelativeTime(search.searchedAt)}
                          </p>
                          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 inline-block mb-3">
                            {search.blockedReason}
                          </p>

                          {/* Conversation Starter */}
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-2">
                            <p className="text-xs font-medium text-blue-800 flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              Talk to {search.kidName}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              "I noticed you searched for this. Can you tell me why you were curious about it?"
                            </p>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <div className="flex-shrink-0 flex items-start justify-center sm:justify-start">
                          <button
                            onClick={async () => {
                              try {
                                await deleteBlockedSearch({ searchId: search._id });
                                showToast('Blocked search removed', 'success');
                              } catch (err) {
                                console.error('Failed to delete search:', err);
                                showToast('Failed to remove search', 'error');
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Remove this record"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <>
                      {groups.today.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Today</h4>
                          {groups.today.map(renderSearchCard)}
                        </div>
                      )}
                      {groups.yesterday.length > 0 && (
                        <div className="space-y-3 mt-6">
                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Yesterday</h4>
                          {groups.yesterday.map(renderSearchCard)}
                        </div>
                      )}
                      {groups.thisWeek.length > 0 && (
                        <div className="space-y-3 mt-6">
                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">This Week</h4>
                          {groups.thisWeek.map(renderSearchCard)}
                        </div>
                      )}
                      {groups.earlier.length > 0 && (
                        <div className="space-y-3 mt-6">
                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Earlier</h4>
                          {groups.earlier.map(renderSearchCard)}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </>
        )}

        {/* Empty state for albums tab */}
        {activeRequestTab === 'albums' && allRequests.filter(r => r.requestType === 'album').length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No album requests</h3>
            <p className="text-gray-600 text-sm">
              {filterByKid !== 'all'
                ? `No pending album requests from ${kidProfiles.find(k => k._id === filterByKid)?.name || 'this kid'}.`
                : 'When your kids request albums, they\'ll appear here for your review.'}
            </p>
          </div>
        )}

        {/* Empty state for songs tab */}
        {activeRequestTab === 'songs' && allRequests.filter(r => r.requestType === 'song').length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No song requests</h3>
            <p className="text-gray-600 text-sm">
              {filterByKid !== 'all'
                ? `No pending song requests from ${kidProfiles.find(k => k._id === filterByKid)?.name || 'this kid'}.`
                : 'When your kids request individual songs, they\'ll appear here.'}
            </p>
          </div>
        )}

        {/* Show regular requests when not on blocked tab */}
        {activeRequestTab !== 'blocked' && allRequests
          .filter(request => {
            if (activeRequestTab === 'albums') return request.requestType === 'album';
            if (activeRequestTab === 'songs') return request.requestType === 'song';
            return false;
          })
          .map((request) => (
          <div
            key={request._id}
            className={`bg-white rounded-xl shadow-sm border p-4 sm:p-6 hover:shadow-md transition-all ${
              (request.requestType === 'album' && selectedAlbumIds.has(request._id)) ||
              (request.requestType === 'song' && selectedSongIds.has(request._id))
                ? 'border-purple-400 ring-2 ring-purple-100'
                : 'border-gray-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Checkbox for batch selection */}
              <div className="flex-shrink-0 flex items-start pt-1">
                <input
                  type="checkbox"
                  checked={
                    request.requestType === 'album'
                      ? selectedAlbumIds.has(request._id)
                      : selectedSongIds.has(request._id)
                  }
                  onChange={() => {
                    request.requestType === 'album'
                      ? toggleAlbumSelection(request._id)
                      : toggleSongSelection(request._id);
                  }}
                  className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              {/* Album Artwork */}
              <div className="flex-shrink-0 relative group">
                {getArtworkStatus(request) ? (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex flex-col items-center justify-center shadow-md">
                    <svg className="w-10 h-10 text-white/70 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <span className="text-white/70 text-xs font-medium">Hidden</span>
                  </div>
                ) : request.artworkUrl ? (
                  <img
                    src={request.artworkUrl.replace('{w}', '300').replace('{h}', '300')}
                    alt={request.albumName || request.songName}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg shadow-md object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                    <svg className="w-12 h-12 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
                {/* Toggle Artwork Button - always show */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleArtwork(request);
                  }}
                  className="absolute top-1 right-1 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-md transition-all z-10"
                  title={getArtworkStatus(request) ? 'Show artwork' : 'Hide artwork'}
                >
                  {getArtworkStatus(request) ? (
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Request Info */}
              <div className="flex-1 min-w-0">
                <div className="mb-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {/* NEW Badge */}
                    {isNewRequest(request.requestedAt) && (
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
                        NEW
                      </span>
                    )}
                    {/* EXPLICIT Badge */}
                    {isExplicit(request) && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        EXPLICIT
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.requestType === 'album' ? request.albumName : request.songName}
                    </h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      request.requestType === 'album'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {request.requestType === 'album' ? 'Album' : 'Song'}
                    </span>
                  </div>
                  <p className="text-gray-600">{request.artistName}</p>
                  {request.requestType === 'song' && request.albumName && (
                    <p className="text-sm text-gray-500 mt-1">from {request.albumName}</p>
                  )}
                </div>

                {/* Kid Info */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-500">Requested by:</span>
                  {(() => {
                    const kid = getKidProfile(request.kidProfileId);
                    return kid ? (
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white p-1.5`}>
                          {getAvatarIcon(kid.avatar)}
                        </div>
                        <span className="font-medium text-gray-900">{kid.name}</span>
                      </div>
                    ) : (
                      <span className="font-medium text-gray-900">Unknown</span>
                    );
                  })()}
                </div>

                {/* Kid's Note */}
                {request.kidNote && (
                  <div className="mb-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-xs font-medium text-purple-700 mb-0.5">Why they want this:</p>
                        <p className="text-sm text-purple-900">&ldquo;{request.kidNote}&rdquo;</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamp with relative time */}
                <p className="text-xs text-gray-500 mb-4 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Requested {getRelativeTime(request.requestedAt)}
                  {!isNewRequest(request.requestedAt) && Date.now() - request.requestedAt > 86400000 * 3 && (
                    <span className="text-orange-600 font-medium">• Waiting {Math.floor((Date.now() - request.requestedAt) / 86400000)} days</span>
                  )}
                </p>

                {/* Action Buttons - Simplified with More menu */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Primary Actions */}
                  {request.requestType === 'album' && expandedAlbums[request.appleAlbumId] && albumTracks[request.appleAlbumId]?.some(track => approvedTrackIds[track.id]) ? (
                    <button
                      onClick={() => handleDoneReviewing(request._id, request.albumName, request.appleAlbumId)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Done
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApprove(request._id, request.requestType)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => handleDeny(
                      request._id,
                      request.requestType,
                      request.requestType === 'album' ? request.albumName : request.songName,
                      request.requestType === 'album' ? request.appleAlbumId : null
                    )}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Deny
                  </button>

                  {/* More Menu */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMoreMenu(openMoreMenu === request._id ? null : request._id);
                      }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition flex items-center gap-1"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {openMoreMenu === request._id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        {/* View Tracks - Albums only */}
                        {request.requestType === 'album' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAlbumExpansion(request);
                              setOpenMoreMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                            {expandedAlbums[request.appleAlbumId] ? 'Hide Tracks' : 'View Tracks'}
                          </button>
                        )}

                        {/* Play - Songs only */}
                        {request.requestType === 'song' && request.appleSongId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaySong(request.appleSongId, { songName: request.songName, artistName: request.artistName });
                              setOpenMoreMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Play Preview
                          </button>
                        )}

                        {/* Lyrics - Songs only */}
                        {request.requestType === 'song' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLyricsTrack({ name: request.songName, artistName: request.artistName });
                              setLyricsModalOpen(true);
                              setOpenMoreMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View Lyrics
                          </button>
                        )}

                        {/* AI Review */}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setOpenMoreMenu(null);
                            if (request.requestType === 'song') {
                              setReviewingContent({
                                type: 'song',
                                appleTrackId: request.appleSongId,
                                appleAlbumId: request.appleAlbumId,
                                trackName: request.songName,
                                albumName: request.albumName,
                                artistName: request.artistName,
                              });
                              setReviewModalOpen(true);
                            } else {
                              // Load tracks and album details
                              let tracks = albumTracks[request.appleAlbumId];
                              let albumDetails = null;
                              if (!tracks) {
                                setLoadingTracks(prev => ({ ...prev, [request.appleAlbumId]: true }));
                                try {
                                  await musicKitService.initialize();
                                  const [tracksData, albumData] = await Promise.all([
                                    musicKitService.getAlbumTracks(request.appleAlbumId),
                                    musicKitService.getAlbum(request.appleAlbumId)
                                  ]);
                                  tracks = tracksData;
                                  albumDetails = albumData;
                                  setAlbumTracks(prev => ({ ...prev, [request.appleAlbumId]: tracks }));
                                } catch (err) {
                                  console.error('Failed to load album data:', err);
                                  showToast('Failed to load album details.', 'error');
                                  setLoadingTracks(prev => ({ ...prev, [request.appleAlbumId]: false }));
                                  return;
                                } finally {
                                  setLoadingTracks(prev => ({ ...prev, [request.appleAlbumId]: false }));
                                }
                              }
                              setOverviewAlbumData({
                                appleAlbumId: request.appleAlbumId,
                                albumName: request.albumName,
                                artistName: request.artistName,
                                editorialNotes: albumDetails?.attributes?.editorialNotes,
                                trackList: tracks?.map(t => ({
                                  name: t.attributes?.name,
                                  artistName: t.attributes?.artistName,
                                  contentRating: t.attributes?.contentRating || null
                                })) || []
                              });
                              setOverviewModalOpen(true);
                            }
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          disabled={loadingTracks[request.appleAlbumId]}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          {loadingTracks[request.appleAlbumId] ? 'Loading...' : 'AI Review'}
                        </button>

                        {/* Hide Artwork */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleArtwork(request);
                            setOpenMoreMenu(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          {getArtworkStatus(request) ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Show Artwork
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                              Hide Artwork
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Expanded Tracks Section - Only for Albums */}
            {request.requestType === 'album' && expandedAlbums[request.appleAlbumId] && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                  Album Tracks
                </h4>

                {loadingTracks[request.appleAlbumId] ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="w-8 h-8 animate-spin text-purple-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : albumTracks[request.appleAlbumId] ? (
                  <div className="space-y-2">
                    {albumTracks[request.appleAlbumId].map((track, index) => (
                      <div
                        key={track.id}
                        className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                      >
                        {/* Track Info Row */}
                        <div className="flex items-center gap-2 mb-2">
                          {/* Track Number */}
                          <div className="w-6 text-center flex-shrink-0">
                            <span className="text-xs text-gray-500 font-semibold">{index + 1}</span>
                          </div>

                          {/* Track Name */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {track.attributes?.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatDuration(track.attributes?.durationInMillis)}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons - Mobile: Stack vertically, Desktop: Single row */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:ml-8">
                          {/* Preview Actions - Mobile: Full width row, Desktop: Left side */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handlePlayTrack(albumTracks[request.appleAlbumId], index)}
                              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                              Play
                            </button>
                            <button
                              onClick={() => {
                                setLyricsTrack({ name: track.attributes?.name, artistName: track.attributes?.artistName });
                                setLyricsModalOpen(true);
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Lyrics
                            </button>
                            <button
                              onClick={() => {
                                setReviewingContent({
                                  type: 'song',
                                  appleTrackId: track.id,
                                  appleAlbumId: request.appleAlbumId,
                                  trackName: track.attributes?.name,
                                  albumName: request.albumName,
                                  artistName: request.artistName,
                                });
                                setReviewModalOpen(true);
                              }}
                              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              AI Review
                            </button>
                          </div>

                          {/* Spacer - Desktop only */}
                          <div className="hidden sm:block sm:flex-1"></div>

                          {/* Decision Actions - Mobile: Full width, Desktop: Right side */}
                          <div className="flex items-center gap-1.5">
                            {approvedTrackIds[track.id] ? (
                              // Unapprove button (when song is already approved)
                              <button
                                onClick={async () => {
                                  try {
                                    await removeApprovedSongByAppleId({
                                      userId: user._id,
                                      appleSongId: track.id,
                                    });
                                    setApprovedTrackIds(prev => {
                                      const updated = { ...prev };
                                      delete updated[track.id];
                                      return updated;
                                    });
                                    showToast('Song removed from library', 'success');
                                  } catch (err) {
                                    showToast('Failed to remove song', 'error');
                                  }
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Approved
                              </button>
                            ) : (
                              // Approve button (when song is not approved)
                              <button
                                onClick={async () => {
                                  try {
                                    await approveSong({
                                      userId: user._id,
                                      kidProfileId: request.kidProfileId,
                                      appleSongId: track.id,
                                      songName: track.attributes?.name,
                                      artistName: track.attributes?.artistName,
                                      albumName: request.albumName,
                                      artworkUrl: request.artworkUrl,
                                    });
                                    setApprovedTrackIds(prev => ({ ...prev, [track.id]: true }));
                                    showToast('Song approved', 'success');
                                  } catch (err) {
                                    showToast('Failed to approve', 'error');
                                  }
                                }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition shadow-sm"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Approve
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (confirm(`Remove "${track.attributes?.name}"?`)) {
                                  setAlbumTracks(prev => ({
                                    ...prev,
                                    [request.appleAlbumId]: prev[request.appleAlbumId].filter(t => t.id !== track.id)
                                  }));
                                }
                              }}
                              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-red-100 hover:text-red-700 rounded-lg transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    Failed to load tracks
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI Content Review Modal */}
      {reviewModalOpen && reviewingContent && (
        <ContentReviewModal
          isOpen={reviewModalOpen}
          content={{
            type: reviewingContent.type,
            appleSongId: reviewingContent.appleTrackId,
            appleAlbumId: reviewingContent.appleAlbumId,
            songName: reviewingContent.trackName,
            albumName: reviewingContent.albumName,
            artistName: reviewingContent.artistName,
          }}
          onClose={() => {
            setReviewModalOpen(false);
            setReviewingContent(null);
          }}
        />
      )}

      {/* Auth Prompt Modal */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect to Apple Music</h3>
              <p className="text-gray-600 mb-6">
                Sign in with your Apple Music account to preview songs before approving them.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAuthPrompt(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAuthRequired}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lyrics Modal */}
      <LyricsModal
        isOpen={lyricsModalOpen}
        onClose={() => setLyricsModalOpen(false)}
        trackName={lyricsTrack?.name}
        artistName={lyricsTrack?.artistName}
      />

      {/* Album Overview Modal */}
      <AlbumOverviewModal
        isOpen={overviewModalOpen}
        onClose={() => {
          setOverviewModalOpen(false);
          setOverviewAlbumData(null);
        }}
        albumData={overviewAlbumData}
      />

      {/* Denial Reason Modal */}
      {denialModalOpen && denialData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Why are you denying this {denialData.requestType}?
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Your message will help <span className="font-medium">your child</span> understand your decision.
              </p>
              <p className="text-gray-800 font-medium mb-2">
                "{denialData.requestName}"
              </p>
            </div>

            <div className="mb-6">
              {/* Quick Deny Presets */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick responses
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickDenyReasons.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setDenialReason(reason)}
                      className={`px-3 py-1.5 text-sm rounded-full border transition ${
                        denialReason === reason
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom reason (optional)
              </label>
              <textarea
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                placeholder="e.g., This music has lyrics that don't match our family values..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                You can deny without a reason, but a kind explanation helps your child learn.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDenialModalOpen(false);
                  setDenialData(null);
                  setDenialReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                disabled={denialLoading}
              >
                Cancel
              </button>
              <button
                onClick={submitDenial}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={denialLoading}
              >
                {denialLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Denying...
                  </>
                ) : (
                  'Deny Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Approval Modal */}
      {partialApprovalModalOpen && partialApprovalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Complete Review
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                You've approved <span className="font-semibold text-blue-600">{partialApprovalData.approvedSongsCount} song{partialApprovalData.approvedSongsCount !== 1 ? 's' : ''}</span> from this album. Your child will be notified.
              </p>
              <p className="text-gray-800 font-medium mb-2">
                "{partialApprovalData.requestName}"
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to your child (optional)
              </label>
              <textarea
                value={partialApprovalNote}
                onChange={(e) => setPartialApprovalNote(e.target.value)}
                placeholder="e.g., I approved a few songs from this album. Some tracks had content I wasn't comfortable with..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Help your child understand why only some songs were approved.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPartialApprovalModalOpen(false);
                  setPartialApprovalData(null);
                  setPartialApprovalNote('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                disabled={partialApprovalLoading}
              >
                Cancel
              </button>
              <button
                onClick={submitPartialApproval}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={partialApprovalLoading}
              >
                {partialApprovalLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Completing...
                  </>
                ) : (
                  'Complete Review'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Confirmation Modal */}
      {batchConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="mb-6">
              <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${
                batchConfirmAction === 'approve' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {batchConfirmAction === 'approve' ? (
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                {batchConfirmAction === 'approve' ? 'Approve' : 'Deny'} {activeRequestTab === 'albums' ? selectedAlbumIds.size : selectedSongIds.size} {activeRequestTab}?
              </h3>
              <p className="text-gray-600 text-center text-sm">
                {batchConfirmAction === 'approve' ? (
                  <>
                    This will add {activeRequestTab === 'albums' ? selectedAlbumIds.size : selectedSongIds.size} {activeRequestTab} to your kids' library.
                    {activeRequestTab === 'albums' && (
                      <span className="block mt-1 text-gray-500">
                        (Including all tracks from each album)
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    This will deny {activeRequestTab === 'albums' ? selectedAlbumIds.size : selectedSongIds.size} {activeRequestTab} and notify your kids.
                  </>
                )}
              </p>
            </div>

            {/* Selected items preview */}
            <div className="bg-gray-50 rounded-lg p-3 mb-6 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-gray-500 mb-2">Selected items:</p>
              <div className="space-y-1">
                {activeRequestTab === 'albums'
                  ? pendingAlbumRequests
                      .filter(r => selectedAlbumIds.has(r._id))
                      .map(r => (
                        <div key={r._id} className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-900 truncate">{r.albumName}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600 truncate">{r.artistName}</span>
                        </div>
                      ))
                  : pendingSongRequests
                      .filter(r => selectedSongIds.has(r._id))
                      .map(r => (
                        <div key={r._id} className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-900 truncate">{r.songName}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600 truncate">{r.artistName}</span>
                        </div>
                      ))
                }
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setBatchConfirmOpen(false);
                  setBatchConfirmAction(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                disabled={batchProcessing}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setBatchConfirmOpen(false);
                  if (batchConfirmAction === 'approve') {
                    await handleBatchApprove();
                  } else {
                    await handleBatchDeny();
                  }
                  setBatchConfirmAction(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  batchConfirmAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
                disabled={batchProcessing}
              >
                {batchProcessing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    {batchConfirmAction === 'approve' ? 'Approve All' : 'Deny All'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

export default AlbumRequests;
