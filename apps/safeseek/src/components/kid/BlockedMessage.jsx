import { Shield, Search, Users } from 'lucide-react';

export default function BlockedMessage({
  blockedMessage,
  canRequest,
  alreadyRequested,
  requestSent,
  relatedQuestions,
  query,
  selectedProfile,
  searchInputRef,
  onCreateRequest,
  onSuggestionClick,
  onClearBlocked,
}) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-orange-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Hold on!</h2>
      <p className="text-gray-600 dark:text-gray-300 text-lg max-w-md mx-auto">
        {blockedMessage}
      </p>

      {/* Ask My Parent button */}
      {canRequest && (
        <div className="mt-4">
          {requestSent || alreadyRequested ? (
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {alreadyRequested && !requestSent ? 'Already requested — waiting for your parent' : 'Request sent!'}
            </div>
          ) : (
            <button
              onClick={onCreateRequest}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium transition-colors shadow-sm active:scale-[0.98]"
            >
              <Users className="w-4 h-4" />
              Ask My Parent
            </button>
          )}
        </div>
      )}

      {/* Related questions as suggestion buttons when blocked */}
      {relatedQuestions.length > 0 && (
        <div className="mt-6 max-w-md mx-auto">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Try one of these instead:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {relatedQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(q)}
                className="text-sm bg-white dark:bg-gray-800 border border-accent-200 dark:border-accent-700 rounded-full px-5 py-2.5 text-accent-700 dark:text-accent-300 hover:bg-accent-50 dark:hover:bg-accent-900/30 hover:border-accent-300 dark:hover:border-accent-600 transition-all duration-200 shadow-sm active:scale-[0.98]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {relatedQuestions.length === 0 && (
        <button
          onClick={onClearBlocked}
          className="mt-6 text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 font-medium py-3 transition-colors"
        >
          Try a different search
        </button>
      )}
    </div>
  );
}
