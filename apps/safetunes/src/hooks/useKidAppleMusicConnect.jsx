import { useCallback, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import musicKitService from '../config/musickit';

const PENDING_KEY = 'safetunes_pending_music_token';

function readKidSession() {
  try {
    const profile = JSON.parse(localStorage.getItem('safetunes_kid_profile') || 'null');
    const familyCode = localStorage.getItem('safetunes_family_code') || '';
    return profile?._id && familyCode ? { profileId: profile._id, familyCode } : null;
  } catch {
    return null;
  }
}

/** Kid login stashes the borrowed sign-in here; the dashboard applies it once MusicKit loads. */
export function stashPendingMusicToken(token) {
  try { localStorage.setItem(PENDING_KEY, token); } catch { /* storage blocked */ }
}

export async function applyPendingMusicToken() {
  let token = null;
  try {
    token = localStorage.getItem(PENDING_KEY);
    localStorage.removeItem(PENDING_KEY);
  } catch { /* storage blocked */ }
  if (!token || musicKitService.checkAuthorization()) return false;
  return musicKitService.useSharedMusicUserToken(token);
}

const PARENT_NOT_CONNECTED =
  'Ask a parent to open SafeTunes on their own phone or computer and connect Apple Music in Settings. Then tap Connect here again.';

/**
 * Kid side of "connect once": borrow the parent's Apple Music sign-in instead
 * of opening Apple's sign-in popup on the kid's device. Falls back to the popup
 * only when no parent has connected yet.
 *
 * `connect()` resolves true when the device is signed in. When the profile has
 * a PIN, it opens `pinPrompt` instead; render <KidPinPrompt {...pinPrompt} />.
 */
export function useKidAppleMusicConnect({ onConnected } = {}) {
  const claimForKid = useMutation(api.appleMusicConnection.claimForKid);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);

  const apply = useCallback(async (token) => {
    const ok = await musicKitService.useSharedMusicUserToken(token);
    if (ok) onConnected?.();
    return ok;
  }, [onConnected]);

  /** Quiet attempt on load: works for kids without a PIN, does nothing otherwise. */
  const connectSilently = useCallback(async () => {
    const session = readKidSession();
    if (!session || musicKitService.checkAuthorization()) return false;
    try {
      const result = await claimForKid(session);
      return result?.status === 'ok' ? apply(result.musicUserToken) : false;
    } catch {
      return false;
    }
  }, [claimForKid, apply]);

  const connect = useCallback(async () => {
    const session = readKidSession();
    const result = session ? await claimForKid(session).catch(() => null) : null;

    if (result?.status === 'ok') return apply(result.musicUserToken);
    if (result?.status === 'pinRequired') {
      setPinError('');
      setPinOpen(true);
      return false;
    }

    // No parent sign-in to borrow: fall back to Apple's own sign-in window.
    try {
      await musicKitService.authorize();
      onConnected?.();
      return true;
    } catch (error) {
      if (result?.status === 'notConnected' && error.code === 'POPUP_BLOCKED') {
        error.userMessage = PARENT_NOT_CONNECTED;
      }
      throw error;
    }
  }, [claimForKid, apply, onConnected]);

  const submitPin = useCallback(async (pin) => {
    const session = readKidSession();
    if (!session) return;
    setPinBusy(true);
    try {
      const result = await claimForKid({ ...session, pin });
      if (result?.status === 'ok') {
        setPinOpen(false);
        await apply(result.musicUserToken);
      } else if (result?.status === 'wrongPin') {
        const mins = Math.max(1, Math.ceil((result.retryAfterSeconds || 300) / 60));
        setPinError(result.locked ? `Too many tries. Ask a parent, or wait ${mins} min.` : 'That PIN is not right. Try again.');
      } else {
        setPinOpen(false);
        setPinError('');
      }
    } catch {
      setPinError('Something went wrong. Try again.');
    } finally {
      setPinBusy(false);
    }
  }, [claimForKid, apply]);

  return {
    connect,
    connectSilently,
    pinPrompt: {
      open: pinOpen,
      error: pinError,
      busy: pinBusy,
      onSubmit: submitPin,
      onClose: () => setPinOpen(false),
    },
  };
}

/** Small PIN sheet for borrowing the parent's Apple Music. */
export function KidPinPrompt({ open, error, busy, onSubmit, onClose }) {
  const [pin, setPin] = useState('');
  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (pin.length === 4) onSubmit(pin);
    setPin('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl"
      >
        <h3 className="font-display text-lg font-bold text-brand-navy">Enter your PIN</h3>
        <p className="mt-1 text-sm text-gray-600">This turns on your family's Apple Music here.</p>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-accent-500 focus:outline-none"
          aria-label="PIN"
        />
        {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-gray-100 py-3 font-bold text-gray-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || pin.length !== 4}
            className="flex-1 rounded-xl bg-accent-500 py-3 font-bold text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {busy ? 'Checking...' : 'Go'}
          </button>
        </div>
      </form>
    </div>
  );
}
