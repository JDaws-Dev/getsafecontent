import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import AlbumGrid from './AlbumGrid';
import MusicPlayer from './MusicPlayer';
import musicKitService from '../../config/musickit';
import { useToast } from '../../contexts/ToastContext';

function PlayerInterface() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [kidProfile, setKidProfile] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const createRequest = useMutation(api.albumRequests.createAlbumRequest);

  // Get kid profile from session
  useEffect(() => {
    const profileData = localStorage.getItem('safetunes_kid_profile');
    if (!profileData) {
      // No kid logged in, redirect to kid login
      navigate('/child-login');
      return;
    }
    setKidProfile(JSON.parse(profileData));
  }, [navigate]);

  // Fetch approved albums for this kid
  const approvedAlbums = useQuery(
    api.albums.getApprovedAlbumsForKid,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  );

  const handleLogout = () => {
    localStorage.removeItem('safetunes_kid_profile');
    navigate('/child-login');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      await musicKitService.initialize();
      const results = await musicKitService.search(searchQuery, { types: 'albums', limit: 20 });

      if (results.data?.results?.albums?.data) {
        // Filter out explicit albums
        const albums = results.data.results.albums.data
          .filter((album) => !album.attributes.contentRating) // Exclude albums with contentRating (explicit)
          .map((album) => ({
            id: album.id,
            name: album.attributes.name,
            artist: album.attributes.artistName,
            year: album.attributes.releaseDate?.substring(0, 4) || 'N/A',
            trackCount: album.attributes.trackCount || 0,
          }));
        setSearchResults(albums);
      }
    } catch (error) {
      console.error('Search failed:', error);
      showToast('Search failed. Please try again.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRequestAlbum = async (album) => {
    if (!kidProfile) return;

    try {
      await createRequest({
        kidProfileId: kidProfile._id,
        userId: kidProfile.userId,
        appleAlbumId: album.id,
        albumName: album.name,
        artistName: album.artist,
      });

      showToast(`Requested "${album.name}" - Your parent will review it!`, 'success', { duration: 3000 });
      setShowRequestModal(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to create request:', error);
      showToast('Failed to send request. Please try again.', 'error');
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                SafeTunes
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 hidden sm:block">Your approved music library</p>
            </div>
            {kidProfile && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Request Album</span>
                  <span className="sm:hidden">Request</span>
                </button>
                <div className="flex items-center space-x-2">
                  <span className="text-3xl">{kidProfile.avatar}</span>
                  <span className="font-semibold text-gray-700 hidden sm:inline">{kidProfile.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {!approvedAlbums ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your music...</p>
          </div>
        ) : approvedAlbums.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No music yet!</h2>
            <p className="text-gray-600">Ask your parents to approve some albums for you</p>
          </div>
        ) : (
          <AlbumGrid albums={approvedAlbums} onSelectAlbum={setSelectedAlbum} />
        )}
      </main>

      {/* Music Player */}
      {selectedAlbum && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-8">
          <div className="mb-4">
            <button
              onClick={() => setSelectedAlbum(null)}
              className="text-purple-600 hover:text-purple-700 font-medium flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to albums
            </button>
          </div>
          <MusicPlayer album={selectedAlbum} />
        </div>
      )}

      {/* Note about Apple Music */}
      {!selectedAlbum && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Click on an album to start playing music. You'll need an active Apple Music subscription.
            </p>
          </div>
        </div>
      )}

      {/* Request Album Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setShowRequestModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Request an Album</h2>
                <p className="text-gray-600 mt-1">Search for music you'd like to listen to</p>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search Form */}
            <div className="p-6 border-b border-gray-200">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for albums..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto p-6">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((album) => (
                    <div key={album.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-4">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {album.name}
                        </h3>
                        <p className="text-sm text-gray-600 truncate">{album.artist}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {album.year} • {album.trackCount} tracks
                        </p>
                      </div>
                      <button
                        onClick={() => handleRequestAlbum(album)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition flex-shrink-0"
                      >
                        Request
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Search for music</h3>
                  <p className="text-gray-600">
                    Type an album name or artist above and click Search
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Only clean, kid-friendly albums will appear
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerInterface;
