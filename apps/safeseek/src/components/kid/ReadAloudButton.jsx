import { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { stripMarkdown } from './utils';

export default function ReadAloudButton({ text, className = '', iconSize = 'w-4 h-4' }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const handleToggle = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const stripped = stripMarkdown(text);
    if (!stripped) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(stripped);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`transition-colors ${className}`}
      aria-label={isSpeaking ? 'Stop reading' : 'Read aloud'}
      title={isSpeaking ? 'Stop reading' : 'Read aloud'}
    >
      {isSpeaking ? (
        <VolumeX className={iconSize} />
      ) : (
        <Volume2 className={iconSize} />
      )}
    </button>
  );
}
