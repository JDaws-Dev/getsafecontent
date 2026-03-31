import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit-log";

// Admin key for authenticating with Convex apps
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

// Allowed admin email
const ADMIN_EMAIL = "jedaws@gmail.com";

// Valid app names
type AppName = "safetunes" | "safetube" | "safereads" | "safestudy";
const ALL_APPS: AppName[] = ["safetunes", "safetube", "safereads", "safestudy"];

// Valid subscription statuses
const VALID_STATUSES = ["trial", "active", "lifetime", "cancelled", "expired"] as const;
type SubscriptionStatus = (typeof VALID_STATUSES)[number];

// App admin endpoint URLs
const APP_ENDPOINTS: Record<AppName, string> = {
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
  safestudy: "https://strong-scorpion-227.convex.site",
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const TIMEOUT_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<{ success: true; result: T } | { success: false; error: string; attempts: number }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return { success: true, result };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`${operationName} attempt ${attempt}/${maxRetries} failed:`, lastError.message);

      if (attempt < maxRetries) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "Unknown error",
    attempts: maxRetries,
  };
}

async function setAppSubscriptionStatus(
  email: string,
  app: AppName,
  status: SubscriptionStatus
): Promise<void> {
  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const endpoint = APP_ENDPOINTS[app];

  const url = `${endpoint}/setSubscriptionStatus?email=${encodedEmail}&status=${status}&key=${encodedKey}`;

  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} - ${body}`);
  }
}

export async function POST(req: Request) {
  // Check session-based authentication (for browser requests)
  const session = await auth();
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ADMIN_KEY) {
    return NextResponse.json(
      { error: "ADMIN_API_KEY not configured on server" },
      { status: 500 }
    );
  }

  let body: { email: string; apps: string[]; status: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, apps, status } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  if (!apps || !Array.isArray(apps) || apps.length === 0) {
    return NextResponse.json({ error: "apps array is required" }, { status: 400 });
  }

  if (!status || typeof status !== "string") {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  // Validate status
  if (!VALID_STATUSES.includes(status as SubscriptionStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate app names
  const validApps = apps.filter((app): app is AppName =>
    ALL_APPS.includes(app as AppName)
  );

  if (validApps.length === 0) {
    return NextResponse.json(
      { error: "No valid app names provided. Valid apps: safetunes, safetube, safereads" },
      { status: 400 }
    );
  }

  console.log(`Manual provision for ${email}, apps: ${validApps.join(",")}, status: ${status}`);

  // Attempt to provision each app with retries
  const results = await Promise.all(
    validApps.map(async (app) => {
      const result = await withRetry(
        () => setAppSubscriptionStatus(email, app, status as SubscriptionStatus),
        `set ${app} status to ${status} for ${email}`
      );

      if (result.success) {
        return { app, success: true };
      } else {
        return { app, success: false, error: result.error, attempts: result.attempts };
      }
    })
  );

  const failures = results.filter((r) => !r.success);
  const successes = results.filter((r) => r.success);

  console.log(`Manual provision for ${email} complete:`, {
    status,
    successes: successes.map((s) => s.app),
    failures: failures.map((f) => `${f.app}: ${f.error}`),
  });

  // Log the action
  await logAdminAction({
    adminEmail: session.user.email,
    action: "manual_provision",
    targetEmail: email,
    details: {
      apps: validApps,
      status,
      successes: successes.map((s) => s.app),
      failures: failures.map((f) => ({ app: f.app, error: f.error })),
    },
    request: req,
  });

  if (failures.length === 0) {
    return NextResponse.json({
      success: true,
      message: `Successfully set ${validApps.join(", ")} to "${status}" for ${email}`,
      results,
    });
  } else if (successes.length > 0) {
    return NextResponse.json({
      success: false,
      message: `Partial success: ${successes.map((s) => s.app).join(", ")} succeeded, ${failures.map((f) => f.app).join(", ")} failed`,
      results,
    });
  } else {
    return NextResponse.json(
      {
        success: false,
        message: `All provisioning attempts failed for ${email}`,
        results,
      },
      { status: 500 }
    );
  }
}
