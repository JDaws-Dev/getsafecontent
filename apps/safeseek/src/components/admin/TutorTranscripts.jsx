// Tutor chats: every conversation a kid has had with the tutor, newest first,
// plus the short note the tutor keeps about them.
//
// These sessions have been saved since the tutor shipped and this is the
// first screen that reads them. The kid is told inside the tutor that a
// parent can read these.

import { Component, useMemo, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../common/ConfirmModal';
import { MessageSquare, ChevronDown, ChevronUp, StickyNote, Trash2, Users, Plus, LogIn, RefreshCw } from 'lucide-react';
import {
  KidPicker, formatDateTime, formatTimestamp, formatTime, plural, EmptyState, Card, primaryButton, secondaryButton,
} from './shared';

// Transcripts and the tutor's note are the most private things SafeStudy
// keeps, so the backend refuses them outright without a valid parent login
// (it throws rather than returning nothing). Two guards keep that from reading
// as "your child has never used the tutor": we don't ask until we hold a
// token, and if the server turns the token down we say so in plain words
// instead of letting the whole dashboard fall over.
function SignInNotice({ onRetry }) {
  return (
    <Card className="p-5 flex items-start gap-3">
      <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
        <LogIn className="w-4 h-4 text-gray-500" aria-hidden="true" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">Sign in again to see tutor chats</p>
        <p className="text-sm text-gray-500 mt-0.5">
          Tutor conversations are only shown to a signed-in parent. Your login has expired or has not
          finished loading. The chats themselves are safe and still saved.
        </p>
        {onRetry && (
          <button type="button" onClick={onRetry} className={`mt-3 ${secondaryButton}`}>
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Try again
          </button>
        )}
      </div>
    </Card>
  );
}

class TutorAccessBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('[TutorTranscripts] could not load tutor data:', error?.message ?? error);
  }

  render() {
    if (this.state.failed) {
      return <SignInNotice onRetry={() => this.setState({ failed: false })} />;
    }
    return this.props.children;
  }
}

function sessionTitle(s) {
  if (s.topic) return s.topic;
  const first = s.messages.find((m) => m.role === 'kid');
  if (first) return first.content.length > 80 ? `${first.content.slice(0, 77)}...` : first.content;
  return 'Tutor chat';
}

function durationLabel(s) {
  const mins = Math.round((s.lastMessageAt - s.startedAt) / 60000);
  if (mins < 1) return 'under a minute';
  return plural(mins, 'minute');
}

