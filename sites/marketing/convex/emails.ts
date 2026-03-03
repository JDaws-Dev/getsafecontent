import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal action to send password reset emails via Resend API.
 *
 * Actions have proper access to process.env, unlike httpActions which
 * have bundling issues with certain env vars.
 */
export const sendPasswordResetEmail = internalAction({
  args: {
    email: v.string(),
    otp: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; emailId?: string; error?: string }> => {
    const { email, otp } = args;

    // Get API key from environment
    const apiKey = process.env.RESEND_API_KEY || process.env.RESEND_KEY;

    console.log(`[sendPasswordResetEmail] Sending to ${email}, API key exists: ${!!apiKey}, length: ${apiKey?.length}`);

    if (!apiKey) {
      console.error("[sendPasswordResetEmail] No Resend API key found in environment");
      return { success: false, error: "Email service not configured" };
    }

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a1a2e; margin: 0 0 8px 0; font-size: 28px;">Safe Family</h1>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Password Reset Code</p>
          </div>

          <!-- Main Content -->
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Hi,</p>

            <p style="margin: 0 0 20px 0; font-size: 16px;">
              Use this code to reset your Safe Family password:
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <div style="display: inline-block; background: #1a1a2e; color: white; padding: 16px 32px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 4px;">
                ${otp}
              </div>
            </div>

            <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280; text-align: center;">
              This code expires in 1 hour.
            </p>
          </div>

          <!-- Security Notice -->
          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #92400E;">
              <strong>Security Notice:</strong> If you didn't request a password reset, you can safely ignore this email. Someone may have entered your email by mistake.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Questions? Contact us at <a href="mailto:jeremiah@getsafefamily.com" style="color: #1a1a2e; text-decoration: none;">jeremiah@getsafefamily.com</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              The Safe Family Team
            </p>
          </div>

        </body>
      </html>
    `;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Safe Family <noreply@getsafefamily.com>",
          reply_to: "jeremiah@getsafefamily.com",
          to: email,
          subject: `Your Safe Family Password Reset Code: ${otp}`,
          html: emailContent,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.message || `HTTP ${response.status}`;
        console.error(`[sendPasswordResetEmail] Resend API error: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      console.log(`[sendPasswordResetEmail] Email sent successfully! ID: ${result.id}`);
      return { success: true, emailId: result.id };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[sendPasswordResetEmail] Exception: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  },
});
