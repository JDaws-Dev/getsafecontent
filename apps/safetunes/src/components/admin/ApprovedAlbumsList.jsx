import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../hooks/useAuth';

function ApprovedAlbumsList() {
  const { user } = useAuth();

  // Fetch approved albums from Convex
  const albums = useQuery(api.albums.getApprovedAlbums,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Mutation for removing albums
  const removeAlbumMutation = useMutation(api.albums.removeApprovedAlbum);

  // Mutation for toggling artwork visibility
  const toggleArtworkMutation = useMutation(api.albums.toggleAlbumArtwork);

  const onRemove = async (albumId) => {
    try {
      await removeAlbumMutation({ albumId });
    } catch (error) {
      console.error('Failed to remove album:', error);
    }
  };

  const toggleArtwork = async (album) => {
    try {
      await toggleArtworkMutation({
        userId: user._id,
        appleAlbumId: album.appleAlbumId,
        hideArtwork: !album.hideArtwork,
      });
    } catch (error) {
      console.error('Failed to toggle artwork:', error);
    }
  };
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'name', 'artist'

  // Filter albums based on search
  const filteredAlbums = albums.filter(album =>
    album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    album.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort albums
  const sortedAlbums = [...filteredAlbums].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'artist') return a.artist.localeCompare(b.artist);
    return 0; // recent (default order)
  });

  if (albums.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Approved Albums Yet</h3>
        <p className="text-gray-600 mb-6">
          Search and approve albums to build your child's music library
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Approved Albums</h2>
            <p className="text-sm text-gray-600 mt-1">
              {albums.length} {albums.length === 1 ? 'album' : 'albums'} approved for your kids
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Grid view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm"
            >
              <option value="recent">Recently Added</option>
              <option value="name">Album Name</option>
              <option value="artist">Artist Name</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search approved albums..."
              className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {searchQuery && (
        <div className="mb-4 text-sm text-gray-600">
          Found {filteredAlbums.length} {filteredAlbums.length === 1 ? 'album' : 'albums'}
        </div>
      )}

      {/* Albums Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAlbums.map((album) => (
            <div key={album.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-100 group">
              {/* Album Artwork */}
              <div className="relative">
                {album.artworkUrl ? (
                  <img
                    src={album.artworkUrl.replace('{w}', '300').replace('{h}', '300')}
                    alt={`${album.name} artwork`}
                    className="w-full h-56 object-cover"
                  />
                ) : (
                  <div className={`w-full h-56 bg-gradient-to-br ${album.color || 'from-gray-300 to-gray-400'} flex items-center justify-center`}>
                    <svg className="w-16 h-16 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
                {/* Badge showing if artwork is hidden for kids */}
                {album.hideArtwork && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded shadow-md">
                    Hidden for Kids
                  </div>
                )}
                {/* Hide/Show Artwork Toggle */}
                <button
                  onClick={() => toggleArtwork(album)}
                  className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100"
                  title={album.hideArtwork ? 'Show artwork' : 'Hide artwork'}
                >
                  {album.hideArtwork ? (
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 truncate" title={album.name}>
                  {album.name}
                </h3>
                <p className="text-gray-600 text-sm mb-3 truncate" title={album.artist}>
                  {album.artist}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {album.year}
                  </span>
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    {album.trackCount} tracks
                  </span>
                </div>

                {/* Kid Profiles with Access */}
                {album.kidProfiles && album.kidProfiles.length > 0 && (
                  <div className="mb-4 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Approved for:</p>
                    <div className="flex flex-wrap gap-1">
                      {album.kidProfiles.map((kid) => (
                        <div key={kid._id} className="flex items-center space-x-1 bg-white px-2 py-1 rounded text-xs">
                          <span className="text-sm">{kid.avatar}</span>
                          <span className="text-blue-900 font-medium">{kid.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (window.confirm(`Remove "${album.name}" from approved albums?`)) {
                      onRemove(album.id);
                    }
                  }}
                  className="w-full py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Albums List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Album
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Artist
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Approved For
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tracks
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedAlbums.map((album) => (
                <tr key={album.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {album.artworkUrl ? (
                        <img
                          src={album.artworkUrl.replace('{w}', '60').replace('{h}', '60')}
                          alt={album.name}
                          className="w-12 h-12 rounded-lg shadow-sm"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${album.color || 'from-gray-300 to-gray-400'} flex items-center justify-center`}>
                          <svg className="w-6 h-6 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{album.name}</p>
                        {album.hideArtwork && (
                          <span className="text-xs text-red-600 font-semibold">Hidden for Kids</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {album.artist}
                  </td>
                  <td className="px-6 py-4">
                    {album.kidProfiles && album.kidProfiles.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {album.kidProfiles.map((kid) => (
                          <div key={kid._id} className="flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded text-xs">
                            <span className="text-sm">{kid.avatar}</span>
                            <span className="text-blue-900 font-medium">{kid.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">All kids</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {album.year}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {album.trackCount}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleArtwork(album)}
                        className="text-gray-600 hover:text-gray-800 font-medium text-sm flex items-center space-x-1"
                        title={album.hideArtwork ? 'Show artwork' : 'Hide artwork'}
                      >
                        {album.hideArtwork ? (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Show</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                            <span>Hide</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove "${album.name}" from approved albums?`)) {
                            onRemove(album.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800 font-medium text-sm flex items-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Remove</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No Results */}
      {filteredAlbums.length === 0 && searchQuery && (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-100 text-center">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Albums Found</h3>
          <p className="text-gray-600">
            Try adjusting your search terms
          </p>
        </div>
      )}
    </div>
  );
}

export default ApprovedAlbumsList;
