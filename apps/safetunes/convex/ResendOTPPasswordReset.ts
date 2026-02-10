"use node";

import { Resend } from "resend";

/**
 * Generate a random 6-digit OTP code
 */
function generateOTP(): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return otp;
}

/**
 * Email provider for password reset OTP codes via Resend
 * Compatible with Convex Auth Password provider's reset option
 */
export const ResendOTPPasswordReset = {
  id: "resend-otp-password-reset",
  apiRoute: "/api/auth/resend-otp-password-reset",
  maxAge: 60 * 60, // 1 hour expiry
  async sendVerificationRequest({
    identifier: email,
    token,
    url,
  }: {
    identifier: string;
    token: string;
    url: string;
  }) {
    const resend = new Resend(process.env.RESEND_API_KEY);

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
            <h1 style="color: #7C3AED; margin: 0 0 8px 0; font-size: 28px;">SafeTunes</h1>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Password Reset Code</p>
          </div>

          <!-- Main Content -->
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Hi,</p>

            <p style="margin: 0 0 20px 0; font-size: 16px;">
              Use this code to reset your SafeTunes password:
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <div style="display: inline-block; background: #7C3AED; color: white; padding: 16px 32px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 4px;">
                ${token}
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
              Questions? Contact us at <a href="mailto:jeremiah@getsafefamily.com" style="color: #7C3AED; text-decoration: none;">jeremiah@getsafefamily.com</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              The SafeTunes Team
            </p>
          </div>

        </body>
      </html>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTunes <noreply@getsafetunes.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: email,
        subject: `Your SafeTunes Password Reset Code: ${token}`,
        html: emailContent,
      });

      console.log(`Password reset OTP email sent to ${email}:`, result);
    } catch (error) {
      console.error("Failed to send password reset OTP email:", error);
      throw error;
    }
  },
  generateVerificationToken() {
    // Generate a 6-digit numeric OTP code
    return generateOTP();
  },
};