function Session({ session, kidName }) {
  const [open, setOpen] = useState(false);
  const panelId = `tutor-session-${session._id}`;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-gray-50/60 transition"
      >
        <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-4 h-4 text-green-600" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{sessionTitle(session)}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDateTime(session.startedAt)} &middot; {plural(session.messageCount, 'message')} &middot; {durationLabel(session)}
          </p>
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5 hidden sm:inline">
          {formatTimestamp(session.lastMessageAt)}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div id={panelId} className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50/40">
          {session.messages.map((m, i) => {
            const isKid = m.role === 'kid';
            return (
              <div key={`${m.timestamp}-${i}`} className={`flex ${isKid ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${isKid ? 'text-right' : 'text-left'}`}>
                  <p className="text-[11px] text-gray-400 mb-0.5">
                    {isKid ? kidName : 'Tutor'} &middot; {formatTime(m.timestamp)}
                  </p>
                  <div
                    className={`inline-block text-sm px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap text-left ${
                      isKid ? 'bg-accent-500 text-white rounded-br-md' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function TutorNotes({ kid, showToast }) {
  const { token } = useAuth();
  const notes = useQuery(
    api.tutorNotes.getNotes,
    token ? { kidProfileId: kid._id, userToken: token } : 'skip',
  );
  const clearNotes = useMutation(api.tutorNotes.clearNotes);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasNotes = !!notes?.notes?.trim();

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <StickyNote className="w-4 h-4 text-amber-600" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">What the tutor has noticed</h3>
            <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
              A short note the tutor keeps so it can pick up where they left off: what {kid.name} is working on,
              what is tricky, what they like. It is about learning only.
            </p>
          </div>
        </div>
        {hasNotes && (
          <button type="button" onClick={() => setConfirm(true)} disabled={busy} className={secondaryButton}>
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      <div className="mt-4">
        {notes === undefined ? (
          <p className="text-sm text-gray-400">Loading&hellip;</p>
        ) : hasNotes ? (
          <>
            <p className="text-sm text-gray-800 leading-relaxed bg-amber-50/60 border border-amber-100 rounded-xl px-4 py-3 whitespace-pre-wrap">
              {notes.notes}
            </p>
            <p className="text-xs text-gray-400 mt-2">Updated {formatDateTime(notes.updatedAt)}</p>
          </>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Nothing yet. The tutor writes this after a few conversations.
          </p>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          title="Clear the tutor's note?"
          message={`The tutor will start fresh with ${kid.name} and write a new note after their next few conversations. Their chats stay.`}
          confirmLabel="Clear"
          confirmVariant="danger"
          onConfirm={async () => {
            setConfirm(false);
            setBusy(true);
            try {
              await clearNotes({ kidProfileId: kid._id, userToken: token ?? undefined });
              showToast?.('Cleared. The tutor starts fresh.');
            } catch (err) {
              showToast?.(err?.message || 'Could not clear the note.', 'error');
            } finally {
              setBusy(false);
            }
          }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </Card>
  );
}

export default function TutorTranscripts({ kidProfiles, selectedKidId, onSelectKid, onNavigate, showToast }) {
  const { token } = useAuth();
  const kid = kidProfiles?.find((k) => k._id === selectedKidId) || null;
  const sessions = useQuery(
    api.tutorSessions.getSessionsForParent,
    kid && token ? { kidProfileId: kid._id, limit: 50, userToken: token } : 'skip',
  );

  const sorted = useMemo(() => {
    if (!sessions) return [];
    return [...sessions].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }, [sessions]);

  const hasKids = kidProfiles && kidProfiles.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Tutor chats</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Every conversation your kid has had with the tutor, newest first. Kids are told, right in the
          tutor, that parents can read these.
        </p>
      </div>

      {!hasKids ? (
        <EmptyState
          icon={Users}
          title="No kids yet"
          action={
            <button type="button" onClick={() => onNavigate?.('profiles')} className={primaryButton}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              Create a kid profile
            </button>
          }
        >
          Once a kid talks to the tutor, the conversation shows up here.
        </EmptyState>
      ) : (
        <>
          <KidPicker kidProfiles={kidProfiles} selectedKidId={selectedKidId} onSelect={onSelectKid} />

          {kid && !token && <SignInNotice />}

          {kid && token && (
            <TutorAccessBoundary key={`${kid._id}-${token.slice(-8)}`}>
              <TutorNotes kid={kid} showToast={showToast} />

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Conversations
                  {sessions && sessions.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-500">{sessions.length}</span>
                  )}
                </h3>
                {sessions === undefined ? (
                  <p className="text-sm text-gray-400">Loading&hellip;</p>
                ) : sorted.length === 0 ? (
                  <EmptyState icon={MessageSquare} title={`${kid.name} hasn't talked to the tutor yet`}>
                    When they do, the whole conversation shows up here with times.
                  </EmptyState>
                ) : (
                  <div className="space-y-3">
                    {sorted.map((s) => (
                      <Session key={s._id} session={s} kidName={kid.name} />
                    ))}
                    {sorted.length >= 50 && (
                      <p className="text-xs text-gray-400">Showing the 50 most recent conversations.</p>
                    )}
                  </div>
                )}
              </div>
            </TutorAccessBoundary>
          )}
        </>
      )}
    </div>
  );
}
