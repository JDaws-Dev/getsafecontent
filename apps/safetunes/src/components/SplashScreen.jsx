import React, { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  "Loading your library...",
  "Checking safety filters...",
  "Curating the vibes...",
  "Almost ready...",
  "Tuning up...",
  "Making music safe...",
];

export function SplashScreen({ onComplete, minDuration = 2500 }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Cycle through loading messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Handle minimum display duration and exit
  useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        // Allow exit animation to play before calling onComplete
        setTimeout(onComplete, 500);
      }, minDuration);

      return () => clearTimeout(timer);
    }
  }, [onComplete, minDuration]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 25%, #c026d3 50%, #ec4899 75%, #9333ea 100%)',
          backgroundSize: '400% 400%',
        }}
      />

      {/* Floating orbs for depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-pink-400/20 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-[60%] right-[10%] w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-float-medium" />
        <div className="absolute bottom-[20%] left-[20%] w-48 h-48 bg-fuchsia-400/15 rounded-full blur-3xl animate-float-fast" />
      </div>

      {/* Subtle radial glow behind logo */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] animate-pulse-glow"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
        }}
      />

      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with breathing animation */}
        <div className="animate-breathe drop-shadow-2xl">
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute inset-0 animate-ring-pulse">
              <svg
                viewBox="0 0 120 120"
                className="w-32 h-32 sm:w-40 sm:h-40"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="55"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1"
                />
              </svg>
            </div>

            {/* Main logo */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 88.994 96.651"
              className="w-28 h-[120px] sm:w-36 sm:h-[156px] drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]"
            >
              <path
                fill="white"
                d="M44.516,0v47.835c-.628.592-1.894-.232-2.774-.408-10.205-2.043-21.424,7.753-16.888,18.082,5.228,11.906,24.562,7.626,26.602-4.966.158-12.344.543-24.817.231-37.18-.01-.404-.181-.761-.194-1.16.138-.314.351-.336.66-.321.458.023,2.31.729,2.842.955,4.05,1.723,9.412,6.762,9.412,11.473v4.972c0,.135-.441.687-.1.894,1.809-2.076,3.087-4.729,3.459-7.48,1.916-14.144-14.809-18.642-16.24-30.063-.068-.546-.203-1.066.494-.894,11.509,2.848,22.868,6.412,34.333,9.432,1.504.879,2.371,2.06,2.527,3.837-.747,15.337,2.184,31.696-3.436,46.306-5.899,15.337-19.374,26.415-34.03,33-1.43.642-4.278,1.969-5.692,2.264-2.548.531-7.594-1.962-10.028-3.123C16.659,84.376,1.212,67.91.153,45.855c-.49-10.206.391-20.798,0-31.045.116-1.814,1.557-3.391,3.234-3.926L43.071.047l1.445-.047Z"
              />
            </svg>
          </div>
        </div>

        {/* Brand name with fade-in */}
        <h1 className="mt-6 text-4xl sm:text-5xl font-bold text-white tracking-tight animate-fade-in-up drop-shadow-lg">
          SafeTunes
        </h1>

        {/* Loading status with cycling messages */}
        <div className="mt-8 flex items-center gap-2 animate-fade-in-up-delayed">
          <span className="text-white/90 text-lg font-medium min-w-[200px] text-center transition-all duration-300">
            {LOADING_MESSAGES[messageIndex]}
          </span>

          {/* Bouncing dots */}
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-white/80 rounded-full animate-bounce-dot-1" />
            <span className="w-2 h-2 bg-white/80 rounded-full animate-bounce-dot-2" />
            <span className="w-2 h-2 bg-white/80 rounded-full animate-bounce-dot-3" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 w-48 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full animate-progress"
            style={{ animationDuration: `${minDuration}ms` }}
          />
        </div>
      </div>

      {/* Bottom tagline */}
      <p className="absolute bottom-8 text-white/60 text-sm font-medium animate-fade-in-delayed">
        Music your family can trust
      </p>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 20px rgba(255,255,255,0.3));
          }
          50% {
            transform: scale(1.05);
            filter: drop-shadow(0 0 40px rgba(255,255,255,0.5));
          }
        }

        @keyframes ring-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.6;
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.8;
          }
        }

        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(5deg); }
          66% { transform: translate(-20px, 20px) rotate(-5deg); }
        }

        @keyframes float-medium {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-40px, -20px); }
        }

        @keyframes float-fast {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(20px, -15px); }
          75% { transform: translate(-15px, 10px); }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce-dot {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
        }

        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }

        .animate-gradient-shift {
          animation: gradient-shift 10s ease infinite;
        }

        .animate-breathe {
          animation: breathe 2s ease-in-out infinite;
        }

        .animate-ring-pulse {
          animation: ring-pulse 2s ease-in-out infinite;
        }

        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }

        .animate-float-slow {
          animation: float-slow 20s ease-in-out infinite;
        }

        .animate-float-medium {
          animation: float-medium 15s ease-in-out infinite;
        }

        .animate-float-fast {
          animation: float-fast 10s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }

        .animate-fade-in-up-delayed {
          opacity: 0;
          animation: fade-in-up 0.6s ease-out 0.3s forwards;
        }

        .animate-fade-in-delayed {
          opacity: 0;
          animation: fade-in-up 0.6s ease-out 0.6s forwards;
        }

        .animate-bounce-dot-1 {
          animation: bounce-dot 1.4s ease-in-out infinite;
        }

        .animate-bounce-dot-2 {
          animation: bounce-dot 1.4s ease-in-out 0.2s infinite;
        }

        .animate-bounce-dot-3 {
          animation: bounce-dot 1.4s ease-in-out 0.4s infinite;
        }

        .animate-progress {
          animation: progress linear forwards;
        }
      `}</style>
    </div>
  );
}

export default SplashScreen;
