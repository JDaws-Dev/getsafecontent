"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Volume2, Loader2 } from "lucide-react";

interface Definition {
  word: string;
  phonetic?: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
}

interface WordDefinitionProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function WordDefinition({ word, position, onClose }: WordDefinitionProps) {
  const [definition, setDefinition] = useState<Definition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const fetchDefinition = useCallback(async () => {
    const cleanWord = word.toLowerCase().replace(/[^a-z'-]/g, "");
    if (!cleanWord || cleanWord.length < 2) {
      setError("That's too short to look up!");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`
      );

      if (!response.ok) {
        setError("I don't know that word yet!");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const entry = data[0];

      if (!entry) {
        setError("I don't know that word yet!");
        setIsLoading(false);
        return;
      }

      // Find the first meaning with a definition
      const meaning = entry.meanings?.[0];
      const def = meaning?.definitions?.[0];

      // Find audio pronunciation
      const phonetics = entry.phonetics || [];
      const audio = phonetics.find(
        (p: { audio?: string }) => p.audio && p.audio.length > 0
      );

      setAudioUrl(audio?.audio || null);

      setDefinition({
        word: entry.word || cleanWord,
        phonetic: entry.phonetic || phonetics[0]?.text || undefined,
        partOfSpeech: meaning?.partOfSpeech || "word",
        definition: def?.definition || "No definition found.",
        example: def?.example || undefined,
      });
    } catch {
      setError("Couldn't look that up right now.");
    } finally {
      setIsLoading(false);
    }
  }, [word]);

  useEffect(() => {
    fetchDefinition();
  }, [fetchDefinition]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Delay attaching to avoid the same click that opened the popup
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside as EventListener);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside as EventListener);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => {});
    }
  };

  // Position the popup - keep it on screen, clamp for narrow viewports
  const popupWidth = Math.min(280, typeof window !== "undefined" ? window.innerWidth - 24 : 280);
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(Math.max(position.x - popupWidth / 2, 12), (typeof window !== "undefined" ? window.innerWidth : 375) - popupWidth - 12),
    top: Math.min(position.y + 20, (typeof window !== "undefined" ? window.innerHeight : 667) - 220),
    width: popupWidth,
    zIndex: 9999,
  };

  return (
    <div ref={popupRef} style={style} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="rounded-2xl border border-emerald-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-100 px-4 py-2.5">
          <span className="text-xs font-medium text-emerald-600">
            Word Lookup
          </span>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            </div>
          )}

          {error && (
            <div className="py-2 text-center">
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          )}

          {definition && (
            <div>
              {/* Word + pronunciation */}
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-gray-900">
                  {definition.word}
                </h4>
                {audioUrl && (
                  <button
                    onClick={playAudio}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    title="Listen to pronunciation"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {definition.phonetic && (
                <p className="mt-0.5 text-xs text-gray-400">
                  {definition.phonetic}
                </p>
              )}

              {/* Part of speech */}
              <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                {definition.partOfSpeech}
              </span>

              {/* Definition */}
              <p className="mt-2 text-sm leading-relaxed text-gray-700">
                {definition.definition}
              </p>

              {/* Example */}
              {definition.example && (
                <p className="mt-2 border-l-2 border-emerald-200 pl-3 text-xs italic text-gray-500">
                  &ldquo;{definition.example}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
