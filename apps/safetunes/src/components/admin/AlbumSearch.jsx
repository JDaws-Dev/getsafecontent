import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import musicKitService from '../../config/musickit';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import LyricsModal from './LyricsModal';
import { useToast } from '../common/Toast';
import { backfillAlbumTracks } from '../../utils/backfillAlbumTracks';

function AlbumSearch({
  user,
  persistedSearchQuery = '',
  persistedSearchResults = [],
  onSearchQueryChange = () => {},
  onSearchResultsChange = () => {}
}) {
  const { showToast, ToastContainer } = useToast();
  const [searchQuery, setSearchQuery] = useState(persistedSearchQuery);
  const [searchResults, setSearchResults] = useState(persistedSearchResults);
  const [isSearching, setIsSearching] = useState(false);

  // Helper functions for avatar display
  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  // Sync with persisted state when it changes externally
  useEffect(() => {
    setSearchQuery(persistedSearchQuery);
  }, [persistedSearchQuery]);

  useEffect(() => {
    setSearchResults(persistedSearchResults);
  }, [persistedSearchResults]);
  const [isMusicKitReady, setIsMusicKitReady] = useState(false);
  const [error, setError] = useState('');
  const [selectedKids, setSelectedKids] = useState({}); // { albumId: [kidProfileId1, kidProfileId2, ...] }
  const [showKidSelector, setShowKidSelector] = useState(null); // albumId currently being selected
  const [showSongKidSelector, setShowSongKidSelector] = useState(null); // songId currently being selected for approval
  const [selectedSongKids, setSelectedSongKids] = useState({}); // { songId: [kidProfileId1, kidProfileId2, ...] }
  const [lyricsModalOpen, setLyricsModalOpen] = useState(false);
  const [lyricsTrack, setLyricsTrack] = useState(null);
  const [searchType, setSearchType] = useState('albums'); // 'albums' or 'songs'
  const [selectedAlbum, setSelectedAlbum] = useState(null); // For preview modal
  const [albumDetail, setAlbumDetail] = useState(null); // For album detail view with tracks
  const [loadingAlbumDetail, setLoadingAlbumDetail] = useState(false);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [hideArtworkFor, setHideArtworkFor] = useState({}); // { albumId/songId: boolean }
  const [hideSongArtworkFor, setHideSongArtworkFor] = useState({}); // { songId: boolean }
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);

  // Convex hooks
  const approvedAlbums = useQuery(api.albums.getApprovedAlbums,
    user ? { userId: user._id } : 'skip'
  );
  const approvedSongs = useQuery(api.songs.getApprovedSongs,
    user ? { userId: user._id } : 'skip'
  );
  const deniedAlbumRequests = useQuery(api.albumRequests.getDeniedRequests,
    user ? { userId: user._id } : 'skip'
  );
  const deniedSongRequests = useQuery(api.songRequests.getDeniedSongRequests,
    user ? { userId: user._id } : 'skip'
  );
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles,
    user ? { userId: user._id } : 'skip'
  );
  const approveAlbum = useMutation(api.albums.approveAlbum);
  const removeAlbum = useMutation(api.albums.removeApprovedAlbum);
  const approveSong = useMutation(api.songs.approveSong);
  const approveDeniedAlbum = useMutation(api.albumRequests.approveDeniedRequest);
  const approveDeniedSong = useMutation(api.songRequests.approveDeniedSongRequest);
  const toggleAlbumFeatured = useMutation(api.featured.toggleAlbumFeatured);
  const toggleSongFeatured = useMutation(api.featured.toggleSongFeatured);

  useEffect(() => {
    // Initialize MusicKit on component mount
    const initMusicKit = async () => {
      try {
        await musicKitService.initialize();
        setIsMusicKitReady(true);
      } catch (err) {
        console.error('Failed to initialize MusicKit:', err);
        setIsMusicKitReady(false);
      }
    };

    initMusicKit();

    // Load search history from localStorage
    const savedHistory = localStorage.getItem('musicSearchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (err) {
        console.error('Failed to load search history:', err);
      }
    }
  }, []);

  const handleSearch = async (e, loadMore = false, customOffset = null) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const currentOffset = customOffset !== null ? customOffset : (loadMore ? offset : 0);

    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
      setError('');
      setShowSearchHistory(false);

      // Save to search history
      const newHistory = [
        { query: searchQuery, type: searchType, timestamp: Date.now() },
        ...searchHistory.filter(h => !(h.query === searchQuery && h.type === searchType))
      ].slice(0, 10); // Keep only last 10 searches
      setSearchHistory(newHistory);
      localStorage.setItem('musicSearchHistory', JSON.stringify(newHistory));
    }

    try {
      if (!isMusicKitReady) {
        // Fallback to placeholder data if MusicKit is not configured
        showPlaceholderResults();
        return;
      }

      // Search Apple Music using MusicKit
      const results = await musicKitService.search(searchQuery, {
        types: searchType,
        limit: 25, // Apple Music API maximum limit
        offset: currentOffset,
      });

      // Handle both albums and songs
      if (searchType === 'albums' && results.data?.results?.albums?.data) {
        const albums = results.data.results.albums.data.map((album) => {
          return {
            type: 'album',
            id: album.id,
            name: album.attributes.name,
            artist: album.attributes.artistName,
            artwork: album.attributes.artwork,
            artworkUrl: album.attributes.artwork
              ? album.attributes.artwork.url
                  .replace('{w}', '300')
                  .replace('{h}', '300')
              : null,
            year: album.attributes.releaseDate?.substring(0, 4) || 'N/A',
            trackCount: album.attributes.trackCount || 0,
            genreNames: album.attributes.genreNames || [],
            contentRating: album.attributes.contentRating,
            previewUrl: album.attributes.previews?.[0]?.url,
          };
        });

        if (loadMore) {
          setSearchResults(prev => {
            const combined = [...prev, ...albums];
            onSearchResultsChange(combined);
            return combined;
          });
        } else {
          setSearchResults(albums);
          onSearchResultsChange(albums);
        }

        // Check if there are more results
        const hasMoreResults = albums.length === 25;
        setHasMore(hasMoreResults);
        // Update offset for next load
        setOffset(currentOffset + 25);
      } else if (searchType === 'songs' && results.data?.results?.songs?.data) {
        const songs = results.data.results.songs.data.map((song) => ({
          type: 'song',
          id: song.id,
          name: song.attributes.name,
          artist: song.attributes.artistName,
          albumName: song.attributes.albumName,
          artwork: song.attributes.artwork,
          artworkUrl: song.attributes.artwork
            ? song.attributes.artwork.url
                .replace('{w}', '300')
                .replace('{h}', '300')
            : null,
          year: song.attributes.releaseDate?.substring(0, 4) || 'N/A',
          durationInMillis: song.attributes.durationInMillis,
          genreNames: song.attributes.genreNames || [],
          contentRating: song.attributes.contentRating,
          previewUrl: song.attributes.previews?.[0]?.url,
          isrc: song.attributes.isrc,
        }));

        if (loadMore) {
          setSearchResults(prev => {
            const combined = [...prev, ...songs];
            onSearchResultsChange(combined);
            return combined;
          });
        } else {
          setSearchResults(songs);
          onSearchResultsChange(songs);
        }

        // Check if there are more results
        const hasMoreResults = songs.length === 25;
        setHasMore(hasMoreResults);
        // Update offset for next load
        setOffset(currentOffset + 25);
      } else {
        console.log('No results. Full structure:', JSON.stringify(results, null, 2));
        if (!loadMore) {
          setSearchResults([]);
          onSearchResultsChange([]);
        }
        setHasMore(false);
      }
    } catch (err) {
      console.error('Search failed:', err);
      console.error('Error details:', err.message, err.stack);
      setError(`Search failed: ${err.message}`);
      if (!loadMore) {
        // Fallback to placeholder data on error
        showPlaceholderResults();
      }
      setHasMore(false);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  const loadMoreResults = () => {
    if (!isLoadingMore && hasMore) {
      handleSearch(null, true);
    }
  };

  const showPlaceholderResults = () => {
    setSearchResults([
      {
        id: 'demo-1',
        name: 'Worship Songs for Kids',
        artist: 'Various Artists',
        color: 'from-purple-400 to-pink-400',
        year: '2023',
        trackCount: 12,
      },
      {
        id: 'demo-2',
        name: 'Classical Music Collection',
        artist: 'Mozart & Friends',
        color: 'from-blue-400 to-cyan-400',
        year: '2024',
        trackCount: 10,
      },
      {
        id: 'demo-3',
        name: 'Fun Learning Songs',
        artist: 'Kids Education Band',
        color: 'from-green-400 to-emerald-400',
        year: '2023',
        trackCount: 15,
      },
      {
        id: 'demo-4',
        name: 'Peaceful Piano',
        artist: 'Piano Relaxation',
        color: 'from-orange-400 to-amber-400',
        year: '2024',
        trackCount: 8,
      },
    ]);
    setIsSearching(false);
  };

  const handleAlbumClick = async (album) => {
    if (album.type === 'song') {
      // For songs, just show preview modal
      setSelectedAlbum(album);
      return;
    }

    // For albums, fetch tracks using the dedicated tracks endpoint
    setLoadingAlbumDetail(true);
    setError(''); // Clear any previous errors
    try {
      console.log('=== FETCHING TRACKS FOR ALBUM ===');
      console.log('Album:', album);
      console.log('Album ID:', album.id);

      const tracks = await musicKitService.getAlbumTracks(album.id);

      console.log('=== RECEIVED TRACKS ===');
      console.log('Tracks array:', tracks);
      console.log('Number of tracks:', tracks.length);
      console.log('First track raw:', tracks[0]);

      const parsedTracks = tracks.map((track) => {
        console.log('Parsing track:', track);
        console.log('Track attributes:', track.attributes);
        return {
          id: track.id,
          name: track.attributes?.name,
          artistName: track.attributes?.artistName,
          durationInMillis: track.attributes?.durationInMillis,
          trackNumber: track.attributes?.trackNumber,
          previewUrl: track.attributes?.previews?.[0]?.url,
          contentRating: track.attributes?.contentRating,
        };
      });

      console.log('=== PARSED TRACKS ===');
      console.log('Parsed tracks:', parsedTracks);
      console.log('=====================');

      setAlbumDetail({
        ...album,
        tracks: parsedTracks,
      });
    } catch (err) {
      console.error('Failed to fetch album tracks:', err);
      setError('Failed to load album tracks. Please try again.');
    } finally {
      setLoadingAlbumDetail(false);
    }
  };

  const isAlbumApproved = (albumId) => {
    if (!approvedAlbums || !kidProfiles || kidProfiles.length === 0) return false;

    // Find the album in the approved list
    const album = approvedAlbums.find(a => a.appleAlbumId === albumId);
    if (!album) return false;

    // If album has no specific kids (approved for all), it's fully approved
    if (!album.kidProfileIds || album.kidProfileIds.length === 0) return true;

    // Check if approved for all kids
    return album.kidProfileIds.length === kidProfiles.length;
  };

  const isSongApproved = (songId) => {
    if (!approvedSongs || !kidProfiles || kidProfiles.length === 0) return false;

    // Find the song in the approved list
    const song = approvedSongs.find(s => s.appleSongId === songId);
    if (!song) return false;

    // If song has no specific kids (approved for all), it's fully approved
    if (!song.kidProfileIds || song.kidProfileIds.length === 0) return true;

    // Check if approved for all kids
    return song.kidProfileIds.length === kidProfiles.length;
  };

  const isAlbumDenied = (albumId) => {
    if (!deniedAlbumRequests) return null;
    return deniedAlbumRequests.find(r => r.appleAlbumId === albumId);
  };

  const isSongDenied = (songId) => {
    if (!deniedSongRequests) return null;
    return deniedSongRequests.find(r => r.appleSongId === songId);
  };

  const handleApproveDeniedAlbum = async (deniedRequest, albumData) => {
    try {
      await approveDeniedAlbum({ requestId: deniedRequest._id });
      showToast(`${albumData.attributes.name} approved`, 'success');
    } catch (error) {
      console.error('Failed to approve denied album:', error);
      showToast('Failed to approve album. Please try again.', 'error');
    }
  };

  const handleApproveDeniedSong = async (deniedRequest, songData) => {
    try {
      await approveDeniedSong({ requestId: deniedRequest._id });
      showToast(`${songData.attributes.name} approved`, 'success');
    } catch (error) {
      console.error('Failed to approve denied song:', error);
      showToast('Failed to approve song. Please try again.', 'error');
    }
  };

  const handleApproveSongFromSearch = async (song) => {
    if (!user) {
      setError('You must be logged in to approve songs');
      return;
    }

    if (!kidProfiles || kidProfiles.length === 0) {
      setError('Please add at least one child profile before approving songs');
      return;
    }

    // Show kid selector if not already showing
    if (showSongKidSelector !== song.id) {
      setShowSongKidSelector(song.id);
      // Initialize with all kids selected by default
      if (!selectedSongKids[song.id]) {
        setSelectedSongKids(prev => ({
          ...prev,
          [song.id]: kidProfiles.map(kid => kid._id)
        }));
      }
      return;
    }

    // Actually approve the song for selected kids
    const selectedKidIds = selectedSongKids[song.id] || [];

    if (selectedKidIds.length === 0) {
      setError('Please select at least one child');
      return;
    }

    try {
      // Approve for each selected kid
      for (const kidId of selectedKidIds) {
        await approveSong({
          userId: user._id,
          kidProfileId: kidId,
          appleSongId: song.id,
          songName: song.name,
          artistName: song.artist,
          albumName: song.albumName,
          artworkUrl: song.artworkUrl,
          durationInMillis: song.durationInMillis,
          isExplicit: song.contentRating === 'explicit',
          hideArtwork: hideSongArtworkFor[song.id] || false,
        });
      }

      // Reset state
      setShowSongKidSelector(null);
      setSelectedSongKids(prev => {
        const updated = { ...prev };
        delete updated[song.id];
        return updated;
      });
      setHideSongArtworkFor(prev => {
        const updated = { ...prev };
        delete updated[song.id];
        return updated;
      });
    } catch (err) {
      console.error('Failed to approve song:', err);
      setError('Failed to approve song. Please try again.');
    }
  };

  const handleApproveSong = async (track) => {
    if (!user) {
      setError('You must be logged in to approve songs');
      return;
    }

    if (!kidProfiles || kidProfiles.length === 0) {
      setError('Please add at least one child profile before approving songs');
      return;
    }

    // Show kid selector if not already showing
    if (showSongKidSelector !== track.id) {
      setShowSongKidSelector(track.id);
      // Initialize with all kids selected by default
      if (!selectedSongKids[track.id]) {
        setSelectedSongKids(prev => ({
          ...prev,
          [track.id]: kidProfiles.map(kid => kid._id)
        }));
      }
      return;
    }

    // Actually approve the song for selected kids
    const selectedKidIds = selectedSongKids[track.id] || [];

    if (selectedKidIds.length === 0) {
      setError('Please select at least one child');
      return;
    }

    try {
      // Approve for each selected kid
      for (const kidId of selectedKidIds) {
        await approveSong({
          userId: user._id,
          kidProfileId: kidId,
          appleSongId: track.id,
          songName: track.name,
          artistName: track.artistName,
          albumName: albumDetail?.name,
          artworkUrl: albumDetail?.artworkUrl,
          durationInMillis: track.durationInMillis,
          isExplicit: track.contentRating === 'explicit',
        });
      }

      // Reset state
      setShowSongKidSelector(null);
      setSelectedSongKids(prev => {
        const updated = { ...prev };
        delete updated[track.id];
        return updated;
      });
    } catch (err) {
      console.error('Failed to approve song:', err);
      setError('Failed to approve song. Please try again.');
    }
  };

  const toggleSongKidSelection = (songId, kidId) => {
    setSelectedSongKids(prev => {
      const currentSelections = prev[songId] || [];
      const isSelected = currentSelections.includes(kidId);

      return {
        ...prev,
        [songId]: isSelected
          ? currentSelections.filter(id => id !== kidId)
          : [...currentSelections, kidId]
      };
    });
  };

  const toggleKidSelection = (albumId, kidId) => {
    setSelectedKids(prev => {
      const currentSelections = prev[albumId] || [];
      const isSelected = currentSelections.includes(kidId);

      return {
        ...prev,
        [albumId]: isSelected
          ? currentSelections.filter(id => id !== kidId)
          : [...currentSelections, kidId]
      };
    });
  };

  const handleApprove = async (album) => {
    if (!user) {
      setError('You must be logged in to approve albums');
      return;
    }

    if (!kidProfiles || kidProfiles.length === 0) {
      setError('Please add at least one child profile before approving albums');
      return;
    }

    // Show kid selector if not already showing
    if (showKidSelector !== album.id) {
      setShowKidSelector(album.id);
      // Initialize with all kids selected by default
      if (!selectedKids[album.id]) {
        setSelectedKids(prev => ({
          ...prev,
          [album.id]: kidProfiles.map(kid => kid._id)
        }));
      }
      return;
    }

    // Actually approve the album for selected kids
    const selectedKidIds = selectedKids[album.id] || [];

    console.log('[handleApprove] Selected kids:', selectedKidIds);
    console.log('[handleApprove] Album:', album.id, album.name);

    if (selectedKidIds.length === 0) {
      setError('Please select at least one child');
      return;
    }

    try {
      // Fetch album tracks from Apple Music
      let tracks = [];
      try {
        const albumTracks = await musicKitService.getAlbumTracks(album.id);
        tracks = albumTracks.map((track, index) => ({
          appleSongId: track.id || track.attributes?.playParams?.id,
          songName: track.attributes?.name || track.name,
          artistName: track.attributes?.artistName || track.artistName || album.artist,
          trackNumber: track.attributes?.trackNumber || index + 1,
          durationInMillis: track.attributes?.durationInMillis,
          isExplicit: track.attributes?.contentRating === 'explicit',
        }));
        console.log('[handleApprove] Fetched', tracks.length, 'tracks for album');
      } catch (err) {
        console.error('[handleApprove] Failed to fetch tracks:', err);
        // Continue without tracks - they can be added later
      }

      // Approve for each selected kid
      for (const kidId of selectedKidIds) {
        const approvalData = {
          userId: user._id,
          kidProfileId: kidId,
          appleAlbumId: album.id,
          albumName: album.name,
          artistName: album.artist,
          artworkUrl: album.artworkUrl,
          releaseYear: album.year,
          trackCount: album.trackCount,
          genres: album.genreNames,
          isExplicit: album.contentRating === 'explicit',
          hideArtwork: hideArtworkFor[album.id] || false,
          tracks: tracks.length > 0 ? tracks : undefined, // Pass tracks if we got them
        };
        console.log('[handleApprove] Approval data:', approvalData);
        console.log('[handleApprove] Genres being sent:', approvalData.genres);
        console.log('[handleApprove] Tracks being sent:', tracks.length);

        const result = await approveAlbum(approvalData);
        console.log('[handleApprove] Result for kid', kidId, ':', result);
      }
      console.log('[handleApprove] All approvals complete');

      // Reset state
      setShowKidSelector(null);
      setSelectedKids(prev => {
        const updated = { ...prev };
        delete updated[album.id];
        return updated;
      });
      setHideArtworkFor(prev => {
        const updated = { ...prev };
        delete updated[album.id];
        return updated;
      });
    } catch (err) {
      console.error('Failed to approve album:', err);
      setError('Failed to approve album. Please try again.');
    }
  };

  // Add album to Discover (featured) without adding to library
  const handleAddToDiscover = async (album) => {
    if (!user) {
      setError('You must be logged in');
      return;
    }

    try {
      // Fetch album tracks from Apple Music
      let tracks = [];
      try {
        const albumTracks = await musicKitService.getAlbumTracks(album.id);
        tracks = albumTracks.map((track, index) => ({
          appleSongId: track.id || track.attributes?.playParams?.id,
          songName: track.attributes?.name || track.name,
          artistName: track.attributes?.artistName || track.artistName || album.artist,
          trackNumber: track.attributes?.trackNumber || index + 1,
          durationInMillis: track.attributes?.durationInMillis,
          isExplicit: track.attributes?.contentRating === 'explicit',
        }));
      } catch (err) {
        console.error('[handleAddToDiscover] Failed to fetch tracks:', err);
      }

      // First approve the album for the user (without kid profile)
      const approvalData = {
        userId: user._id,
        kidProfileId: undefined, // No specific kid - available to all
        appleAlbumId: album.id,
        albumName: album.name,
        artistName: album.artist,
        artworkUrl: album.artworkUrl,
        releaseYear: album.year,
        trackCount: album.trackCount,
        genres: album.genreNames,
        isExplicit: album.contentRating === 'explicit',
        hideArtwork: false,
        tracks: tracks.length > 0 ? tracks : undefined,
      };

      const result = await approveAlbum(approvalData);

      // Then mark it as featured
      await toggleAlbumFeatured({
        albumId: result,
        featured: true,
      });

      showToast(`Added "${album.name}" to Discover!`, 'success');
    } catch (err) {
      console.error('Failed to add to Discover:', err);
      setError('Failed to add to Discover. Please try again.');
    }
  };

  // Backfill tracks for existing albums
  const handleBackfillTracks = async () => {
    if (!user || !approvedAlbums) {
      setError('Unable to backfill - please try again');
      return;
    }

    if (!window.confirm(`This will fetch and store tracks for all ${approvedAlbums.length} approved albums. This may take a few minutes. Continue?`)) {
      return;
    }

    setIsBackfilling(true);
    try {
      const result = await backfillAlbumTracks(approvedAlbums, approveAlbum, user._id);
      showToast(`Backfill complete! Success: ${result.success}, Errors: ${result.errors}`, result.errors === 0 ? 'success' : 'warning');
      if (result.errors > 0) {
        console.error('Backfill errors:', result.errorDetails);
      }
    } catch (err) {
      console.error('Backfill failed:', err);
      setError('Backfill failed. Check console for details.');
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <>
      {ToastContainer}
      <div>
        {/* Explanation Banner */}
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-100">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How to Add Music</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-purple-600 font-semibold flex items-center justify-center text-xs">1</span>
                  <p><strong className="text-purple-700">+ Library:</strong> Adds music directly to your kids' library - they can play it right away!</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-purple-600 font-semibold flex items-center justify-center text-xs">2</span>
                  <p><strong className="text-purple-700">+ Discover:</strong> Adds music to a "storefront" where kids can browse and choose what to add to their library themselves.</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-600 bg-white rounded px-3 py-2">
                💡 <strong>Tip:</strong> Use Discover to let your kids explore and develop their own taste, while Library is perfect for music you know they'll love!
              </div>
            </div>
          </div>
        </div>

        {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        {/* Search Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSearchType('albums')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              searchType === 'albums'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Albums
          </button>
          <button
            type="button"
            onClick={() => setSearchType('songs')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              searchType === 'songs'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Songs
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="search"
              inputMode="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearchQueryChange(e.target.value);
              }}
              onInput={(e) => {
                setSearchQuery(e.target.value);
                onSearchQueryChange(e.target.value);
              }}
              onFocus={() => setShowSearchHistory(true)}
              onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
              placeholder={searchType === 'albums' ? 'Search for albums, artists...' : 'Search for songs...'}
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              required
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  onSearchQueryChange('');
                  setSearchResults([]);
                  onSearchResultsChange([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Search History Dropdown */}
            {showSearchHistory && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-gray-500 px-2 py-1 font-semibold">Recent Searches</div>
                  {searchHistory.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setSearchQuery(item.query);
                        setSearchType(item.type);
                        onSearchQueryChange(item.query);
                        setShowSearchHistory(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2 transition"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="flex-1 text-sm">{item.query}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {item.type === 'albums' ? 'Albums' : 'Songs'}
                      </span>
                    </button>
                  ))}
                  <div className="border-t border-gray-200 mt-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchHistory([]);
                        localStorage.removeItem('musicSearchHistory');
                        setShowSearchHistory(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 rounded flex items-center gap-2 transition text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="text-sm font-medium">Clear Search History</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Status Messages */}
      {!isMusicKitReady && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> MusicKit is not configured. Add your VITE_MUSICKIT_DEVELOPER_TOKEN to .env to enable real Apple Music search. Showing placeholder data for now.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {searchResults.length} {searchResults.length === 1 ? 'Result' : 'Results'}
            {hasMore && <span className="text-sm text-gray-500 ml-2">(scroll down for more)</span>}
          </h2>

          {/* Grid View for Albums */}
          {searchResults[0]?.type === 'album' && (
            <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {searchResults.map((album) => (
              <div key={album.id} className="group">
                {/* Album Artwork */}
                <div className="relative aspect-square mb-3 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all">
                  {album.artworkUrl ? (
                    <img
                      src={album.artworkUrl.replace('{w}', '300').replace('{h}', '300')}
                      alt={`${album.name} artwork`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                      <svg className="w-12 h-12 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                    </div>
                  )}

                  {/* Content Rating Badge */}
                  {album.contentRating && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                        E
                      </span>
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    {(() => {
                      const deniedRequest = isAlbumDenied(album.id);
                      const approved = isAlbumApproved(album.id);

                      if (approved) {
                        return (
                          <div className="bg-green-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span>Approved</span>
                          </div>
                        );
                      }

                      if (deniedRequest) {
                        return (
                          <button
                            onClick={() => handleApproveDeniedAlbum(deniedRequest, album)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg hover:scale-105 transition-transform"
                          >
                            Approve Anyway
                          </button>
                        );
                      }

                      return (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(album)}
                            className="bg-white text-gray-900 px-3 py-2 rounded-full font-semibold text-xs shadow-lg hover:scale-105 transition-transform"
                          >
                            {showKidSelector === album.id ? 'Select Kids' : '+ Library'}
                          </button>
                          <button
                            onClick={() => handleAddToDiscover(album)}
                            className="bg-purple-600 text-white px-3 py-2 rounded-full font-semibold text-xs shadow-lg hover:scale-105 transition-transform"
                          >
                            + Discover
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Previously Denied Badge (visible without hover) */}
                  {(() => {
                    const deniedRequest = isAlbumDenied(album.id);
                    if (deniedRequest && !isAlbumApproved(album.id)) {
                      return (
                        <div className="absolute top-2 left-2">
                          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                            DENIED
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Album/Song Info */}
                <div className="px-1">
                  <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2 leading-tight" title={album.name}>
                    {album.name}
                  </h3>
                  <p className="text-xs text-gray-600 truncate" title={album.artist}>
                    {album.artist}
                  </p>
                  {album.type === 'album' ? (
                    <p className="text-xs text-gray-500 mt-1">
                      {album.year} • {album.trackCount} tracks
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1 truncate" title={album.albumName}>
                      {album.albumName}
                    </p>
                  )}

                  {/* View Details / Preview Button */}
                  {album.type === 'album' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAlbumClick(album);
                      }}
                      className="mt-2 w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium transition flex items-center justify-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      View Tracks
                    </button>
                  ) : album.previewUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAlbum(album);
                      }}
                      className="mt-2 w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition flex items-center justify-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      Preview
                    </button>
                  )}
                </div>

                {/* Kid Selector Modal (appears when clicked) */}
                {showKidSelector === album.id && kidProfiles && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Approve for Kids</h3>

                      {/* Album Preview */}
                      <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
                        <img src={album.artworkUrl?.replace('{w}', '80').replace('{h}', '80')} alt={album.name} className="w-16 h-16 rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{album.name}</p>
                          <p className="text-xs text-gray-600 truncate">{album.artist}</p>
                        </div>
                      </div>

                      {/* Kid Selection */}
                      <div className="space-y-2 mb-4">
                        {kidProfiles.map((kid) => (
                          <label key={kid._id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                            <input
                              type="checkbox"
                              checked={(selectedKids[album.id] || []).includes(kid._id)}
                              onChange={() => toggleKidSelection(album.id, kid._id)}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className={`w-8 h-8 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white p-1.5`}>
                              {getAvatarIcon(kid.avatar)}
                            </div>
                            <span className="font-medium text-gray-700">{kid.name}</span>
                          </label>
                        ))}
                      </div>

                      {/* Hide Artwork Option */}
                      <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hideArtworkFor[album.id] || false}
                            onChange={(e) => setHideArtworkFor(prev => ({
                              ...prev,
                              [album.id]: e.target.checked
                            }))}
                            className="w-5 h-5 text-amber-600 rounded focus:ring-2 focus:ring-amber-500 mt-0.5"
                          />
                          <div>
                            <span className="font-medium text-gray-900 block">Hide Album Artwork</span>
                            <span className="text-xs text-gray-600">Check this if the album cover is not appropriate for kids</span>
                          </div>
                        </label>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => {
                            setShowKidSelector(null);
                            setSelectedKids(prev => {
                              const updated = { ...prev };
                              delete updated[album.id];
                              return updated;
                            });
                          }}
                          className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleApprove(album)}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              ))}
            </div>

            {/* Load More Button for Albums */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={loadMoreResults}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Load More Results
                    </>
                  )}
                </button>
              </div>
            )}
            </>
          )}

          {/* List View for Songs */}
          {searchResults[0]?.type === 'song' && (
            <>
            <div className="space-y-2">
              {searchResults.map((song) => (
                <div key={song.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    {/* Song Artwork */}
                    <div className="relative w-16 h-16 rounded flex-shrink-0">
                      {hideSongArtworkFor[song.id] ? (
                        <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex flex-col items-center justify-center rounded">
                          <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </div>
                      ) : song.artworkUrl ? (
                        <img
                          src={song.artworkUrl.replace('{w}', '200').replace('{h}', '200')}
                          alt={`${song.name} artwork`}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center rounded">
                          <svg className="w-8 h-8 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                        </div>
                      )}
                      {song.contentRating && (
                        <div className="absolute -top-1 -right-1">
                          <span className="bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-lg">
                            E
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Song Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{song.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{song.artist}</p>
                      <p className="text-xs text-gray-500 truncate">{song.albumName}</p>
                      {song.genreNames && song.genreNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {song.genreNames.slice(0, 2).map((genre, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="text-sm text-gray-500 flex-shrink-0 hidden sm:block">
                      {Math.floor(song.durationInMillis / 60000)}:{String(Math.floor((song.durationInMillis % 60000) / 1000)).padStart(2, '0')}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {song.previewUrl && (
                        <button
                          onClick={() => setSelectedAlbum(song)}
                          className="p-2 hover:bg-purple-100 rounded-full transition"
                          title="Preview song"
                        >
                          <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                      {(() => {
                        const deniedRequest = isSongDenied(song.id);
                        const approved = isSongApproved(song.id);

                        if (approved) {
                          return (
                            <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Approved
                            </div>
                          );
                        }

                        if (deniedRequest) {
                          return (
                            <>
                              <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                DENIED
                              </div>
                              <button
                                onClick={() => handleApproveDeniedSong(deniedRequest, song)}
                                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition"
                              >
                                Approve Anyway
                              </button>
                            </>
                          );
                        }

                        return (
                          <button
                            onClick={() => handleApproveSongFromSearch(song)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                          >
                            {showSongKidSelector === song.id ? 'Select Kids' : 'Approve'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Kid Selector Modal for Songs */}
                  {showSongKidSelector === song.id && kidProfiles && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Approve Song for Kids</h3>

                        {/* Song Preview */}
                        <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
                          {!hideSongArtworkFor[song.id] && song.artworkUrl && (
                            <img src={song.artworkUrl.replace('{w}', '80').replace('{h}', '80')} alt={song.name} className="w-16 h-16 rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">{song.name}</p>
                            <p className="text-xs text-gray-600 truncate">{song.artist}</p>
                            <p className="text-xs text-gray-500 truncate">{song.albumName}</p>
                          </div>
                        </div>

                        {/* Kid Selection */}
                        <div className="space-y-2 mb-4">
                          {kidProfiles.map((kid) => (
                            <label key={kid._id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                              <input
                                type="checkbox"
                                checked={(selectedSongKids[song.id] || []).includes(kid._id)}
                                onChange={() => toggleSongKidSelection(song.id, kid._id)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <div className={`w-8 h-8 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white p-1.5`}>
                                {getAvatarIcon(kid.avatar)}
                              </div>
                              <span className="font-medium text-gray-700">{kid.name}</span>
                            </label>
                          ))}
                        </div>

                        {/* Hide Artwork Option */}
                        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <label className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hideSongArtworkFor[song.id] || false}
                              onChange={(e) => setHideSongArtworkFor(prev => ({
                                ...prev,
                                [song.id]: e.target.checked
                              }))}
                              className="w-5 h-5 text-amber-600 rounded focus:ring-2 focus:ring-amber-500 mt-0.5"
                            />
                            <div>
                              <span className="font-medium text-gray-900 block">Hide Album Artwork</span>
                              <span className="text-xs text-gray-600">Check this if the album cover is not appropriate for kids</span>
                            </div>
                          </label>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-3">
                          <button
                            onClick={() => {
                              setShowSongKidSelector(null);
                              setSelectedSongKids(prev => {
                                const updated = { ...prev };
                                delete updated[song.id];
                                return updated;
                              });
                            }}
                            className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleApproveSongFromSearch(song)}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Load More Button for Songs */}
            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={loadMoreResults}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:bg-gray-400 disabled:cursor-not-allow flex items-center gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Load More Results
                    </>
                  )}
                </button>
              </div>
            )}
            </>
          )}
        </div>
      )}

      {/* Preview Modal */}
      {selectedAlbum && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAlbum(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Preview</h3>
              <button
                onClick={() => setSelectedAlbum(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Album/Song Info */}
            <div className="flex items-start space-x-4 mb-6">
              <img
                src={selectedAlbum.artworkUrl?.replace('{w}', '120').replace('{h}', '120')}
                alt={selectedAlbum.name}
                className="w-24 h-24 rounded-lg shadow-lg"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-lg line-clamp-2">{selectedAlbum.name}</h4>
                <p className="text-gray-600 text-sm">{selectedAlbum.artist}</p>
                {selectedAlbum.type === 'song' && (
                  <p className="text-gray-500 text-xs mt-1">{selectedAlbum.albumName}</p>
                )}
                {selectedAlbum.contentRating && (
                  <span className="inline-block mt-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-semibold">
                    Explicit
                  </span>
                )}
              </div>
            </div>

            {/* Audio Preview */}
            {selectedAlbum.previewUrl && (
              <div className="mb-6">
                <audio
                  controls
                  className="w-full"
                  src={selectedAlbum.previewUrl}
                  autoPlay
                >
                  Your browser does not support audio playback.
                </audio>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  30-second preview
                </p>
              </div>
            )}

            {/* Genres */}
            {selectedAlbum.genreNames && selectedAlbum.genreNames.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-2">Genres</p>
                <div className="flex flex-wrap gap-2">
                  {selectedAlbum.genreNames.map((genre, idx) => (
                    <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            {selectedAlbum.type === 'album' && !isAlbumApproved(selectedAlbum.id) && (
              <button
                onClick={() => {
                  setSelectedAlbum(null);
                  handleApprove(selectedAlbum);
                }}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
              >
                Approve Album for Kids
              </button>
            )}
          </div>
        </div>
      )}

      {/* Album Detail Modal with Track List */}
      {albumDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setAlbumDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            {/* Header with Album Info */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start gap-4 mb-4">
                <img
                  src={albumDetail.artworkUrl?.replace('{w}', '160').replace('{h}', '160')}
                  alt={albumDetail.name}
                  className="w-32 h-32 rounded-lg shadow-lg"
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{albumDetail.name}</h2>
                  <p className="text-lg text-gray-600 mb-2">{albumDetail.artist}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{albumDetail.year}</span>
                    <span>•</span>
                    <span>{albumDetail.trackCount} tracks</span>
                  </div>
                  {albumDetail.contentRating && (
                    <span className="inline-block mt-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-semibold">
                      Explicit
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setAlbumDetail(null)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Album Actions */}
              <div className="flex gap-2">
                {!isAlbumApproved(albumDetail.id) ? (
                  <button
                    onClick={() => {
                      setAlbumDetail(null);
                      handleApprove(albumDetail);
                    }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
                  >
                    Approve Album for Kids
                  </button>
                ) : (
                  <div className="flex-1 py-2 bg-green-100 text-green-800 rounded-lg font-medium text-center flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Album Approved</span>
                  </div>
                )}
              </div>
            </div>

            {/* Track List */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tracks</h3>
              {albumDetail.tracks && albumDetail.tracks.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {albumDetail.tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition border-b border-gray-100 last:border-0"
                    >
                      {/* Approve Checkbox */}
                      <div className="flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={isSongApproved(track.id)}
                          onChange={() => handleApproveSong(track)}
                          className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                          title={isSongApproved(track.id) ? "Song approved" : "Click to approve"}
                        />
                      </div>

                      {/* Track Number */}
                      <div className="w-8 text-sm text-gray-500 text-center flex-shrink-0">
                        {track.trackNumber || index + 1}
                      </div>

                      {/* Track Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{track.name}</p>
                        <p className="text-xs text-gray-500">
                          {Math.floor(track.durationInMillis / 60000)}:{String(Math.floor((track.durationInMillis % 60000) / 1000)).padStart(2, '0')}
                        </p>
                      </div>

                      {/* Content Rating */}
                      {track.contentRating && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0">
                          E
                        </span>
                      )}

                      {/* Action Buttons - Always Visible */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* View Lyrics Button */}
                        <button
                          onClick={() => {
                            setLyricsTrack({ name: track.name, artistName: track.artistName });
                            setLyricsModalOpen(true);
                          }}
                          className="p-2 hover:bg-blue-100 rounded-full transition"
                          title="View lyrics"
                        >
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>

                        {/* Play Button */}
                        <button
                          onClick={async () => {
                            try {
                              await musicKitService.playSong(track.id, { songName: track.name, artistName: track.artistName });
                            } catch (err) {
                              console.error('Failed to play song:', err);

                              if (err.message && err.message.includes('CONTENT_UNAVAILABLE')) {
                                showToast('Unable to play. Ensure you have an active paid Apple Music subscription and the song is available in your region.', 'error');
                              } else if (err.message && err.message.includes('AUTHORIZATION')) {
                                showToast('Please authorize Apple Music first in Settings.', 'warning');
                              } else {
                                showToast('Failed to play song. Make sure you have an active Apple Music subscription.', 'error');
                              }
                            }
                          }}
                          className="p-2 hover:bg-purple-100 rounded-full transition"
                          title="Play full song (requires Apple Music subscription)"
                        >
                          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No track information available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Song Kid Selector Modal */}
      {showSongKidSelector && albumDetail && kidProfiles && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Approve Song for Kids</h3>

            {/* Song Preview */}
            <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0">
                {albumDetail.artworkUrl && (
                  <img src={albumDetail.artworkUrl.replace('{w}', '60').replace('{h}', '60')} alt="Album" className="w-full h-full rounded object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">
                  {albumDetail.tracks?.find(t => t.id === showSongKidSelector)?.name || 'Song'}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {albumDetail.tracks?.find(t => t.id === showSongKidSelector)?.artistName}
                </p>
              </div>
            </div>

            {/* Kid Selection */}
            <div className="space-y-2 mb-6">
              {kidProfiles.map((kid) => (
                <label key={kid._id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={(selectedSongKids[showSongKidSelector] || []).includes(kid._id)}
                    onChange={() => toggleSongKidSelection(showSongKidSelector, kid._id)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className={`w-8 h-8 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white p-1.5`}>
                    {getAvatarIcon(kid.avatar)}
                  </div>
                  <span className="font-medium text-gray-700">{kid.name}</span>
                </label>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowSongKidSelector(null);
                  setSelectedSongKids(prev => {
                    const updated = { ...prev };
                    delete updated[showSongKidSelector];
                    return updated;
                  });
                }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const track = albumDetail.tracks?.find(t => t.id === showSongKidSelector);
                  if (track) handleApproveSong(track);
                }}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loadingAlbumDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-700 font-medium">Loading album details...</p>
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
      </div>
    </>
  );
}

export default AlbumSearch;
