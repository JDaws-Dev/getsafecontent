import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import PlaylistImport from './PlaylistImport';
import musicKitService from '../../config/musickit';
import LyricsModal from './LyricsModal';
import { useToast } from '../common/Toast';

/**
 * Unified Music Management Component
 *
 * Consolidates Library, Discover, and Add Music into ONE cohesive interface.
 * Uses a context toggle (Library/Discover) instead of separate tabs.
 */
function UnifiedMusicManagement({ user }) {
  const { showToast, ToastContainer } = useToast();

  // ============================================
  // CONTEXT STATE: Library or Discover
  // ============================================
  const [context, setContext] = useState('library'); // 'library' or 'discover'

  // ============================================
  // SEARCH STATE
  // ============================================
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState('albums'); // 'albums' or 'songs'
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMusicKitReady, setIsMusicKitReady] = useState(false);
  const [error, setError] = useState('');

  // ============================================
  // LIBRARY VIEW STATE
  // ============================================
  const [showImport, setShowImport] = useState(false);
  const [selectedKidFilter, setSelectedKidFilter] = useState('all');
  const [expandedSections, setExpandedSections] = useState({
    playlists: true,
    artists: false,
    genres: false,
    albums: false,
  });
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [songModal, setSongModal] = useState(null);
  const [albumTracks, setAlbumTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  // ============================================
  // APPROVAL STATE
  // ============================================
  const [selectedKids, setSelectedKids] = useState({});
  const [showKidSelector, setShowKidSelector] = useState(null);
  const [showSongKidSelector, setShowSongKidSelector] = useState(null);
  const [selectedSongKids, setSelectedSongKids] = useState({});
  const [hideArtworkFor, setHideArtworkFor] = useState({});
  const [hideSongArtworkFor, setHideSongArtworkFor] = useState({});

  // ============================================
  // PREVIEW STATE
  // ============================================
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumDetail, setAlbumDetail] = useState(null);
  const [loadingAlbumDetail, setLoadingAlbumDetail] = useState(false);
  const [lyricsModalOpen, setLyricsModalOpen] = useState(false);
  const [lyricsTrack, setLyricsTrack] = useState(null);

  // ============================================
  // MENU STATE
  // ============================================
  const [openMenuId, setOpenMenuId] = useState(null);

  // ============================================
  // DATA QUERIES
  // ============================================
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles, user ? { userId: user._id } : 'skip') || [];

  // Library data
  const libraryAlbums = useQuery(api.albums.getApprovedAlbums, user && context === 'library' ? { userId: user._id } : 'skip') || [];
  const librarySongs = useQuery(api.songs.getApprovedSongs, user && context === 'library' ? { userId: user._id } : 'skip') || [];
  const playlists = useQuery(api.playlists.getPlaylists, user && context === 'library' ? { userId: user._id } : 'skip') || [];

  // Discover data
  const featuredAlbums = useQuery(api.featured.getFeaturedAlbums, user && context === 'discover' ? { userId: user._id } : 'skip') || [];
  const featuredSongs = useQuery(api.featured.getFeaturedSongs, user && context === 'discover' ? { userId: user._id } : 'skip') || [];

  // All approved data for search checks
  const allApprovedAlbums = useQuery(api.albums.getApprovedAlbums, user ? { userId: user._id } : 'skip') || [];
  const allApprovedSongs = useQuery(api.songs.getApprovedSongs, user ? { userId: user._id } : 'skip') || [];

  // Denied requests
  const deniedAlbumRequests = useQuery(api.albumRequests.getDeniedRequests, user ? { userId: user._id } : 'skip') || [];
  const deniedSongRequests = useQuery(api.songRequests.getDeniedSongRequests, user ? { userId: user._id } : 'skip') || [];

  // ============================================
  // MUTATIONS
  // ============================================
  const approveAlbum = useMutation(api.albums.approveAlbum);
  const removeAlbum = useMutation(api.albums.removeApprovedAlbum);
  const approveSong = useMutation(api.songs.approveSong);
  const removeSong = useMutation(api.songs.removeApprovedSong);
  const removePlaylist = useMutation(api.playlists.deletePlaylist);
  const toggleAlbumArtwork = useMutation(api.albums.toggleAlbumArtwork);
  const toggleSongArtwork = useMutation(api.songs.toggleSongArtwork);
  const approveDeniedAlbum = useMutation(api.albumRequests.approveDeniedRequest);
  const approveDeniedSong = useMutation(api.songRequests.approveDeniedSongRequest);
  const toggleAlbumFeatured = useMutation(api.featured.toggleAlbumFeatured);
  const toggleSongFeatured = useMutation(api.featured.toggleSongFeatured);

  // Bulk operations - remove and hide across Library + Discover
  const removeAlbumEverywhere = useMutation(api.albums.removeAlbumEverywhere);
  const removePartialAlbumByName = useMutation(api.albums.removePartialAlbumByName);
  const toggleAlbumArtworkEverywhere = useMutation(api.albums.toggleAlbumArtworkEverywhere);
  const removeSongEverywhere = useMutation(api.songs.removeSongEverywhere);
  const toggleSongArtworkEverywhere = useMutation(api.songs.toggleSongArtworkEverywhere);

  // ============================================
  // USE CONTEXT-AWARE DATA
  // ============================================
  const albums = context === 'discover'
    ? featuredAlbums.map(album => ({
        id: album._id,
        name: album.albumName,
        artist: album.artistName,
        artworkUrl: album.artworkUrl,
        year: album.releaseYear,
        trackCount: album.trackCount,
        appleAlbumId: album.appleAlbumId,
        genres: album.genres || [],
        hideArtwork: album.hideArtwork || false,
        kidProfileIds: [],
        kidProfiles: [],
        allRecordIds: [album._id],
      }))
    : libraryAlbums;

  const songs = context === 'discover'
    ? featuredSongs.map(song => ({
        _id: song._id,
        appleSongId: song.appleSongId,
        songName: song.songName,
        artistName: song.artistName,
        albumName: song.albumName,
        artworkUrl: song.artworkUrl,
        durationInMillis: song.durationInMillis,
        isExplicit: song.isExplicit,
        hideArtwork: song.hideArtwork || false,
        kidProfileId: null,
      }))
    : librarySongs;

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  // ============================================
  // INITIALIZATION
  // ============================================
  useEffect(() => {
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
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('[data-menu-container]')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // ============================================
  // SEARCH FUNCTIONS
  // ============================================
  const handleSearch = async (e, loadMore = false) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const currentOffset = loadMore ? offset : 0;

    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
      setError('');
    }

    try {
      if (!isMusicKitReady) {
        setError('MusicKit is not configured');
        return;
      }

      const results = await musicKitService.search(searchQuery, {
        types: searchType,
        limit: 25,
        offset: currentOffset,
      });

      if (searchType === 'albums' && results.data?.results?.albums?.data) {
        const albums = results.data.results.albums.data.map((album) => ({
          type: 'album',
          id: album.id,
          name: album.attributes.name,
          artist: album.attributes.artistName,
          artworkUrl: album.attributes.artwork?.url.replace('{w}', '300').replace('{h}', '300'),
          year: album.attributes.releaseDate?.substring(0, 4) || 'N/A',
          trackCount: album.attributes.trackCount || 0,
          genreNames: album.attributes.genreNames || [],
          contentRating: album.attributes.contentRating,
          previewUrl: album.attributes.previews?.[0]?.url,
        }));

        if (loadMore) {
          setSearchResults(prev => [...prev, ...albums]);
        } else {
          setSearchResults(albums);
        }

        setHasMore(albums.length === 25);
        setOffset(currentOffset + 25);
      } else if (searchType === 'songs' && results.data?.results?.songs?.data) {
        const songs = results.data.results.songs.data.map((song) => ({
          type: 'song',
          id: song.id,
          name: song.attributes.name,
          artist: song.attributes.artistName,
          albumName: song.attributes.albumName,
          artworkUrl: song.attributes.artwork?.url.replace('{w}', '300').replace('{h}', '300'),
          year: song.attributes.releaseDate?.substring(0, 4) || 'N/A',
          durationInMillis: song.attributes.durationInMillis,
          genreNames: song.attributes.genreNames || [],
          contentRating: song.attributes.contentRating,
          previewUrl: song.attributes.previews?.[0]?.url,
        }));

        if (loadMore) {
          setSearchResults(prev => [...prev, ...songs]);
        } else {
          setSearchResults(songs);
        }

        setHasMore(songs.length === 25);
        setOffset(currentOffset + 25);
      } else {
        if (!loadMore) {
          setSearchResults([]);
        }
        setHasMore(false);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError(`Search failed: ${err.message}`);
      setHasMore(false);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  // ============================================
  // APPROVAL FUNCTIONS
  // ============================================
  const handleApprove = async (album) => {
    if (!user || !kidProfiles || kidProfiles.length === 0) {
      setError('Please add at least one child profile');
      return;
    }

    // If in Discover context, skip kid selection
    if (context === 'discover') {
      try {
        // Fetch tracks
        let tracks = [];
        try {
          const albumTracks = await musicKitService.getAlbumTracks(album.id);
          tracks = albumTracks.map((track, index) => ({
            appleSongId: track.id,
            songName: track.attributes?.name,
            artistName: track.attributes?.artistName || album.artist,
            trackNumber: track.attributes?.trackNumber || index + 1,
            durationInMillis: track.attributes?.durationInMillis,
            isExplicit: track.attributes?.contentRating === 'explicit',
          }));
        } catch (err) {
          console.error('Failed to fetch tracks:', err);
        }

        // Approve without kid profile
        const result = await approveAlbum({
          userId: user._id,
          kidProfileId: undefined,
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
        });

        // Mark as featured
        await toggleAlbumFeatured({ albumId: result, featured: true });
        showToast(`Added "${album.name}" to Discover!`, 'success');

        // Clear search results to show the update
        setSearchResults([]);
        setSearchQuery('');
      } catch (err) {
        console.error('Failed to add to Discover:', err);
        setError('Failed to add to Discover. Please try again.');
      }
      return;
    }

    // Library context - show kid selector
    if (showKidSelector !== album.id) {
      setShowKidSelector(album.id);
      if (!selectedKids[album.id]) {
        setSelectedKids(prev => ({
          ...prev,
          [album.id]: kidProfiles.map(kid => kid._id)
        }));
      }
      return;
    }

    // Actually approve for selected kids
    const selectedKidIds = selectedKids[album.id] || [];
    if (selectedKidIds.length === 0) {
      setError('Please select at least one child');
      return;
    }

    try {
      // Fetch tracks
      let tracks = [];
      try {
        const albumTracks = await musicKitService.getAlbumTracks(album.id);
        tracks = albumTracks.map((track, index) => ({
          appleSongId: track.id,
          songName: track.attributes?.name,
          artistName: track.attributes?.artistName || album.artist,
          trackNumber: track.attributes?.trackNumber || index + 1,
          durationInMillis: track.attributes?.durationInMillis,
          isExplicit: track.attributes?.contentRating === 'explicit',
        }));
      } catch (err) {
        console.error('Failed to fetch tracks:', err);
      }

      // Approve for each selected kid
      for (const kidId of selectedKidIds) {
        await approveAlbum({
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
          tracks: tracks.length > 0 ? tracks : undefined,
        });
      }

      showToast(`Added "${album.name}" to Library!`, 'success');

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

      // Clear search results to show the update
      setSearchResults([]);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to approve album:', err);
      setError('Failed to approve album. Please try again.');
    }
  };

  const isAlbumApproved = (albumId) => {
    if (!allApprovedAlbums || !kidProfiles || kidProfiles.length === 0) return false;
    const album = allApprovedAlbums.find(a => a.appleAlbumId === albumId);
    if (!album) return false;
    if (!album.kidProfileIds || album.kidProfileIds.length === 0) return true;
    return album.kidProfileIds.length === kidProfiles.length;
  };

  const isAlbumDenied = (albumId) => {
    if (!deniedAlbumRequests) return null;
    return deniedAlbumRequests.find(r => r.appleAlbumId === albumId);
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

  // ============================================
  // LIBRARY VIEW FUNCTIONS
  // ============================================
  const filteredAlbums = albums.filter(album => {
    const matchesSearch = album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      album.artist.toLowerCase().includes(searchQuery.toLowerCase());
    if (context === 'discover') return matchesSearch;
    if (selectedKidFilter === 'all') return matchesSearch;
    return matchesSearch && (
      album.kidProfileIds?.includes(selectedKidFilter) ||
      (!album.kidProfileIds || album.kidProfileIds.length === 0)
    );
  });

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.songName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artistName.toLowerCase().includes(searchQuery.toLowerCase());
    if (context === 'discover') return matchesSearch;
    if (selectedKidFilter === 'all') return matchesSearch;
    return matchesSearch && (song.kidProfileId === selectedKidFilter || !song.kidProfileId);
  });

  const filteredPlaylists = playlists.filter(playlist => {
    const matchesSearch = playlist.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedKidFilter === 'all') return matchesSearch;
    return matchesSearch && playlist.kidProfileId === selectedKidFilter;
  });

  // Build unified album structure
  const allAlbumsMap = new Map();

  filteredAlbums.forEach(album => {
    const key = `${album.artist}-${album.name}`;
    allAlbumsMap.set(key, {
      ...album,
      approvedSongs: [],
      isFullAlbum: true,
    });
  });

  filteredSongs.forEach(song => {
    const key = `${song.artistName}-${song.albumName}`;
    if (!allAlbumsMap.has(key)) {
      const matchingAlbum = filteredAlbums.find(a =>
        a.name === song.albumName && a.artist === song.artistName
      );
      allAlbumsMap.set(key, {
        id: `partial-${key}`,
        name: song.albumName,
        artist: song.artistName,
        artworkUrl: song.artworkUrl,
        appleAlbumId: matchingAlbum?.appleAlbumId,
        genres: matchingAlbum?.genres || [],
        approvedSongs: [],
        isFullAlbum: false,
        hideArtwork: song.hideArtwork,
      });
    }
    allAlbumsMap.get(key).approvedSongs.push(song);
  });

  // Group by artist
  const artistsMap = new Map();
  Array.from(allAlbumsMap.values()).forEach(album => {
    if (!artistsMap.has(album.artist)) {
      artistsMap.set(album.artist, { name: album.artist, albums: [] });
    }
    artistsMap.get(album.artist).albums.push(album);
  });
  const artists = Array.from(artistsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Group by genre
  const genresMap = new Map();
  const genericGenres = ['Music'];
  Array.from(allAlbumsMap.values()).forEach(album => {
    if (album.genres && Array.isArray(album.genres) && album.genres.length > 0) {
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
    .sort((a, b) => b.count - a.count);

  const allAlbums = Array.from(allAlbumsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ============================================
  // BULK OPERATIONS
  // ============================================
  const handleRemoveEverywhere = async (album) => {
    if (!confirm(`Remove "${album.name}" from BOTH Library and Discover?`)) {
      return;
    }

    try {
      let result;
      if (album.appleAlbumId) {
        // Full album - remove via appleAlbumId
        result = await removeAlbumEverywhere({
          userId: user._id,
          appleAlbumId: album.appleAlbumId,
        });
      } else {
        // Partial album (no appleAlbumId) - remove by name
        result = await removePartialAlbumByName({
          userId: user._id,
          albumName: album.name,
          artistName: album.artist,
        });
      }
      showToast(`Removed "${album.name}" from everywhere (${result} items)`, 'success');
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to remove album everywhere:', err);
      setError('Failed to remove album. Please try again.');
    }
  };

  const handleToggleArtworkEverywhere = async (album) => {
    if (!album.appleAlbumId) {
      setError('Cannot toggle artwork for album without Apple ID');
      return;
    }

    const newState = !album.hideArtwork;
    const action = newState ? 'hide' : 'show';

    try {
      const result = await toggleAlbumArtworkEverywhere({
        userId: user._id,
        appleAlbumId: album.appleAlbumId,
        hideArtwork: newState,
      });
      showToast(`${newState ? 'Hidden' : 'Shown'} artwork for "${album.name}" everywhere (${result} instances)`, 'success');
      setOpenMenuId(null);
    } catch (err) {
      console.error('Failed to toggle artwork everywhere:', err);
      setError(`Failed to ${action} artwork. Please try again.`);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      {ToastContainer}
      <div className="space-y-6">
        {/* Context Toggle + Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          {/* Context Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setContext('library');
                setSearchResults([]);
                setSearchQuery('');
              }}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                context === 'library'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span>Library</span>
              </div>
              <p className="text-xs mt-1 opacity-80">Kids' personal music</p>
            </button>
            <button
              onClick={() => {
                setContext('discover');
                setSearchResults([]);
                setSearchQuery('');
              }}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                context === 'discover'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Discover</span>
              </div>
              <p className="text-xs mt-1 opacity-80">Exploration pool</p>
            </button>
          </div>

          {/* Search Type Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setSearchType('albums')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                searchType === 'albums'
                  ? context === 'discover' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
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
                  ? context === 'discover' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Songs
            </button>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearch} className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search Apple Music ${searchType}...`}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Kid Filter (Library only) */}
          {context === 'library' && kidProfiles.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Filter by kid:</label>
              <select
                value={selectedKidFilter}
                onChange={(e) => setSelectedKidFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Kids</option>
                {kidProfiles.map(kid => (
                  <option key={kid._id} value={kid._id}>{kid.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowImport(true)}
                className="ml-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm"
              >
                Import Playlist
              </button>
            </div>
          )}
        </div>

        {/* Error Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* SEARCH RESULTS (when user has searched) */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Search Results ({searchResults.length})
            </h2>

            {/* Grid for Albums */}
            {searchResults[0]?.type === 'album' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {searchResults.map((album) => (
                  <div key={album.id} className="group">
                    <div className="relative aspect-square mb-3 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition">
                      {album.artworkUrl ? (
                        <img src={album.artworkUrl} alt={album.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                          <svg className="w-12 h-12 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                        </div>
                      )}

                      {/* Explicit Badge */}
                      {album.contentRating && (
                        <div className="absolute top-2 right-2">
                          <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow">E</span>
                        </div>
                      )}

                      {/* Hover Overlay with Context-Aware Button */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                        {(() => {
                          const approved = isAlbumApproved(album.id);
                          const denied = isAlbumDenied(album.id);

                          if (approved) {
                            return (
                              <div className="bg-green-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Approved
                              </div>
                            );
                          }

                          if (denied) {
                            return (
                              <button
                                onClick={() => {/* handle approve denied */}}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow"
                              >
                                Approve Anyway
                              </button>
                            );
                          }

                          return (
                            <button
                              onClick={() => handleApprove(album)}
                              className={`px-4 py-2 rounded-full font-semibold text-sm shadow hover:scale-105 transition ${
                                context === 'library'
                                  ? 'bg-white text-gray-900'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              {context === 'library'
                                ? (showKidSelector === album.id ? 'Select Kids' : '+ Library')
                                : '+ Discover'
                              }
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Album Info */}
                    <div className="px-1">
                      <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2 leading-tight">{album.name}</h3>
                      <p className="text-xs text-gray-600 truncate">{album.artist}</p>
                      <p className="text-xs text-gray-500 mt-1">{album.year} • {album.trackCount} tracks</p>
                    </div>

                    {/* Kid Selector Modal */}
                    {showKidSelector === album.id && kidProfiles && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowKidSelector(null)}>
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                          <h3 className="text-lg font-bold text-gray-900 mb-4">Approve for Kids</h3>

                          {/* Album Preview */}
                          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                            <img src={album.artworkUrl} alt={album.name} className="w-16 h-16 rounded" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">{album.name}</p>
                              <p className="text-xs text-gray-600 truncate">{album.artist}</p>
                            </div>
                          </div>

                          {/* Kid Selection */}
                          <div className="space-y-2 mb-4">
                            {kidProfiles.map((kid) => (
                              <label key={kid._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={(selectedKids[album.id] || []).includes(kid._id)}
                                  onChange={() => toggleKidSelection(album.id, kid._id)}
                                  className="w-5 h-5 text-blue-600 rounded"
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
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={hideArtworkFor[album.id] || false}
                                onChange={(e) => setHideArtworkFor(prev => ({ ...prev, [album.id]: e.target.checked }))}
                                className="w-5 h-5 text-amber-600 rounded mt-0.5"
                              />
                              <div>
                                <span className="font-medium text-gray-900 block">Hide Album Artwork</span>
                                <span className="text-xs text-gray-600">Check if cover isn't appropriate</span>
                              </div>
                            </label>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => setShowKidSelector(null)}
                              className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleApprove(album)}
                              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
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
            )}

            {/* Load More */}
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => handleSearch(null, true)}
                  disabled={isLoadingMore}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:bg-gray-400 flex items-center gap-2"
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
                      Load More
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* LIBRARY/DISCOVER VIEW (when NOT searching) */}
        {searchResults.length === 0 && (
          <div className="space-y-8">
            {/* Stats Card */}
            <div className={`rounded-2xl shadow-lg p-6 text-white ${
              context === 'library'
                ? 'bg-gradient-to-br from-purple-600 to-pink-600'
                : 'bg-gradient-to-br from-blue-500 to-cyan-600'
            }`}>
              <h2 className="text-2xl font-bold mb-4">
                {context === 'library' ? 'Your Library' : 'Discover Pool'}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="text-3xl font-bold">{albums.length}</div>
                  <div className="text-sm text-white/80">Albums</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                  <div className="text-3xl font-bold">{songs.length}</div>
                  <div className="text-sm text-white/80">Songs</div>
                </div>
              </div>
            </div>

            {/* Sections: Playlists, Artists, Genres, Albums */}
            {context === 'library' && (
              <div className="space-y-4">
                <button
                  onClick={() => toggleSection('playlists')}
                  className="flex items-center justify-between w-full px-2 py-2 hover:bg-gray-50 rounded-lg"
                >
                  <h2 className="text-xl font-bold text-gray-900">Playlists</h2>
                  <svg className={`w-6 h-6 text-gray-600 transition ${expandedSections.playlists ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSections.playlists && (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                    {filteredPlaylists.length === 0 ? (
                      <div className="p-12 text-center text-gray-500">No playlists yet</div>
                    ) : (
                      filteredPlaylists.map((playlist) => (
                        <div key={playlist._id} className="p-4 hover:bg-gray-50 transition">
                          <h3 className="font-semibold text-gray-900">{playlist.name}</h3>
                          <p className="text-xs text-gray-500">{playlist.songs?.length || 0} songs</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Artists Section */}
            <div className="space-y-4">
              <button
                onClick={() => toggleSection('artists')}
                className="flex items-center justify-between w-full px-2 py-2 hover:bg-gray-50 rounded-lg"
              >
                <h2 className="text-xl font-bold text-gray-900">Artists</h2>
                <svg className={`w-6 h-6 text-gray-600 transition ${expandedSections.artists ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.artists && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                  {artists.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No artists found</div>
                  ) : (
                    artists.map((artist) => (
                      <button
                        key={artist.name}
                        onClick={() => setSelectedArtist(artist)}
                        className="w-full p-4 hover:bg-gray-50 transition flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <div>
                            <h4 className="font-semibold text-gray-900">{artist.name}</h4>
                            <p className="text-xs text-gray-500">{artist.albums.length} albums</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Genres Section */}
            <div className="space-y-4">
              <button
                onClick={() => toggleSection('genres')}
                className="flex items-center justify-between w-full px-2 py-2 hover:bg-gray-50 rounded-lg"
              >
                <h2 className="text-xl font-bold text-gray-900">Genres</h2>
                <svg className={`w-6 h-6 text-gray-600 transition ${expandedSections.genres ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.genres && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                  {genres.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No genres found</div>
                  ) : (
                    genres.map((genre) => (
                      <button
                        key={genre.name}
                        onClick={() => setSelectedGenre(genre)}
                        className="w-full p-4 hover:bg-gray-50 transition flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <div>
                            <h4 className="font-semibold text-gray-900">{genre.name}</h4>
                            <p className="text-xs text-gray-500">{genre.albums.length} albums</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Albums Section */}
            <div className="space-y-4">
              <button
                onClick={() => toggleSection('albums')}
                className="flex items-center justify-between w-full px-2 py-2 hover:bg-gray-50 rounded-lg"
              >
                <h2 className="text-xl font-bold text-gray-900">Albums</h2>
                <svg className={`w-6 h-6 text-gray-600 transition ${expandedSections.albums ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.albums && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
                  {allAlbums.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      {context === 'library'
                        ? 'No albums in library yet. Use search above to add music!'
                        : 'No albums in Discover yet. Use search above to add music!'
                      }
                    </div>
                  ) : (
                    allAlbums.map((album) => (
                      <div key={album.id} className="p-4 hover:bg-gray-50 transition flex items-center gap-4 relative">
                        <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                          {album.hideArtwork ? (
                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                              <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            </div>
                          ) : album.artworkUrl ? (
                            <img src={album.artworkUrl.replace('{w}', '300').replace('{h}', '300')} alt={album.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                              <svg className="w-6 h-6 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{album.name}</h3>
                          <p className="text-sm text-gray-600 truncate">{album.artist}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {album.isFullAlbum ? `${album.trackCount} tracks` : `${album.approvedSongs.length} approved songs`}
                          </p>
                        </div>

                        {/* Three-dot menu */}
                        {album.appleAlbumId && (
                          <div className="relative" data-menu-container>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === album.id ? null : album.id)}
                              className="p-2 hover:bg-gray-200 rounded-full transition"
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>

                            {/* Dropdown Menu */}
                            {openMenuId === album.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[200px]" data-menu-container>
                                <button
                                  onClick={() => handleToggleArtworkEverywhere(album)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {album.hideArtwork ? (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    ) : (
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    )}
                                  </svg>
                                  <span>{album.hideArtwork ? 'Show Artwork Everywhere' : 'Hide Artwork Everywhere'}</span>
                                </button>
                                <button
                                  onClick={() => handleRemoveEverywhere(album)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span>Remove Everywhere</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Import Playlist Modal */}
        {showImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowImport(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Import from Apple Music</h2>
                <button
                  onClick={() => setShowImport(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <PlaylistImport user={user} onClose={() => setShowImport(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default UnifiedMusicManagement;
