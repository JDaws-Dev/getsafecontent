'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import Link from 'next/link';
import { api } from '../../../../convex/_generated/api';

const INTEREST_SUGGESTIONS = [
  'dance', 'theatre', 'music', 'reading', 'art', 'coding', 'animals',
  'sports', 'nature', 'lego', 'cooking', 'fashion', 'video games',
  'percy jackson', 'harry potter', 'history', 'science', 'space',
  'horses', 'crafts', 'gymnastics', 'soccer', 'football', 'basketball',
];

const AVOID_SUGGESTIONS = [
  'no social media',
  'no dating talk',
  'no scary content',
  'no violence',
];

export default function ParentSetupPage() {
  const me = useQuery(api.users.getCurrent);
  const createProfile = useMutation(api.kidProfiles.create);

  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [sex, setSex] = useState<'boy' | 'girl'>('girl');
  const [interests, setInterests] = useState<string[]>([]);
  const [avoidTopics, setAvoidTopics] = useState<string[]>(['no social media']);
  const [customNote, setCustomNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdJoinCode, setCreatedJoinCode] = useState<string | null>(null);

  if (me === undefined) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!me || me.role !== 'parent') {
    return (
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Parent setup is for parents.</h1>
          <Link href="/" className="inline-block mt-4 text-violet-600 hover:text-violet-800">
            ← back
          </Link>
        </div>
      </main>
    );
  }

  if (createdJoinCode) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6 text-center">
          <h1 className="text-3xl font-bold text-slate-800">Profile created 🎉</h1>
          <p className="text-slate-600">
            This is your <strong>family code</strong>. Everyone in your family uses the same one
            to sign in on any device.
          </p>
          <div className="rounded-3xl bg-gradient-to-br from-violet-500 via-pink-500 to-amber-500 text-white p-8 shadow-xl">
            <p className="text-sm opacity-80 uppercase tracking-widest mb-2">Family code</p>
            <p className="text-6xl font-bold font-mono tracking-widest">{createdJoinCode}</p>
          </div>
          <p className="text-sm text-slate-500">
            On {displayName}&apos;s device, go to <span className="font-mono text-violet-600">/start</span> →
            enter the code → tap their tile → they&apos;re in.
          </p>

          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => {
                setCreatedJoinCode(null);
                setDisplayName('');
                setAge('');
                setInterests([]);
                setCustomNote('');
              }}
              className="px-5 py-2 rounded-2xl bg-white text-violet-600 border border-violet-200 font-medium hover:bg-violet-50"
            >
              Add another profile
            </button>
            <Link
              href="/parent"
              className="px-5 py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600"
            >
              Done — go to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const handleSubmit = async () => {
    if (!displayName.trim() || age === '' || !me) return;
    setSubmitting(true);
    try {
      const result = await createProfile({
        parentUserId: me._id,
        displayName: displayName.trim(),
        age: typeof age === 'number' ? age : parseInt(age, 10),
        sex,
        interests,
        avoidTopics,
        customNote: customNote.trim() || undefined,
      });
      // New shape (SafeFamily): create returns familyCode (shared across
      // all kids in the family). Same code reused for siblings.
      setCreatedJoinCode(result.familyCode ?? null);
    } catch (err) {
      console.error('Failed to create profile', err);
      alert('Something went wrong creating the profile. Open the console for details, or tell Jeremiah.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-500">
            Parent setup
          </p>
          <h1 className="text-3xl font-bold text-slate-800">Tell me about this profile</h1>
          <p className="text-slate-500 mt-1">
            Whether this is for you or a kid, SafeSpark tunes itself to who&apos;s using it.
            The more you share, the better Spark&apos;s suggestions land. None of this leaves the app.
          </p>
        </header>

        <div className="space-y-4">
          <Field label="Their name" required>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Bella, Theo, Maya…"
              className="w-full px-4 py-3 rounded-xl border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Age" required>
              <input
                type="number"
                min={5}
                max={18}
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                placeholder="12"
                className="w-full px-4 py-3 rounded-xl border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </Field>
            <Field label="Boy or girl" required>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSex('girl')}
                  className={
                    sex === 'girl'
                      ? 'flex-1 px-4 py-3 rounded-xl border-2 border-violet-500 bg-violet-50 text-violet-700 font-semibold'
                      : 'flex-1 px-4 py-3 rounded-xl border border-violet-200 text-slate-600 hover:bg-violet-50'
                  }
                >
                  Girl
                </button>
                <button
                  type="button"
                  onClick={() => setSex('boy')}
                  className={
                    sex === 'boy'
                      ? 'flex-1 px-4 py-3 rounded-xl border-2 border-violet-500 bg-violet-50 text-violet-700 font-semibold'
                      : 'flex-1 px-4 py-3 rounded-xl border border-violet-200 text-slate-600 hover:bg-violet-50'
                  }
                >
                  Boy
                </button>
              </div>
            </Field>
          </div>

          <Field label="What are they into right now?">
            <p className="text-xs text-slate-400 mb-2">Tap to add. Type your own and hit Enter.</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {interests.map((i) => (
                <button
                  key={i}
                  onClick={() => setInterests(interests.filter((x) => x !== i))}
                  className="px-3 py-1 rounded-full bg-violet-500 text-white text-sm"
                >
                  {i} ✕
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_SUGGESTIONS.filter((s) => !interests.includes(s)).map((s) => (
                <button
                  key={s}
                  onClick={() => setInterests([...interests, s])}
                  className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-sm hover:bg-violet-100 border border-violet-100"
                >
                  + {s}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add your own and press Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  setInterests([...interests, e.currentTarget.value.trim().toLowerCase()]);
                  e.currentTarget.value = '';
                  e.preventDefault();
                }
              }}
              className="w-full mt-2 px-4 py-2 rounded-xl border border-violet-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </Field>

          <Field label="Topics to avoid">
            <p className="text-xs text-slate-400 mb-2">Lumi will pivot away from anything you list here.</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {avoidTopics.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvoidTopics(avoidTopics.filter((x) => x !== a))}
                  className="px-3 py-1 rounded-full bg-rose-500 text-white text-sm"
                >
                  {a} ✕
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {AVOID_SUGGESTIONS.filter((s) => !avoidTopics.includes(s)).map((s) => (
                <button
                  key={s}
                  onClick={() => setAvoidTopics([...avoidTopics, s])}
                  className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-sm hover:bg-rose-100 border border-rose-100"
                >
                  + {s}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Anything else Lumi should know?">
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              rows={3}
              placeholder="They're in 7th grade homeschool. They tend to get discouraged when something doesn't work right away. They love when you ask about their dance routines."
              className="w-full px-4 py-3 rounded-xl border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </Field>
        </div>

        <div className="flex gap-3 pt-4">
          <Link
            href="/parent"
            className="px-5 py-3 rounded-2xl bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            disabled={!displayName.trim() || age === '' || submitting}
            onClick={handleSubmit}
            className="flex-1 px-5 py-3 rounded-2xl bg-violet-500 text-white font-semibold hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? 'Creating…' : 'Create profile + get join code'}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
