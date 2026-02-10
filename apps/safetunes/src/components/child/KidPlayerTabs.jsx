import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ChevronRight,
  Music,
  Sparkles,
  Moon,
  Sun,
  Zap,
  Star,
  Smile,
  PartyPopper,
  Coffee,
  Flame,
  TreePine,
  TrendingUp
} from 'lucide-react';
import { SafeTunesLogo } from '../shared/SafeTunesLogo';

// ============================================
// DESIGN SYSTEM CONSTANTS
// ============================================
const BRAND_GRADIENT = 'bg-gradient-to-r from-purple-600 to-pink-500';
const BRAND_GRADIENT_SUBTLE = 'bg-gradient-to-br from-purple-50 to-pink-50';

// ============================================
// UTILITY: Get time-based greeting
// ============================================
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ============================================
// UTILITY: Format relative time
// ============================================
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// SHARED: Section Header Component
// ============================================
function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-sm font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
        >
          {actionLabel}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============================================
// SHARED: Small Album Card (100x100)
// ============================================
function SmallAlbumCard({ item, onPlay, hideArtwork = false }) {
  const artworkUrl = item.artworkUrl?.replace('{w}', '200').replace('{h}', '200');
  const isSong = item.itemType === 'song' || item.appleSongId;

  return (
    <button
      onClick={() => onPlay?.(item)}
      className="flex-shrink-0 w-[100px] group"
    >
      <div className="relative w-[100px] h-[100px] mb-2">
        {hideArtwork || !artworkUrl ? (
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-md">
            <SafeTunesLogo className="w-8 h-8 text-white/70" />
          </div>
        ) : (
          <img
            src={artworkUrl}
            alt={item.name || item.albumName || item.itemName}
            className="w-full h-full rounded-xl object-cover shadow-md"
          />
        )}
      </div>
      <p className="text-xs font-medium text-gray-900 truncate leading-tight">
        {item.name || item.albumName || item.itemName}
      </p>
      <p className="text-[11px] text-gray-500 truncate">
        {isSong ? `Song · ${item.artistName}` : item.artistName}
      </p>
    </button>
  );
}

