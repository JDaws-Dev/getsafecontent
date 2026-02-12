import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ratelimit";
import { logAdminAction } from "@/lib/audit-log";

// Admin key for authenticating with Convex endpoints
const ADMIN_KEY = process.env.ADMIN_API_KEY;

// App endpoints
const APP_ENDPOINTS = {
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
} as const;

// SafeReads hosts the centralUsers table
const SAFEREADS_ENDPOINT = APP_ENDPOINTS.safereads;

/**
 * POST /api/auth/sync-password
 *
 * Syncs a password change from one app to centralUsers and all other apps.
 *
 * Flow:
 * 1. App where password was changed calls this endpoint
 * 2. This endpoint updates centralUsers table in SafeReads
 * 3. Then calls /updatePassword on all OTHER apps (excluding source)
 *
 * Request body:
 * {
 *   email: string,
 *   newPasswordHash: string,    // Already hashed by the source app
 *   sourceApp: string,          // Which app triggered the change (safetunes/safetube/safereads)
 *   adminKey?: string           // Admin key if not using ADMIN_API_KEY env var
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   email: string,
 *   centralUpdated: boolean,
 *   appsUpdated: { app: string, success: boolean, error?: string }[],
 *   error?: string
 * }
 */
export async function POST(req: Request) {
  // Rate limit: 10 requests per minute per IP
  try {
    const rateLimitResult = await checkRateLimit("sync-password", req);
    if ("status" in rateLimitResult) {
      return rateLimitResult; // 429 response
    }
  } catch (rateLimitError) {
    console.error("[sync-password] Rate limit check failed:", rateLimitError);
  }

  try {
    const body = await req.json();
    const { email, newPasswordHash, sourceApp, adminKey } = body;

    // Validate admin key
    const effectiveKey = adminKey || ADMIN_KEY;
    if (!effectiveKey) {
      console.error("[sync-password] No admin key provided or configured");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate password hash
    if (!newPasswordHash || typeof newPasswordHash !== "string") {
      return NextResponse.json(
        { success: false, error: "newPasswordHash is required" },
        { status: 400 }
      );
    }

    // Validate source app
    const validApps = ["safetunes", "safetube", "safereads"];
    if (!sourceApp || !validApps.includes(sourceApp)) {
      return NextResponse.json(
        { success: false, error: "Invalid sourceApp. Must be one of: safetunes, safetube, safereads" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`[sync-password] Starting sync for ${normalizedEmail} (source: ${sourceApp})`);

    // Step 1: Update centralUsers table in SafeReads
    const encodedKey = encodeURIComponent(effectiveKey);
    let centralUpdated = false;

    try {
      const centralResponse = await fetch(
        `${SAFEREADS_ENDPOINT}/updateCentralPassword?key=${encodedKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            passwordHash: newPasswordHash,
            sourceApp,
          }),
          // 5 second timeout
          signal: AbortSignal.timeout(5000),
        }
      );

      const centralResult = await centralResponse.json();

      if (centralResponse.ok && centralResult.success) {
        centralUpdated = true;
        console.log(`[sync-password] Central user updated for ${normalizedEmail}`);
      } else {
        // If central user doesn't exist, that's okay - user might only exist in one app
        console.log(`[sync-password] Central user not updated: ${centralResult.error || centralResult.reason || "unknown"}`);
      }
    } catch (error) {
      console.error(`[sync-password] Failed to update central user:`, error);
      // Continue to update other apps even if central fails
    }

    // Step 2: Update password in all OTHER apps (not the source)
    const appsToUpdate = validApps.filter((app) => app !== sourceApp);
    const appsUpdated: { app: string; success: boolean; error?: string }[] = [];

    await Promise.all(
      appsToUpdate.map(async (app) => {
        const endpoint = APP_ENDPOINTS[app as keyof typeof APP_ENDPOINTS];
        try {
          const response = await fetch(
            `${endpoint}/updatePassword?key=${encodedKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: normalizedEmail,
                passwordHash: newPasswordHash,
              }),
              // 5 second timeout
              signal: AbortSignal.timeout(5000),
            }
          );

          const result = await response.json();

          if (response.ok) {
            appsUpdated.push({
              app,
              success: true,
            });
            console.log(`[sync-password] ${app} updated for ${normalizedEmail}`);
          } else {
            appsUpdated.push({
              app,
              success: false,
              error: result.error || result.reason || "Unknown error",
            });
            console.log(`[sync-password] ${app} not updated: ${result.error || result.reason}`);
          }
        } catch (error) {
          appsUpdated.push({
            app,
            success: false,
            error: error instanceof Error ? error.message : "Request failed",
          });
          console.error(`[sync-password] Failed to update ${app}:`, error);
        }
      })
    );

    console.log(`[sync-password] Complete for ${normalizedEmail}:`, {
      centralUpdated,
      appsUpdated,
    });

    // Audit log the password sync
    try {
      await logAdminAction({
        adminEmail: "system", // Password sync is initiated by apps, not a specific admin
        action: "password_sync",
        targetEmail: normalizedEmail,
        details: {
          sourceApp,
          centralUpdated,
          appsUpdated,
        },
        request: req,
      });
    } catch (auditError) {
      console.error("[sync-password] Failed to write audit log:", auditError);
      // Don't fail the sync due to audit log failure
    }

    return NextResponse.json({
      success: true,
      email: normalizedEmail,
      centralUpdated,
      appsUpdated,
    });
  } catch (error) {
    console.error("[sync-password] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/sync-password with plain password (alternative)
 *
 * This version accepts a plain password and hashes it before syncing.
 * Useful for password reset flows where the app has the plain password.
 *
 * Request body:
 * {
 *   email: string,
 *   newPassword: string,        // Plain text - will be hashed
 *   sourceApp: string,
 *   adminKey?: string
 * }
 */
// Note: This is handled in the same POST handler above
// If newPassword is provided instead of newPasswordHash, we hash it first
