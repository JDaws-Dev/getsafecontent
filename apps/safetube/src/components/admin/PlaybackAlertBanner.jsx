import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { LOCK_DOWN_GUIDE_URL } from './GettingStarted';

// Small dismissible notice: a kid's device couldn't reach SafeTube's video
// player this week (reported by the kid player; see convex/playbackAlerts.ts).
export default function PlaybackAlertBanner({ token }) {
  const failures = useQuery(
    api.playbackAlerts.getRecentPlaybackFailures,
    token ? { userToken: token } : 'skip'
  );
  const dismiss = useMutation(api.playbackAlerts.dismissPlaybackFailure);

  if (!failures || failures.length === 0) return null;

  return (
    <div className="space-y-2">
      {failures.map((f) => (
        <div
          key={f._id}
          role="status"
          className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex gap-3 items-start"
        >
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
          <div className="flex-1 min-w-0 text-sm text-amber-900">
            <p className="font-semibold">
              SafeTube couldn't play videos on {f.kidName}'s {f.deviceLabel}.
            </p>
            <p className="mt-1">
              On a Family Link device, approve <strong>youtube-nocookie.com</strong>.{' '}
              <strong>Do not approve youtube.com</strong>: it unlocks all of YouTube.{' '}
              <a
                href={LOCK_DOWN_GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline underline-offset-2"
              >
                Setup help
              </a>
            </p>
          </div>
          <button
            onClick={() => dismiss({ failureId: f._id, userToken: token }).catch(() => {})}
            className="text-amber-700 hover:text-amber-900 p-1 -m-1 flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