// ============================================
// SHARED: Large Album Card (160x160)
// ============================================
function LargeAlbumCard({ item, onPlay, hideArtwork = false, badge }) {
  const artworkUrl = item.artworkUrl?.replace('{w}', '320').replace('{h}', '320');
  const isSong = item.itemType === 'song' || item.appleSongId;

  return (
    <button
      onClick={() => onPlay?.(item)}
      className="flex-shrink-0 w-[160px] group"
    >
      <div className="relative w-[160px] h-[160px] mb-2">
        {hideArtwork || !artworkUrl ? (
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-lg">
            <SafeTunesLogo className="w-12 h-12 text-white/70" />
          </div>
        ) : (
          <img
            src={artworkUrl}
            alt={item.name || item.albumName || item.itemName}
            className="w-full h-full rounded-xl object-cover shadow-lg"
          />
        )}
        {/* Badge (e.g., "NEW") */}
        {badge && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full">
            <span className="text-[10px] font-bold text-white uppercase tracking-wide">{badge}</span>
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
        {item.name || item.albumName || item.itemName}
      </p>
      <p className="text-xs text-gray-500 truncate">
        {isSong ? `Song · ${item.artistName}` : item.artistName}
      </p>
    </button>
  );
}

// ============================================
// SHARED: Horizontal Scroll Container
// ============================================
function HorizontalScroll({ children, className = '' }) {
  return (
    <div className={`flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// 1. HOME TAB COMPONENT
// ============================================
export function HomeTab({
  userName = 'Friend',
  recentlyPlayed = [],
  freshlyApproved = [],
  onRepeat = [],
  onPlayItem,
  onViewAlbum, // New callback for viewing album details
  onSeeAllRecent,
  onSeeAllNew,
  onSeeAllOnRepeat,
  shouldHideArtwork = () => false
}) {
  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">
          {greeting}, {userName}
        </h1>
      </div>

      {/* Recently Played Section */}
      {recentlyPlayed.length > 0 && (
        <section className="mb-6">
          <div className="px-4">
            <SectionHeader
              title="Recently Played"
              actionLabel="See All"
              onAction={onSeeAllRecent}
            />
          </div>
          <HorizontalScroll>
            {recentlyPlayed.slice(0, 10).map((item, index) => (
              <SmallAlbumCard
                key={item._id || item.itemId || `recent-${index}`}
                item={item}
                onPlay={onPlayItem}
                hideArtwork={shouldHideArtwork(item)}
              />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Freshly Approved Section */}
      {freshlyApproved.length > 0 && (
        <section className="mb-6">
          <div className="px-4">
            <SectionHeader
              title="Freshly Approved"
              actionLabel="See All"
              onAction={onSeeAllNew}
            />
          </div>
          <HorizontalScroll>
            {freshlyApproved.slice(0, 8).map((item, index) => (
              <LargeAlbumCard
                key={item._id || item.appleAlbumId || `new-${index}`}
                item={{
                  ...item,
                  name: item.albumName,
                  artworkUrl: item.artworkUrl
                }}
                onPlay={onViewAlbum || onPlayItem}
                hideArtwork={shouldHideArtwork(item)}
                badge="New"
              />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* On Repeat Section */}
      {onRepeat.length > 0 && (
        <section className="mb-6">
          <div className="px-4">
            <SectionHeader
              title="On Repeat"
              actionLabel="See All"
              onAction={onSeeAllOnRepeat}
            />
          </div>
          <HorizontalScroll>
            {onRepeat.slice(0, 6).map((item, index) => (
              <LargeAlbumCard
                key={item._id || item.itemId || `repeat-${index}`}
                item={item}
                onPlay={onPlayItem}
                hideArtwork={shouldHideArtwork(item)}
              />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Empty State */}
      {recentlyPlayed.length === 0 && freshlyApproved.length === 0 && onRepeat.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
            <Music className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Your music awaits</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            Start listening to build your personalized home screen
          </p>
        </div>
      )}

      {/* Bottom padding for mini player */}
      <div className="h-32" />
    </div>
  );
}

// ============================================
// 2. DISCOVER TAB - MOOD CARDS DATA
// Each mood has keywords to match against album/artist names and genres
// ============================================
const MOOD_CARDS = [
  {
    id: 'worship',
    title: 'Worship',
    icon: Star,
    gradient: 'from-amber-400 to-orange-500',
    keywords: ['worship', 'christian', 'praise', 'gospel', 'faith', 'hymn', 'hillsong', 'bethel', 'elevation']
  },
  {
    id: 'disney',
    title: 'Disney & Kids',
    icon: Sparkles,
    gradient: 'from-blue-400 to-purple-500',
    keywords: ['disney', 'pixar', 'frozen', 'moana', 'encanto', 'soundtrack', 'animation', 'kids', 'children']
  },
  {
    id: 'dance',
    title: 'Dance Party',
    icon: PartyPopper,
    gradient: 'from-pink-500 to-rose-500',
    keywords: ['dance', 'party', 'edm', 'electronic', 'disco', 'club', 'remix', 'beat']
  },
  {
    id: 'chill',
    title: 'Chill Vibes',
    icon: Coffee,
    gradient: 'from-teal-400 to-cyan-500',
    keywords: ['chill', 'acoustic', 'relaxing', 'calm', 'mellow', 'soft', 'easy', 'lofi', 'ambient']
  },
  {
    id: 'pop',
    title: 'Pop Hits',
    icon: TrendingUp,
    gradient: 'from-pink-400 to-purple-500',
    keywords: ['pop', 'hits', 'top', 'chart', 'radio', 'mainstream']
  },
  {
    id: 'hiphop',
    title: 'Hip-Hop',
    icon: Zap,
    gradient: 'from-orange-500 to-red-500',
    keywords: ['hip-hop', 'hip hop', 'rap', 'r&b', 'rnb', 'urban']
  },
  {
    id: 'rock',
    title: 'Rock',
    icon: Flame,
    gradient: 'from-red-500 to-orange-600',
    keywords: ['rock', 'alternative', 'indie', 'punk', 'metal', 'guitar']
  },
  {
    id: 'country',
    title: 'Country',
    icon: TreePine,
    gradient: 'from-amber-500 to-yellow-600',
    keywords: ['country', 'folk', 'americana', 'bluegrass', 'nashville']
  }
];

// ============================================
// 2. DISCOVER TAB - MOOD CARD COMPONENT
// ============================================
function MoodCard({ mood, onClick }) {
  const Icon = mood.icon;

  return (
    <button
      onClick={() => onClick?.(mood)}
      className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${mood.gradient} shadow-lg active:scale-[0.98] transition-transform`}
      style={{ minHeight: '100px' }}
    >
      <div className="relative z-10">
        <Icon className="w-8 h-8 text-white/90 mb-2" />
        <h3 className="text-white font-bold text-base text-left leading-tight">{mood.title}</h3>
      </div>
      {/* Decorative circles */}
      <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
      <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-full translate-x-4 -translate-y-4" />
    </button>
  );
}

// ============================================
// 2. DISCOVER TAB - FEATURED CAROUSEL
// ============================================
function FeaturedCarousel({ items = [], onPlay, shouldHideArtwork = () => false }) {
  const scrollRef = useRef(null);

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory"
      >
        {items.map((item, index) => {
          const artworkUrl = item.artworkUrl?.replace('{w}', '400').replace('{h}', '400');
          const hideArtwork = shouldHideArtwork(item);

          return (
            <button
              key={item._id || item.appleAlbumId || `featured-${index}`}
              onClick={() => onPlay?.(item)}
              className="flex-shrink-0 w-[280px] snap-center group"
            >
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
                {hideArtwork || !artworkUrl ? (
                  <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                    <SafeTunesLogo className="w-16 h-16 text-white/70" />
                  </div>
                ) : (
                  <img
                    src={artworkUrl}
                    alt={item.albumName || item.name}
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {/* Text overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-white font-bold text-lg truncate">
                    {item.albumName || item.name}
                  </p>
                  <p className="text-white/80 text-sm truncate">
                    {item.artistName}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// 2. DISCOVER TAB - FILTER ALBUMS BY MOOD
// ============================================
function filterAlbumsByMood(albums, mood) {
  if (!mood || !albums) return [];

  const keywords = mood.keywords.map(k => k.toLowerCase());

  return albums.filter(album => {
    const albumName = (album.albumName || album.name || '').toLowerCase();
    const artistName = (album.artistName || '').toLowerCase();
    const genres = (album.genres || []).map(g => g.toLowerCase());

    // Check if any keyword matches album name, artist, or genres
    return keywords.some(keyword =>
      albumName.includes(keyword) ||
      artistName.includes(keyword) ||
      genres.some(genre => genre.includes(keyword))
    );
  });
}

// ============================================
// 2. DISCOVER TAB - ALBUM RESULTS GRID
// ============================================
function MoodResultsGrid({ albums, onPlayAlbum, shouldHideArtwork, mood, onBack }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header with back button */}
      <div className="px-4 pt-6 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-purple-600 font-medium mb-3"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
          Back to Discover
        </button>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mood.gradient} flex items-center justify-center`}>
            <mood.icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{mood.title}</h1>
            <p className="text-gray-500 text-sm">{albums.length} albums</p>
          </div>
        </div>
      </div>

      {/* Albums Grid */}
      {albums.length > 0 ? (
        <div className="px-4 pb-32">
          <div className="grid grid-cols-2 gap-3">
            {albums.map((album, index) => {
              const artworkUrl = album.artworkUrl?.replace('{w}', '300').replace('{h}', '300');
              const hideArtwork = shouldHideArtwork(album);

              return (
                <button
                  key={album._id || album.appleAlbumId || `album-${index}`}
                  onClick={() => onPlayAlbum(album)}
                  className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-lg group active:scale-[0.98] transition-transform"
                >
                  {hideArtwork || !artworkUrl ? (
                    <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                      <SafeTunesLogo className="w-12 h-12 text-white/70" />
                    </div>
                  ) : (
                    <img
                      src={artworkUrl}
                      alt={album.albumName || album.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm truncate">{album.albumName || album.name}</p>
                    <p className="text-white/70 text-xs truncate">{album.artistName}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${mood.gradient} flex items-center justify-center mb-4 opacity-50`}>
            <mood.icon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No {mood.title} music yet</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            Ask your parent to approve some {mood.title.toLowerCase()} albums!
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// 2. DISCOVER TAB COMPONENT
// ============================================
export function DiscoverTab({
  allAlbums = [],
  onPlayAlbum,
  shouldHideArtwork = () => false
}) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [filteredAlbums, setFilteredAlbums] = useState([]);

  // When a mood is selected, filter albums
  const handleMoodSelect = (mood) => {
    const results = filterAlbumsByMood(allAlbums, mood);
    setFilteredAlbums(results);
    setSelectedMood(mood);
  };

  // Go back to mood grid
  const handleBack = () => {
    setSelectedMood(null);
    setFilteredAlbums([]);
  };

  // Show filtered results when a mood is selected
  if (selectedMood) {
    return (
      <MoodResultsGrid
        albums={filteredAlbums}
        onPlayAlbum={onPlayAlbum}
        shouldHideArtwork={shouldHideArtwork}
        mood={selectedMood}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Discover</h1>
        <p className="text-gray-500 mt-1">Browse your music by mood</p>
      </div>

      {/* Mood Cards Grid */}
      <section className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {MOOD_CARDS.map((mood) => (
            <MoodCard
              key={mood.id}
              mood={mood}
              onClick={handleMoodSelect}
            />
          ))}
        </div>
      </section>

      {/* Bottom padding for mini player */}
      <div className="h-32" />
    </div>
  );
}

// ============================================
// 3. PLAYLISTS TAB - PLAYLIST GRID CARD
// ============================================
function PlaylistGridCard({ playlist, onPlay, onClick, hideArtwork = false }) {
  // Generate collage or use first song's artwork
  const artworkUrl = playlist.songs?.[0]?.artworkUrl?.replace('{w}', '300').replace('{h}', '300');
  const songCount = playlist.songs?.length || 0;

  return (
    <button
      onClick={() => onClick?.(playlist)}
      className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-lg group active:scale-[0.98] transition-transform"
    >
      {/* Background */}
      {artworkUrl && !hideArtwork ? (
        <img
          src={artworkUrl}
          alt={playlist.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
          <SafeTunesLogo className="w-12 h-12 text-white/70" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-white font-bold text-sm truncate">{playlist.name}</h3>
        <p className="text-white/70 text-xs">{songCount} songs</p>
      </div>
    </button>
  );
}

// ============================================
// 3. PLAYLISTS TAB COMPONENT
// ============================================
export function PlaylistsTab({
  playlists = [],
  onCreatePlaylist,
  onPlaylistClick,
  onPlayPlaylist,
  shouldHidePlaylistArtwork
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Playlists</h1>
        <button
          onClick={onCreatePlaylist}
          className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <Plus className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* User Playlists Grid */}
      {playlists.length > 0 ? (
        <section className="px-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {playlists.map((playlist) => (
              <PlaylistGridCard
                key={playlist._id}
                playlist={playlist}
                onClick={onPlaylistClick}
                onPlay={onPlayPlaylist}
                hideArtwork={shouldHidePlaylistArtwork?.(playlist) || false}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="px-4">
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50 rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-3">
              <Music className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No playlists yet</h3>
            <p className="text-gray-500 text-sm mb-4">
              Create your first playlist to organize your music
            </p>
            <button
              onClick={onCreatePlaylist}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-full font-semibold text-sm shadow-lg active:scale-95 transition-transform"
            >
              Create Playlist
            </button>
          </div>
        </section>
      )}

      {/* Bottom padding for mini player */}
      <div className="h-32" />
    </div>
  );
}

// ============================================
// DEMO COMPONENT WITH DUMMY DATA
// ============================================
export function KidPlayerTabsDemo() {
  const [activeTab, setActiveTab] = useState('home');

  // Dummy data for Home tab
  const dummyRecentlyPlayed = [
    { itemId: '1', itemName: 'Blinding Lights', artistName: 'The Weeknd', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3e/04/a5/3e04a5cd-2074-a8fc-1a25-ea9b9a53ce20/20UMGIM02628.rgb.jpg/{w}x{h}bb.jpg' },
    { itemId: '2', itemName: 'Anti-Hero', artistName: 'Taylor Swift', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/11/33/93/1133939d-f461-91f6-d309-d5c72a72f26d/22UM1IM00869.rgb.jpg/{w}x{h}bb.jpg' },
    { itemId: '3', itemName: 'As It Was', artistName: 'Harry Styles', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2a/19/fb/2a19fb85-2f70-9e44-f2a1-7e75f0d1b96f/Columbia.jpg/{w}x{h}bb.jpg' },
    { itemId: '4', itemName: 'Bad Habit', artistName: 'Steve Lacy', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/eb/2c/b5/eb2cb5e4-6378-23a3-5e91-b2e9a65e7e19/196589245724.jpg/{w}x{h}bb.jpg' },
    { itemId: '5', itemName: 'Heat Waves', artistName: 'Glass Animals', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/04/98/a7/0498a766-6ac7-1c07-e6b7-0d63c6c6f9c1/00602508655227.rgb.jpg/{w}x{h}bb.jpg' },
  ];

  const dummyFreshlyApproved = [
    { _id: 'a1', albumName: 'Midnights', artistName: 'Taylor Swift', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/11/33/93/1133939d-f461-91f6-d309-d5c72a72f26d/22UM1IM00869.rgb.jpg/{w}x{h}bb.jpg', approvedAt: Date.now() - 86400000 },
    { _id: 'a2', albumName: 'SOS', artistName: 'SZA', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/7c/0e/08/7c0e08be-8c5d-9c94-3dfc-ba5f1e0b8ad0/196589440259.jpg/{w}x{h}bb.jpg', approvedAt: Date.now() - 172800000 },
    { _id: 'a3', albumName: 'Un Verano Sin Ti', artistName: 'Bad Bunny', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/3e/04/eb/3e04ebf6-370f-f59d-ec84-2c2643db92f1/196626945068.jpg/{w}x{h}bb.jpg', approvedAt: Date.now() - 259200000 },
    { _id: 'a4', albumName: 'Renaissance', artistName: 'Beyonce', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/03/85/5d/03855d94-68a3-c581-9c5c-37bc7054ed12/196589246974.jpg/{w}x{h}bb.jpg', approvedAt: Date.now() - 345600000 },
  ];

  const dummyOnRepeat = [
    { itemId: 'r1', itemName: 'Cruel Summer', artistName: 'Taylor Swift', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/e0/6f/2f/e06f2f7c-6a0c-4761-f4d6-9b09c59c3041/19UMGIM45474.rgb.jpg/{w}x{h}bb.jpg', playCount: 47 },
    { itemId: 'r2', itemName: 'Flowers', artistName: 'Miley Cyrus', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/e5/e6/4d/e5e64d06-c7bf-365b-8e7e-3e1db8c5a8e0/196589524767.jpg/{w}x{h}bb.jpg', playCount: 35 },
    { itemId: 'r3', itemName: 'Kill Bill', artistName: 'SZA', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/7c/0e/08/7c0e08be-8c5d-9c94-3dfc-ba5f1e0b8ad0/196589440259.jpg/{w}x{h}bb.jpg', playCount: 28 },
    { itemId: 'r4', itemName: 'Vampire', artistName: 'Olivia Rodrigo', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/f0/4e/37/f04e37ef-0bbd-0e81-e74a-6f3f81c3f3fc/23UM1IM01812.rgb.jpg/{w}x{h}bb.jpg', playCount: 22 },
  ];

  // Dummy data for Discover tab
  const dummyFeatured = [
    { _id: 'f1', albumName: 'Today\'s Hits', artistName: 'Various Artists', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3e/04/a5/3e04a5cd-2074-a8fc-1a25-ea9b9a53ce20/20UMGIM02628.rgb.jpg/{w}x{h}bb.jpg' },
    { _id: 'f2', albumName: 'Chill Vibes', artistName: 'Curated Playlist', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/eb/2c/b5/eb2cb5e4-6378-23a3-5e91-b2e9a65e7e19/196589245724.jpg/{w}x{h}bb.jpg' },
    { _id: 'f3', albumName: 'Pop Rising', artistName: 'New Releases', artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/11/33/93/1133939d-f461-91f6-d309-d5c72a72f26d/22UM1IM00869.rgb.jpg/{w}x{h}bb.jpg' },
  ];

  // Dummy data for Playlists tab
  const dummyPlaylists = [
    { _id: 'p1', name: 'My Favorites', songs: [{ artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/3e/04/a5/3e04a5cd-2074-a8fc-1a25-ea9b9a53ce20/20UMGIM02628.rgb.jpg/{w}x{h}bb.jpg' }, {}, {}] },
    { _id: 'p2', name: 'Chill Vibes', songs: [{ artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/eb/2c/b5/eb2cb5e4-6378-23a3-5e91-b2e9a65e7e19/196589245724.jpg/{w}x{h}bb.jpg' }, {}] },
    { _id: 'p3', name: 'Workout Mix', songs: [{ artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/7c/0e/08/7c0e08be-8c5d-9c94-3dfc-ba5f1e0b8ad0/196589440259.jpg/{w}x{h}bb.jpg' }, {}, {}, {}, {}] },
    { _id: 'p4', name: 'Road Trip', songs: [] },
  ];

  const handlePlayItem = (item) => {
    console.log('Play item:', item);
  };

  const handleMoodSelect = (mood) => {
    console.log('Mood selected:', mood.title, '- Query:', mood.query);
  };

  return (
    <div className="min-h-screen bg-white font-['Inter',sans-serif]">
      {/* Tab Content */}
      {activeTab === 'home' && (
        <HomeTab
          userName="Emma"
          recentlyPlayed={dummyRecentlyPlayed}
          freshlyApproved={dummyFreshlyApproved}
          onRepeat={dummyOnRepeat}
          onPlayItem={handlePlayItem}
          onSeeAllRecent={() => console.log('See all recent')}
          onSeeAllNew={() => console.log('See all new')}
          onSeeAllOnRepeat={() => console.log('See all on repeat')}
        />
      )}

      {activeTab === 'discover' && (
        <DiscoverTab
          featuredItems={dummyFeatured}
          onMoodSelect={handleMoodSelect}
          onPlayFeatured={handlePlayItem}
        />
      )}

      {activeTab === 'playlists' && (
        <PlaylistsTab
          playlists={dummyPlaylists}
          likedSongsCount={42}
          onCreatePlaylist={() => console.log('Create playlist')}
          onPlaylistClick={(p) => console.log('Playlist clicked:', p.name)}
          onLikedSongsClick={() => console.log('Liked songs clicked')}
          onPlayPlaylist={(p) => console.log('Play playlist:', p.name)}
        />
      )}

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 safe-area-inset-bottom">
        <div className="flex justify-around py-2">
          {[
            { id: 'home', label: 'Home', icon: '🏠' },
            { id: 'discover', label: 'Discover', icon: '🔍' },
            { id: 'playlists', label: 'Playlists', icon: '🎵' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center px-6 py-2 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-xl mb-0.5">{tab.icon}</span>
              <span className={`text-xs font-medium ${
                activeTab === tab.id ? 'text-purple-600' : 'text-gray-500'
              }`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Add CSS for scrollbar hiding
const styleTag = document.createElement('style');
styleTag.textContent = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .safe-area-inset-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('[data-kid-player-tabs-styles]')) {
  styleTag.setAttribute('data-kid-player-tabs-styles', '');
  document.head.appendChild(styleTag);
}

export default KidPlayerTabsDemo;
