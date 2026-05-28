'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

/**
 * KidLoginGate — the family-code → profile-picker → PIN flow.
 *
 * Extracted from the standalone /start route (May 28, 2026) so /make
 * can render it inline when a kid has no session. Matches the unified
 * kid-route pattern used by SafeTunes (/play), SafeTube (/play), and
 * SafeReads (/read): one URL that gracefully handles both
 * "logged out → enter code" and "logged in → use the app."
 *
 * Behavior:
 *   - When `onSession` is provided (the /make embedded case), the gate
 *     writes the token to localStorage AND fires the callback so the
 *     parent component re-renders into the workbench. No navigation.
 *   - When `onSession` is NOT provided (the legacy /start route case),
 *     the gate writes localStorage and router.push('/make'). Old
 *     /start bookmarks keep working unchanged.
 */

const COLOR_CLASSES: Record<string, string> = {
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
};

export function KidLoginGate({
  onSession,
  showParentSkip,
  onSkipAsParent,
}: {
  onSession?: (token: string) => void;
  /** When true (Clerk-signed-in parent landed on /make), show a small
   *  "Just use it as me" link below the family code form so the parent
   *  can bypass the gate and use the workbench as themselves. */
  showParentSkip?: boolean;
  onSkipAsParent?: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [pinProfile, setPinProfile] = useState<{ _id: Id<'kidProfiles'>; displayName: string; avatarColor: string } | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const family = useQuery(
    api.families.lookupByCode,
    submitted ? { familyCode: submitted } : 'skip',
  );
  const startSession = useMutation(api.kidSessions.start);

  const onSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (normalized.length !== 6) {
      setError('Family code is 6 letters and numbers, like BRT47A.');
      return;
    }
    setError(null);
    setSubmitted(normalized);
  };

  const handleProfileTap = async (profile: { _id: Id<'kidProfiles'>; displayName: string; avatarColor: string; hasPin: boolean }) => {
    if (profile.hasPin) {
      setPinProfile(profile);
      return;
    }
    await enterAs(profile._id);
  };

  const enterAs = async (profileId: Id<'kidProfiles'>, withPin?: string) => {
    if (!family) return;
    const result = await startSession({
      familyId: family.familyId,
      kidProfileId: profileId,
      pin: withPin,
    });
    if (result.ok && result.token) {
      localStorage.setItem('lumiKidSession', result.token);
      if (onSession) {
        // Embedded in another route (/make) — let the parent component
        // re-render based on the new identity rather than navigating.
        onSession(result.token);
      } else {
        // Standalone (/start route) — push to /make so the kid lands
        // in the workbench. Preserves the original /start UX.
        router.push('/make');
      }
    } else {
      setError(result.error ?? 'Something went wrong.');
      setPin('');
    }
  };

  // Step 1: Code entry
  if (!submitted || family === null) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center space-y-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">SafeSpark</p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mt-2">
              Welcome back!
            </h1>
            <p className="text-base text-slate-600 mt-3">
              Type your family code to see your projects.
            </p>
          </div>
          <form onSubmit={onSubmitCode} className="space-y-3">
            <CodeInput value={code} onChange={setCode} />
            {family === null && submitted && (
              <p className="text-sm text-rose-600">No family with that code. Double-check with your parent.</p>
            )}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              disabled={code.length < 6}
              className="w-full px-6 py-3 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-white font-bold text-lg shadow-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Continue →
            </button>
          </form>
          <p className="text-xs text-slate-400">
            Ask your parent for the family code if you don&apos;t remember it.
          </p>
          {showParentSkip && onSkipAsParent && (
            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onSkipAsParent}
                className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-4"
              >
                I&apos;m a parent — just use it as me
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  if (family === undefined) {
    return <main className="flex-1 flex items-center justify-center text-slate-400">Looking up…</main>;
  }

  // Step 3: PIN entry
  if (pinProfile) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center space-y-6">
          <div
            className={`w-24 h-24 mx-auto rounded-full ${COLOR_CLASSES[pinProfile.avatarColor] ?? 'bg-violet-500'} flex items-center justify-center shadow-lg text-white text-4xl font-bold`}
          >
            {pinProfile.displayName.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{pinProfile.displayName}</h1>
          <p className="text-slate-500">Enter your 4-digit PIN</p>
          <PinInput value={pin} onChange={setPin} onComplete={(p) => enterAs(pinProfile._id, p)} />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            onClick={() => {
              setPinProfile(null);
              setPin('');
              setError(null);
            }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← back to family
          </button>
        </div>
      </main>
    );
  }

  // Step 2: Profile picker
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-500">Who&apos;s this?</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mt-2">
            Tap your tile.
          </h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {family.profiles.map((p) => (
            <button
              key={p._id}
              onClick={() => handleProfileTap(p)}
              className="p-5 rounded-3xl bg-white border border-violet-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition group"
            >
              <div
                className={`w-20 h-20 mx-auto rounded-full ${COLOR_CLASSES[p.avatarColor] ?? 'bg-violet-500'} flex items-center justify-center shadow-md group-hover:scale-105 transition text-white text-3xl font-bold`}
              >
                {p.displayName.charAt(0).toUpperCase()}
              </div>
              <p className="mt-3 font-bold text-slate-800">{p.displayName}</p>
              {p.hasPin && <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">🔒 PIN</p>}
            </button>
          ))}
        </div>
        {family.profiles.length === 0 && (
          <p className="text-slate-500 text-sm">
            No profiles in this family yet. Ask your parent to add one.
          </p>
        )}
        <button
          onClick={() => {
            setSubmitted('');
            setCode('');
          }}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← different family
        </button>
      </div>
    </main>
  );
}

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setAt = (i: number, char: string) => {
    const arr = digits.slice();
    arr[i] = char.toUpperCase();
    onChange(arr.join('').replace(/\s+$/, ''));
    if (char && i < 5) refs.current[i + 1]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="text"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => setAt(i, e.target.value.slice(-1))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i].trim() && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-3xl font-bold uppercase font-mono rounded-2xl border-2 border-violet-200 focus:outline-none focus:ring-4 focus:ring-violet-200 focus:border-violet-400 bg-white"
        />
      ))}
    </div>
  );
}

function PinInput({
  value,
  onChange,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete: (pin: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(4, ' ').slice(0, 4).split('');

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setAt = (i: number, char: string) => {
    if (char && !/^\d$/.test(char)) return;
    const arr = digits.slice();
    arr[i] = char;
    const next = arr.join('').replace(/\s+$/, '');
    onChange(next);
    if (char && i < 3) refs.current[i + 1]?.focus();
    if (next.length === 4) onComplete(next);
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => setAt(i, e.target.value.slice(-1))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i].trim() && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          className="w-14 h-16 text-center text-3xl font-bold rounded-2xl border-2 border-violet-200 focus:outline-none focus:ring-4 focus:ring-violet-200 focus:border-violet-400 bg-white"
        />
      ))}
    </div>
  );
}
