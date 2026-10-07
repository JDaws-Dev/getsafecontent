import { useEffect, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import musicKitService from '../config/musickit';

/**
 * Parent side of "connect once": whenever this parent's device is signed in to
 * Apple Music, save that sign-in so the kids' devices can use it without
 * Apple's sign-in popup (which iPhone home-screen web apps can't open).
 *
 * Runs on dashboard load, so parents who connected before this existed are
 * picked up the next time they open SafeTunes, and again whenever any Connect
 * button signs them in.
 */
export function useShareAppleMusicWithKids(userToken) {
  const saveForFamily = useMutation(api.appleMusicConnection.saveForFamily);
  const lastSaved = useRef(null);

  useEffect(() => {
    if (!userToken) return undefined;
    let cancelled = false;
    let music = null;

    const share = () => {
      const musicUserToken = musicKitService.getMusicUserToken();
      if (!musicUserToken || musicUserToken === lastSaved.current) return;
      lastSaved.current = musicUserToken;
      saveForFamily({ userToken, musicUserToken }).catch((err) => {
        lastSaved.current = null;
        console.warn('[AppleMusic] Could not share sign-in with kids:', err?.message ?? err);
      });
    };

    musicKitService
      .initialize()
      .then((instance) => {
        if (cancelled || !instance) return;
        music = instance;
        music.addEventListener('authorizationStatusDidChange', share);
        share();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      music?.removeEventListener('authorizationStatusDidChange', share);
    };
  }, [userToken, saveForFamily]);
}
