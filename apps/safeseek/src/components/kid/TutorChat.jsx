import { GraduationCap, Mic, ArrowUp } from 'lucide-react';
import { SpeechRecognition, formatRelativeTime } from './utils';

export default function TutorChat({
  tutorMessages,
  tutorLoading,
  tutorInput,
  setTutorInput,
  tutorEndRef,
  tutorInputRef,
  onSend,
  onVoice,
}) {
  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 280px)' }}>
      {/* Chat messages */}
      <div className="flex-1 space-y-4 pb-4">
        {tutorMessages.map((msg, index) => (
          <div
            key={index}
            className={`flex items-end gap-2.5 ${msg.role === 'kid' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Tutor avatar */}
            {msg.role === 'tutor' && (
              <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-4 h-4 text-accent-600 dark:text-accent-400" />
              </div>
            )}

            <div className={`max-w-[80%] ${msg.role === 'kid' ? 'order-1' : ''}`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'kid'
                    ? 'bg-accent-100 dark:bg-accent-900/30 text-gray-900 dark:text-gray-100 rounded-br-md'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
              <p className={`text-[10px] text-gray-400 dark:text-gray-500 mt-1 ${msg.role === 'kid' ? 'text-right' : 'text-left'}`}>
                {formatRelativeTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {tutorLoading && (
          <div className="flex items-end gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-4 h-4 text-accent-600 dark:text-accent-400" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 dark:text-gray-500 mr-1">SafeStudy is thinking</span>
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={tutorEndRef} />
      </div>

      {/* Tutor input — sticky at bottom */}
      <div className="sticky bottom-0 pt-3 pb-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5">
          <input
            ref={tutorInputRef}
            type="text"
            value={tutorInput}
            onChange={(e) => setTutorInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask your tutor..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
            disabled={tutorLoading}
          />
          {SpeechRecognition && (
            <button
              type="button"
              onClick={onVoice}
              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Voice input"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onSend}
            disabled={!tutorInput.trim() || tutorLoading}
            className={`p-1.5 rounded-full transition-all ${
              tutorInput.trim() && !tutorLoading
                ? 'bg-accent-600 text-white hover:bg-accent-700'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
