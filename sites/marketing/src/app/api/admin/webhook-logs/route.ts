import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWebhookLogs, getWebhookStats, type WebhookEventType, type WebhookStatus } from "@/lib/webhook-log";

const ADMIN_EMAIL = "jedaws@gmail.com";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  // Handle stats request
  if (action === "stats") {
    const stats = await getWebhookStats();
    return NextResponse.json(stats);
  }

  // Handle logs request
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const status = url.searchParams.get("status") as WebhookStatus | null;
  const eventType = url.searchParams.get("eventType") as WebhookEventType | null;
  const email = url.searchParams.get("email");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const result = await getWebhookLogs({
    limit,
    offset,
    status: status || undefined,
    eventType: eventType || undefined,
    email: email || undefined,
    startDate: startDate ? parseInt(startDate) : undefined,
    endDate: endDate ? parseInt(endDate) : undefined,
  });

  return NextResponse.json(result);
}
