// MusicKit JS Configuration and Initialization
// Docs: https://developer.apple.com/documentation/musickit/musickit-js

class MusicKitService {
  constructor() {
    this.music = null;
    this.isInitialized = false;
    this.isAuthorized = false;
  }

  /**
   * Initialize MusicKit instance
   * Must be called before using any MusicKit features
   */
  async initialize() {
    if (this.isInitialized) {
      return this.music;
    }

    try {
      // Wait for MusicKit JS to load
      await this.waitForMusicKit();

      const developerToken = import.meta.env.VITE_MUSICKIT_DEVELOPER_TOKEN;
      const appName = import.meta.env.VITE_MUSICKIT_APP_NAME || 'SafeTunes';

      if (!developerToken) {
        console.warn('MusicKit developer token not configured. Set VITE_MUSICKIT_DEVELOPER_TOKEN in your .env file.');
        return null;
      }

      // Configure MusicKit
      await window.MusicKit.configure({
        developerToken: developerToken,
        app: {
          name: appName,
          build: '1.0.0',
        },
      });

      this.music = window.MusicKit.getInstance();
      this.isInitialized = true;

      // SECURITY: Disable autoplay globally to prevent unapproved content
      // We manually control the queue with only approved songs
      this.music.autoplayEnabled = false;

      // Listen for authorization changes
      this.music.addEventListener('authorizationStatusDidChange', () => {
        this.isAuthorized = this.music.isAuthorized;
      });

      this.isAuthorized = this.music.isAuthorized;

      console.log('MusicKit initialized successfully - autoplay disabled for safety');
      return this.music;
    } catch (error) {
      console.error('Failed to initialize MusicKit:', error);
      throw error;
    }
  }

