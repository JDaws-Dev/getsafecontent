import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../hooks/useAuth';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import AppleMusicAuth from './AppleMusicAuth';
import PlaylistImport from './PlaylistImport';
import musicKitService from '../../config/musickit';
import { useToast } from '../common/Toast';
import { backfillAlbumTracks } from '../../utils/backfillAlbumTracks';

function Library() {
  const { user } = useAuth();
  const { showToast, ToastContainer } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [selectedKidFilter, setSelectedKidFilter] = useState('all'); // 'all' or kidProfileId
  const [isBackfilling, setIsBackfilling] = useState(false);

  // Collapsible sections - iTunes mobile style
  const [expandedSections, setExpandedSections] = useState({
    playlists: true,
    artists: false,
    albums: false,
    songs: false,
  });

  // Fetch data
  const albums = useQuery(api.albums.getApprovedAlbums, user ? { userId: user._id } : 'skip') || [];
  const songs = useQuery(api.songs.getApprovedSongs, user ? { userId: user._id } : 'skip') || [];
  const playlists = useQuery(api.playlists.getPlaylists, user ? { userId: user._id } : 'skip') || [];
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles, user ? { userId: user._id } : 'skip') || [];

  // Mutations
  const removeAlbum = useMutation(api.albums.removeApprovedAlbum);
  const removeSong = useMutation(api.songs.removeApprovedSong);
  const removePlaylist = useMutation(api.playlists.deletePlaylist);
  const toggleAlbumArtwork = useMutation(api.albums.toggleAlbumArtwork);
  const toggleSongArtwork = useMutation(api.songs.toggleSongArtwork);
  const refreshAlbumArtwork = useMutation(api.albums.refreshAlbumArtwork);
  const createPlaylist = useMutation(api.playlists.createPlaylist);
  const addSongsToPlaylist = useMutation(api.playlists.addSongsToPlaylist);
  const removeSongFromPlaylist = useMutation(api.playlists.removeSongFromPlaylist);
  const approveSong = useMutation(api.songs.approveSong);
  const approveAlbum = useMutation(api.albums.approveAlbum);

  // Create playlist state
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedKidsForPlaylist, setSelectedKidsForPlaylist] = useState([]);

  // Add to playlist state
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(null); // { type: 'song'|'album', item: {...} }
  const [selectedPlaylistsForAdd, setSelectedPlaylistsForAdd] = useState([]);

  // Playlist detail state
  const [selectedPlaylistForView, setSelectedPlaylistForView] = useState(null);

  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  const getKidNames = (kidProfileIds) => {
    if (!kidProfileIds || kidProfileIds.length === 0) return 'All Kids';
    return kidProfileIds.map(id => {
      const kid = kidProfiles.find(k => k._id === id);
      return kid ? kid.name : '';
    }).filter(Boolean).join(', ');
  };

  // Auto-refresh missing artwork
  const [refreshedArtwork, setRefreshedArtwork] = useState(new Set());

  const handleRefreshArtwork = async (album) => {
    try {
      // Fetch fresh artwork from Apple Music
      const music = musicKitService.getMusicKitInstance();
      if (!music) {
        console.error('MusicKit not initialized');
        return;
      }

      const response = await music.api.music(`/v1/catalog/us/albums/${album.appleAlbumId}`);
      const freshAlbum = response.data.data[0];

      if (freshAlbum?.attributes?.artwork?.url) {
        const artworkUrl = freshAlbum.attributes.artwork.url
          .replace('{w}', '300')
          .replace('{h}', '300');

        await refreshAlbumArtwork({
          userId: user._id,
          appleAlbumId: album.appleAlbumId,
          artworkUrl: artworkUrl,
        });

        console.log('Artwork refreshed for album:', album.name);
        setRefreshedArtwork(prev => new Set([...prev, album.appleAlbumId]));
      }
    } catch (error) {
      console.error('Failed to refresh artwork:', error);
    }
  };

  // Automatically refresh artwork for albums that don't have it
  useEffect(() => {
    if (!albums || albums.length === 0 || !user) return;

    const albumsWithoutArtwork = albums.filter(
      album => !album.artworkUrl && !refreshedArtwork.has(album.appleAlbumId)
    );

    if (albumsWithoutArtwork.length > 0) {
      // Refresh one album at a time to avoid rate limiting
      const album = albumsWithoutArtwork[0];
      handleRefreshArtwork(album);
    }
  }, [albums, user, refreshedArtwork]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim() || selectedKidsForPlaylist.length === 0) return;

    try {
      // Create a playlist for each selected kid
      for (const kidId of selectedKidsForPlaylist) {
        await createPlaylist({
          kidProfileId: kidId,
          userId: user._id,
          name: newPlaylistName.trim(),
          description: newPlaylistDescription.trim() || undefined,
        });
      }

      // Reset form
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setSelectedKidsForPlaylist([]);
      setShowCreatePlaylist(false);
    } catch (error) {
      console.error('Error creating playlist:', error);
    }
  };

  const toggleKidSelection = (kidId) => {
    setSelectedKidsForPlaylist(prev => {
      if (prev.includes(kidId)) {
        return prev.filter(id => id !== kidId);
      } else {
        return [...prev, kidId];
      }
    });
  };

  const togglePlaylistSelection = (playlistId) => {
    setSelectedPlaylistsForAdd(prev => {
      if (prev.includes(playlistId)) {
        return prev.filter(id => id !== playlistId);
      } else {
        return [...prev, playlistId];
      }
    });
  };

  const handleAddToPlaylist = async () => {
    if (!showAddToPlaylist || selectedPlaylistsForAdd.length === 0) return;

    try {
      const { type, item } = showAddToPlaylist;

      if (type === 'song') {
        // Add single song to selected playlists
        for (const playlistId of selectedPlaylistsForAdd) {
          await addSongsToPlaylist({
            playlistId,
            songs: [{
              appleSongId: item.appleSongId,
              songName: item.songName,
              artistName: item.artistName,
              albumName: item.albumName,
              artworkUrl: item.artworkUrl,
              durationInMillis: item.durationInMillis,
            }],
            approveForKid: true, // Also approve for kid's library
          });
        }
      } else if (type === 'album') {
        // Fetch album tracks from Apple Music
        try {
          await musicKitService.initialize();
          const tracks = await musicKitService.getAlbumTracks(item.appleAlbumId);

          // Convert Apple Music tracks to our song format
          const songs = tracks.map(track => ({
            appleSongId: track.id,
            songName: track.attributes.name,
            artistName: track.attributes.artistName,
            albumName: track.attributes.albumName,
            artworkUrl: track.attributes.artwork?.url?.replace('{w}', '300').replace('{h}', '300'),
            durationInMillis: track.attributes.durationInMillis,
          }));

          // Add all tracks to selected playlists
          for (const playlistId of selectedPlaylistsForAdd) {
            await addSongsToPlaylist({
              playlistId,
              songs,
              approveForKid: true, // Also approve for kid's library
            });
          }
        } catch (error) {
          console.error('Error fetching album tracks:', error);
          showToast('Failed to fetch album tracks. Please try again.', 'error');
          return;
        }
      }

      // Reset and close
      setShowAddToPlaylist(null);
      setSelectedPlaylistsForAdd([]);
    } catch (error) {
      console.error('Error adding to playlist:', error);
    }
  };

  // Filter functions
  const filteredAlbums = albums.filter(album => {
    const matchesSearch = album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      album.artist.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedKidFilter === 'all') return matchesSearch;

    // Check if album is approved for this specific kid
    return matchesSearch && (
      album.kidProfileIds?.includes(selectedKidFilter) ||
      (!album.kidProfileIds || album.kidProfileIds.length === 0) // Also show items approved for all kids
    );
  });

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.songName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artistName.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedKidFilter === 'all') return matchesSearch;

    // Check if song is approved for this specific kid
    return matchesSearch && (
      song.kidProfileId === selectedKidFilter ||
      !song.kidProfileId // Also show items approved for all kids
    );
  });

  const filteredPlaylists = playlists.filter(playlist => {
    const matchesSearch = playlist.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedKidFilter === 'all') return matchesSearch;

    return matchesSearch && playlist.kidProfileId === selectedKidFilter;
  });

  // Group by artists
  const artistsMap = new Map();
  filteredAlbums.forEach(album => {
    if (!artistsMap.has(album.artist)) {
      artistsMap.set(album.artist, { name: album.artist, albums: [], songs: [] });
    }
    artistsMap.get(album.artist).albums.push(album);
  });
  filteredSongs.forEach(song => {
    if (!artistsMap.has(song.artistName)) {
      artistsMap.set(song.artistName, { name: song.artistName, albums: [], songs: [] });
    }
    artistsMap.get(song.artistName).songs.push(song);
  });
  const artists = Array.from(artistsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Backfill tracks for existing albums
  const handleBackfillTracks = async () => {
    if (!user || !albums) return;

    setIsBackfilling(true);
    try {
      const result = await backfillAlbumTracks(albums, approveAlbum, user._id);
      showToast(`Backfill complete! Success: ${result.success}, Errors: ${result.errors}`, result.errors === 0 ? 'success' : 'warning');
      if (result.errors > 0) {
        console.error('Backfill errors:', result.errorDetails);
      }
    } catch (err) {
      console.error('Backfill failed:', err);
      showToast('Backfill failed. Check console for details.', 'error');
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <>
      {ToastContainer}
      <div>
        {/* Header */}
        <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Music Library</h2>
            <p className="text-gray-600 mt-1">
              {playlists.length} playlists • {artists.length} artists • {albums.length} albums • {songs.length} songs
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleBackfillTracks}
              disabled={isBackfilling || !albums || albums.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBackfilling ? 'Backfilling...' : '🔄 Backfill Album Tracks'}
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import from Apple Music
            </button>
          </div>
        </div>

        {/* Import Section */}
        {showImport && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Import from Apple Music</h3>
              <button
                onClick={() => setShowImport(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AppleMusicAuth showOnlyWhenDisconnected={true} />
            <PlaylistImport />
          </div>
        )}

        {/* Kid Filter */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedKidFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                selectedKidFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Kids
            </button>
            {kidProfiles.map((kid) => (
              <button
                key={kid._id}
                onClick={() => setSelectedKidFilter(kid._id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
                  selectedKidFilter === kid._id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className={`w-6 h-6 rounded-full ${selectedKidFilter === kid._id ? 'bg-white/20' : getColorClass(kid.color)} flex items-center justify-center p-1`}>
                  {selectedKidFilter === kid._id ? (
                    <div className={`w-full h-full ${getColorClass(kid.color)} rounded-full flex items-center justify-center`}>
                      {getAvatarIcon(kid.avatar)}
                    </div>
                  ) : (
                    <div className="text-white">
                      {getAvatarIcon(kid.avatar)}
                    </div>
                  )}
                </div>
                {kid.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search library..."
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Create Playlist Modal */}
      {showCreatePlaylist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Create New Playlist</h3>
              <button
                onClick={() => {
                  setShowCreatePlaylist(false);
                  setNewPlaylistName('');
                  setNewPlaylistDescription('');
                  setSelectedKidsForPlaylist([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-4">
              {/* Playlist Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Playlist Name *
                </label>
                <input
                  type="text"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  placeholder="My Awesome Playlist"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newPlaylistDescription}
                  onChange={(e) => setNewPlaylistDescription(e.target.value)}
                  placeholder="A collection of great songs..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Select Kids */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Kids * (select one or more)
                </label>
                <div className="space-y-2">
                  {kidProfiles.map((kid) => (
                    <label
                      key={kid._id}
                      className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                        selectedKidsForPlaylist.includes(kid._id)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={kid._id}
                        checked={selectedKidsForPlaylist.includes(kid._id)}
                        onChange={() => toggleKidSelection(kid._id)}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <div className={`w-8 h-8 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white p-1.5`}>
                        {getAvatarIcon(kid.avatar)}
                      </div>
                      <span className="font-medium text-gray-900">{kid.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreatePlaylist(false);
                    setNewPlaylistName('');
                    setNewPlaylistDescription('');
                    setSelectedKidsForPlaylist([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPlaylistName.trim() || selectedKidsForPlaylist.length === 0}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Create Playlist{selectedKidsForPlaylist.length > 1 ? 's' : ''}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add to Playlist Modal */}
      {showAddToPlaylist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add to Playlist</h3>
              <button
                onClick={() => {
                  setShowAddToPlaylist(null);
                  setSelectedPlaylistsForAdd([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Song/Album Preview */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">
                {showAddToPlaylist.type === 'song' ? showAddToPlaylist.item.songName : showAddToPlaylist.item.name}
              </p>
              <p className="text-xs text-gray-600">
                {showAddToPlaylist.type === 'song' ? showAddToPlaylist.item.artistName : showAddToPlaylist.item.artist}
              </p>
            </div>

            {/* Playlist Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Playlists (select one or more)
              </label>
              {playlists.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No playlists available</p>
                  <p className="text-gray-400 text-xs mt-1">Create a playlist first in the Playlists tab</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {playlists.map((playlist) => {
                    const kid = kidProfiles.find(k => k._id === playlist.kidProfileId);
                    return (
                      <label
                        key={playlist._id}
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                          selectedPlaylistsForAdd.includes(playlist._id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={playlist._id}
                          checked={selectedPlaylistsForAdd.includes(playlist._id)}
                          onChange={() => togglePlaylistSelection(playlist._id)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{playlist.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {kid && (
                              <div className="flex items-center gap-1">
                                <div className={`w-4 h-4 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white p-0.5`}>
                                  {getAvatarIcon(kid.avatar)}
                                </div>
                                <span className="text-xs text-gray-600">{kid.name}</span>
                              </div>
                            )}
                            <span className="text-xs text-gray-500">{playlist.songs?.length || 0} songs</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddToPlaylist(null);
                  setSelectedPlaylistsForAdd([]);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddToPlaylist}
                disabled={selectedPlaylistsForAdd.length === 0}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add to {selectedPlaylistsForAdd.length} Playlist{selectedPlaylistsForAdd.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playlist Detail Modal */}
      {selectedPlaylistForView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{selectedPlaylistForView.name}</h3>
                {selectedPlaylistForView.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedPlaylistForView.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {kidProfiles.find(k => k._id === selectedPlaylistForView.kidProfileId) && (() => {
                    const kid = kidProfiles.find(k => k._id === selectedPlaylistForView.kidProfileId);
                    return (
                      <div className="flex items-center gap-1">
                        <div className={`w-5 h-5 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white p-1`}>
                          {getAvatarIcon(kid.avatar)}
                        </div>
                        <span className="text-sm text-gray-600">{kid.name}'s playlist</span>
                      </div>
                    );
                  })()}
                  <span className="text-sm text-gray-500">{selectedPlaylistForView.songs?.length || 0} songs</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlaylistForView(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Songs List */}
            <div className="flex-1 overflow-y-auto p-6">
              {!selectedPlaylistForView.songs || selectedPlaylistForView.songs.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="text-gray-500">No songs in this playlist yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add songs from the Songs or Albums tab</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedPlaylistForView.songs.map((song, index) => {
                    // Find the approved song to check hideArtwork status
                    const approvedSong = songs.find(s => s.appleSongId === song.appleSongId);
                    const isArtworkHidden = approvedSong?.hideArtwork || false;

                    return (
                      <div key={index} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition group">
                        {/* Song Number */}
                        <div className="w-6 text-center text-sm text-gray-500">
                          {index + 1}
                        </div>

                        {/* Artwork */}
                        <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                          {isArtworkHidden ? (
                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                              <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            </div>
                          ) : song.artworkUrl ? (
                            <img src={song.artworkUrl.replace('{w}', '300').replace('{h}', '300')} alt={song.songName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                              <svg className="w-6 h-6 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Song Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{song.songName}</p>
                          <p className="text-sm text-gray-600 truncate">{song.artistName}</p>
                          {song.albumName && (
                            <p className="text-xs text-gray-500 truncate">{song.albumName}</p>
                          )}
                        </div>

                        {/* Duration */}
                        {song.durationInMillis && (
                          <div className="text-sm text-gray-500 hidden sm:block">
                            {Math.floor(song.durationInMillis / 60000)}:{String(Math.floor((song.durationInMillis % 60000) / 1000)).padStart(2, '0')}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {/* Toggle Artwork Button */}
                          <button
                            onClick={async () => {
                              // If song isn't approved yet, we need to approve it first
                              if (!approvedSong) {
                                const playlist = playlists.find(p => p._id === selectedPlaylistForView._id);
                                const kid = kidProfiles.find(k => k._id === playlist?.kidProfileId);
                                if (!kid) {
                                  showToast('Cannot find kid profile for this playlist', 'error');
                                  return;
                                }

                                // Approve the song first with hideArtwork set to true
                                await approveSong({
                                  userId: user._id,
                                  kidProfileId: kid._id,
                                  appleSongId: song.appleSongId,
                                  songName: song.songName,
                                  artistName: song.artistName,
                                  albumName: song.albumName,
                                  artworkUrl: song.artworkUrl,
                                  durationInMillis: song.durationInMillis,
                                  hideArtwork: true,
                                });

                                // Now toggle the song artwork which will cascade to the entire album
                                // This ensures all songs in the album get the hideArtwork setting
                                await toggleSongArtwork({
                                  userId: user._id,
                                  appleSongId: song.appleSongId,
                                  hideArtwork: true,
                                });
                              } else {
                                // Toggle existing song artwork (cascades to entire album)
                                await toggleSongArtwork({
                                  userId: user._id,
                                  appleSongId: song.appleSongId,
                                  hideArtwork: !isArtworkHidden,
                                });
                              }
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition"
                            title={isArtworkHidden ? 'Show artwork for entire album' : 'Hide artwork for entire album'}
                          >
                            {isArtworkHidden ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            )}
                          </button>

                          {/* Remove from Playlist Button */}
                          <button
                            onClick={async () => {
                              await removeSongFromPlaylist({
                                playlistId: selectedPlaylistForView._id,
                                appleSongId: song.appleSongId,
                              });
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                            title="Remove from playlist"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedPlaylistForView(null)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-t-xl shadow-sm border-b border-gray-200">
        <div className="flex space-x-1 p-2">
          <button
            onClick={() => setActiveView('albums')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeView === 'albums'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Albums ({filteredAlbums.length})
          </button>
          <button
            onClick={() => setActiveView('songs')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeView === 'songs'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Songs ({filteredSongs.length})
          </button>
          <button
            onClick={() => setActiveView('playlists')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeView === 'playlists'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Playlists ({filteredPlaylists.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-b-xl shadow-sm border-t-0">
        {/* Albums List View */}
        {activeView === 'albums' && (
          <div className="divide-y divide-gray-100">
            {filteredAlbums.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No albums found</p>
              </div>
            ) : (
              filteredAlbums.map((album) => (
                <div key={album.id} className="p-4 hover:bg-gray-50 transition flex items-center gap-4">
                  {/* Artwork */}
                  <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                    {album.hideArtwork ? (
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      </div>
                    ) : album.artworkUrl ? (
                      <img src={album.artworkUrl.replace('{w}', '300').replace('{h}', '300')} alt={album.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                        <svg className="w-8 h-8 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{album.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{album.artist}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {album.trackCount} tracks • {album.year || 'N/A'} • For: {getKidNames(album.kidProfileIds)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Add to Playlist Button */}
                    <button
                      onClick={() => setShowAddToPlaylist({ type: 'album', item: album })}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition"
                      title="Add album to playlist"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>

                    {/* Toggle Artwork Button */}
                    <button
                      onClick={() => toggleAlbumArtwork({
                        userId: user._id,
                        appleAlbumId: album.appleAlbumId,
                        hideArtwork: !album.hideArtwork,
                      })}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition"
                      title={album.hideArtwork ? 'Show artwork' : 'Hide artwork'}
                    >
                      {album.hideArtwork ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeAlbum({ albumId: album.id })}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                      title="Remove album"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Songs List View */}
        {activeView === 'songs' && (
          <div className="divide-y divide-gray-100">
            {filteredSongs.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No songs found</p>
              </div>
            ) : (
              filteredSongs.map((song) => (
                <div key={song._id} className="p-4 hover:bg-gray-50 transition flex items-center gap-4">
                  {/* Artwork */}
                  <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                    {song.hideArtwork ? (
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      </div>
                    ) : song.artworkUrl ? (
                      <img src={song.artworkUrl.replace('{w}', '300').replace('{h}', '300')} alt={song.songName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                        <svg className="w-6 h-6 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{song.songName}</h3>
                    <p className="text-sm text-gray-600 truncate">{song.artistName}</p>
                    {song.albumName && (
                      <p className="text-xs text-gray-500 truncate">{song.albumName}</p>
                    )}
                  </div>

                  {/* Duration */}
                  {song.durationInMillis && (
                    <div className="text-sm text-gray-500 hidden sm:block">
                      {Math.floor(song.durationInMillis / 60000)}:{String(Math.floor((song.durationInMillis % 60000) / 1000)).padStart(2, '0')}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Add to Playlist Button */}
                    <button
                      onClick={() => setShowAddToPlaylist({ type: 'song', item: song })}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition"
                      title="Add to playlist"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>

                    {/* Toggle Artwork Button */}
                    <button
                      onClick={() => toggleSongArtwork({
                        userId: user._id,
                        appleSongId: song.appleSongId,
                        hideArtwork: !song.hideArtwork,
                      })}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition"
                      title={song.hideArtwork ? 'Show artwork' : 'Hide artwork'}
                    >
                      {song.hideArtwork ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeSong({ songId: song._id })}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                      title="Remove song"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Playlists View */}
        {activeView === 'playlists' && (
          <div>
            {/* Create Playlist Button */}
            <div className="p-4 border-b border-gray-100">
              <button
                onClick={() => setShowCreatePlaylist(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Playlist
              </button>
            </div>

            {/* Playlists List */}
            <div className="divide-y divide-gray-100">
              {filteredPlaylists.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No playlists yet</p>
                  <p className="text-sm text-gray-400 mt-2">Create a playlist or import from Apple Music</p>
                </div>
              ) : (
                filteredPlaylists.map((playlist) => {
                  const kid = kidProfiles.find(k => k._id === playlist.kidProfileId);
                  return (
                    <div key={playlist._id} className="p-4 hover:bg-gray-50 transition">
                      <div className="flex items-start gap-4 cursor-pointer" onClick={() => setSelectedPlaylistForView(playlist)}>
                        {/* Playlist Icon */}
                        <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">{playlist.name}</h3>
                          {playlist.description && (
                            <p className="text-sm text-gray-600 mt-1">{playlist.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {kid && (
                              <div className="flex items-center gap-1">
                                <div className={`w-5 h-5 rounded-full ${getColorClass(kid.color)} flex items-center justify-center text-white p-1`}>
                                  {getAvatarIcon(kid.avatar)}
                                </div>
                                <span className="text-xs text-gray-600">{kid.name}</span>
                              </div>
                            )}
                            <span className="text-xs text-gray-500">{playlist.songs?.length || 0} songs</span>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePlaylist({ playlistId: playlist._id });
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                          title="Delete playlist"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      </div>
    </>
  );
}

export default Library;
