import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import musicKitService from '../../config/musickit';
import {
  Star,
  Sparkles,
  PartyPopper,
  Coffee,
  TrendingUp,
  Zap,
  Flame,
  TreePine,
  Moon,
  Music,
  Heart,
  Play,
  Plus,
  ChevronRight,
  Check,
  X,
  User,
  ListMusic
} from 'lucide-react';
import { SafeTunesLogo } from '../shared/SafeTunesLogo';

// ============================================
// MOOD CARDS DATA - Kid-friendly categories
// ============================================
const MOOD_CARDS = [
  {
    id: 'worship',
    title: 'Worship',
    subtitle: 'Praise & Faith',
    icon: Star,
    gradient: 'from-amber-400 to-orange-500',
    keywords: ['worship', 'christian', 'praise', 'gospel', 'faith', 'hymn', 'hillsong', 'bethel', 'elevation', 'jesus', 'god']
  },
  {
    id: 'disney',
    title: 'Disney & Kids',
    subtitle: 'Movie Magic',
    icon: Sparkles,
    gradient: 'from-blue-400 to-purple-500',
    keywords: ['disney', 'pixar', 'frozen', 'moana', 'encanto', 'soundtrack', 'animation', 'kids', 'children', 'dreamworks']
  },
  {
    id: 'dance',
    title: 'Dance Party',
    subtitle: 'Get Moving!',
    icon: PartyPopper,
    gradient: 'from-pink-500 to-rose-500',
    keywords: ['dance', 'party', 'edm', 'electronic', 'disco', 'club', 'remix', 'beat', 'fun']
  },
  {
    id: 'chill',
    title: 'Chill Vibes',
    subtitle: 'Relax & Unwind',
    icon: Coffee,
    gradient: 'from-teal-400 to-cyan-500',
    keywords: ['chill', 'acoustic', 'relaxing', 'calm', 'mellow', 'soft', 'easy', 'lofi', 'ambient', 'peaceful']
  },
  {
    id: 'sleepy',
    title: 'Sleepy Time',
    subtitle: 'Wind Down',
    icon: Moon,
    gradient: 'from-indigo-400 to-purple-600',
    keywords: ['sleep', 'lullaby', 'bedtime', 'calm', 'peaceful', 'relaxing', 'soft', 'gentle', 'quiet']
  },
  {
    id: 'pop',
    title: 'Pop Hits',
    subtitle: 'Chart Toppers',
    icon: TrendingUp,
    gradient: 'from-pink-400 to-purple-500',
    keywords: ['pop', 'hits', 'top', 'chart', 'radio', 'mainstream', 'popular']
  },
  {
    id: 'hiphop',
    title: 'Hip-Hop',
    subtitle: 'Beats & Rhymes',
    icon: Zap,
    gradient: 'from-orange-500 to-red-500',
    keywords: ['hip-hop', 'hip hop', 'rap', 'r&b', 'rnb', 'urban', 'beats']
  },
  {
    id: 'country',
    title: 'Country',
    subtitle: 'Southern Soul',
    icon: TreePine,
    gradient: 'from-amber-500 to-yellow-600',
    keywords: ['country', 'folk', 'americana', 'bluegrass', 'nashville', 'southern']
  }
];

// ============================================
// UTILITY: Get spotlight seed (changes every 3 hours)
// ============================================
function getSpotlightSeed() {
  const stored = localStorage.getItem('discoverSpotlightSeed');
  if (stored) {
    const parsed = JSON.parse(stored);
    const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);
    if (parsed.timestamp > threeHoursAgo) {
      return parsed.seed;
    }
  }
  const newSeed = Math.random();
  localStorage.setItem('discoverSpotlightSeed', JSON.stringify({
    seed: newSeed,
    timestamp: Date.now()
  }));
  return newSeed;
}

