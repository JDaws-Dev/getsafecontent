import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Clock, Plus, Check } from 'lucide-react';
import { SafeTunesLogo } from '../shared/SafeTunesLogo';

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
function TopResultCard({ item, onTap, isApproved, isRequested }) {
  if (!item) return null;

  const isArtist = item.resultType === 'artist';
  const isAlbum = item.resultType === 'album';

  const artworkUrl = item.attributes?.artwork?.url
    ?.replace('{w}', '300')
    .replace('{h}', '300');

  // Only show artwork if approved (artists also hidden - to be consistent)
  const showArtwork = isApproved;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Top Result
      </h3>
      <button
        onClick={() => onTap(item)}
        className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border border-gray-200 hover:border-purple-300 transition-all hover:shadow-lg"
      >
        <div className="p-4 sm:p-5 flex items-center gap-4">
          {/* Artwork - only show if approved */}
          {showArtwork && artworkUrl ? (
            <img
              src={artworkUrl}
              alt={item.attributes?.name}
              className={`w-20 h-20 sm:w-24 sm:h-24 object-cover shadow-xl flex-shrink-0 ${
                isArtist ? 'rounded-full' : 'rounded-xl'
              }`}
            />
          ) : (
            /* Hidden artwork placeholder for unapproved items */
            <div className={`w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shadow-xl flex-shrink-0 bg-gradient-to-br from-gray-400 to-gray-500 ${
              isArtist ? 'rounded-full' : 'rounded-xl'
            }`}>
              <SafeTunesLogo className="w-10 h-10 sm:w-12 sm:h-12 text-white/70" />
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0 text-left">
            <h4 className="text-lg sm:text-xl font-bold text-gray-900 truncate group-hover:text-purple-700 transition">
              {item.attributes?.name}
            </h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                Tap to see albums
              </p>
            )}
          </div>

          {/* Status/Arrow */}
          {isApproved ? (
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-white" />
            </div>
          ) : isRequested ? (
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <ChevronRight className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      </button>
    </div>
  );
}

// Song Row Component
function SongRow({ song, onRequest, isApproved, isRequested, justRequested }) {
  const artworkUrl = song.attributes?.artwork?.url
    ?.replace('{w}', '100')
    .replace('{h}', '100');

  return (
    <div className="flex items-center gap-3 py-3 group">
      {/* Artwork - only show if approved */}
      <div className="relative flex-shrink-0">
        {isApproved && artworkUrl ? (
          <img
            src={artworkUrl}
            alt={song.attributes?.name}
            className="w-12 h-12 rounded-lg object-cover shadow-sm"
          />
        ) : (
          /* Hidden artwork placeholder for unapproved songs */
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-sm">
            <SafeTunesLogo className="w-6 h-6 text-white/70" />
          </div>
        )}
      </div>

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h5 className="font-semibold text-gray-900 truncate text-sm">
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
      </div>

      {/* Duration */}
      <span className="text-sm text-gray-400 flex-shrink-0 hidden sm:block">
        {formatDuration(song.attributes?.durationInMillis)}
      </span>

      {/* Request Button */}
      {isApproved ? (
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0" title="Already in your library">
          <Check className="w-5 h-5 text-green-600" />
        </div>
      ) : (isRequested || justRequested) ? (
        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0" title="Request pending">
          <Clock className="w-5 h-5 text-purple-600" />
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRequest?.(song);
          }}
          className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition flex-shrink-0"
          title="Request song"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      )}
    </div>
  );
}

