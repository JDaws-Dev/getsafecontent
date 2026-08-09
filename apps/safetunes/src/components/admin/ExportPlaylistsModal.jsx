import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import musicKitService from '../../config/musickit';

/**
 * ExportPlaylistsModal - 4-step wizard for exporting playlists to Apple Music
 *
 * Step 1: Select which playlists to export
 * Step 2: Teen signs into their Apple Music account
 * Step 3: Export progress
 * Step 4: Results summary
 */
export default function ExportPlaylistsModal({ kidProfile, onClose, userToken }) {
  const [step, setStep] = useState(1);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState(new Set());
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [currentPlaylistName, setCurrentPlaylistName] = useState('');
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(0);
  const [currentSongsProgress, setCurrentSongsProgress] = useState(0);
  const [currentSongsTotal, setCurrentSongsTotal] = useState(0);
  const cancelledRef = useRef(false);

  // Results state
  const [results, setResults] = useState({
    playlistsCreated: 0,
    songsExported: 0,
    songsSkipped: 0,
    errors: [],
  });

  // Fetch playlists for this kid. The parent token bypasses the kid-side daily
  // time-limit gate — exporting is a parent action, not screen time.
  const playlists = useQuery(api.playlists.getPlaylistsForKid, {
    kidProfileId: kidProfile._id,
    userToken,
  });

  // Default all playlists selected when data loads
  useEffect(() => {
    if (playlists && selectedPlaylistIds.size === 0) {
      const allIds = new Set(
        playlists
          .filter((p) => p.songs && p.songs.length > 0)
          .map((p) => p._id)
      );
      setSelectedPlaylistIds(allIds);
    }
  }, [playlists]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const togglePlaylist = (id) => {
    setSelectedPlaylistIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!playlists) return;
    const nonEmpty = playlists.filter((p) => p.songs && p.songs.length > 0);
    if (selectedPlaylistIds.size === nonEmpty.length) {
      setSelectedPlaylistIds(new Set());
    } else {
      setSelectedPlaylistIds(new Set(nonEmpty.map((p) => p._id)));
    }
  };

  const selectedPlaylists = playlists
    ? playlists.filter((p) => selectedPlaylistIds.has(p._id))
    : [];

  const totalSongs = selectedPlaylists.reduce(
    (sum, p) => sum + (p.songs?.length || 0),
    0
  );

  const formatDuration = (ms) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return `${hours}h ${remaining}m`;
  };

  const getPlaylistDuration = (playlist) => {
    const totalMs = (playlist.songs || []).reduce(
      (sum, s) => sum + (s.durationInMillis || 0),
      0
    );
    return formatDuration(totalMs);
  };

  // Step 2: Apple Music authorization
  const handleAuthorize = async () => {
    setAuthError('');
    setIsAuthorizing(true);
    try {
      // First, sign out of any existing session so the teen can use their own Apple ID
      if (musicKitService.checkAuthorization()) {
        await musicKitService.unauthorize();
      }

      await musicKitService.authorize(true);
      setIsAuthorized(true);
    } catch (error) {
      console.error('Apple Music authorization failed:', error);
      if (error.message?.includes('cancelled') || error.name === 'USER_CANCELLED') {
        setAuthError('Authorization was cancelled. Please try again.');
      } else {
        setAuthError(
          error.originalError?.message || error.message || 'Failed to connect to Apple Music. Please try again.'
        );
      }
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Step 3: Run the export
  const handleExport = async () => {
    setIsExporting(true);
    cancelledRef.current = false;
    const exportResults = {
      playlistsCreated: 0,
      songsExported: 0,
      songsSkipped: 0,
      errors: [],
    };

    for (let i = 0; i < selectedPlaylists.length; i++) {
      if (cancelledRef.current) break;

      const playlist = selectedPlaylists[i];
      setCurrentPlaylistIndex(i);
      setCurrentPlaylistName(playlist.name);
      setCurrentSongsProgress(0);
      setCurrentSongsTotal(playlist.songs?.length || 0);

      // Skip empty playlists
      if (!playlist.songs || playlist.songs.length === 0) {
        exportResults.errors.push(`"${playlist.name}" was empty, skipped.`);
        continue;
      }

      try {
        // Create the playlist in Apple Music
        const libraryPlaylistId = await musicKitService.createLibraryPlaylist(
          playlist.name,
          playlist.description || `Exported from SafeTunes for ${kidProfile.name}`
        );

        if (cancelledRef.current) break;

        // Add songs to the playlist
        const songIds = playlist.songs.map((s) => s.appleSongId);
        const { added, skipped } = await musicKitService.addSongsToLibraryPlaylist(
          libraryPlaylistId,
          songIds,
          (processed, total) => {
            setCurrentSongsProgress(processed);
          }
        );

        exportResults.playlistsCreated++;
        exportResults.songsExported += added;
        exportResults.songsSkipped += skipped;

        if (skipped > 0) {
          exportResults.errors.push(
            `"${playlist.name}": ${skipped} song${skipped > 1 ? 's' : ''} could not be added.`
          );
        }
      } catch (error) {
        console.error(`Failed to export playlist "${playlist.name}":`, error);
        exportResults.errors.push(
          `"${playlist.name}" failed to export: ${error.message}`
        );
      }
    }

    setResults(exportResults);
    setIsExporting(false);
    setStep(4);
  };

  // Loading state
  if (!playlists) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-accent-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading playlists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-display font-semibold text-brand-navy">
                Export Playlists
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {kidProfile.name}'s playlists to Apple Music
              </p>
            </div>
            {!isExporting && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    s < step
                      ? 'bg-green-500 text-white'
                      : s === step
                        ? 'bg-accent-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s < step ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    s
                  )}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-0.5 rounded ${
                      s < step ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1: Select Playlists */}
          {step === 1 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">
                  Choose which playlists to export ({selectedPlaylistIds.size} selected)
                </p>
                <button
                  onClick={toggleAll}
                  className="text-sm text-accent-600 hover:text-accent-700 font-medium"
                >
                  {selectedPlaylistIds.size === playlists.filter((p) => p.songs?.length > 0).length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              {playlists.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  <p className="font-medium">No playlists found</p>
                  <p className="text-sm mt-1">
                    {kidProfile.name} hasn't created any playlists yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {playlists.map((playlist) => {
                    const isEmpty = !playlist.songs || playlist.songs.length === 0;
                    const isSelected = selectedPlaylistIds.has(playlist._id);
                    const duration = getPlaylistDuration(playlist);

                    return (
                      <label
                        key={playlist._id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition cursor-pointer ${
                          isEmpty
                            ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                            : isSelected
                              ? 'border-accent-300 bg-accent-50'
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isEmpty}
                          onChange={() => togglePlaylist(playlist._id)}
                          className="w-4 h-4 rounded text-accent-600 focus:ring-accent-500 border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {playlist.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {playlist.songs?.length || 0} song{(playlist.songs?.length || 0) !== 1 ? 's' : ''}
                            {duration ? ` \u00B7 ${duration}` : ''}
                            {isEmpty ? ' (empty)' : ''}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {selectedPlaylistIds.size > 0 && (
                <div className="mt-4 bg-accent-50 border border-accent-200 rounded-lg p-3 text-sm text-accent-700">
                  Ready to export {selectedPlaylistIds.size} playlist{selectedPlaylistIds.size !== 1 ? 's' : ''} with {totalSongs} song{totalSongs !== 1 ? 's' : ''}.
                </div>
              )}
            </div>
          )}

          {/* Step 2: Apple Music Authorization */}
          {step === 2 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </div>

              <h3 className="text-lg font-display font-semibold text-brand-navy mb-2">
                Sign Into Apple Music
              </h3>
              <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                Have your teen sign in with <strong>their own Apple ID</strong>.
                This will create the playlists in their personal Apple Music library.
              </p>

              {isAuthorized ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Connected to Apple Music</span>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleAuthorize}
                    disabled={isAuthorizing}
                    className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold px-6 py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAuthorizing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                        </svg>
                        Connect Apple Music
                      </>
                    )}
                  </button>

                  {authError && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {authError}
                    </div>
                  )}
                </>
              )}

              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 text-left">
                <p className="font-medium mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>The teen should sign in with their own Apple ID, not the parent's</li>
                  <li>An active Apple Music subscription is required on the teen's account</li>
                  <li>Grant "Media & Apple Music" permission when prompted</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 3: Export Progress */}
          {step === 3 && (
            <div className="py-4">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  {isExporting ? (
                    <div className="w-6 h-6 border-[3px] border-accent-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-6 h-6 text-accent-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-display font-semibold text-brand-navy">
                  {isExporting ? 'Exporting...' : 'Ready to Export'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {isExporting
                    ? 'Do not close this window.'
                    : `${selectedPlaylists.length} playlists, ${totalSongs} songs`}
                </p>
              </div>

              {isExporting && (
                <div className="space-y-4">
                  {/* Overall progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        Playlist {currentPlaylistIndex + 1} of {selectedPlaylists.length}
                      </span>
                      <span className="text-gray-500 font-medium">
                        {Math.round(((currentPlaylistIndex) / selectedPlaylists.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${((currentPlaylistIndex) / selectedPlaylists.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Current playlist */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-gray-900 truncate">
                      {currentPlaylistName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {currentSongsProgress} / {currentSongsTotal} songs processed
                    </p>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-accent-400 rounded-full transition-all duration-200"
                        style={{
                          width: currentSongsTotal > 0
                            ? `${(currentSongsProgress / currentSongsTotal) * 100}%`
                            : '0%',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {!isExporting && (
                <button
                  onClick={handleExport}
                  className="w-full bg-accent-500 hover:bg-accent-600 text-white font-semibold py-3 rounded-xl transition"
                >
                  Start Export
                </button>
              )}
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && (
            <div className="py-4">
              <div className="text-center mb-6">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    results.playlistsCreated > 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  {results.playlistsCreated > 0 ? (
                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <h3 className="text-lg font-display font-semibold text-brand-navy">
                  {results.playlistsCreated > 0 ? 'Export Complete!' : 'Export Failed'}
                </h3>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-accent-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-accent-700">
                    {results.playlistsCreated}
                  </p>
                  <p className="text-xs text-accent-600">
                    Playlist{results.playlistsCreated !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {results.songsExported}
                  </p>
                  <p className="text-xs text-green-600">
                    Song{results.songsExported !== 1 ? 's' : ''} Added
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-500">
                    {results.songsSkipped}
                  </p>
                  <p className="text-xs text-gray-500">Skipped</p>
                </div>
              </div>

              {/* Errors/warnings */}
              {results.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-amber-800 mb-1">Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-amber-700">
                    {results.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {results.playlistsCreated > 0 && (
                <p className="text-sm text-gray-500 text-center mb-4">
                  The playlists are now in the Apple Music library.
                  They may take a moment to appear on all devices.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
          {step === 1 && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={selectedPlaylistIds.size === 0}
                className="px-6 py-2 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!isAuthorized}
                className="px-6 py-2 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </>
          )}

          {step === 3 && (
            <>
              {!isExporting && (
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition"
                >
                  Back
                </button>
              )}
              {isExporting && <div />}
              <div />
            </>
          )}

          {step === 4 && (
            <>
              <div />
              <button
                onClick={onClose}
                className="px-6 py-2 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
