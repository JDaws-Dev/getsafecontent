import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../hooks/useAuth';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import AppleMusicAuth from './AppleMusicAuth';
import PlaylistImport from './PlaylistImport';
import musicKitService from '../../config/musickit';

function LibraryCollapsible() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [selectedKidFilter, setSelectedKidFilter] = useState('all');

  // iTunes mobile style - sections + navigation
  const [expandedSections, setExpandedSections] = useState({
    playlists: true,
    artists: false,
    albums: false,
    songs: false,
  });

  // Navigation state for slide-over screens
  const [selectedArtist, setSelectedArtist] = useState(null); // For Artists → Artist's Albums view

  // Modal state for viewing songs
  const [songModal, setSongModal] = useState(null); // { type: 'playlist'|'album', data: {...} }

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
  const createPlaylist = useMutation(api.playlists.createPlaylist);

  // Playlist state
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedKidsForPlaylist, setSelectedKidsForPlaylist] = useState([]);
  const [selectedPlaylistForView, setSelectedPlaylistForView] = useState(null);

  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  // Filter functions
  const filteredAlbums = albums.filter(album => {
    const matchesSearch = album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      album.artist.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedKidFilter === 'all') return matchesSearch;
    return matchesSearch && (
      album.kidProfileIds?.includes(selectedKidFilter) ||
      (!album.kidProfileIds || album.kidProfileIds.length === 0)
    );
  });

  const filteredSongs = songs.filter(song => {
    const matchesSearch = song.songName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artistName.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedKidFilter === 'all') return matchesSearch;
    return matchesSearch && (
      song.kidProfileId === selectedKidFilter ||
      !song.kidProfileId
    );
  });

  const filteredPlaylists = playlists.filter(playlist => {
    const matchesSearch = playlist.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedKidFilter === 'all') return matchesSearch;
    return matchesSearch && playlist.kidProfileId === selectedKidFilter;
  });

  // Build unified album structure: every song belongs to an album
  // Combine full approved albums + partial albums (from individual songs)
  const allAlbumsMap = new Map();

  // First, add all fully approved albums
  filteredAlbums.forEach(album => {
    const key = `${album.artist}-${album.name}`;
    allAlbumsMap.set(key, {
      ...album,
      approvedSongs: [], // Will be populated if there are individual songs
      isFullAlbum: true,
    });
  });

  // Then, add individual approved songs to their albums (creating partial albums if needed)
  filteredSongs.forEach(song => {
    const key = `${song.artistName}-${song.albumName}`;
    if (!allAlbumsMap.has(key)) {
      // Create a partial album entry for this song
      allAlbumsMap.set(key, {
        id: `partial-${key}`,
        name: song.albumName,
        artist: song.artistName,
        artworkUrl: song.artworkUrl,
        approvedSongs: [],
        isFullAlbum: false,
        hideArtwork: song.hideArtwork,
      });
    }
    // Add the song to the album's approved songs
    allAlbumsMap.get(key).approvedSongs.push(song);
  });

  // Group albums by artist
  const artistsMap = new Map();
  Array.from(allAlbumsMap.values()).forEach(album => {
    if (!artistsMap.has(album.artist)) {
      artistsMap.set(album.artist, { name: album.artist, albums: [] });
    }
    artistsMap.get(album.artist).albums.push(album);
  });

  const artists = Array.from(artistsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // For Albums tab: flat list of all albums
  const allAlbums = Array.from(allAlbumsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Open song modal for viewing/managing songs
  const openSongModal = (type, data) => {
    setSongModal({ type, data });
  };

  const closeSongModal = () => {
    setSongModal(null);
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim() || selectedKidsForPlaylist.length === 0) return;

    try {
      for (const kidId of selectedKidsForPlaylist) {
        await createPlaylist({
          kidProfileId: kidId,
          userId: user._id,
          name: newPlaylistName.trim(),
          description: newPlaylistDescription.trim() || undefined,
        });
      }
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

  return (
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Kids *
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

      {/* Collapsible Library Sections - iTunes Mobile Style */}
      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">

        {/* PLAYLISTS SECTION */}
        <div>
          <button
            onClick={() => toggleSection('playlists')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Playlists</h3>
                <p className="text-sm text-gray-500">{filteredPlaylists.length} playlists</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.playlists ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {expandedSections.playlists && (
            <div className="border-t border-gray-100">
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
                          <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          </div>

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

        {/* ARTISTS SECTION */}
        <div>
          <button
            onClick={() => toggleSection('artists')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Artists</h3>
                <p className="text-sm text-gray-500">{artists.length} artists</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.artists ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {expandedSections.artists && (
            <div className="border-t border-gray-100">
              {artists.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No artists found</p>
                </div>
              ) : (
                artists.map((artist) => (
                  <div key={artist.name} className="border-b border-gray-100">
                    {/* Artist Header - Click to expand */}
                    <button
                      onClick={() => toggleArtist(artist.name)}
                      className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <div className="text-left">
                          <h4 className="font-semibold text-gray-900">{artist.name}</h4>
                          <p className="text-xs text-gray-500">
                            {artist.albums.length} albums
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${expandedArtists.has(artist.name) ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Artist's Albums - Nested expandable */}
                    {expandedArtists.has(artist.name) && (
                      <div className="bg-gray-50">
                        {artist.albums.map((album) => {
                          const isAlbumExpanded = expandedAlbumsInArtist.has(album.id);
                          // For full albums, show track count. For partial albums, show approved songs
                          const songCount = album.isFullAlbum ? album.trackCount : album.approvedSongs.length;

                          return (
                            <div key={album.id} className="border-t border-gray-200">
                              {/* Album Header - Click to expand and see songs */}
                              <button
                                onClick={() => toggleAlbumInArtist(album.id)}
                                className="w-full px-6 py-3 pl-10 flex items-center gap-3 hover:bg-gray-100 transition"
                              >
                                <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                  {album.hideArtwork ? (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                      </svg>
                                    </div>
                                  ) : album.artworkUrl ? (
                                    <img src={album.artworkUrl.replace('{w}', '300').replace('{h}', '300')} alt={album.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                                      <svg className="w-6 h-6 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0 text-left">
                                  <h5 className="font-medium text-gray-900 truncate">{album.name}</h5>
                                  <p className="text-xs text-gray-500">
                                    {album.isFullAlbum ? (
                                      <>{songCount} tracks{album.year ? ` • ${album.year}` : ''}</>
                                    ) : (
                                      <>{album.approvedSongs.length} approved {album.approvedSongs.length === 1 ? 'song' : 'songs'}</>
                                    )}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <svg
                                    className={`w-4 h-4 text-gray-400 transition-transform ${isAlbumExpanded ? 'rotate-90' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </button>

                              {/* Album's Songs */}
                              {isAlbumExpanded && (
                                <div className="bg-white">
                                  {album.isFullAlbum && album.approvedSongs.length === 0 ? (
                                    <div className="px-6 py-4 pl-14 text-sm text-gray-500">
                                      Full album approved - all {album.trackCount} tracks available
                                    </div>
                                  ) : album.approvedSongs.length === 0 ? (
                                    <div className="px-6 py-4 pl-14 text-sm text-gray-500">
                                      No individual songs approved yet
                                    </div>
                                  ) : (
                                    album.approvedSongs.map((song) => (
                                      <div key={song._id} className="px-6 py-3 pl-14 hover:bg-gray-50 transition flex items-center gap-3">
                                        <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                          {song.hideArtwork ? (
                                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                              <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                              </svg>
                                            </div>
                                          ) : song.artworkUrl ? (
                                            <img src={song.artworkUrl.replace('{w}', '300').replace('{h}', '300')} alt={song.songName} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                                              <svg className="w-5 h-5 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                              </svg>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <h6 className="font-medium text-sm text-gray-900 truncate">{song.songName}</h6>
                                          {song.durationInMillis && (
                                            <p className="text-xs text-gray-500">
                                              {Math.floor(song.durationInMillis / 60000)}:{String(Math.floor((song.durationInMillis % 60000) / 1000)).padStart(2, '0')}
                                            </p>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleSongArtwork({
                                                userId: user._id,
                                                appleSongId: song.appleSongId,
                                                hideArtwork: !song.hideArtwork,
                                              });
                                            }}
                                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition"
                                            title={song.hideArtwork ? 'Show artwork' : 'Hide artwork'}
                                          >
                                            {song.hideArtwork ? (
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

                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeSong({ songId: song._id });
                                            }}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition"
                                            title="Remove song"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}

                              {/* Album action buttons (show when NOT expanded) - only for full albums */}
                              {!isAlbumExpanded && album.isFullAlbum && (
                                <div className="px-6 py-2 pl-10 flex gap-2 bg-gray-50">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAlbumArtwork({
                                        userId: user._id,
                                        appleAlbumId: album.appleAlbumId,
                                        hideArtwork: !album.hideArtwork,
                                      });
                                    }}
                                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded transition"
                                    title={album.hideArtwork ? 'Show artwork' : 'Hide artwork'}
                                  >
                                    {album.hideArtwork ? 'Show artwork' : 'Hide artwork'}
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeAlbum({ albumId: album.id });
                                    }}
                                    className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition"
                                    title="Remove album"
                                  >
                                    Remove Album
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* ALBUMS SECTION */}
        <div>
          <button
            onClick={() => toggleSection('albums')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Albums</h3>
                <p className="text-sm text-gray-500">{allAlbums.length} albums</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.albums ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {expandedSections.albums && (
            <div className="border-t border-gray-100">
              {allAlbums.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No albums found</p>
                </div>
              ) : (
                allAlbums.map((album) => {
                  const isExpanded = expandedAlbumsInAlbumsTab.has(album.id);
                  const songCount = album.isFullAlbum ? album.trackCount : album.approvedSongs.length;

                  return (
                    <div key={album.id} className="border-b border-gray-100">
                      {/* Album Header */}
                      <button
                        onClick={() => toggleAlbumInAlbumsTab(album.id)}
                        className="w-full p-4 hover:bg-gray-50 transition flex items-center gap-4"
                      >
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

                        <div className="flex-1 min-w-0 text-left">
                          <h3 className="font-semibold text-gray-900 truncate">{album.name}</h3>
                          <p className="text-sm text-gray-600 truncate">{album.artist}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {album.isFullAlbum ? (
                              <>{songCount} tracks{album.year ? ` • ${album.year}` : ''}</>
                            ) : (
                              <>{album.approvedSongs.length} approved {album.approvedSongs.length === 1 ? 'song' : 'songs'}</>
                            )}
                          </p>
                        </div>

                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Approved Songs (when expanded) */}
                      {isExpanded && album.approvedSongs.length > 0 && (
                        <div className="bg-gray-50 px-6 py-3 space-y-2">
                          {album.approvedSongs.map((song) => (
                            <div key={song._id} className="flex items-center gap-3 p-2 bg-white rounded hover:bg-gray-50 transition">
                              <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                                {song.hideArtwork ? (
                                  <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                                    <svg className="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                  </div>
                                ) : song.artworkUrl ? (
                                  <img src={song.artworkUrl.replace('{w}', '300').replace('{h}', '300')} alt={song.songName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
                                    <svg className="w-5 h-5 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h6 className="font-medium text-sm text-gray-900 truncate">{song.songName}</h6>
                                {song.durationInMillis && (
                                  <p className="text-xs text-gray-500">
                                    {Math.floor(song.durationInMillis / 60000)}:{String(Math.floor((song.durationInMillis % 60000) / 1000)).padStart(2, '0')}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSong({ songId: song._id });
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-full transition flex-shrink-0"
                                title="Remove song"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Full album indicator (when expanded but no individual songs) */}
                      {isExpanded && album.isFullAlbum && album.approvedSongs.length === 0 && (
                        <div className="bg-gray-50 px-6 py-4 text-sm text-gray-500 text-center">
                          Full album approved - all {album.trackCount} tracks available
                        </div>
                      )}

                      {/* Album actions (only for full albums, when NOT expanded) */}
                      {!isExpanded && album.isFullAlbum && (
                        <div className="px-6 py-2 flex gap-2 bg-gray-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAlbumArtwork({
                                userId: user._id,
                                appleAlbumId: album.appleAlbumId,
                                hideArtwork: !album.hideArtwork,
                              });
                            }}
                            className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded transition"
                            title={album.hideArtwork ? 'Show artwork' : 'Hide artwork'}
                          >
                            {album.hideArtwork ? 'Show artwork' : 'Hide artwork'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAlbum({ albumId: album.id });
                            }}
                            className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition"
                            title="Remove album"
                          >
                            Remove Album
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* SONGS SECTION */}
        <div>
          <button
            onClick={() => toggleSection('songs')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Songs</h3>
                <p className="text-sm text-gray-500">{filteredSongs.length} songs</p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.songs ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {expandedSections.songs && (
            <div className="border-t border-gray-100 divide-y divide-gray-100">
              {filteredSongs.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No songs found</p>
                </div>
              ) : (
                filteredSongs.map((song) => (
                  <div key={song._id} className="p-4 hover:bg-gray-50 transition flex items-center gap-4">
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

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{song.songName}</h3>
                      <p className="text-sm text-gray-600 truncate">{song.artistName}</p>
                      {song.albumName && (
                        <p className="text-xs text-gray-500 truncate">{song.albumName}</p>
                      )}
                    </div>

                    {song.durationInMillis && (
                      <div className="text-sm text-gray-500 hidden sm:block">
                        {Math.floor(song.durationInMillis / 60000)}:{String(Math.floor((song.durationInMillis % 60000) / 1000)).padStart(2, '0')}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
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
        </div>

      </div>
    </div>
  );
}

export default LibraryCollapsible;
