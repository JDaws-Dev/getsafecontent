import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';
import { AVATAR_ICONS, COLORS } from '../../constants/avatars';

/**
 * Parent-facing LISTENING HISTORY — full disclosure of a kid's activity.
 *
 * Complements the aggregate Listening Stats: this is the itemised record of
 * what actually happened — every song/album played (newest first), every
 * search we blocked, and everything auto-added via discovery. Pick a kid,
 * pick a time range. Data comes from api.listeningHistory.getKidActivity,
 * which hard-checks that the signed-in parent owns the profile.
 */

const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 0, label: 'All time' },
];

function getAvatarIcon(avatarId) {
  const icon = AVATAR_ICONS.find((a) => a.id === avatarId);
  return icon ? icon.svg : AVATAR_ICONS[0].svg;
}

function getColorHex(colorId) {
  const colorMap = {
    purple: '#8B5CF6',
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    pink: '#EC4899',
    red: '#EF4444',
    indigo: '#6366F1',
    orange: '#F97316',
    teal: '#14B8A6',
    cyan: '#06B6D4',
  };
  return colorMap[colorId] || colorMap.purple;
}

function formatDuration(ms) {
  if (!ms || ms < 1000) return null;
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return 'Under a minute';
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatWhen(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatExactWhen(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const DISCOVERY_LABELS = {
  'artist-match': 'Matched an approved artist',
  'genre-match': 'Matched an approved genre',
  'search-auto-approved': 'Auto-approved from search',
  'ai-recommended': 'AI recommended',
};

function artwork(url, size) {
  if (!url) return null;
  return url.replace('{w}', String(size)).replace('{h}', String(size));
}

// Small square icon used when there's no artwork
function NoteIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
    </svg>
  );
}

function ListeningHistory({ user }) {
  const { token } = useAuth();

  const kidProfiles = useQuery(
    api.kidProfiles.getKidProfiles,
    user ? { userId: user._id, userToken: token ?? undefined } : 'skip'
  ) || [];

  const [selectedKidId, setSelectedKidId] = useState(null);
  const [days, setDays] = useState(30);

  // Default to the first kid once profiles load.
  useEffect(() => {
    if (!selectedKidId && kidProfiles.length > 0) {
      setSelectedKidId(kidProfiles[0]._id);
    }
  }, [kidProfiles, selectedKidId]);

  const activity = useQuery(
    api.listeningHistory.getKidActivity,
    selectedKidId
      ? { kidProfileId: selectedKidId, days, userToken: token ?? undefined }
      : 'skip'
  );

  // No kids yet
  if (kidProfiles.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-brand-navy">Activity History</h2>
          <p className="text-gray-600 mt-1">Everything your kids have been doing in SafeTunes</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
          <div className="w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No kid profiles yet</h3>
          <p className="text-gray-600">Once you add a child and they start listening, everything they play, search, and discover will show up here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-bold text-brand-navy">Activity History</h2>
        <p className="text-gray-600 mt-1">
          Full disclosure — every song played, every blocked search, and everything auto-added, newest first.
        </p>
      </div>

      {/* Kid picker */}
      <div className="flex flex-wrap gap-2">
        {kidProfiles.map((kid) => {
          const active = selectedKidId === kid._id;
          const color = getColorHex(kid.color);
          return (
            <button
              key={kid._id}
              onClick={() => setSelectedKidId(kid._id)}
              className={`flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full border transition ${
                active
                  ? 'border-accent-500 bg-accent-50 text-accent-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white p-1"
                style={{ backgroundColor: color }}
              >
                {getAvatarIcon(kid.avatar)}
              </span>
              <span className="font-medium text-sm">{kid.name}</span>
            </button>
          );
        })}
      </div>

      {/* Time range filter */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              days === r.days
                ? 'bg-accent-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {selectedKidId && activity === undefined && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
        </div>
      )}

      {activity && (
        <>
          {/* Summary counts */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
              <div className="text-2xl font-bold text-accent-600">{activity.counts.played}</div>
              <div className="text-xs text-gray-500 mt-1">Played</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
              <div className="text-2xl font-bold text-red-500">{activity.counts.blocked}</div>
              <div className="text-xs text-gray-500 mt-1">Blocked searches</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 text-center">
              <div className="text-2xl font-bold text-green-600">{activity.counts.discovered}</div>
              <div className="text-xs text-gray-500 mt-1">Auto-added</div>
            </div>
          </div>

          {/* Played */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <h3 className="font-semibold text-gray-900">Songs &amp; albums played</h3>
            </div>
            {activity.played.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">
                Nothing played in this time range. Try a longer range, or check back after your child listens.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {activity.played.map((item) => {
                  const listen = formatDuration(item.totalListenTimeMs);
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-3">
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        {artwork(item.artworkUrl, 44) ? (
                          <img src={artwork(item.artworkUrl, 44)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <NoteIcon className="w-6 h-6 text-accent-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{item.itemName}</div>
                        <div className="text-sm text-gray-500 truncate">
                          {item.artistName || 'Unknown artist'}
                          {item.itemType && item.itemType !== 'song' && (
                            <span className="ml-1 text-gray-400">· {item.itemType}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-gray-500" title={formatExactWhen(item.playedAt)}>
                          {formatWhen(item.playedAt)}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {item.playCount > 1 ? `${item.playCount} plays` : '1 play'}
                          {listen ? ` · ${listen}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activity.played.length > 0 && (
              <p className="text-xs text-gray-400 mt-4">
                Shown newest first by the most recent time each item was played. Repeated plays of the same song are counted together.
              </p>
            )}
          </div>

          {/* Blocked searches */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <h3 className="font-semibold text-gray-900">Searches we blocked</h3>
            </div>
            {activity.blocked.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">
                No blocked searches in this time range. When your child searches for something off-limits, it&apos;s stopped and listed here.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {activity.blocked.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">&ldquo;{item.searchQuery}&rdquo;</div>
                      <div className="text-sm text-gray-500 truncate">Blocked: {item.blockedReason}</div>
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0" title={formatExactWhen(item.searchedAt)}>
                      {formatWhen(item.searchedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discovery / auto-added */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <h3 className="font-semibold text-gray-900">Auto-added by discovery</h3>
            </div>
            {activity.discovered.length === 0 ? (
              <p className="text-gray-500 text-sm py-4">
                Nothing was auto-added in this time range. When music matches an artist or genre you&apos;ve pre-approved, it&apos;s added automatically and listed here.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {activity.discovered.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3">
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                      {artwork(item.artworkUrl, 44) ? (
                        <img src={artwork(item.artworkUrl, 44)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <NoteIcon className="w-6 h-6 text-accent-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{item.albumName}</div>
                      <div className="text-sm text-gray-500 truncate">{item.artistName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {DISCOVERY_LABELS[item.discoveryMethod] || item.discoveryMethod}
                        {item.autoAddedToLibrary ? ' · added to library' : ''}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0" title={formatExactWhen(item.discoveredAt)}>
                      {formatWhen(item.discoveredAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ListeningHistory;