// ============================================
// UTILITY: Seeded random shuffle
// ============================================
function seededShuffle(array, seed) {
  const shuffled = [...array];
  const seededRandom = (s) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================
// UTILITY: Filter albums by mood keywords
// ============================================
function filterAlbumsByMood(albums, mood) {
  if (!mood || !albums) return [];
  const keywords = mood.keywords.map(k => k.toLowerCase());

  return albums.filter(album => {
    const albumName = (album.albumName || album.name || '').toLowerCase();
    const artistName = (album.artistName || '').toLowerCase();
    const genres = (album.genres || []).map(g => g.toLowerCase());

    return keywords.some(keyword =>
      albumName.includes(keyword) ||
      artistName.includes(keyword) ||
      genres.some(genre => genre.includes(keyword))
    );
  });
}

// ============================================
// UTILITY: Filter playlists by mood keywords
// ============================================
function filterPlaylistsByMood(playlists, mood) {
  if (!mood || !playlists) return [];
  const keywords = mood.keywords.map(k => k.toLowerCase());

  return playlists.filter(playlist => {
    const playlistName = (playlist.playlistName || '').toLowerCase();
    const curatorName = (playlist.curatorName || '').toLowerCase();
    const description = (playlist.description || '').toLowerCase();

    return keywords.some(keyword =>
      playlistName.includes(keyword) ||
      curatorName.includes(keyword) ||
      description.includes(keyword)
    );
  });
}

// ============================================
// UTILITY: Format duration
// ============================================
function formatDuration(ms) {
  if (!ms) return '';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================
// COMPONENT: Horizontal Scroll Container
// ============================================
function HorizontalScroll({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto scrollbar-hide -mx-4 px-4 ${className}`}>
      <div className="flex gap-3 pb-2">
        {children}
      </div>
    </div>
  );
}

// ============================================
// COMPONENT: Section Header
// ============================================
function SectionHeader({ title, actionLabel, onAction, icon: Icon }) {
  return (
    <div className="flex items-center justify-between mb-3 px-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-purple-600" />}
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
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
// COMPONENT: Mood Card
// ============================================
function MoodCard({ mood, onClick, albumCount }) {
  const Icon = mood.icon;

  return (
    <button
      onClick={() => onClick(mood)}
      className={`relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br ${mood.gradient} p-4 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all active:scale-[0.98]`}
    >
      <Icon className="w-8 h-8 text-white/90" />
      <div className="text-left">
        <h3 className="text-white font-bold text-lg leading-tight">{mood.title}</h3>
        <p className="text-white/80 text-xs">{mood.subtitle}</p>
        {albumCount > 0 && (
          <p className="text-white/60 text-xs mt-1">{albumCount} albums</p>
        )}
      </div>
      <div className="absolute top-2 right-2 w-16 h-16 bg-white/10 rounded-full" />
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
    </button>
  );
}

// ============================================
// COMPONENT: Spotlight Album Card
// ============================================
function SpotlightCard({ album, onPress, onPlay, onAdd, isInLibrary, hideArtwork }) {
  const artworkUrl = album.artworkUrl?.replace('{w}', '400').replace('{h}', '400');

  return (
    <div className="mx-4 mb-6">
      <div className="relative bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-3xl p-1 shadow-2xl">
        <div className="bg-white rounded-[22px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-bold text-purple-600">Today's Pick</span>
          </div>

          <div onClick={() => onPress(album)} className="flex gap-4 w-full text-left cursor-pointer">
            <div className="relative w-28 h-28 flex-shrink-0">
              {hideArtwork || !artworkUrl ? (
                <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                  <SafeTunesLogo className="w-10 h-10 text-white/70" />
                </div>
              ) : (
                <img
                  src={artworkUrl}
                  alt={album.albumName}
                  className="w-full h-full rounded-xl object-cover shadow-lg"
                />
              )}
              {/* Play button overlay on artwork */}
              {onPlay && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPlay(album); }}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl opacity-0 hover:opacity-100 transition-opacity"
                >
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Play className="w-6 h-6 text-purple-600 ml-0.5" fill="currentColor" />
                  </div>
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
              <div>
                <h3 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">
                  {album.albumName}
                </h3>
                <p className="text-gray-500 text-sm truncate mt-1">
                  {album.artistName}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Tap to explore tracks
                </p>
              </div>

              {/* Action buttons row - more subtle */}
              <div className="flex items-center gap-2 mt-2">
                {onPlay && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPlay(album); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition"
                  >
                    <Play className="w-3.5 h-3.5" fill="currentColor" />
                    Play
                  </button>
                )}
                {!isInLibrary ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAdd(album); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:border-purple-400 hover:bg-purple-50 text-gray-600 hover:text-purple-600 rounded-lg text-sm font-medium transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium">
                    <Check className="w-3.5 h-3.5" />
                    Added
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENT: Playlist Card (for horizontal scroll)
// ============================================
function PlaylistCard({ playlist, onPress, hideArtwork }) {
  const artworkUrl = playlist.artworkUrl?.replace('{w}', '320').replace('{h}', '320');

  return (
    <button
      onClick={() => onPress(playlist)}
      className="w-[160px] flex-shrink-0 group"
    >
      <div className="relative w-[160px] aspect-square mb-2">
        {hideArtwork || !artworkUrl ? (
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-md">
            <SafeTunesLogo className="w-10 h-10 text-white/70" />
          </div>
        ) : (
          <img
            src={artworkUrl}
            alt={playlist.playlistName}
            className="w-full h-full rounded-xl object-cover shadow-md group-hover:shadow-xl transition-shadow"
          />
        )}
        {/* Play icon overlay */}
        <div className="absolute bottom-2 right-2 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg opacity-90 group-hover:opacity-100 transition-opacity">
          <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
        </div>
      </div>
      <p className="text-sm font-medium text-gray-900 truncate leading-tight group-hover:text-purple-700 transition">
        {playlist.playlistName}
      </p>
      <p className="text-xs text-gray-500 truncate">
        {playlist.curatorName || 'Playlist'} • {playlist.trackCount || '?'} songs
      </p>
    </button>
  );
}

// ============================================
// COMPONENT: Album Card (for carousels)
// ============================================
function AlbumCard({ album, onPress, hideArtwork, isInLibrary, size = 'medium' }) {
  const dimensions = size === 'large' ? 'w-[160px]' : 'w-[130px]';
  const artworkSize = size === 'large' ? '320' : '260';
  const artworkUrl = album.artworkUrl?.replace('{w}', artworkSize).replace('{h}', artworkSize);

  return (
    <button
      onClick={() => onPress(album)}
      className={`${dimensions} flex-shrink-0 group`}
    >
      <div className={`relative ${dimensions} aspect-square mb-2`}>
        {hideArtwork || !artworkUrl ? (
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-md">
            <SafeTunesLogo className="w-10 h-10 text-white/70" />
          </div>
        ) : (
          <img
            src={artworkUrl}
            alt={album.albumName}
            className="w-full h-full rounded-xl object-cover shadow-md"
          />
        )}
        {isInLibrary && (
          <div className="absolute top-1.5 right-1.5 bg-green-500 text-white p-1 rounded-full">
            <Check className="w-3 h-3" />
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-gray-900 truncate leading-tight">
        {album.albumName}
      </p>
      <p className="text-xs text-gray-500 truncate">
        {album.artistName}
      </p>
    </button>
  );
}

// ============================================
// COMPONENT: Album Detail Modal
// ============================================
function AlbumDetailModal({ album, tracks, loading, onClose, onPlayTrack, onPlayAlbum, onAddAlbum, isInLibrary, currentSong, onPlayTrackWithContext, isPlaying = false }) {
  if (!album) return null;

  const artworkUrl = album.artworkUrl?.replace('{w}', '300').replace('{h}', '300');
  const hideArtwork = album.hideArtwork;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg max-h-[85vh] rounded-3xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-start gap-4">
          <div className="w-20 h-20 flex-shrink-0">
            {hideArtwork || !artworkUrl ? (
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                <SafeTunesLogo className="w-8 h-8 text-white/70" />
              </div>
            ) : (
              <img
                src={artworkUrl}
                alt={album.albumName}
                className="w-full h-full rounded-xl object-cover shadow-md"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-lg leading-tight line-clamp-2">{album.albumName}</h2>
            <p className="text-gray-500 text-sm truncate">{album.artistName}</p>
            <p className="text-gray-400 text-xs mt-1">{album.trackCount || tracks.length} tracks</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-b flex gap-2">
          <button
            onClick={onPlayAlbum}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition"
          >
            <Play className="w-4 h-4" fill="currentColor" />
            Play All
          </button>
          {!isInLibrary ? (
            <button
              onClick={onAddAlbum}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          ) : (
            <div className="flex-1 bg-green-100 text-green-700 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              Added
            </div>
          )}
        </div>

        {/* Tracks List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : tracks.length > 0 ? (
            <div className="divide-y divide-gray-100 pb-6">
              {tracks.map((track, index) => {
                const isCurrentlyPlaying = currentSong?.id === track.id;
                return (
                  <button
                    key={track.id || index}
                    onClick={() => onPlayTrackWithContext ? onPlayTrackWithContext(track, tracks, index) : onPlayTrack(track)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition ${isCurrentlyPlaying ? 'bg-purple-50' : ''}`}
                  >
                    <span className={`w-6 text-center text-sm font-medium ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-400'}`}>
                      {isCurrentlyPlaying ? (
                        <span className="flex items-center justify-center gap-0.5">
                          <span className={`w-0.5 bg-purple-600 rounded-full ${isPlaying ? 'animate-pulse' : ''}`} style={{ height: '8px' }}></span>
                          <span className={`w-0.5 bg-purple-600 rounded-full ${isPlaying ? 'animate-pulse' : ''}`} style={{ height: '12px', animationDelay: '0.1s' }}></span>
                          <span className={`w-0.5 bg-purple-600 rounded-full ${isPlaying ? 'animate-pulse' : ''}`} style={{ height: '6px', animationDelay: '0.2s' }}></span>
                        </span>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`font-medium truncate ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-900'}`}>
                        {track.attributes?.name || track.songName}
                      </p>
                    </div>
                    <span className={`text-sm ${isCurrentlyPlaying ? 'text-purple-500' : 'text-gray-400'}`}>
                      {formatDuration(track.attributes?.durationInMillis || track.durationInMillis)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No tracks available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENT: Artist Circle (for horizontal scroll)
// ============================================
function ArtistCircle({ name, albums, onClick }) {
  const firstAlbumArt = albums[0]?.artworkUrl?.replace('{w}', '150').replace('{h}', '150');

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-20 flex flex-col items-center gap-2 group"
    >
      {/* Artist Circle - larger and circular */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-xl group-active:scale-95 transition-all">
        {firstAlbumArt ? (
          <img src={firstAlbumArt} alt={name} className="w-full h-full object-cover" />
        ) : (
          <User className="w-10 h-10 text-white" />
        )}
      </div>
      <p className="text-xs font-medium text-gray-900 text-center truncate w-full leading-tight">{name}</p>
    </button>
  );
}

// ============================================
// COMPONENT: Genre Card (Library style)
// ============================================
function GenreCard({ name, albums, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl p-4 text-left shadow-lg transition-all active:scale-[0.98]"
    >
      <p className="font-bold text-lg truncate">{name}</p>
      <p className="text-sm text-white/80">{albums.length} {albums.length === 1 ? 'album' : 'albums'}</p>
    </button>
  );
}

// ============================================
// COMPONENT: Drill-down View (Artist/Genre/Mood results)
// ============================================
function DrillDownView({ title, subtitle, albums, onBack, onAlbumPress, onAddAlbum, isAlbumInLibrary, shouldHideArtwork, gradient }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-purple-600 font-medium mb-3"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
          Back to Discover
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>

      {/* Albums Grid */}
      {albums.length > 0 ? (
        <div className="px-4 pb-32">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {albums.map((album, index) => {
              const artworkUrl = album.artworkUrl?.replace('{w}', '300').replace('{h}', '300');
              const hideArtwork = shouldHideArtwork(album);
              const inLibrary = isAlbumInLibrary(album.appleAlbumId);

              return (
                <div key={album._id || album.appleAlbumId || `album-${index}`} className="relative">
                  <button
                    onClick={() => onAlbumPress(album)}
                    className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg active:scale-[0.98] transition-transform"
                  >
                    {hideArtwork || !artworkUrl ? (
                      <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                        <SafeTunesLogo className="w-12 h-12 text-white/70" />
                      </div>
                    ) : (
                      <img src={artworkUrl} alt={album.albumName} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-bold text-sm truncate">{album.albumName}</p>
                      <p className="text-white/70 text-xs truncate">{album.artistName}</p>
                    </div>
                  </button>

                  {!inLibrary ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAddAlbum(album); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
            <Music className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No albums here yet</h3>
          <p className="text-gray-500 text-sm max-w-xs">Check back later!</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT: DiscoveryPage
// ============================================
function DiscoveryPage({ kidProfile, onPlaySong, onPlayAlbum, currentSong = null, isPlaying = false, globalHideArtwork = false }) {
  const [toast, setToast] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [albumTracks, setAlbumTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [spotlightSeed] = useState(getSpotlightSeed);
  const [seeAllView, setSeeAllView] = useState(null); // 'forYou', 'artists', 'genres', 'playlists'

  // State for "Add to Playlists" button loading
  const [addingToLibrary, setAddingToLibrary] = useState(false);

  // Scroll to top when view changes (drill-downs or "See All")
  useEffect(() => {
    if (seeAllView || selectedMood || selectedArtist || selectedGenre || selectedPlaylist) {
      window.scrollTo(0, 0);
    }
  }, [seeAllView, selectedMood, selectedArtist, selectedGenre, selectedPlaylist]);

  // Fetch featured content (Discovery pool)
  const featuredContent = useQuery(
    api.featured.getFeaturedContentForKid,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  );

  // Fetch user's approved content (to check what's already in library)
  const approvedAlbums = useQuery(
    api.albums.getAlbumsWithApprovedSongs,
    kidProfile ? { kidProfileId: kidProfile._id } : 'skip'
  );

  // Fetch featured playlist tracks when a playlist is selected
  const selectedPlaylistTracks = useQuery(
    api.featuredPlaylists.getFeaturedPlaylistTracks,
    selectedPlaylist ? { playlistId: selectedPlaylist._id } : 'skip'
  );

  // Mutations to add content to library
  const addAlbumToLibrary = useMutation(api.albums.addDiscoverAlbumToKidLibrary);
  const storeAlbumTracks = useMutation(api.albums.storeAlbumTracks);
  const createPlaylist = useMutation(api.playlists.createPlaylist);
  const addSongsToPlaylist = useMutation(api.playlists.addSongsToPlaylist);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Check if an album is already in the user's library
  const isAlbumInLibrary = (appleAlbumId) => {
    return approvedAlbums?.some(album => album.appleAlbumId === appleAlbumId);
  };

  // Filter albums not in library
  const albumsNotInLibrary = useMemo(() => {
    if (!featuredContent?.albums) return [];
    return featuredContent.albums.filter(album => !isAlbumInLibrary(album.appleAlbumId));
  }, [featuredContent?.albums, approvedAlbums]);

  // Get featured playlists (shuffled)
  const featuredPlaylists = useMemo(() => {
    if (!featuredContent?.playlists || featuredContent.playlists.length === 0) return [];
    const shuffled = seededShuffle(featuredContent.playlists, spotlightSeed + 2);
    return shuffled.slice(0, 10);
  }, [featuredContent?.playlists, spotlightSeed]);

  // Get spotlight album
  const spotlightAlbum = useMemo(() => {
    if (albumsNotInLibrary.length === 0) return null;
    const shuffled = seededShuffle(albumsNotInLibrary, spotlightSeed);
    return shuffled[0];
  }, [albumsNotInLibrary, spotlightSeed]);

  // Get "For You" recommendations
  const forYouAlbums = useMemo(() => {
    if (albumsNotInLibrary.length === 0) return [];
    const shuffled = seededShuffle(albumsNotInLibrary, spotlightSeed + 1);
    return shuffled.slice(0, 8);
  }, [albumsNotInLibrary, spotlightSeed]);

  // Group albums by artist
  const albumsByArtist = useMemo(() => {
    const artistMap = {};
    albumsNotInLibrary.forEach(album => {
      const artist = album.artistName;
      if (artist) {
        if (!artistMap[artist]) artistMap[artist] = [];
        artistMap[artist].push(album);
      }
    });
    return Object.entries(artistMap).sort((a, b) => b[1].length - a[1].length);
  }, [albumsNotInLibrary]);

  // Group albums by genre
  const albumsByGenre = useMemo(() => {
    const genreMap = {};
    albumsNotInLibrary.forEach(album => {
      const validGenres = (album.genres || []).filter(g => g.toLowerCase() !== 'music');
      const primaryGenre = validGenres[0];
      if (primaryGenre) {
        if (!genreMap[primaryGenre]) genreMap[primaryGenre] = [];
        genreMap[primaryGenre].push(album);
      }
    });
    return Object.entries(genreMap).sort((a, b) => b[1].length - a[1].length);
  }, [albumsNotInLibrary]);

  // Count albums per mood
  const moodAlbumCounts = useMemo(() => {
    const counts = {};
    MOOD_CARDS.forEach(mood => {
      counts[mood.id] = filterAlbumsByMood(albumsNotInLibrary, mood).length;
    });
    return counts;
  }, [albumsNotInLibrary]);

  // Fetch album tracks
  const fetchAlbumTracks = async (album) => {
    setSelectedAlbum(album);
    setLoadingTracks(true);
    try {
      const music = musicKitService.music;
      if (!music) throw new Error('MusicKit not initialized');

      const response = await music.api.music(`/v1/catalog/${music.storefrontId}/albums/${album.appleAlbumId}`);
      const tracks = response.data.data[0]?.relationships?.tracks?.data || [];
      setAlbumTracks(tracks);
    } catch (error) {
      console.error('Failed to fetch tracks:', error);
      setAlbumTracks([]);
    } finally {
      setLoadingTracks(false);
    }
  };

  // Handle playing album
  const handlePlayAlbum = (album) => {
    if (onPlayAlbum) {
      onPlayAlbum({
        appleAlbumId: album.appleAlbumId,
        albumName: album.albumName,
        artistName: album.artistName,
        artworkUrl: album.artworkUrl,
        fromDiscover: true,
      });
    }
  };

  // Handle playing single track (legacy - no album context)
  const handlePlayTrack = (track) => {
    if (onPlaySong) {
      onPlaySong({
        id: track.id,
        appleSongId: track.id,
        name: track.attributes?.name,
        songName: track.attributes?.name,
        artist: track.attributes?.artistName,
        artistName: track.attributes?.artistName,
        albumName: track.attributes?.albumName,
        artworkUrl: track.attributes?.artwork?.url,
        durationInMillis: track.attributes?.durationInMillis,
        fromDiscover: true,
      });
    }
  };

  // Handle playing track with album context (enables skip next/prev within album)
  const handlePlayTrackWithContext = (track, allTracks, trackIndex) => {
    if (onPlaySong) {
      // Convert all tracks to the format expected by handlePlaySong
      const tracksContext = allTracks.map(t => ({
        id: t.id,
        appleSongId: t.id,
        songName: t.attributes?.name,
        artistName: t.attributes?.artistName,
        albumName: t.attributes?.albumName,
        artworkUrl: t.attributes?.artwork?.url,
        durationInMillis: t.attributes?.durationInMillis,
      }));

      onPlaySong({
        id: track.id,
        appleSongId: track.id,
        name: track.attributes?.name,
        songName: track.attributes?.name,
        artist: track.attributes?.artistName,
        artistName: track.attributes?.artistName,
        albumName: track.attributes?.albumName,
        artworkUrl: track.attributes?.artwork?.url,
        durationInMillis: track.attributes?.durationInMillis,
        fromDiscover: true,
      }, tracksContext);
    }
  };

  // Handle adding album to library
  const handleAddAlbum = async (album) => {
    if (!kidProfile || isAlbumInLibrary(album.appleAlbumId)) return;

    try {
      let result = await addAlbumToLibrary({
        userId: kidProfile.userId,
        kidProfileId: kidProfile._id,
        appleAlbumId: album.appleAlbumId,
        albumName: album.albumName,
        artistName: album.artistName,
        artworkUrl: album.artworkUrl,
        releaseYear: album.releaseYear,
        trackCount: album.trackCount,
        genres: album.genres || [],
        isExplicit: album.isExplicit,
        hideArtwork: album.hideArtwork,
      });

      if (result.tracksAdded === 0) {
        try {
          const tracks = await musicKitService.getAlbumTracks(album.appleAlbumId);
          if (tracks && tracks.length > 0) {
            const formattedTracks = tracks.map((track, index) => ({
              appleSongId: track.id || track.attributes?.playParams?.id,
              songName: track.attributes?.name || 'Unknown Track',
              artistName: track.attributes?.artistName || album.artistName,
              trackNumber: track.attributes?.trackNumber || index + 1,
              durationInMillis: track.attributes?.durationInMillis || 0,
              isExplicit: track.attributes?.contentRating === 'explicit',
            }));

            await storeAlbumTracks({
              userId: kidProfile.userId,
              appleAlbumId: album.appleAlbumId,
              tracks: formattedTracks,
            });

            result = await addAlbumToLibrary({
              userId: kidProfile.userId,
              kidProfileId: kidProfile._id,
              appleAlbumId: album.appleAlbumId,
              albumName: album.albumName,
              artistName: album.artistName,
              artworkUrl: album.artworkUrl,
              releaseYear: album.releaseYear,
              trackCount: album.trackCount,
              genres: album.genres || [],
              isExplicit: album.isExplicit,
              hideArtwork: album.hideArtwork,
            });
          }
        } catch (fetchError) {
          console.warn('Failed to fetch tracks from Apple Music:', fetchError);
        }
      }

      if (result.tracksAdded > 0) {
        showToast(`Added "${album.albumName}" (${result.tracksAdded} tracks)!`);
      } else {
        showToast(`Added "${album.albumName}" to your library!`);
      }
    } catch (error) {
      console.error('Failed to add album:', error);
      showToast('Failed to add album. Please try again.', 'error');
    }
  };

  const shouldHideArtwork = (album) => globalHideArtwork || album.hideArtwork;

  // Handle playing a playlist (play first track with full playlist context)
  const handlePlayPlaylist = (playlist, tracks) => {
    if (!tracks || tracks.length === 0 || !onPlaySong) return;

    // Build context from all playlist tracks for skip next/prev
    const tracksContext = tracks.map(t => ({
      id: t.appleSongId,
      appleSongId: t.appleSongId,
      songName: t.songName,
      artistName: t.artistName,
      albumName: t.albumName,
      artworkUrl: t.artworkUrl || playlist.artworkUrl,
      durationInMillis: t.durationInMillis,
    }));

    const firstTrack = tracks[0];
    onPlaySong({
      id: firstTrack.appleSongId,
      appleSongId: firstTrack.appleSongId,
      name: firstTrack.songName,
      songName: firstTrack.songName,
      artist: firstTrack.artistName,
      artistName: firstTrack.artistName,
      albumName: firstTrack.albumName || playlist.playlistName,
      artworkUrl: firstTrack.artworkUrl || playlist.artworkUrl,
      durationInMillis: firstTrack.durationInMillis,
      fromDiscover: true,
    }, tracksContext);
  };

  // Handle playing a track from a playlist with context
  const handlePlayPlaylistTrack = (track, trackIndex) => {
    if (!selectedPlaylistTracks || !onPlaySong) return;

    // Build context from all playlist tracks
    const tracksContext = selectedPlaylistTracks.map(t => ({
      id: t.appleSongId,
      appleSongId: t.appleSongId,
      songName: t.songName,
      artistName: t.artistName,
      albumName: t.albumName,
      artworkUrl: t.artworkUrl || selectedPlaylist?.artworkUrl,
      durationInMillis: t.durationInMillis,
    }));

    onPlaySong({
      id: track.appleSongId,
      appleSongId: track.appleSongId,
      name: track.songName,
      songName: track.songName,
      artist: track.artistName,
      artistName: track.artistName,
      albumName: track.albumName || selectedPlaylist?.playlistName,
      artworkUrl: track.artworkUrl || selectedPlaylist?.artworkUrl,
      durationInMillis: track.durationInMillis,
      fromDiscover: true,
    }, tracksContext);
  };

  // Handle adding featured playlist as a new kid playlist
  const handleAddPlaylistToLibrary = async () => {
    if (!selectedPlaylistTracks || selectedPlaylistTracks.length === 0 || !kidProfile || !selectedPlaylist) return;

    setAddingToLibrary(true);

    try {
      // 1. Create a new playlist with the same name
      const playlistId = await createPlaylist({
        kidProfileId: kidProfile._id,
        userId: kidProfile.userId,
        name: selectedPlaylist.playlistName,
        description: selectedPlaylist.description || `From Discover`,
      });

      // 2. Convert tracks to the format expected by addSongsToPlaylist
      const songs = selectedPlaylistTracks.map(track => ({
        appleSongId: track.appleSongId,
        songName: track.songName,
        artistName: track.artistName,
        albumName: track.albumName || selectedPlaylist.playlistName,
        artworkUrl: track.artworkUrl || selectedPlaylist.artworkUrl,
        durationInMillis: track.durationInMillis,
      }));

      // 3. Add all songs to the new playlist
      await addSongsToPlaylist({
        playlistId,
        songs,
      });

      showToast(`Created "${selectedPlaylist.playlistName}" with ${songs.length} songs!`);
    } catch (err) {
      console.error('Failed to create playlist:', err);
      showToast('Failed to create playlist', 'error');
    } finally {
      setAddingToLibrary(false);
    }
  };

  // Toast notification (shared across all views)
  const toastUI = toast && (
    <div className={`fixed top-4 left-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
      toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {toast.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
      <span className="font-medium">{toast.message}</span>
    </div>
  );

  // Album Detail Modal - ALWAYS check this first, it's a modal overlay
  // This must come BEFORE any other view checks so it shows on top of everything
  if (selectedAlbum) {
    return (
      <>
        {toastUI}
        {/* Render a simple backdrop instead of the full background view */}
        <div className="min-h-screen bg-white" />
        <AlbumDetailModal
          album={selectedAlbum}
          tracks={albumTracks}
          loading={loadingTracks}
          onClose={() => { setSelectedAlbum(null); setAlbumTracks([]); }}
          onPlayTrack={handlePlayTrack}
          onPlayTrackWithContext={handlePlayTrackWithContext}
          onPlayAlbum={() => handlePlayAlbum(selectedAlbum)}
          onAddAlbum={() => handleAddAlbum(selectedAlbum)}
          isInLibrary={isAlbumInLibrary(selectedAlbum.appleAlbumId)}
          currentSong={currentSong}
          isPlaying={isPlaying}
        />
      </>
    );
  }

  // Playlist Detail View - Check BEFORE mood/artist/genre so it shows when tapped from within those views
  if (selectedPlaylist) {
    const artworkUrl = selectedPlaylist.artworkUrl?.replace('{w}', '400').replace('{h}', '400');

    return (
      <>
        {toastUI}
        <div className="min-h-screen bg-white">
          {/* Header */}
          <div className="px-4 pt-6 pb-4">
            <button
              onClick={() => setSelectedPlaylist(null)}
              className="flex items-center gap-2 text-purple-600 font-medium mb-4"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back
            </button>

            {/* Playlist Info */}
            <div className="flex gap-4">
              <div className="w-28 h-28 flex-shrink-0">
                {selectedPlaylist.hideArtwork || !artworkUrl ? (
                  <div className="w-full h-full rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-lg">
                    <ListMusic className="w-10 h-10 text-white/80" />
                  </div>
                ) : (
                  <img
                    src={artworkUrl}
                    alt={selectedPlaylist.playlistName}
                    className="w-full h-full rounded-xl object-cover shadow-lg"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 line-clamp-2">{selectedPlaylist.playlistName}</h1>
                <p className="text-gray-500 text-sm mt-1">{selectedPlaylist.curatorName || 'Playlist'}</p>
                <p className="text-gray-400 text-xs mt-1">{selectedPlaylist.trackCount || selectedPlaylistTracks?.length || '?'} songs</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handlePlayPlaylist(selectedPlaylist, selectedPlaylistTracks)}
                disabled={!selectedPlaylistTracks || selectedPlaylistTracks.length === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-4 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                <Play className="w-5 h-5" fill="currentColor" />
                Play All
              </button>
              <button
                onClick={handleAddPlaylistToLibrary}
                disabled={!selectedPlaylistTracks || selectedPlaylistTracks.length === 0 || addingToLibrary}
                className="px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition"
              >
                {addingToLibrary ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add to Playlists
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Track List */}
          <div className="pb-32">
            {!selectedPlaylistTracks ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : selectedPlaylistTracks.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {selectedPlaylistTracks.map((track, index) => {
                  const isCurrentlyPlaying = currentSong?.appleSongId === track.appleSongId;
                  return (
                    <button
                      key={track._id || `track-${index}`}
                      onClick={() => handlePlayPlaylistTrack(track, index)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition ${isCurrentlyPlaying ? 'bg-purple-50' : ''}`}
                    >
                      <span className={`w-6 text-center text-sm font-medium ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-400'}`}>
                        {isCurrentlyPlaying ? (
                          <span className="flex items-center justify-center gap-0.5">
                            <span className={`w-0.5 bg-purple-600 rounded-full ${isPlaying ? 'animate-pulse' : ''}`} style={{ height: '8px' }}></span>
                            <span className={`w-0.5 bg-purple-600 rounded-full ${isPlaying ? 'animate-pulse' : ''}`} style={{ height: '12px', animationDelay: '0.1s' }}></span>
                            <span className={`w-0.5 bg-purple-600 rounded-full ${isPlaying ? 'animate-pulse' : ''}`} style={{ height: '6px', animationDelay: '0.2s' }}></span>
                          </span>
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`font-medium truncate ${isCurrentlyPlaying ? 'text-purple-600' : 'text-gray-900'}`}>
                          {track.songName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{track.artistName}</p>
                      </div>
                      <span className={`text-sm ${isCurrentlyPlaying ? 'text-purple-500' : 'text-gray-400'}`}>
                        {formatDuration(track.durationInMillis)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No tracks available</p>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Common UI for views that don't have selectedAlbum or selectedPlaylist
  const commonUI = toastUI;

  // Show Artist drill-down
  if (selectedArtist) {
    const [artistName, artistAlbums] = selectedArtist;
    return (
      <>
        {commonUI}
        <DrillDownView
          title={artistName}
          subtitle={`${artistAlbums.length} albums`}
          albums={artistAlbums}
          onBack={() => setSelectedArtist(null)}
          onAlbumPress={fetchAlbumTracks}
          onAddAlbum={handleAddAlbum}
          isAlbumInLibrary={isAlbumInLibrary}
          shouldHideArtwork={shouldHideArtwork}
        />
      </>
    );
  }

  // Show Genre drill-down
  if (selectedGenre) {
    const [genreName, genreAlbums] = selectedGenre;
    return (
      <>
        {commonUI}
        <DrillDownView
          title={genreName}
          subtitle={`${genreAlbums.length} albums`}
          albums={genreAlbums}
          onBack={() => setSelectedGenre(null)}
          onAlbumPress={fetchAlbumTracks}
          onAddAlbum={handleAddAlbum}
          isAlbumInLibrary={isAlbumInLibrary}
          shouldHideArtwork={shouldHideArtwork}
        />
      </>
    );
  }

  // Show Mood drill-down
  if (selectedMood) {
    const mood = selectedMood;
    const moodAlbums = filterAlbumsByMood(albumsNotInLibrary, mood);
    const moodPlaylists = filterPlaylistsByMood(featuredContent?.playlists || [], mood);
    const totalItems = moodAlbums.length + moodPlaylists.length;

    return (
      <>
        <div className="min-h-screen bg-white">
          {/* Header */}
          <div className="px-4 pt-6 pb-4">
            <button
              onClick={() => setSelectedMood(null)}
              className="flex items-center gap-2 text-purple-600 font-medium mb-3"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back to Discover
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{mood.title}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {moodAlbums.length} {moodAlbums.length === 1 ? 'album' : 'albums'}
              {moodPlaylists.length > 0 && ` • ${moodPlaylists.length} ${moodPlaylists.length === 1 ? 'playlist' : 'playlists'}`}
            </p>
          </div>

          {/* Playlists Section (if any) */}
          {moodPlaylists.length > 0 && (
            <div className="mb-6">
              <div className="px-4 mb-3">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-purple-600" />
                  Playlists
                </h2>
              </div>
              <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide">
                {moodPlaylists.map((playlist, index) => (
                  <PlaylistCard
                    key={playlist._id || `mood-playlist-${index}`}
                    playlist={playlist}
                    onPress={setSelectedPlaylist}
                    hideArtwork={playlist.hideArtwork}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Albums Grid */}
          {moodAlbums.length > 0 ? (
            <div className="px-4 pb-32">
              {moodPlaylists.length > 0 && (
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Music className="w-5 h-5 text-purple-600" />
                  Albums
                </h2>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {moodAlbums.map((album, index) => {
                  const artworkUrl = album.artworkUrl?.replace('{w}', '300').replace('{h}', '300');
                  const hideArtwork = shouldHideArtwork(album);
                  const inLibrary = isAlbumInLibrary(album.appleAlbumId);

                  return (
                    <div key={album._id || album.appleAlbumId || `album-${index}`} className="relative">
                      <button
                        onClick={() => fetchAlbumTracks(album)}
                        className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg active:scale-[0.98] transition-transform"
                      >
                        {hideArtwork || !artworkUrl ? (
                          <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                            <SafeTunesLogo className="w-12 h-12 text-white/70" />
                          </div>
                        ) : (
                          <img src={artworkUrl} alt={album.albumName} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white font-bold text-sm truncate">{album.albumName}</p>
                          <p className="text-white/70 text-xs truncate">{album.artistName}</p>
                        </div>
                      </button>

                      {!inLibrary ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddAlbum(album); }}
                          className="absolute top-2 right-2 w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : moodPlaylists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
                <Music className="w-10 h-10 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No {mood.title.toLowerCase()} music yet</h3>
              <p className="text-gray-500 text-sm max-w-xs">Check back later!</p>
            </div>
          ) : (
            <div className="pb-32" />
          )}
        </div>
        {commonUI}
      </>
    );
  }

  // Show "See All For You" grid
  if (seeAllView === 'forYou') {
    return (
      <>
        {commonUI}
        <DrillDownView
          title="For You"
          subtitle={`${albumsNotInLibrary.length} albums`}
          albums={albumsNotInLibrary}
          onBack={() => setSeeAllView(null)}
          onAlbumPress={fetchAlbumTracks}
          onAddAlbum={handleAddAlbum}
          isAlbumInLibrary={isAlbumInLibrary}
          shouldHideArtwork={shouldHideArtwork}
        />
      </>
    );
  }

  // Show "See All Artists" view
  if (seeAllView === 'artists') {
    return (
      <>
        {commonUI}
        <div className="min-h-screen bg-white">
          {/* Header */}
          <div className="px-4 pt-6 pb-4">
            <button
              onClick={() => setSeeAllView(null)}
              className="flex items-center gap-2 text-purple-600 font-medium mb-3"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back to Discover
            </button>
            <h1 className="text-2xl font-bold text-gray-900">All Artists</h1>
            <p className="text-gray-500 text-sm mt-1">{albumsByArtist.length} artists</p>
          </div>

          {/* Artists Grid */}
          <div className="px-4 pb-32">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {albumsByArtist.map(([name, albums]) => (
                <button
                  key={name}
                  onClick={() => { setSeeAllView(null); setSelectedArtist([name, albums]); }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center overflow-hidden shadow-lg group-hover:shadow-xl group-active:scale-95 transition-all">
                    {albums[0]?.artworkUrl ? (
                      <img
                        src={albums[0].artworkUrl.replace('{w}', '200').replace('{h}', '200')}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-gray-900 text-center truncate w-full leading-tight">{name}</p>
                  <p className="text-xs text-gray-500">{albums.length} {albums.length === 1 ? 'album' : 'albums'}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show "See All Genres" view
  if (seeAllView === 'genres') {
    return (
      <>
        {commonUI}
        <div className="min-h-screen bg-white">
          {/* Header */}
          <div className="px-4 pt-6 pb-4">
            <button
              onClick={() => setSeeAllView(null)}
              className="flex items-center gap-2 text-purple-600 font-medium mb-3"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back to Discover
            </button>
            <h1 className="text-2xl font-bold text-gray-900">All Genres</h1>
            <p className="text-gray-500 text-sm mt-1">{albumsByGenre.length} genres</p>
          </div>

          {/* Genres Grid */}
          <div className="px-4 pb-32">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {albumsByGenre.map(([name, albums]) => (
                <button
                  key={name}
                  onClick={() => { setSeeAllView(null); setSelectedGenre([name, albums]); }}
                  className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl p-4 text-left shadow-lg transition-all active:scale-[0.98]"
                >
                  <p className="font-bold text-base lg:text-lg truncate">{name}</p>
                  <p className="text-sm text-white/80">{albums.length} {albums.length === 1 ? 'album' : 'albums'}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Show "See All Playlists" view
  if (seeAllView === 'playlists') {
    return (
      <>
        {commonUI}
        <div className="min-h-screen bg-white">
          {/* Header */}
          <div className="px-4 pt-6 pb-4">
            <button
              onClick={() => setSeeAllView(null)}
              className="flex items-center gap-2 text-purple-600 font-medium mb-3"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
              Back to Discover
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Featured Playlists</h1>
            <p className="text-gray-500 text-sm mt-1">{featuredContent?.playlists?.length || 0} playlists</p>
          </div>

          {/* Playlists Grid */}
          <div className="px-4 pb-32">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {featuredContent?.playlists?.map((playlist, index) => {
                const artworkUrl = playlist.artworkUrl?.replace('{w}', '300').replace('{h}', '300');

                return (
                  <button
                    key={playlist._id || `playlist-grid-${index}`}
                    onClick={() => setSelectedPlaylist(playlist)}
                    className="w-full aspect-square rounded-2xl overflow-hidden shadow-lg active:scale-[0.98] transition-transform group relative"
                  >
                    {playlist.hideArtwork || !artworkUrl ? (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        <ListMusic className="w-12 h-12 text-white/60" />
                      </div>
                    ) : (
                      <img src={artworkUrl} alt={playlist.playlistName} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    {/* Play button overlay */}
                    <div className="absolute bottom-12 right-3 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center shadow-lg opacity-90 group-hover:opacity-100 transition-opacity">
                      <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white font-bold text-sm truncate">{playlist.playlistName}</p>
                      <p className="text-white/70 text-xs truncate">{playlist.curatorName || 'Playlist'} • {playlist.trackCount || '?'} songs</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {commonUI}

      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Discover</h1>
        <p className="text-gray-500 mt-1">New music waiting for you</p>
      </div>

      {/* Spotlight Album */}
      {spotlightAlbum && (
        <SpotlightCard
          album={spotlightAlbum}
          onPress={fetchAlbumTracks}
          onPlay={handlePlayAlbum}
          onAdd={handleAddAlbum}
          isInLibrary={isAlbumInLibrary(spotlightAlbum.appleAlbumId)}
          hideArtwork={shouldHideArtwork(spotlightAlbum)}
        />
      )}

      {/* Mood Cards Grid - Only show moods with matching albums */}
      {MOOD_CARDS.some(mood => moodAlbumCounts[mood.id] > 0) && (
        <section className="mb-6">
          <SectionHeader title="Browse by Mood" icon={Heart} />
          <div className="px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MOOD_CARDS.filter(mood => moodAlbumCounts[mood.id] > 0).map(mood => (
              <MoodCard
                key={mood.id}
                mood={mood}
                onClick={setSelectedMood}
                albumCount={moodAlbumCounts[mood.id]}
              />
            ))}
          </div>
        </section>
      )}

      {/* For You Section */}
      {forYouAlbums.length > 0 && (
        <section className="mb-6">
          <SectionHeader
            title="For You"
            icon={Sparkles}
            actionLabel={albumsNotInLibrary.length > 8 ? "See All" : null}
            onAction={albumsNotInLibrary.length > 8 ? () => setSeeAllView('forYou') : null}
          />
          <HorizontalScroll>
            {forYouAlbums.map((album, index) => (
              <AlbumCard
                key={album._id || album.appleAlbumId || `for-you-${index}`}
                album={album}
                onPress={fetchAlbumTracks}
                hideArtwork={shouldHideArtwork(album)}
                isInLibrary={isAlbumInLibrary(album.appleAlbumId)}
                size="large"
              />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Featured Playlists Section */}
      {featuredPlaylists.length > 0 && (
        <section className="mb-6">
          <SectionHeader
            title="Featured Playlists"
            icon={ListMusic}
            actionLabel={featuredContent?.playlists?.length > 10 ? "See All" : null}
            onAction={featuredContent?.playlists?.length > 10 ? () => setSeeAllView('playlists') : null}
          />
          <HorizontalScroll>
            {featuredPlaylists.map((playlist, index) => (
              <PlaylistCard
                key={playlist._id || `playlist-${index}`}
                playlist={playlist}
                onPress={setSelectedPlaylist}
                hideArtwork={playlist.hideArtwork}
              />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Artists Section - Horizontal scroll with circular avatars */}
      {albumsByArtist.length > 0 && (
        <section className="mb-6">
          <SectionHeader
            title="Trending Artists"
            icon={User}
            actionLabel={albumsByArtist.length > 10 ? "See All" : null}
            onAction={albumsByArtist.length > 10 ? () => setSeeAllView('artists') : null}
          />
          <HorizontalScroll>
            {albumsByArtist.slice(0, 10).map(([name, albums]) => (
              <ArtistCircle
                key={name}
                name={name}
                albums={albums}
                onClick={() => setSelectedArtist([name, albums])}
              />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Genres Section - Horizontal scroll pills */}
      {albumsByGenre.length > 0 && (
        <section className="mb-6">
          <SectionHeader
            title="Browse Genres"
            icon={Music}
            actionLabel={albumsByGenre.length > 10 ? "See All" : null}
            onAction={albumsByGenre.length > 10 ? () => setSeeAllView('genres') : null}
          />
          <HorizontalScroll>
            {albumsByGenre.slice(0, 10).map(([name, albums]) => (
              <button
                key={name}
                onClick={() => setSelectedGenre([name, albums])}
                className="flex-shrink-0 px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-full shadow-lg active:scale-95 transition-all whitespace-nowrap"
              >
                {name}
              </button>
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Empty State - only show when no albums AND no playlists */}
      {albumsNotInLibrary.length === 0 && featuredPlaylists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mb-4">
            <Music className="w-10 h-10 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {(featuredContent?.albums?.length > 0 || featuredContent?.playlists?.length > 0) ? 'All caught up!' : 'Nothing here yet'}
          </h3>
          <p className="text-gray-500 text-sm max-w-xs">
            {(featuredContent?.albums?.length > 0 || featuredContent?.playlists?.length > 0)
              ? "You've added everything to your library. Great job!"
              : "Your parents can add music to Discover for you to explore."}
          </p>
        </div>
      )}
    </div>
  );
}

export default DiscoveryPage;
