// Home tab: the week at a glance, per kid.
//
// This used to be "searches today" and a list of the last five queries. A
// homeschool parent does not open the dashboard to count searches; they open
// it to see whether the lessons got done. One family-wide query feeds every
// tile here.

import {
  Shield, ExternalLink, Copy, Check, Plus, ChevronRight, CheckCircle2, BookOpen,
  Layers, MessageSquare, Search, Flame, CalendarDays, Bell,
} from 'lucide-react';
import { KidAvatar, plural, Card, primaryButton } from './shared';

function StatTile({ icon, label, value, sub, tone = 'accent', onClick }) {
  const Icon = icon;
  const tones = {
    accent: { box: 'bg-accent-50', icon: 'text-accent-600', hover: 'hover:border-accent-200' },
    green: { box: 'bg-green-50', icon: 'text-green-600', hover: 'hover:border-green-200' },
    purple: { box: 'bg-purple-50', icon: 'text-purple-600', hover: 'hover:border-purple-200' },
    red: { box: 'bg-red-50', icon: 'text-red-600', hover: 'hover:border-red-200' },
    gray: { box: 'bg-gray-50', icon: 'text-gray-500', hover: 'hover:border-gray-200' },
  };
  const t = tones[tone] || tones.accent;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left ${onClick ? `${t.hover} hover:shadow-md transition cursor-pointer` : ''}`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 ${t.box} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${t.icon}`} aria-hidden="true" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </Tag>
  );
}

