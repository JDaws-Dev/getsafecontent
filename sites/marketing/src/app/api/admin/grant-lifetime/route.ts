import { auth } from "@/lib/auth";
import { grantLifetime } from "@/lib/admin-api";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== "jedaws@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { app, email } = await request.json();

    if (!app || !email) {
      return NextResponse.json(
        { error: "Missing app or email" },
        { status: 400 }
      );
    }

    if (!["safetunes", "safetube", "safereads"].includes(app)) {
      return NextResponse.json({ error: "Invalid app" }, { status: 400 });
    }

    const result = await grantLifetime(app, email);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error granting lifetime:", error);
    return NextResponse.json(
      { error: "Failed to grant lifetime" },
      { status: 500 }
    );
  }
}