// Album Card Component with expandable tracks
function AlbumCard({
  album,
  onRequest,
  isApproved,
  isRequested,
  justRequested,
  isExpanded,
  onToggleExpand,
  tracks,
  isLoadingTracks,
  isSongApproved,
  isSongRequested,
  onSongRequest,
  requestSuccess
}) {
  const artworkUrl = album.attributes?.artwork?.url
    ?.replace('{w}', '200')
    .replace('{h}', '200');

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Album Header */}
      <div className="flex items-center gap-3 p-4">
        {/* Artwork - only show if approved */}
        {isApproved && artworkUrl ? (
          <img
            src={artworkUrl}
            alt={album.attributes?.name}
            className="w-16 h-16 rounded-xl object-cover shadow-md flex-shrink-0"
          />
        ) : (
          /* Hidden artwork placeholder for unapproved albums */
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-md flex-shrink-0">
            <SafeTunesLogo className="w-8 h-8 text-white/70" />
          </div>
        )}

        {/* Album Info */}
        <div className="flex-1 min-w-0">
          <h5 className="font-bold text-gray-900 truncate">
            {album.attributes?.name}
          </h5>
          <p className="text-sm text-gray-500 truncate">
            {album.attributes?.artistName}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {album.attributes?.trackCount} songs
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Expand/Collapse */}
          <button
            onClick={() => onToggleExpand(album.id)}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
            title={isExpanded ? "Hide tracks" : "Show tracks"}
          >
            <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Request Button */}
          {isApproved ? (
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center" title="Already in your library">
              <Check className="w-5 h-5 text-green-600" />
            </div>
          ) : (isRequested || justRequested) ? (
            <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center" title="Request pending">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
          ) : (
            <button
              onClick={() => onRequest?.(album)}
              className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition"
              title="Request album"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Tracks */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          {isLoadingTracks ? (
            <div className="flex items-center justify-center py-6 gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
              <span className="text-sm text-gray-500">Loading tracks...</span>
            </div>
          ) : tracks && tracks.length > 0 ? (
            <div className="p-3 space-y-1">
              {tracks.map((track, index) => {
                const trackApproved = isSongApproved?.(track.id);
                const trackRequested = isSongRequested?.(track.id);
                const trackJustRequested = requestSuccess === String(track.id);

                return (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 py-2 px-2 hover:bg-white rounded-lg transition"
                  >
                    <span className="text-xs text-gray-400 w-6 text-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{track.attributes?.name}</p>
                      {track.attributes?.contentRating === 'explicit' && (
                        <span className="inline-block px-1 py-0.5 bg-gray-200 text-gray-600 rounded text-[9px] font-bold mt-0.5">
                          E
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {formatDuration(track.attributes?.durationInMillis)}
                    </span>
                    {trackApproved ? (
                      <div className="w-7 h-7 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (trackRequested || trackJustRequested) ? (
                      <div className="w-7 h-7 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                    ) : (
                      <button
                        onClick={() => onSongRequest?.(track, album.attributes?.name)}
                        className="w-7 h-7 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center transition flex-shrink-0"
                        title="Request this song"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-gray-500">
              No tracks available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Artist Card Component - artwork always hidden (until they tap and see their approved albums)
function ArtistCard({ artist, onTap }) {
  return (
    <button
      onClick={() => onTap(artist)}
      className="flex-shrink-0 w-28 sm:w-32 group text-center"
    >
      {/* Hidden artwork placeholder - artist photos hidden until approved */}
      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center shadow-md group-hover:shadow-xl transition-shadow mx-auto">
        <SafeTunesLogo className="w-10 h-10 sm:w-12 sm:h-12 text-white/70" />
      </div>
      <h5 className="mt-2 font-semibold text-gray-900 text-sm truncate group-hover:text-purple-700 transition">
        {artist.attributes?.name}
      </h5>
      <p className="text-xs text-gray-500">Artist</p>
    </button>
  );
}

// Main KidSearchResults Component
export default function KidSearchResults({
  results,
  searchQuery,
  onClear,
  // Album/song request handlers
  onAlbumRequest,
  onSongRequest,
  // Status checkers
  isAlbumApproved,
  isAlbumRequested,
  isSongApproved,
  isSongRequested,
  requestSuccess,
  // Album expansion
  expandedAlbums,
  onToggleAlbumExpansion,
  loadingAlbumTracks,
  // Artist drill-down
  onArtistTap
}) {
  const [activeFilter, setActiveFilter] = useState('all');

  // Categorize results
  const { songs, albums, artists, topResult, counts } = useMemo(() => {
    // Filter explicit content
    const filteredResults = results.filter(
      item => !item.attributes?.contentRating || item.attributes?.contentRating !== 'explicit'
    );

    const songs = filteredResults.filter(r => r.resultType === 'song' || r.itemType === 'song');
    const albums = filteredResults.filter(r => r.resultType === 'album' || r.itemType === 'album');
    const artists = filteredResults.filter(r => r.resultType === 'artist');
    const topResult = findTopResult(filteredResults, searchQuery);

    return {
      songs,
      albums,
      artists,
      topResult,
      counts: {
        all: filteredResults.length,
        songs: songs.length,
        albums: albums.length,
        artists: artists.length
      }
    };
  }, [results, searchQuery]);

  const showAllView = activeFilter === 'all';
  const showSongsOnly = activeFilter === 'songs';
  const showAlbumsOnly = activeFilter === 'albums';
  const showArtistsOnly = activeFilter === 'artists';

  if (!results?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Search Results
          <span className="ml-2 text-sm text-gray-500 font-normal">
            ({activeFilter === 'all' ? counts.all : counts[activeFilter]})
          </span>
        </h3>
        <button
          onClick={onClear}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          Clear
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveFilter('all')}
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
            onClick={() => setActiveFilter('songs')}
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
            onClick={() => setActiveFilter('albums')}
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
            onClick={() => setActiveFilter('artists')}
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

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* === ALL VIEW === */}
        {showAllView && (
          <>
            {/* Top Result */}
            {topResult && (
              <TopResultCard
                item={topResult}
                onTap={(item) => {
                  if (item.resultType === 'artist') {
                    onArtistTap?.(item);
                  } else if (item.resultType === 'album' || item.itemType === 'album') {
                    onToggleAlbumExpansion?.(item.id);
                  } else {
                    onSongRequest?.(item);
                  }
                }}
                isApproved={
                  topResult.resultType === 'album' || topResult.itemType === 'album'
                    ? isAlbumApproved?.(topResult.id)
                    : isSongApproved?.(topResult.id)
                }
                isRequested={
                  topResult.resultType === 'album' || topResult.itemType === 'album'
                    ? isAlbumRequested?.(topResult.id)
                    : isSongRequested?.(topResult.id)
                }
              />
            )}

            {/* Songs Section */}
            {songs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Songs
                  </h3>
                  {songs.length > 4 && (
                    <button
                      onClick={() => setActiveFilter('songs')}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      See all
                    </button>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl px-4 divide-y divide-gray-200">
                  {songs.slice(0, 4).map((song) => (
                    <SongRow
                      key={`song-${song.id}`}
                      song={song}
                      onRequest={onSongRequest}
                      isApproved={isSongApproved?.(song.id)}
                      isRequested={isSongRequested?.(song.id)}
                      justRequested={requestSuccess === String(song.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Albums Section */}
            {albums.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Albums
                  </h3>
                  {albums.length > 3 && (
                    <button
                      onClick={() => setActiveFilter('albums')}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      See all
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {albums.slice(0, 3).map((album) => (
                    <AlbumCard
                      key={`album-${album.id}`}
                      album={album}
                      onRequest={onAlbumRequest}
                      isApproved={isAlbumApproved?.(album.id)}
                      isRequested={isAlbumRequested?.(album.id)}
                      justRequested={requestSuccess === String(album.id)}
                      isExpanded={!!expandedAlbums?.[album.id]}
                      onToggleExpand={onToggleAlbumExpansion}
                      tracks={Array.isArray(expandedAlbums?.[album.id]) ? expandedAlbums[album.id] : []}
                      isLoadingTracks={loadingAlbumTracks?.[album.id]}
                      isSongApproved={isSongApproved}
                      isSongRequested={isSongRequested}
                      onSongRequest={onSongRequest}
                      requestSuccess={requestSuccess}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Artists Section */}
            {artists.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Artists
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                  {artists.slice(0, 6).map((artist) => (
                    <ArtistCard
                      key={`artist-${artist.id}`}
                      artist={artist}
                      onTap={onArtistTap}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* === SONGS ONLY VIEW === */}
        {showSongsOnly && (
          <div className="bg-gray-50 rounded-xl px-4 divide-y divide-gray-200">
            {songs.map((song) => (
              <SongRow
                key={`song-${song.id}`}
                song={song}
                onRequest={onSongRequest}
                isApproved={isSongApproved?.(song.id)}
                isRequested={isSongRequested?.(song.id)}
                justRequested={requestSuccess === String(song.id)}
              />
            ))}
          </div>
        )}

        {/* === ALBUMS ONLY VIEW === */}
        {showAlbumsOnly && (
          <div className="space-y-3">
            {albums.map((album) => (
              <AlbumCard
                key={`album-${album.id}`}
                album={album}
                onRequest={onAlbumRequest}
                isApproved={isAlbumApproved?.(album.id)}
                isRequested={isAlbumRequested?.(album.id)}
                justRequested={requestSuccess === String(album.id)}
                isExpanded={!!expandedAlbums?.[album.id]}
                onToggleExpand={onToggleAlbumExpansion}
                tracks={Array.isArray(expandedAlbums?.[album.id]) ? expandedAlbums[album.id] : []}
                isLoadingTracks={loadingAlbumTracks?.[album.id]}
                isSongApproved={isSongApproved}
                isSongRequested={isSongRequested}
                onSongRequest={onSongRequest}
                requestSuccess={requestSuccess}
              />
            ))}
          </div>
        )}

        {/* === ARTISTS ONLY VIEW === */}
        {showArtistsOnly && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {artists.map((artist) => (
              <ArtistCard
                key={`artist-${artist.id}`}
                artist={artist}
                onTap={onArtistTap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
