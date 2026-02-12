import { NextResponse } from "next/server";
import { getActiveFeatureFlags } from "@/lib/feature-flags";

/**
 * GET /api/feature-flags
 *
 * Returns the current state of feature flags.
 * Used by client components to check which features are enabled.
 *
 * Note: This endpoint is public but only exposes non-sensitive boolean flags.
 * Do not expose secrets or internal configuration here.
 */
export async function GET() {
  const flags = getActiveFeatureFlags();

  return NextResponse.json({
    flags,
    // Include a timestamp for debugging/caching purposes
    timestamp: new Date().toISOString(),
  });
}
