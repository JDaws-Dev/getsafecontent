import { NextResponse } from "next/server";
import { Resend } from "resend";

// Lazily initialize Resend to avoid build-time errors when env var is missing
let resend: Resend | null = null;
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Resend Audience ID for newsletter subscribers
// Create this in Resend dashboard: https://resend.com/audiences
const NEWSLETTER_AUDIENCE_ID = process.env.RESEND_NEWSLETTER_AUDIENCE_ID;

export async function POST(req: Request) {
  try {
    const { email, firstName } = await req.json();

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const resendClient = getResend();
    if (!resendClient) {
      console.error("RESEND_API_KEY not configured");
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 }
      );
    }

    if (!NEWSLETTER_AUDIENCE_ID) {
      console.error("RESEND_NEWSLETTER_AUDIENCE_ID not configured");
      return NextResponse.json(
        { error: "Newsletter audience not configured" },
        { status: 500 }
      );
    }

    // Add contact to Resend audience
    const result = await resendClient.contacts.create({
      audienceId: NEWSLETTER_AUDIENCE_ID,
      email: email.toLowerCase().trim(),
      firstName: firstName?.trim() || undefined,
      unsubscribed: false,
    });

    if (result.error) {
      // Check if it's a duplicate - Resend returns specific error
      if (result.error.message?.includes("already exists")) {
        // Still count as success - they're already subscribed
        return NextResponse.json({
          success: true,
          message: "You're already subscribed!",
        });
      }

      console.error("Resend contact create error:", result.error);
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    // Send welcome email with the guide
    await resendClient.emails.send({
      from: "Jeremiah from Safe Family <jeremiah@getsafefamily.com>",
      to: email.toLowerCase().trim(),
      replyTo: "jeremiah@getsafefamily.com",
      subject: "Your Free Guide: Keeping Kids Safe Online",
      html: getWelcomeEmailHtml(firstName?.trim() || null),
    });

    console.log(`Newsletter subscriber added: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed!",
    });
  } catch (error) {
    console.error("Newsletter subscription error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

function getWelcomeEmailHtml(firstName: string | null): string {
  const name = firstName || "there";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a2e; margin-bottom: 24px; font-size: 24px;">Your Free Guide Is Here!</h1>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Hey ${name},
    </p>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Thanks for joining the Safe Family community! As promised, here's your free guide:
    </p>

    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
      <h2 style="color: white; margin: 0 0 12px 0; font-size: 20px;">10 Ways to Keep Your Kids Safe Online</h2>
      <p style="color: rgba(255,255,255,0.9); margin: 0 0 16px 0; font-size: 14px;">Practical tips every parent needs in 2026</p>
      <a href="https://getsafefamily.com/guides/keeping-kids-safe-online" style="display: inline-block; background: white; color: #6366f1; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Read the Guide →
      </a>
    </div>

    <h3 style="color: #1a1a2e; font-size: 18px; margin: 32px 0 16px 0;">What's inside:</h3>

    <ul style="color: #4b5563; font-size: 16px; line-height: 1.8; padding-left: 20px;">
      <li>How to talk to kids about online safety (without scaring them)</li>
      <li>The 3 settings every parent should change on YouTube</li>
      <li>Why parental controls alone aren't enough</li>
      <li>Age-appropriate conversations about digital privacy</li>
      <li>Signs your child may have seen something disturbing</li>
    </ul>

    <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

    <h3 style="color: #1a1a2e; font-size: 18px; margin: 0 0 16px 0;">Want to take it further?</h3>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Safe Family gives you app-level control over what your kids see and hear:
    </p>

    <ul style="color: #4b5563; font-size: 16px; line-height: 1.8; padding-left: 20px;">
      <li><strong>SafeTunes</strong> - Only approved music on Apple Music</li>
      <li><strong>SafeTube</strong> - Only approved YouTube channels</li>
      <li><strong>SafeReads</strong> - AI book reviews before they read</li>
    </ul>

    <div style="margin: 24px 0; text-align: center;">
      <a href="https://getsafefamily.com/signup" style="display: inline-block; background: linear-gradient(135deg, #F5A962 0%, #E88B6A 100%); color: #1a1a2e; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Start Your Free Trial →
      </a>
    </div>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      Got questions? Just reply to this email — I read every message.
    </p>

    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
      — Jeremiah<br>
      <span style="color: #9ca3af;">Founder, Safe Family</span>
    </p>
  </div>

  <div style="text-align: center; padding: 24px;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      Safe Family · <a href="https://getsafefamily.com" style="color: #9ca3af;">getsafefamily.com</a>
    </p>
    <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #9ca3af;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
`;
}
