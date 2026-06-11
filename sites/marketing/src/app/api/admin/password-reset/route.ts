import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const MARKETING_ENDPOINT = "https://adamant-crow-705.convex.site";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== "jedaws@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    // Public self-service endpoint: POST-only, {email} body, no admin key.
    // The previous client-side code GET-with-key was 404ing silently.
    const res = await fetch(`${MARKETING_ENDPOINT}/requestPasswordReset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to send password reset" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending password reset:", error);
    return NextResponse.json(
      { error: "Failed to send password reset" },
      { status: 500 }
    );
  }
}
