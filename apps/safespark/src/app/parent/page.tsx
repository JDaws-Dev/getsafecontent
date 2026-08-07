'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import {
  Copy,
  Plus,
  Users,
  Settings2,
  X,
  LogOut,
  Activity as ActivityIcon,
  Shield,
  ShieldAlert,
  Clock,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { useAuth as useMarketingAuth } from '@/contexts/AuthContext';
import { SafeFamilyParentSwitcher } from '@/components/SafeFamilySwitcher';

export default function ParentDashboard() {
  // Marketing Central JWT is the sole identity surface post-Clerk-retirement
  // (2026-05-28). Legacy Clerk users (jedaws, soonerjace) migrated by
  // logging in at /login after triggering a password reset.
  const marketing = useMarketingAuth();

  const isLoaded = !marketing.isLoading;
  const isSignedIn = marketing.isAuthenticated;

  const displayEmail = marketing.user?.email;
  const displayName =
    marketing.user?.name ?? marketing.user?.email?.split('@')[0] ?? 'Parent';

  // Pass the Marketing JWT as `userToken` so Convex can verify it
  // server-side with the shared HMAC secret. SafeSpark's auth.config.ts
  // JWKS provider can't validate Marketing's HS256-signed tokens, so
  // ctx.auth.getUserIdentity() returns null for them; the userToken arg
  // is the explicit channel for parent identity post-Clerk-retirement.
  const meArgs = isSignedIn
    ? { userToken: marketing.token ?? undefined }
    : 'skip';
  const me = useQuery(api.users.getCurrent, meArgs);

  // Auto-adopt the unified family code from the login JWT on first load.
  // This self-heals ANY parent (incl. ones never provisioned into SafeSpark,
  // e.g. families who joined via another Safe Family app): it upserts their
  // parent row + family to the authoritative code carried on the token, so
  // there's never a "create a family code" / migration step and the code
  // always matches their other apps.
  //
  // LOOP-SAFE (the 3f30fa63 incident — an auto-upsert useEffect with the
  // churning `displayName` object in its deps fired → re-render → fired,
  // flickering /parent). Here the only dep is the stable token *string* and
  // we fire once via a ref; the mutation is idempotent. Do NOT add object
  // deps (marketing.user, displayName) to this effect.
  const syncParent = useMutation(api.families.syncParentFromToken);
  const syncedTokenRef = useRef<string | null>(null);
  useEffect(() => {
    const token = marketing.token;
    if (!token || syncedTokenRef.current === token) return;
    syncedTokenRef.current = token;
    syncParent({ userToken: token }).catch(() => {
      syncedTokenRef.current = null; // allow retry on transient failure
    });
  }, [marketing.token, syncParent]);

  const family = useQuery(
    api.safespark.listFamilyForParent,
    isSignedIn ? { userToken: marketing.token ?? undefined } : 'skip',
  );
  const usage = useQuery(
    api.safespark.getFamilyUsageThisMonth,
    isSignedIn ? { userToken: marketing.token ?? undefined } : 'skip',
  );
  // Recent activity across the whole family (last ~30 events combining
  // kid prompts + blocked-topic refusals). Powers the activity feed +
  // the alert banner. Skip when not signed in to avoid pointless calls.
  const activity = useQuery(
    api.safespark.getActivityForFamily,
    isSignedIn ? { userToken: marketing.token ?? undefined, limit: 30 } : 'skip',
  );
  // Phase 3 — pending topic requests from kids ("Ask my parent to allow").
  // Renders at the top of /parent as actionable cards. Empty = section hidden.
  const pendingRequests = useQuery(
    api.safespark.listPendingTopicRequests,
    isSignedIn ? { userToken: marketing.token ?? undefined } : 'skip',
  );
  const resolveTopicRequest = useMutation(api.safespark.resolveTopicRequest);
  // P0 share-approval gate — pending share requests for chat-shaped
  // (isCommunication=true) projects. Same pattern as topic requests:
  // kid hits Share, request lands here, parent one-taps Approve/Deny.
  const pendingShareApprovals = useQuery(
    api.safespark.listPendingShareApprovals,
    isSignedIn ? { userToken: marketing.token ?? undefined } : 'skip',
  );
  const resolveShareApproval = useMutation(api.safespark.resolveShareApproval);
  // Phase 4 — concerning-prompt alerts (self-harm / ED escalation).
  // Renders ABOVE everything else when unack'd, with helpline info
  // already inlined so the parent doesn't have to dig.
  const concernAlerts = useQuery(
    api.concernAlerts.listForUser,
    isSignedIn ? { userToken: marketing.token ?? undefined } : 'skip',
  );
  const acknowledgeConcern = useMutation(api.concernAlerts.acknowledge);
  // Per-kid today: prompts count, blocked count, last active. Powers
  // the 3-metric strip on each kid card.
  const kidStats = useQuery(
    api.safespark.getKidStatsToday,
    isSignedIn ? { userToken: marketing.token ?? undefined } : 'skip',
  );
  const ensureFamily = useMutation(api.families.ensureForParent);
  const [codeCopied, setCodeCopied] = useState(false);

  // Build a quick lookup so KidRow can pull its stats without iterating.
  const statsByKid = new Map<string, NonNullable<typeof kidStats>[number]>();
  if (kidStats) {
    for (const s of kidStats) statsByKid.set(String(s.id), s);
  }
  const totalBlockedToday = (kidStats ?? []).reduce((sum, s) => sum + s.blockedToday, 0);

  if (!isLoaded) {
    return <main className="flex min-h-screen items-center justify-center text-brand-ink-soft">Loading…</main>;
  }
  if (!isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <h1 className="font-display text-2xl font-bold text-brand-navy">Sign in to open your dashboard</h1>
          <Link href="/login" className="inline-block rounded-2xl bg-accent-600 px-5 py-2 text-sm font-black text-brand-navy hover:bg-accent-700">
            Sign in with Safe Family
          </Link>
          <div>
            <Link href="/" className="text-sm font-bold text-accent-700 hover:text-accent-800">Back to home</Link>
          </div>
        </div>
      </main>
    );
  }

  const code = family?.family?.code;

  return (
    <main className="min-h-screen bg-brand-cream px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/" className="text-xs font-bold uppercase tracking-widest text-accent-700 hover:text-accent-800">
              SafeSpark
            </Link>
            <h1 className="font-display text-2xl font-bold text-brand-navy">Parent dashboard</h1>
            <p className="text-sm text-brand-ink-soft">Signed in as {displayEmail}</p>
          </div>
          {/* Cross-app Safe Family switcher — parent side. Carries the family
              code + Marketing JWT so a parent hops to a sibling app's admin
              without re-authenticating. Desktop; a mobile row sits below. */}
          <div className="hidden lg:flex">
            <SafeFamilyParentSwitcher
              current="safespark"
              familyCode={code}
              parentToken={marketing.token ?? undefined}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/*
             * NO "Open SafeSpark" button here. /parent is the admin
             * surface — parents come here to manage kids + share the
             * family code, NOT to use the maker. The maker (/make) is
             * the KID surface. Matches the SafeTunes / SafeTube /
             * SafeReads pattern where parent admin and kid app are
             * cleanly separated. Parents who DO want to test the
             * maker themselves get the small "Try the maker" link
             * below in the kid-instructions block.
             */}
            <button
              type="button"
              onClick={() => {
                marketing.logout();
                window.location.href = '/login';
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-brand-cream-2 bg-white px-3 py-2 text-xs font-bold text-brand-navy hover:bg-brand-cream"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </header>

        {/* Cross-app switcher — mobile row, always visible under 1024px where
            the desktop switcher in the header is hidden. */}
        <div className="lg:hidden flex justify-center -mt-2">
          <SafeFamilyParentSwitcher
            current="safespark"
            familyCode={code}
            parentToken={marketing.token ?? undefined}
            tile={40}
          />
        </div>

        {usage && (
          <section className="rounded-3xl border border-brand-cream-2 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent-700">
                  This month · {usage.yearMonth}
                </p>
                <h2 className="font-display text-lg font-bold text-brand-navy">Family usage</h2>
              </div>
              <p className="text-xs font-bold text-brand-ink-soft">Resets on the 1st</p>
            </div>
            <div className="mt-4 space-y-4">
              <CapMeter
                label="Chat turns"
                used={usage.chatTurns}
                cap={usage.caps.chatTurns}
                pct={usage.pct.chatTurns}
              />
              <CapMeter
                label="Image restyles"
                used={usage.imageTransforms}
                cap={usage.caps.imageTransforms}
                pct={usage.pct.imageTransforms}
              />
            </div>
            {usage.perMember.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-bold text-brand-ink-soft hover:text-brand-navy">
                  Per-profile breakdown ({usage.perMember.length})
                </summary>
                <div className="mt-2 space-y-1.5">
                  {usage.perMember.map((m) => (
                    <div key={m.clerkUserId} className="flex items-center justify-between rounded-xl bg-brand-cream px-3 py-2 text-xs">
                      <span className="font-bold text-brand-navy">{m.email || m.clerkUserId}</span>
                      <span className="font-mono font-black text-brand-ink-soft">
                        {m.turns} turns · {m.images} images
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </section>
        )}

        <section className="rounded-3xl border border-accent-100 bg-gradient-to-br from-accent-500 via-brand-peach-start to-brand-peach-end p-[1.5px] shadow-lg">
          <div className="rounded-[22px] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent-700">Family code</p>
                <h2 className="font-display text-lg font-bold text-brand-navy">Share this with your kids to let them in</h2>
              </div>
              {!code ? (
                <button
                  type="button"
                  onClick={() => {
                    if (me?._id) void ensureFamily({ parentUserId: me._id, userToken: marketing.token ?? undefined });
                  }}
                  disabled={!me?._id}
                  className="rounded-2xl bg-accent-600 px-5 py-2.5 text-sm font-black text-brand-navy hover:bg-accent-700 disabled:opacity-50"
                >
                  <Plus className="mr-1 inline h-4 w-4" />
                  Create my family code
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="rounded-2xl bg-brand-navy px-4 py-2.5 font-mono text-2xl font-black tracking-[0.3em] text-emerald-300">
                    {code}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(code);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      } catch {
                        /* ignore */
                      }
                    }}
                    className="rounded-xl border border-brand-cream-2 bg-white px-3 py-2 text-xs font-bold text-brand-navy hover:bg-brand-cream"
                  >
                    <Copy className="mr-1 inline h-3.5 w-3.5" />
                    {codeCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
            {code && (
              <>
                <p className="mt-3 text-sm leading-relaxed text-brand-ink-soft">
                  On your kid&apos;s device, open{' '}
                  <span className="font-bold text-slate-900">getsafespark.com</span>{' '}
                  and enter <span className="font-mono font-bold text-brand-navy">{code}</span>.
                  They pick their profile and start building.
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Want to try it yourself?{' '}
                  <Link href="/make" className="font-bold text-accent-700 underline underline-offset-2 hover:text-accent-700">
                    Open the maker as a parent →
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>

        {/* Phase 4 — concerning-prompt alerts. Highest-priority section,
            renders above every other dashboard surface when unack'd.
            Inlines helpline numbers so the parent has them in hand. */}
        {concernAlerts && concernAlerts.length > 0 && (
          <section className="rounded-3xl border-2 border-rose-300 bg-rose-50 p-5 shadow-lg">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-700">
                  Important — needs your attention
                </p>
                <h2 className="text-lg font-black text-rose-900">
                  {concernAlerts.length} {concernAlerts.length === 1 ? 'concerning prompt' : 'concerning prompts'} from your kids
                </h2>
              </div>
            </div>
            <ul className="space-y-3">
              {concernAlerts.map((alert) => {
                const isSH = alert.category === 'self_harm_adjacent';
                const isED = alert.category === 'eating_disorder_adjacent';
                return (
                  <li
                    key={alert.id}
                    className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-rose-900">
                          {alert.kidName} asked Spark to build:
                        </p>
                        <blockquote className="mt-1 rounded-xl border-l-4 border-rose-400 bg-rose-50 px-3 py-2 text-sm font-semibold text-brand-navy">
                          &ldquo;{alert.query}&rdquo;
                        </blockquote>
                        <p className="mt-2 text-xs italic text-rose-700">{alert.rationale}</p>
                        {isSH && (
                          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                            <strong>988</strong> — Suicide &amp; Crisis Lifeline (call or text, 24/7).
                          </p>
                        )}
                        {isED && (
                          <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
                            <strong>1-800-931-2237</strong> — National Eating Disorders helpline (Mon-Thu 9am-9pm ET, Fri 9am-5pm ET).
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await acknowledgeConcern({
                              id: alert.id,
                              userToken: marketing.token ?? undefined,
                            });
                          } catch (err) {
                            console.error('acknowledge failed', err);
                          }
                        }}
                        className="shrink-0 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white shadow hover:bg-rose-700"
                      >
                        Got it
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Concerning-activity banner — only renders when at least one
            blocked-topic hit happened today. Quick-scan signal at the top
            so a parent skimming the dashboard sees it without scrolling. */}
        {totalBlockedToday > 0 && (
          <section className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-rose-900">
                {totalBlockedToday} blocked {totalBlockedToday === 1 ? 'attempt' : 'attempts'} today
              </p>
              <p className="text-xs font-semibold text-rose-700">
                Spark refused to build on a topic in your blocklist. Tap a kid below to see what was attempted.
              </p>
            </div>
          </section>
        )}

        {/* P0 share-approval gate — pending share requests for chat-
            shaped projects. Rendered ABOVE topic requests because
            sharing is a safety event (creates a public URL), not a
            content-rails event. Approve = kid can hit Share again
            and the link generates. Deny = kid sees a quiet "not yet"
            message; parent can re-approve from history later. */}
        {pendingShareApprovals && pendingShareApprovals.length > 0 && (
          <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                <Share2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-700">Share approval needed</p>
                <h2 className="text-lg font-black text-rose-900">
                  {pendingShareApprovals.length} {pendingShareApprovals.length === 1 ? 'share' : 'shares'} waiting for you
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-rose-700">
                  These projects have shared chat/messages. Anyone with the link can see them. Review before approving.
                </p>
              </div>
            </div>
            <ul className="space-y-2">
              {pendingShareApprovals.map((req) => (
                <li
                  key={req.id}
                  className="flex flex-wrap items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-brand-navy">
                      <span className="text-rose-700">{req.kidName}</span> wants to share{' '}
                      <span className="rounded-md bg-rose-100 px-1.5 py-0.5 font-black text-rose-900">
                        {req.projectTitle}
                      </span>
                    </p>
                    <p className="mt-1 text-xs font-semibold text-brand-ink-soft">
                      Open the project on{' '}
                      <Link
                        href={`/parent/profile/${req.kidProfileId}`}
                        className="text-rose-600 underline hover:text-rose-700"
                      >
                        {req.kidName}&apos;s profile
                      </Link>{' '}
                      to inspect the shared data before deciding.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await resolveShareApproval({
                            id: req.id,
                            action: 'approve',
                            userToken: marketing.token ?? undefined,
                          });
                        } catch (err) {
                          console.error('approve share failed', err);
                        }
                      }}
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow hover:bg-emerald-700"
                    >
                      Approve share
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await resolveShareApproval({
                            id: req.id,
                            action: 'deny',
                            userToken: marketing.token ?? undefined,
                          });
                        } catch (err) {
                          console.error('deny share failed', err);
                        }
                      }}
                      className="rounded-xl border border-brand-cream-2 bg-white px-3 py-1.5 text-xs font-black text-brand-ink-soft hover:bg-brand-cream"
                    >
                      Not yet
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Phase 3 — pending topic requests. Kids tap "Ask my parent" in
            the workbench when they hit a blocklist phrase; the request
            shows up here for one-click approve (removes the phrase
            from their blockedTopics) or deny. */}
        {pendingRequests && pendingRequests.length > 0 && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Pending permission requests</p>
                <h2 className="text-lg font-black text-amber-900">
                  {pendingRequests.length} {pendingRequests.length === 1 ? 'request' : 'requests'} waiting for you
                </h2>
              </div>
            </div>
            <ul className="space-y-2">
              {pendingRequests.map((req) => (
                <li
                  key={req.id}
                  className="flex flex-wrap items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-brand-navy">
                      <span className="text-amber-700">{req.kidName}</span> wants to build something about{' '}
                      <span className="rounded-md bg-amber-100 px-1.5 py-0.5 font-black text-amber-900">
                        {req.matchedPhrase}
                      </span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-brand-ink-soft">
                      They asked: &ldquo;{req.originalPrompt}&rdquo;
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await resolveTopicRequest({
                            id: req.id,
                            action: 'approve',
                            userToken: marketing.token ?? undefined,
                          });
                        } catch (err) {
                          console.error('approve failed', err);
                        }
                      }}
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow hover:bg-emerald-700"
                    >
                      Allow
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await resolveTopicRequest({
                            id: req.id,
                            action: 'deny',
                            userToken: marketing.token ?? undefined,
                          });
                        } catch (err) {
                          console.error('deny failed', err);
                        }
                      }}
                      className="rounded-xl border border-brand-cream-2 bg-white px-3 py-1.5 text-xs font-black text-brand-ink-soft hover:bg-brand-cream"
                    >
                      Not yet
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Activity feed — last ~30 events across all kids in the family.
            Each row shows the kid (colored dot), event type (prompt vs
            blocked), and what they asked. Empty state explains what'll
            show up here once kids start building. */}
        <section className="rounded-3xl border border-brand-cream-2 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-accent-100 text-accent-700">
              <ActivityIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-accent-700">Recent activity</p>
              <h2 className="font-display text-lg font-bold text-brand-navy">
                {activity?.events.length
                  ? `${activity.events.length} recent ${activity.events.length === 1 ? 'event' : 'events'}`
                  : 'Activity feed'}
              </h2>
            </div>
          </div>
          {!activity ? (
            <p className="rounded-2xl bg-brand-cream px-4 py-6 text-center text-sm font-semibold text-slate-400">
              Loading activity…
            </p>
          ) : activity.events.length === 0 ? (
            <p className="rounded-2xl bg-brand-cream px-4 py-6 text-center text-sm font-semibold text-brand-ink-soft">
              Nothing yet. When your kids build something with Spark, it&apos;ll show up here.
            </p>
          ) : (
            <ol className="divide-y divide-brand-cream-2">
              {activity.events.slice(0, 12).map((event, idx) => (
                <ActivityRow key={`${event.kidProfileId}-${event.createdAt}-${idx}`} event={event} />
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-3xl border border-brand-cream-2 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-accent-700">Profiles in your family</p>
              <h2 className="font-display text-lg font-bold text-brand-navy">
                {family?.kids.length ?? 0} profile{family?.kids.length === 1 ? '' : 's'}
              </h2>
            </div>
            <Link
              href="/parent/setup"
              className="inline-flex items-center gap-1 rounded-2xl border border-brand-cream-2 bg-white px-3 py-2 text-sm font-bold text-brand-navy hover:bg-brand-cream"
            >
              <Users className="h-4 w-4" />
              Add a profile
            </Link>
          </div>

          {!family?.kids.length ? (
            <p className="rounded-2xl bg-brand-cream px-4 py-6 text-center text-sm font-semibold text-brand-ink-soft">
              No profiles yet. Add yourself or a kid in setup, then everyone in the family signs in with the code above.
            </p>
          ) : (
            <div className="space-y-4">
              {family.kids.map((kid) => (
                <KidRow key={kid.id} kid={kid} stats={statsByKid.get(String(kid.id))} />
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

type Kid = {
  id: Id<'kidProfiles'>;
  displayName: string;
  age?: number;
  avatarColor?: string;
  projects: { id: Id<'safesparkProjects'>; title: string; html: string; updatedAt: number; lastPrompt?: string }[];
};

type KidStats = {
  id: Id<'kidProfiles'>;
  displayName: string;
  avatarColor: string;
  promptsToday: number;
  blockedToday: number;
  lastActiveAt: number | null;
  dailyQueryBudget?: number;
  accessPaused: boolean;
};

function KidRow({ kid, stats }: { kid: Kid; stats?: KidStats }) {
  const marketing = useMarketingAuth();
  const setKidAccessPaused = useMutation(api.safespark.setKidAccessPaused);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Optimistic local pause state — flips immediately on click, server
  // call lands in the background. Reverts on server error.
  const [pausedOverride, setPausedOverride] = useState<boolean | null>(null);
  const effectivePaused = pausedOverride ?? stats?.accessPaused ?? false;

  const togglePause = async () => {
    const next = !effectivePaused;
    setPausedOverride(next);
    try {
      await setKidAccessPaused({
        kidProfileId: kid.id,
        paused: next,
        userToken: marketing.token ?? undefined,
      });
    } catch (err) {
      console.error('setKidAccessPaused failed', err);
      setPausedOverride(!next);
    }
  };

  const colorClass =
    {
      violet: 'bg-violet-500',
      pink: 'bg-pink-500',
      emerald: 'bg-emerald-500',
      amber: 'bg-amber-500',
      sky: 'bg-sky-500',
      rose: 'bg-rose-500',
    }[kid.avatarColor ?? 'violet'] ?? 'bg-violet-500';

  return (
    <div
      className={
        effectivePaused
          ? 'rounded-2xl border-2 border-amber-300 bg-amber-50 p-4'
          : 'rounded-2xl border border-brand-cream-2 bg-brand-cream p-4'
      }
    >
      <div className="flex items-center gap-3">
        <Link
          href={`/parent/profile/${kid.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl -m-1 p-1 hover:bg-white/60"
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorClass} font-display text-lg font-bold text-white shadow`}>
            {kid.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-brand-navy">{kid.displayName}</h3>
            <p className="text-xs font-bold text-brand-ink-soft">
              {kid.age != null ? `Age ${kid.age} · ` : ''}{kid.projects.length} project{kid.projects.length === 1 ? '' : 's'} · View all →
            </p>
          </div>
        </Link>
        {/* Pause toggle — iOS-style switch. Paused state shows amber
            border on the whole kid card so a quick scan flags any
            paused kid. Server enforces the gate so a paused kid
            never burns a token. */}
        <button
          type="button"
          onClick={togglePause}
          aria-pressed={effectivePaused}
          title={effectivePaused ? 'Spark paused for this kid — tap to resume' : 'Tap to pause Spark for this kid'}
          className={
            effectivePaused
              ? 'inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-amber-500 transition-colors'
              : 'inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-slate-300 transition-colors hover:bg-slate-400'
          }
        >
          <span
            className={
              effectivePaused
                ? 'inline-block h-5 w-5 translate-x-6 transform rounded-full bg-white shadow transition-transform'
                : 'inline-block h-5 w-5 translate-x-1 transform rounded-full bg-white shadow transition-transform'
            }
          />
        </button>
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          className="inline-flex items-center gap-1 rounded-xl border border-brand-cream-2 bg-white px-2.5 py-1.5 text-xs font-bold text-brand-ink-soft hover:bg-brand-cream-2"
          aria-expanded={settingsOpen}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Settings
        </button>
      </div>
      {effectivePaused && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
          Paused — Spark is refusing new builds for {kid.displayName} until you toggle this back on.
        </p>
      )}
      {/* 3-metric strip — today's prompt count, safety status, last
          active. Copied straight from the SafeTunes parent dashboard
          pattern (which kids' families are already used to). Renders
          even when stats is undefined so layout doesn't shift on load. */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <KidMetric
          icon={<MessageSquare className="h-3.5 w-3.5" />}
          label="Prompts today"
          value={stats ? String(stats.promptsToday) : '—'}
          tone="slate"
          context={
            stats?.dailyQueryBudget != null
              ? `of ${stats.dailyQueryBudget}`
              : undefined
          }
        />
        <KidMetric
          icon={
            stats && stats.blockedToday > 0 ? (
              <ShieldAlert className="h-3.5 w-3.5" />
            ) : (
              <Shield className="h-3.5 w-3.5" />
            )
          }
          label="Safety"
          value={
            stats
              ? stats.blockedToday > 0
                ? `${stats.blockedToday} blocked`
                : 'Safe'
              : '—'
          }
          tone={stats && stats.blockedToday > 0 ? 'rose' : 'emerald'}
        />
        <KidMetric
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Last active"
          value={stats?.lastActiveAt ? formatRelativeTime(stats.lastActiveAt) : 'No activity'}
          tone="slate"
        />
      </div>
      {settingsOpen && <KidSettingsPanel kidProfileId={kid.id} />}
      {kid.projects.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {kid.projects.slice(0, 8).map((p) => (
            <ProjectThumb key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// Single metric tile inside a kid row's 3-metric strip.
function KidMetric({
  icon,
  label,
  value,
  context,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  context?: string;
  tone: 'slate' | 'rose' | 'emerald';
}) {
  const palette = {
    slate: 'bg-white border-brand-cream-2 text-brand-navy',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }[tone];
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${palette}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-0.5 text-sm font-black leading-tight">{value}</p>
      {context && <p className="text-[10px] font-semibold opacity-60">{context}</p>}
    </div>
  );
}

// Single row in the dashboard activity feed.
function ActivityRow({
  event,
}: {
  event: {
    kind: 'prompt' | 'blocked';
    kidName: string;
    avatarColor: string;
    content: string;
    projectTitle?: string;
    createdAt: number;
  };
}) {
  const colorClass =
    {
      violet: 'bg-violet-500',
      pink: 'bg-pink-500',
      emerald: 'bg-emerald-500',
      amber: 'bg-amber-500',
      sky: 'bg-sky-500',
      rose: 'bg-rose-500',
    }[event.avatarColor] ?? 'bg-violet-500';
  const isBlocked = event.kind === 'blocked';
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${colorClass} text-xs font-bold text-white shadow`}>
        {event.kidName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-brand-navy">{event.kidName}</span>
          {isBlocked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-700">
              <ShieldAlert className="h-3 w-3" />
              Blocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent-700">
              <MessageSquare className="h-3 w-3" />
              Asked Spark
            </span>
          )}
          {event.projectTitle && (
            <span className="truncate text-[11px] font-bold text-slate-400">
              · {event.projectTitle}
            </span>
          )}
        </div>
        <p className={`mt-0.5 line-clamp-2 text-sm ${isBlocked ? 'text-rose-700' : 'text-brand-ink-soft'}`}>
          {event.content}
        </p>
      </div>
      <span className="shrink-0 text-[11px] font-bold text-slate-400">
        {formatRelativeTime(event.createdAt)}
      </span>
    </li>
  );
}

function formatRelativeTime(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const days = Math.floor(diffSec / 86400);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(ts);
}

function KidSettingsPanel({ kidProfileId }: { kidProfileId: Id<'kidProfiles'> }) {
  const marketing = useMarketingAuth();
  const settings = useQuery(api.safespark.getKidSettings, {
    kidProfileId,
    userToken: marketing.token ?? undefined,
  });
  const setKidSettings = useMutation(api.safespark.setKidSettings);
  const setBlockedTopics = useMutation(api.safespark.setBlockedTopics);
  const setKidDailyBudget = useMutation(api.safespark.setKidDailyBudget);
  const [topicInput, setTopicInput] = useState('');

  if (!settings) {
    return (
      <div className="mt-3 rounded-xl bg-white p-3 text-xs font-semibold text-slate-400">
        Loading settings…
      </div>
    );
  }

  const toggle = async (
    key: 'allowImageRestyle' | 'allowVoice' | 'allowWebData' | 'allowSharing',
    next: boolean,
  ) => {
    try {
      await setKidSettings({ kidProfileId, [key]: next, userToken: marketing.token ?? undefined } as Parameters<typeof setKidSettings>[0]);
    } catch (err) {
      console.error('setKidSettings failed', err);
    }
  };

  const addTopic = async () => {
    const t = topicInput.trim();
    if (!t) return;
    const next = Array.from(new Set([...settings.blockedTopics, t.toLowerCase()]));
    setTopicInput('');
    try {
      await setBlockedTopics({ kidProfileId, topics: next, userToken: marketing.token ?? undefined });
    } catch (err) {
      console.error('setBlockedTopics failed', err);
    }
  };

  const removeTopic = async (topic: string) => {
    const next = settings.blockedTopics.filter((t) => t !== topic);
    try {
      await setBlockedTopics({ kidProfileId, topics: next, userToken: marketing.token ?? undefined });
    } catch (err) {
      console.error('setBlockedTopics failed', err);
    }
  };

  const setBudget = async (next: number | undefined) => {
    try {
      await setKidDailyBudget({
        kidProfileId,
        budget: next,
        userToken: marketing.token ?? undefined,
      });
    } catch (err) {
      console.error('setKidDailyBudget failed', err);
    }
  };

  return (
    <div className="mt-3 space-y-4 rounded-2xl border border-accent-100 bg-white p-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent-700">Allowed for this profile</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <ToggleRow
            label="AI image restyle"
            on={settings.allowImageRestyle}
            onChange={(v) => toggle('allowImageRestyle', v)}
          />
          <ToggleRow
            label="Voice input"
            on={settings.allowVoice}
            onChange={(v) => toggle('allowVoice', v)}
          />
          <ToggleRow
            label="Wikipedia facts"
            on={settings.allowWebData}
            onChange={(v) => toggle('allowWebData', v)}
          />
          <ToggleRow
            label="Share links"
            on={settings.allowSharing}
            onChange={(v) => toggle('allowSharing', v)}
          />
        </div>
      </div>
      {/* Phase 2 — daily prompt budget. Quick-pick presets cover the
          common "after-school light use" → "weekend deep dive" range.
          Custom values still work via setKidDailyBudget (clamped to
          [1, 500] server-side). "No cap" sets it to undefined. */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent-700">
          Daily prompt budget
        </p>
        <p className="mt-1 text-xs text-brand-ink-soft">
          Cap how many builds {`{kid}`.replace('{kid}', 'this profile')} can ask for per day. Server enforces it &mdash; once they hit the cap, Spark refuses politely until midnight UTC.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: 'No cap', value: undefined },
            { label: '10', value: 10 },
            { label: '25', value: 25 },
            { label: '50', value: 50 },
            { label: '100', value: 100 },
          ].map((opt) => {
            const isActive =
              opt.value == null
                ? settings.dailyQueryBudget == null || settings.dailyQueryBudget === 0
                : settings.dailyQueryBudget === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setBudget(opt.value)}
                className={
                  isActive
                    ? 'rounded-xl bg-accent-600 px-3 py-1.5 text-xs font-black text-brand-navy shadow'
                    : 'rounded-xl border border-brand-cream-2 bg-white px-3 py-1.5 text-xs font-bold text-brand-navy hover:bg-brand-cream'
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent-700">Topics Spark won&apos;t build</p>
        <p className="mt-1 text-xs text-brand-ink-soft">
          Add words or phrases. Spark refuses to build projects whose prompt contains any of these.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {settings.blockedTopics.length === 0 ? (
            <span className="text-xs italic text-slate-400">No blocked topics yet.</span>
          ) : (
            settings.blockedTopics.map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700"
              >
                {topic}
                <button
                  type="button"
                  onClick={() => removeTopic(topic)}
                  className="rounded-full text-rose-500 hover:text-rose-700"
                  aria-label={`Remove ${topic}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addTopic();
              }
            }}
            placeholder="e.g. guns, dating, gambling"
            className="flex-1 rounded-xl border border-brand-cream-2 bg-brand-cream px-3 py-2 text-sm text-brand-navy focus:border-accent-400 focus:bg-white focus:outline-none"
            maxLength={80}
          />
          <button
            type="button"
            onClick={() => void addTopic()}
            disabled={!topicInput.trim()}
            className="rounded-xl bg-accent-600 px-3 py-2 text-xs font-black text-brand-navy hover:bg-accent-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-brand-cream px-3 py-2">
      <span className="text-sm font-bold text-brand-navy">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-accent-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

function ProjectThumb({
  project,
}: {
  project: { id: Id<'safesparkProjects'>; title: string; html: string; updatedAt: number; lastPrompt?: string };
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-brand-cream-2 bg-white shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-cream-2">
        <iframe
          srcDoc={project.html}
          sandbox=""
          title={project.title}
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ width: '400%', height: '400%', transform: 'scale(0.25)' }}
          loading="lazy"
        />
      </div>
      <div className="px-3 py-2">
        <p className="line-clamp-1 text-xs font-bold text-brand-navy">{project.title}</p>
        <p className="text-[10px] font-bold text-brand-ink-soft">{formatDate(project.updatedAt)}</p>
      </div>
    </div>
  );
}

function CapMeter({ label, used, cap, pct }: { label: string; used: number; cap: number; pct: number }) {
  const tone =
    pct >= 95
      ? { bar: 'bg-rose-500', text: 'text-rose-700', track: 'bg-rose-100', note: `Cap reached soon — Spark will pause until next month.` }
      : pct >= 80
        ? { bar: 'bg-amber-500', text: 'text-amber-700', track: 'bg-amber-100', note: `Approaching this month's cap.` }
        : { bar: 'bg-emerald-500', text: 'text-emerald-700', track: 'bg-brand-cream-2', note: null };
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-sm font-bold text-brand-navy">{label}</p>
        <p className={`font-mono text-xs font-black ${tone.text}`}>
          {used.toLocaleString()} <span className="text-slate-400">/ {cap.toLocaleString()}</span>
        </p>
      </div>
      <div className={`mt-1.5 h-2 w-full overflow-hidden rounded-full ${tone.track}`}>
        <div className={`h-full ${tone.bar} transition-all`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      {tone.note && <p className={`mt-1 text-[11px] font-semibold ${tone.text}`}>{tone.note}</p>}
    </div>
  );
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}
