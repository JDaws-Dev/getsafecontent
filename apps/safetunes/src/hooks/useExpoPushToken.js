import { useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Hook to receive and save Expo push token from native app
 * Should be used in authenticated pages (AdminPage for parents, PlayerPage for kids)
 *
 * @param {object} options
 * @param {string} options.userId - Parent user ID (for parent pages)
 * @param {string} options.kidProfileId - Kid profile ID (for kid pages)
 */
export function useExpoPushToken({ userId, kidProfileId }) {
  const saveParentToken = useMutation(api.expoPushTokens.saveParentPushToken);
  const saveKidToken = useMutation(api.expoPushTokens.saveKidPushToken);
  const tokenSaved = useRef(false);

  useEffect(() => {
    // Only run if we're in the native app
    if (!window.isInSafeTunesApp) return;

    const handlePushToken = async (event) => {
      const { token } = event.detail;
      if (!token || tokenSaved.current) return;

      try {
        if (kidProfileId) {
          // Save token for kid
          await saveKidToken({ kidProfileId, expoPushToken: token });
          console.log('Saved Expo push token for kid:', kidProfileId);
        } else if (userId) {
          // Save token for parent
          await saveParentToken({ userId, expoPushToken: token });
          console.log('Saved Expo push token for parent:', userId);
        }
        tokenSaved.current = true;
      } catch (error) {
        console.error('Error saving push token:', error);
      }
    };

    // Listen for push token from native app
    window.addEventListener('expoPushToken', handlePushToken);

    // Request the token if we haven't received it yet
    if (window.requestExpoPushToken) {
      window.requestExpoPushToken();
    }

    return () => {
      window.removeEventListener('expoPushToken', handlePushToken);
    };
  }, [userId, kidProfileId, saveParentToken, saveKidToken]);
}
