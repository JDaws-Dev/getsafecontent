import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

// Components
import ProfileSelector from '../components/kid/ProfileSelector';
import KidHome from '../components/kid/KidHome';
import VideoPlayer from '../components/kid/VideoPlayer';

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
    if (codeInput.trim()) {
      setFamilyCode(codeInput.trim().toUpperCase());
    }
  };

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
  };

  const handleBackToProfiles = () => {
    setSelectedProfile(null);
    setPlayingVideo(null);
  };

  // handlePlayVideo now accepts optional context for shorts navigation
  // context: { shortsList: Video[], isFromChannel: boolean }
  const handlePlayVideo = (video, context = null) => {
    // Check if video access is paused by parent
    if (currentProfile?.videoPaused) {
      setTimeLimitInfo({ reason: 'paused_by_parent' });
      setShowTimeLimitModal(true);
      return;
    }
    // Check time limits before playing
    if (canWatchStatus && !canWatchStatus.canWatch) {
      setTimeLimitInfo(canWatchStatus);
      setShowTimeLimitModal(true);
      return;
    }
    setPlayingVideo(video);
    setPlayContext(context);
  };

  const handleCloseVideo = () => {
    setPlayingVideo(null);
    setPlayContext(null);
  };

  // Handle playing next short (called from VideoPlayer)
  const handlePlayNextShort = (nextVideo) => {
    // Keep same context but switch video
    setPlayingVideo(nextVideo);
  };

  // Family code entry screen
  if (!familyCode || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
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
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="FAMILY CODE"
            maxLength={6}
            className="w-full text-center text-2xl font-mono tracking-widest bg-white border-2 border-gray-200 rounded-xl px-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 uppercase shadow-sm"
            autoFocus
          />
          {error && (
            <p className="text-red-500 text-sm text-center mt-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={codeInput.length < 6}
            className="w-full mt-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition shadow-md"
          >
            Enter
          </button>
        </form>

        <p className="text-gray-500 text-sm mt-8">
          Ask your parent for the family code
        </p>

        {/* Parent Login Link */}
        <div className="mt-8 pt-8 border-t border-gray-200 w-full max-w-xs">
          <p className="text-center text-gray-500 text-sm">
            Are you a parent?{' '}
            <Link to="/login" className="text-red-500 hover:text-red-600 font-medium">
              Log in here →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Trial expired screen
  if (isTrialExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex flex-col items-center justify-center p-6">
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
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition shadow-md"
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
              timeLimitInfo?.reason === 'paused_by_parent' ? 'bg-red-100' : 'bg-orange-100'
            }`}>
              {timeLimitInfo?.reason === 'paused_by_parent' ? (
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                Videos are available {timeLimitInfo.allowedStartHour < 12 ? timeLimitInfo.allowedStartHour : timeLimitInfo.allowedStartHour - 12}{timeLimitInfo.allowedStartHour < 12 ? 'AM' : 'PM'} - {timeLimitInfo.allowedEndHour < 12 ? timeLimitInfo.allowedEndHour : timeLimitInfo.allowedEndHour - 12}{timeLimitInfo.allowedEndHour < 12 ? 'AM' : 'PM'}
              </p>
            )}
            <button
              onClick={() => setShowTimeLimitModal(false)}
              className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-3 rounded-xl font-semibold transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
