import { Search } from 'lucide-react';

export default function FamilyCodeEntry({ codeInput, setCodeInput, error, codeShake, onSubmit }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(codeInput.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">SafeStudy</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Enter your family code to start searching</p>

        {error && (
          <div className={`bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4 ${codeShake ? 'animate-shake' : ''}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            maxLength={6}
            className="w-full text-center text-2xl font-mono font-bold tracking-widest bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-4 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 uppercase transition-all duration-200"
            placeholder="------"
            autoFocus
          />
          <button
            type="submit"
            disabled={codeInput.length < 4}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white py-3 rounded-lg font-medium text-lg transition-all duration-200 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Start Searching
          </button>
        </form>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
          Ask your parent for the family code
        </p>
      </div>
    </div>
  );
}
