import { useState, useMemo } from 'react';
import { Plus, ChevronRight, Music, User, Disc, Clock, Play } from 'lucide-react';

// Format duration from milliseconds
const formatDuration = (millis) => {
  if (!millis) return '';
  const minutes = Math.floor(millis / 60000);
  const seconds = Math.floor((millis % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Determine the "Top Result" - Best match logic
const findTopResult = (results, searchQuery) => {
  if (!results?.length || !searchQuery) return null;

  const query = searchQuery.toLowerCase().trim();

  // Priority 1: Exact artist name match
  const exactArtist = results.find(
    r => r.resultType === 'artist' &&
    r.attributes?.name?.toLowerCase() === query
  );
  if (exactArtist) return exactArtist;

  // Priority 2: Exact album name match
  const exactAlbum = results.find(
    r => r.resultType === 'album' &&
    r.attributes?.name?.toLowerCase() === query
  );
  if (exactAlbum) return exactAlbum;

  // Priority 3: Artist name starts with query
  const startsWithArtist = results.find(
    r => r.resultType === 'artist' &&
    r.attributes?.name?.toLowerCase().startsWith(query)
  );
  if (startsWithArtist) return startsWithArtist;

  // Priority 4: Album name starts with query
  const startsWithAlbum = results.find(
    r => r.resultType === 'album' &&
    r.attributes?.name?.toLowerCase().startsWith(query)
  );
  if (startsWithAlbum) return startsWithAlbum;

  // Priority 5: First artist result
  const firstArtist = results.find(r => r.resultType === 'artist');
  if (firstArtist) return firstArtist;

  // Priority 6: First album result
  const firstAlbum = results.find(r => r.resultType === 'album');
  if (firstAlbum) return firstAlbum;

  // Fallback: First result
  return results[0];
};

// Top Result Card Component
function TopResultCard({ item, onTap }) {
  if (!item) return null;

  const isArtist = item.resultType === 'artist';
  const isAlbum = item.resultType === 'album';
  const isSong = item.resultType === 'song';

  const artworkUrl = item.attributes?.artwork?.url
    ?.replace('{w}', '300')
    .replace('{h}', '300');

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Top Result
      </h3>
      <button
        onClick={() => onTap(item)}
        className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border border-gray-200 hover:border-purple-300 transition-all hover:shadow-lg"
      >
        <div className="p-5 flex items-center gap-5">
          {/* Artwork */}
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt={item.attributes?.name}
              className={`w-24 h-24 object-cover shadow-xl flex-shrink-0 ${
                isArtist ? 'rounded-full' : 'rounded-xl'
              }`}
            />
          ) : (
            <div className={`w-24 h-24 flex items-center justify-center shadow-xl flex-shrink-0 ${
              isArtist
                ? 'rounded-full bg-gradient-to-br from-indigo-400 to-purple-500'
                : 'rounded-xl bg-gradient-to-br from-purple-400 to-pink-500'
            }`}>
              {isArtist ? (
                <User className="w-10 h-10 text-white" />
              ) : (
                <Music className="w-10 h-10 text-white" />
              )}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0 text-left">
            <h4 className="text-xl font-bold text-gray-900 truncate group-hover:text-purple-700 transition">
              {item.attributes?.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isArtist
                  ? 'bg-indigo-100 text-indigo-700'
                  : isAlbum
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-pink-100 text-pink-700'
              }`}>
                {isArtist ? 'Artist' : isAlbum ? 'Album' : 'Song'}
              </span>
              {!isArtist && (
                <span className="text-sm text-gray-500 truncate">
                  {item.attributes?.artistName}
                </span>
              )}
            </div>
            {isArtist && (
              <p className="text-sm text-gray-500 mt-1">
                Tap to explore discography
              </p>
            )}
          </div>

          {/* Arrow */}
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <ChevronRight className="w-5 h-5 text-white" />
          </div>
        </div>
      </button>
    </div>
  );
}

// Song Row Component - Clean, touch-friendly
function SongRow({ song, onTap, onQuickAdd, onPlayPreview, isPlaying, showArtwork = true }) {
  const artworkUrl = song.attributes?.artwork?.url
    ?.replace('{w}', '100')
    .replace('{h}', '100');

  return (
    <div className="flex items-center gap-3 py-3 group">
      {/* Artwork with Play Button */}
      {showArtwork && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayPreview?.(song);
          }}
          className="relative flex-shrink-0 group/play"
        >
          {artworkUrl ? (
            <img
              src={artworkUrl}
              alt={song.attributes?.name}
              className="w-12 h-12 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <Music className="w-6 h-6 text-purple-400" />
            </div>
          )}
          {/* Play overlay */}
          <div className={`absolute inset-0 rounded-lg flex items-center justify-center transition ${
            isPlaying ? 'bg-black/40' : 'bg-black/0 group-hover/play:bg-black/40'
          }`}>
            <div className={`w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow transition ${
              isPlaying ? 'scale-100' : 'scale-0 group-hover/play:scale-100'
            }`}>
              {isPlaying ? (
                <span className="w-3 h-3 flex gap-0.5">
                  <span className="w-1 h-3 bg-purple-600 rounded-sm" />
                  <span className="w-1 h-3 bg-purple-600 rounded-sm" />
                </span>
              ) : (
                <Play className="w-4 h-4 text-purple-600 ml-0.5" />
              )}
            </div>
          </div>
        </button>
      )}

      {/* Song Info - Tappable area */}
      <button
        onClick={() => onTap(song)}
        className="flex-1 min-w-0 text-left hover:bg-gray-50 -my-3 py-3 -ml-3 pl-3 rounded-lg transition"
      >
        <div className="flex items-center gap-2">
          <h5 className="font-semibold text-gray-900 truncate">
            {song.attributes?.name}
          </h5>
          {song.attributes?.contentRating === 'explicit' && (
            <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-bold flex-shrink-0">
              E
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">
          {song.attributes?.artistName}
        </p>
      </button>

      {/* Duration */}
      <span className="text-sm text-gray-400 flex-shrink-0 hidden sm:block">
        {formatDuration(song.attributes?.durationInMillis)}
      </span>

      {/* Quick Add Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onQuickAdd?.(song);
        }}
        className="w-9 h-9 rounded-full bg-gray-100 hover:bg-purple-100 flex items-center justify-center transition flex-shrink-0 group-hover:bg-purple-50"
        title="Add song"
      >
        <Plus className="w-5 h-5 text-gray-500 group-hover:text-purple-600" />
      </button>
    </div>
  );
}

// Album Card Component for Carousel
function AlbumCard({ album, onTap }) {
  const artworkUrl = album.attributes?.artwork?.url
    ?.replace('{w}', '256')
    .replace('{h}', '256');

  return (
    <button
      onClick={() => onTap(album)}
      className="flex-shrink-0 w-32 group"
    >
      {/* Large rounded artwork */}
      {artworkUrl ? (
        <img
          src={artworkUrl}
          alt={album.attributes?.name}
          className="w-32 h-32 rounded-2xl object-cover shadow-md group-hover:shadow-xl transition-shadow"
        />
      ) : (
        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center shadow-md">
          <Disc className="w-12 h-12 text-purple-400" />
        </div>
      )}

      {/* Title - truncated */}
      <h5 className="mt-2 font-semibold text-gray-900 text-sm truncate group-hover:text-purple-700 transition">
        {album.attributes?.name}
      </h5>
    </button>
  );
}

// Artist Card for Carousel
function ArtistCard({ artist, onTap }) {
  const artworkUrl = artist.attributes?.artwork?.url
    ?.replace('{w}', '200')
    .replace('{h}', '200');

  return (
    <button
      onClick={() => onTap(artist)}
      className="flex-shrink-0 w-32 group text-center"
    >
      {/* Artwork */}
      {artworkUrl ? (
        <img
          src={artworkUrl}
          alt={artist.attributes?.name}
          className="w-32 h-32 rounded-full object-cover shadow-md group-hover:shadow-xl transition-shadow mx-auto"
        />
      ) : (
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 flex items-center justify-center shadow-md mx-auto">
          <User className="w-12 h-12 text-indigo-400" />
        </div>
      )}

      {/* Name */}
      <h5 className="mt-2 font-semibold text-gray-900 text-sm truncate group-hover:text-purple-700 transition">
        {artist.attributes?.name}
      </h5>
      <p className="text-xs text-gray-500">Artist</p>
    </button>
  );
}

// Main SearchResults Component
function SearchResults({
  results,
  searchQuery,
  onItemTap,
  onQuickAdd,
  onPlayPreview,
  playingTrackId,
  onClear,
  activeFilter,
  onFilterChange
}) {
  // Memoized categorization
  const { songs, albums, artists, topResult, counts } = useMemo(() => {
    const songs = results.filter(r => r.resultType === 'song');
    const albums = results.filter(r => r.resultType === 'album');
    const artists = results.filter(r => r.resultType === 'artist');
    const topResult = findTopResult(results, searchQuery);

    return {
      songs,
      albums,
      artists,
      topResult,
      counts: {
        all: results.length,
        songs: songs.length,
        albums: albums.length,
        artists: artists.length
      }
    };
  }, [results, searchQuery]);

  // Filtered view based on active filter
  const showAllView = activeFilter === 'all';
  const showSongsOnly = activeFilter === 'songs';
  const showAlbumsOnly = activeFilter === 'albums';
  const showArtistsOnly = activeFilter === 'artists';

  if (!results?.length) return null;

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h4 className="text-base font-semibold text-gray-900">
          Results
          <span className="ml-2 text-sm text-gray-500 font-normal">
            ({activeFilter === 'all' ? counts.all : counts[activeFilter]})
          </span>
        </h4>
        <button
          onClick={onClear}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium self-end sm:self-auto"
        >
          Clear
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({counts.all})
        </button>
        {counts.songs > 0 && (
          <button
            onClick={() => onFilterChange('songs')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
              activeFilter === 'songs'
                ? 'bg-pink-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Songs ({counts.songs})
          </button>
        )}
        {counts.albums > 0 && (
          <button
            onClick={() => onFilterChange('albums')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
              activeFilter === 'albums'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Albums ({counts.albums})
          </button>
        )}
        {counts.artists > 0 && (
          <button
            onClick={() => onFilterChange('artists')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
              activeFilter === 'artists'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Artists ({counts.artists})
          </button>
        )}
      </div>

      {/* === ALL VIEW - Sectioned Layout === */}
      {showAllView && (
        <div className="space-y-6">
          {/* Top Result */}
          {topResult && (
            <TopResultCard item={topResult} onTap={onItemTap} />
          )}

          {/* Top Songs Section */}
          {songs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Songs
                </h3>
                {songs.length > 4 && (
                  <button
                    onClick={() => onFilterChange('songs')}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    See all
                  </button>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 px-4 divide-y divide-gray-100">
                {songs.slice(0, 4).map((song) => (
                  <SongRow
                    key={`song-${song.id}`}
                    song={song}
                    onTap={onItemTap}
                    onQuickAdd={onQuickAdd}
                    onPlayPreview={onPlayPreview}
                    isPlaying={playingTrackId === song.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Albums Carousel */}
          {albums.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Albums
                </h3>
                {albums.length > 4 && (
                  <button
                    onClick={() => onFilterChange('albums')}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    See all
                  </button>
                )}
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                {albums.slice(0, 8).map((album) => (
                  <AlbumCard
                    key={`album-${album.id}`}
                    album={album}
                    onTap={onItemTap}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Artists Section */}
          {artists.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Artists
                </h3>
                {artists.length > 4 && (
                  <button
                    onClick={() => onFilterChange('artists')}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    See all
                  </button>
                )}
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                {artists.slice(0, 6).map((artist) => (
                  <ArtistCard
                    key={`artist-${artist.id}`}
                    artist={artist}
                    onTap={onItemTap}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === SONGS ONLY VIEW === */}
      {showSongsOnly && songs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 divide-y divide-gray-100">
          {songs.map((song) => (
            <SongRow
              key={`song-${song.id}`}
              song={song}
              onTap={onItemTap}
              onQuickAdd={onQuickAdd}
              onPlayPreview={onPlayPreview}
              isPlaying={playingTrackId === song.id}
            />
          ))}
        </div>
      )}

      {/* === ALBUMS ONLY VIEW === */}
      {showAlbumsOnly && albums.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {albums.map((album) => (
            <AlbumCard
              key={`album-${album.id}`}
              album={album}
              onTap={onItemTap}
            />
          ))}
        </div>
      )}

      {/* === ARTISTS ONLY VIEW === */}
      {showArtistsOnly && artists.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {artists.map((artist) => (
            <ArtistCard
              key={`artist-${artist.id}`}
              artist={artist}
              onTap={onItemTap}
            />
          ))}
        </div>
      )}

      {/* Hint text for mobile */}
      <p className="text-xs text-gray-400 text-center mt-4 sm:hidden">
        Tap any item to add or review
      </p>
    </div>
  );
}

export default SearchResults;
