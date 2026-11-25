import { topNavigate } from '../../lib/embed';

// Inside the hub dashboard, a child's name, PIN, colour, pause and requests
// belong to the Family tab: the hub overwrites them here on every sync, so
// editing them in SafeTube would quietly undo itself. This points there.
export default function FamilyNote({ text = 'Names, PINs, pause and requests are set in Family.', className = '' }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 ${className}`}>
      <p className="text-sm text-gray-600 min-w-0">{text}</p>
      <button
        type="button"
        onClick={() => topNavigate('/dashboard/family')}
        className="inline-flex min-h-[40px] items-center rounded-lg bg-accent-500 px-4 text-sm font-semibold text-white transition hover:bg-accent-600"
      >
        Open Family
      </button>
    </div>
  );
}
