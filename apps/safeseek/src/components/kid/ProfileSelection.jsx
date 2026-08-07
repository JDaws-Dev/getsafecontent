import { useRef } from 'react';
import { Search, Sun, Moon, ArrowLeft, Lock } from 'lucide-react';
import { getColorClass, getAvatarIcon } from './utils';

export default function ProfileSelection({
  familyCode,
  kidProfiles,
  pinProfile,
  pinInput,
  pinError,
  isDark,
  onProfileClick,
  onPinChange,
  onPinKeyDown,
  onPinCancel,
  onToggleDarkMode,
  onChangeCode,
  pinRefs,
}) {
  return (
    <div className="min-h-screen bg-brand-cream dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent-600 rounded-lg flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white text-lg">SafeStudy</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={onChangeCode}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Change Code
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {pinProfile ? (
          /* PIN Entry Screen */
          <div className="text-center">
            <div className={`w-24 h-24 mx-auto mb-4 rounded-full ${getColorClass(pinProfile.color)} flex items-center justify-center shadow-lg`}>
              <span className="text-4xl drop-shadow-sm" aria-hidden="true">{getAvatarIcon(pinProfile.color)}</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">{pinProfile.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Enter your 4-digit PIN</p>

            <div className="flex justify-center gap-3 mb-4">
              {pinInput.map((digit, index) => (
                <input
                  key={index}
                  ref={pinRefs[index]}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => onPinChange(index, e.target.value)}
                  onKeyDown={(e) => onPinKeyDown(index, e)}
                  className={`w-14 h-14 text-center text-2xl font-bold text-gray-900 dark:text-white border-2 rounded-xl focus:outline-none focus:ring-2 transition ${
                    pinError
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 focus:ring-red-200 focus:border-red-500'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-accent-200 focus:border-accent-500'
                  }`}
                  autoComplete="off"
                />
              ))}
            </div>

            {pinError && (
              <p className="text-red-500 text-sm mb-4">{pinError}</p>
            )}

            <button
              onClick={onPinCancel}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium"
            >
              &larr; Choose different profile
            </button>
          </div>
        ) : (
          /* Profile Selection */
          <>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">Who's searching?</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Select your profile to get started</p>

            {kidProfiles && kidProfiles.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-6 max-w-2xl">
                {kidProfiles.map((profile) => (
                  <button
                    key={profile._id}
                    onClick={() => onProfileClick(profile)}
                    className="flex flex-col items-center gap-3 p-5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-accent-300 dark:hover:border-accent-600 transition-all duration-200 active:scale-[0.98]"
                  >
                    <div
                      className={`w-20 h-20 rounded-full shadow-md flex items-center justify-center ${getColorClass(profile.color)}`}
                    >
                      <span className="text-3xl drop-shadow-sm" aria-hidden="true">{getAvatarIcon(profile.color)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 dark:text-white font-semibold text-lg">{profile.name}</span>
                      {profile.hasPin && (
                        <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 max-w-sm">
                <div className="w-20 h-20 mx-auto mb-4 bg-accent-100 dark:bg-accent-900/40 rounded-full flex items-center justify-center">
                  <Search className="w-10 h-10 text-accent-600 dark:text-accent-400" />
                </div>
                <p className="text-gray-700 dark:text-gray-200 font-medium mb-2">No profiles found for this family code.</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Ask your parent to create a profile for you.</p>
              </div>
            )}

            {/* Family Code Display */}
            <div className="mt-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Your family's secret code</p>
              <span className="inline-block mt-1 px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-lg tracking-widest rounded-full border border-gray-200 dark:border-gray-700">{familyCode}</span>
            </div>

            {/* Parent Login Link */}
            <div className="mt-8 pt-8 border-t border-gray-200/60 dark:border-gray-700/60">
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
                Are you a parent?{' '}
                <a href="/login" className="text-accent-500 hover:text-accent-600 dark:text-accent-400 dark:hover:text-accent-300 font-medium">
                  Log in here &rarr;
                </a>
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