function Row({ label, value, muted }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`font-semibold ${muted ? 'text-gray-400' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function KidWeekCard({ kid, profile, onOpenWeek, onOpenTutor, onOpenFamily }) {
  const ageLine = profile
    ? profile.ageRange?.min === profile.ageRange?.max
      ? `Age ${profile.ageRange?.min || 4}`
      : `Ages ${profile.ageRange?.min || 4}–${profile.ageRange?.max || 18}`
    : '';

  const todayLine =
    kid.assignedToday === 0
      ? null
      : kid.completedToday >= kid.assignedToday
        ? `All ${plural(kid.assignedToday, 'lesson')} done today`
        : `${kid.completedToday} of ${plural(kid.assignedToday, 'lesson')} done today`;

  const quiet =
    kid.lessonsThisWeek === 0 &&
    kid.cardsThisWeek === 0 &&
    kid.tutorMessagesThisWeek === 0 &&
    kid.searchesThisWeek === 0;

  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <KidAvatar name={kid.name} color={kid.color} size="lg" />
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-gray-900 truncate">{kid.name}</h4>
          <p className="text-xs text-gray-500">{ageLine}</p>
        </div>
        {kid.currentStreak > 0 && (
          <span
            className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 text-xs font-semibold px-2 py-1 rounded-full"
            title="Days in a row with a lesson or review done"
          >
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            {plural(kid.currentStreak, 'day')}
          </span>
        )}
      </div>

      {/* Today */}
      <div
        className={`rounded-xl px-3 py-2.5 mb-4 text-sm ${
          todayLine
            ? kid.completedToday >= kid.assignedToday
              ? 'bg-green-50 text-green-800'
              : 'bg-accent-50 text-accent-800'
            : 'bg-gray-50 text-gray-600'
        }`}
      >
        {todayLine ? (
          <span className="font-medium">{todayLine}</span>
        ) : (
          <span>
            Nothing assigned today.{' '}
            <button type="button" onClick={onOpenFamily} className="font-medium text-accent-600 hover:text-accent-700 underline-offset-2 hover:underline">
              Set up lessons
            </button>
          </span>
        )}
      </div>

      <div className="space-y-2 flex-1">
        <Row label="Lessons finished this week" value={kid.lessonsThisWeek} muted={kid.lessonsThisWeek === 0} />
        <Row
          label="Review cards this week"
          value={
            kid.cardsThisWeek > 0
              ? `${kid.cardsThisWeek} at ${kid.reviewAccuracy ?? 0}% right`
              : '0'
          }
          muted={kid.cardsThisWeek === 0}
        />
        <Row label="Tutor messages" value={kid.tutorMessagesThisWeek} muted={kid.tutorMessagesThisWeek === 0} />
        <Row label="Searches" value={kid.searchesThisWeek} muted={kid.searchesThisWeek === 0} />
        <Row
          label="Review cards waiting"
          value={kid.dueCardCount > 0 ? kid.dueCardCount : 'None'}
          muted={kid.dueCardCount === 0}
        />
      </div>

      {quiet && (
        <p className="text-xs text-gray-400 italic mt-3">Nothing recorded yet this week.</p>
      )}

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
        <button
          type="button"
          onClick={onOpenWeek}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-accent-600 hover:text-accent-700 hover:bg-accent-50 rounded-lg py-2 transition"
        >
          <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />
          This week
        </button>
        <button
          type="button"
          onClick={onOpenTutor}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-accent-600 hover:text-accent-700 hover:bg-accent-50 rounded-lg py-2 transition"
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          Tutor chats
        </button>
      </div>
    </Card>
  );
}

export default function HomeOverview({
  userData,
  kidProfiles,
  overview,
  unacknowledgedAlerts,
  onNavigate,
  onSelectKid,
  onCopyCode,
  codeCopied,
}) {
  const hasProfiles = kidProfiles && kidProfiles.length > 0;
  const kids = overview || [];

  const totals = kids.reduce(
    (acc, k) => ({
      lessons: acc.lessons + k.lessonsThisWeek,
      cards: acc.cards + k.cardsThisWeek,
      tutor: acc.tutor + k.tutorMessagesThisWeek,
      searches: acc.searches + k.searchesThisWeek,
    }),
    { lessons: 0, cards: 0, tutor: 0, searches: 0 },
  );

  // Family-wide accuracy, weighted by cards reviewed.
  const weightedCorrect = kids.reduce(
    (s, k) => s + (k.reviewAccuracy != null ? (k.reviewAccuracy / 100) * k.cardsThisWeek : 0),
    0,
  );
  const familyAccuracy = totals.cards > 0 ? Math.round((weightedCorrect / totals.cards) * 100) : null;

  const profileById = new Map((kidProfiles || []).map((p) => [p._id, p]));

  const go = (tab, kidId) => {
    if (kidId) onSelectKid?.(kidId);
    onNavigate(tab);
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back{userData?.name ? `, ${userData.name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-gray-500 mt-1">Here is what your kids have been studying this week.</p>
      </div>

      {/* This week, whole family */}
      {hasProfiles && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            icon={BookOpen}
            label="Lessons finished"
            value={totals.lessons}
            sub="This week, all kids"
            onClick={() => go('week')}
          />
          <StatTile
            icon={Layers}
            label="Review cards"
            value={totals.cards}
            sub={familyAccuracy != null ? `${familyAccuracy}% remembered` : 'None reviewed yet'}
            tone="purple"
            onClick={() => go('week')}
          />
          <StatTile
            icon={MessageSquare}
            label="Tutor messages"
            value={totals.tutor}
            sub={totals.searches > 0 ? `plus ${plural(totals.searches, 'search', 'searches')}` : 'This week'}
            tone="green"
            onClick={() => go('tutor')}
          />
          <StatTile
            icon={Bell}
            label="Alerts to look at"
            value={unacknowledgedAlerts ?? 0}
            sub={unacknowledgedAlerts > 0 ? 'Worth a calm conversation' : 'Nothing waiting'}
            tone={unacknowledgedAlerts > 0 ? 'red' : 'gray'}
            onClick={() => go('alerts')}
          />
        </div>
      )}

      {/* Family Code Card */}
      {userData?.familyCode && (
        <div className="bg-accent-500 rounded-2xl p-5 text-white shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-white/80" aria-hidden="true" />
                <span className="text-sm font-medium text-white/80">Family Code</span>
              </div>
              <p className="text-2xl font-mono font-bold tracking-wider">{userData.familyCode}</p>
              <p className="text-xs text-white/60 mt-1">Share this code so your kids can access SafeStudy</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={`/play/${userData.familyCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 bg-white text-accent-600 hover:bg-accent-50 font-semibold text-sm px-3.5 py-2 rounded-xl transition shadow-sm"
                title="Open the kid portal in a new tab"
              >
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                Open Kid Portal
              </a>
              <a
                href={`/play/${userData.familyCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:hidden bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-xl transition"
                title="Open the kid portal in a new tab"
                aria-label="Open the kid portal in a new tab"
              >
                <ExternalLink className="w-5 h-5 text-white" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={onCopyCode}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-xl transition"
                title="Copy code"
                aria-label={codeCopied ? 'Copied' : 'Copy family code'}
              >
                {codeCopied ? (
                  <Check className="w-5 h-5 text-white" aria-hidden="true" />
                ) : (
                  <Copy className="w-5 h-5 text-white" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-kid week cards */}
      {hasProfiles ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Your kids this week</h3>
            <button
              type="button"
              onClick={() => onNavigate('family')}
              className="text-sm text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1"
            >
              Set up lessons
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          {overview === undefined ? (
            <p className="text-sm text-gray-400">Loading&hellip;</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {kids.map((kid) => (
                <KidWeekCard
                  key={kid.kidProfileId}
                  kid={kid}
                  profile={profileById.get(kid.kidProfileId)}
                  onOpenWeek={() => go('week', kid.kidProfileId)}
                  onOpenTutor={() => go('tutor', kid.kidProfileId)}
                  onOpenFamily={() => go('family', kid.kidProfileId)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Getting Started Checklist */
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent-50 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-accent-500" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">Getting Started</h3>
              <p className="text-sm text-gray-500 mb-4">Set up SafeStudy in just a few steps.</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
                  </div>
                  <span className="text-sm text-gray-600 line-through">Create your account</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-400">2</span>
                  </div>
                  <span className="text-sm text-gray-900 font-medium">Create a kid profile</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-400">3</span>
                  </div>
                  <span className="text-sm text-gray-600">Give them a subject or two under Family</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-gray-400">4</span>
                  </div>
                  <span className="text-sm text-gray-600">Share your family code with your kids</span>
                </div>
              </div>
              <button type="button" onClick={() => onNavigate('profiles')} className={`mt-5 ${primaryButton}`}>
                <Plus className="w-4 h-4" aria-hidden="true" />
                Create First Profile
              </button>
            </div>
          </div>
        </Card>
      )}

      {hasProfiles && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" aria-hidden="true" />
          Looking for the raw list of what was typed? That is still under Activity.
        </p>
      )}
    </div>
  );
}
