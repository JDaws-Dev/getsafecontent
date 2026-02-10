import { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import musicKitService from '../../config/musickit';
import { useToast } from '../common/Toast';
import PlaylistInspector from './PlaylistInspector';

function PlaylistImport({ user }) {
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  const [isMusicKitReady, setIsMusicKitReady] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [libraryPlaylists, setLibraryPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [activeTab, setActiveTab] = useState('library'); // 'library' or 'catalog'

  // Show the new PlaylistInspector modal
  const [showInspector, setShowInspector] = useState(false);

  // Song selection state (kept for legacy but now handled in inspector)
  const [selectedSongs, setSelectedSongs] = useState(new Set());
  const [hideArtworkForSongs, setHideArtworkForSongs] = useState(new Set());

  // Playlist configuration (no longer needed as form inputs - handled in AssignmentSheet)
  const [selectedKidForPlaylist, setSelectedKidForPlaylist] = useState(null);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [importing, setImporting] = useState(false);

  // Fetch kid profiles
  const kidProfiles = useQuery(api.kidProfiles.getKidProfiles, user ? { userId: user._id } : 'skip') || [];

  // Debug logging
  useEffect(() => {
    console.log('PlaylistImport - user:', user);
    console.log('PlaylistImport - user._id:', user?._id);
    console.log('PlaylistImport - kidProfiles:', kidProfiles);
  }, [user, kidProfiles]);

  // Mutations
  const approveSong = useMutation(api.songs.approveSong);
  const createPlaylist = useMutation(api.playlists.createPlaylist);
  const addSongsToPlaylist = useMutation(api.playlists.addSongsToPlaylist);
  const addPlaylistToDiscover = useMutation(api.featuredPlaylists.addPlaylistToDiscover);
  const ensureAlbumRecord = useMutation(api.albums.ensureAlbumRecord);

  useEffect(() => {
    checkMusicKit();
  }, []);

  const checkMusicKit = async () => {
    try {
      await musicKitService.initialize();
      setIsMusicKitReady(true);
      // Check if already authorized
      if (musicKitService.music?.isAuthorized) {
        setIsAuthorized(true);
        loadLibraryPlaylists();
      }
    } catch (err) {
      console.error('MusicKit not ready:', err);
    }
  };

  const handleAuthorize = async () => {
    try {
      setLoading(true);
      await musicKitService.music.authorize();
      setIsAuthorized(true);
      await loadLibraryPlaylists();
    } catch (err) {
      console.error('Authorization failed:', err);
      showToast('Failed to connect to Apple Music. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLibraryPlaylists = async () => {
    try {
      setLoading(true);
      // Fetch user's library playlists
      const result = await musicKitService.music.api.music('/v1/me/library/playlists', {
        limit: 100
      });

      console.log('Library playlists:', result);

      if (result.data?.data) {
        setLibraryPlaylists(result.data.data);
      }
    } catch (err) {
      console.error('Failed to load library playlists:', err);
      showToast('Failed to load your playlists. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || !isMusicKitReady) return;

    setLoading(true);
    try {
      const results = await musicKitService.search(searchQuery, {
        types: 'playlists',
        limit: 25
      });

      console.log('Playlist search results:', results);
      console.log('Results structure:', {
        hasData: !!results?.data,
        hasPlaylists: !!results?.data?.playlists,
        hasPlaylistsData: !!results?.data?.playlists?.data,
        // Try both possible structures
        resultsData: results?.data,
        resultsDataKeys: results?.data ? Object.keys(results.data) : []
      });

      // MusicKit wraps the API response in results.data
      // The actual playlists are in results.data.results.playlists.data
      let playlistsData = null;

      if (results?.data?.results?.playlists?.data) {
        playlistsData = results.data.results.playlists.data;
      } else if (results?.data?.playlists?.data) {
        playlistsData = results.data.playlists.data;
      }

      if (playlistsData && playlistsData.length > 0) {
        console.log('Setting search results:', playlistsData.length, 'playlists');
        setSearchResults(playlistsData);
      } else {
        console.log('No playlists found in results. Full data structure:', JSON.stringify(results?.data, null, 2));
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      showToast('Failed to search for playlists. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlaylist = async (playlist, isLibraryPlaylist = false) => {
    setLoading(true);
    setSelectedPlaylist(playlist);
    setPlaylistName(playlist.attributes.name);
    setPlaylistDescription(playlist.attributes.description?.standard || '');

    try {
      // Use different endpoint for library vs catalog playlists
      // Include albums relationship to get proper album IDs for each track
      const endpoint = isLibraryPlaylist
        ? `/v1/me/library/playlists/${playlist.id}/tracks`
        : `/v1/catalog/us/playlists/${playlist.id}/tracks`;

      const result = await musicKitService.music.api.music(endpoint, {
        limit: 100,
        include: 'albums' // Request album relationship data
      });

      console.log('Playlist tracks result:', result);

      if (result.data?.data && result.data.data.length > 0) {
        const tracks = result.data.data.map((track, index) => {
          // Library tracks have a different structure - need to get catalog info
          // catalogId is for playing/approving, but we use a unique ID for selection
          const catalogId = track.attributes?.playParams?.catalogId || track.attributes?.playParams?.id || track.id;
          const uniqueId = `${catalogId}-${index}`; // Ensure unique keys even if catalogId is same

          // Extract album ID - check relationships first, then try to extract from URL
          // Note: playParams.catalogId is the SONG id, not album id!
          let albumId = track.relationships?.albums?.data?.[0]?.id;

          // If no album relationship, try to extract from the song's URL if available
          // Apple Music URLs are like: /v1/catalog/us/songs/123?include=albums -> album in relationships
          // Or we can use the artwork URL pattern which often contains album info
          if (!albumId && track.attributes?.url) {
            // URL format: https://music.apple.com/us/album/song-name/ALBUM_ID?i=SONG_ID
            const urlMatch = track.attributes.url.match(/\/album\/[^/]+\/(\d+)/);
            if (urlMatch) {
              albumId = urlMatch[1];
            }
          }

          // Library album IDs start with "l." - these are user-specific and can't be fetched via catalog API
          // We'll resolve these later using the song's catalog ID
          const isLibraryAlbumId = albumId && albumId.startsWith('l.');

          return {
            id: catalogId,
            uniqueKey: uniqueId,
            name: track.attributes?.name || 'Unknown Track',
            artistName: track.attributes?.artistName || 'Unknown Artist',
            albumName: track.attributes?.albumName || 'Unknown Album',
            albumId: isLibraryAlbumId ? null : albumId, // Don't use library IDs - they cause 404s
            catalogSongId: catalogId, // Store for album resolution
            needsAlbumResolution: isLibraryAlbumId, // Flag tracks that need album lookup via song
            artworkUrl: track.attributes?.artwork?.url,
            durationInMillis: track.attributes?.durationInMillis,
            isExplicit: track.attributes?.contentRating === 'explicit',
            previewUrl: track.attributes?.previews?.[0]?.url
          };
        });

        console.log('Loaded tracks:', tracks.length, 'tracks');
        console.log('Sample track:', tracks[0]);
        console.log('Track IDs for selection:', tracks.map(t => t.id));

        setPlaylistTracks(tracks);
        // Select all songs by default using the track IDs
        const trackIds = new Set(tracks.map(t => t.id));
        console.log('Setting selectedSongs to:', trackIds);
        setSelectedSongs(trackIds);

        // Open the new PlaylistInspector modal
        setShowInspector(true);
      } else {
        console.log('No tracks found in playlist');
        setPlaylistTracks([]);
        setSelectedSongs(new Set());
        showToast('No tracks found in this playlist.', 'warning');
      }
    } catch (err) {
      console.error('Failed to load playlist tracks:', err);
      showToast('Failed to load playlist tracks. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleSongSelection = (songId) => {
    setSelectedSongs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  };

  const toggleArtwork = (songId) => {
    setHideArtworkForSongs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  };

  const toggleAllSongs = () => {
    if (selectedSongs.size === playlistTracks.length) {
      setSelectedSongs(new Set());
    } else {
      setSelectedSongs(new Set(playlistTracks.map(t => t.id)));
    }
  };

  const handleImport = async () => {
    if (!playlistName.trim()) {
      showToast('Please enter a playlist name', 'warning');
      return;
    }

    if (!selectedKidForPlaylist) {
      showToast('Please select a kid profile for this playlist', 'warning');
      return;
    }

    if (selectedSongs.size === 0) {
      showToast('Please select at least one song to import', 'warning');
      return;
    }

    setImporting(true);

    try {
      const selectedTracks = playlistTracks.filter(t => selectedSongs.has(t.id));

      console.log(`Importing ${selectedTracks.length} songs...`);

      // =========================================================================
      // STEP 0: Ensure full album records exist for all unique albums
      // =========================================================================
      const uniqueAlbumIds = [...new Set(selectedTracks.map(t => t.albumId).filter(Boolean))];
      console.log(`[handleImport] Found ${uniqueAlbumIds.length} unique albums to ensure records for`);

      // Cache for album details - stores full album data including tracks
      const albumCache = new Map();

      for (const albumId of uniqueAlbumIds) {
        try {
          // Note: Some albums return 404 if removed from Apple Music or region-restricted
          let albumDetails;
          try {
            albumDetails = await musicKitService.getAlbum(albumId);
          } catch (fetchErr) {
            // Silently skip albums that can't be fetched (404, region-restricted, etc.)
            console.log(`[handleImport] Skipping album ${albumId} (not available)`);
            continue;
          }
          if (!albumDetails?.attributes) {
            console.log(`[handleImport] Could not fetch album ${albumId}`);
            continue;
          }

          const attr = albumDetails.attributes;

          // Fetch album tracks
          let albumTracks = [];
          try {
            const tracksResult = await musicKitService.music.api.music(
              `/v1/catalog/us/albums/${albumId}/tracks`,
              { limit: 100 }
            );
            if (tracksResult.data?.data) {
              albumTracks = tracksResult.data.data.map((track, index) => ({
                appleSongId: track.id,
                songName: track.attributes?.name || 'Unknown',
                artistName: track.attributes?.artistName || attr.artistName,
                trackNumber: track.attributes?.trackNumber || index + 1,
                durationInMillis: track.attributes?.durationInMillis,
                isExplicit: track.attributes?.contentRating === 'explicit',
              }));
            }
          } catch (trackErr) {
            console.error(`[handleImport] Failed to fetch tracks for album ${albumId}:`, trackErr);
          }

          // Store in cache
          albumCache.set(albumId, {
            album: albumDetails,
            tracks: albumTracks,
            genres: attr.genreNames || []
          });

          // Ensure album record exists with full track list
          await ensureAlbumRecord({
            userId: user._id,
            appleAlbumId: albumId,
            albumName: attr.name,
            artistName: attr.artistName,
            artworkUrl: attr.artwork?.url
              ? attr.artwork.url.replace('{w}', '400').replace('{h}', '400')
              : undefined,
            releaseYear: attr.releaseDate?.substring(0, 4),
            trackCount: albumTracks.length || attr.trackCount,
            genres: attr.genreNames || [],
            isExplicit: attr.contentRating === 'explicit',
            hideArtwork: hideArtworkForSongs.size > 0, // Use hideArtwork if any songs have it
            tracks: albumTracks.length > 0 ? albumTracks : undefined,
          });

          console.log(`[handleImport] Ensured album record: ${attr.name} (${albumTracks.length} tracks)`);
        } catch (albumErr) {
          console.error(`[handleImport] Failed to ensure album ${albumId}:`, albumErr);
        }
      }

      // Step 1: Approve all selected songs
      const approvedSongIds = [];
      const songsForPlaylist = [];

      for (const track of selectedTracks) {
        try {
          // Get genres from cache
          const cachedAlbum = track.albumId ? albumCache.get(track.albumId) : null;
          const genres = cachedAlbum?.genres || [];

          const songId = await approveSong({
            userId: user._id,
            kidProfileId: selectedKidForPlaylist, // Associate with specific kid
            appleSongId: track.id,
            songName: track.name,
            artistName: track.artistName,
            albumName: track.albumName,
            artworkUrl: track.artworkUrl
              ? track.artworkUrl.replace('{w}', '300').replace('{h}', '300')
              : undefined,
            hideArtwork: hideArtworkForSongs.has(track.id),
            durationInMillis: track.durationInMillis,
            isExplicit: track.isExplicit,
            previewUrl: track.previewUrl,
            genres: genres && genres.length > 0 ? genres : undefined,
            appleAlbumId: track.albumId, // Include album ID for linking
          });
          approvedSongIds.push(songId);

          // Build song object for playlist (matches the mutation's expected format)
          songsForPlaylist.push({
            appleSongId: track.id,
            songName: track.name,
            artistName: track.artistName,
            albumName: track.albumName,
            artworkUrl: track.artworkUrl
              ? track.artworkUrl.replace('{w}', '300').replace('{h}', '300')
              : undefined,
            durationInMillis: track.durationInMillis,
          });

          console.log(`✓ Approved: ${track.name}`);
        } catch (err) {
          console.error(`Failed to approve song: ${track.name}`, err);
        }
      }

      console.log(`Approved ${approvedSongIds.length} songs`);

      // Step 2: Create the playlist
      const playlistId = await createPlaylist({
        userId: user._id,
        kidProfileId: selectedKidForPlaylist,
        name: playlistName,
        description: playlistDescription,
      });

      console.log('✓ Created playlist:', playlistId);

      // Step 3: Add songs to playlist
      console.log('Adding songs to playlist. Data:', {
        playlistId,
        songsCount: songsForPlaylist.length,
        firstSong: songsForPlaylist[0],
      });

      await addSongsToPlaylist({
        playlistId: playlistId,
        songs: songsForPlaylist,
      });

      console.log('✓ Added songs to playlist');

      showToast(`Successfully imported ${approvedSongIds.length} songs into "${playlistName}"!`, 'success');

      // Reset state
      setSelectedPlaylist(null);
      setPlaylistTracks([]);
      setSelectedSongs(new Set());
      setHideArtworkForSongs(new Set());
      setPlaylistName('');
      setPlaylistDescription('');
      setSelectedKidForPlaylist(null);
      setSearchResults([]);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to import playlist:', err);
      showToast('Failed to import playlist. Please try again.', 'error');
    } finally {
      setImporting(false);
    }
  };

  // New handler for PlaylistInspector - called when user confirms song selection
  const handleAddSongsFromInspector = async ({ playlist, tracks, destination, kidIds, hideArtwork }) => {
    if (!tracks || tracks.length === 0 || !kidIds || kidIds.length === 0) {
      showToast('Please select songs and kids', 'warning');
      return;
    }

    setImporting(true);

    // Determine if this is for Discover or Library
    const isDiscover = destination === 'discover';
    const playlistName = playlist?.attributes?.name || 'playlist';
    console.log(`Importing ${tracks.length} songs to ${kidIds.length} kids, destination: ${destination}`);

    try {
      // ===========================================================================
      // STEP 0.5: Resolve album IDs for library tracks via song catalog lookup
      // Library playlists have library album IDs (l.xxx) that can't be fetched.
      // We resolve them by looking up each song's catalog entry.
      // ===========================================================================
      const tracksNeedingResolution = tracks.filter(t => t.needsAlbumResolution && t.catalogSongId);
      if (tracksNeedingResolution.length > 0) {
        console.log(`[PlaylistImport] Resolving album IDs for ${tracksNeedingResolution.length} library tracks...`);

        // Batch lookup songs to get their album relationships
        const songIds = [...new Set(tracksNeedingResolution.map(t => t.catalogSongId))];
        const batchSize = 25;

        for (let i = 0; i < songIds.length; i += batchSize) {
          const batch = songIds.slice(i, i + batchSize);
          try {
            const result = await musicKitService.music.api.music(
              `/v1/catalog/us/songs`,
              { ids: batch.join(','), include: 'albums' }
            );

            if (result.data?.data) {
              for (const song of result.data.data) {
                const catalogAlbumId = song.relationships?.albums?.data?.[0]?.id;
                if (catalogAlbumId) {
                  // Update all tracks with this song ID
                  tracks.forEach(t => {
                    if (t.catalogSongId === song.id && t.needsAlbumResolution) {
                      t.albumId = catalogAlbumId;
                      t.needsAlbumResolution = false;
                    }
                  });
                }
              }
            }
          } catch (err) {
            console.log(`[PlaylistImport] Failed to resolve batch of songs:`, err.message);
          }
        }

        console.log(`[PlaylistImport] Album resolution complete`);
      }

      // ===========================================================================
      // STEP 1: Ensure full album records exist for all unique albums in the import
      // This fetches full album data from Apple Music and stores it so album detail
      // views can show all tracks (not just the imported ones)
      // ===========================================================================
      const uniqueAlbumIds = [...new Set(tracks.map(t => t.albumId).filter(Boolean))];
      console.log(`[PlaylistImport] Found ${uniqueAlbumIds.length} unique albums to ensure records for`);

      // Process albums in batches to avoid overwhelming the API
      const albumCache = new Map(); // albumId -> { album, tracks }

      for (const albumId of uniqueAlbumIds) {
        try {
          // Fetch full album details from Apple Music
          // Note: Some albums return 404 if removed from Apple Music or region-restricted
          let albumDetails;
          try {
            albumDetails = await musicKitService.getAlbum(albumId);
          } catch (fetchErr) {
            // Silently skip albums that can't be fetched (404, region-restricted, etc.)
            // Songs will still be imported, just without full album record
            console.log(`[PlaylistImport] Skipping album ${albumId} (not available)`);
            continue;
          }
          if (!albumDetails?.attributes) {
            console.log(`[PlaylistImport] Could not fetch album ${albumId}`);
            continue;
          }

          const attr = albumDetails.attributes;

          // Fetch album tracks
          let albumTracks = [];
          try {
            const tracksResult = await musicKitService.music.api.music(
              `/v1/catalog/us/albums/${albumId}/tracks`,
              { limit: 100 }
            );
            if (tracksResult.data?.data) {
              albumTracks = tracksResult.data.data.map((track, index) => ({
                appleSongId: track.id,
                songName: track.attributes?.name || 'Unknown',
                artistName: track.attributes?.artistName || attr.artistName,
                trackNumber: track.attributes?.trackNumber || index + 1,
                durationInMillis: track.attributes?.durationInMillis,
                isExplicit: track.attributes?.contentRating === 'explicit',
              }));
            }
          } catch (trackErr) {
            console.error(`[PlaylistImport] Failed to fetch tracks for album ${albumId}:`, trackErr);
          }

          // Store in cache for potential reuse
          albumCache.set(albumId, { album: albumDetails, tracks: albumTracks });

          // Ensure album record exists with full track list
          await ensureAlbumRecord({
            userId: user._id,
            appleAlbumId: albumId,
            albumName: attr.name,
            artistName: attr.artistName,
            artworkUrl: attr.artwork?.url
              ? attr.artwork.url.replace('{w}', '400').replace('{h}', '400')
              : undefined,
            releaseYear: attr.releaseDate?.substring(0, 4),
            trackCount: albumTracks.length || attr.trackCount,
            genres: attr.genreNames || [],
            isExplicit: attr.contentRating === 'explicit',
            hideArtwork: hideArtwork,
            tracks: albumTracks.length > 0 ? albumTracks : undefined,
          });

          console.log(`[PlaylistImport] Ensured album record: ${attr.name} (${albumTracks.length} tracks)`);
        } catch (albumErr) {
          console.error(`[PlaylistImport] Failed to ensure album ${albumId}:`, albumErr);
          // Continue with other albums - don't fail the whole import
        }
      }

      // ===========================================================================
      // STEP 2: Import the songs to Discover or Library
      // ===========================================================================
      if (isDiscover) {
        // For Discover: Add entire playlist as a featured playlist
        const formattedTracks = tracks.map((track, index) => ({
          appleSongId: track.id,
          songName: track.name || track.songName,
          artistName: track.artistName,
          albumName: track.albumName,
          artworkUrl: track.artworkUrl
            ? track.artworkUrl.replace('{w}', '300').replace('{h}', '300')
            : undefined,
          durationInMillis: track.durationInMillis,
          trackNumber: index + 1,
          isExplicit: track.isExplicit,
          appleAlbumId: track.albumId,
        }));

        await addPlaylistToDiscover({
          userId: user._id,
          applePlaylistId: playlist.id,
          playlistName: playlistName,
          curatorName: playlist.attributes?.curatorName || 'Apple Music',
          description: playlist.attributes?.description?.standard,
          artworkUrl: playlist.attributes?.artwork?.url
            ? playlist.attributes.artwork.url.replace('{w}', '400').replace('{h}', '400')
            : undefined,
          trackCount: tracks.length,
          featuredForKids: kidIds,
          hideArtwork: hideArtwork,
          tracks: formattedTracks,
        });

        showToast(`Added "${playlistName}" playlist to Discover!`, 'success');
      } else {
        // For Library: Add individual songs to each kid's library AND create a playlist
        let successCount = 0;

        // Validate that kidIds are actual kid profile IDs (not user IDs)
        const validKidIds = kidIds.filter(kidId => {
          const isValidKidProfile = kidProfiles.some(kp => kp._id === kidId);
          if (!isValidKidProfile) {
            console.error(`[PlaylistImport] Invalid kid ID ${kidId} - not found in kidProfiles:`, kidProfiles.map(k => k._id));
          }
          return isValidKidProfile;
        });

        if (validKidIds.length === 0) {
          console.error('[PlaylistImport] No valid kid IDs found! kidIds:', kidIds, 'kidProfiles:', kidProfiles);
          showToast('Error: No valid kid profiles selected', 'error');
          setImporting(false);
          return;
        }

        for (const kidId of validKidIds) {
          // Build songs for playlist
          const songsForPlaylist = [];

          for (const track of tracks) {
            try {
              await approveSong({
                userId: user._id,
                kidProfileId: kidId,
                appleSongId: track.id,
                songName: track.name || track.songName,
                artistName: track.artistName,
                albumName: track.albumName,
                artworkUrl: track.artworkUrl
                  ? track.artworkUrl.replace('{w}', '300').replace('{h}', '300')
                  : undefined,
                hideArtwork: hideArtwork,
                durationInMillis: track.durationInMillis,
                isExplicit: track.isExplicit,
                appleAlbumId: track.albumId,
                trackNumber: track.trackNumber,
              });
              successCount++;

              // Add to playlist songs
              songsForPlaylist.push({
                appleSongId: track.id,
                songName: track.name || track.songName,
                artistName: track.artistName,
                albumName: track.albumName,
                artworkUrl: track.artworkUrl
                  ? track.artworkUrl.replace('{w}', '300').replace('{h}', '300')
                  : undefined,
                durationInMillis: track.durationInMillis,
                appleAlbumId: track.albumId,
              });
            } catch (err) {
              console.error(`Failed to approve song: ${track.name}`, err);
            }
          }

          // Create playlist for this kid with the imported songs
          if (songsForPlaylist.length > 0) {
            try {
              const newPlaylistId = await createPlaylist({
                userId: user._id,
                kidProfileId: kidId,
                name: playlistName,
                description: playlist?.attributes?.description?.standard || '',
              });

              await addSongsToPlaylist({
                playlistId: newPlaylistId,
                songs: songsForPlaylist,
              });

              console.log(`Created playlist "${playlistName}" for kid ${kidId} with ${songsForPlaylist.length} songs`);
            } catch (err) {
              console.error(`Failed to create playlist for kid ${kidId}:`, err);
            }
          }
        }

        showToast(`Added ${tracks.length} songs from "${playlistName}" to Library!`, 'success');
      }

      // Reset state
      setShowInspector(false);
      setSelectedPlaylist(null);
      setPlaylistTracks([]);
      setSelectedSongs(new Set());
      setSearchResults([]);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to import songs:', err);
      showToast('Failed to import songs. Please try again.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isMusicKitReady) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <svg className="w-12 h-12 text-yellow-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="font-semibold text-yellow-900 mb-2">MusicKit Not Configured</h3>
        <p className="text-sm text-yellow-800">
          Configure MusicKit to import playlists from Apple Music.
        </p>
      </div>
    );
  }

  return (
    <>
      {ToastContainer}
      <div className="space-y-6">
        {/* Browse/Search for Playlists */}
        <div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Import Apple Music Playlists</h2>
              <p className="text-sm text-gray-600">
                Import songs from your library playlists or search the Apple Music catalog
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('library')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                  activeTab === 'library'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                My Playlists
              </button>
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
                  activeTab === 'catalog'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Search Catalog
              </button>
            </div>

            {/* My Library Playlists Tab */}
            {activeTab === 'library' && (
              <>
                {!isAuthorized ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto mb-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <h3 className="font-semibold text-gray-900 mb-2">Connect to Apple Music</h3>
                    <p className="text-gray-600 mb-4">Sign in to access your personal playlists</p>
                    <button
                      onClick={handleAuthorize}
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition shadow-lg disabled:opacity-50"
                    >
                      {loading ? 'Connecting...' : 'Connect Apple Music'}
                    </button>
                  </div>
                ) : loading ? (
                  <div className="text-center py-12">
                    <svg className="animate-spin w-12 h-12 text-purple-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">Loading your playlists...</p>
                  </div>
                ) : libraryPlaylists.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p>No playlists found in your library</p>
                    <button
                      onClick={loadLibraryPlaylists}
                      className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Refresh
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {libraryPlaylists.map(playlist => (
                      <button
                        key={playlist.id}
                        onClick={() => handleSelectPlaylist(playlist, true)}
                        className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 text-left transition border border-gray-200 hover:border-purple-300"
                      >
                        <div className="flex items-start space-x-3">
                          {playlist.attributes.artwork?.url ? (
                            <img
                              src={playlist.attributes.artwork.url.replace('{w}', '100').replace('{h}', '100')}
                              alt={playlist.attributes.name}
                              className="w-16 h-16 rounded-lg flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{playlist.attributes.name}</h3>
                            <p className="text-sm text-gray-600">My Library</p>
                            {playlist.attributes.description?.standard && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{playlist.attributes.description.standard}</p>
                            )}
                          </div>
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Search Catalog Tab */}
            {activeTab === 'catalog' && (
              <>
                {/* Search Form */}
                <form onSubmit={handleSearch} className="mb-6">
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search playlists..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={loading || !searchQuery.trim()}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Searching...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Search
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Search Results */}
                {searchResults.length === 0 && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p>Search for Apple Music playlists</p>
                    <p className="text-sm text-gray-400 mt-2">Try searching for "Kids Music", "Disney", or your favorite genre</p>
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map(playlist => (
                      <button
                        key={playlist.id}
                        onClick={() => handleSelectPlaylist(playlist, false)}
                        className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 text-left transition border border-gray-200 hover:border-purple-300"
                      >
                        <div className="flex items-start space-x-3">
                          {playlist.attributes.artwork ? (
                            <img
                              src={playlist.attributes.artwork.url.replace('{w}', '100').replace('{h}', '100')}
                              alt={playlist.attributes.name}
                              className="w-16 h-16 rounded-lg flex-shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{playlist.attributes.name}</h3>
                            <p className="text-sm text-gray-600">{playlist.attributes.curatorName || 'Apple Music'}</p>
                            {playlist.attributes.description?.standard && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{playlist.attributes.description.standard}</p>
                            )}
                          </div>
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      {/* PlaylistInspector Modal */}
      <PlaylistInspector
        isOpen={showInspector}
        onClose={() => {
          setShowInspector(false);
          setSelectedPlaylist(null);
          setPlaylistTracks([]);
        }}
        playlist={selectedPlaylist}
        tracks={playlistTracks}
        kidProfiles={kidProfiles}
        onAddSongs={handleAddSongsFromInspector}
      />
    </div>
    </>
  );
}

export default PlaylistImport;
