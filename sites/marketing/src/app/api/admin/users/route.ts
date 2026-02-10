import { auth } from "@/lib/auth";
import { fetchAllUsers, unifyUsers, groupUsers, calculateStats } from "@/lib/admin-api";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.email || session.user.email !== "jedaws@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rawData = await fetchAllUsers();
    const users = unifyUsers(rawData);
    const groupedUsers = groupUsers(rawData);
    const stats = calculateStats(rawData);

    return NextResponse.json({ users, groupedUsers, stats, raw: rawData });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
