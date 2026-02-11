import { NextResponse } from "next/server";
import { Resend } from "resend";

const NEWSLETTER_AUDIENCE_ID = process.env.RESEND_NEWSLETTER_AUDIENCE_ID;

export async function GET(req: Request) {
  // Check admin auth
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key || key !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
  }

  if (!NEWSLETTER_AUDIENCE_ID) {
    return NextResponse.json({
      subscribers: [],
      total: 0,
      message: "Newsletter audience not configured"
    });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.contacts.list({
      audienceId: NEWSLETTER_AUDIENCE_ID,
    });

    if (error) {
      console.error("Resend contacts list error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const subscribers = data?.data || [];

    return NextResponse.json({
      subscribers: subscribers.map((s) => ({
        id: s.id,
        email: s.email,
        firstName: s.first_name || null,
        createdAt: s.created_at,
        unsubscribed: s.unsubscribed,
      })),
      total: subscribers.length,
    });
  } catch (error) {
    console.error("Newsletter fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
  }
}
