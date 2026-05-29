import { useRef, useEffect } from 'react';
import { Search, Sparkles, Rocket, HelpCircle } from 'lucide-react';

const CODE_LENGTH = 6;

export default function FamilyCodeEntry({ codeInput, setCodeInput, error, codeShake, onSubmit }) {
  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const digits = codeInput.padEnd(CODE_LENGTH, ' ').slice(0, CODE_LENGTH).split('');

  const setDigitAt = (i, char) => {
    const next = digits.slice();
    next[i] = char;
    const joined = next.join('').replace(/\s+$/, '');
    setCodeInput(joined.toUpperCase());
  };

  const handleChange = (i, val) => {
    const char = val.slice(-1).toUpperCase();
    if (char && !/^[A-Z0-9]$/.test(char)) return;
    setDigitAt(i, char || ' ');
    if (char && i < CODE_LENGTH - 1) {
      inputRefs.current[i + 1]?.focus();
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (!digits[i].trim() && i > 0) {
        inputRefs.current[i - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      inputRefs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < CODE_LENGTH - 1) {
      inputRefs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData('text') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
    if (!text) return;
    setCodeInput(text);
    const nextFocus = Math.min(text.length, CODE_LENGTH - 1);
    setTimeout(() => inputRefs.current[nextFocus]?.focus(), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(codeInput.trim().toUpperCase());
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-6">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-gradient-to-br from-blue-200/40 to-cyan-200/40 dark:from-blue-500/10 dark:to-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-200/40 to-sky-200/40 dark:from-cyan-500/10 dark:to-sky-500/10 blur-3xl" />
        <Sparkles className="absolute top-[12%] right-[14%] w-6 h-6 text-cyan-300 dark:text-cyan-500/60 animate-pulse" aria-hidden="true" />
        <Rocket className="absolute bottom-[18%] left-[10%] w-7 h-7 text-blue-300 dark:text-blue-500/60 rotate-12" aria-hidden="true" />
      </div>

      <div className="relative w-full max-w-sm text-center">
        {/* Logo */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
          <Search className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Enter your family&rsquo;s secret code!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
          Ready to discover something new?
        </p>

        {error && (
          <div
            className={`bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4 ${codeShake ? 'animate-shake' : ''}`}
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-center gap-2">
            {digits.map((char, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={1}
                value={char.trim()}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className="w-11 h-14 sm:w-12 sm:h-16 text-center text-2xl font-mono font-bold bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/40 focus:border-blue-500 uppercase transition-all duration-150 shadow-sm"
                aria-label={`Family code character ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={codeInput.length < CODE_LENGTH}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 text-white py-3 rounded-xl font-bold text-lg shadow-md shadow-blue-500/20 transition-all duration-200 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]"
          >
            Let&rsquo;s Go! &rarr;
          </button>
        </form>

        <div className="mt-8 rounded-2xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-100 dark:border-gray-700 p-4">
          <p className="flex items-start gap-2 text-left text-sm text-gray-600 dark:text-gray-300">
            <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500 dark:text-blue-400" aria-hidden="true" />
            <span>
              <span className="font-semibold">Don&rsquo;t have a code?</span> Ask your parent &mdash; it&rsquo;s 6 letters and numbers.
            </span>
          </p>
        </div>

        <OtherSafeFamilyApps current="safestudy" familyCode={codeInput} />
      </div>
    </div>
  );
}

const OTHER_APPS = [
  { id: 'safetunes', label: 'Music', emoji: '🎵', host: 'https://getsafetunes.com', url: '/play', accent: 'text-pink-500' },
  { id: 'safetube', label: 'Video', emoji: '📺', host: 'https://getsafetube.com', url: '/play', accent: 'text-red-500' },
  { id: 'safereads', label: 'Books', emoji: '📚', host: 'https://getsafereads.com', url: '/read', accent: 'text-orange-500' },
  { id: 'safestudy', label: 'Search', emoji: '🔎', host: 'https://getsafestudy.com', url: '/play', accent: 'text-blue-500' },
  { id: 'safespark', label: 'Build', emoji: '✨', host: 'https://getsafespark.com', url: '/make', accent: 'text-violet-500' },
];

function OtherSafeFamilyApps({ current, familyCode }) {
  const others = OTHER_APPS.filter((a) => a.id !== current);
  const fc = (familyCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const suffix = fc.length === 6 ? `?fc=${fc}` : '';
  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500 mb-3 text-center">
        Other Safe Family apps
      </p>
      <div className="grid grid-cols-4 gap-2">
        {others.map((a) => (
          <a
            key={a.id}
            href={`${a.host}${a.url}${suffix}`}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <span className="text-2xl leading-none">{a.emoji}</span>
            <span className={`text-[11px] font-bold ${a.accent}`}>{a.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
