import { auth } from "@/lib/auth";
import { logAdminAction } from "@/lib/audit-log";
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

// Email template types
type TemplateType = "trial_expiring" | "trial_expired" | "re_engagement" | "announcement" | "custom";

interface SendEmailRequest {
  to: string | string[];
  template: TemplateType;
  subject?: string; // Required for custom template
  body?: string; // Required for custom template
  // Template-specific data
  userName?: string;
  daysLeft?: number;
  appNames?: string[];
}

// Email templates
function getEmailContent(template: TemplateType, data: SendEmailRequest): { subject: string; html: string } {
  const { userName, daysLeft, appNames } = data;
  const name = userName || "there";
  const apps = appNames?.map(a => a.replace("safe", "Safe")).join(", ") || "Safe Family apps";

  switch (template) {
    case "trial_expiring":
      return {
        subject: `Your Safe Family trial ends in ${daysLeft || 3} days`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a2e; margin-bottom: 24px;">Your trial is ending soon</h1>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Hey ${name},
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Just a friendly heads up that your Safe Family trial ends in <strong>${daysLeft || 3} days</strong>.
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              If you've been enjoying ${apps}, I'd love to have you stay! Subscribing takes less than a minute, and your kids can keep using the apps without interruption.
            </p>

            <div style="margin: 32px 0; text-align: center;">
              <a href="https://getsafefamily.com/signup" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Keep Access →
              </a>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              If you have any questions or need help, just reply to this email.
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              — Jeremiah<br>
              <span style="color: #9ca3af;">Founder, Safe Family</span>
            </p>

            <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

            <p style="color: #9ca3af; font-size: 12px;">
              Safe Family · <a href="https://getsafefamily.com" style="color: #9ca3af;">getsafefamily.com</a>
            </p>
          </div>
        `,
      };

    case "trial_expired":
      return {
        subject: "We miss you at Safe Family",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a2e; margin-bottom: 24px;">Your trial has ended</h1>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Hey ${name},
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              I noticed your Safe Family trial ended recently. I hope you got a chance to try out ${apps}!
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              If things got busy (I totally get it with kids!), you can pick up right where you left off. All your settings and kid profiles are still there waiting.
            </p>

            <div style="margin: 32px 0; text-align: center;">
              <a href="https://getsafefamily.com/signup" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reactivate My Account →
              </a>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Was something missing or not working as expected? I'd genuinely love to hear your feedback — just reply to this email.
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              — Jeremiah<br>
              <span style="color: #9ca3af;">Founder, Safe Family</span>
            </p>

            <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

            <p style="color: #9ca3af; font-size: 12px;">
              Safe Family · <a href="https://getsafefamily.com" style="color: #9ca3af;">getsafefamily.com</a>
            </p>
          </div>
        `,
      };

    case "re_engagement":
      return {
        subject: "Still there? Your kids' content is waiting",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a2e; margin-bottom: 24px;">We haven't seen you in a while</h1>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Hey ${name},
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              I noticed you haven't been using ${apps} lately. Everything okay?
            </p>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              If you've been having any issues or if there's something that could work better for your family, I'm all ears. Safe Family is a small team and I personally read every reply.
            </p>

            <div style="margin: 32px 0; text-align: center;">
              <a href="https://getsafefamily.com" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Jump Back In →
              </a>
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              — Jeremiah<br>
              <span style="color: #9ca3af;">Founder, Safe Family</span>
            </p>

            <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

            <p style="color: #9ca3af; font-size: 12px;">
              Safe Family · <a href="https://getsafefamily.com" style="color: #9ca3af;">getsafefamily.com</a>
            </p>
          </div>
        `,
      };

    case "announcement":
      return {
        subject: data.subject || "News from Safe Family",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a2e; margin-bottom: 24px;">${data.subject || "News from Safe Family"}</h1>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Hey ${name},
            </p>

            <div style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              ${data.body || "We have some exciting news to share with you!"}
            </div>

            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 24px;">
              — Jeremiah<br>
              <span style="color: #9ca3af;">Founder, Safe Family</span>
            </p>

            <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

            <p style="color: #9ca3af; font-size: 12px;">
              Safe Family · <a href="https://getsafefamily.com" style="color: #9ca3af;">getsafefamily.com</a>
            </p>
          </div>
        `,
      };

    case "custom":
      return {
        subject: data.subject || "Message from Safe Family",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              ${data.body || ""}
            </div>

            <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;" />

            <p style="color: #9ca3af; font-size: 12px;">
              Safe Family · <a href="https://getsafefamily.com" style="color: #9ca3af;">getsafefamily.com</a>
            </p>
          </div>
        `,
      };

    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

export async function POST(req: Request) {
  // Auth check
  const session = await auth();
  if (!session?.user?.email || session.user.email !== "jedaws@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check Resend API key and get client
  const resendClient = getResend();
  if (!resendClient) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body: SendEmailRequest = await req.json();
    const { to, template, subject, body: emailBody } = body;

    // Validate required fields
    if (!to) {
      return NextResponse.json(
        { error: "Missing 'to' field" },
        { status: 400 }
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: "Missing 'template' field" },
        { status: 400 }
      );
    }

    // For custom template, require subject and body
    if (template === "custom" && (!subject || !emailBody)) {
      return NextResponse.json(
        { error: "Custom template requires 'subject' and 'body' fields" },
        { status: 400 }
      );
    }

    // Get email content from template
    const { subject: emailSubject, html } = getEmailContent(template, body);

    // Normalize recipients to array
    const recipients = Array.isArray(to) ? to : [to];

    // Send email(s)
    const results = await Promise.all(
      recipients.map(async (email) => {
        try {
          const result = await resendClient.emails.send({
            from: "Jeremiah from Safe Family <jeremiah@getsafefamily.com>",
            to: email,
            replyTo: "jeremiah@getsafefamily.com",
            subject: emailSubject,
            html,
          });

          console.log(`Email sent to ${email}:`, result);
          return { email, success: true, id: result.data?.id };
        } catch (error) {
          console.error(`Failed to send email to ${email}:`, error);
          return { email, success: false, error: String(error) };
        }
      })
    );

    // Check for failures
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Failed to send ${failures.length}/${recipients.length} emails`,
        results,
      });
    }

    // Log the action
    await logAdminAction({
      adminEmail: session.user.email,
      action: "send_email",
      targetEmail: recipients[0] || null,
      details: {
        template,
        to: recipients,
        subject: emailSubject,
        recipientCount: recipients.length,
        successCount: results.filter((r) => r.success).length,
      },
      request: req,
    });

    return NextResponse.json({
      success: true,
      message: `Sent ${recipients.length} email(s) successfully`,
      results,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to preview templates
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email || session.user.email !== "jedaws@gmail.com") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const template = url.searchParams.get("template") as TemplateType;
  const userName = url.searchParams.get("userName") || undefined;
  const daysLeft = url.searchParams.get("daysLeft")
    ? parseInt(url.searchParams.get("daysLeft")!)
    : undefined;

  if (!template) {
    // Return available templates
    return NextResponse.json({
      templates: [
        { id: "trial_expiring", name: "Trial Expiring", description: "Sent to users whose trial is about to expire" },
        { id: "trial_expired", name: "Trial Expired", description: "Sent to users whose trial has expired" },
        { id: "re_engagement", name: "Re-engagement", description: "Sent to inactive users" },
        { id: "announcement", name: "Announcement", description: "General announcement with custom subject/body" },
        { id: "custom", name: "Custom", description: "Fully custom subject and body" },
      ],
    });
  }

  try {
    const content = getEmailContent(template, {
      to: "preview@example.com",
      template,
      userName,
      daysLeft,
      appNames: ["safetunes", "safetube", "safereads"],
    });

    return NextResponse.json({
      template,
      ...content,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 400 }
    );
  }
}
