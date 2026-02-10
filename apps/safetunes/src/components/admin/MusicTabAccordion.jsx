/**
 * MusicTabAccordion - Profile-Based Music Management
 *
 * Design: Parent selects ONE child to manage at a time.
 * All views are filtered to that child's content.
 * No per-kid toggles - simple Preview/Visibility/Remove actions.
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';
import musicKitService from '../../config/musickit';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getAvatarIcon = (avatarId) => {
  const icon = AVATAR_ICONS.find(a => a.id === avatarId);
  return icon ? icon.svg : AVATAR_ICONS[0].svg;
};

const getColorClass = (colorId) => {
  const color = COLORS.find(c => c.id === colorId);
  return color ? color.class : COLORS[0].class;
};

// SafeTunes Shield Logo SVG (for hidden artwork placeholders)
const SafeTunesLogo = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 88.994 96.651">
    <path d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"/>
  </svg>
);

// ============================================
// KID SELECTOR - Sticky header to choose which kid to manage
// ============================================
export function KidSelector({ kidProfiles, selectedKidId, onSelectKid }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedKid = kidProfiles.find(k => k._id === selectedKidId);

  if (!kidProfiles || kidProfiles.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium">Managing:</span>
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-base transition-all ${
                selectedKid
                  ? 'bg-purple-600 text-white shadow-md hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {selectedKid ? (
                <>
                  {/* Small colored dot for kid's assigned color */}
                  <div className={`w-3 h-3 rounded-full ${getColorClass(selectedKid.color)} ring-2 ring-white/50`} />
                  <span>{selectedKid.name}</span>
                </>
              ) : (
                <span>Select a child</span>
              )}
              <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
                  {kidProfiles.map((kid) => (
                    <button
                      key={kid._id}
                      onClick={() => {
                        onSelectKid(kid._id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                        kid._id === selectedKidId ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full ${getColorClass(kid.color)} flex items-center justify-center p-2 shadow-sm`}>
                        {getAvatarIcon(kid.avatar)}
                      </div>
                      <span className="font-medium text-gray-900">{kid.name}</span>
                      {kid._id === selectedKidId && (
                        <svg className="w-5 h-5 text-purple-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SIMPLE ROW - Clean row with 3 action buttons
// ============================================
export function SimpleRow({
  title,
  subtitle,
  artworkUrl,
  hideArtwork = false,
  onPreview,
  onToggleArtwork,
  onRemove,
  isPlaying = false,
  showArtworkToggle = true,
}) {
  return (
    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
      {/* Artwork (48px) - circular for consistency */}
      <div className="flex-shrink-0">
        {hideArtwork ? (
          <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center shadow-sm">
            <SafeTunesLogo className="w-7 h-7 text-white/70" />
          </div>
        ) : artworkUrl ? (
          <img
            src={artworkUrl.replace('{w}', '96').replace('{h}', '96')}
            alt={title}
            className="w-12 h-12 rounded-full object-cover shadow-sm"
          />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}
      </div>

      {/* Title & Subtitle */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{title}</p>
        <p className="text-sm text-gray-500 truncate">{subtitle}</p>
      </div>

      {/* Action Buttons - Large & Clear */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Preview Button */}
        <button
          onClick={onPreview}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
          }`}
          title="Preview"
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Visibility Toggle */}
        {showArtworkToggle && (
          <button
            onClick={onToggleArtwork}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              hideArtwork
                ? 'bg-amber-100 text-amber-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={hideArtwork ? 'Show Artwork' : 'Hide Artwork'}
          >
            {hideArtwork ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}

        {/* Remove Button - Red tinted */}
        <button
          onClick={onRemove}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all"
          title="Remove"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================
// COLLAPSIBLE SECTION - Tap header to expand/collapse
// ============================================
export function CollapsibleSection({
  label,
  count,
  color = 'purple',
  children,
  defaultExpanded = false,
  emptyMessage = 'No items'
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const colorClasses = {
    purple: 'bg-purple-600 hover:bg-purple-700',
    pink: 'bg-pink-600 hover:bg-pink-700',
    green: 'bg-green-600 hover:bg-green-700',
  };

  const isEmpty = count === 0;

  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200">
      {/* Clickable Header */}
      <button
        onClick={() => !isEmpty && setIsExpanded(!isExpanded)}
        className={`w-full ${colorClasses[color]} px-4 py-4 flex items-center justify-between transition-colors ${
          isEmpty ? 'opacity-60 cursor-default' : 'cursor-pointer'
        }`}
        disabled={isEmpty}
      >
        <h2 className="text-white font-semibold text-base flex items-center gap-2">
          {label}
          <span className="text-white/70 font-normal">({count})</span>
        </h2>
        {!isEmpty && (
          <svg
            className={`w-5 h-5 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Expandable Content */}
      {isExpanded && !isEmpty && (
        <div className="bg-white divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {children}
        </div>
      )}

      {/* Empty State (always visible) */}
      {isEmpty && (
        <div className="bg-white p-6 text-center">
          <p className="text-gray-400 text-sm">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// SECTION HEADER - Simple label for sections (deprecated, use CollapsibleSection)
// ============================================
export function SectionHeader({ label, count, color = 'purple' }) {
  const colorClasses = {
    purple: 'bg-purple-600',
    pink: 'bg-pink-600',
    green: 'bg-green-600',
  };

  return (
    <div className={`${colorClasses[color]} px-4 py-3 rounded-t-xl`}>
      <h2 className="text-white font-semibold text-base">
        {label}
        {count !== undefined && (
          <span className="ml-2 text-white/70 font-normal">({count})</span>
        )}
      </h2>
    </div>
  );
}

// ============================================
// SIMPLE LIST CONTAINER
// ============================================
export function SimpleList({ children, hasHeader = true }) {
  return (
    <div className={`bg-white shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden ${
      hasHeader ? 'rounded-b-xl border-t-0' : 'rounded-xl'
    }`}>
      {children}
    </div>
  );
}

// ============================================
// LIBRARY SONGS LIST - For selected kid (Collapsible)
// ============================================
export function LibrarySongsList({
  songs,
  selectedKidId,
  user,
  onRemoveSong,
  onToggleArtwork,
  showSuccess,
}) {
  const [playingId, setPlayingId] = useState(null);

  const handlePreview = useCallback(async (song) => {
    if (playingId === song.appleSongId) {
      musicKitService.stop();
      setPlayingId(null);
    } else {
      try {
        setPlayingId(song.appleSongId);
        await musicKitService.playSong(song.appleSongId);
      } catch (error) {
        console.error('Preview failed:', error);
        setPlayingId(null);
      }
    }
  }, [playingId]);

  return (
    <CollapsibleSection
      label="Songs"
      count={songs?.length || 0}
      color="purple"
      emptyMessage="No songs yet - add music to this child's library"
    >
      {songs?.map((song) => (
        <SimpleRow
          key={song.appleSongId}
          title={song.songName}
          subtitle={`${song.artistName}${song.albumName ? ` • ${song.albumName}` : ''}`}
          artworkUrl={song.artworkUrl}
          hideArtwork={song.hideArtwork}
          isPlaying={playingId === song.appleSongId}
          onPreview={() => handlePreview(song)}
          onToggleArtwork={() => onToggleArtwork?.(song)}
          onRemove={() => onRemoveSong?.(song)}
        />
      ))}
    </CollapsibleSection>
  );
}

// ============================================
// LIBRARY ALBUMS LIST - For selected kid (Collapsible)
// ============================================
export function LibraryAlbumsList({
  albums,
  selectedKidId,
  user,
  onRemoveAlbum,
  onToggleArtwork,
  onAlbumClick,
  showSuccess,
}) {
  const [playingId, setPlayingId] = useState(null);

  const handlePreview = useCallback(async (album) => {
    // Play first song from album
    const firstSong = album.approvedSongs?.[0];
    if (!firstSong) return;

    if (playingId === album.appleAlbumId) {
      musicKitService.stop();
      setPlayingId(null);
    } else {
      try {
        setPlayingId(album.appleAlbumId);
        await musicKitService.playSong(firstSong.appleSongId);
      } catch (error) {
        console.error('Preview failed:', error);
        setPlayingId(null);
      }
    }
  }, [playingId]);

  return (
    <CollapsibleSection
      label="Albums"
      count={albums?.length || 0}
      color="purple"
      emptyMessage="No albums yet - search to add albums"
    >
      {albums?.map((album) => {
        const songCount = album.approvedSongs?.length || 0;
        return (
          <SimpleRow
            key={album.appleAlbumId || `${album.albumName}-${album.artistName}`}
            title={album.albumName}
            subtitle={`${album.artistName} • ${songCount} song${songCount !== 1 ? 's' : ''}`}
            artworkUrl={album.artworkUrl}
            hideArtwork={album.hideArtwork}
            isPlaying={playingId === album.appleAlbumId}
            onPreview={() => handlePreview(album)}
            onToggleArtwork={() => onToggleArtwork?.(album)}
            onRemove={() => onRemoveAlbum?.(album)}
          />
        );
      })}
    </CollapsibleSection>
  );
}

// ============================================
// DISCOVER LIST - Matches Library tab design style
// ============================================
export function DiscoverList({
  albums = [],
  playlists = [],
  selectedKid,
  user,
  onRemoveFromDiscover,
  onRemovePlaylistFromDiscover,
  onEditAlbum,
  onEditPlaylist,
  showSuccess,
  localHideArtwork = {},
  onToggleArtwork,
  searchQuery = '',
}) {
  // Auto-expand sections when searching
  const isSearching = searchQuery.trim().length > 0;

  // Section expansion state - when searching, sections are forced open
  // When not searching, user can toggle them manually
  const [artistsSectionManualState, setArtistsSectionManualState] = useState(false);
  const [albumsSectionManualState, setAlbumsSectionManualState] = useState(false);
  const [playlistsSectionManualState, setPlaylistsSectionManualState] = useState(false);
  // Expanded artist state (for inline accordion like Library tab)
  const [expandedArtist, setExpandedArtist] = useState(null);

  // When searching, force all sections open; otherwise use manual state
  const artistsSectionExpanded = isSearching || artistsSectionManualState;
  const albumsSectionExpanded = isSearching || albumsSectionManualState;
  const playlistsSectionExpanded = isSearching || playlistsSectionManualState;

  // Toggle handlers that only work when not searching
  const setArtistsSectionExpanded = (val) => !isSearching && setArtistsSectionManualState(val);
  const setAlbumsSectionExpanded = (val) => !isSearching && setAlbumsSectionManualState(val);
  const setPlaylistsSectionExpanded = (val) => !isSearching && setPlaylistsSectionManualState(val);

  // Derive unique artists from albums
  const artistsMap = new Map();
  albums.forEach(album => {
    const artistName = album.artistName || 'Unknown Artist';
    if (!artistsMap.has(artistName)) {
      artistsMap.set(artistName, {
        name: artistName,
        albums: [],
        artworkUrl: album.artworkUrl, // Use first album's artwork
      });
    }
    artistsMap.get(artistName).albums.push(album);
  });
  const artists = Array.from(artistsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const totalItems = (albums?.length || 0) + (playlists?.length || 0);

  if (totalItems === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-pink-300 mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <p className="text-gray-500 font-medium">Discover Pool is Empty</p>
          <p className="text-gray-400 text-sm mt-1">
            Add albums or playlists here for {selectedKid?.name || 'your kids'} to explore
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Artists Section */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <button
          onClick={() => setArtistsSectionExpanded(!artistsSectionExpanded)}
          className="w-full p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900">Artists</h3>
              <p className="text-sm text-gray-500">{artists.length} artists</p>
            </div>
          </div>
          <svg
            className={`w-6 h-6 text-gray-500 transition-transform ${artistsSectionExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {artistsSectionExpanded && (
          <>
            {artists.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="font-medium">No artists in Discover pool yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {artists.map((artist) => {
                  const artworkUrl = artist.artworkUrl?.replace('{w}', '100').replace('{h}', '100');
                  const isExpanded = expandedArtist === artist.name;
                  return (
                    <div key={artist.name}>
                      {/* Artist Row - Click to expand/collapse */}
                      <button
                        onClick={() => setExpandedArtist(isExpanded ? null : artist.name)}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left ${isExpanded ? 'bg-purple-50' : ''}`}
                      >
                        {/* Artist Avatar - Round like Library */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {artworkUrl ? (
                            <img src={artworkUrl} alt={artist.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-white font-bold text-lg">
                              {artist.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        {/* Artist Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{artist.name}</p>
                          <p className="text-sm text-gray-500">{artist.albums.length} album{artist.albums.length !== 1 ? 's' : ''}</p>
                        </div>
                        {/* Chevron - rotates when expanded */}
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Expanded Albums Grid - inline below artist */}
                      {isExpanded && (
                        <div className="bg-purple-50/50 p-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {artist.albums.map((album) => {
                              const albumId = album.appleAlbumId || `${album.albumName}-${album.artistName}`;
                              const isHidden = localHideArtwork[albumId] ?? album.hideArtwork ?? false;
                              return (
                                <div
                                  key={album._id || album.appleAlbumId}
                                  className="group cursor-pointer"
                                  onClick={() => onEditAlbum?.(album)}
                                >
                                  {/* Album Artwork - Square */}
                                  <div className="relative aspect-square mb-2">
                                    {isHidden ? (
                                      <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center shadow-sm">
                                        <SafeTunesLogo className="w-10 h-10 text-white/70" />
                                      </div>
                                    ) : album.artworkUrl ? (
                                      <img
                                        src={album.artworkUrl.replace('{w}', '200').replace('{h}', '200')}
                                        alt={album.albumName}
                                        className="w-full h-full object-cover rounded-lg shadow-sm"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg flex items-center justify-center shadow-sm">
                                        <svg className="w-10 h-10 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                        </svg>
                                      </div>
                                    )}
                                    {/* Quick action buttons */}
                                    <div className="absolute top-1 right-1 flex gap-1">
                                      {onToggleArtwork && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onToggleArtwork(e, album);
                                          }}
                                          className={`p-1.5 rounded-full shadow-md transition ${
                                            isHidden ? 'bg-green-500 text-white' : 'bg-white/90 text-gray-600'
                                          }`}
                                          title={isHidden ? 'Show artwork' : 'Hide artwork'}
                                        >
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            {isHidden ? (
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            ) : (
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            )}
                                          </svg>
                                        </button>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          if (onRemoveFromDiscover) {
                                            onRemoveFromDiscover(album);
                                          }
                                        }}
                                        className="p-1.5 rounded-full bg-white/90 text-red-500 shadow-md transition hover:bg-red-100 hover:text-red-600 active:scale-95"
                                        title="Remove from Discover"
                                      >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  {/* Album Info */}
                                  <p className="font-medium text-sm text-gray-900 truncate">{album.albumName}</p>
                                  <p className="text-xs text-gray-500 truncate">{album.approvedSongs?.length || '?'} songs</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Albums Section - Shows all albums */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <button
          onClick={() => setAlbumsSectionExpanded(!albumsSectionExpanded)}
          className="w-full p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900">Albums</h3>
              <p className="text-sm text-gray-500">{albums?.length || 0} albums</p>
            </div>
          </div>
          <svg
            className={`w-6 h-6 text-gray-500 transition-transform ${albumsSectionExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {albumsSectionExpanded && (
          <>
            {albums?.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="font-medium">No albums in Discover pool yet</p>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {albums.map((album) => {
                  const albumId = album.appleAlbumId || `${album.albumName}-${album.artistName}`;
                  const isHidden = localHideArtwork[albumId] ?? album.hideArtwork ?? false;

                  return (
                    <div
                      key={album._id || album.appleAlbumId}
                      className="group cursor-pointer"
                      onClick={() => onEditAlbum?.(album)}
                    >
                      {/* Album Artwork */}
                      <div className="relative aspect-square mb-2">
                        {isHidden ? (
                          <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-md">
                            <SafeTunesLogo className="w-12 h-12 text-white/70" />
                          </div>
                        ) : album.artworkUrl ? (
                          <img
                            src={album.artworkUrl.replace('{w}', '300').replace('{h}', '300')}
                            alt={album.albumName}
                            className="w-full h-full object-cover rounded-xl shadow-md group-hover:shadow-lg transition-shadow"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center shadow-md">
                            <svg className="w-12 h-12 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          </div>
                        )}

                        {/* Quick action buttons - always visible */}
                        <div className="absolute top-1 right-1 flex gap-1">
                          {onToggleArtwork && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleArtwork(e, album);
                              }}
                              className={`p-1.5 rounded-full shadow-md transition ${
                                isHidden
                                  ? 'bg-green-500 text-white'
                                  : 'bg-white/90 text-gray-600'
                              }`}
                              title={isHidden ? 'Show artwork' : 'Hide artwork'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isHidden ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                )}
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (onRemoveFromDiscover) {
                                onRemoveFromDiscover(album);
                              }
                            }}
                            className="p-1.5 rounded-full bg-white/90 text-red-500 shadow-md transition hover:bg-red-100 hover:text-red-600 active:scale-95"
                            title="Remove from Discover"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {/* Album Info */}
                      <p className="font-medium text-sm text-gray-900 truncate">{album.albumName}</p>
                      <p className="text-xs text-gray-500 truncate">{album.artistName}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Playlists Section - Matches Library tab style */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <button
          onClick={() => setPlaylistsSectionExpanded(!playlistsSectionExpanded)}
          className="w-full p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900">Playlists</h3>
              <p className="text-sm text-gray-500">{playlists?.length || 0} playlists</p>
            </div>
          </div>
          <svg
            className={`w-6 h-6 text-gray-500 transition-transform ${playlistsSectionExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {playlistsSectionExpanded && (
          <>
            {playlists?.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <p className="font-medium">No playlists in Discover pool yet</p>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {playlists.map((playlist) => {
                  return (
                    <div
                      key={playlist._id || playlist.applePlaylistId}
                      className="group cursor-pointer"
                      onClick={() => onEditPlaylist?.(playlist)}
                    >
                      {/* Playlist Artwork */}
                      <div className="relative aspect-square mb-2">
                        {playlist.hideArtwork ? (
                          <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center shadow-md">
                            <SafeTunesLogo className="w-12 h-12 text-white/70" />
                          </div>
                        ) : playlist.artworkUrl ? (
                          <img
                            src={playlist.artworkUrl.replace('{w}', '300').replace('{h}', '300')}
                            alt={playlist.playlistName}
                            className="w-full h-full object-cover rounded-xl shadow-md group-hover:shadow-lg transition-shadow"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-md">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                          </div>
                        )}

                        {/* Quick action button - always visible */}
                        <div className="absolute top-1 right-1 flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemovePlaylistFromDiscover?.(playlist);
                            }}
                            className="p-1.5 rounded-full bg-white/90 text-red-500 shadow-md transition"
                            title="Remove from Discover"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      {/* Playlist Info */}
                      <p className="font-medium text-sm text-gray-900 truncate">{playlist.playlistName}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {playlist.curatorName || 'Apple Music'} • {playlist.trackCount || '?'} tracks
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// PLAYLISTS LIST - For selected kid (Collapsible with remove song)
// ============================================
export function PlaylistsList({
  playlists,
  selectedKid,
  user,
  onDeletePlaylist,
  onRenamePlaylist,
  onAddSongs,
  onRemoveSongFromPlaylist,
  showSuccess,
}) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <CollapsibleSection
      label="Playlists"
      count={playlists?.length || 0}
      color="green"
      emptyMessage={`${selectedKid?.name || 'This child'} can create playlists in their player`}
    >
      {playlists?.map((playlist) => {
        const isExpanded = expandedId === playlist._id;
        const firstSongArt = playlist.songs?.find(s => s.artworkUrl)?.artworkUrl;

        return (
          <div key={playlist._id} className="border-b border-gray-100 last:border-b-0">
            {/* Playlist Row */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : playlist._id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
            >
              {/* Artwork */}
              {firstSongArt ? (
                <img
                  src={firstSongArt.replace('{w}', '96').replace('{h}', '96')}
                  alt={playlist.name}
                  className="w-12 h-12 rounded-lg object-cover shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{playlist.name}</p>
                <p className="text-sm text-gray-500">{playlist.songs?.length || 0} songs</p>
              </div>

              {/* Chevron */}
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="bg-green-50 border-t border-green-100">
                {/* Actions */}
                <div className="px-4 py-3 flex items-center gap-2 border-b border-green-100">
                  <button
                    onClick={() => onAddSongs?.(playlist)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Songs
                  </button>
                  <button
                    onClick={() => {
                      const newName = prompt('Enter new playlist name:', playlist.name);
                      if (newName && newName.trim() && newName !== playlist.name) {
                        onRenamePlaylist?.(playlist._id, newName.trim());
                      }
                    }}
                    className="p-2.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg transition-colors border border-gray-200"
                    title="Rename"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${playlist.name}"?`)) {
                        onDeletePlaylist?.(playlist);
                      }
                    }}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    title="Delete Playlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Songs with remove button */}
                {playlist.songs && playlist.songs.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    {playlist.songs.map((song, index) => (
                      <div key={song.appleSongId} className="flex items-center gap-3 px-4 py-2 hover:bg-green-100/50 group">
                        <span className="text-xs text-gray-400 w-5 text-right">{index + 1}</span>
                        {song.artworkUrl ? (
                          <img
                            src={song.artworkUrl.replace('{w}', '40').replace('{h}', '40')}
                            alt={song.songName}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-green-200 rounded flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{song.songName}</p>
                          <p className="text-xs text-gray-500 truncate">{song.artistName}</p>
                        </div>
                        {/* Remove song button */}
                        <button
                          onClick={() => onRemoveSongFromPlaylist?.(playlist._id, song.appleSongId)}
                          className="w-7 h-7 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                          title="Remove from playlist"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-gray-500">No songs yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </CollapsibleSection>
  );
}

// ============================================
// LIBRARY ARTISTS LIST - For selected kid (Collapsible)
// ============================================
export function LibraryArtistsList({
  artists, // Array of { name, albums: [...], songCount }
  selectedKidId,
  user,
  onArtistClick,
  showSuccess,
}) {
  return (
    <CollapsibleSection
      label="Artists"
      count={artists?.length || 0}
      color="purple"
      emptyMessage="No artists yet - add music to build your library"
    >
      {artists?.map((artist) => {
        // Get first album artwork as artist avatar
        const firstAlbumArt = artist.albums?.find(a => a.artworkUrl && !a.hideArtwork)?.artworkUrl;
        const totalSongs = artist.albums?.reduce((sum, a) => sum + (a.approvedSongs?.length || 0), 0) || 0;

        return (
          <button
            key={artist.name}
            onClick={() => onArtistClick?.(artist)}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
          >
            {/* Artist Avatar */}
            {firstAlbumArt ? (
              <img
                src={firstAlbumArt.replace('{w}', '96').replace('{h}', '96')}
                alt={artist.name}
                className="w-12 h-12 rounded-full object-cover shadow-sm flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white font-bold text-lg">
                  {artist.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{artist.name}</p>
              <p className="text-sm text-gray-500">
                {artist.albums?.length || 0} album{(artist.albums?.length || 0) !== 1 ? 's' : ''} • {totalSongs} song{totalSongs !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Chevron */}
            <svg
              className="w-5 h-5 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        );
      })}
    </CollapsibleSection>
  );
}

export default {
  KidSelector,
  SimpleRow,
  CollapsibleSection,
  SectionHeader,
  SimpleList,
  LibraryArtistsList,
  LibrarySongsList,
  LibraryAlbumsList,
  DiscoverList,
  PlaylistsList,
};
