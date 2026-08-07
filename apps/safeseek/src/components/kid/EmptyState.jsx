import { Search, X, Image as ImageIcon, BookOpen, GraduationCap } from 'lucide-react';

export default function EmptyState({
  selectedProfile,
  introDismissed,
  randomSuggestions,
  onDismissIntro,
  onSuggestionClick,
}) {
  const showIntro = !introDismissed && !localStorage.getItem(`safestudy_kid_intro_${selectedProfile?._id}`);

  return (
    <div className="text-center pt-12">
      {/* First-time walkthrough */}
      {showIntro && (
        <div className="max-w-lg mx-auto mb-8 bg-gradient-to-br from-accent-50 to-accent-50 dark:from-accent-900/20 dark:to-accent-900/20 border border-accent-100 dark:border-accent-800 rounded-2xl p-5 text-left relative">
          <button
            onClick={() => {
              localStorage.setItem(`safestudy_kid_intro_${selectedProfile?._id}`, 'true');
              onDismissIntro();
            }}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-3">Welcome to SafeStudy! Here's how it works:</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-accent-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Search className="w-3 h-3 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">Learn</p>
                <p className="text-gray-500 dark:text-gray-400">Quick answers to any question</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-accent-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <ImageIcon className="w-3 h-3 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">Images</p>
                <p className="text-gray-500 dark:text-gray-400">Safe pictures from the web</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <BookOpen className="w-3 h-3 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">Research</p>
                <p className="text-gray-500 dark:text-gray-400">Real articles from NASA, Britannica & more</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-accent-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <GraduationCap className="w-3 h-3 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">Tutor</p>
                <p className="text-gray-500 dark:text-gray-400">Homework help that teaches you</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
        Search anything
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Explore topics, ask questions, discover new things</p>

      <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
        {randomSuggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-full text-sm hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
