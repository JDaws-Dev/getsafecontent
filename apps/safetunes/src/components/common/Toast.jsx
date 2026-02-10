import { useState, useEffect } from 'react';

/**
 * Toast Notification Component
 *
 * Usage:
 * import { useToast } from './Toast';
 *
 * const { showToast, ToastContainer } = useToast();
 *
 * // Show toast
 * showToast('Success message!', 'success');
 * showToast('Error message', 'error');
 * showToast('Info message', 'info');
 *
 * // Add ToastContainer to your component
 * return (
 *   <>
 *     {ToastContainer}
 *     ... your content
 *   </>
 * );
 */

function Toast({ message, type = 'info', onClose, undoAction, undoLabel = 'Undo', duration = 4000 }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-dismiss after specified duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  const handleUndo = () => {
    if (undoAction) {
      undoAction();
      handleClose();
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: (
            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: (
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: (
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
        };
      default: // info
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: (
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          ),
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`${styles.bg} ${styles.border} ${styles.text} border rounded-lg shadow-lg p-4 flex items-start gap-3 min-w-[300px] max-w-md transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="flex-shrink-0">{styles.icon}</div>
      <div className="flex-1 text-sm font-medium">{message}</div>

      {/* Undo button if undoAction is provided */}
      {undoAction && (
        <button
          onClick={handleUndo}
          className="flex-shrink-0 px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded font-semibold text-sm transition"
        >
          {undoLabel}
        </button>
      )}

      <button
        onClick={handleClose}
        className="flex-shrink-0 hover:opacity-70 transition"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}

// Custom hook for using toasts
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', options = {}) => {
    const id = Date.now();
    setToasts((prev) => [...prev, {
      id,
      message,
      type,
      undoAction: options.undoAction,
      undoLabel: options.undoLabel || 'Undo',
      duration: options.duration || 4000
    }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const ToastContainer = (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            undoAction={toast.undoAction}
            undoLabel={toast.undoLabel}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );

  return { showToast, ToastContainer };
}

export default Toast;
