'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2 } from 'lucide-react';

type SharePayload = {
  v: 1;
  title: string;
  html: string;
};

type DecompressionWindow = Window &
  typeof globalThis & {
    DecompressionStream?: new (format: 'gzip') => TransformStream<Uint8Array, Uint8Array>;
  };

export function ShareViewer() {
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void readSharedProject()
      .then(setPayload)
      .catch(() => setError('This share link could not be opened.'));
  }, []);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-cream px-4">
        <section className="max-w-md rounded-3xl border border-brand-cream-2 bg-white p-6 text-center shadow-sm">
          <h1 className="font-display text-2xl font-bold text-brand-navy">Project not found</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-brand-ink-soft">{error}</p>
          <Link
            href="/demo?code=BELLA-BUILD"
            className="mt-5 inline-flex rounded-2xl bg-accent-500 px-4 py-3 text-sm font-bold text-brand-navy"
          >
            Open Bella Maker
          </Link>
        </section>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-cream">
        <Loader2 className="h-8 w-8 animate-spin text-accent-700" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-cream text-brand-navy">
      <header className="border-b border-brand-cream-2 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-accent-700">Shared Bella project</p>
            <h1 className="truncate font-display text-xl font-bold text-brand-navy">{payload.title}</h1>
          </div>
          <Link
            href="/demo?code=BELLA-BUILD"
            className="inline-flex items-center gap-2 rounded-2xl bg-accent-500 px-4 py-2 text-sm font-bold text-brand-navy hover:bg-accent-600"
          >
            <ExternalLink className="h-4 w-4" />
            Make your own
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl p-4">
        <iframe
          title={payload.title}
          srcDoc={payload.html}
          sandbox="allow-scripts"
          className="h-[calc(100vh-112px)] min-h-[620px] w-full rounded-3xl border border-brand-cream-2 bg-white shadow-sm"
        />
      </div>
    </main>
  );
}

async function readSharedProject(): Promise<SharePayload> {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const encoded = new URLSearchParams(hash).get('p');
  if (!encoded) throw new Error('Missing share payload.');

  const json = await decodePayload(encoded);
  const parsed = JSON.parse(json) as SharePayload;
  if (parsed.v !== 1 || !parsed.title || !parsed.html) throw new Error('Invalid share payload.');
  return parsed;
}

async function decodePayload(encoded: string): Promise<string> {
  if (encoded.startsWith('gz.')) {
    const DecompressionStreamCtor = (window as DecompressionWindow).DecompressionStream;
    if (!DecompressionStreamCtor) throw new Error('Compressed links are not supported in this browser.');
    const bytes = base64UrlToBytes(encoded.slice(3));
    const decompressed = await new Response(
      new Blob([bytesToArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStreamCtor('gzip')),
    ).arrayBuffer();
    return new TextDecoder().decode(decompressed);
  }

  if (encoded.startsWith('b64.')) {
    return new TextDecoder().decode(base64UrlToBytes(encoded.slice(4)));
  }

  throw new Error('Unknown share payload.');
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
