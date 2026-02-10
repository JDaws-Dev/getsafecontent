import { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import musicKitService from '../../config/musickit';
import { useToast } from '../../contexts/ToastContext';

function AppleMusicAuth({ user, showOnlyWhenDisconnected = false }) {
  const { showToast } = useToast();
  const updateUser = useMutation(api.users.updateUser);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMusicKitReady, setIsMusicKitReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    checkMusicKitStatus();
  }, []);

  const checkMusicKitStatus = async () => {
    try {
      await musicKitService.initialize();
      setIsMusicKitReady(true);
      const authorized = musicKitService.checkAuthorization();
      setIsAuthorized(authorized);

      // If authorized, try to get user info
      if (authorized) {
        await fetchUserInfo();
      }
    } catch (err) {
      console.error('Failed to initialize MusicKit:', err);
      setIsMusicKitReady(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const music = musicKitService.music;
      if (music && music.isAuthorized) {
        // Try to get the user token which contains user info
        const musicUserToken = music.musicUserToken;
        console.log('Music User Token:', musicUserToken);

        // MusicKit v3 doesn't directly expose email, but we can show subscription status
        const storefront = music.storefrontId || 'us';
        setUserInfo({
          storefront: storefront,
          isSubscriber: music.isAuthorized, // If authorized, they have a subscription
        });
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  };

  const handleAuthorize = async () => {
    try {
      console.log('=== AUTHORIZATION STARTED ===');
      console.log('MusicKit instance:', musicKitService.music);
      console.log('Is initialized:', musicKitService.isInitialized);

      const token = await musicKitService.authorize();
      console.log('Authorization successful! Token:', token);

      setIsAuthorized(true);

      // Fetch user info after authorization
      await fetchUserInfo();

      // Save to database if user is logged in
      if (user) {
        await updateUser({
          userId: user._id,
          appleMusicAuthorized: true,
          appleMusicAuthDate: Date.now(),
        });
      }
    } catch (err) {
      console.error('=== AUTHORIZATION FAILED ===');
      console.error('Error object:', err);
      console.error('Error message:', err.message);
      console.error('Error code:', err.code);
      console.error('Error name:', err.name);
      console.error('Error stack:', err.stack);

      // More specific error messages
      let errorMessage = 'Failed to authorize with Apple Music.';
      if (err.message) {
        if (err.message.includes('popup') || err.message.includes('blocked')) {
          errorMessage = 'Popup was blocked. Please allow popups for this site in your browser settings and try again.';
        } else if (err.message.includes('subscription')) {
          errorMessage = 'You need an active Apple Music subscription to use this feature.';
        } else if (err.message.includes('USER_CANCELLED')) {
          errorMessage = 'Authorization was cancelled. Please try again and complete the sign-in process.';
        } else {
          errorMessage = `Authorization failed: ${err.message}`;
        }
      }

      showToast(errorMessage, 'error');
    }
  };

  const handleUnauthorize = async () => {
    if (!window.confirm('Are you sure you want to sign out of Apple Music?')) {
      return;
    }

    try {
      await musicKitService.unauthorize();
      setIsAuthorized(false);

      // Update database if user is logged in
      if (user) {
        await updateUser({
          userId: user._id,
          appleMusicAuthorized: false,
        });
      }
    } catch (err) {
      console.error('Unauthorization failed:', err);
      showToast('Failed to sign out. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center text-gray-600">
          <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Checking Apple Music status...
        </div>
      </div>
    );
  }

  if (!isMusicKitReady) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">MusicKit Not Configured</h3>
            <p className="text-sm text-yellow-800 mb-2">
              To enable Apple Music search and playback, you need to configure MusicKit.
            </p>
            <div className="text-sm text-yellow-800 space-y-1">
              <p><strong>Steps:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Get an Apple Developer account ($99/year)</li>
                <li>Create a MusicKit identifier and token</li>
                <li>Add <code className="bg-yellow-100 px-1 rounded">VITE_MUSICKIT_DEVELOPER_TOKEN</code> to your .env file</li>
                <li>Restart the dev server</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-12 h-12 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Connect to Apple Music
            </h3>
            <p className="text-gray-600 mb-4">
              Sign in with your Apple Music account to search for albums and preview content.
              You need an active Apple Music subscription.
            </p>
            <button
              onClick={handleAuthorize}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-semibold transition shadow-lg"
            >
              Sign in with Apple Music
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If showOnlyWhenDisconnected is true and user IS authorized, don't show anything
  if (showOnlyWhenDisconnected && isAuthorized) {
    return null;
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <svg className="w-6 h-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold text-green-900">Connected to Apple Music</p>
            <div className="text-sm text-green-700 space-y-0.5">
              <p>You can now search and preview albums</p>
              {userInfo && (
                <p className="flex items-center gap-2">
                  <span className="font-medium">Region:</span>
                  <span className="uppercase">{userInfo.storefront}</span>
                  {user?.appleMusicAuthDate && (
                    <>
                      <span className="text-green-600">•</span>
                      <span>Connected {new Date(user.appleMusicAuthDate).toLocaleDateString()}</span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handleUnauthorize}
          className="text-sm text-green-700 hover:text-green-900 font-medium ml-4 flex-shrink-0"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default AppleMusicAuth;
