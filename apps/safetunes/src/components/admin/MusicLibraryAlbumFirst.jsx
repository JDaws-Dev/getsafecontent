import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import AlbumDetailModal from './AlbumDetailModal';
import AlbumSearchSimple from './AlbumSearchSimple';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';

function MusicLibraryAlbumFirst({ user }) {
  const [activeSubTab, setActiveSubTab] = useState('library');
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'discoverable', 'assigned'

  // Fetch data - unified query returns all albums with discoverable flag
  const approvedAlbums = useQuery(api.albums.getApprovedAlbums,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Album tracks for song search
  const albumTracks = useQuery(api.albums.getAllAlbumTracksForUser,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Helper functions
  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  // Filter albums based on search and filter mode
  const filteredAlbums = approvedAlbums.filter(album => {
    // Apply filter mode first
    if (filterMode === 'discoverable' && !album.discoverable) return false;
    if (filterMode === 'assigned' && album.kidProfiles?.length === 0) return false;

    // Then apply search
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    // Search in album name
    if (album.name?.toLowerCase().includes(query)) return true;

    // Search in artist name
    if (album.artist?.toLowerCase().includes(query)) return true;

    // Search in song names within this album
    const albumSongs = albumTracks.filter(track => track.appleAlbumId === album.appleAlbumId);
    const hasSongMatch = albumSongs.some(track =>
      track.songName?.toLowerCase().includes(query)
    );

    return hasSongMatch;
  });

  // Count stats
  const discoverableCount = approvedAlbums.filter(a => a.discoverable).length;
  const assignedCount = approvedAlbums.filter(a => a.kidProfiles?.length > 0).length;

  // Album Card Component
  const AlbumCard = ({ album, onClick }) => {
    const albumName = album.name || album.albumName || 'Unknown Album';
    const artistName = album.artist || album.artistName || 'Unknown Artist';
    const artworkUrl = album.artworkUrl;
    const hideArtwork = album.hideArtwork || false;

    return (
      <div
        className="group relative cursor-pointer"
        onClick={() => onClick(album)}
      >
        {/* Discoverable badge */}
        {album.discoverable && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
        )}

        {hideArtwork ? (
          <div className="w-full aspect-square bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg shadow-md group-hover:shadow-xl transition-shadow mb-2 flex flex-col items-center justify-center">
            <svg className="w-12 h-12 text-white/70 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            <span className="text-white/70 text-xs font-medium">Hidden</span>
          </div>
        ) : artworkUrl ? (
          <img
            src={artworkUrl.replace('{w}', '300').replace('{h}', '300')}
            alt={albumName}
            className="w-full aspect-square object-cover rounded-lg shadow-md group-hover:shadow-xl transition-shadow mb-2"
          />
        ) : (
          <div className="w-full aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg shadow-md group-hover:shadow-xl transition-shadow mb-2 flex items-center justify-center">
            <svg className="w-12 h-12 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}

        {/* Album info */}
        <h3 className="font-medium text-sm text-gray-900 truncate">{albumName}</h3>
        <p className="text-xs text-gray-600 truncate">{artistName}</p>

        {/* Kid badges */}
        {album.kidProfiles && album.kidProfiles.length > 0 && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {album.kidProfiles.slice(0, 3).map((kid) => (
              <div
                key={kid._id}
                className={`w-5 h-5 rounded-full ${getColorClass(kid.color)} flex items-center justify-center p-1`}
                title={kid.name}
              >
                {getAvatarIcon(kid.avatar)}
              </div>
            ))}
            {album.kidProfiles.length > 3 && (
              <span className="text-xs text-gray-500">+{album.kidProfiles.length - 3}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveSubTab('library')}
            className={`${
              activeSubTab === 'library'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            } flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Your Music</span>
            <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
              {approvedAlbums.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('add')}
            className={`${
              activeSubTab === 'add'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-gray-100'
            } flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Your Music Tab */}
      {activeSubTab === 'library' && (
        <div className="space-y-6">
          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  inputMode="search"
                  placeholder="Search albums, artists, or songs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filterMode === 'all'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({approvedAlbums.length})
                </button>
                <button
                  onClick={() => setFilterMode('discoverable')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1 ${
                    filterMode === 'discoverable'
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Discoverable ({discoverableCount})
                </button>
                <button
                  onClick={() => setFilterMode('assigned')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    filterMode === 'assigned'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Assigned ({assignedCount})
                </button>
              </div>
            </div>
          </div>

          {/* Info Banner - What is Discoverable */}
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-1">Discoverable Albums</h4>
                <p className="text-sm text-gray-600">
                  Albums marked with a <span className="inline-flex items-center bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded-full mx-1"><svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span> star appear in your kids' Discover tab, where they can explore and add music to their own library.
                </p>
              </div>
            </div>
          </div>

          {/* Albums Grid */}
          {filteredAlbums.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
              <div className="w-20 h-20 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              {searchQuery || filterMode !== 'all' ? (
                <>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery ? `No albums match "${searchQuery}"` : `No ${filterMode} albums`}
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); setFilterMode('all'); }}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-md"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Filters
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Albums Yet</h3>
                  <p className="text-gray-600 mb-6">Start building your library by searching for albums</p>
                  <button
                    onClick={() => setActiveSubTab('add')}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-md"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Your First Album
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {filterMode === 'all' ? 'All Albums' : filterMode === 'discoverable' ? 'Discoverable Albums' : 'Assigned Albums'}
                  <span className="ml-2 text-sm text-gray-500">({filteredAlbums.length})</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredAlbums.map((album) => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    onClick={(album) => setSelectedAlbum(album.appleAlbumId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Music Sub-tab */}
      {activeSubTab === 'add' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-md p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Search Apple Music</h3>
                <p className="text-white/90 text-sm">
                  Search for albums, then choose which kids can access them and whether to make them discoverable
                </p>
              </div>
            </div>
          </div>

          {/* Album Search Component */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <AlbumSearchSimple
              user={user}
              onAlbumClick={(appleAlbumId) => setSelectedAlbum(appleAlbumId)}
            />
          </div>
        </div>
      )}

      {/* Album Detail Modal */}
      {selectedAlbum && (
        <AlbumDetailModal
          isOpen={!!selectedAlbum}
          onClose={() => setSelectedAlbum(null)}
          albumId={selectedAlbum}
          userId={user._id}
        />
      )}
    </div>
  );
}

export default MusicLibraryAlbumFirst;
