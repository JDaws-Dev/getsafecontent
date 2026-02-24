import { NextResponse } from "next/server";

/**
 * POST /api/auth/trigger-sync
 *
 * Triggers password sync to all apps after a password reset on the Marketing site.
 * This is called from the reset-password page after Convex Auth updates the password.
 *
 * Request body:
 * { email: string }
 *
 * This endpoint:
 * 1. Gets the password hash from the shared SafeReads Convex authAccounts
 * 2. Calls /api/auth/sync-password to propagate to central + other apps
 */

// SafeReads (shared deployment) endpoint to get password hash
const SAFEREADS_ENDPOINT = "https://exuberant-puffin-838.convex.site";
const ADMIN_KEY = process.env.ADMIN_API_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    if (!ADMIN_KEY) {
      console.error("[trigger-sync] ADMIN_API_KEY not configured");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[trigger-sync] Starting sync for ${normalizedEmail}`);

    // Get the current password hash from SafeReads authAccounts
    // We need to call an endpoint that can retrieve this
    const encodedKey = encodeURIComponent(ADMIN_KEY);

    let passwordHash: string | null = null;

    try {
      // Use getCentralUser to get the password hash (it returns passwordHash for central users)
      const response = await fetch(
        `${SAFEREADS_ENDPOINT}/getCentralUser?email=${encodeURIComponent(normalizedEmail)}&key=${encodedKey}`,
        {
          method: "GET",
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.passwordHash) {
          passwordHash = data.passwordHash;
        }
      }
    } catch (error) {
      console.warn("[trigger-sync] Failed to get central user hash:", error);
    }

    // If no central user hash, try to get from authAccounts via a direct query
    // For now, we'll just proceed with the sync-password endpoint which will handle this

    if (!passwordHash) {
      // The sync-password endpoint can handle getting the hash from the source app
      // Since Marketing shares SafeReads' deployment, we indicate safereads as source
      console.log(`[trigger-sync] No password hash retrieved, calling sync-password anyway`);
    }

    // Call the sync-password endpoint to propagate to all apps
    const syncResponse = await fetch(
      `${process.env.NEXT_PUBLIC_URL || "https://getsafefamily.com"}/api/auth/sync-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          newPasswordHash: passwordHash, // May be null, sync-password will handle
          sourceApp: "safereads", // Marketing shares SafeReads deployment
          adminKey: ADMIN_KEY,
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    const syncResult = await syncResponse.json();

    if (syncResponse.ok && syncResult.success) {
      console.log(`[trigger-sync] Sync successful for ${normalizedEmail}`);
      return NextResponse.json({
        success: true,
        ...syncResult,
      });
    } else {
      console.warn(`[trigger-sync] Sync failed for ${normalizedEmail}:`, syncResult);
      return NextResponse.json({
        success: false,
        error: syncResult.error || "Sync failed",
      });
    }
  } catch (error) {
    console.error("[trigger-sync] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
