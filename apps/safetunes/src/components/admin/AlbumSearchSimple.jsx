import { useState, useEffect } from 'react';
import musicKitService from '../../config/musickit';

function AlbumSearchSimple({ user, onAlbumClick }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMusicKitReady, setIsMusicKitReady] = useState(false);

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

  const handleSearch = async () => {
    if (!searchQuery.trim() || !isMusicKitReady) return;

    setIsSearching(true);
    try {
      const results = await musicKitService.searchAlbums(searchQuery, 24);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAlbumClick = (album) => {
    // Open the modal - tracks will be fetched by AlbumDetailModal when needed
    if (onAlbumClick) {
      onAlbumClick(album.id);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="p-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              inputMode="search"
              placeholder="Search albums on Apple Music..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching || !isMusicKitReady}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search</span>
              </>
            )}
          </button>
        </div>

        {!isMusicKitReady && (
          <p className="text-sm text-orange-600 mt-2">Apple Music is initializing...</p>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Search Results
              <span className="ml-2 text-sm text-gray-500">({searchResults.length} albums)</span>
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {searchResults.map((album) => (
              <button
                key={album.id}
                onClick={() => handleAlbumClick(album)}
                className="text-left group"
              >
                {album.attributes.artwork ? (
                  <img
                    src={album.attributes.artwork.url.replace('{w}', '300').replace('{h}', '300')}
                    alt={album.attributes.name}
                    className="w-full aspect-square object-cover rounded-lg shadow-md group-hover:shadow-xl transition-shadow mb-2"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg shadow-md group-hover:shadow-xl transition-shadow mb-2 flex items-center justify-center">
                    <svg className="w-12 h-12 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                )}
                <h3 className="font-medium text-sm text-gray-900 truncate group-hover:text-purple-600 transition">
                  {album.attributes.name}
                </h3>
                <p className="text-xs text-gray-600 truncate">{album.attributes.artistName}</p>
                {album.attributes.releaseDate && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(album.attributes.releaseDate).getFullYear()}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {searchResults.length === 0 && searchQuery && !isSearching && (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-lg font-medium mb-1">No albums found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      )}

      {/* Initial State */}
      {searchResults.length === 0 && !searchQuery && (
        <div className="text-center py-12 text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-lg font-medium mb-1">Search Apple Music</p>
          <p className="text-sm">Enter an album name or artist to get started</p>
        </div>
      )}
    </div>
  );
}

export default AlbumSearchSimple;
