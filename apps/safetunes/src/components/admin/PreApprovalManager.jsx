import { useState, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useToast } from '../common/Toast';

function PreApprovalManager({ user }) {
  const { showToast, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState('artists'); // artists, discover-genre, ai-recommendations
  const [selectedKidProfile, setSelectedKidProfile] = useState(null); // null = all kids

  // Fetch kid profiles
  const kidProfiles = useQuery(
    api.kidProfiles.getKidProfiles,
    user ? { userId: user._id } : 'skip'
  ) || [];

  // Fetch pre-approved content
  const preApprovedContent = useQuery(
    api.preApprovedContent.getPreApprovedContent,
    user ? { userId: user._id } : 'skip'
  );

  // Fetch discovery history for stats
  const discoveryHistory = useQuery(
    api.discovery.getDiscoveryHistory,
    user ? { userId: user._id } : 'skip'
  );

  // Mutations
  const preApproveArtist = useMutation(api.preApprovedContent.preApproveArtist);
  const removePreApproval = useMutation(api.preApprovedContent.removePreApproval);

  // AI Actions
  const getAiRecommendations = useAction(api.ai.recommendations.getAiRecommendations);

  // Artist form states
  const [artistName, setArtistName] = useState('');
  const [autoAdd, setAutoAdd] = useState(true);
  const [hideArtwork, setHideArtwork] = useState(false);
  const [notes, setNotes] = useState('');

  // Bulk import states
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkArtistText, setBulkArtistText] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);

  // Preset templates
  const agePresets = {
    '5-7': {
      name: 'Ages 5-7 (Preschool/Early Elementary)',
      artists: ['Disney', 'VeggieTales', 'Kidz Bop', 'The Wiggles', 'Raffi', 'Laurie Berkner', 'Super Simple Songs', 'Cocomelon'],
      description: 'Classic kids music, Disney, and educational songs'
    },
    '8-11': {
      name: 'Ages 8-11 (Elementary/Middle School)',
      artists: ['Taylor Swift', 'Ed Sheeran', 'Imagine Dragons', 'Disney', 'Kidz Bop', 'The Piano Guys', 'Pentatonix', 'Why Don\'t We'],
      description: 'Mainstream pop, Disney, and family-friendly hits'
    },
    '12-14': {
      name: 'Ages 12-14 (Tweens/Early Teens)',
      artists: ['Olivia Rodrigo', 'Billie Eilish', 'Harry Styles', 'The Weeknd', 'Ariana Grande', 'Shawn Mendes', 'Dua Lipa', 'BTS'],
      description: 'Popular music with parental guidance'
    }
  };

  const [showPresets, setShowPresets] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Discover by Genre states
  const [genreSearch, setGenreSearch] = useState('');
  const [genreResults, setGenreResults] = useState(null);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreError, setGenreError] = useState('');

  // AI Recommendations state
  const [aiKidAge, setAiKidAge] = useState('');
  const [aiPreferences, setAiPreferences] = useState('');
  const [aiGenres, setAiGenres] = useState('');
  const [aiRestrictions, setAiRestrictions] = useState('');
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Filter pre-approved content by type
  const artists = preApprovedContent?.filter(p => p.contentType === 'artist') || [];

  // Calculate discovery stats
  const discoveryStats = useMemo(() => {
    if (!discoveryHistory) return null;

    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const thisWeek = discoveryHistory.filter(d => d.discoveredAt >= oneWeekAgo);

    // Count by discovery method
    const methodCounts = thisWeek.reduce((acc, item) => {
      acc[item.discoveryMethod] = (acc[item.discoveryMethod] || 0) + 1;
      return acc;
    }, {});

    // Top artists
    const artistCounts = thisWeek.reduce((acc, item) => {
      acc[item.artistName] = (acc[item.artistName] || 0) + 1;
      return acc;
    }, {});

    const topArtists = Object.entries(artistCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // By kid
    const kidCounts = thisWeek.reduce((acc, item) => {
      const kidName = item.kidProfile?.name || 'Unknown';
      acc[kidName] = (acc[kidName] || 0) + 1;
      return acc;
    }, {});

    return {
      totalThisWeek: thisWeek.length,
      totalAllTime: discoveryHistory.length,
      methodCounts,
      topArtists,
      kidCounts,
    };
  }, [discoveryHistory]);

  // Handle artist pre-approval
  const handlePreApproveArtist = async (e) => {
    e.preventDefault();
    if (!artistName.trim()) return;

    try {
      await preApproveArtist({
        userId: user._id,
        kidProfileId: selectedKidProfile || undefined,
        artistName: artistName.trim(),
        autoAddToLibrary: autoAdd,
        hideArtwork: hideArtwork,
        notes: notes.trim() || undefined,
        preApprovedBy: user.name || user.email,
      });

      // Reset form
      setArtistName('');
      setNotes('');
      setAutoAdd(true);
      setHideArtwork(false);
      showToast(`Pre-approved ${artistName.trim()}!`, 'success');
    } catch (error) {
      console.error('Failed to pre-approve artist:', error);
      showToast('Failed to pre-approve artist. Please try again.', 'error');
    }
  };

  // Handle bulk artist import
  const handleBulkImport = async () => {
    if (!bulkArtistText.trim()) {
      showToast('Please enter at least one artist name', 'error');
      return;
    }

    const artistNames = bulkArtistText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (artistNames.length === 0) {
      showToast('Please enter at least one artist name', 'error');
      return;
    }

    setBulkImporting(true);
    let successCount = 0;
    let failedArtists = [];

    try {
      for (const name of artistNames) {
        try {
          await preApproveArtist({
            userId: user._id,
            kidProfileId: selectedKidProfile || undefined,
            artistName: name,
            autoAddToLibrary: autoAdd,
            hideArtwork: hideArtwork,
            notes: notes.trim() || undefined,
            preApprovedBy: user.name || user.email,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to pre-approve ${name}:`, error);
          failedArtists.push(name);
        }
      }

      if (successCount > 0) {
        showToast(`Pre-approved ${successCount} artist${successCount > 1 ? 's' : ''}!`, 'success');
      }

      if (failedArtists.length > 0) {
        showToast(`Failed to pre-approve ${failedArtists.length} artist${failedArtists.length > 1 ? 's' : ''}: ${failedArtists.join(', ')}`, 'error', { duration: 8000 });
      }

      // Reset form
      setBulkArtistText('');
      setShowBulkImport(false);
    } finally {
      setBulkImporting(false);
    }
  };

  // Handle applying age preset
  const handleApplyPreset = async (presetKey) => {
    const preset = agePresets[presetKey];
    if (!preset) return;

    setBulkImporting(true);
    let successCount = 0;
    let failedArtists = [];

    try {
      for (const name of preset.artists) {
        try {
          await preApproveArtist({
            userId: user._id,
            kidProfileId: selectedKidProfile || undefined,
            artistName: name,
            autoAddToLibrary: true,
            hideArtwork: false,
            notes: `From ${preset.name} preset`,
            preApprovedBy: user.name || user.email,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to pre-approve ${name}:`, error);
          failedArtists.push(name);
        }
      }

      if (successCount > 0) {
        showToast(`Applied ${preset.name} preset! Pre-approved ${successCount} artists.`, 'success', { duration: 6000 });
      }

      if (failedArtists.length > 0) {
        showToast(`Some artists failed: ${failedArtists.join(', ')}`, 'error', { duration: 8000 });
      }

      setShowPresets(false);
      setSelectedPreset(null);
    } finally {
      setBulkImporting(false);
    }
  };

  // Handle genre-based discovery (AI recommends artists/albums in a genre)
  const handleDiscoverByGenre = async (e) => {
    e.preventDefault();
    if (!genreSearch.trim()) {
      setGenreError('Please enter a genre to discover');
      return;
    }

    setGenreLoading(true);
    setGenreError('');
    setGenreResults(null);

    try {
      const result = await getAiRecommendations({
        musicPreferences: `Find safe, family-friendly music in the ${genreSearch} genre`,
        targetGenres: [genreSearch.trim()],
        restrictions: 'Family-friendly, no explicit content, appropriate for children',
      });

      setGenreResults(result);
    } catch (error) {
      console.error('Failed to discover by genre:', error);
      setGenreError('Failed to get recommendations. Please try again.');
    } finally {
      setGenreLoading(false);
    }
  };

  // Handle AI recommendations
  const handleGetAiRecommendations = async (e) => {
    e.preventDefault();
    if (!aiPreferences.trim()) {
      setAiError('Please describe your child\'s music preferences');
      return;
    }

    setAiLoading(true);
    setAiError('');
    setAiResults(null);

    try {
      const result = await getAiRecommendations({
        kidAge: aiKidAge ? parseInt(aiKidAge) : undefined,
        musicPreferences: aiPreferences,
        targetGenres: aiGenres ? aiGenres.split(',').map(g => g.trim()) : undefined,
        restrictions: aiRestrictions || undefined,
      });

      setAiResults(result);
    } catch (error) {
      console.error('Failed to get AI recommendations:', error);
      setAiError('Failed to get recommendations. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // Handle pre-approving from recommendations
  const handlePreApproveFromRecommendation = async (recommendation) => {
    try {
      if (recommendation.type === 'artist') {
        await preApproveArtist({
          userId: user._id,
          kidProfileId: selectedKidProfile || undefined,
          artistName: recommendation.name,
          autoAddToLibrary: true,
          notes: `AI recommended: ${recommendation.reason}`,
          preApprovedBy: user.name || user.email,
        });
        showToast(`Pre-approved ${recommendation.name}!`, 'success');
      } else {
        showToast('Can only pre-approve artists. Albums and genres must be reviewed individually.', 'info', { duration: 6000 });
      }
    } catch (error) {
      console.error('Failed to pre-approve from recommendation:', error);
      showToast('Failed to pre-approve. Please try again.', 'error');
    }
  };

  // Handle removing pre-approval
  const handleRemovePreApproval = async (preApprovalId) => {
    if (!confirm('Remove this pre-approval? Kids will no longer auto-discover this content.')) {
      return;
    }

    try {
      await removePreApproval({ preApprovalId });
      showToast('Pre-approval removed', 'success');
    } catch (error) {
      console.error('Failed to remove pre-approval:', error);
      showToast('Failed to remove pre-approval. Please try again.', 'error');
    }
  };

  return (
    <>
      {ToastContainer}
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Discovery & Pre-Approval</h2>
          <p className="text-white/90">
            Pre-approve artists so kids can discover music automatically. Use AI to find safe, appropriate music.
          </p>
        </div>

      {/* Kid Profile Selector */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pre-approve for:
        </label>
        <select
          value={selectedKidProfile || ''}
          onChange={(e) => setSelectedKidProfile(e.target.value || null)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">All Kids</option>
          {kidProfiles.map((kid) => (
            <option key={kid._id} value={kid._id}>
              {kid.name}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Setup with Age Presets */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border-2 border-green-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Setup
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Get started fast with age-appropriate presets. Click a preset below to pre-approve curated artists.
            </p>
          </div>
          {showPresets && (
            <button
              onClick={() => setShowPresets(false)}
              className="text-gray-400 hover:text-gray-600 p-1 ml-4"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(agePresets).map(([key, preset]) => (
            <div
              key={key}
              className="bg-white rounded-lg border-2 border-gray-200 hover:border-green-400 p-4 transition cursor-pointer"
              onClick={() => {
                setSelectedPreset(key);
                setShowPresets(true);
              }}
            >
              <h4 className="font-semibold text-gray-900 text-sm mb-1">{preset.name}</h4>
              <p className="text-xs text-gray-600 mb-2">{preset.description}</p>
              <div className="flex items-center gap-2 text-xs text-green-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {preset.artists.length} artists
              </div>
            </div>
          ))}
        </div>

        {/* Preset Details Modal */}
        {showPresets && selectedPreset && (
          <div className="mt-4 bg-white rounded-lg border-2 border-green-300 p-4">
            <h4 className="font-semibold text-gray-900 mb-2">
              {agePresets[selectedPreset].name}
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              This preset will pre-approve these artists:
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {agePresets[selectedPreset].artists.map((artist, idx) => (
                <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  {artist}
                </span>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleApplyPreset(selectedPreset)}
                disabled={bulkImporting}
                className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                {bulkImporting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Applying...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Apply Preset
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowPresets(false);
                  setSelectedPreset(null);
                }}
                disabled={bulkImporting}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Discovery Stats Dashboard */}
      {discoveryStats && discoveryStats.totalAllTime > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Discovery Activity
            </h3>
            <div className="text-sm text-gray-600">
              Last 7 days
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total this week */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">Albums Discovered</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">{discoveryStats.totalThisWeek}</p>
                  <p className="text-xs text-blue-600 mt-1">This week</p>
                </div>
                <svg className="w-12 h-12 text-blue-600 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            </div>

            {/* Top method */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Top Method</p>
                  <p className="text-lg font-bold text-green-900 mt-1 capitalize">
                    {Object.entries(discoveryStats.methodCounts).sort(([,a], [,b]) => b - a)[0]?.[0]?.replace('-', ' ') || 'N/A'}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {Object.entries(discoveryStats.methodCounts).sort(([,a], [,b]) => b - a)[0]?.[1] || 0} discoveries
                  </p>
                </div>
                <svg className="w-12 h-12 text-green-600 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>

            {/* Top artist */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-medium">Top Artist</p>
                  <p className="text-lg font-bold text-purple-900 mt-1 truncate">
                    {discoveryStats.topArtists[0]?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    {discoveryStats.topArtists[0]?.count || 0} albums
                  </p>
                </div>
                <svg className="w-12 h-12 text-purple-600 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* By Kid */}
          {Object.keys(discoveryStats.kidCounts).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Discovery by Child</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(discoveryStats.kidCounts).map(([kidName, count]) => (
                  <div
                    key={kidName}
                    className="bg-gray-100 px-4 py-2 rounded-full flex items-center gap-2"
                  >
                    <span className="text-sm font-medium text-gray-900">{kidName}</span>
                    <span className="text-xs bg-gray-800 text-white px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('artists')}
              className={`${
                activeTab === 'artists'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
              } py-4 px-6 font-medium text-sm transition flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Pre-Approved Artists
            </button>
            <button
              onClick={() => setActiveTab('discover-genre')}
              className={`${
                activeTab === 'discover-genre'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
              } py-4 px-6 font-medium text-sm transition flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Discover by Genre
            </button>
            <button
              onClick={() => setActiveTab('ai-recommendations')}
              className={`${
                activeTab === 'ai-recommendations'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900 hover:border-gray-300 border-b-2 border-transparent'
              } py-4 px-6 font-medium text-sm transition flex items-center gap-2`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Recommendations
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Pre-Approved Artists Tab */}
          {activeTab === 'artists' && (
            <div className="space-y-6">
              {/* Add Artist Form */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pre-Approve an Artist</h3>
                <form onSubmit={handlePreApproveArtist} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Artist Name
                    </label>
                    <input
                      type="text"
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      placeholder="e.g., VeggieTales, Disney, Taylor Swift"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoAdd}
                        onChange={(e) => setAutoAdd(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Auto-add to library</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hideArtwork}
                        onChange={(e) => setHideArtwork(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Hide artwork</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Why is this artist safe for kids?"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md"
                    >
                      Pre-Approve Artist
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkImport(!showBulkImport)}
                      className="px-6 py-3 border-2 border-purple-600 text-purple-600 hover:bg-purple-50 rounded-lg font-semibold transition flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Bulk Import
                    </button>
                  </div>
                </form>
              </div>

              {/* Bulk Import Modal */}
              {showBulkImport && (
                <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Bulk Import Artists</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Enter artist names, one per line. They'll all use the same settings (auto-add, hide artwork, notes).
                      </p>
                    </div>
                    <button
                      onClick={() => setShowBulkImport(false)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Artist Names (one per line)
                      </label>
                      <textarea
                        value={bulkArtistText}
                        onChange={(e) => setBulkArtistText(e.target.value)}
                        placeholder={"Taylor Swift\nEd Sheeran\nOlivia Rodrigo\nDisney\nVeggieTales"}
                        rows={8}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {bulkArtistText.split('\n').filter(line => line.trim()).length} artists to import
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleBulkImport}
                        disabled={bulkImporting || !bulkArtistText.trim()}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition shadow-md flex items-center justify-center gap-2"
                      >
                        {bulkImporting ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Importing...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Import All Artists
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setBulkArtistText('');
                          setShowBulkImport(false);
                        }}
                        disabled={bulkImporting}
                        className="px-6 py-3 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 rounded-lg font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Pre-Approved Artists List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Pre-Approved Artists ({artists.length})
                </h3>
                {artists.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p>No pre-approved artists yet</p>
                    <p className="text-sm mt-2">Pre-approve artists so kids can discover their music automatically</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {artists.map((artist) => (
                      <div key={artist._id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{artist.artistName}</h4>
                            <p className="text-sm text-gray-600">
                              {artist.kidProfileId
                                ? kidProfiles.find(k => k._id === artist.kidProfileId)?.name
                                : 'All Kids'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemovePreApproval(artist._id)}
                            className="text-red-600 hover:text-red-700 p-2"
                            title="Remove"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex gap-2 text-xs">
                          {artist.autoAddToLibrary && (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Auto-add</span>
                          )}
                          {artist.hideArtwork && (
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">Hidden artwork</span>
                          )}
                        </div>
                        {artist.notes && (
                          <p className="text-sm text-gray-600 mt-2">{artist.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Discover by Genre Tab */}
          {activeTab === 'discover-genre' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">How This Works</h4>
                    <p className="text-sm text-blue-800">
                      Search for a genre (e.g., "Christian", "Classical", "Kids Music") and AI will recommend specific artists and albums within that genre. You can then review and pre-approve individual artists - much safer than blanket approving an entire genre!
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleDiscoverByGenre} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Genre
                  </label>
                  <input
                    type="text"
                    value={genreSearch}
                    onChange={(e) => setGenreSearch(e.target.value)}
                    placeholder="e.g., Christian, Classical, Kids Music, Jazz"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={genreLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {genreLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Finding safe music in this genre...
                    </>
                  ) : (
                    'Get Recommendations'
                  )}
                </button>
              </form>

              {genreError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  {genreError}
                </div>
              )}

              {genreResults && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Safe Music in "{genreSearch}"
                    </h3>
                    {genreResults.fromCache && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        ⚡ From cache (saved ${genreResults.cacheHitCount > 0 ? '$0.002' : ''})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {genreResults.recommendations.filter(r => r.type === 'artist').map((rec, index) => (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{rec.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                          </div>
                        </div>
                        {rec.genres && rec.genres.length > 0 && (
                          <div className="flex gap-2 flex-wrap mt-2">
                            {rec.genres.map((genre, i) => (
                              <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => handlePreApproveFromRecommendation(rec)}
                          className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
                        >
                          Pre-Approve This Artist
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI Recommendations Tab */}
          {activeTab === 'ai-recommendations' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">AI-Powered Music Discovery</h4>
                    <p className="text-sm text-blue-800">
                      Describe your child's music taste and AI will recommend safe, appropriate artists. All recommendations are vetted for family-friendly content.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleGetAiRecommendations} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Child's Age (optional)
                  </label>
                  <input
                    type="number"
                    value={aiKidAge}
                    onChange={(e) => setAiKidAge(e.target.value)}
                    placeholder="8"
                    min="1"
                    max="17"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Music Preferences *
                  </label>
                  <textarea
                    value={aiPreferences}
                    onChange={(e) => setAiPreferences(e.target.value)}
                    placeholder="e.g., Likes Disney music, VeggieTales, and upbeat pop songs"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Genres (optional, comma-separated)
                  </label>
                  <input
                    type="text"
                    value={aiGenres}
                    onChange={(e) => setAiGenres(e.target.value)}
                    placeholder="e.g., Pop, Soundtrack, Christian"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restrictions (optional)
                  </label>
                  <input
                    type="text"
                    value={aiRestrictions}
                    onChange={(e) => setAiRestrictions(e.target.value)}
                    placeholder="e.g., No romance, no scary themes"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={aiLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Getting recommendations...
                    </>
                  ) : (
                    'Get AI Recommendations'
                  )}
                </button>
              </form>

              {aiError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  {aiError}
                </div>
              )}

              {aiResults && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Recommended Artists
                    </h3>
                    {aiResults.fromCache && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        ⚡ From cache (saved ${aiResults.cacheHitCount > 0 ? '$0.002' : ''})
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiResults.recommendations.filter(r => r.type === 'artist').map((rec, index) => (
                      <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{rec.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                          </div>
                        </div>
                        {rec.genres && rec.genres.length > 0 && (
                          <div className="flex gap-2 flex-wrap mt-2">
                            {rec.genres.map((genre, i) => (
                              <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => handlePreApproveFromRecommendation(rec)}
                          className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
                        >
                          Pre-Approve This Artist
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default PreApprovalManager;
