import { X } from 'lucide-react';
import SafeFamilySwitcher from '../SafeFamilySwitcher';

/** "Jump to another app" modal sheet (extracted from KidSearch). */
export default function AppsSheet({ familyCode, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Jump to another app"
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
        >
          <X className="w-5 h-5" />
        </button>
        <p className="mb-1 text-center text-lg font-bold text-gray-900 dark:text-white">Jump to another app</p>
        <p className="mb-5 text-center text-sm text-gray-500 dark:text-gray-400">
          Same family code — no need to type it again.
        </p>
        <SafeFamilySwitcher current="safestudy" familyCode={familyCode} />
      </div>
    </div>
  );
}
