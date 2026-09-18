// Alerts: the screen the alert email has been pointing at since April.
//
// Calm and factual. Each card says what the kid typed, why SafeStudy passed
// it along, where it came from, and what the app did in the moment. It never
// says anything about the child. That is the parent's call.

import { useMemo } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Check, Search, MessageSquare, Phone } from 'lucide-react';
import { KidAvatar, formatDateTime, EmptyState, Card } from './shared';

const CATEGORY_LABELS = {
  eating_disorder_adjacent: 'Food, weight or body image',
  self_harm_adjacent: 'Self-harm or hopelessness',
};

function categoryLabel(category) {
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  return (category || 'flagged').replace(/_/g, ' ');
}

function resourceLine(category) {
  if (category === 'self_harm_adjacent') {
    return 'If your child may be in crisis, the 988 Suicide and Crisis Lifeline is available 24 hours a day. Call or text 988.';
  }
  if (category === 'eating_disorder_adjacent') {
    return 'The National Eating Disorders helpline is 1-800-931-2237 (Mon to Thu 9am to 9pm ET, Fri 9am to 5pm ET).';
  }
  return null;
}

function whatHappened(alert) {
  if (alert.source === 'tutor') {
    return 'The tutor kept the conversation going, replied warmly, gave no diet or weight advice, and suggested talking to an adult they trust.';
  }
  return 'SafeStudy did not show results for this. Your child saw a gentle redirect.';
}

function AlertCard({ alert, kid, onAcknowledge, busy }) {
  const unread = !alert.acknowledgedAt;
  const fromTutor = alert.source === 'tutor';
  const SourceIcon = fromTutor ? MessageSquare : Search;
  const resource = resourceLine(alert.category);

  return (
    <Card className={`p-5 ${unread ? 'border-l-4 border-l-accent-500' : 'opacity-80'}`}>
      <div className="flex items-start gap-3">
        <KidAvatar name={kid?.name} color={kid?.color} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{kid?.name || 'A kid'}</span>
            {unread && (
              <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-100 text-accent-700 uppercase tracking-wide">
                New
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
              <SourceIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {fromTutor ? 'Said to the tutor' : 'Searched'}
            </span>
            <span className="text-xs text-gray-400">{formatDateTime(alert.createdAt)}</span>
          </div>

          <blockquote className="mt-2 text-gray-900 text-[15px] border-l-2 border-gray-200 pl-3">
            &ldquo;{alert.query}&rdquo;
          </blockquote>

          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-gray-500 flex-shrink-0 w-28">Why it came up</dt>
              <dd className="text-gray-800">{alert.rationale}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500 flex-shrink-0 w-28">Category</dt>
              <dd className="text-gray-800">{categoryLabel(alert.category)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500 flex-shrink-0 w-28">What happened</dt>
              <dd className="text-gray-800">{whatHappened(alert)}</dd>
            </div>
          </dl>

          {resource && (
            <p className="mt-3 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex items-start gap-2">
              <Phone className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
              {resource}
            </p>
          )}

          <div className="mt-3 flex items-center gap-3">
            {unread ? (
              <button
                type="button"
                onClick={() => onAcknowledge(alert._id)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 transition"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Mark as seen
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Seen {formatDateTime(alert.acknowledgedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ConcernAlerts({ alerts, kidProfiles, showToast }) {
  const { token } = useAuth();
  const acknowledge = useMutation(api.concernAlertQueries.acknowledge);
  const kidById = useMemo(() => new Map((kidProfiles || []).map((k) => [k._id, k])), [kidProfiles]);

  const { waiting, seen } = useMemo(() => {
    const list = [...(alerts || [])].sort((a, b) => b.createdAt - a.createdAt);
    return {
      waiting: list.filter((a) => !a.acknowledgedAt),
      seen: list.filter((a) => !!a.acknowledgedAt),
    };
  }, [alerts]);

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledge({ alertId, userToken: token ?? undefined });
      showToast?.('Marked as seen.');
    } catch (err) {
      showToast?.(err?.message || 'Could not mark that as seen.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Alerts</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          SafeStudy passes along anything a kid searches or says to the tutor that touches on food and body
          image or on self-harm. Often it is curiosity or a school topic. It is here so you can decide
          whether to have a conversation, not so the app can. You also get an email each time.
        </p>
      </div>

      {alerts === undefined ? (
        <p className="text-sm text-gray-400">Loading&hellip;</p>
      ) : waiting.length === 0 && seen.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing to look at">
          No alerts so far. If one comes up, it appears here and in your email.
        </EmptyState>
      ) : (
        <>
          <section aria-labelledby="alerts-waiting">
            <h3 id="alerts-waiting" className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              {waiting.length > 0 && <span className="w-2 h-2 bg-accent-500 rounded-full" aria-hidden="true" />}
              Waiting for you {waiting.length > 0 && `(${waiting.length})`}
            </h3>
            {waiting.length === 0 ? (
              <p className="text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 px-5 py-4">
                You have seen everything.
              </p>
            ) : (
              <div className="space-y-3">
                {waiting.map((a) => (
                  <AlertCard key={a._id} alert={a} kid={kidById.get(a.kidProfileId)} onAcknowledge={handleAcknowledge} />
                ))}
              </div>
            )}
          </section>

          {seen.length > 0 && (
            <section aria-labelledby="alerts-seen">
              <h3 id="alerts-seen" className="text-sm font-semibold text-gray-700 mb-3">
                Seen ({seen.length})
              </h3>
              <div className="space-y-3">
                {seen.map((a) => (
                  <AlertCard key={a._id} alert={a} kid={kidById.get(a.kidProfileId)} onAcknowledge={handleAcknowledge} />
                ))}
              </div>
            </section>
          )}

          <p className="text-xs text-gray-400">Showing the 100 most recent alerts.</p>
        </>
      )}
    </div>
  );
}
