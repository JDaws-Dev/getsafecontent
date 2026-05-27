import { auth } from '@clerk/nextjs/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 30_000;

export async function POST(request: Request) {
  const { userId, getToken } = await auth();
  const body = (await request.json().catch(() => null)) as
    | { storageId?: string; sessionToken?: string }
    | null;

  if (!body?.storageId && !body?.sessionToken) {
    return Response.json({ error: 'storageId or sessionToken required' }, { status: 400 });
  }

  // For Clerk-authed parents: use Convex via Clerk JWT to resolve storage URL.
  // For kid sessions: use the existing finalizeImageUpload mutation which
  // already works for any storage object (image OR pdf) — the helper just
  // returns the storage URL.
  let pdfUrl: string;
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    if (userId) {
      const token = await getToken({ template: 'convex' });
      if (token) convex.setAuth(token);
    }
    const result = (await convex.mutation(api.safespark.finalizeImageUpload, {
      storageId: body.storageId!,
    })) as { url: string };
    pdfUrl = result.url;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Could not resolve upload: ${msg}` }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) {
      return Response.json({ error: `Upload fetch failed (${res.status}).` }, { status: 502 });
    }
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_PDF_BYTES) {
      return Response.json({ error: 'PDF is too big — keep it under 10 MB.' }, { status: 413 });
    }
    buffer = Buffer.from(arrayBuffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Could not download PDF: ${msg}` }, { status: 502 });
  }

  let text = '';
  let pageCount = 0;
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    text = result.text ?? '';
    pageCount = result.pages?.length ?? 0;
    await parser.destroy?.();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `Could not read PDF: ${msg}` }, { status: 422 });
  }

  const truncated = text.length > MAX_EXTRACTED_CHARS;
  const out = truncated ? text.slice(0, MAX_EXTRACTED_CHARS) : text;

  return Response.json({
    text: out,
    pageCount,
    truncated,
    chars: out.length,
  });
}
