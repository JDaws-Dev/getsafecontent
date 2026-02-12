import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAuditLogs, type AuditAction } from "@/lib/audit-log";

const ADMIN_EMAIL = "jedaws@gmail.com";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const action = url.searchParams.get("action") as AuditAction | null;
  const adminEmail = url.searchParams.get("adminEmail");
  const targetEmail = url.searchParams.get("targetEmail");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const result = await getAuditLogs({
    limit,
    offset,
    action: action || undefined,
    adminEmail: adminEmail || undefined,
    targetEmail: targetEmail || undefined,
    startDate: startDate ? parseInt(startDate) : undefined,
    endDate: endDate ? parseInt(endDate) : undefined,
  });

  return NextResponse.json(result);
}
