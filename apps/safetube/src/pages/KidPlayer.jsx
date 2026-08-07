import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

// Components
import ProfileSelector from '../components/kid/ProfileSelector';
import KidHome from '../components/kid/KidHome';
import VideoPlayer from '../components/kid/VideoPlayer';
import SafeFamilySwitcher from '../components/SafeFamilySwitcher';

export default function KidPlayer() {
  const { familyCode: urlFamilyCode } = useParams();
  const navigate = useNavigate();

  // State
  const [familyCode, setFamilyCode] = useState(urlFamilyCode || '');
  const [codeInput, setCodeInput] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [playContext, setPlayContext] = useState(null); // { shortsList, isFromChannel }
  const [error, setError] = useState('');
  const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);
  const [timeLimitInfo, setTimeLimitInfo] = useState(null);

  // Get user by family code
  const user = useQuery(
    api.users.getUserByFamilyCode,
    familyCode ? { familyCode } : 'skip'
  );

  // Get kid profiles for this family
  const kidProfilesData = useQuery(
    api.kidProfiles.getKidProfilesByFamilyCode,
    familyCode ? { familyCode } : 'skip'
  );

  // Extract profiles and trial status
  const kidProfiles = kidProfilesData?.profiles;
  const isTrialExpired = kidProfilesData?.isTrialExpired;

  // Keep selected profile in sync with latest Convex data
  // This ensures changes made by parent (like requestsEnabled) are reflected immediately
  const currentProfile = selectedProfile
    ? kidProfiles?.find(p => p._id === selectedProfile._id) || selectedProfile
    : null;

  // Get playable content for selected profile
  const content = useQuery(
    api.videos.getPlayableContent,
    selectedProfile?._id ? { kidProfileId: selectedProfile._id } : 'skip'
  );

  // Check if kid can watch (time limits)
  const canWatchStatus = useQuery(
    api.timeLimits.canWatch,
    selectedProfile?._id ? { kidProfileId: selectedProfile._id } : 'skip'
  );

  const redeemKidPass = useMutation(api.kidPass.redeemKidPass);

  // Boot from another Safe Family app's cross-app switcher. A kid pass (?kt=)
  // wins: it proves the kid was already authenticated in a sibling app, so we
  // drop them straight onto the player with no code screen AND no PIN. A bare
  // family code (?fc=ABCDEF) is the fallback — it only pre-fills the code so
  // the kid still picks a profile (and enters a PIN if set). Either way we
  // strip both params from the URL immediately so a live credential never
  // lingers in history/referrer. Runs once on mount.
  useEffect(() => {
    const url = new URL(window.location.href);
    const ktParam = url.searchParams.get('kt');
    const fcParam = url.searchParams.get('fc');
    if (!ktParam && !fcParam) return;

    // Strip the credentials from the URL right away.
    url.searchParams.delete('kt');
    url.searchParams.delete('fc');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);

    const applyFamilyCode = () => {
      if (!fcParam) return;
      const normalized = fcParam.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (normalized.length === 6 && !familyCode) {
        setFamilyCode(normalized);
        setCodeInput(normalized);
      } else if (normalized.length > 0) {
        setCodeInput(normalized);
      }
    };

    const boot = async () => {
      if (ktParam) {
        try {
          const res = await redeemKidPass({ token: ktParam });
          if (res?.ok) {
            // Same as a successful profile + PIN login: set the family code and
            // the selected kid, then KidHome renders straight away.
            setFamilyCode(res.familyCode);
            setSelectedProfile(res.profile);
            setCodeInput(res.familyCode);
            return;
          }
          // Pass failed (expired / no matching kid in this app). Fall back to
          // the family code the pass carried, if any, so the kid just picks a
          // profile instead of re-typing the code.
          if (res?.familyCode && !familyCode) {
            setFamilyCode(res.familyCode);
            setCodeInput(res.familyCode);
            return;
          }
        } catch {
          // network / server hiccup — fall through to the ?fc= behavior
        }
      }
      applyFamilyCode();
    };

    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Validate family code when entered
  useEffect(() => {
    if (familyCode && user === null) {
      setError('Invalid family code');
    } else {
      setError('');
    }
  }, [familyCode, user]);

  // Update URL when code changes
  useEffect(() => {
    if (familyCode && user) {
      navigate(`/play/${familyCode}`, { replace: true });
    }
  }, [familyCode, user, navigate]);

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    const trimmed = codeInput.trim();
    if (trimmed.length < 6) {
      setError("Your family code is 6 letters and numbers. Ask your parent!");
      return;
    }
    setError('');
    setFamilyCode(trimmed.toUpperCase());
  };

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
  };

  const handleBackToProfiles = () => {
    setSelectedProfile(null);
    setPlayingVideo(null);
  };

  // Single source of truth for whether playback is currently allowed.
  // Returns a restriction object to block on, or null to allow.
  // `strict` fails CLOSED while the limit query is still loading — used for
  // unattended shorts auto-advance so a pending/stale query can't leak videos.
  const getPlaybackRestriction = ({ strict = false } = {}) => {
    if (currentProfile?.videoPaused) return { reason: 'paused_by_parent' };
    if (!canWatchStatus) return strict ? { reason: 'loading' } : null;
    if (!canWatchStatus.canWatch) return canWatchStatus;
    return null;
  };

  // 24h hour -> "12AM".."11AM".."12PM".."11PM" (0 and 12 must not render as "0").
  const formatHour12 = (h) => `${(h % 12) || 12}${h < 12 ? 'AM' : 'PM'}`;

  const showRestrictionModal = (restriction) => {
    // 'loading' is a transient unknown — block playback but don't flash a
    // scary "Time's Up" modal at the kid.
    if (restriction.reason === 'loading') return;
    setTimeLimitInfo(restriction);
    setShowTimeLimitModal(true);
  };

  // handlePlayVideo accepts optional context for shorts navigation
  // context: { shortsList: Video[], isFromChannel: boolean }
  const handlePlayVideo = (video, context = null) => {
    const restriction = getPlaybackRestriction();
    if (restriction) {
      showRestrictionModal(restriction);
      return;
    }
    setPlayingVideo(video);
    setPlayContext(context);
  };

  const handleCloseVideo = () => {
    setPlayingVideo(null);
    setPlayContext(null);
  };

  // Handle playing next short (called from VideoPlayer when a short ends).
  // Gated identically to handlePlayVideo — plus fail-closed while the limit
  // query is loading — because this auto-advance path previously bypassed the
  // daily cap entirely (a kid could binge shorts far past their limit:
  // observed 208 min against a 90 min cap).
  const handlePlayNextShort = (nextVideo) => {
    const restriction = getPlaybackRestriction({ strict: true });
    if (restriction) {
      setPlayingVideo(null);
      setPlayContext(null);
      showRestrictionModal(restriction);
      return;
    }
    // Keep same context but switch video
    setPlayingVideo(nextVideo);
  };

  // Family code entry screen
  if (!familyCode || !user) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SafeTube</h1>
          <p className="text-gray-600">Enter your family code to watch videos</p>
        </div>

        <form onSubmit={handleCodeSubmit} className="w-full max-w-xs">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value.toUpperCase());
              if (error) setError('');
            }}
            placeholder="ABC123"
            maxLength={6}
            className="w-full text-center text-2xl font-mono tracking-widest bg-white border-2 border-gray-200 rounded-xl px-4 py-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100 uppercase shadow-sm"
            autoFocus
          />
          <p className="text-gray-500 text-xs text-center mt-2">
            6 letters and numbers from your parent
          </p>
          {error && (
            <p className="text-accent-500 text-sm text-center mt-2">{error}</p>
          )}
          <button
            type="submit"
            className="w-full mt-4 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white py-3 rounded-xl font-semibold transition shadow-md active:scale-[0.98]"
          >
            Let's Go! →
          </button>
        </form>

        {/* Parent Login Link */}
        <div className="mt-8 pt-8 border-t border-gray-200 w-full max-w-xs">
          <p className="text-center text-gray-500 text-sm">
            Are you a parent?{' '}
            <Link to="/login" className="text-accent-500 hover:text-accent-600 font-medium">
              Log in here →
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 w-full max-w-xs">
          <SafeFamilySwitcher current="safetube" familyCode={codeInput} />
        </div>
      </div>
    );
  }

  // Trial expired screen
  if (isTrialExpired) {
    return (
      <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Videos Unavailable</h1>
          <p className="text-gray-600 mb-6">
            Ask your parent to update SafeTube so you can watch videos again!
          </p>
          <button
            onClick={() => setFamilyCode('')}
            className="bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white px-6 py-3 rounded-xl font-semibold transition shadow-md"
          >
            Try Different Code
          </button>
        </div>
      </div>
    );
  }

  // Profile selection screen
  if (!currentProfile) {
    return (
      <ProfileSelector
        profiles={kidProfiles || []}
        onSelect={handleProfileSelect}
        familyCode={familyCode}
        onChangeCode={() => setFamilyCode('')}
      />
    );
  }

  // Kid's home screen (browse content)
  // IMPORTANT: Always render KidHome so it preserves state (selected channel, tab, etc.)
  // When a video is playing, KidHome is hidden but stays mounted
  // VideoPlayer renders via portal on top
  return (
    <>
      {/* Hide KidHome when video is playing, but keep it mounted to preserve state */}
      <div style={{ display: playingVideo ? 'none' : 'block' }}>
        <KidHome
          profile={currentProfile}
          channels={content?.channels || []}
          videos={content?.videos || []}
          onBack={handleBackToProfiles}
          onPlayVideo={handlePlayVideo}
          canWatchStatus={canWatchStatus}
          userId={user?._id}
          onSwitchProfile={handleBackToProfiles}
        />
      </div>

      {/* Video player (full screen) - renders via portal */}
      {/* key={playingVideo.videoId} forces React to unmount/remount when switching videos */}
      {playingVideo && (
        <VideoPlayer
          key={playingVideo.videoId}
          video={playingVideo}
          kidProfileId={currentProfile._id}
          onClose={handleCloseVideo}
          shortsList={playContext?.shortsList || []}
          isFromChannel={playContext?.isFromChannel || false}
          onPlayNext={handlePlayNextShort}
        />
      )}

      {/* Time Limit / Video Paused Modal */}
      {showTimeLimitModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
              timeLimitInfo?.reason === 'paused_by_parent' ? 'bg-accent-100' : 'bg-orange-100'
            }`}>
              {timeLimitInfo?.reason === 'paused_by_parent' ? (
                <svg className="w-10 h-10 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {timeLimitInfo?.reason === 'paused_by_parent' ? 'Videos Paused' : "Time's Up!"}
            </h2>
            <p className="text-gray-600 mb-4">
              {timeLimitInfo?.reason === 'paused_by_parent'
                ? "Your parent has paused video access. Ask them to turn it back on!"
                : timeLimitInfo?.reason === 'outside_hours'
                ? "It's not time for videos right now. Come back later!"
                : "You've watched enough videos for today. Come back tomorrow!"}
            </p>
            {timeLimitInfo?.minutesRemaining !== undefined && timeLimitInfo?.minutesRemaining <= 0 && timeLimitInfo?.reason !== 'outside_hours' && timeLimitInfo?.reason !== 'paused_by_parent' && (
              <p className="text-gray-500 text-sm mb-4">
                Daily limit: {Math.floor((timeLimitInfo?.dailyLimitMinutes || 0) / 60)}h {(timeLimitInfo?.dailyLimitMinutes || 0) % 60}m
              </p>
            )}
            {timeLimitInfo?.reason === 'outside_hours' && timeLimitInfo?.allowedStartHour !== undefined && (
              <p className="text-gray-500 text-sm mb-4">
                Videos are available {formatHour12(timeLimitInfo.allowedStartHour)} - {formatHour12(timeLimitInfo.allowedEndHour)}
              </p>
            )}
            <button
              onClick={() => setShowTimeLimitModal(false)}
              className="w-full bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white py-3 rounded-xl font-semibold transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}

