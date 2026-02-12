import { auth } from "@/lib/auth";
import { deleteUserAll } from "@/lib/admin-api";
import { logAdminAction } from "@/lib/audit-log";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== "jedaws@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, apps } = await request.json();

    if (!email || !apps || !Array.isArray(apps) || apps.length === 0) {
      return NextResponse.json(
        { error: "Missing email or apps" },
        { status: 400 }
      );
    }

    // Validate all apps
    const validApps = ["safetunes", "safetube", "safereads"];
    for (const app of apps) {
      if (!validApps.includes(app)) {
        return NextResponse.json({ error: `Invalid app: ${app}` }, { status: 400 });
      }
    }

    const result = await deleteUserAll(email, apps);

    // Log the action
    await logAdminAction({
      adminEmail: session.user.email,
      action: "delete_user",
      targetEmail: email,
      details: { apps, success: result.success, results: result.results },
      request,
    });

    if (!result.success) {
      const failures = result.results.filter(r => !r.success);
      return NextResponse.json(
        { error: `Failed on some apps: ${failures.map(f => f.app).join(", ")}`, results: result.results },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
