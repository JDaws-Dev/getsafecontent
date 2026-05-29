/**
 * Admin sign-in via Marketing Central credentials.
 *
 * Alternate path for the /admin/* area, parallel to the existing NextAuth
 * Google OAuth route. Posted to from /admin-login when the operator chooses
 * "sign in with Safe Family password" instead of Google.
 *
 * Flow:
 *   1. POST { email, password }
 *   2. Forward to https://adamant-crow-705.convex.site/login
 *   3. If success AND email matches the allow-listed admin email,
 *      set an HttpOnly cookie `safefamily_admin_jwt` with the Marketing JWT.
 *   4. The admin layout (src/app/admin/layout.tsx) checks NextAuth first
 *      and falls back to validating this cookie.
 *
 * Lets the operator reach /admin/* even when the Google OAuth redirect URI
 * isn't whitelisted in the Cloud Console — eliminates the brittle dependency
 * on third-party OAuth configuration drift.
 */

import { NextResponse } from "next/server";

const MARKETING_CENTRAL_URL = "https://adamant-crow-705.convex.site";
const ADMIN_EMAIL = "jedaws@gmail.com";
const COOKIE_NAME = "safefamily_admin_jwt";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  if (!body?.email || !body.password) {
    return NextResponse.json(
      { error: "Email and password required." },
      { status: 400 },
    );
  }

  // Allow-list check BEFORE the network call so we don't probe Marketing
  // Central's auth surface with arbitrary emails from this endpoint.
  if (body.email.trim().toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json(
      { error: "This sign-in path is for the admin only." },
      { status: 403 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${MARKETING_CENTRAL_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: body.email, password: body.password }),
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the auth service. Try again." },
      { status: 502 },
    );
  }

  const data = (await upstream.json().catch(() => null)) as
    | { success?: boolean; token?: string; user?: { email?: string }; error?: string }
    | null;

  if (!upstream.ok || !data?.success || !data.token || !data.user) {
    return NextResponse.json(
      { error: data?.error ?? "Invalid email or password." },
      { status: 401 },
    );
  }

  // Double-check the resolved user matches the admin email — Marketing
  // Central is the source of truth for who this JWT actually belongs to.
  if ((data.user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: data.token,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
