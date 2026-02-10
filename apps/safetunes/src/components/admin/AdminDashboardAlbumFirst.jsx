import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import AlbumDetailModal from './AlbumDetailModal';
import AlbumSearchSimple from './AlbumSearchSimple';
import AlbumRequests from './AlbumRequests';
import Settings from './Settings';
import { useNavigate } from 'react-router-dom';
import { signOut } from '../../lib/auth-client';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';

function AdminDashboardAlbumFirst({ user }) {
  const [activeTab, setActiveTab] = useState('library');
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Fetch data
  const approvedAlbums = useQuery(api.albums.getApprovedAlbums,
    user ? { userId: user._id } : 'skip'
  ) || [];

  const featuredAlbums = useQuery(api.featured.getFeaturedAlbums,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // For requests badge count
  const pendingRequests = useQuery(api.albumRequests.getPendingRequests,
    user ? { userId: user._id } : 'skip'
  ) || [];
  const pendingCount = pendingRequests.length;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Helper functions
  const getAvatarIcon = (avatarId) => {
    const icon = AVATAR_ICONS.find(a => a.id === avatarId);
    return icon ? icon.svg : AVATAR_ICONS[0].svg;
  };

  const getColorClass = (colorId) => {
    const color = COLORS.find(c => c.id === colorId);
    return color ? color.class : COLORS[0].class;
  };

  // Filter albums based on search
  const filteredLibraryAlbums = approvedAlbums.filter(album => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      album.name?.toLowerCase().includes(query) ||
      album.artist?.toLowerCase().includes(query)
    );
  });

  const filteredDiscoverAlbums = featuredAlbums.filter(album => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      album.albumName?.toLowerCase().includes(query) ||
      album.artistName?.toLowerCase().includes(query)
    );
  });

  // Album Card Component
  const AlbumCard = ({ album, onClick, onThreeDotClick }) => {
    // Handle different field names from different queries
    // Library uses: name, artist (from getApprovedAlbums transformation)
    // Discover uses: albumName, artistName (raw approvedAlbums records)
    const albumName = album.name || album.albumName || 'Unknown Album';
    const artistName = album.artist || album.artistName || 'Unknown Artist';
    const artworkUrl = album.artworkUrl;
    const hideArtwork = album.hideArtwork || false;

    return (
      <div className="group relative">
        {/* Three-dot menu button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onThreeDotClick(album);
          }}
          className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all md:opacity-0 md:group-hover:opacity-100"
          title="Options"
        >
          <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {/* Album artwork/cover */}
        <div
          className="cursor-pointer"
          onClick={() => onClick(album)}
        >
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
        </div>

        {/* Album info */}
        <h3 className="font-medium text-sm text-gray-900 truncate">{albumName}</h3>
        <p className="text-xs text-gray-600 truncate">{artistName}</p>

        {/* Kid badges (Library only - when kidProfiles array exists) */}
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between py-3 sm:py-4 gap-2">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">SafeTunes</h1>
                <p className="text-xs text-gray-600 hidden sm:block">Parent Dashboard</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 -mb-px overflow-x-auto">
            <button
              onClick={() => setActiveTab('library')}
              className={`${
                activeTab === 'library'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
              } py-3 px-3 sm:px-6 font-medium text-sm transition-all duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0`}
            >
              <svg className="w-5 h-5 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Library</span>
              <span className="text-xs bg-purple-100 text-purple-700 px-1.5 sm:px-2 py-0.5 rounded-full">
                {approvedAlbums.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`${
                activeTab === 'discover'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
              } py-3 px-3 sm:px-6 font-medium text-sm transition-all duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0`}
            >
              <svg className="w-5 h-5 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>Discover</span>
              <span className="text-xs bg-pink-100 text-pink-700 px-1.5 sm:px-2 py-0.5 rounded-full">
                {featuredAlbums.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`${
                activeTab === 'add'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
              } py-3 px-3 sm:px-6 font-medium text-sm transition-all duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0`}
            >
              <svg className="w-5 h-5 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add</span>
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`${
                activeTab === 'requests'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
              } py-3 px-3 sm:px-6 font-medium text-sm transition-all duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0 relative`}
            >
              <svg className="w-5 h-5 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Requests</span>
              {pendingCount > 0 && (
                <span className="bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`${
                activeTab === 'settings'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
              } py-3 px-3 sm:px-6 font-medium text-sm transition-all duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0`}
            >
              <svg className="w-5 h-5 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Library Tab */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    inputMode="search"
                    placeholder="Search library..."
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
              </div>
            </div>

            {/* Albums Grid */}
            {filteredLibraryAlbums.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                <div className="w-20 h-20 mx-auto mb-4 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Albums Yet</h3>
                <p className="text-gray-600 mb-6">Start building your library by searching for albums</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-md"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Your First Album
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Your Library
                    <span className="ml-2 text-sm text-gray-500">({filteredLibraryAlbums.length} albums)</span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredLibraryAlbums.map((album) => (
                    <AlbumCard
                      key={album.id}
                      album={album}
                      onClick={(album) => setSelectedAlbum(album.appleAlbumId)}
                      onThreeDotClick={(album) => setSelectedAlbum(album.appleAlbumId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    inputMode="search"
                    placeholder="Search Discover..."
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
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl shadow-md p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Discover Pool</h3>
                  <p className="text-white/90 text-sm">
                    These albums are available for your kids to discover and add to their own library.
                    They won't see these unless they actively explore!
                  </p>
                </div>
              </div>
            </div>

            {/* Albums Grid */}
            {filteredDiscoverAlbums.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                <div className="w-20 h-20 mx-auto mb-4 bg-pink-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Albums in Discover</h3>
                <p className="text-gray-600 mb-6">Add albums to the Discover pool for your kids to explore</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Discover Pool
                    <span className="ml-2 text-sm text-gray-500">({filteredDiscoverAlbums.length} albums)</span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredDiscoverAlbums.map((album) => (
                    <AlbumCard
                      key={album._id}
                      album={album}
                      onClick={(album) => setSelectedAlbum(album.appleAlbumId)}
                      onThreeDotClick={(album) => setSelectedAlbum(album.appleAlbumId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Music Tab */}
        {activeTab === 'add' && (
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
                    Search for albums and click on them to manage tracks and assign to kids
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

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <AlbumRequests user={user} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <Settings user={user} onLogout={handleLogout} />
        )}
      </div>

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

export default AdminDashboardAlbumFirst;
