'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

/**
 * Tap-to-speak button. Uses Web Speech Synthesis (built into Chrome/Edge/Safari).
 * Tap once to start, tap again to stop. Picks a friendly voice when available.
 */
export function SpeakButton({ text, autoSpeak }: { text: string; autoSpeak?: boolean }) {
  // Initialize support lazily so we don't call setState in an effect just to
  // detect a missing API (avoids react-hooks/set-state-in-effect). This is a
  // 'use client' component so the initializer runs on the client.
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return true; // SSR fallback; will hydrate
    return Boolean(window.speechSynthesis);
  });
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const autoSpokeRef = useRef(false);

  const speak = useCallback(() => {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((voice) => /Samantha|Karen|Google US English|Microsoft Aria|Microsoft Jenny/i.test(voice.name)) ||
      voices.find((voice) => voice.lang === 'en-US') ||
      voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [supported, speaking, text]);

  useEffect(() => {
    if (!autoSpeak || autoSpokeRef.current || !text || !supported) return;
    autoSpokeRef.current = true;
    speak();
    // We intentionally exclude `speak` from deps — autoSpeak should fire once
    // per (autoSpeak, text, supported) change, not whenever speak's identity
    // changes (which depends on `speaking`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, text, supported]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={speak}
      className={
        speaking
          ? 'inline-flex h-7 items-center gap-1 rounded-full bg-violet-600 px-2 text-[11px] font-black text-white shadow-sm hover:bg-violet-700'
          : 'inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 hover:border-violet-200 hover:text-violet-700'
      }
      title={speaking ? 'Tap to stop' : 'Tap to hear it'}
      aria-label={speaking ? 'Stop speaking' : 'Speak this'}
    >
      {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      {speaking ? 'Stop' : 'Listen'}
    </button>
  );
}
