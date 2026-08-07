'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useAuth as useMarketingAuth } from '@/contexts/AuthContext';
import { KidMobileNav, KidHeader } from '@/components/kid/SafeFamilyAppLauncher';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  Bot,
  ChevronDown,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  Loader2,
  Maximize2,
  MoreHorizontal,
  Plus,
  Send,
  Share2,
  Sparkles,
  History,
  ImagePlus,
  FileText,
  Printer,
  Square,
  Trash2,
  X,
  UserRound,
  Volume2,
  Wand2,
} from 'lucide-react';
import { VoiceButton } from '../../components/chat/VoiceButton';
import { SpeakButton } from '../../components/chat/SpeakButton';
import { MessageMarkdown } from '../../components/chat/MessageMarkdown';
import { injectSparkDb } from '../../lib/inject-spark-db';
import { KidLoginGate } from '../../components/kid/KidLoginGate';

type DemoMessage = {
  role: 'user' | 'assistant';
  content: string;
  // Stable id for messages that are placeholders OR need to be
  // identified later for replacement. Fire-and-forget queue uses this
  // to replace a "Spark is working…" bubble with the actual reply
  // when the background fetch lands. Optional for back-compat —
  // saved-project messages from before 2026-05-29 don't have ids and
  // never need replacing.
  id?: string;
  // Working placeholder messages render a shimmer + "working on it"
  // copy instead of static content. Replaced on result.
  status?: 'working' | 'done' | 'error';
  // Per-turn diff stats attached to assistant messages that carry a
  // new html build. Lets the kid see how much of the project this
  // change actually touched ("✓ 12 lines changed") — surfaces accidental
  // big rewrites the way Codex / Claude Code show a diff after every
  // edit. Added 2026-05-29 alongside the revert pill.
  diffStats?: {
    added: number;
    removed: number;
    total: number;
  };
  // When this message was created. Working placeholders use this to
  // render elapsed time on-bubble so the kid sees concrete progress
  // instead of a silent spinner during 60-120s builds.
  startedAt?: number;
};

function shortenHost(url: string | undefined): string {
  if (!url) return 'a website';
  try {
    const u = new URL(url, 'https://placeholder.invalid');
    if (u.hostname === 'placeholder.invalid') return url.slice(0, 60);
    return u.hostname;
  } catch {
    return url.slice(0, 60);
  }
}

function newMessageId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Fire-and-forget queue: replace a working-placeholder message in
 * place. Each background run owns one placeholder id (created at send
 * time) and finalizes it here when the result lands — by id, NOT by
 * array position, so concurrent runs don't stomp each other.
 *
 * `patch` is merged onto the placeholder; status defaults to 'done'
 * unless the caller specifies otherwise (error paths pass 'error').
 */
function finalizePlaceholder(
  msgs: DemoMessage[],
  placeholderId: string,
  patch: Partial<DemoMessage>,
): DemoMessage[] {
  return msgs.map((m) =>
    m.id === placeholderId
      ? { ...m, ...patch, id: placeholderId, status: patch.status ?? 'done' }
      : m,
  );
}

/**
 * Fast line-diff approximation: build Sets of trimmed non-empty lines
 * from both sides, count lines unique to each. Not a true LCS diff
 * (won't track moves correctly) but it's O(n) and gives the kid an
 * honest signal: "fix the keyboard" should change a handful of lines,
 * not 200.
 */
function diffHtmlLines(prev: string, next: string): { added: number; removed: number; total: number } {
  if (!prev) return { added: 0, removed: 0, total: next.split('\n').length };
  const a = new Set(prev.split('\n').map((l) => l.trim()).filter(Boolean));
  const b = new Set(next.split('\n').map((l) => l.trim()).filter(Boolean));
  let added = 0;
  let removed = 0;
  for (const line of b) if (!a.has(line)) added++;
  for (const line of a) if (!b.has(line)) removed++;
  return { added, removed, total: next.split('\n').length };
}

type DemoReply = {
  reply: string;
  html?: string;
  title?: string;
  nextSteps?: string[];
  changed?: boolean;
  versionLabel?: string;
  versionSummary?: string;
  // Image-edit fast path: when set, the project is the image itself.
  imageUrl?: string;
  kind?: 'html' | 'image';
  error?: string;
  // Phase 3 — set when the parent's blocklist refused the build.
  // The kid sees an "Ask my parent" button under Spark's refusal that
  // submits these to requestTopicBySession for parent review.
  blockedPhrase?: string;
  blockedPrompt?: string;
  // Phase 4 — set by Spark when it builds a chat / message wall /
  // guestbook so the parent sees an amber "chat" badge on the project
  // card and knows to inspect the spark.db contents.
  communicationProject?: boolean;
};

type DemoProject = {
  id: string;
  title: string;
  html: string;
  createdAt: number;
  updatedAt: number;
  lastPrompt?: string;
  lastReply?: string;
  messages?: DemoMessage[];
  nextSteps?: string[];
};

type SharePayload = {
  v: 1;
  title: string;
  html: string;
};

type ShareProject = Omit<SharePayload, 'v'>;

type CompressionWindow = Window &
  typeof globalThis & {
    CompressionStream?: new (format: 'gzip') => TransformStream<Uint8Array, Uint8Array>;
  };

const DEMO_STORAGE_KEY = 'lumiDemoCode';
const PROJECTS_STORAGE_KEY = 'lumiDemoProjects';
// Pending-job localStorage prefix. Keyed by identity so two kids
// sharing a browser don't apply each other's results. See sendPrompt
// for the writer and the rehydrate effect for the reader.
const PENDING_JOB_KEY_PREFIX = 'safesparkPendingJob:';

function pendingJobKeyForIdentity(
  kidSessionToken?: string | null,
  clerkUserId?: string | null,
): string | null {
  if (typeof window === 'undefined') return null;
  if (kidSessionToken) return `${PENDING_JOB_KEY_PREFIX}kid:${kidSessionToken}`;
  if (clerkUserId) return `${PENDING_JOB_KEY_PREFIX}user:${clerkUserId}`;
  return null;
}

function rememberPendingJob(
  kidSessionToken: string | null,
  clerkUserId: string | undefined | null,
  jobId: string,
): void {
  const key = pendingJobKeyForIdentity(kidSessionToken, clerkUserId);
  if (!key) return;
  try { localStorage.setItem(key, jobId); } catch { /* quota? ignore */ }
}

