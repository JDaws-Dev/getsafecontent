import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Admin key for authenticating with Convex apps
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";

// Allowed admin email
const ADMIN_EMAIL = "jedaws@gmail.com";

// Valid app names
type AppName = "safetunes" | "safetube" | "safereads";
const ALL_APPS: AppName[] = ["safetunes", "safetube", "safereads"];

// App admin endpoint URLs
const APP_ENDPOINTS: Record<AppName, string> = {
  safetunes: "https://formal-chihuahua-623.convex.site",
  safetube: "https://rightful-rabbit-333.convex.site",
  safereads: "https://exuberant-puffin-838.convex.site",
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    attempts: maxRetries
  };
}

async function grantSingleAppAccess(email: string, app: AppName): Promise<void> {
  const encodedEmail = encodeURIComponent(email);
  const encodedKey = encodeURIComponent(ADMIN_KEY);
  const endpoint = APP_ENDPOINTS[app];
  let url: string;

  if (app === "safetube") {
    url = `${endpoint}/setSubscriptionStatus?email=${encodedEmail}&status=lifetime&key=${encodedKey}`;
  } else {
    url = `${endpoint}/grantLifetime?email=${encodedEmail}&key=${encodedKey}`;
  }

  const response = await fetch(url);
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

  let body: { email: string; apps: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { email, apps } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400 }
    );
  }

  if (!apps || !Array.isArray(apps) || apps.length === 0) {
    return NextResponse.json(
      { error: "apps array is required" },
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

  console.log(`Manual retry provision for ${email}, apps: ${validApps.join(",")}`);

  // Attempt to provision each app with retries
  const results = await Promise.all(
    validApps.map(async (app) => {
      const result = await withRetry(
        () => grantSingleAppAccess(email, app),
        `grant ${app} access for ${email}`
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

  console.log(`Retry provision for ${email} complete:`, {
    successes: successes.map((s) => s.app),
    failures: failures.map((f) => `${f.app}: ${f.error}`),
  });

  if (failures.length === 0) {
    return NextResponse.json({
      success: true,
      message: `Successfully provisioned ${validApps.join(", ")} for ${email}`,
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

// GET endpoint to check if a user has access to apps
export async function GET(req: Request) {
  // Check session-based authentication (for browser requests)
  const session = await auth();
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  if (!ADMIN_KEY) {
    return NextResponse.json(
      { error: "ADMIN_API_KEY not configured on server" },
      { status: 500 }
    );
  }

  // Check each app for user status
  const results = await Promise.all(
    ALL_APPS.map(async (app) => {
      const endpoint = APP_ENDPOINTS[app];
      const encodedEmail = encodeURIComponent(email);
      const encodedKey = encodeURIComponent(ADMIN_KEY);

      try {
        const response = await fetch(
          `${endpoint}/adminDashboard?key=${encodedKey}&format=json`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          return { app, found: false, error: `HTTP ${response.status}` };
        }

        const users = await response.json();
        const user = users.find(
          (u: { email: string }) => u.email.toLowerCase() === email.toLowerCase()
        );

        if (user) {
          return {
            app,
            found: true,
            status: user.subscriptionStatus,
            createdAt: user.createdAt,
          };
        } else {
          return { app, found: false };
        }
      } catch (err) {
        return { app, found: false, error: String(err) };
      }
    })
  );

  return NextResponse.json({
    email,
    apps: results,
  });
}
