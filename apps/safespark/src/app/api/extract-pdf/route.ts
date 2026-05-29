import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 30_000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { storageId?: string; sessionToken?: string }
    | null;

  if (!body?.storageId) {
    return Response.json({ error: 'storageId required' }, { status: 400 });
  }

  // Clerk retired 2026-05-28 — auth is now strictly via the kid sessionToken
  // (most common, when the request comes from /make). The finalizeImageUpload
  // mutation accepts that path via resolveSafeSparkIdentity.
  let pdfUrl: string;
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const result = (await convex.mutation(api.safespark.finalizeImageUpload, {
      storageId: body.storageId,
      sessionToken: body.sessionToken,
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
