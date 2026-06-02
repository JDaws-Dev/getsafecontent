'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

/**
 * Tap-to-speak button.
 *
 * Primary path: OpenAI TTS-1 via Convex action — natural voice, hash-
 * cached server-side so re-tapping the same reply is free. Default
 * voice is `nova` (warm female, picked over `shimmer` for slightly
 * lower pitch — reads more like a tutor than a teenager).
 *
 * Fallback path: browser Web Speech Synthesis. Triggered when the
 * action returns ok:false (budget hit / API down / no key) so the
 * button still does *something* instead of erroring at the kid.
 */
export function SpeakButton({
  text,
  autoSpeak,
  sessionToken,
  voice,
}: {
  text: string;
  autoSpeak?: boolean;
  sessionToken?: string | null;
  voice?: string;
}) {
  const synthesize = useAction(api.ai.tts.synthesize);
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return true;
    // We need EITHER OpenAI (server) OR Web Speech (client) to render.
    // OpenAI is reachable from any browser, so always render if mounted.
    return true;
  });
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const autoSpokeRef = useRef(false);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    setSpeaking(false);
  }, []);

  const speakFallback = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => /Samantha|Karen|Google US English|Microsoft Aria|Microsoft Jenny/i.test(v.name)) ||
      voices.find((v) => v.lang === 'en-US') ||
      voices[0];
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [text]);

  const speak = useCallback(async () => {
    if (speaking || loading) {
      stop();
      return;
    }
    setLoading(true);
    try {
      const result = await synthesize({
        text,
        voice,
        sessionToken: sessionToken ?? undefined,
      });
      if (!result.ok) {
        // Budget / unavailable → fall back to Web Speech so the kid
        // still gets audio. budget refusal isn't surfaced visually
        // because we don't want a kid wondering "what's my budget."
        speakFallback();
        return;
      }
      const audio = new Audio(`data:audio/mpeg;base64,${result.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => {
        setSpeaking(false);
        speakFallback();
      };
      setSpeaking(true);
      await audio.play();
    } catch {
      speakFallback();
    } finally {
      setLoading(false);
    }
  }, [speaking, loading, stop, synthesize, text, voice, sessionToken, speakFallback]);

  useEffect(() => {
    if (!autoSpeak || autoSpokeRef.current || !text) return;
    autoSpokeRef.current = true;
    void speak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, text]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  if (!supported) return null;

  const active = speaking || loading;

  return (
    <button
      type="button"
      onClick={() => { void speak(); }}
      disabled={loading && !speaking}
      className={
        active
          ? 'inline-flex h-7 items-center gap-1 rounded-full bg-violet-600 px-2 text-[11px] font-black text-white shadow-sm hover:bg-violet-700 disabled:opacity-70'
          : 'inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 hover:border-violet-200 hover:text-violet-700'
      }
      title={active ? 'Tap to stop' : 'Tap to hear it'}
      aria-label={active ? 'Stop speaking' : 'Speak this'}
    >
      {active ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      {loading && !speaking ? '…' : speaking ? 'Stop' : 'Listen'}
    </button>
  );
}
