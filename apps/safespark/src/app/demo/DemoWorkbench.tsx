'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  Bot,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FolderOpen,
  Loader2,
  Plus,
  Send,
  Share2,
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
import { injectSparkDb } from '../../lib/inject-spark-db';
import { KidLoginGate } from '../../components/kid/KidLoginGate';

type DemoMessage = {
  role: 'user' | 'assistant';
  content: string;
};

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

const STARTER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SafeSpark</title>
  <style>
    :root { --v: #7c3aed; --p: #ec4899; --a: #f59e0b; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at 10% 20%, rgba(124,58,237,.08), transparent 50%),
        radial-gradient(circle at 90% 80%, rgba(236,72,153,.08), transparent 50%),
        linear-gradient(135deg, #eef2ff, #fff7ed);
      color: #1f2937;
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
      box-shadow: 0 16px 60px rgba(124,58,237,.35);
      display: grid; place-items: center;
      color: white; font-size: 44px; font-weight: 900;
      animation: float 4s ease-in-out infinite;
    }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
    h1 {
      margin: 0 0 10px; font-size: clamp(32px, 6vw, 52px); font-weight: 900;
      background: linear-gradient(135deg, var(--v), var(--p), var(--a));
      -webkit-background-clip: text; background-clip: text; color: transparent;
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
    <div class="spark">⚡</div>
    <h1>What should we build?</h1>
    <p class="lead">Ask Spark for anything — a game, flashcards, a quiz, a poster, a tool. Watch it appear right here.</p>
    <p class="lead">Type your idea in the chat and Spark will build it.</p>
  </main>
</body>
</html>`;

type Template = { emoji: string; label: string; prompt: string };
const TEMPLATES: Template[] = [
  {
    emoji: '🎮',
    label: 'Make a game',
    prompt: 'Make a fun playable game. Ask me one quick question about what kind, then build it.',
  },
  {
    emoji: '📇',
    label: 'Flashcards',
    prompt: 'Make a flashcard study app. Ask me what subject I want to study, then build flashcards with a flip animation and a "next card" button.',
  },
  {
    emoji: '🧠',
    label: 'Quiz',
    prompt: 'Make a multiple-choice quiz. Ask me the topic, then build a quiz with 10 questions, score tracking, and a results screen.',
  },
  {
    emoji: '🎨',
    label: 'Poster',
    prompt: 'Make a poster I can print. Ask me what the poster is for, then design a bold one-page poster with a big headline.',
  },
  {
    emoji: '📊',
    label: 'Tracker',
    prompt: 'Make a tracker app that saves data in localStorage so it remembers between visits. Ask me what I want to track.',
  },
  {
    emoji: '🎭',
    label: 'Restyle photo',
    prompt: 'I uploaded a photo — restyle it as a cartoon and show it as a movie poster.',
  },
];
const STARTER_MESSAGE = "Tell me what you want to make. I'll build it.";
const ACTION_BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50';
const PRIMARY_ACTION_BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-3 py-2 text-sm font-black text-white hover:bg-violet-700';
const UTILITY_BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50';

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
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamStartedAt, setStreamStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
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
  const [showCode, setShowCode] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'preview' | 'projects'>('chat');
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const { isSignedIn } = useUser();
  // Defer localStorage reads to a post-mount effect to avoid the
  // hydration mismatch / flicker we hit 2026-05-28. Reading localStorage
  // during render returns null on the server and the token on the client,
  // making the first paint switch subtrees.
  //
  // /make is the KID app — parents come here to use it as a kid, not as
  // themselves. The admin surface is /parent. So we ALWAYS show the
  // family-code + profile-picker gate when no kid session exists,
  // regardless of Clerk parent state. Matches SafeTunes /play,
  // SafeTube /play, SafeReads /read.
  const [mounted, setMounted] = useState(false);
  const [kidSessionToken, setKidSessionToken] = useState<string | null>(null);
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
  const saveCloudRaw = useMutation(api.safespark.saveProject);
  const deleteCloudRaw = useMutation(api.safespark.deleteProject);
  const logRequestRaw = useMutation(api.safespark.logRequest);
  const logErrorRaw = useMutation(api.safespark.logError);
  const saveCloud = useMemo(
    () => (args: Parameters<typeof saveCloudRaw>[0]) =>
      saveCloudRaw({ ...args, sessionToken: kidSessionToken ?? undefined }),
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
  const restoreVersionMut = useMutation(api.safespark.restoreVersion);
  const generateUploadUrl = useMutation(api.safespark.generateImageUploadUrl);
  const finalizeImageUpload = useMutation(api.safespark.finalizeImageUpload);
  const createShareLink = useMutation(api.safespark.createShareLink);
  const restoreProjectMut = useMutation(api.safespark.restoreProject);
  const purgeProjectMut = useMutation(api.safespark.purgeProject);
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
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error('Upload failed.');
      const { storageId } = (await res.json()) as { storageId: string };
      const { url } = await finalizeImageUpload({ storageId });
      setPendingImageUrl(url);
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setError(`Image upload failed: ${text}`);
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
      const uploadUrl = await generateUploadUrl();
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
      const text = err instanceof Error ? err.message : String(err);
      setError(`PDF upload failed: ${text}`);
    } finally {
      setPdfUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const looksLikeConvexId = (value: string | null): boolean =>
    typeof value === 'string' && value.length > 0 && !value.includes('-');
  const cloudVersions = useQuery(
    api.safespark.listVersions,
    hasIdentity && looksLikeConvexId(activeProjectId)
      ? { projectId: activeProjectId as unknown as Id<'safesparkProjects'> }
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

  const canSend = input.trim().length > 1 && !busy;
  const hasUserMessages = messages.some((message) => message.role === 'user');

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
  const showQuickPrompts = !hasUserMessages;
  const sortedProjects = useMemo(
    () =>
      [...effectiveProjects]
        .filter((p) => !pendingDeletion || p.id !== pendingDeletion.project.id)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [effectiveProjects, pendingDeletion],
  );

  const stopGeneration = () => {
    abortRef.current?.abort();
  };

  const sendPrompt = async (prompt: string) => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || busy) return;

    setBusy(true);
    setError(null);
    setShareStatus(null);
    setStreamingText('');
    // Called from a click/submit handler, not during render — safe.
    // eslint-disable-next-line react-hooks/purity
    setStreamStartedAt(Date.now());
    setElapsedSeconds(0);
    const controller = new AbortController();
    abortRef.current = controller;
    const nextMessages: DemoMessage[] = [...messages, { role: 'user', content: trimmedPrompt }];
    setMessages(nextMessages);
    setInput('');

    if (hasIdentity) {
      logRequest({
        prompt: trimmedPrompt,
        projectId: activeProjectId ? (activeProjectId as unknown as Id<'safesparkProjects'>) : undefined,
        projectTitle: projectTitle,
      }).catch(() => {
        /* logging failures should not block the build */
      });
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
        }),
      });
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

      while (true) {
        const { done, value } = await reader.read();
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
      // Image-edit fast path: the project IS the edited image. Save as a
      // minimal HTML wrapper (so existing project/share/thumbnail paths
      // keep working) but mark kind='image' so the workbench renders it
      // with the dedicated image result panel instead of an iframe.
      if (data.kind === 'image' && data.imageUrl) {
        const reply = data.reply || 'Edit ready. Download it below.';
        const finalTitle = data.title || projectTitle || 'Photo edit';
        const finalMessages: DemoMessage[] = [...nextMessages, { role: 'assistant', content: reply }];
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
            const text = saveErr instanceof Error ? saveErr.message : String(saveErr);
            setError(`Couldn't save to your account: ${text}`);
          }
        }
        setProjectTitle(finalTitle);
        setMessages((current) => [...current, { role: 'assistant', content: reply }]);
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
        const finalMessages: DemoMessage[] = [...nextMessages, { role: 'assistant', content: reply }];
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
            });
            setActiveProjectId(savedId as unknown as string);
          } catch (saveErr) {
            const text = saveErr instanceof Error ? saveErr.message : String(saveErr);
            setError(`Couldn't save to your account: ${text}`);
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
      setMessages((current) => [...current, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setMessages((current) => [
          ...current,
          { role: 'assistant', content: 'Stopped. Ask me again with a different idea or more detail.' },
        ]);
      } else {
        const text = err instanceof Error ? err.message : String(err);
        setError(text);
        const lowered = text.toLowerCase();
        const kidMessage = lowered.includes('timeout') || lowered.includes('aborted')
          ? 'I ran out of time on that one. Try a smaller change — "make the player faster" works better than "redo the whole game".'
          : lowered.includes('429') || lowered.includes('rate')
          ? 'A lot of kids are asking Spark right now. Try again in a few seconds.'
          : lowered.includes('json') || lowered.includes('parse')
          ? 'My answer got too big and cut off. Ask me to change one thing at a time.'
          : lowered.includes('stream ended')
          ? 'My answer got cut off before it finished. The whole project might be too big — try asking for a smaller change.'
          : `Something broke. Try a smaller request. (Details: ${text.slice(0, 120)})`;
        setMessages((current) => [...current, { role: 'assistant', content: kidMessage }]);
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
      setBusy(false);
      setStreamingText('');
      setStreamStartedAt(null);
      abortRef.current = null;
      setPendingImageUrl(null);
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
      const { shortId } = await createShareLink({
        title,
        html: projectHtml,
        projectId: looksLikeConvexId(activeProjectId)
          ? (activeProjectId as unknown as Id<'safesparkProjects'>)
          : undefined,
        sessionToken: kidSessionToken ?? undefined,
      });
      link = `${window.location.origin}/s/${shortId}`;
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
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-violet-100 bg-white/90 p-6 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white">
            <Wand2 className="h-7 w-7" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-widest text-violet-500">SafeSpark</p>
          <h1 className="mt-2 text-3xl font-black text-slate-800">Sign up to start building</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Your projects save under your account and you can come back any time, on any device.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <SignUpButton mode="modal">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700"
              >
                Create an account
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-violet-200 bg-white px-5 py-3 text-sm font-bold text-violet-700 hover:bg-violet-50"
              >
                I already have an account
              </button>
            </SignInButton>
          </div>
          <p className="mt-4 text-xs font-bold text-slate-500">
            Free during early access · No credit card
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Kids on a shared device? Have the parent sign up first, then kids log in with the family code at{' '}
            <Link href="/start" className="font-bold text-violet-700 underline">
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
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="text-sm font-bold uppercase tracking-widest text-violet-400">
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
      <main className="flex min-h-screen flex-col bg-slate-50">
        {isSignedIn && (
          <div className="border-b border-violet-200 bg-violet-50 px-4 py-2 text-center text-xs font-bold text-violet-900">
            Looking for the parent admin?{' '}
            <Link href="/parent" className="underline underline-offset-2 hover:text-violet-700">
              Go to /parent →
            </Link>
          </div>
        )}
        <KidLoginGate onSession={(token) => setKidSessionToken(token)} />
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-950">
      <header className="flex-none border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500">SafeSpark</p>
            <h1 className="truncate text-xl font-black text-slate-900">{projectTitle}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleAutoSpeak}
              className={
                autoSpeak
                  ? 'inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-3 py-2 text-sm font-black text-white hover:bg-violet-700'
                  : ACTION_BUTTON_CLASS
              }
              title={autoSpeak ? 'Spark reads replies aloud' : 'Spark stays silent (tap to enable read-aloud)'}
              aria-pressed={autoSpeak}
            >
              <Volume2 className="h-4 w-4" />
              <span className="hidden sm:inline">{autoSpeak ? 'Read aloud: on' : 'Read aloud'}</span>
            </button>
            <button type="button" onClick={startNewProject} className={ACTION_BUTTON_CLASS} title="New project">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button
              type="button"
              onClick={() => {
                // Desktop: toggle the inline panel. Mobile: switch to the
                // dedicated Projects tab.
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setMobileTab('projects');
                } else {
                  setShowProjects((value) => !value);
                }
              }}
              className={
                sortedProjects.length > 0
                  ? 'inline-flex items-center gap-2 rounded-2xl bg-violet-100 px-3 py-2 text-sm font-black text-violet-700 hover:bg-violet-200'
                  : ACTION_BUTTON_CLASS
              }
              title="My projects"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">My projects</span>
              {sortedProjects.length > 0 && (
                <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                  {sortedProjects.length}
                </span>
              )}
            </button>
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
                  <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-black text-violet-700">
                    {cloudVersions.length}
                  </span>
                )}
              </button>
            )}
            <button type="button" onClick={() => copyShareLink()} className={PRIMARY_ACTION_BUTTON_CLASS} title="Copy share link">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
            {/*
             * Always-visible "Switch profile" — clears the kid session
             * and re-enters the gate. Replaces the older split logic
             * that only showed this button when !isSignedIn. Now Clerk-
             * parents who are using as a kid can also switch kids.
             */}
            {kidSessionToken && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('lumiKidSession');
                  }
                  setKidSessionToken(null);
                }}
                className={ACTION_BUTTON_CLASS}
                title="Switch to a different kid profile"
              >
                Switch kid
              </button>
            )}
            {isSignedIn ? (
              <>
                <Link
                  href="/parent"
                  className={ACTION_BUTTON_CLASS}
                  title="Parent admin"
                >
                  Admin
                </Link>
                <UserButton />
              </>
            ) : (
              <SignInButton mode="modal">
                <button type="button" className={ACTION_BUTTON_CLASS}>
                  Sign in
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      {isSignedIn && (migrating || migrateResult) && (
        <div className="flex-none border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-xs font-bold text-emerald-900">
          {migrating ? `Auto-saving ${localGuestProjects.length} guest project${localGuestProjects.length === 1 ? '' : 's'} to your account…` : `✓ ${migrateResult}`}
        </div>
      )}

      {pendingDeletion && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-2xl">
            <Trash2 className="h-4 w-4 text-rose-300" />
            <span>
              Deleted &quot;{pendingDeletion.project.title}&quot;.
            </span>
            <button
              type="button"
              onClick={undoDelete}
              className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-900 hover:bg-slate-100"
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
              <p className="text-xs font-bold uppercase tracking-widest text-violet-500">My projects</p>
              <h2 className="text-2xl font-black text-slate-900">
                {sortedProjects.length === 0
                  ? 'Tap + New to start'
                  : `${sortedProjects.length} project${sortedProjects.length === 1 ? '' : 's'}`}
              </h2>
            </div>
            {sortedProjects.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-pink-500 to-amber-500 text-white shadow-lg">
                  <Plus className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">Nothing here yet.</p>
                <p className="mt-1 text-xs text-slate-500">
                  Tap <span className="font-black text-violet-700">New</span> at the bottom to make your first project.
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
                  className="group flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4 text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-pink-500 to-amber-500 text-white shadow-lg shadow-violet-200">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-black text-violet-700">New project</p>
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
        className={`mx-auto grid w-full min-h-0 max-w-[1400px] flex-1 gap-3 overflow-hidden px-3 pt-3 pb-20 lg:grid-cols-[390px_minmax(0,1fr)] lg:pb-3 ${
          mobileTab === 'projects' ? 'hidden lg:grid' : 'grid'
        }`}
      >
        <aside
          className={`h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:flex ${
            mobileTab === 'chat' ? 'flex lg:flex' : 'hidden lg:flex'
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-black text-slate-900">Tell Spark what to build</h2>
            {busy && <Loader2 className="h-5 w-5 animate-spin text-violet-600" />}
          </div>

          <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              return (
                <div key={`${message.role}-${index}`} className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={
                      isUser
                        ? 'max-w-[82%] rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold leading-relaxed text-white'
                        : 'max-w-[82%] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-relaxed text-slate-700'
                    }
                  >
                    {message.content}
                    {!isUser && hasUserMessages && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <SpeakButton text={message.content} autoSpeak={autoSpeak && index === messages.length - 1} />
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
                                    id: previous.id as unknown as Id<'safesparkVersions'>,
                                  });
                                  setHtml(result.html);
                                  setMessages((current) => [
                                    ...current,
                                    {
                                      role: 'assistant',
                                      content: `Reverted to "${previous.label}". Keep building from here.`,
                                    },
                                  ]);
                                } catch (err) {
                                  const text = err instanceof Error ? err.message : String(err);
                                  setError(`Couldn't undo: ${text}`);
                                }
                              }}
                              className="inline-flex h-7 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 hover:border-amber-200 hover:text-amber-700"
                              title="Go back to the version before this change"
                            >
                              ↶ Undo last change
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
            {busy && (
              <div className="flex gap-2 justify-start">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-pink-500 to-amber-500 text-white shadow-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="max-w-[82%] flex-1 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-pink-500 to-amber-500 p-[1.5px] shadow-md">
                  <div className="rounded-[14px] bg-white">
                    <div className="flex items-center justify-between gap-2 border-b border-violet-100 px-3 py-2 text-xs font-black">
                      <span className="flex items-center gap-2 text-violet-700">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-600" />
                        </span>
                        Spark is writing
                      </span>
                      <span className="font-mono text-slate-500">{elapsedSeconds}s · {streamingText.length.toLocaleString()} chars</span>
                    </div>
                    <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-all bg-slate-950 px-3 py-2 font-mono text-[11px] leading-relaxed text-emerald-200">
                      {streamingText.slice(-1200) || 'Reading your idea...'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            {showQuickPrompts && (
              <div className="mb-3 space-y-3">
                <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50 p-3 text-center">
                  <p className="text-xs font-black text-violet-700">
                    💡 Typing is hard — just talk!
                  </p>
                  <p className="mt-0.5 text-[11px] font-bold text-violet-600">
                    Tap the 🎤 below and tell Spark what to make. Tap again when you&apos;re done.
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Or pick one</p>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    {TEMPLATES.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => sendPrompt(t.prompt)}
                        disabled={busy}
                        className="flex flex-col items-center gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center text-[11px] font-black text-slate-700 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-50"
                      >
                        <span className="text-xl">{t.emoji}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && <p className="mb-3 text-sm font-semibold text-rose-600">{error}</p>}
            {voiceStatus && (
              <p className="mb-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800">
                🎤 {voiceStatus}
              </p>
            )}

            {pendingImageUrl && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800">
                {/* User-uploaded thumbnail from Convex storage — variable host, skip next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pendingImageUrl} alt="Attached" className="h-10 w-10 rounded-lg object-cover" />
                <span className="flex-1 truncate">Image attached — Spark will use it in the next build.</span>
                <button
                  type="button"
                  onClick={() => setPendingImageUrl(null)}
                  className="rounded-full p-1 text-violet-700 hover:bg-violet-200"
                  aria-label="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {imageUploading && (
              <p className="mb-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-800">
                Uploading image…
              </p>
            )}

            {pendingPdf && (
              <div className="mb-3 flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800">
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
              <p className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800">
                Reading PDF…
              </p>
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
                rows={3}
                className="min-h-20 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-400 focus:bg-white"
                placeholder="Say or type what you want to make. Enter sends, Shift+Enter for a new line."
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || imageUploading}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm hover:bg-violet-200 disabled:opacity-50"
                aria-label="Attach image"
                title={isSignedIn ? 'Attach an image' : 'Sign in to attach an image'}
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => pdfInputRef.current?.click()}
                disabled={busy || pdfUploading}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm hover:bg-sky-200 disabled:opacity-50"
                aria-label="Attach PDF"
                title={isSignedIn ? 'Attach a PDF (study guide, textbook, etc.)' : 'Sign in to attach a PDF'}
              >
                <FileText className="h-5 w-5" />
              </button>
              {allowVoice && (
                <VoiceButton onTranscript={addVoiceTranscript} onStatus={setVoiceStatus} disabled={busy} />
              )}
              {busy ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white hover:bg-rose-700"
                  aria-label="Stop"
                  title="Stop"
                >
                  <Square className="h-5 w-5" fill="currentColor" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSend}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                  aria-label="Send"
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
            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-900">
              {shareStatus}
            </div>
          )}

          {showHistory && (
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-500">Design log</p>
                  <h2 className="text-base font-black text-slate-900">Every version of this project</h2>
                </div>
                <button type="button" onClick={() => setShowHistory(false)} className="text-sm font-bold text-slate-500 hover:text-slate-900">
                  Hide
                </button>
              </div>
              {!cloudVersions || cloudVersions.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                  No versions yet. Your next build becomes v1.
                </p>
              ) : (
                <ol className="relative space-y-3 border-l-2 border-violet-100 pl-5">
                  {cloudVersions.map((version, index) => (
                    <li key={version.id} className="relative">
                      <span className="absolute -left-[27px] top-2 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-pink-500 to-amber-500 text-[9px] font-black text-white shadow">
                        {cloudVersions.length - index}
                      </span>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900">{version.label}</p>
                            <p className="mt-0.5 text-xs font-mono text-slate-500">{formatDate(version.createdAt)}</p>
                            {version.summary && (
                              <p className="mt-2 text-xs leading-relaxed text-slate-700">{version.summary}</p>
                            )}
                            {version.prompt && (
                              <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs leading-relaxed text-slate-600">
                                <span className="font-bold text-violet-600">Ask: </span>
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
                                  const result = await restoreVersionMut({ id: version.id as unknown as Id<'safesparkVersions'> });
                                  setHtml(result.html);
                                  setMessages((current) => [
                                    ...current,
                                    { role: 'assistant', content: `Restored "${version.label}". Keep building from here.` },
                                  ]);
                                  setShowHistory(false);
                                } catch (err) {
                                  const text = err instanceof Error ? err.message : String(err);
                                  setError(`Couldn't restore: ${text}`);
                                }
                              }}
                              className="shrink-0 rounded-xl border border-violet-200 bg-white px-3 py-1.5 text-xs font-black text-violet-700 hover:bg-violet-50"
                            >
                              Restore
                            </button>
                          )}
                          {index === 0 && (
                            <span className="shrink-0 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700">
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

          {showProjects && (
            <section className="hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-500">My projects</p>
                  <h2 className="text-xl font-black text-slate-900">
                    {sortedProjects.length === 0
                      ? 'Nothing here yet'
                      : `${sortedProjects.length} project${sortedProjects.length === 1 ? '' : 's'}`}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {isSignedIn && deletedProjects && deletedProjects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowDeleted((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-800 hover:bg-amber-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Recently deleted
                      <span className="rounded-full bg-amber-600 px-1.5 py-0.5 text-[10px] text-white">
                        {deletedProjects.length}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowProjects(false)}
                    className="text-sm font-bold text-slate-500 hover:text-slate-900"
                  >
                    Hide
                  </button>
                </div>
              </div>

              {showDeleted && deletedProjects && deletedProjects.length > 0 && (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-700">
                    Recently deleted · kept for 30 days
                  </p>
                  <div className="space-y-2">
                    {deletedProjects.map((d) => {
                      // "Days left" display naturally reads current time. A
                      // slightly-stale value across re-renders is acceptable.
                      // eslint-disable-next-line react-hooks/purity
                      const daysLeft = Math.max(1, Math.ceil((d.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
                      return (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-black text-slate-800">{d.title}</p>
                            <p className="mt-0.5 text-[11px] font-bold text-amber-700">
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
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-700"
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
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-black text-slate-400 hover:border-rose-300 hover:text-rose-600"
                            aria-label={`Delete ${d.title} forever`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    startNewProject();
                    setShowProjects(false);
                  }}
                  className="group flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4 text-center hover:border-violet-400 hover:bg-violet-50"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-pink-500 to-amber-500 text-white shadow-lg shadow-violet-200 transition group-hover:scale-110">
                    <Plus className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-black text-violet-700">Start a new project</p>
                  <p className="text-xs font-semibold text-slate-500">Game, flashcards, poster, tool…</p>
                </button>
                {sortedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isActive={project.id === activeProjectId}
                    onOpen={() => {
                      openProject(project);
                      setShowProjects(false);
                    }}
                    onShare={() => copyShareLink(project)}
                    onDelete={() => deleteProject(project.id)}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="flex min-h-[480px] flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-none flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Result</p>
                <h2 className="text-lg font-black text-slate-900">Play the project</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {!imageResultUrl && (
                  <>
                    <button type="button" onClick={() => setShowCode((value) => !value)} className={UTILITY_BUTTON_CLASS}>
                      {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showCode ? 'Hide code' : 'View code'}
                    </button>
                    <button type="button" onClick={downloadHtml} className={UTILITY_BUTTON_CLASS}>
                      <Download className="h-4 w-4" />
                      HTML
                    </button>
                    <button type="button" onClick={printProject} className={UTILITY_BUTTON_CLASS} title="Print or save as PDF">
                      <Printer className="h-4 w-4" />
                      Print / PDF
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="relative flex-1 bg-slate-200 p-3">
              {imageResultUrl ? (
                <ImageResult
                  imageUrl={imageResultUrl}
                  title={projectTitle || 'Photo edit'}
                />
              ) : (
                <iframe
                  title="Project preview"
                  srcDoc={injectSparkDb(html, looksLikeConvexId(activeProjectId) ? activeProjectId : null)}
                  sandbox="allow-scripts allow-same-origin"
                  className="h-full w-full rounded-2xl bg-white shadow-inner"
                />
              )}
              {busy && (
                <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-2xl bg-slate-950/55 text-white backdrop-blur-sm">
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-900/80 px-5 py-3 shadow-2xl">
                    <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
                    <span className="text-sm font-black">Spark is writing your project... {elapsedSeconds}s</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {showCode && (
            <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-bold">
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

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 px-2 py-1.5 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur lg:hidden">
        <MobileNavButton
          icon={<Bot className="h-5 w-5" />}
          label="Chat"
          active={mobileTab === 'chat'}
          onClick={() => {
            setMobileTab('chat');
            setShowProjects(false);
          }}
        />
        <MobileNavButton
          icon={<Eye className="h-5 w-5" />}
          label="Preview"
          active={mobileTab === 'preview'}
          onClick={() => {
            setMobileTab('preview');
            setShowProjects(false);
          }}
        />
        <MobileNavButton
          icon={<FolderOpen className="h-5 w-5" />}
          label="Projects"
          active={mobileTab === 'projects'}
          badge={sortedProjects.length || undefined}
          onClick={() => setMobileTab('projects')}
        />
        <MobileNavButton
          icon={<Plus className="h-5 w-5" />}
          label="New"
          active={false}
          onClick={() => {
            startNewProject();
            setMobileTab('chat');
          }}
        />
      </nav>
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
        className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 text-base font-black text-white shadow-lg hover:bg-violet-700 disabled:opacity-50"
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
      className={`relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[10px] font-black uppercase tracking-wider ${
        active ? 'bg-violet-100 text-violet-700' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-3 top-0.5 rounded-full bg-violet-600 px-1 text-[9px] text-white">
          {badge}
        </span>
      )}
    </button>
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
          ? 'group overflow-hidden rounded-2xl border-2 border-violet-400 bg-white shadow-lg shadow-violet-100'
          : 'group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-violet-200 hover:shadow-md'
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
          <div className="absolute bottom-2 right-2 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-black text-white opacity-0 shadow-lg transition group-hover:opacity-100">
            Open →
          </div>
          {isActive && (
            <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow">
              Open now
            </span>
          )}
        </div>
        <div className="border-t border-slate-100 px-3 py-2.5">
          <p className="line-clamp-1 text-sm font-black text-slate-900">{project.title}</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">{formatDate(project.updatedAt)}</p>
        </div>
      </button>
      <div className="flex gap-1 border-t border-slate-100 bg-slate-50 px-2 py-1.5">
        <button
          type="button"
          onClick={onShare}
          className="flex-1 rounded-lg px-2 py-1 text-[11px] font-black text-slate-600 hover:bg-white hover:text-violet-700"
        >
          <Copy className="mr-1 inline h-3 w-3" />
          Share
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg px-2 py-1 text-[11px] font-black text-slate-400 hover:bg-white hover:text-rose-600"
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