function forgetPendingJob(
  kidSessionToken: string | null,
  clerkUserId: string | undefined | null,
): void {
  const key = pendingJobKeyForIdentity(kidSessionToken, clerkUserId);
  if (!key) return;
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

function readPendingJob(
  kidSessionToken: string | null,
  clerkUserId: string | undefined | null,
): string | null {
  const key = pendingJobKeyForIdentity(kidSessionToken, clerkUserId);
  if (!key) return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

const STARTER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SafeSpark</title>
  <style>
    /* Safe Family glow-up: amber accent + peach umbrella on a cream ground */
    :root { --v: #F2A413; --p: #F5A962; --a: #E88B6A; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at 10% 20%, rgba(242,164,19,.10), transparent 50%),
        radial-gradient(circle at 90% 80%, rgba(232,139,106,.10), transparent 50%),
        linear-gradient(135deg, #FBF6EF, #F3EADD);
      color: #221D2E;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      padding: 20px;
    }
    main {
      width: min(640px, 100%);
      text-align: center;
    }
    .spark {
      width: 84px; height: 84px;
      margin: 0 auto 18px;
      border-radius: 22px;
      background: linear-gradient(135deg, var(--v), var(--p), var(--a));
      box-shadow: 0 16px 60px rgba(242,164,19,.35);
      display: grid; place-items: center;
      color: white; font-size: 44px; font-weight: 900;
      animation: float 4s ease-in-out infinite;
    }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    h1 {
      margin: 0 0 10px; font-size: clamp(32px, 6vw, 52px); font-weight: 800;
      color: #221D2E;
      letter-spacing: -0.02em;
    }
    p.lead { margin: 0 0 22px; font-size: 17px; line-height: 1.55; color: #475569; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 4px; }
    .chip {
      padding: 8px 14px; border-radius: 999px; background: white;
      border: 1px solid #ddd6fe; font-size: 13px; font-weight: 700; color: #6d28d9;
      box-shadow: 0 4px 14px rgba(124,58,237,.06);
    }
    .arrow { font-size: 22px; margin-top: 26px; color: #94a3b8; }
  </style>
</head>
<body>
  <main>
    <!-- inline lucide Sparkles glyph so the empty state carries the
         real SafeSpark mark instead of the stray "S" letter the emoji
         purge accidentally left behind. White stroke against the
         violet-pink-amber gradient .spark chip. -->
    <div class="spark" aria-label="SafeSpark">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
        <path d="M20 3v4"/>
        <path d="M22 5h-4"/>
        <path d="M4 17v2"/>
        <path d="M5 18H3"/>
      </svg>
    </div>
    <h1>What can I help with?</h1>
    <p class="lead">Ask Spark a question, or ask Spark to build something — a game, flashcards, a quiz, a poster, a tool.</p>
    <p class="lead">Type in the chat to get started.</p>
  </main>
</body>
</html>`;

type Template = { label: string; prompt: string };
const TEMPLATES: Template[] = [
  {
    label: 'Make a game',
    prompt: 'Make a fun playable game. Ask me one quick question about what kind, then build it.',
  },
  {
    label: 'Flashcards',
    prompt: 'Make a flashcard study app. Ask me what subject I want to study, then build flashcards with a flip animation and a "next card" button.',
  },
  {
    label: 'Quiz',
    prompt: 'Make a multiple-choice quiz. Ask me the topic, then build a quiz with 10 questions, score tracking, and a results screen.',
  },
  {
    label: 'Poster',
    prompt: 'Make a poster I can print. Ask me what the poster is for, then design a bold one-page poster with a big headline.',
  },
  {
    label: 'Tracker',
    prompt: 'Make a tracker app that saves data in localStorage so it remembers between visits. Ask me what I want to track.',
  },
  {
    label: 'Restyle photo',
    prompt: 'I uploaded a photo — restyle it as a cartoon and show it as a movie poster.',
  },
];
const STARTER_MESSAGE = "Ask me anything, or tell me what to build.";
const ACTION_BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-cream';
const PRIMARY_ACTION_BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-xl bg-accent-600 px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-accent-700';
const UTILITY_BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-brand-cream';

export function DemoWorkbench({ initialDemoCode = '' }: { initialDemoCode?: string }) {
  const initialProjects = useMemo(() => loadDemoProjects(), []);
  const firstProject = initialProjects[0];
  const [demoCode] = useState(() => getInitialDemoCode(initialDemoCode));
  const [unlocked] = useState(() => Boolean(getInitialDemoCode(initialDemoCode)));
  const [input, setInput] = useState('');
  const [html, setHtml] = useState(firstProject?.html ?? STARTER_HTML);
  const [projectTitle, setProjectTitle] = useState(firstProject?.title ?? 'Starter Pad');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(firstProject?.id ?? null);
  const [projects, setProjects] = useState<DemoProject[]>(initialProjects);
  const [messages, setMessages] = useState<DemoMessage[]>(
    firstProject?.messages?.length
      ? firstProject.messages
      : [{ role: 'assistant', content: firstProject?.lastReply ?? STARTER_MESSAGE }],
  );
  const [nextSteps, setNextSteps] = useState<string[]>(
    firstProject?.nextSteps?.length ? firstProject.nextSteps : [],
  );
  // Fire-and-forget queue counter. >0 means at least one build is
  // running in the background — kid can keep typing while it cooks.
  // Cap concurrent builds to MAX_CONCURRENT to bound cost + simplify
  // state (true cost protection lives server-side in the per-kid
  // dailyQueryBudget). `busy` is kept as a derived alias for the
  // many existing render paths that ask "is anything in flight."
  const [inflightCount, setInflightCount] = useState(0);
  const busy = inflightCount > 0;
  const MAX_CONCURRENT = 2;
  const [streamingText, setStreamingText] = useState('');
  const [streamStartedAt, setStreamStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Phase 3 — when the parent's blocklist refused a build, the response
  // carries blockedPhrase + blockedPrompt. We pin the message index of
  // that refusal so the chat UI can render an "Ask my parent" CTA only
  // under that specific message. Cleared once a request is submitted OR
  // the kid sends a new prompt. requestStatus reflects in-flight state
  // for the button so we don't double-submit.
  const [blockedRefusal, setBlockedRefusal] = useState<{
    phrase: string;
    prompt: string;
    messageIdx: number;
  } | null>(null);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  // Per-in-flight AbortController, keyed by placeholderId so the Stop
  // button can abort the latest (or all) without losing track of other
  // builds the kid queued. Replaces the old single abortRef which was
  // incorrect for fire-and-forget (would overwrite previous controllers
  // on every send, leaking aborts).
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  // Preview iframe ref — kept for parity even though the Fullscreen
  // API was replaced by a CSS-based play overlay (see playFullscreen).
  // iOS Safari refuses requestFullscreen() on iframes; the overlay
  // works everywhere because it's just a fixed-position div.
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  // Play-mode overlay state — when true, the preview takes over the
  // viewport via fixed positioning. Works on every browser including
  // iOS Safari, unlike the real Fullscreen API. Esc / tap the Done
  // pill exits.
  const [playFullscreen, setPlayFullscreen] = useState(false);
  useEffect(() => {
    if (!playFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlayFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [playFullscreen]);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  // Lazy init from localStorage avoids a redundant setState in an effect.
  const [autoSpeak, setAutoSpeak] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('safesparkAutoSpeak') === '1';
  });
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState<string | null>(null);
  const [localGuestProjects, setLocalGuestProjects] = useState<DemoProject[]>(initialProjects);
  const [pendingDeletion, setPendingDeletion] = useState<{
    project: DemoProject;
    finalizeAt: number;
  } | null>(null);
  const pendingDeleteTimerRef = useRef<number | null>(null);

  const toggleAutoSpeak = () => {
    setAutoSpeak((current) => {
      const next = !current;
      if (typeof window !== 'undefined') {
        localStorage.setItem('safesparkAutoSpeak', next ? '1' : '0');
        if (!next && window.speechSynthesis) window.speechSynthesis.cancel();
      }
      return next;
    });
  };
  const [error, setError] = useState<string | null>(null);
  // Truthfulness bridge — accumulates runtime errors postMessage'd from
  // the kid's iframe (CSP blocks, CORS rejections, 4xx/5xx, JS errors).
  // Surfaced in chat as honest "the build hit X" notes and prepended as
  // system context on the next prompt so the model has ground truth.
  // Without this, the model would canned-reply "fixed it" forever on
  // silent infra failures (Pokemon TCG API was the catalyst).
  const [iframeErrors, setIframeErrors] = useState<
    Array<{ kind: 'network-blocked' | 'fetch-error' | 'script-error'; url?: string; status?: number; message?: string; directive?: string; at: number }>
  >([]);
  // Auto-fix countdown — when iframeErrors transitions empty→present, we
  // start a short countdown and auto-send the recovery prompt unless the
  // kid cancels (Dismiss, starts typing, or a build is already in flight).
  // null = no countdown active; number = seconds remaining. Why have this
  // at all instead of just auto-firing immediately? (a) errors often
  // arrive in bursts as the iframe boots — wait for them to coalesce.
  // (b) the kid might be fine with the build as-is and not want Spark to
  // touch it. (c) makes the system feel responsive but not magical/spooky.
  const [autoFixCountdown, setAutoFixCountdown] = useState<number | null>(null);
  // Tracks the errors-cycle so we don't auto-fix the same set twice.
  // Resets when iframeErrors goes empty (after dismiss, after a fix lands).
  const autoFiredThisCycleRef = useRef(false);
  const [showCode, setShowCode] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Account menu popover — groups Switch profile + Admin/Sign in
  // behind an avatar button so the kid header isn't a 7-pill row.
  // The Admin button is still hidden when kidSessionToken is active
  // (same logic as before — just relocated inside the popover).
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  // Result-panel overflow menu — wraps HTML download + Print/PDF
  // so the right-panel header is just [Full screen] [View code] […].
  const [showResultOverflow, setShowResultOverflow] = useState(false);
  const resultOverflowRef = useRef<HTMLDivElement | null>(null);
  // Click-outside-to-close for the small inline popovers (account
  // menu in the header + overflow menu in the result panel). No UI
  // library — just refs + a document mousedown listener that closes
  // each popover when a tap lands outside its wrapper.
  useEffect(() => {
    if (!showAccountMenu && !showResultOverflow) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (showAccountMenu && accountMenuRef.current && target && !accountMenuRef.current.contains(target)) {
        setShowAccountMenu(false);
      }
      if (showResultOverflow && resultOverflowRef.current && target && !resultOverflowRef.current.contains(target)) {
        setShowResultOverflow(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [showAccountMenu, showResultOverflow]);
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview' | 'projects'>('chat');
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  // Marketing Central is the sole parent identity post-Clerk-retirement
  // (2026-05-28). `isSignedIn` here represents a parent who has signed
  // in via /login; it's used to decide whether to show the "Admin" link
  // back to /parent and to auto-import any local guest projects into the
  // parent's account.
  const marketing = useMarketingAuth();
  const isSignedIn = marketing.isAuthenticated;
  // Defer localStorage reads to a post-mount effect to avoid the
  // hydration mismatch / flicker we hit 2026-05-28. Reading localStorage
  // during render returns null on the server and the token on the client,
  // making the first paint switch subtrees.
  //
  // /make is the KID app — parents come here to use it as a kid, not as
  // themselves. The admin surface is /parent. So we ALWAYS show the
  // family-code + profile-picker gate when no kid session exists.
  // Matches SafeTunes /play, SafeTube /play, SafeReads /read.
  const [mounted, setMounted] = useState(false);
  const [kidSessionToken, setKidSessionToken] = useState<string | null>(null);
  // Pending-job id from localStorage (set by sendPrompt before the
  // fetch; cleared on success/abort, OR left in place if the page
  // unloads mid-stream). Read on mount. Drives the rehydrate effect
  // below — if a job exists and Convex reports it complete, we apply
  // the result as if the stream had finished in this tab.
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setKidSessionToken(localStorage.getItem('lumiKidSession'));
    }
  }, []);
  const hasIdentity = Boolean(isSignedIn || kidSessionToken);
  const shouldShowGate = !kidSessionToken;
  const cloudProjects = useQuery(
    api.safespark.listMyProjects,
    hasIdentity ? { sessionToken: kidSessionToken ?? undefined } : 'skip',
  );
  // Parent-controlled kid kill switches. Hides the mic when allowVoice is off.
  const kidSettings = useQuery(
    api.safespark.getKidSettingsBySession,
    kidSessionToken ? { sessionToken: kidSessionToken } : 'skip',
  );
  const allowVoice = !kidSessionToken || (kidSettings ? kidSettings.allowVoice : true);
  // Pull familyCode so KidMobileNav's "Apps" sheet can populate
  // `?fc=` deeplinks (kid hops to SafeTunes etc. without re-typing
  // the code). Reuses the dashboard query — small payload, cheap.
  const dashboardData = useQuery(
    api.safespark.getKidDashboardData,
    kidSessionToken ? { sessionToken: kidSessionToken } : 'skip',
  );
  const familyCode = dashboardData?.familyCode ?? null;
  const saveCloudRaw = useMutation(api.safespark.saveProject);
  const deleteCloudRaw = useMutation(api.safespark.deleteProject);
  const logRequestRaw = useMutation(api.safespark.logRequest);
  const setRequestReplyMut = useMutation(api.safespark.setRequestReply);
  const logErrorRaw = useMutation(api.safespark.logError);
  const saveCloud = useMemo(
    () => (args: Parameters<typeof saveCloudRaw>[0]) => {
      // Strip client-only fields (id, status, diffStats) — the Convex
      // validator is strict on {role, content} and silently 500s on
      // extras with "Server Error: Called by client".
      const cleanMessages = (args.messages ?? []).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      return saveCloudRaw({
        ...args,
        messages: cleanMessages,
        sessionToken: kidSessionToken ?? undefined,
      });
    },
    [saveCloudRaw, kidSessionToken],
  );
  const deleteCloud = useMemo(
    () => (args: Parameters<typeof deleteCloudRaw>[0]) =>
      deleteCloudRaw({ ...args, sessionToken: kidSessionToken ?? undefined }),
    [deleteCloudRaw, kidSessionToken],
  );
  const logRequest = useMemo(
    () => (args: Parameters<typeof logRequestRaw>[0]) =>
      logRequestRaw({ ...args, sessionToken: kidSessionToken ?? undefined }),
    [logRequestRaw, kidSessionToken],
  );
  const restoreVersionMut = useMutation(api.safespark.restoreVersionForOwner);
  // Phase 3 — kid-side "ask my parent" submission. Fires the topic
  // request to /parent so the parent can one-click approve/deny.
  const requestTopicBySession = useMutation(api.safespark.requestTopicBySession);
  // Per-project context checkpoint trigger — fired after each successful
  // save so Spark doesn't lose the original premise / art direction once
  // the rolling 8-turn message window slides past it. The action no-ops
  // unless cadence is met (~10 turns or > 48h since last checkpoint), so
  // calling it on every save is cheap. Knox-frustration fix 2026-05-28.
  const maybeCreateCheckpoint = useAction(api.checkpoints.maybeCreateCheckpoint);
  const generateUploadUrl = useMutation(api.safespark.generateImageUploadUrl);
  const finalizeImageUpload = useMutation(api.safespark.finalizeImageUpload);
  const createShareLink = useMutation(api.safespark.createShareLink);
  const restoreProjectMut = useMutation(api.safespark.restoreProject);
  const purgeProjectMut = useMutation(api.safespark.purgeProject);
  // Async build jobs — see convex/jobs.ts + safesparkJobs schema. Lets
  // the kid close the tab / navigate away / mobile-background a long
  // build and pick up the result on next page load. Without this the
  // streaming fetch dies with the JS process and the kid loses work.
  const createJobMut = useMutation(api.jobs.createJob);
  const claimJobMut = useMutation(api.jobs.claimJob);
  const deletedProjects = useQuery(
    api.safespark.listMyDeletedProjects,
    isSignedIn ? {} : 'skip',
  );
  const [showDeleted, setShowDeleted] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingPdf, setPendingPdf] = useState<{ filename: string; pageCount: number; text: string; chars: number; truncated: boolean } | null>(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const [imageResultUrl, setImageResultUrl] = useState<string | null>(null);

  const handleImageUpload = async (file: File) => {
    if (!isSignedIn) {
      setError('Sign in to attach images.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Only image files (png, jpg, gif, webp) can be attached.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image is too big — keep it under 5 MB.');
      return;
    }
    setImageUploading(true);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl({ sessionToken: kidSessionToken ?? undefined });
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed.');
      const { storageId } = (await res.json()) as { storageId: string };
      const { url } = await finalizeImageUpload({ storageId, sessionToken: kidSessionToken ?? undefined });
      setPendingImageUrl(url);
    } catch (err) {
      console.error('[safespark] image upload failed:', err);
      setError("That photo didn't make it through — try attaching it again, or pick a different one.");
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (!isSignedIn) {
      setError('Sign in to attach PDFs.');
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files can be attached here.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('PDF is too big — keep it under 10 MB.');
      return;
    }
    setPdfUploading(true);
    setError(null);
    try {
      const uploadUrl = await generateUploadUrl({ sessionToken: kidSessionToken ?? undefined });
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/pdf' },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed.');
      const { storageId } = (await res.json()) as { storageId: string };
      const extractRes = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageId, sessionToken: kidSessionToken }),
      });
      const parsed = (await extractRes.json()) as
        | { text: string; pageCount: number; truncated: boolean; chars: number }
        | { error: string };
      if (!extractRes.ok || 'error' in parsed) {
        throw new Error('error' in parsed ? parsed.error : 'PDF extract failed.');
      }
      setPendingPdf({
        filename: file.name,
        pageCount: parsed.pageCount,
        text: parsed.text,
        chars: parsed.chars,
        truncated: parsed.truncated,
      });
    } catch (err) {
      console.error('[safespark] pdf upload failed:', err);
      setError("That PDF didn't make it through — try attaching it again, or pick a different one.");
    } finally {
      setPdfUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const looksLikeConvexId = (value: string | null): boolean =>
    typeof value === 'string' && value.length > 0 && !value.includes('-');
  const cloudVersions = useQuery(
    api.safespark.listVersionsForOwner,
    hasIdentity && looksLikeConvexId(activeProjectId)
      ? {
          projectId: activeProjectId as unknown as Id<'safesparkProjects'>,
          sessionToken: kidSessionToken ?? undefined,
          userToken: marketing.token ?? undefined,
        }
      : 'skip',
  );
  const cloudReady = hasIdentity && cloudProjects !== undefined;
  const effectiveProjects = useMemo<DemoProject[]>(() => {
    if (!hasIdentity) return projects;
    if (!cloudProjects) return [];
    return cloudProjects.map((row) => ({
      id: row.id as unknown as string,
      title: row.title,
      html: row.html,
      messages: row.messages as DemoMessage[],
      nextSteps: row.nextSteps,
      lastPrompt: row.lastPrompt,
      lastReply: row.lastReply,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }, [hasIdentity, cloudProjects, projects]);

  const canSend = input.trim().length > 1 && inflightCount < MAX_CONCURRENT;
  const hasUserMessages = messages.some((message) => message.role === 'user');

  // -----------------------------------------------------------------
  // Async build job rehydration.
  //
  // On mount (post identity), check localStorage for a pending jobId.
  // If present, subscribe to its status. When it flips to 'complete'
  // (or 'failed'), apply the result as if the stream had finished in
  // this tab — html into the preview, reply into the chat, then drop
  // the localStorage pointer + mark the job 'claimed' server-side.
  //
  // Survives: tab close, navigation away, browser crash, mobile
  // backgrounding past Chrome's intensive-throttle window. The kid
  // loses nothing.
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!mounted) return;
    const id = readPendingJob(kidSessionToken, marketing.user?.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingJobId(id);
  }, [mounted, kidSessionToken, marketing.user?.id]);

  const rehydratedJob = useQuery(
    api.jobs.getJob,
    pendingJobId && !busy
      ? {
          jobId: pendingJobId as unknown as Id<'safesparkJobs'>,
          sessionToken: kidSessionToken ?? undefined,
          clerkUserId: marketing.user?.id ?? undefined,
        }
      : 'skip',
  );

  // Track whether we've already applied this rehydration so the
  // effect doesn't re-fire on Convex reactivity (the row changes
  // status → claimed → cleanup, etc.).
  const rehydrateAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingJobId || !rehydratedJob) return;
    if (rehydrateAppliedRef.current === pendingJobId) return;
    if (rehydratedJob.status === 'pending' || rehydratedJob.status === 'running') {
      // Still cooking. The Convex subscription will re-fire when it
      // flips to complete/failed; no work to do here yet. Could show
      // a "still building from your last session…" indicator but
      // keeping it silent for now to avoid spooking the kid.
      return;
    }
    if (rehydratedJob.status === 'claimed') {
      // Another tab already applied this. Just drop our pointer.
      forgetPendingJob(kidSessionToken, marketing.user?.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingJobId(null);
      rehydrateAppliedRef.current = pendingJobId;
      return;
    }
    rehydrateAppliedRef.current = pendingJobId;
    if (rehydratedJob.status === 'failed') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: `Heads up — the build I was running in the background didn't finish. (${rehydratedJob.errorMessage ?? 'Unknown error'}). Try your idea again.`,
        },
      ]);
    } else if (rehydratedJob.status === 'complete' && rehydratedJob.resultJson) {
      try {
        const parsed = JSON.parse(rehydratedJob.resultJson) as DemoReply;
        if (parsed.html) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setHtml(parsed.html);
        }
        if (parsed.title) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setProjectTitle(parsed.title);
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: `Picked up where you left off: ${parsed.reply}`,
          },
        ]);
      } catch {
        // Bad JSON in result row — surface the issue and move on.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: 'Heads up — I had a build running in the background but couldn\'t restore it. Try the idea again.',
          },
        ]);
      }
    }
    // Clean up — drop pointer + mark claimed server-side so other tabs don't replay.
    forgetPendingJob(kidSessionToken, marketing.user?.id);
    void claimJobMut({
      jobId: pendingJobId as unknown as Id<'safesparkJobs'>,
      sessionToken: kidSessionToken ?? undefined,
      clerkUserId: marketing.user?.id ?? undefined,
    }).catch(() => { /* swallow */ });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingJobId(null);
  }, [pendingJobId, rehydratedJob, kidSessionToken, marketing.user?.id, claimJobMut]);

  useEffect(() => {
    if (!streamStartedAt) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - streamStartedAt) / 1000));
    }, 250);
    return () => window.clearInterval(interval);
  }, [streamStartedAt]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingText, busy]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Refresh guest-mode local projects when auth state changes. This is a
    // genuine sync from an external store (localStorage) on dep change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalGuestProjects(loadDemoProjects());
  }, [isSignedIn]);

  const importGuestProjects = useCallback(async () => {
    if (!isSignedIn) return;
    setMigrating(true);
    setMigrateResult(null);
    let succeeded = 0;
    let failed = 0;
    try {
      for (const project of localGuestProjects) {
        try {
          await saveCloud({
            title: project.title,
            html: project.html,
            messages: (project.messages ?? []) as DemoMessage[],
            nextSteps: project.nextSteps,
            lastPrompt: project.lastPrompt,
            lastReply: project.lastReply,
            versionLabel: 'Imported from this browser',
            versionSummary: 'Recovered from guest-mode local storage.',
          });
          succeeded += 1;
        } catch {
          failed += 1;
        }
      }
      if (succeeded > 0) {
        persistProjects([]);
        setLocalGuestProjects([]);
      }
      setMigrateResult(
        failed === 0
          ? `Saved ${succeeded} project${succeeded === 1 ? '' : 's'} to your account.`
          : `Saved ${succeeded}, ${failed} failed.`,
      );
    } finally {
      setMigrating(false);
    }
  }, [isSignedIn, localGuestProjects, saveCloud]);

  const autoMigratedRef = useRef(false);
  useEffect(() => {
    if (!isSignedIn || !cloudReady) return;
    if (autoMigratedRef.current) return;
    if (localGuestProjects.length === 0) return;
    autoMigratedRef.current = true;
    // importGuestProjects calls setState internally for migration UI status,
    // but it's a one-shot ref-guarded migration that must run when the user
    // signs in and the cloud is ready.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void importGuestProjects();
  }, [isSignedIn, cloudReady, localGuestProjects.length, importGuestProjects]);

  const galleryAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (galleryAutoOpenedRef.current) return;
    if (!cloudReady && !unlocked) return;
    const hasProjects = effectiveProjects.length > 0;
    const hasMessages = hasUserMessages;
    if (hasProjects && !activeProjectId && !hasMessages) {
      // Ref-guarded one-shot UI nudge based on async query readiness.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowProjects(true);
      setMobileTab('projects');
      galleryAutoOpenedRef.current = true;
    }
  }, [cloudReady, unlocked, effectiveProjects.length, activeProjectId, hasUserMessages]);

  // Auto-open project from `?project=<id>` URL param. Dashboard project
  // tiles link to /make?project=<id> — without this effect, the
  // workbench just loads its default first project regardless. One-
  // shot guarded so navigating WITHIN /make (clicking another project
  // tile) doesn't fight the manual selection.
  const searchParams = useSearchParams();
  const projectAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (projectAutoOpenedRef.current) return;
    if (!cloudReady) return;
    const requestedId = searchParams?.get('project');
    if (!requestedId) return;
    const match = effectiveProjects.find((p) => p.id === requestedId);
    if (!match) return;
    projectAutoOpenedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openProject(match);
    // Don't include openProject in deps — it's recreated every render
    // and would re-fire this effect infinitely. The ref guards re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudReady, effectiveProjects, searchParams]);

  // Iframe error bridge listener — receives postMessage from the
  // injected error-bridge script in every kid project. Dedupes by
  // (kind, url, status) so a fetch in a loop doesn't blow up the array.
  // Capped at 8 most-recent so memory + prompt-context don't grow
  // unboundedly. Cleared after each successful submit (the model
  // already got the context).
  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      const data = ev.data as
        | { source?: string; type?: string; url?: string; status?: number; message?: string; directive?: string }
        | null;
      if (!data || data.source !== 'spark-iframe') return;
      let kind: 'network-blocked' | 'fetch-error' | 'script-error' | null = null;
      if (data.type === 'spark:network-blocked') kind = 'network-blocked';
      else if (data.type === 'spark:fetch-error') kind = 'fetch-error';
      else if (data.type === 'spark:script-error') kind = 'script-error';
      if (!kind) return;
      const resolvedKind = kind;
      setIframeErrors((prev) => {
        const key = `${resolvedKind}|${data.url ?? ''}|${data.status ?? ''}|${data.message ?? ''}`;
        // Dedupe: if same key already present in last 8, don't push again.
        if (prev.some((e) => `${e.kind}|${e.url ?? ''}|${e.status ?? ''}|${e.message ?? ''}` === key)) {
          return prev;
        }
        const next = [
          ...prev,
          {
            kind: resolvedKind,
            url: data.url,
            status: data.status,
            message: data.message,
            directive: data.directive,
            at: Date.now(),
          },
        ];
        return next.slice(-8);
      });
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Auto-fix countdown. When errors appear (empty → present), start a
  // 4-second countdown. If it reaches 0 cleanly, auto-send the recovery
  // prompt. Cancellation triggers: kid taps Dismiss → iframeErrors goes
  // empty; kid starts typing → input.length > 0; another build is in
  // flight → inflightCount > 0; we already auto-fired this cycle.
  // Why not auto-fire instantly? Errors arrive in bursts as the iframe
  // loads — wait for them to coalesce. Also gives the kid a brief window
  // to cancel if they're fine with the build as-is.
  useEffect(() => {
    // No errors → no countdown, reset cycle so a future error batch
    // can auto-fire.
    if (iframeErrors.length === 0) {
      setAutoFixCountdown(null);
      autoFiredThisCycleRef.current = false;
      return;
    }
    // Already auto-fired for this batch, or kid is typing, or a build
    // is in flight — don't start a countdown.
    if (autoFiredThisCycleRef.current) return;
    if (input.trim().length > 0) return;
    if (inflightCount > 0) return;
    // Start the countdown at 4s and tick down every second.
    setAutoFixCountdown(4);
    const tick = setInterval(() => {
      setAutoFixCountdown((cur) => {
        if (cur === null) return null;
        if (cur <= 1) {
          clearInterval(tick);
          // Fire if conditions are still OK at zero.
          // We re-check via closure-stable refs/getters — the calling
          // code sets autoFiredThisCycleRef before sending so we never
          // double-fire.
          if (!autoFiredThisCycleRef.current && inflightCount === 0) {
            autoFiredThisCycleRef.current = true;
            void sendPrompt("Something's not working — please fix it.");
          }
          return null;
        }
        return cur - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iframeErrors.length, input.length === 0, inflightCount]);

  // `?new=true` — dashboard hero CTA ("Start a new build") sends kids
  // here. Reset to STARTER_HTML so the next prompt creates a clean
  // project instead of iterating on whatever was last loaded. Ref-
  // guarded so re-renders / param sticking don't re-reset mid-build.
  const newStartedRef = useRef(false);
  useEffect(() => {
    if (newStartedRef.current) return;
    if (!searchParams?.get('new')) return;
    newStartedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startNewProject();
    // Optional `?prompt=...` pre-fills the input so kids can land in
    // the maker with a lesson's "Try this in Spark" example already
    // queued. They tap Send and Spark builds. Skips the manual paste
    // that was the prior UX. URL param is decoded automatically by
    // searchParams.get().
    const pre = searchParams.get('prompt');
    if (pre) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInput(pre);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const showQuickPrompts = !hasUserMessages;
  const sortedProjects = useMemo(
    () =>
      [...effectiveProjects]
        .filter((p) => !pendingDeletion || p.id !== pendingDeletion.project.id)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [effectiveProjects, pendingDeletion],
  );

  const stopGeneration = () => {
    // Fire-and-forget queue: abort ALL in-flight controllers. The stop
    // button is a "panic button" — kid doesn't reason about per-build,
    // they just want everything to stop. The runJob finally blocks will
    // clean up the map and inflight count for each aborted run.
    for (const ctrl of abortControllersRef.current.values()) {
      try { ctrl.abort(); } catch { /* ignore */ }
    }
    abortControllersRef.current.clear();
  };

  const sendPrompt = async (prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;
    // Concurrency cap. Server-side per-kid dailyQueryBudget is the real
    // cost protection; this just keeps the chat readable and prevents
    // accidental spam-Enter from creating a runaway queue.
    if (inflightCount >= MAX_CONCURRENT) {
      setError(`Spark is already on ${inflightCount} other idea${inflightCount === 1 ? '' : 's'}. Wait a sec and I'll get to it.`);
      return;
    }

    // Stable id for the placeholder assistant message that this run
    // owns. Result lands → find by id → replace content. Lets us run
    // multiple builds concurrently without their results stomping each
    // other in the chat thread.
    const placeholderId = newMessageId();

    setError(null);
    setShareStatus(null);
    setStreamingText('');
    // Called from a click/submit handler, not during render — safe.
    // eslint-disable-next-line react-hooks/purity
    setStreamStartedAt(Date.now());
    setElapsedSeconds(0);
    const controller = new AbortController();
    abortControllersRef.current.set(placeholderId, controller);
    setInflightCount((n) => n + 1);
    // Push the user message AND a working-placeholder assistant message
    // in the same setState so the chat updates atomically.
    const nextMessages: DemoMessage[] = [
      ...messages,
      { role: 'user', content: trimmedPrompt },
      { role: 'assistant', id: placeholderId, status: 'working', content: 'Spark is on it…', startedAt: Date.now() },
    ];
    setMessages(nextMessages);
    setInput('');

    // Capture the request id so we can patch in this turn's actual reply
    // once the build lands. Without this, the ops review feed echoes the
    // project's lastReply across every prompt (display artifact that
    // masks real canned-reply loops).
    let requestId: Id<'safesparkRequests'> | null = null;
    if (hasIdentity) {
      try {
        const id = await logRequest({
          prompt: trimmedPrompt,
          projectId: activeProjectId ? (activeProjectId as unknown as Id<'safesparkProjects'>) : undefined,
          projectTitle: projectTitle,
        });
        if (id) requestId = id as unknown as Id<'safesparkRequests'>;
      } catch {
        /* logging failures should not block the build */
      }
    }

    // Create an async build job BEFORE fetching, so the server can
    // persist the final result to Convex independent of whether the
    // browser is still listening. Persist jobId to localStorage keyed
    // by identity — on next page load the rehydration effect checks
    // this slot and subscribes to the job's status. Job creation must
    // not block sending; if it fails (network blip), we still fall
    // through to a normal streaming fetch — just without the
    // resume-after-navigation safety net.
    let jobId: Id<'safesparkJobs'> | null = null;
    if (hasIdentity) {
      try {
        const newJobId = await createJobMut({
          prompt: trimmedPrompt,
          projectId: activeProjectId
            ? (activeProjectId as unknown as Id<'safesparkProjects'>)
            : undefined,
          sessionToken: kidSessionToken ?? undefined,
          clerkUserId: marketing.user?.id ?? undefined,
        });
        jobId = newJobId;
        rememberPendingJob(kidSessionToken, marketing.user?.id, newJobId);
      } catch {
        /* job creation failed — proceed without resume safety net */
      }
    }

    try {
      const response = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          demoCode,
          mode: 'game',
          message: trimmedPrompt,
          html,
          messages: nextMessages,
          imageUrl: pendingImageUrl,
          pdfContext: pendingPdf
            ? { text: pendingPdf.text, filename: pendingPdf.filename, pageCount: pendingPdf.pageCount }
            : null,
          sessionToken: kidSessionToken,
          projectId: activeProjectId,
          jobId,
          // Truthfulness bridge — runtime errors observed in the kid's
          // iframe since the last turn. Server prepends these as a system
          // note so the model has ground truth about what's silently
          // broken (CSP blocks, CORS, 4xx/5xx, JS errors) instead of
          // guessing from the kid's plain-text complaint.
          iframeErrors: iframeErrors.length > 0 ? iframeErrors : undefined,
        }),
      });
      // Clear errors after sending — the model now has the context.
      // Fresh errors during/after this build will accumulate for the
      // next turn.
      setIframeErrors([]);
      if (!response.ok || !response.body) {
        const errorJson = await response.json().catch(() => ({ error: 'Demo request failed.' }));
        throw new Error(errorJson.error ?? 'Demo request failed.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalPayload: DemoReply | null = null;
      let streamError: string | null = null;
      let streamedRaw = '';

      // Stream watchdog — if no chunk for STALL_MS, the connection is
      // almost certainly dead (browser threw out the socket while the
      // tab was backgrounded; intensive throttling kicks in around 5min
      // hidden in Chrome). Without this, `reader.read()` hangs forever
      // and the kid stares at a dead spinner after returning to the tab.
      // 2026-05-29: shipped after Jeremiah hit the bug on desktop.
      const STALL_MS = 90_000;
      const readWithTimeout = async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error('stream-stalled'));
          }, STALL_MS);
        });
        try {
          return (await Promise.race([reader.read(), timeout])) as ReadableStreamReadResult<Uint8Array>;
        } finally {
          if (timer) clearTimeout(timer);
        }
      };

      while (true) {
        const { done, value } = await readWithTimeout();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.startsWith('d:')) {
            const delta = decodeURIComponent(line.slice(2));
            streamedRaw += delta;
            const preview = extractStreamingPreview(streamedRaw);
            setStreamingText(preview);
          } else if (line.startsWith('r:')) {
            try {
              finalPayload = JSON.parse(decodeURIComponent(line.slice(2))) as DemoReply;
            } catch {
              streamError = 'Could not parse the AI reply.';
            }
          } else if (line.startsWith('e:')) {
            streamError = decodeURIComponent(line.slice(2));
          }
          newlineIndex = buffer.indexOf('\n');
        }
      }

      if (streamError) throw new Error(streamError);
      if (!finalPayload) throw new Error('Stream ended without a result.');

      const data = finalPayload;
      // Patch the safesparkRequests row with this turn's actual reply
      // so the ops review feed shows one reply per prompt instead of
      // echoing the project's lastReply across every turn.
      if (requestId && data.reply) {
        void setRequestReplyMut({
          requestId,
          reply: data.reply,
          sessionToken: kidSessionToken ?? undefined,
        }).catch(() => {
          /* per-turn reply log is best-effort */
        });
      }
      // Image-edit fast path: the project IS the edited image. Save as a
      // minimal HTML wrapper (so existing project/share/thumbnail paths
      // keep working) but mark kind='image' so the workbench renders it
      // with the dedicated image result panel instead of an iframe.
      if (data.kind === 'image' && data.imageUrl) {
        const reply = data.reply || 'Edit ready. Download it below.';
        const finalTitle = data.title || projectTitle || 'Photo edit';
        const finalMessages: DemoMessage[] = finalizePlaceholder(nextMessages, placeholderId, {
          content: reply,
        });
        const wrapperHtml = imageProjectHtml(data.imageUrl);
        setHtml(wrapperHtml);
        setImageResultUrl(data.imageUrl);
        if (hasIdentity) {
          try {
            const savedId = await saveCloud({
              id: activeProjectId ? (activeProjectId as unknown as Id<'safesparkProjects'>) : undefined,
              title: finalTitle,
              html: wrapperHtml,
              messages: finalMessages,
              nextSteps: [],
              lastPrompt: trimmedPrompt,
              lastReply: reply,
              versionLabel: data.versionLabel,
              versionSummary: data.versionSummary,
            });
            setActiveProjectId(savedId as unknown as string);
          } catch (saveErr) {
            console.error('[safespark] cloud save failed:', saveErr);
            setError("Couldn't save that to your account — your project is still here, just tap Send again to retry.");
          }
        }
        setProjectTitle(finalTitle);
        setMessages((current) => finalizePlaceholder(current, placeholderId, { content: reply }));
        // Clear the pending image so the next request starts fresh — the
        // edited result is now the "project" and a follow-up edit should
        // restart from a fresh upload if the kid wants a different photo.
        setPendingImageUrl(null);
        return;
      }
      // Switching back to an HTML build clears the image result panel.
      if (data.html) setImageResultUrl(null);
      if (data.html && data.changed !== false) {
        const reply = data.reply || 'I updated the preview. Test it and tell me one thing to change.';
        const stepList = data.nextSteps?.length ? data.nextSteps : nextSteps;
        // Build finalMessages by REPLACING the placeholder (not appending)
        // so the chat thread stays clean when multiple runs are in flight.
        const finalMessages: DemoMessage[] = finalizePlaceholder(nextMessages, placeholderId, {
          content: reply,
        });
        const finalTitle = data.title || projectTitle;
        setHtml(data.html);
        if (hasIdentity) {
          try {
            const savedId = await saveCloud({
              id: activeProjectId ? (activeProjectId as unknown as Id<'safesparkProjects'>) : undefined,
              title: finalTitle,
              html: data.html,
              messages: finalMessages,
              nextSteps: stepList,
              lastPrompt: trimmedPrompt,
              lastReply: reply,
              versionLabel: data.versionLabel,
              versionSummary: data.versionSummary,
              isCommunication: data.communicationProject,
            });
            setActiveProjectId(savedId as unknown as string);
            // Fire-and-forget checkpoint regeneration. Action no-ops
            // unless cadence is met (every ~10 turns or > 48h stale).
            void maybeCreateCheckpoint({
              projectId: savedId as unknown as Id<'safesparkProjects'>,
            }).catch((err) => {
              console.warn('[checkpoint] background trigger failed', err);
            });
          } catch (saveErr) {
            console.error('[safespark] cloud save failed:', saveErr);
            setError("Couldn't save that to your account — your project is still here, just tap Send again to retry.");
          }
        } else {
          const saved = upsertProject({
            id: activeProjectId,
            title: finalTitle,
            html: data.html,
            lastPrompt: trimmedPrompt,
            lastReply: reply,
            messages: finalMessages,
            nextSteps: stepList,
            projects,
          });
          setActiveProjectId(saved.id);
          setProjects(saved.projects);
        }
      }
      if (data.title) setProjectTitle(data.title);
      if (data.nextSteps?.length) setNextSteps(data.nextSteps);
      // Diff stats — surfaces how much this change actually touched.
      // `html` here is the React state captured at sendPrompt entry
      // (closure value), so it's the BEFORE state even though we
      // already called setHtml(data.html) earlier. Only attached when
      // a new html build was returned (no diff for image-only edits or
      // unchanged replies).
      const diffStats = data.html && data.changed !== false
        ? diffHtmlLines(html, data.html)
        : undefined;
      setMessages((current) => {
        // Replace the placeholder bubble by id (NOT append) so concurrent
        // runs don't double-up assistant messages. Pin the blockedRefusal
        // to this placeholder's index in the post-replacement array.
        const next = finalizePlaceholder(current, placeholderId, {
          content: data.reply,
          diffStats,
        });
        if (data.blockedPhrase) {
          const idx = next.findIndex((m) => m.id === placeholderId);
          setBlockedRefusal({
            phrase: data.blockedPhrase,
            prompt: data.blockedPrompt ?? trimmedPrompt,
            messageIdx: idx >= 0 ? idx : next.length - 1,
          });
          setRequestStatus('idle');
        } else {
          // Any non-blocked response clears the pinned refusal.
          setBlockedRefusal(null);
        }
        return next;
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages((current) =>
          finalizePlaceholder(current, placeholderId, {
            content: "Stopped. Send me whatever you'd like next.",
            status: 'error',
          }),
        );
      } else {
        const text = err instanceof Error ? err.message : String(err);
        console.error('[safespark] build error:', text);
        const lowered = text.toLowerCase();
        const kidMessage = lowered.includes('stream-stalled')
          ? 'The connection went quiet — that usually happens when you switch tabs while I\'m building. Tap your idea again and I\'ll start over.'
          : lowered.includes('timeout') || lowered.includes('aborted')
          ? 'I ran out of time on that one. Try a smaller change — "make the player faster" works better than "redo the whole game".'
          : lowered.includes('quota') || lowered.includes('billing') || lowered.includes('insufficient_quota')
          ? "Spark ran out of credits for the month. Tell your parent — they need to top up the SafeSpark account before you can build more."
          : lowered.includes('429') || lowered.includes('rate')
          ? 'A lot of kids are asking Spark right now. Try again in a few seconds.'
          : lowered.includes('json') || lowered.includes('parse')
          ? 'My answer got too big and cut off. Ask me to change one thing at a time.'
          : lowered.includes('stream ended')
          ? 'My answer got cut off before it finished. The whole project might be too big — try asking for a smaller change.'
          : lowered.includes('terminated') || lowered.includes('fetch failed') || lowered.includes('network')
          ? "The connection to my brain dropped for a second. Tap your idea again and I'll try once more."
          : 'Something went wrong on my side. Tap your idea again and I\'ll try once more — if it keeps happening, ask for a smaller version first.';
        // The error strip renders this string verbatim — kid-friendly only,
        // never the raw exception text (that goes to console + logErrorRaw).
        setError(kidMessage);
        setMessages((current) =>
          finalizePlaceholder(current, placeholderId, { content: kidMessage, status: 'error' }),
        );
        // Log to Convex so we can diagnose. Best-effort; never throw.
        try {
          await logErrorRaw({
            prompt: trimmedPrompt,
            kind: lowered.includes('stream ended') ? 'stream_truncated' :
                  lowered.includes('timeout') ? 'client_timeout' :
                  lowered.includes('json') ? 'client_json_parse' :
                  'client_other',
            message: text.slice(0, 1500),
            contextSize: html.length,
            sessionToken: kidSessionToken ?? undefined,
          });
        } catch {
          /* swallow */
        }
      }
    } finally {
      // Fire-and-forget bookkeeping. Decrement inflight count, drop
      // this run's controller, clear shared overlay state only if WE
      // were the last in-flight (otherwise leave it for the others).
      setInflightCount((n) => Math.max(0, n - 1));
      abortControllersRef.current.delete(placeholderId);
      if (abortControllersRef.current.size === 0) {
        setStreamingText('');
        setStreamStartedAt(null);
      }
      setPendingImageUrl(null);
      // The in-tab stream finished (success, error, or abort) and the
      // chat already reflects the outcome. Clear the pending-job slot
      // so we don't replay the result on next mount. The Convex row
      // sticks around until tomorrow's cleanup cron — only the local
      // pointer is dropped here. claimJobMut also marks the row as
      // 'claimed' server-side so any other open tab sees it's done.
      if (jobId) {
        forgetPendingJob(kidSessionToken, marketing.user?.id);
        void claimJobMut({
          jobId,
          sessionToken: kidSessionToken ?? undefined,
          clerkUserId: marketing.user?.id ?? undefined,
        }).catch(() => { /* swallow */ });
      }
    }
  };

  const startNewProject = () => {
    setHtml(STARTER_HTML);
    setProjectTitle('Starter Pad');
    setActiveProjectId(null);
    setMessages([{ role: 'assistant', content: STARTER_MESSAGE }]);
    setNextSteps([]);
    setError(null);
    setShareStatus(null);
  };

  const openProject = (project: DemoProject) => {
    setHtml(project.html);
    setProjectTitle(project.title);
    setActiveProjectId(project.id);
    const openedMessage = `Opened "${project.title}". You can test it or ask for one change.`;
    setMessages(project.messages?.length ? project.messages : [{ role: 'assistant', content: openedMessage }]);
    setNextSteps(project.nextSteps?.length ? project.nextSteps : []);
    setShowProjects(false);
    setShowCode(false);
    setShareStatus(null);
  };

  const addVoiceTranscript = (text: string) => {
    setInput((current) => (current.trim() ? `${current.trim()} ${text}` : text));
  };

  const finalizeDeletion = async (project: DemoProject) => {
    if (hasIdentity && looksLikeConvexId(project.id)) {
      try {
        await deleteCloud({ id: project.id as unknown as Id<'safesparkProjects'> });
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        setError(`Couldn't delete: ${text}`);
        return;
      }
    } else {
      const remaining = projects.filter((p) => p.id !== project.id);
      persistProjects(remaining);
      setProjects(remaining);
    }
  };

  const deleteProject = (projectId: string) => {
    const target = effectiveProjects.find((p) => p.id === projectId);
    if (!target) return;
    if (pendingDeletion) {
      void finalizeDeletion(pendingDeletion.project);
    }
    if (pendingDeleteTimerRef.current) {
      window.clearTimeout(pendingDeleteTimerRef.current);
    }
    if (activeProjectId === projectId) {
      startNewProject();
    }
    // Called from a delete-button click, not during render — safe.
    // eslint-disable-next-line react-hooks/purity
    setPendingDeletion({ project: target, finalizeAt: Date.now() + 10_000 });
    pendingDeleteTimerRef.current = window.setTimeout(() => {
      void finalizeDeletion(target);
      setPendingDeletion(null);
      pendingDeleteTimerRef.current = null;
    }, 10_000);
  };

  const undoDelete = () => {
    if (pendingDeleteTimerRef.current) {
      window.clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
    }
    setPendingDeletion(null);
  };

  const downloadHtml = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugify(projectTitle)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printProject = () => {
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      setError('Pop-ups blocked — allow pop-ups for SafeSpark to print.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      try {
        win.print();
      } catch {
        /* user can hit cmd+p */
      }
    }, 400);
  };

  const copyShareLink = async (project?: DemoProject) => {
    setShareStatus('Making link...');
    const title = project?.title ?? projectTitle;
    const projectHtml = project?.html ?? html;
    let link: string;
    try {
      const result = await createShareLink({
        title,
        html: projectHtml,
        projectId: looksLikeConvexId(activeProjectId)
          ? (activeProjectId as unknown as Id<'safesparkProjects'>)
          : undefined,
        sessionToken: kidSessionToken ?? undefined,
      });
      // P0 share-approval gate: chat-shaped projects (isCommunication
      // = true) hit a parent-approval flow before the link generates.
      // Surface the wait-state to the kid and bail out — no link to
      // copy yet. Parent approves on /parent; next tap of Share works.
      if ('needsParentApproval' in result) {
        if (result.status === 'denied') {
          setShareStatus('Your parent said not yet on this one. Ask them in person if you want it shared.');
        } else {
          setShareStatus('Sent to your parent for approval. They\'ll see it in their dashboard.');
        }
        return;
      }
      link = `${window.location.origin}/s/${result.shortId}`;
    } catch {
      // Fallback to legacy gzip hash share when the server share fails or guest mode.
      link = await makeShareUrl({ title, html: projectHtml });
    }
    try {
      await navigator.clipboard.writeText(link);
      setShareStatus(`Share link copied: ${link}`);
    } catch {
      window.prompt('Copy this share link:', link);
      setShareStatus('Share link ready.');
    }
  };

  if (!hasIdentity) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-cream px-4 py-10">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600 text-brand-navy">
            <Wand2 className="h-7 w-7" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-accent-500">SafeSpark</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Sign up to start building</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Your projects save under your account and you can come back any time, on any device.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="https://getsafefamily.com/signup?plan=unified"
              className="inline-flex w-full items-center justify-center rounded-xl bg-accent-600 px-5 py-3 text-sm font-semibold text-brand-navy shadow-sm hover:bg-accent-700"
            >
              Create an account
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-brand-cream"
            >
              I already have an account
            </Link>
          </div>
          <p className="mt-4 text-xs font-semibold text-slate-500">
            Free during early access · No credit card
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Kids on a shared device? Have the parent sign up first, then kids log in with the family code at{' '}
            <Link href="/start" className="font-semibold text-accent-700 underline">
              /start
            </Link>
            .
          </p>
          <Link href="/" className="mt-5 inline-flex text-xs font-semibold text-slate-500 hover:text-slate-700">
            Back to home
          </Link>
        </section>
      </main>
    );
  }

  // SSR + first-paint placeholder. Avoids hydration mismatch: server
  // can't know about Clerk session or localStorage token, so render a
  // neutral placeholder and let the client decide on mount.
  if (!mounted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-cream">
        <div className="text-sm font-semibold uppercase tracking-widest text-accent-400">
          SafeSpark
        </div>
      </main>
    );
  }

  // /make is the kid app. If there's no kid session, show the family-
  // code + profile-picker gate, period. Parent admin lives at /parent.
  // Show a banner pointing parents there if they're Clerk-signed-in.
  if (shouldShowGate) {
    return (
      <main className="flex min-h-screen flex-col bg-brand-cream">
        {isSignedIn && (
          <div className="border-b border-accent-200 bg-accent-50 px-4 py-2 text-center text-xs font-semibold text-accent-900">
            Looking for the parent admin?{' '}
            <Link href="/parent" className="underline underline-offset-2 hover:text-accent-700">
              Go to /parent
            </Link>
          </div>
        )}
        <KidLoginGate onSession={(token) => setKidSessionToken(token)} />
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden overflow-x-hidden bg-brand-cream text-slate-900 pb-[72px] lg:pb-0">
      {/* Use the shared KidHeader directly — was previously duplicating
        its markup which kept drifting (the "nav still jumps when you
        switch to /make" complaints). Now /make is guaranteed byte-
        identical to /dashboard + /learn for the brand+nav strip. The
        action cluster passes in as rightSlot. */}
      {/* rightSlot wrapper: no overflow-x-auto — it would clip the
        absolute-positioned popovers (account menu, My projects,
        History) that anchor inside this div and extend BELOW the
        header. flex-nowrap is enough to prevent the buttons from
        visually wrapping. */}
      <KidHeader
        familyCode={familyCode}
        rightSlot={
          <div className="flex min-w-0 flex-nowrap items-center gap-2">
            {/* Primary build cluster. "+ New" used to live here but the
                kid dashboard's "Start a new build" hero CTA owns that
                action now — duplicating it in the toolbar made the
                in-maker chrome busy. My projects + History stay as
                outlined pills for in-flow access. */}
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => {
                  // Desktop: toggle the anchored popover. Mobile: switch
                  // to the dedicated Projects tab (full-screen list).
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setMobileTab('projects');
                  } else {
                    setShowProjects((value) => !value);
                  }
                }}
                className={
                  sortedProjects.length > 0
                    ? 'inline-flex items-center gap-2 rounded-xl bg-accent-50 px-3 py-2 text-sm font-semibold text-accent-700 hover:bg-accent-100'
                    : ACTION_BUTTON_CLASS
                }
                title="My projects"
                aria-expanded={showProjects}
              >
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">My projects</span>
                {sortedProjects.length > 0 && (
                  <span className="rounded-full bg-accent-600 px-1.5 py-0.5 text-[10px] font-semibold text-brand-navy">
                    {sortedProjects.length}
                  </span>
                )}
                <svg
                  className={`h-3 w-3 transition-transform ${showProjects ? 'rotate-180' : ''}`}
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 5l3 3 3-3" />
                </svg>
              </button>
              {showProjects && (
                <>
                  {/* Click-outside backdrop. Sits below the popover but
                      above everything else so any tap dismisses. */}
                  <button
                    type="button"
                    aria-label="Close projects menu"
                    onClick={() => setShowProjects(false)}
                    className="fixed inset-0 z-40 hidden cursor-default lg:block"
                  />
                  {/* Popover anchored to the button. Compact File>Open
                      list, not the big card grid that used to invade
                      the preview area. */}
                  <div
                    className="absolute left-0 top-full z-50 mt-2 hidden w-96 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg lg:block"
                    role="menu"
                  >
                    <div className="border-b border-slate-100 bg-brand-cream px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-accent-500">
                        My projects
                      </p>
                      <p className="text-xs font-semibold text-slate-500">
                        {sortedProjects.length === 0
                          ? 'Nothing here yet'
                          : `${sortedProjects.length} project${sortedProjects.length === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        startNewProject();
                        setShowProjects(false);
                      }}
                      className="flex w-full items-center gap-2 border-b border-slate-100 bg-accent-50/60 px-3 py-2.5 text-left text-sm font-semibold text-accent-700 hover:bg-accent-100"
                      role="menuitem"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-600 text-brand-navy">
                        <Plus className="h-4 w-4" />
                      </div>
                      <span>New project</span>
                    </button>
                    <div className="max-h-80 overflow-y-auto">
                      {sortedProjects.length === 0 ? (
                        <p className="px-3 py-6 text-center text-xs font-semibold text-slate-400">
                          Build something to see it here.
                        </p>
                      ) : (
                        sortedProjects.map((project) => (
                          <ProjectRow
                            key={project.id}
                            project={project}
                            isActive={project.id === activeProjectId}
                            onOpen={() => {
                              openProject(project);
                              setShowProjects(false);
                            }}
                            onDelete={() => deleteProject(project.id)}
                          />
                        ))
                      )}
                    </div>
                    {isSignedIn && deletedProjects && deletedProjects.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleted((v) => !v);
                        }}
                        className="flex w-full items-center justify-between gap-2 border-t border-slate-100 bg-amber-50/60 px-3 py-2 text-left text-xs font-semibold text-amber-800 hover:bg-amber-100"
                        role="menuitem"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Trash2 className="h-3.5 w-3.5" />
                          Recently deleted
                        </span>
                        <span className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {deletedProjects.length}
                        </span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            {isSignedIn && activeProjectId && (
              <button
                type="button"
                onClick={() => setShowHistory((value) => !value)}
                className={ACTION_BUTTON_CLASS}
                title="History — every version of this project"
              >
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">History</span>
                {cloudVersions && cloudVersions.length > 0 && (
                  <span className="rounded-full bg-accent-100 px-1.5 py-0.5 text-[10px] font-semibold text-accent-700">
                    {cloudVersions.length}
                  </span>
                )}
              </button>
            )}

            {/* Cluster separator — thin slate divider visually
                groups primary build actions vs. auxiliary actions. */}
            <span aria-hidden="true" className="hidden h-6 w-px bg-slate-200 lg:inline-block" />

            {/* Auxiliary cluster: read aloud + share (both outlined). */}
            <button
              type="button"
              onClick={toggleAutoSpeak}
              className={
                autoSpeak
                  ? 'inline-flex items-center gap-2 rounded-xl bg-accent-600 px-3 py-2 text-sm font-semibold text-brand-navy shadow-sm hover:bg-accent-700'
                  : ACTION_BUTTON_CLASS
              }
              title={autoSpeak ? 'Spark reads replies aloud' : 'Spark stays silent (tap to enable read-aloud)'}
              aria-pressed={autoSpeak}
            >
              <Volume2 className="h-4 w-4" />
              <span className="hidden sm:inline">{autoSpeak ? 'Read aloud: on' : 'Read aloud'}</span>
            </button>
            <button
              type="button"
              onClick={() => copyShareLink()}
              className={ACTION_BUTTON_CLASS}
              title="Copy share link"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Cluster separator before the account menu. */}
            <span aria-hidden="true" className="hidden h-6 w-px bg-slate-200 lg:inline-block" />

            {/*
              * Account menu — single avatar-icon button that opens a
              * popover with Switch profile (kid sessions only) and
              * Admin / Sign in. Same identity logic as before:
              *   - kidSessionToken active: show "Switch profile"; HIDE
              *     Admin + Sign in (parent dashboard isn't reachable
              *     while a kid session owns the device).
              *   - otherwise: show "Admin" if isSignedIn else "Sign in".
              * Don't render the button at all if there's nothing to
              * put in it (e.g., no kid session AND no parent identity
              * yet — though "Sign in" always satisfies the !kid case).
              */}
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setShowAccountMenu((v) => !v)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-cream"
                title="Account menu"
                aria-haspopup="menu"
                aria-expanded={showAccountMenu}
                aria-label="Account menu"
              >
                <UserRound className="h-4 w-4" />
                <ChevronDown
                  className={`h-3 w-3 text-slate-400 transition-transform ${showAccountMenu ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {showAccountMenu && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  {kidSessionToken && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('lumiKidSession');
                        }
                        setKidSessionToken(null);
                        setShowAccountMenu(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-brand-cream"
                      role="menuitem"
                    >
                      <UserRound className="h-4 w-4 text-slate-400" />
                      Switch profile
                    </button>
                  )}
                  {!kidSessionToken && (
                    isSignedIn ? (
                      <Link
                        href="/parent"
                        onClick={() => setShowAccountMenu(false)}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-brand-cream"
                        role="menuitem"
                        title="Parent admin"
                      >
                        <UserRound className="h-4 w-4 text-slate-400" />
                        Admin
                      </Link>
                    ) : (
                      <Link
                        href="/login"
                        onClick={() => setShowAccountMenu(false)}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-brand-cream"
                        role="menuitem"
                      >
                        <UserRound className="h-4 w-4 text-slate-400" />
                        Sign in
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* Mobile-only segmented control — switches between the three
        panels (Chat / Play / Projects) without leaving /make. Apple
        Music style: bottom tab bar is for routes (Home/Make/Learn/
        Apps), top segmented control is for views within a route.
        Single bottom bar = ~70px reclaimed vs the prior double-stack.
        lg:hidden — desktop has the panels side-by-side, no switching
        needed. */}
      <div className="flex-none border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
        <div className="mx-auto inline-flex w-full max-w-md gap-1 rounded-xl bg-slate-100 p-1">
          <SegmentedTab
            label="Chat"
            active={mobileTab === 'chat'}
            onClick={() => { setMobileTab('chat'); setShowProjects(false); }}
          />
          <SegmentedTab
            label="Play"
            active={mobileTab === 'preview'}
            onClick={() => { setMobileTab('preview'); setShowProjects(false); }}
          />
          <SegmentedTab
            label="Projects"
            badge={sortedProjects.length || undefined}
            active={mobileTab === 'projects'}
            onClick={() => setMobileTab('projects')}
          />
        </div>
      </div>

      {isSignedIn && (migrating || migrateResult) && (
        <div className="flex-none border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-xs font-semibold text-emerald-900">
          {migrating ? `Auto-saving ${localGuestProjects.length} guest project${localGuestProjects.length === 1 ? '' : 's'} to your account…` : `✓ ${migrateResult}`}
        </div>
      )}

      {pendingDeletion && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
            <Trash2 className="h-4 w-4 text-rose-300" />
            <span>
              Deleted &quot;{pendingDeletion.project.title}&quot;.
            </span>
            <button
              type="button"
              onClick={undoDelete}
              className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-100"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* Mobile Projects tab — full-screen gallery, only renders on mobile */}
      {mobileTab === 'projects' && (
        <section className="flex-1 overflow-y-auto px-3 pt-3 pb-20 lg:hidden">
          <div className="mx-auto max-w-md space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent-500">My projects</p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {sortedProjects.length === 0
                  ? 'Tap + New to start'
                  : `${sortedProjects.length} project${sortedProjects.length === 1 ? '' : 's'}`}
              </h2>
            </div>
            {sortedProjects.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600 text-brand-navy">
                  <Plus className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">Nothing here yet.</p>
                <p className="mt-1 text-xs text-slate-500">
                  Tap <span className="font-semibold text-accent-700">New</span> at the bottom to make your first project.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    startNewProject();
                    setMobileTab('chat');
                  }}
                  className="group flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent-200 bg-accent-50/40 p-4 text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-600 text-brand-navy">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-accent-700">New project</p>
                </button>
                {sortedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isActive={project.id === activeProjectId}
                    onOpen={() => {
                      openProject(project);
                      setMobileTab('preview');
                    }}
                    onShare={() => copyShareLink(project)}
                    onDelete={() => deleteProject(project.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div
        className={`mx-auto grid w-full min-h-0 max-w-[1400px] flex-1 gap-2 overflow-hidden px-2 pt-2 pb-20 sm:gap-3 sm:px-3 sm:pt-3 lg:grid-cols-[390px_minmax(0,1fr)] lg:pb-3 ${
          mobileTab === 'projects' ? 'hidden lg:grid' : 'grid'
        }`}
      >
        <aside
          className={`h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex ${
            mobileTab === 'chat' ? 'flex lg:flex' : 'hidden lg:flex'
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-bold tracking-tight text-slate-900">Ask Spark anything</h2>
            {inflightCount > 0 && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-accent-700"
                title={`${inflightCount} build${inflightCount === 1 ? '' : 's'} running in the background — type your next idea while Spark cooks`}
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {inflightCount} on it
              </span>
            )}
          </div>

          <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto bg-brand-cream px-3 pt-4 pb-6">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              return (
                <div key={`${message.role}-${index}`} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-accent-600 text-brand-navy">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={
                      isUser
                        ? 'max-w-[82%] rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold leading-relaxed text-white'
                        : message.status === 'working'
                        ? 'max-w-[82%] rounded-2xl border border-accent-200 bg-accent-50 px-3 py-2 text-sm font-semibold leading-relaxed text-accent-700'
                        : 'max-w-[82%] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-relaxed text-slate-700'
                    }
                  >
                    {message.status === 'working' ? (
                      (() => {
                        const elapsed = message.startedAt
                          ? Math.floor((Date.now() - message.startedAt) / 1000)
                          : 0;
                        // Reassuring copy escalates with wait time so the
                        // kid sees concrete signs of life on long builds
                        // (60-120s for rich gpt-5.5 generations).
                        const label =
                          elapsed < 10
                            ? 'Spark is on it…'
                            : elapsed < 30
                            ? 'Spark is thinking through your idea…'
                            : elapsed < 60
                            ? 'Spark is building it (this one\'s a bigger one)…'
                            : elapsed < 120
                            ? 'Spark is still building — almost there…'
                            : 'Spark is taking a while — sometimes big builds need extra time…';
                        const timeStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
                        return (
                          <span className="inline-flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75"></span>
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-600"></span>
                            </span>
                            <span>{label}</span>
                            {message.startedAt ? (
                              <span className="font-mono text-[11px] tabular-nums text-accent-500/80">
                                {timeStr}
                              </span>
                            ) : null}
                          </span>
                        );
                      })()
                    ) : isUser ? (
                      // User-typed prompts: keep as plain text. They
                      // don't contain markdown and the white-on-slate
                      // bubble would need a different color palette
                      // if it did.
                      <span className="whitespace-pre-wrap">{message.content}</span>
                    ) : (
                      // Assistant replies: render markdown so CHAT-mode
                      // answers ("explain photosynthesis") get
                      // paragraphs, bullets, bold, code blocks, etc.
                      // The renderer's component overrides match the
                      // bubble's slate text styling.
                      <MessageMarkdown content={message.content} />
                    )}
                    {!isUser && blockedRefusal && blockedRefusal.messageIdx === index && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                        <p className="text-xs font-semibold text-amber-800">
                          Want to build something about <span className="font-bold">&ldquo;{blockedRefusal.phrase}&rdquo;</span>?
                        </p>
                        {requestStatus === 'sent' ? (
                          <p className="mt-1.5 text-xs font-semibold text-emerald-700">
                            ✓ Sent! Your parent will see it on their dashboard.
                          </p>
                        ) : (
                          <button
                            type="button"
                            disabled={requestStatus === 'sending' || !kidSessionToken}
                            onClick={async () => {
                              if (!kidSessionToken) return;
                              setRequestStatus('sending');
                              try {
                                const result = await requestTopicBySession({
                                  sessionToken: kidSessionToken,
                                  matchedPhrase: blockedRefusal.phrase,
                                  originalPrompt: blockedRefusal.prompt,
                                });
                                if (result?.ok) setRequestStatus('sent');
                                else setRequestStatus('error');
                              } catch {
                                setRequestStatus('error');
                              }
                            }}
                            className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
                          >
                            {requestStatus === 'sending' ? 'Asking…' : 'Ask my parent to allow it'}
                          </button>
                        )}
                        {requestStatus === 'error' && (
                          <p className="mt-1.5 text-xs font-semibold text-rose-700">
                            Couldn&apos;t send. Try again in a sec.
                          </p>
                        )}
                      </div>
                    )}
                    {!isUser && message.diffStats && (
                      <div
                        className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600"
                        title={`${message.diffStats.total} total lines in the project after this change`}
                      >
                        <span className="text-emerald-700">+{message.diffStats.added}</span>
                        <span className="text-rose-700">−{message.diffStats.removed}</span>
                        <span className="text-slate-400">of {message.diffStats.total}</span>
                        {message.diffStats.added + message.diffStats.removed > 60 && (
                          <span
                            className="text-amber-700"
                            title="Big change — if something that was working stopped, tap Undo below"
                          >
                            big change
                          </span>
                        )}
                      </div>
                    )}
                    {!isUser && hasUserMessages && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {/*
                          autoSpeak gate: skip working placeholders.
                          Otherwise "Spark is on it…" gets spoken,
                          which sets the autoSpoke ref → the real reply
                          that REPLACES the placeholder never plays.
                          Only fire when status !== 'working' so the
                          first auto-speak is the actual content.
                        */}
                        <SpeakButton
                          text={message.content}
                          autoSpeak={autoSpeak && index === messages.length - 1 && message.status !== 'working'}
                          sessionToken={kidSessionToken}
                        />
                        {index === messages.length - 1 &&
                          !busy &&
                          hasIdentity &&
                          cloudVersions &&
                          cloudVersions.length > 1 && (
                            <button
                              type="button"
                              onClick={async () => {
                                const previous = cloudVersions[1]; // [0] is current; [1] is one before
                                if (!previous) return;
                                if (!window.confirm(`Undo last change? Going back to "${previous.label}".`)) return;
                                try {
                                  const result = await restoreVersionMut({
                                    versionId: previous.id as unknown as Id<'safesparkVersions'>,
                                    sessionToken: kidSessionToken ?? undefined,
                                    userToken: marketing.token ?? undefined,
                                  });
                                  setHtml(result.html);
                                  // True rewind: if the version row had
                                  // a messages snapshot, restore the
                                  // entire chat to that point so the
                                  // kid isn't confused by later prompts
                                  // referencing state that no longer
                                  // exists. Falls back to appending a
                                  // "Reverted" note for older versions.
                                  if (result.messages && result.messages.length > 0) {
                                    setMessages(result.messages as DemoMessage[]);
                                  } else {
                                    setMessages((current) => [
                                      ...current,
                                      {
                                        role: 'assistant',
                                        content: `Reverted to "${previous.label}". Keep building from here.`,
                                      },
                                    ]);
                                  }
                                } catch (err) {
                                  const text = err instanceof Error ? err.message : String(err);
                                  setError(`Couldn't undo: ${text}`);
                                }
                              }}
                              className="inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:border-amber-200 hover:text-amber-700"
                              title="Go back to the version before this change"
                            >
                              Undo last change
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                      <UserRound className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
            {/* Chat-side build indicator was removed — it duplicated
                the preview-overlay spinner AND streamed raw JavaScript
                into the chat. Build progress now lives only on the
                preview side (more contextually appropriate — that's
                where the build is actually happening). Curious kids
                can still tap "View code" on the right panel header. */}
          </div>

          <div className="border-t border-slate-200 bg-white p-3 pt-4">
            {showQuickPrompts && (
              <div className="mb-3 space-y-3">
                <div className="rounded-xl border border-accent-200 bg-accent-50 p-3 text-center">
                  <p className="text-xs font-semibold text-accent-700">
                    Typing is hard — just talk!
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-accent-600">
                    Tap the mic below and tell Spark what to make. Tap again when you&apos;re done.
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Or pick one</p>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => sendPrompt(t.prompt)}
                        disabled={busy}
                        className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center text-[11px] font-semibold text-slate-700 transition hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 disabled:opacity-50"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && <p className="mb-3 text-sm font-semibold text-rose-600">{error}</p>}
            {voiceStatus && (
              <p className="mb-3 rounded-xl border border-accent-200 bg-accent-50 px-3 py-2 text-xs font-semibold text-accent-800">
                {voiceStatus}
              </p>
            )}

            {pendingImageUrl && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 px-3 py-2 text-xs font-semibold text-accent-800">
                {/* User-uploaded thumbnail from Convex storage — variable host, skip next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pendingImageUrl} alt="Attached" className="h-10 w-10 rounded-lg object-cover" />
                <span className="flex-1 truncate">Image attached — Spark will use it in the next build.</span>
                <button
                  type="button"
                  onClick={() => setPendingImageUrl(null)}
                  className="rounded-full p-1 text-accent-700 hover:bg-accent-200"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {imageUploading && (
              <p className="mb-3 rounded-xl border border-accent-200 bg-accent-50 px-3 py-2 text-xs font-semibold text-accent-800">
                Uploading image…
              </p>
            )}

            {pendingPdf && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                <FileText className="h-5 w-5 shrink-0" />
                <span className="flex-1 truncate">
                  {pendingPdf.filename} · {pendingPdf.pageCount} page{pendingPdf.pageCount === 1 ? '' : 's'}
                  {pendingPdf.truncated ? ` · trimmed to ${pendingPdf.chars.toLocaleString()} chars` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => setPendingPdf(null)}
                  className="rounded-full p-1 text-sky-700 hover:bg-sky-200"
                  aria-label="Remove PDF"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {pdfUploading && (
              <p className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                Reading PDF…
              </p>
            )}

            {iframeErrors.length > 0 && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900">
                <p className="mb-1 font-semibold">
                  Heads up — your build hit {iframeErrors.length === 1 ? 'an issue' : `${iframeErrors.length} issues`} when it ran:
                </p>
                <ul className="space-y-1">
                  {iframeErrors.map((e, i) => {
                    // Kid-facing labels. Plain English. No URLs / stack
                    // traces / error codes / "optional chaining". The
                    // model gets the full technical details on the next
                    // turn via the server's GROUND TRUTH note — the kid
                    // just needs to know something didn't work.
                    let label = '';
                    if (e.kind === 'network-blocked') {
                      label = `The build tried to grab info from a website that isn't on our safe list. Spark will pick a different source.`;
                    } else if (e.kind === 'fetch-error') {
                      label = `The build couldn't load some of its info. Spark will try a different way to get it.`;
                    } else {
                      label = `Something in the build's code didn't run right. Spark will fix it.`;
                    }
                    return (
                      <li key={i} className="flex gap-1.5">
                        <span aria-hidden>•</span>
                        <span>{label}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-[11px] text-amber-700">
                  {autoFixCountdown !== null
                    ? `Spark will fix this automatically in ${autoFixCountdown}s. Tap Dismiss to keep your build as-is.`
                    : 'Spark will see this on your next message and try a different approach.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={inflightCount >= MAX_CONCURRENT}
                    onClick={() => {
                      // Manual override — fire immediately instead of waiting
                      // for the countdown. Mark cycle as auto-fired so the
                      // countdown effect doesn't ALSO fire a moment later.
                      autoFiredThisCycleRef.current = true;
                      setAutoFixCountdown(null);
                      void sendPrompt("Something's not working — please fix it.");
                    }}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
                  >
                    {autoFixCountdown !== null ? `Fix it now (${autoFixCountdown}s)` : 'Ask Spark to fix it'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Dismiss cancels the auto-fix countdown AND clears the
                      // error strip. Sets the cycle ref so even a new error
                      // arriving on the same iframe load doesn't restart.
                      autoFiredThisCycleRef.current = true;
                      setAutoFixCountdown(null);
                      setIframeErrors([]);
                    }}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-800 transition hover:bg-amber-100"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImageUpload(file);
              }}
            />
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handlePdfUpload(file);
              }}
            />

            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (canSend) void sendPrompt(input);
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    if (canSend) void sendPrompt(input);
                  }
                }}
                rows={2}
                className="min-h-16 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-accent-400"
                placeholder="What do you want to make?"
              />
              {/* Auxiliary actions: smaller (h-10 w-10) to give the
                primary Send/Stop visual hierarchy AND free up horizontal
                space for the textarea so the placeholder stops wrapping
                across 3 lines in narrow viewports. */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || imageUploading}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-100 text-accent-700 shadow-sm hover:bg-accent-200 disabled:opacity-50"
                aria-label="Attach image"
                title={isSignedIn ? 'Attach an image' : 'Sign in to attach an image'}
              >
                <ImagePlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                disabled={busy || pdfUploading}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shadow-sm hover:bg-sky-200 disabled:opacity-50"
                aria-label="Attach PDF"
                title={isSignedIn ? 'Attach a PDF (study guide, textbook, etc.)' : 'Sign in to attach a PDF'}
              >
                <FileText className="h-4 w-4" />
              </button>
              {allowVoice && (
                <VoiceButton onTranscript={addVoiceTranscript} onStatus={setVoiceStatus} disabled={busy} />
              )}
              {busy ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm hover:bg-rose-700"
                  aria-label="Stop Spark"
                  title="Stop Spark"
                >
                  <Square className="h-5 w-5" fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSend}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-600 text-brand-navy shadow-sm hover:bg-accent-700 disabled:opacity-50"
                  aria-label="Send to Spark"
                  title="Send to Spark"
                >
                  <Send className="h-5 w-5" />
                </button>
              )}
            </form>
          </div>
        </aside>

        <section
          className={`h-full min-h-0 min-w-0 flex-col gap-3 overflow-y-auto pr-1 lg:flex ${
            mobileTab === 'preview' ? 'flex lg:flex' : 'hidden lg:flex'
          }`}
        >
          {shareStatus && (
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-900">
              {shareStatus}
            </div>
          )}

          {showHistory && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-accent-500">Design log</p>
                  <h2 className="text-base font-bold tracking-tight text-slate-900">Every version of this project</h2>
                </div>
                <button type="button" onClick={() => setShowHistory(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
                  Hide
                </button>
              </div>
              {!cloudVersions || cloudVersions.length === 0 ? (
                <p className="rounded-xl bg-brand-cream px-4 py-6 text-center text-sm font-semibold text-slate-500">
                  No versions yet. Your next build becomes v1.
                </p>
              ) : (
                <ol className="relative space-y-3 border-l-2 border-accent-100 pl-5">
                  {cloudVersions.map((version, index) => (
                    <li key={version.id} className="relative">
                      <span className="absolute -left-[27px] top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent-600 text-[9px] font-semibold text-brand-navy shadow-sm">
                        {cloudVersions.length - index}
                      </span>
                      <div className="rounded-xl border border-slate-200 bg-brand-cream p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold tracking-tight text-slate-900">{version.label}</p>
                            <p className="mt-0.5 text-xs font-mono text-slate-500">{formatDate(version.createdAt)}</p>
                            {version.summary && (
                              <p className="mt-2 text-xs leading-relaxed text-slate-700">{version.summary}</p>
                            )}
                            {version.prompt && (
                              <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
                                <span className="font-semibold text-accent-600">Ask: </span>
                                {version.prompt}
                              </p>
                            )}
                          </div>
                          {index !== 0 && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!window.confirm(`Restore "${version.label}"? Your current version will be kept in history.`)) return;
                                try {
                                  const result = await restoreVersionMut({
                                    versionId: version.id as unknown as Id<'safesparkVersions'>,
                                    sessionToken: kidSessionToken ?? undefined,
                                    userToken: marketing.token ?? undefined,
                                  });
                                  setHtml(result.html);
                                  if (result.messages && result.messages.length > 0) {
                                    setMessages(result.messages as DemoMessage[]);
                                  } else {
                                    setMessages((current) => [
                                      ...current,
                                      { role: 'assistant', content: `Restored "${version.label}". Keep building from here.` },
                                    ]);
                                  }
                                  setShowHistory(false);
                                } catch (err) {
                                  const text = err instanceof Error ? err.message : String(err);
                                  setError(`Couldn't restore: ${text}`);
                                }
                              }}
                              className="shrink-0 rounded-lg border border-accent-200 bg-white px-3 py-1.5 text-xs font-semibold text-accent-700 hover:bg-accent-50"
                            >
                              Restore
                            </button>
                          )}
                          {index === 0 && (
                            <span className="shrink-0 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {/*
            The big "My projects" card grid that used to live here was
            replaced 2026-05-29 with a compact dropdown popover anchored
            to the header button — kids hated how clicking My Projects
            invaded the preview. Only the "Recently deleted" expand
            remains here; it's reached via the popover's amber button.
          */}
          {showDeleted && deletedProjects && deletedProjects.length > 0 && (
            <section className="hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm lg:block">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
                    Recently deleted · kept for 30 days
                  </p>
                  <h2 className="text-lg font-bold tracking-tight text-amber-900">
                    {deletedProjects.length} project{deletedProjects.length === 1 ? '' : 's'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleted(false)}
                  className="text-sm font-semibold text-amber-700 hover:text-amber-900"
                >
                  Hide
                </button>
              </div>
              <div className="space-y-2">
                {deletedProjects.map((d) => {
                  // eslint-disable-next-line react-hooks/purity
                  const daysLeft = Math.max(1, Math.ceil((d.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-semibold text-slate-800">{d.title}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-amber-700">
                          Deleted {formatDate(d.deletedAt)} · {daysLeft} day{daysLeft === 1 ? '' : 's'} left
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await restoreProjectMut({ id: d.id as unknown as Id<'safesparkProjects'> });
                          } catch (err) {
                            const text = err instanceof Error ? err.message : String(err);
                            setError(`Couldn't restore: ${text}`);
                          }
                        }}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete "${d.title}" forever? This can't be undone.`)) return;
                          try {
                            await purgeProjectMut({ id: d.id as unknown as Id<'safesparkProjects'> });
                          } catch (err) {
                            const text = err instanceof Error ? err.message : String(err);
                            setError(`Couldn't delete: ${text}`);
                          }
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-400 hover:border-rose-300 hover:text-rose-600"
                        aria-label={`Delete ${d.title} forever`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Result</p>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">Play the project</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {!imageResultUrl && (
                  <>
                    <button
                      type="button"
                      onClick={() => setPlayFullscreen(true)}
                      className={UTILITY_BUTTON_CLASS}
                      title="Play full screen"
                    >
                      <Maximize2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Full screen</span>
                    </button>
                    <button type="button" onClick={() => setShowCode((value) => !value)} className={UTILITY_BUTTON_CLASS}>
                      {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="hidden sm:inline">{showCode ? 'Hide code' : 'View code'}</span>
                    </button>
                    {/* Overflow menu — HTML download + Print/PDF moved
                        here so the result-panel header is just two
                        primary visible actions plus a "…". */}
                    <div className="relative" ref={resultOverflowRef}>
                      <button
                        type="button"
                        onClick={() => setShowResultOverflow((v) => !v)}
                        className={UTILITY_BUTTON_CLASS}
                        title="More actions"
                        aria-haspopup="menu"
                        aria-expanded={showResultOverflow}
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {showResultOverflow && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              downloadHtml();
                              setShowResultOverflow(false);
                            }}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-brand-cream"
                            role="menuitem"
                          >
                            <Download className="h-4 w-4 text-slate-400" />
                            Download HTML
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              printProject();
                              setShowResultOverflow(false);
                            }}
                            className="flex w-full items-center gap-2.5 border-t border-slate-100 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-brand-cream"
                            role="menuitem"
                            title="Print or save as PDF"
                          >
                            <Printer className="h-4 w-4 text-slate-400" />
                            Print / Save PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="relative flex-1 bg-slate-100 p-3">
              {imageResultUrl ? (
                <ImageResult
                  imageUrl={imageResultUrl}
                  title={projectTitle || 'Photo edit'}
                />
              ) : (
                <iframe
                  ref={previewIframeRef}
                  title="Project preview"
                  srcDoc={injectSparkDb(html, looksLikeConvexId(activeProjectId) ? activeProjectId : null)}
                  sandbox="allow-scripts allow-pointer-lock"
                  allow="fullscreen"
                  className="h-full w-full rounded-xl bg-white"
                />
              )}
              {busy && (
                <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-xl bg-slate-900/30 backdrop-blur-sm">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-5 py-3 shadow-lg backdrop-blur">
                    <Loader2 className="h-5 w-5 animate-spin text-accent-600" />
                    <span className="text-sm font-semibold text-slate-900">
                      Spark is thinking…{' '}
                      <span className="font-mono tabular-nums text-slate-500">
                        {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {showCode && (
            <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-semibold">
                <Code2 className="h-4 w-4 text-cyan-300" />
                Code
              </div>
              <pre className="max-h-[420px] overflow-auto p-4 text-xs leading-relaxed">
                <code>{html}</code>
              </pre>
            </section>
          )}
        </section>
      </div>

      {/* Play-fullscreen overlay — CSS-based instead of the Fullscreen
          API because iOS Safari doesn't honor requestFullscreen() on
          iframes. Renders the kid's project as a true viewport-filling
          play surface with a small "Done" pill in the corner. Same
          srcDoc + sandbox as the inline preview so behavior matches. */}
      {playFullscreen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black">
          <button
            type="button"
            onClick={() => setPlayFullscreen(false)}
            className="absolute right-3 top-3 z-[101] inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur hover:bg-black/90"
            aria-label="Exit full screen"
          >
            <X className="h-3.5 w-3.5" />
            Done
          </button>
          <iframe
            title="Project preview (full screen)"
            srcDoc={injectSparkDb(html, looksLikeConvexId(activeProjectId) ? activeProjectId : null)}
            sandbox="allow-scripts allow-pointer-lock"
            allow="fullscreen"
            className="h-full w-full border-0"
          />
        </div>
      )}

      {/* Cross-page mobile nav — Home / Make / Learn / Apps. Same
        component used on /dashboard and /learn so the kid-side feels
        like one cohesive product. Fixed bottom, lg:hidden.
        Panel switcher (Chat/Play/Projects) lives at the TOP of the
        mobile view as a segmented control — see the chat panel
        header. iOS Apple-Music-style: tab bar at bottom for routes,
        segmented control at top for views within a route. */}
      <KidMobileNav familyCode={familyCode} />
    </main>
  );
}

function getInitialDemoCode(initialDemoCode: string): string {
  if (initialDemoCode) return initialDemoCode;
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(DEMO_STORAGE_KEY) ?? '';
}

function loadDemoProjects(): DemoProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) ?? '[]') as DemoProject[];
    return Array.isArray(parsed) ? parsed.filter((project) => project.id && project.html).slice(0, 24) : [];
  } catch {
    return [];
  }
}

function persistProjects(projects: DemoProject[]) {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects.slice(0, 24)));
}

function upsertProject({
  id,
  title,
  html,
  lastPrompt,
  lastReply,
  messages,
  nextSteps,
  projects,
}: {
  id: string | null;
  title: string;
  html: string;
  lastPrompt: string;
  lastReply?: string;
  messages?: DemoMessage[];
  nextSteps?: string[];
  projects: DemoProject[];
}): { id: string; projects: DemoProject[] } {
  const now = Date.now();
  const projectId = id ?? createId();
  const existing = projects.find((project) => project.id === projectId);
  const project: DemoProject = {
    id: projectId,
    title: title || 'Untitled Project',
    html,
    lastPrompt,
    lastReply,
    messages,
    nextSteps,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const nextProjects = [project, ...projects.filter((item) => item.id !== projectId)].slice(0, 24);
  persistProjects(nextProjects);
  return { id: projectId, projects: nextProjects };
}

async function makeShareUrl(payload: ShareProject): Promise<string> {
  const encoded = await encodePayload({ ...payload, v: 1 });
  return `${window.location.origin}/lumi/share#p=${encoded}`;
}

async function encodePayload(payload: SharePayload): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const CompressionStreamCtor = (window as CompressionWindow).CompressionStream;

  if (CompressionStreamCtor) {
    const compressed = await new Response(
      new Blob([bytesToArrayBuffer(bytes)]).stream().pipeThrough(new CompressionStreamCtor('gzip')),
    ).arrayBuffer();
    return `gz.${bytesToBase64Url(new Uint8Array(compressed))}`;
  }

  return `b64.${bytesToBase64Url(bytes)}`;
}

function imageProjectHtml(url: string): string {
  // Tiny standalone HTML wrapper for image-kind projects. Used as the
  // saved-project payload so gallery thumbnails, project listings, and
  // share viewers all keep working with a single rendering path. The
  // workbench result panel renders the imageUrl directly via ImageResult
  // instead of mounting this in an iframe — the wrapper is only consumed
  // when the project loads from history or someone opens its share link.
  return `<!doctype html><html><head><meta charset="utf-8"><title>SafeSpark photo edit</title><style>html,body{margin:0;padding:0;background:#0f172a;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif}img{max-width:100%;max-height:100vh;display:block;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.4)}</style></head><body><img src="${url}" alt="SafeSpark photo edit"></body></html>`;
}

function ImageResult({
  imageUrl,
  title,
}: {
  imageUrl: string;
  title: string;
}) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slugify(title) || 'safespark-edit'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, '_blank');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl bg-slate-950 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={title}
        className="max-h-[calc(100%-5rem)] max-w-full rounded-xl shadow-2xl"
      />
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-6 py-3 text-base font-semibold text-brand-navy shadow-sm hover:bg-accent-700 disabled:opacity-50"
      >
        <Download className="h-5 w-5" />
        {busy ? 'Saving…' : 'Download image'}
      </button>
    </div>
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'lumi-demo-project';
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

/**
 * Apple-Music-style segmented control. Used at the top of /make on
 * mobile to switch between Chat / Play / Projects panels. Active tab
 * gets a white "lifted" pill on the slate-100 track. Single bottom
 * KidMobileNav (Home/Make/Learn/Apps) is the page-level nav.
 */
function SegmentedTab({
  label,
  active,
  badge,
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'relative flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm'
          : 'relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800'
      }
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold ${active ? 'bg-accent-600 text-brand-navy' : 'bg-slate-300 text-slate-700'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function MobileNavButton({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${
        active ? 'bg-accent-50 text-accent-700' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-3 top-0.5 rounded-full bg-accent-600 px-1 text-[9px] font-semibold text-brand-navy">
          {badge}
        </span>
      )}
    </button>
  );
}

// Compact row used inside the "My projects" header dropdown popover.
// Keeps a small live iframe thumbnail per project on the left so kids
// can still scan visually ("the dragon game", "the pink one") instead
// of reading titles. The iframes only mount when the popover is open,
// so they don't load on every render of the workbench.
function ProjectRow({
  project,
  isActive,
  onOpen,
  onDelete,
}: {
  project: DemoProject;
  isActive: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={
        isActive
          ? 'group flex items-center gap-2.5 border-b border-slate-100 bg-accent-50 px-2.5 py-2 last:border-b-0'
          : 'group flex items-center gap-2.5 border-b border-slate-100 px-2.5 py-2 last:border-b-0 hover:bg-brand-cream'
      }
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        aria-label={`Open ${project.title}`}
      >
        <div
          className={
            isActive
              ? 'relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-emerald-500 bg-gradient-to-br from-slate-50 to-slate-100 shadow'
              : 'relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100'
          }
          title={isActive ? 'Currently open' : project.title}
        >
          <iframe
            srcDoc={project.html}
            sandbox=""
            title={`${project.title} thumbnail`}
            className="pointer-events-none absolute left-0 top-0 origin-top-left"
            style={{ width: '500%', height: '500%', transform: 'scale(0.2)' }}
            loading="lazy"
          />
          {isActive && (
            <span className="absolute right-0.5 top-0.5 rounded-full bg-emerald-500 px-1 text-[8px] font-semibold uppercase leading-none text-white shadow-sm">
              ●
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-semibold text-slate-900">{project.title}</p>
          <p className="text-[10px] font-medium text-slate-400">{formatDate(project.updatedAt)}</p>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Delete ${project.title}`}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ProjectCard({
  project,
  isActive,
  onOpen,
  onShare,
  onDelete,
}: {
  project: DemoProject;
  isActive: boolean;
  onOpen: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={
        isActive
          ? 'group overflow-hidden rounded-2xl border-2 border-accent-400 bg-white shadow-sm'
          : 'group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-accent-300 hover:shadow-sm'
      }
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={`Open ${project.title}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
          <iframe
            srcDoc={project.html}
            sandbox=""
            title={`${project.title} preview`}
            className="pointer-events-none absolute left-0 top-0 origin-top-left"
            style={{ width: '400%', height: '400%', transform: 'scale(0.25)' }}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <div className="absolute bottom-2 right-2 rounded-full bg-accent-600 px-3 py-1 text-[11px] font-semibold text-brand-navy opacity-0 shadow-sm transition group-hover:opacity-100">
            Open
          </div>
          {isActive && (
            <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-white shadow-sm">
              Open now
            </span>
          )}
        </div>
        <div className="border-t border-slate-100 px-3 py-2.5">
          <p className="line-clamp-1 text-sm font-semibold text-slate-900">{project.title}</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">{formatDate(project.updatedAt)}</p>
        </div>
      </button>
      <div className="flex gap-1 border-t border-slate-100 bg-brand-cream px-2 py-1.5">
        <button
          type="button"
          onClick={onShare}
          className="flex-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white hover:text-accent-700"
        >
          <Copy className="mr-1 inline h-3 w-3" />
          Share
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-400 hover:bg-white hover:text-rose-600"
          aria-label={`Delete ${project.title}`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </article>
  );
}

function extractStreamingPreview(raw: string): string {
  const htmlKey = raw.indexOf('"html"');
  if (htmlKey === -1) {
    const replyKey = raw.indexOf('"reply"');
    if (replyKey !== -1) {
      const after = raw.slice(replyKey + 7);
      const quote = after.indexOf('"');
      if (quote !== -1) return unescapeJsonChunk(after.slice(quote + 1));
    }
    return raw;
  }
  const after = raw.slice(htmlKey + 6);
  const quote = after.indexOf('"');
  if (quote === -1) return '';
  return unescapeJsonChunk(after.slice(quote + 1));
}

function unescapeJsonChunk(value: string): string {
  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, '  ')
    .replace(/\\b/g, '')
    .replace(/\\f/g, '')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

