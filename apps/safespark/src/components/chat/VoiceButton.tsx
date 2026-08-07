'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';

/**
 * Voice input button — tap to start, tap again to stop.
 *
 * Web Speech API (Chrome/Edge). Browser does the transcription locally.
 * Continuous mode so a thinking pause doesn't end the recording.
 * Max 60s safety cap. Microphone-permission failures surface as a
 * visible message via onStatus so the parent can show "please allow mic".
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognition = any;

const MAX_RECORDING_MS = 60_000;

export function VoiceButton({
  onTranscript,
  onStatus,
  disabled,
}: {
  onTranscript: (text: string) => void;
  onStatus?: (status: string | null) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  // Lazy init avoids react-hooks/set-state-in-effect: we know on mount
  // whether SpeechRecognition exists, no need to flip via setState in an effect.
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const finalRef = useRef('');
  const interimRef = useRef('');
  const timeoutRef = useRef<number | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onStatusRef = useRef(onStatus);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result[0];
        if (!alt) continue;
        if (result.isFinal) {
          finalRef.current += alt.transcript;
        } else {
          interim += alt.transcript;
        }
      }
      interimRef.current = interim;
      const live = `${finalRef.current}${interim}`.trim();
      if (live) onStatusRef.current?.(`Listening: "${live}"`);
    };
    recognition.onend = () => {
      const text = `${finalRef.current} ${interimRef.current}`.trim();
      finalRef.current = '';
      interimRef.current = '';
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setRecording(false);
      if (text) onTranscriptRef.current(text);
      onStatusRef.current?.(null);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setRecording(false);
      finalRef.current = '';
      interimRef.current = '';
      const code = event?.error ?? 'unknown';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        onStatusRef.current?.('Mic blocked. Click the lock icon in the address bar and allow microphone.');
      } else if (code === 'no-speech') {
        onStatusRef.current?.('I did not hear anything. Tap the mic and try again.');
      } else if (code === 'audio-capture') {
        onStatusRef.current?.('No microphone found.');
      } else if (code !== 'aborted') {
        onStatusRef.current?.(`Mic error: ${code}`);
      }
    };
    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || disabled) return;
    finalRef.current = '';
    interimRef.current = '';
    try {
      rec.start();
      setRecording(true);
      onStatusRef.current?.('Listening… tap mic again to stop.');
      timeoutRef.current = window.setTimeout(() => stop(), MAX_RECORDING_MS);
    } catch {
      /* already running */
    }
  }, [disabled, stop]);

  const toggle = () => {
    if (recording) stop();
    else start();
  };

  if (!supported) {
    return (
      <button
        disabled
        title="Voice not supported on this browser"
        className="rounded-2xl bg-slate-100 text-slate-300 p-3 cursor-not-allowed"
        aria-label="Voice unavailable"
      >
        <MicOff className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={
        recording
          ? 'rounded-2xl bg-rose-500 text-white p-3 shadow-lg shadow-rose-200 animate-pulse'
          : 'rounded-2xl bg-accent-50 text-accent-700 p-3 hover:bg-accent-100 transition shadow-sm disabled:opacity-50'
      }
      title={recording ? 'Tap to stop' : 'Tap to talk'}
      aria-label={recording ? 'Stop voice input' : 'Start voice input'}
      aria-pressed={recording}
    >
      <Mic className="w-5 h-5" />
    </button>
  );
}
