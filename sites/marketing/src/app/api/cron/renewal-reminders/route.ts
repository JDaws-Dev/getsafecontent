import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { Resend } from "resend";
import Stripe from "stripe";

// Vercel Cron runs this daily at 8 AM UTC
// Finds subscriptions renewing in 3 days and sends a reminder email

export async function GET(req: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const stripe = getStripe();
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Find subscriptions renewing in ~3 days (72-96 hour window)
  const now = Math.floor(Date.now() / 1000);
  const threeDaysFromNow = now + 3 * 24 * 60 * 60;
  const fourDaysFromNow = now + 4 * 24 * 60 * 60;

  const results: { sent: string[]; errors: string[] } = { sent: [], errors: [] };

  try {
    // List active subscriptions with current_period_end in the 3-day window
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      current_period_end: {
        gte: threeDaysFromNow,
        lt: fourDaysFromNow,
      },
      limit: 100,
      expand: ["data.customer"],
    });

    for (const sub of subscriptions.data) {
      const customer = sub.customer as Stripe.Customer;
      const email = customer.email;
      if (!email) continue;

      const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end;
      const renewalDate = new Date(periodEnd * 1000);
      const amount = sub.items.data[0]?.price?.unit_amount || 0;
      const interval = sub.items.data[0]?.price?.recurring?.interval || "month";
      const name = customer.name || "there";

      const emailContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a;">Subscription Renewal Reminder</h1>

          <p>Hi ${name},</p>

          <p>Just a heads up — your Safe Family subscription will renew on <strong>${renewalDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong> for <strong>$${(amount / 100).toFixed(2)}/${interval}</strong>.</p>

          <p>No action needed if you'd like to continue. Your kids' approved content stays safe and accessible.</p>

          <p>Need to make changes? You can manage your subscription anytime:</p>

          <p><a href="https://getsafefamily.com/account" style="color: #2563eb;">Manage subscription →</a></p>

          <p>Thanks for being part of Safe Family!</p>

          <p>— Jeremiah, Safe Family</p>

          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="color: #9ca3af; font-size: 12px;">Safe Family · <a href="https://getsafefamily.com" style="color: #9ca3af;">getsafefamily.com</a></p>
        </div>
      `;

      try {
        await resend.emails.send({
          from: "Safe Family <notifications@getsafefamily.com>",
          replyTo: "jeremiah@getsafefamily.com",
          to: email,
          subject: `Your Safe Family subscription renews on ${renewalDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
          html: emailContent,
        });
        results.sent.push(email);
      } catch (error) {
        console.error(`Failed to send renewal reminder to ${email}:`, error);
        results.errors.push(email);
      }
    }

    // Send admin summary if any emails were sent
    if (results.sent.length > 0) {
      await resend.emails.send({
        from: "Safe Family <notifications@getsafefamily.com>",
        to: process.env.ADMIN_EMAIL || "jeremiah@getsafefamily.com",
        subject: `Renewal reminders sent: ${results.sent.length} users`,
        html: `<p>Sent renewal reminders to: ${results.sent.join(", ")}</p>${results.errors.length > 0 ? `<p style="color:red;">Failed: ${results.errors.join(", ")}</p>` : ""}`,
      });
    }

    console.log(`Renewal reminders: ${results.sent.length} sent, ${results.errors.length} errors`);
    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("Renewal reminder cron failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
