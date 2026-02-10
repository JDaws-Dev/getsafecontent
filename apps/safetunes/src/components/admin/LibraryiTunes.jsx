import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import PlaylistImport from './PlaylistImport';
import musicKitService from '../../config/musickit';

function LibraryiTunes({ user, context = 'library', featuredOnly = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [selectedKidFilter, setSelectedKidFilter] = useState('all');

  // iTunes mobile style - sections
  const [expandedSections, setExpandedSections] = useState({
    playlists: true,
    artists: false,
    genres: false,
    albums: false,
  });

  // Navigation state for slide-over screens (Artists → Artist's Albums, Genres → Genre's Albums)
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);

  // Modal state for viewing songs
  const [songModal, setSongModal] = useState(null); // { type: 'playlist'|'album', data: {...} }
  const [albumTracks, setAlbumTracks] = useState([]); // Tracks fetched from Apple Music for full albums
  const [loadingTracks, setLoadingTracks] = useState(false);

  // Fetch data based on context
  const libraryAlbums = useQuery(api.albums.getApprovedAlbums, user && context === 'library' ? { userId: user._id } : 'skip') || [];
  const librarySongs = useQuery(api.songs.getApprovedSongs, user && context === 'library' ? { userId: user._id } : 'skip') || [];
  const featuredAlbums = useQuery(api.featured.getFeaturedAlbums, user && context === 'discover' ? { userId: user._id } : 'skip') || [];
  const featuredSongs = useQuery(api.featured.getFeaturedSongs, user && context === 'discover' ? { userId: user._id } : 'skip') || [];

  // Use the appropriate data source based on context
  const albums = context === 'discover' ? featuredAlbums.map(album => ({
    id: album._id,
    name: album.albumName,
    artist: album.artistName,
    artworkUrl: album.artworkUrl,
    year: album.releaseYear,
    trackCount: album.trackCount,
    appleAlbumId: album.appleAlbumId,
    genres: album.genres || [],
    hideArtwork: album.hideArtwork || false,
    kidProfileIds: [], // Featured albums are for all kids
    kidProfiles: [],
    allRecordIds: [album._id],
  })) : libraryAlbums;

  const songs = context === 'discover' ? featuredSongs.map(song => ({
    _id: song._id,
    appleSongId: song.appleSongId,
    songName: song.songName,
    artistName: song.artistName,
    albumName: song.albumName,
    artworkUrl: song.artworkUrl,
    durationInMillis: song.durationInMillis,
    isExplicit: song.isExplicit,
    hideArtwork: song.hideArtwork || false,
    kidProfileId: null, // Featured songs are for all kids
  })) : librarySongs;

  const playlists = useQuery(api.playlists.getPlaylists, user && context === 'library' ? { userId: user._id } : 'skip') || [];
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles, user ? { userId: user._id } : 'skip') || [];

  // Mutations
  const removeAlbum = useMutation(api.albums.removeApprovedAlbum);
  const removeSong = useMutation(api.songs.removeApprovedSong);
  const approveSong = useMutation(api.songs.approveSong);
  const removePlaylist = useMutation(api.playlists.deletePlaylist);
  const toggleAlbumArtwork = useMutation(api.albums.toggleAlbumArtwork);
  const toggleSongArtwork = useMutation(api.songs.toggleSongArtwork);
  const createPlaylist = useMutation(api.playlists.createPlaylist);

  // Playlist creation state
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [selectedKidsForPlaylist, setSelectedKidsForPlaylist] = useState([]);

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

  // Build unified album structure
  const allAlbumsMap = new Map();

  // Add fully approved albums
  filteredAlbums.forEach(album => {
    const key = `${album.artist}-${album.name}`;
    allAlbumsMap.set(key, {
      ...album,
      approvedSongs: [],
      isFullAlbum: true,
    });
  });

  // Add individual approved songs to their albums
  filteredSongs.forEach(song => {
    const key = `${song.artistName}-${song.albumName}`;
    if (!allAlbumsMap.has(key)) {
      // Try to find matching full album to get appleAlbumId and other metadata
      const matchingAlbum = filteredAlbums.find(a =>
        a.name === song.albumName && a.artist === song.artistName
      );

      allAlbumsMap.set(key, {
        id: `partial-${key}`,
        name: song.albumName,
        artist: song.artistName,
        artworkUrl: song.artworkUrl,
        appleAlbumId: matchingAlbum?.appleAlbumId, // Preserve appleAlbumId if found
        genres: matchingAlbum?.genres || [], // Preserve genres from matching album
        approvedSongs: [],
        isFullAlbum: false,
        hideArtwork: song.hideArtwork,
      });
    }
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
  const allAlbums = Array.from(allAlbumsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // Group albums by genre (only albums with valid genre data)
  const genresMap = new Map();
  const genericGenres = ['Music']; // Filter out overly generic genres

  Array.from(allAlbumsMap.values()).forEach(album => {
    // Only process albums that have genre data
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const openSongModal = async (type, data) => {
    console.log('[openSongModal] Opening modal:', { type, albumName: data.name, artist: data.artist, appleAlbumId: data.appleAlbumId, fullData: data });
    setSongModal({ type, data });

    // Always fetch album tracks from Apple Music for albums
    if (type === 'album') {
      setLoadingTracks(true);
      console.log('[openSongModal] Fetching tracks for album:', data.name, 'by', data.artist);
      try {
        // Initialize MusicKit if not already initialized
        await musicKitService.initialize();

        let albumId = data.appleAlbumId;

        // If we don't have appleAlbumId, search for the album
        if (!albumId) {
          console.log('[openSongModal] No appleAlbumId, searching for album...');
          const searchQuery = `${data.name} ${data.artist}`;
          const results = await musicKitService.search(searchQuery, {
            types: 'albums',
            limit: 1,
          });

          console.log('[openSongModal] Search results:', results);

          if (results?.data?.results?.albums?.data?.[0]) {
            albumId = results.data.results.albums.data[0].id;
            console.log('[openSongModal] Found album ID from search:', albumId);
          } else {
            console.warn('[openSongModal] No album found in search');
            setAlbumTracks([]);
            setLoadingTracks(false);
            return;
          }
        }

        // Fetch tracks using the dedicated getAlbumTracks method
        console.log('[openSongModal] Fetching tracks for album ID:', albumId);
        const tracks = await musicKitService.getAlbumTracks(albumId);
        console.log('[openSongModal] Received tracks:', tracks.length, 'tracks');
        setAlbumTracks(tracks);
      } catch (error) {
        console.error('[openSongModal] Failed to fetch album tracks:', error);
        setAlbumTracks([]);
      } finally {
        setLoadingTracks(false);
      }
    }
  };

  const closeSongModal = () => {
    setSongModal(null);
    setAlbumTracks([]);
    setLoadingTracks(false);
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim() || selectedKidsForPlaylist.length === 0) return;

    try {
      for (const kidId of selectedKidsForPlaylist) {
        await createPlaylist({
          userId: user._id,
          kidProfileId: kidId,
          name: newPlaylistName,
          description: newPlaylistDescription,
          songs: [],
        });
      }

      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setSelectedKidsForPlaylist([]);
      setShowCreatePlaylist(false);
    } catch (error) {
      console.error('Failed to create playlist:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="search"
              inputMode="search"
              placeholder={context === 'discover' ? 'Search Discover music...' : 'Search library...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onInput={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
            />
          </div>
          {context === 'library' && (
            <>
              <select
                value={selectedKidFilter}
                onChange={(e) => setSelectedKidFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Kids</option>
                {kidProfiles.map(kid => (
                  <option key={kid._id} value={kid._id}>{kid.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowImport(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-medium"
              >
                Import Playlist
              </button>
            </>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Import from Apple Music</h2>
              <button
                onClick={() => setShowImport(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
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

      {/* Artist Detail View - Full Screen Replacement */}
      {selectedArtist ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Back button */}
          <button
            onClick={() => setSelectedArtist(null)}
            className="w-full px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition border-b border-gray-200"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <div className="flex items-center gap-3 flex-1">
              <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div className="text-left">
                <span className="text-sm text-gray-500">Back to Artists</span>
                <h2 className="font-bold text-xl text-gray-900">{selectedArtist.name}</h2>
                <p className="text-sm text-gray-600">{selectedArtist.albums.length} albums</p>
              </div>
            </div>
          </button>

          {/* Artist's albums list */}
          <div className="divide-y divide-gray-100">
            {selectedArtist.albums.map((album) => {
              const songCount = album.isFullAlbum ? album.trackCount : album.approvedSongs.length;
              return (
                <button
                  key={album.id}
                  onClick={() => openSongModal('album', album)}
                  className="w-full p-4 hover:bg-gray-50 transition flex items-center gap-4 text-left"
                >
                  {/* Album artwork */}
                  <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
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

                  {/* Album info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{album.name}</h3>
                    <p className="text-sm text-gray-600">{songCount} {album.isFullAlbum ? 'tracks' : 'approved songs'}</p>
                  </div>

                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Normal Sections View */
        <div className="space-y-8">

          {/* PLAYLISTS SECTION - Only show in Library context */}
        {context === 'library' && (
        <div className="space-y-4">
          <button
            onClick={() => toggleSection('playlists')}
            className="flex items-center justify-between w-full px-2 py-2 hover:bg-gray-50 rounded-lg transition"
          >
            <h2 className="text-xl font-bold text-gray-900">Playlists</h2>
            <svg
              className={`w-6 h-6 text-gray-600 transition-transform ${expandedSections.playlists ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.playlists && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {filteredPlaylists.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No playlists yet</p>
                </div>
              ) : (
                filteredPlaylists.map((playlist) => (
                  <button
                    key={playlist._id}
                    onClick={() => openSongModal('playlist', playlist)}
                    className="w-full p-4 hover:bg-gray-50 transition flex items-center gap-4 text-left"
                  >
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{playlist.name}</h3>
                      {playlist.description && (
                        <p className="text-sm text-gray-600 truncate">{playlist.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{playlist.songs?.length || 0} songs</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        )}

        {/* ARTISTS SECTION */}
        <div className="space-y-4">
          <button
            onClick={() => toggleSection('artists')}
            className="flex items-center justify-between w-full px-2 py-2 hover:bg-gray-50 rounded-lg transition"
          >
            <h2 className="text-xl font-bold text-gray-900">Artists</h2>
            <svg
              className={`w-6 h-6 text-gray-600 transition-transform ${expandedSections.artists ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.artists && !selectedArtist && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {artists.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No artists found</p>
                </div>
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

          {/* Artist Detail View - Slide Over */}
          {expandedSections.artists && selectedArtist && (
            <div className="bg-gray-50">
              {/* Back button */}
              <button
                onClick={() => setSelectedArtist(null)}
                className="w-full p-4 hover:bg-gray-100 transition flex items-center gap-2 border-b border-gray-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium text-gray-900">Back to Artists</span>
              </button>

              {/* Artist albums */}
              <div className="divide-y divide-gray-200">
                {selectedArtist.albums.map((album) => {
                  const songCount = album.isFullAlbum ? album.trackCount : album.approvedSongs.length;
                  return (
                    <button
                      key={album.id}
                      onClick={() => openSongModal('album', album)}
                      className="w-full p-4 hover:bg-gray-100 transition flex items-center gap-4 text-left"
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
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 truncate">{album.name}</h5>
                        <p className="text-xs text-gray-500 mt-1">
                          {album.isFullAlbum ? (
                            <>{songCount} tracks{album.year ? ` • ${album.year}` : ''}</>
                          ) : (
                            <>{album.approvedSongs.length} approved {album.approvedSongs.length === 1 ? 'song' : 'songs'}</>
                          )}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* GENRES SECTION */}
        <div className="space-y-4">
          <button
            onClick={() => toggleSection('genres')}
            className="flex items-center justify-between w-full px-2 py-2 hover:bg-gray-50 rounded-lg transition"
          >
            <h2 className="text-xl font-bold text-gray-900">Genres</h2>
            <svg
              className={`w-6 h-6 text-gray-600 transition-transform ${expandedSections.genres ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.genres && !selectedGenre && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {genres.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No genres found</p>
                </div>
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

          {/* Genre Detail View - Slide Over */}
          {expandedSections.genres && selectedGenre && (
            <div className="bg-gray-50">
              {/* Back button */}
              <button
                onClick={() => setSelectedGenre(null)}
                className="w-full p-4 hover:bg-gray-100 transition flex items-center gap-2 border-b border-gray-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium text-gray-900">Back to Genres</span>
              </button>

              {/* Genre albums */}
              <div className="divide-y divide-gray-200">
                {selectedGenre.albums.map((album) => {
                  const songCount = album.isFullAlbum ? album.trackCount : album.approvedSongs.length;
                  return (
                    <button
                      key={album.id}
                      onClick={() => openSongModal('album', album)}
                      className="w-full p-4 hover:bg-gray-100 transition flex items-center gap-4 text-left"
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
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-gray-900 truncate">{album.name}</h5>
                        <p className="text-sm text-gray-600 truncate">{album.artist}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {album.isFullAlbum ? (
                            <>{songCount} tracks{album.year ? ` • ${album.year}` : ''}</>
                          ) : (
                            <>{album.approvedSongs.length} approved {album.approvedSongs.length === 1 ? 'song' : 'songs'}</>
                          )}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ALBUMS SECTION */}
        <div className="space-y-4">
          <button
            onClick={() => toggleSection('albums')}
            className="flex items-center justify-between w-full px-2 py-2 hover:bg-gray-50 rounded-lg transition"
          >
            <h2 className="text-xl font-bold text-gray-900">Albums</h2>
            <svg
              className={`w-6 h-6 text-gray-600 transition-transform ${expandedSections.albums ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.albums && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {allAlbums.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No albums found</p>
                </div>
              ) : (
                allAlbums.map((album) => {
                  const songCount = album.isFullAlbum ? album.trackCount : album.approvedSongs.length;
                  return (
                    <button
                      key={album.id}
                      onClick={() => openSongModal('album', album)}
                      className="w-full p-4 hover:bg-gray-50 transition flex items-center gap-4 text-left"
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
                      <div className="flex-1 min-w-0">
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
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        </div>
      )}

      {songModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeSongModal}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header with Album Artwork */}
            {songModal.type === 'album' && (
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start gap-4">
                  {/* Album Artwork */}
                  <div className="flex-shrink-0">
                    {songModal.data.hideArtwork ? (
                      <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-white/70 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        <span className="text-white/70 text-xs font-medium">Hidden</span>
                      </div>
                    ) : songModal.data.artworkUrl ? (
                      <img
                        src={songModal.data.artworkUrl.replace('{w}', '300').replace('{h}', '300')}
                        alt={songModal.data.name}
                        className="w-32 h-32 rounded-lg object-cover shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <svg className="w-16 h-16 text-purple-300" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Album Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{songModal.data.name}</h2>
                    <p className="text-sm text-gray-600 mb-2">{songModal.data.artist}</p>
                    <p className="text-sm text-gray-500">
                      {songModal.data.isFullAlbum ? `${songModal.data.trackCount} tracks` : `${songModal.data.approvedSongs.length} approved songs`}
                    </p>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={closeSongModal}
                    className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"
                  >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Playlist Header */}
            {songModal.type === 'playlist' && (
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{songModal.data.name}</h2>
                </div>
                <button
                  onClick={closeSongModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Modal Content - Songs List */}
            <div className="flex-1 overflow-y-auto p-6">
              {songModal.type === 'playlist' && (
                <div className="space-y-2">
                  {songModal.data.songs && songModal.data.songs.length > 0 ? (
                    songModal.data.songs.map((song, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                        {song.artworkUrl && (
                          <img src={song.artworkUrl.replace('{w}', '60').replace('{h}', '60')} alt={song.songName} className="w-12 h-12 rounded object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{song.songName}</p>
                          <p className="text-sm text-gray-600 truncate">{song.artistName}</p>
                        </div>
                        {song.durationInMillis && (
                          <span className="text-sm text-gray-500">
                            {Math.floor(song.durationInMillis / 60000)}:{String(Math.floor((song.durationInMillis % 60000) / 1000)).padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>No songs in this playlist yet</p>
                    </div>
                  )}
                </div>
              )}

              {songModal.type === 'album' && (
                <div className="space-y-2">
                  {loadingTracks ? (
                    <div className="text-center py-12 text-gray-500">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                      <p>Loading tracks...</p>
                    </div>
                  ) : albumTracks.length > 0 ? (
                    // Display full album tracks from Apple Music with approve/remove buttons
                    albumTracks.map((track, index) => {
                      // Check if this track is already approved as an individual song
                      const approvedSong = songs.find(song => song.appleSongId === track.id);

                      // Check if there are ANY individual song approvals for this specific album
                      const hasIndividualApprovals = songs.some(s =>
                        s.albumName === songModal.data.name &&
                        s.artistName === songModal.data.artist
                      );

                      // Check if the whole album is approved (no individual song management)
                      const isAlbumFullyApproved = songModal.data.isFullAlbum && !hasIndividualApprovals;

                      // Song is approved if: it's in approvedSongs OR the album is fully approved
                      const isApproved = approvedSong || isAlbumFullyApproved;

                      return (
                        <div key={track.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                          <div className="w-8 text-sm text-gray-500 text-center flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{track.attributes.name}</p>
                            <p className="text-sm text-gray-600 truncate">{track.attributes.artistName}</p>
                          </div>
                          {track.attributes.durationInMillis && (
                            <span className="text-sm text-gray-500 flex-shrink-0 mr-3">
                              {Math.floor(track.attributes.durationInMillis / 60000)}:{String(Math.floor((track.attributes.durationInMillis % 60000) / 1000)).padStart(2, '0')}
                            </span>
                          )}
                          {/* Toggle switch for approve/deny */}
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                if (isApproved) {
                                  // Toggling OFF
                                  if (isAlbumFullyApproved) {
                                    // Album is fully approved, user wants to remove this song
                                    // Convert to song-level management: KEEP album, add all OTHER songs
                                    console.log('Converting album to song-level management, excluding:', track.attributes.name);

                                    // DON'T remove the album - we need to keep it for the appleAlbumId!
                                    // The child page logic already handles filtering when individual songs exist

                                    // Add all other tracks as individual approvals
                                    const approvePromises = albumTracks
                                      .filter(t => t.id !== track.id) // Exclude this track
                                      .map(t => approveSong({
                                        userId: user._id,
                                        appleSongId: t.id,
                                        songName: t.attributes.name,
                                        artistName: t.attributes.artistName,
                                        albumName: songModal.data.name,
                                        artworkUrl: t.attributes.artwork?.url || songModal.data.artworkUrl,
                                        durationInMillis: t.attributes.durationInMillis,
                                        isExplicit: t.attributes.contentRating === 'explicit',
                                      }));
                                    await Promise.all(approvePromises);
                                  } else {
                                    // Individual song approval, just remove it
                                    console.log('Removing song:', approvedSong._id);
                                    await removeSong({ songId: approvedSong._id });
                                  }
                                } else {
                                  // Toggling ON - add as individual song approval
                                  console.log('Approving song:', track.attributes.name);
                                  await approveSong({
                                    userId: user._id,
                                    appleSongId: track.id,
                                    songName: track.attributes.name,
                                    artistName: track.attributes.artistName,
                                    albumName: songModal.data.name,
                                    artworkUrl: track.attributes.artwork?.url || songModal.data.artworkUrl,
                                    durationInMillis: track.attributes.durationInMillis,
                                    isExplicit: track.attributes.contentRating === 'explicit',
                                  });
                                }
                              } catch (error) {
                                console.error('Error toggling song approval:', error);
                              }
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex-shrink-0 ${
                              isApproved ? 'bg-green-600' : 'bg-gray-300'
                            }`}
                            title={isApproved ? 'Approved - Click to remove' : 'Not approved - Click to approve'}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isApproved ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p>Could not load album tracks</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer - Admin Actions */}
            {songModal.type === 'album' && (
              <div className="p-6 border-t border-gray-200 flex gap-3">
                {/* Show Hide Artwork button if we have an appleAlbumId */}
                {songModal.data.appleAlbumId && (
                  <button
                    onClick={async () => {
                      const newHideState = !songModal.data.hideArtwork;
                      await toggleAlbumArtwork({
                        userId: user._id,
                        appleAlbumId: songModal.data.appleAlbumId,
                        hideArtwork: newHideState,
                      });
                      // Update the modal state to reflect the change
                      setSongModal({
                        ...songModal,
                        data: {
                          ...songModal.data,
                          hideArtwork: newHideState
                        }
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                  >
                    {songModal.data.hideArtwork ? 'Show' : 'Hide'} Artwork
                  </button>
                )}
                <button
                  onClick={() => {
                    if (songModal.data.isFullAlbum) {
                      removeAlbum({ albumId: songModal.data.id });
                    } else {
                      // For partial albums, remove all individual songs
                      songModal.data.approvedSongs.forEach(song => {
                        removeSong({ songId: song._id });
                      });
                    }
                    closeSongModal();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
                >
                  {songModal.data.isFullAlbum ? 'Remove Album' : 'Remove All Songs'}
                </button>
              </div>
            )}

            {songModal.type === 'playlist' && (
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    removePlaylist({ playlistId: songModal.data._id });
                    closeSongModal();
                  }}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition"
                >
                  Delete Playlist
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default LibraryiTunes;