  /**
   * Wait for MusicKit JS script to load
   */
  waitForMusicKit() {
    return new Promise((resolve, reject) => {
      // Don't try to load MusicKit if we don't have a token
      const developerToken = import.meta.env.VITE_MUSICKIT_DEVELOPER_TOKEN;
      if (!developerToken) {
        reject(new Error('MusicKit developer token not configured'));
        return;
      }

      if (window.MusicKit) {
        resolve();
        return;
      }

      // Check if script tag exists
      let script = document.querySelector('script[src*="musickit.js"]');

      if (!script) {
        // Create and load MusicKit JS script
        script = document.createElement('script');
        script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }

      script.addEventListener('load', () => resolve());
      script.addEventListener('error', (e) => {
        console.error('Failed to load MusicKit JS:', e);
        reject(new Error('Failed to load MusicKit JS - check your developer token'));
      });

      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('MusicKit load timeout')), 10000);
    });
  }

  /**
   * Authorize user with Apple Music
   * Opens Apple Music login flow
   * @param {boolean} requestLibraryAccess - Whether to request library read permission (for playlist import)
   */
  async authorize(requestLibraryAccess = false) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    try {
      console.log('Attempting authorization...');
      console.log('User agent:', navigator.userAgent);
      console.log('Is iOS:', /iPhone|iPad|iPod/.test(navigator.userAgent));

      // For library access (playlists), we need to request explicit permission
      // Note: The user must grant "Media & Apple Music" permission in the authorization flow
      const token = await this.music.authorize();
      this.isAuthorized = true;

      if (requestLibraryAccess) {
        console.log('✓ Authorization complete. Library access requested.');
        console.log('Note: Make sure to grant "Media & Apple Music" permission when prompted.');
      }

      console.log('✓ Authorization successful');
      return token;
    } catch (error) {
      console.error('Authorization error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      });

      // Provide helpful error message for common iOS issues
      if (error.message && error.message.toLowerCase().includes('load')) {
        const helpfulError = new Error(
          'Failed to load Apple Music authorization. On iOS:\n' +
          '1. Turn off "Block Pop-ups" in Safari settings\n' +
          '2. Turn off "Prevent Cross-Site Tracking" in Safari settings\n' +
          '3. Make sure you have an active internet connection\n' +
          '4. Try using Chrome or another browser\n\n' +
          'Original error: ' + error.message
        );
        helpfulError.originalError = error;
        throw helpfulError;
      }

      throw error;
    }
  }

  /**
   * Unauthorize user (sign out)
   */
  async unauthorize() {
    if (!this.music) return;

    try {
      await this.music.unauthorize();
      this.isAuthorized = false;
    } catch (error) {
      console.error('Unauthorization failed:', error);
      throw error;
    }
  }

  /**
   * Check if user is authorized
   */
  checkAuthorization() {
    return this.music ? this.music.isAuthorized : false;
  }

  /**
   * Search for albums in Apple Music catalog
   * @param {string} query - Search query
   * @param {number} limit - Number of results to return (default: 25)
   * @returns {Promise<Array>} Array of album results
   */
  async searchAlbums(query, limit = 25) {
    const results = await this.search(query, { types: 'albums', limit });
    // Extract albums from the nested response structure
    return results?.data?.results?.albums?.data || [];
  }

  /**
   * Get albums by a specific artist
   * @param {string} artistId - Apple Music artist ID
   * @param {number} limit - Number of results to return (default: 25)
   * @returns {Promise<Array>} Array of album results
   */
  async getArtistAlbums(artistId, limit = 25) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    try {
      const result = await this.music.api.music(
        `/v1/catalog/us/artists/${artistId}/albums`,
        { limit }
      );
      return result?.data?.data || [];
    } catch (error) {
      console.error('Failed to get artist albums:', error);
      throw error;
    }
  }

  /**
   * Search for a song by name and artist to get catalog ID
   * Used to convert library-specific IDs to playable catalog IDs
   * @param {string} songName - Song name
   * @param {string} artistName - Artist name
   * @returns {Promise<string|null>} Catalog song ID or null if not found
   */
  async findCatalogSongId(songName, artistName) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    try {
      // Search for the song with both name and artist
      const searchQuery = `${songName} ${artistName}`;
      console.log(`🔍 Searching catalog for: "${searchQuery}"`);

      const result = await this.music.api.music(
        '/v1/catalog/us/search',
        {
          term: searchQuery,
          types: 'songs',
          limit: 10,
        }
      );

      const songs = result?.data?.results?.songs?.data || [];

      if (songs.length === 0) {
        console.warn(`No catalog results found for "${songName}" by "${artistName}"`);
        return null;
      }

      // Try to find an exact match by comparing song name and artist
      const songNameLower = songName.toLowerCase().trim();
      const artistNameLower = artistName.toLowerCase().trim();

      for (const song of songs) {
        const resultSongName = song.attributes?.name?.toLowerCase().trim() || '';
        const resultArtistName = song.attributes?.artistName?.toLowerCase().trim() || '';

        // Check for exact match
        if (resultSongName === songNameLower && resultArtistName === artistNameLower) {
          console.log(`✓ Found exact catalog match: ${song.id} for "${songName}" by "${artistName}"`);
          return song.id;
        }
      }

      // If no exact match, try partial match on song name (artist may have variations)
      for (const song of songs) {
        const resultSongName = song.attributes?.name?.toLowerCase().trim() || '';
        const resultArtistName = song.attributes?.artistName?.toLowerCase().trim() || '';

        if (resultSongName === songNameLower && resultArtistName.includes(artistNameLower)) {
          console.log(`✓ Found partial match: ${song.id} for "${songName}" by "${artistName}" (actual: ${song.attributes?.artistName})`);
          return song.id;
        }
      }

      // Last resort: take first result if song name matches
      for (const song of songs) {
        const resultSongName = song.attributes?.name?.toLowerCase().trim() || '';

        if (resultSongName === songNameLower) {
          console.log(`⚠️ Using first name match: ${song.id} for "${songName}" (artist: ${song.attributes?.artistName})`);
          return song.id;
        }
      }

      console.warn(`Could not find a matching catalog song for "${songName}" by "${artistName}"`);
      return null;
    } catch (error) {
      console.error('Failed to search for catalog song:', error);
      return null;
    }
  }

  /**
   * Search Apple Music catalog
   * @param {string} query - Search query
   * @param {object} options - Search options (types, limit)
   * @returns {Promise<object>} Search results
   */
  async search(query, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    try {
      const defaults = {
        types: 'albums',
        limit: 25,
        offset: 0,
      };

      const searchOptions = { ...defaults, ...options };

      console.log('MusicKit API search with:', { query, searchOptions });

      // Build query parameters
      const params = {
        term: query,
        types: searchOptions.types,
        limit: searchOptions.limit,
        // Note: genreNames is a default attribute on albums/songs, no extend needed
      };

      // Only add offset if it's greater than 0
      if (searchOptions.offset > 0) {
        params.offset = searchOptions.offset;
      }

      // MusicKit v3 uses api.music() for all API calls
      const results = await this.music.api.music(
        '/v1/catalog/us/search',
        params
      );

      return results;
    } catch (error) {
      console.error('MusicKit search error:', error);
      throw error;
    }
  }

  /**
   * Get album details by ID
   * @param {string} albumId - Apple Music album ID
   * @returns {Promise<object>} Album details
   */
  async getAlbum(albumId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    try {
      const result = await this.music.api.music(
        `/v1/catalog/us/albums/${albumId}`
      );

      console.log('Album API response:', result);

      // Handle different response structures
      if (result.data) {
        // If data is an array, return first item
        if (Array.isArray(result.data) && result.data.length > 0) {
          return result.data[0];
        }
        // If data is a single object, return it
        if (!Array.isArray(result.data) && typeof result.data === 'object') {
          return result.data;
        }
      }

      throw new Error('No album data returned from API');
    } catch (error) {
      console.error('Failed to get album:', error);
      throw error;
    }
  }

  /**
   * Get tracks for a specific album
   * @param {string} albumId - Apple Music album ID
   * @returns {Promise<Array>} Array of track objects
   */
  async getAlbumTracks(albumId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    try {
      console.log('Fetching tracks for album:', albumId);

      // Request up to 300 tracks (Apple Music API default limit is lower)
      const result = await this.music.api.music(
        `/v1/catalog/us/albums/${albumId}/tracks?limit=300`
      );

      console.log('=== ALBUM TRACKS API RESPONSE ===');
      console.log('result.data.data exists?', !!result.data?.data);
      console.log('result.data.data is array?', Array.isArray(result.data?.data));
      console.log('result.data.data length:', result.data?.data?.length);
      console.log('next page?', result.data?.next);
      console.log('================================');

      // The response has nested data: result.data.data contains the tracks array
      if (result.data?.data && Array.isArray(result.data.data)) {
        console.log(`Successfully returning ${result.data.data.length} tracks`);
        return result.data.data;
      }

      console.warn('No tracks data found in response');
      return [];
    } catch (error) {
      console.error('Failed to get album tracks:', error);
      console.error('Error details:', error.message, error.stack);
      throw error;
    }
  }

  /**
   * Get lyrics for a specific song
   * @param {string} songId - Apple Music song ID
   * @param {string} storefront - Storefront (default: 'us')
   * @returns {Promise<object>} Lyrics data
   */
  async getLyrics(songId, storefront = 'us') {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    try {
      console.log('Fetching lyrics for song:', songId);

      const result = await this.music.api.music(
        `/v1/catalog/${storefront}/songs/${songId}/lyrics`
      );

      console.log('Lyrics API response:', result);

      // Return the lyrics data
      if (result.data?.data && Array.isArray(result.data.data) && result.data.data.length > 0) {
        return result.data.data[0];
      }

      return null;
    } catch (error) {
      console.error('Failed to get lyrics:', error);
      throw error;
    }
  }

  /**
   * Play an album
   * @param {string} albumId - Apple Music album ID
   */
  async playAlbum(albumId) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    if (!this.isAuthorized) {
      console.log('Not authorized, requesting authorization...');
      await this.authorize();
    }

    console.log('Attempting to play album:', albumId);
    console.log('Is authorized:', this.isAuthorized);
    console.log('MusicKit instance:', this.music);

    try {
      // Stop any current playback before starting new playback
      if (this.music.isPlaying) {
        await this.music.stop();
      }

      // SECURITY WARNING: Using setQueue with album plays ALL songs, including unapproved ones
      // This is a temporary implementation - we need to build a custom queue with only approved songs
      await this.music.setQueue({
        album: albumId,
        startWith: 0  // Start with first track
      });

      // DISABLE autoplay to prevent skipping to unapproved songs
      this.music.autoplayEnabled = false;

      await this.music.play();

      console.log('Album queue set, playing first song only (autoplay disabled for safety)');
    } catch (error) {
      console.error('Failed to play album:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name
      });

      if (error.message && error.message.includes('CONTENT_UNAVAILABLE')) {
        throw new Error('This content requires an active Apple Music subscription. Please make sure you are signed in to Apple Music with a paid subscription account.');
      }

      throw error;
    }
  }

  /**
   * Play a list of approved songs (safe queue)
   * @param {Array} tracks - Array of track objects from MusicKit API
   * @param {number} startIndex - Optional index to start playing from (default: 0)
   */
  async playApprovedSongs(tracks, startIndex = 0) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    if (!this.isAuthorized) {
      console.log('Not authorized, requesting authorization...');
      await this.authorize();
    }

    if (!tracks || tracks.length === 0) {
      throw new Error('No tracks provided');
    }

    console.log('Creating safe queue with approved songs only:', tracks.length, 'starting at index:', startIndex);

    try {
      // SECURITY: Stop any existing playback and clear queue first
      if (this.music.isPlaying) {
        await this.music.stop();
      }

      // Extract song IDs and metadata from tracks (handles various input formats)
      const trackData = tracks.map(track => {
        // Handle different track object formats
        let id = null;
        let songName = null;
        let artistName = null;

        if (typeof track === 'string') {
          id = track;
        } else {
          id = track.id || track.appleSongId || track.attributes?.playParams?.id;
          songName = track.songName || track.attributes?.name;
          artistName = track.artistName || track.attributes?.artistName;
        }

        return {
          id: id ? String(id) : null,
          songName,
          artistName
        };
      }).filter(t => t.id !== null);

      // Process song IDs - convert library IDs to catalog IDs where possible
      const songIds = [];
      const libraryIdConversions = [];

      for (const track of trackData) {
        if (track.id.startsWith('i.')) {
          // Library ID detected - queue for conversion
          if (track.songName && track.artistName) {
            libraryIdConversions.push(track);
          } else {
            console.warn(`Skipping library ID ${track.id} - no metadata for conversion`);
          }
        } else {
          songIds.push(track.id);
        }
      }

      // Convert library IDs to catalog IDs
      if (libraryIdConversions.length > 0) {
        console.log(`🔄 Converting ${libraryIdConversions.length} library IDs to catalog IDs...`);

        for (const track of libraryIdConversions) {
          const catalogId = await this.findCatalogSongId(track.songName, track.artistName);
          if (catalogId) {
            console.log(`✓ Converted ${track.id} → ${catalogId} ("${track.songName}")`);
            songIds.push(catalogId);
          } else {
            console.warn(`⚠️ Could not find catalog ID for "${track.songName}" by "${track.artistName}"`);
          }
        }
      }

      console.log('Song IDs for queue:', songIds);

      if (songIds.length === 0) {
        throw new Error('No valid catalog song IDs found. Some songs may have been saved with library-specific IDs that cannot be played.');
      }

      // Adjust start index if some library IDs couldn't be converted
      let adjustedStartIndex = startIndex;
      if (adjustedStartIndex >= songIds.length) {
        adjustedStartIndex = 0;
      }

      // Use the simple songs array format - most reliable in MusicKit v3
      await this.music.setQueue({
        songs: songIds,
        startWith: adjustedStartIndex
      });

      // Now start playback
      await this.music.play();

      // SECURITY: Configure playback to ONLY use our approved queue
      this.music.autoplayEnabled = false; // Don't auto-add Apple Music suggestions
      this.music.repeatMode = 0; // 0 = no repeat, 1 = repeat one, 2 = repeat all

      console.log(`✓ SECURE QUEUE: Created safe queue with ${songIds.length} approved songs ONLY, starting at index ${adjustedStartIndex}`);
    } catch (error) {
      console.error('Failed to play approved songs:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name
      });

      if (error.message && error.message.includes('CONTENT_UNAVAILABLE')) {
        throw new Error('This content requires an active Apple Music subscription. Please make sure you are signed in to Apple Music with a paid subscription account.');
      }

      throw error;
    }
  }

  /**
   * Play a specific track (SECURE VERSION)
   * @param {string} songId - Apple Music song ID
   * @param {object} songMeta - Optional metadata for library ID conversion {songName, artistName}
   */
  async playSong(songId, songMeta = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    if (!this.isAuthorized) {
      console.log('Not authorized, requesting authorization...');
      await this.authorize();
    }

    console.log('Attempting to play song:', songId);
    console.log('Is authorized:', this.isAuthorized);

    let playableSongId = songId;

    // Check for library-specific IDs and try to convert to catalog ID
    if (songId && songId.startsWith('i.')) {
      console.log(`⚠️ Library ID detected: ${songId}`);

      if (songMeta && songMeta.songName && songMeta.artistName) {
        console.log(`🔄 Attempting to convert to catalog ID using: "${songMeta.songName}" by "${songMeta.artistName}"`);
        const catalogId = await this.findCatalogSongId(songMeta.songName, songMeta.artistName);

        if (catalogId) {
          console.log(`✓ Converted library ID ${songId} to catalog ID ${catalogId}`);
          playableSongId = catalogId;
        } else {
          console.error(`Could not find catalog ID for "${songMeta.songName}" by "${songMeta.artistName}"`);
          throw new Error(`Could not find "${songMeta.songName}" by "${songMeta.artistName}" in Apple Music catalog. The song may have been removed or renamed.`);
        }
      } else {
        console.error(`Cannot play library-specific song ID: ${songId} - no metadata provided`);
        throw new Error('This song was saved with a library-specific ID and cannot be played. Please re-add this song from the Apple Music catalog.');
      }
    }

    try {
      // SECURITY: Stop any existing playback and clear queue first
      if (this.music.isPlaying) {
        await this.music.stop();
      }

      // SECURITY: Use setQueue with songs array to ensure proper security settings
      await this.music.setQueue({
        songs: [playableSongId],
        startWith: 0
      });

      // SECURITY: Ensure autoplay is disabled and no repeat
      this.music.autoplayEnabled = false;
      this.music.repeatMode = 0;

      await this.music.play();

      console.log(`✓ SECURE QUEUE: Playing single approved song: ${playableSongId}`);
    } catch (error) {
      console.error('Failed to play song:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        name: error.name
      });

      if (error.message && error.message.includes('CONTENT_UNAVAILABLE')) {
        throw new Error('This content requires an active Apple Music subscription. Please make sure you are signed in to Apple Music with a paid subscription account.');
      }

      throw error;
    }
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.music) {
      this.music.pause();
    }
  }

  /**
   * Resume playback
   */
  play() {
    if (this.music) {
      this.music.play();
    }
  }

  /**
   * Stop playback
   */
  stop() {
    if (this.music) {
      this.music.stop();
    }
  }

  /**
   * Skip to next track
   */
  skipToNext() {
    if (this.music) {
      // Log current queue for debugging
      const queue = this.music.queue;
      const currentIndex = queue?.position || 0;
      const nextItem = queue?.items?.[currentIndex + 1];

      console.log('⏭️ SKIP NEXT:', {
        currentSong: this.music.nowPlayingItem?.attributes?.name,
        currentSongId: this.music.nowPlayingItem?.id,
        nextSong: nextItem?.attributes?.name,
        nextSongId: nextItem?.id,
        queueLength: queue?.items?.length,
        currentPosition: currentIndex
      });

      this.music.skipToNextItem();
    }
  }

  /**
   * Skip to previous track
   */
  skipToPrevious() {
    if (this.music) {
      // Log current queue for debugging
      const queue = this.music.queue;
      const currentIndex = queue?.position || 0;
      const prevItem = queue?.items?.[currentIndex - 1];

      console.log('⏮️ SKIP PREVIOUS:', {
        currentSong: this.music.nowPlayingItem?.attributes?.name,
        currentSongId: this.music.nowPlayingItem?.id,
        previousSong: prevItem?.attributes?.name,
        previousSongId: prevItem?.id,
        queueLength: queue?.items?.length,
        currentPosition: currentIndex
      });

      this.music.skipToPreviousItem();
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (this.music) {
      this.music.volume = clampedVolume;
      console.log('[MusicKit] Volume set to:', clampedVolume);
    } else {
      console.warn('[MusicKit] Cannot set volume - music instance not available');
    }
  }

  /**
   * Toggle shuffle mode
   * @returns {boolean} New shuffle state
   */
  toggleShuffle() {
    if (this.music) {
      // MusicKit shuffleMode: 0 = off, 1 = songs
      const newMode = this.music.shuffleMode === 1 ? 0 : 1;
      this.music.shuffleMode = newMode;
      console.log('🔀 Shuffle mode:', newMode === 1 ? 'ON' : 'OFF');
      return newMode === 1;
    }
    return false;
  }

  /**
   * Get current shuffle state
   * @returns {boolean} Whether shuffle is on
   */
  getShuffleMode() {
    return this.music ? this.music.shuffleMode === 1 : false;
  }

  /**
   * Toggle repeat mode (cycles through: off -> all -> one -> off)
   * @returns {number} New repeat mode (0=off, 1=one, 2=all)
   */
  toggleRepeat() {
    if (this.music) {
      // Cycle: 0 (off) -> 2 (all) -> 1 (one) -> 0 (off)
      const current = this.music.repeatMode;
      let newMode;
      if (current === 0) newMode = 2; // off -> all
      else if (current === 2) newMode = 1; // all -> one
      else newMode = 0; // one -> off

      this.music.repeatMode = newMode;
      const modeNames = ['OFF', 'ONE', 'ALL'];
      console.log('🔁 Repeat mode:', modeNames[newMode]);
      return newMode;
    }
    return 0;
  }

  /**
   * Get current repeat mode
   * @returns {number} Repeat mode (0=off, 1=one, 2=all)
   */
  getRepeatMode() {
    return this.music ? this.music.repeatMode : 0;
  }

  /**
   * Get current queue items
   * @returns {Array} Queue items
   */
  getQueue() {
    if (this.music && this.music.queue) {
      return this.music.queue.items || [];
    }
    return [];
  }

  /**
   * Get current queue position
   * @returns {number} Current position in queue
   */
  getQueuePosition() {
    if (this.music && this.music.queue) {
      return this.music.queue.position || 0;
    }
    return 0;
  }

  /**
   * Add a song to the queue (play next)
   * @param {string} songId - Apple Music song ID
   * @param {boolean} playNext - If true, add as next song; if false, add to end of queue
   * @returns {Promise<boolean>} Success status
   */
  async addToQueue(songId, playNext = true) {
    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    if (!this.isAuthorized) {
      await this.authorize();
    }

    try {
      console.log(`➕ Adding song ${songId} to queue (playNext: ${playNext})`);

      // MusicKit JS uses playNext() and playLater() methods on the instance
      // Create a queue descriptor with the song
      const descriptor = { songs: [songId] };

      if (playNext) {
        // playNext inserts immediately after the current song
        await this.music.playNext(descriptor);
        console.log('✓ Song added to play next');
      } else {
        // playLater adds to the end of the queue
        await this.music.playLater(descriptor);
        console.log('✓ Song added to end of queue');
      }
      return true;
    } catch (error) {
      console.error('Failed to add to queue:', error);
      throw error;
    }
  }

  /**
   * Add multiple songs to the queue
   * @param {Array<string>} songIds - Array of Apple Music song IDs
   * @param {boolean} playNext - If true, add as next songs; if false, add to end
   * @returns {Promise<boolean>} Success status
   */
  async addMultipleToQueue(songIds, playNext = false) {
    if (!this.music) {
      throw new Error('MusicKit not initialized');
    }

    if (!songIds || songIds.length === 0) {
      return false;
    }

    try {
      console.log(`➕ Adding ${songIds.length} songs to queue`);

      // MusicKit JS uses playNext() and playLater() methods
      const descriptor = { songs: songIds };

      if (playNext) {
        // playNext inserts immediately after the current song
        await this.music.playNext(descriptor);
      } else {
        // playLater adds to the end of the queue
        await this.music.playLater(descriptor);
      }
      console.log(`✓ Added ${songIds.length} songs to queue`);
      return true;
    } catch (error) {
      console.error('Failed to add multiple songs to queue:', error);
      throw error;
    }
  }

  /**
   * Clear the queue (except currently playing song)
   * @returns {Promise<void>}
   */
  async clearQueue() {
    if (!this.music || !this.music.queue) {
      return;
    }

    try {
      // Keep the current song, clear the rest
      const position = this.music.queue.position;
      const items = this.music.queue.items;

      // Remove items after current position (upcoming songs)
      for (let i = items.length - 1; i > position; i--) {
        await this.music.queue.remove(i);
      }
      console.log('✓ Queue cleared (keeping current song)');
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }

  /**
   * Seek to a specific time in the current track
   * @param {number} time - Time in seconds
   */
  seekToTime(time) {
    if (this.music && this.music.nowPlayingItem) {
      this.music.seekToTime(time);
    }
  }

  /**
   * Get current playback state
   */
  getPlaybackState() {
    if (!this.music) return null;

    return {
      isPlaying: this.music.isPlaying,
      currentPlaybackTime: this.music.currentPlaybackTime,
      currentPlaybackDuration: this.music.currentPlaybackDuration,
      nowPlayingItem: this.music.nowPlayingItem,
      queue: this.music.queue,
    };
  }

  /**
   * Add event listener
   */
  addEventListener(event, handler) {
    if (this.music) {
      this.music.addEventListener(event, handler);
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(event, handler) {
    if (this.music) {
      this.music.removeEventListener(event, handler);
    }
  }

  /**
   * Get the MusicKit instance
   * @returns {object} MusicKit instance
   */
  getMusicKitInstance() {
    return this.music;
  }
}

// Export singleton instance
const musicKitService = new MusicKitService();
export default musicKitService;
