export default function RequestsInbox({ kidRequests, onClose, onSearchRequest }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">My Requests</h3>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Close</button>
      </div>
      {kidRequests && kidRequests.length > 0 ? (
        <div className="space-y-2">
          {kidRequests.map((req) => (
            <div
              key={req._id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                req.status === 'approved'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : req.status === 'denied'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 dark:text-gray-200 truncate">{req.query}</p>
              </div>
              {req.status === 'approved' ? (
                <button
                  onClick={() => onSearchRequest(req.query)}
                  className="text-xs font-medium text-green-600 dark:text-green-400 hover:underline flex-shrink-0"
                >
                  Search now &rarr;
                </button>
              ) : req.status === 'denied' ? (
                <span className="text-xs text-red-500 dark:text-red-400 flex-shrink-0">Denied</span>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">Waiting...</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No requests yet</p>
      )}
    </div>
  );
}
