import { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    iconColor: 'text-green-500',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-500',
  },
  info: {
    icon: Info,
    bg: 'bg-accent-50 border-accent-200',
    text: 'text-accent-800',
    iconColor: 'text-accent-500',
  },
};

export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  const variant = VARIANTS[type] || VARIANTS.success;
  const Icon = variant.icon;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in max-w-sm">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${variant.bg}`}>
        <Icon className={`w-5 h-5 flex-shrink-0 ${variant.iconColor}`} />
        <p className={`text-sm font-medium flex-1 ${variant.text}`}>{message}</p>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg hover:bg-white/50 transition ${variant.text}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
