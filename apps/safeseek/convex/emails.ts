"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

/**
 * Send notification emails when a new trial user signs up
 * Sends both admin notification and user welcome email
 */
export const sendTrialSignupEmails = internalAction({
  args: {
    userEmail: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

    // Send admin notification
    const adminEmailContent = `
      <h1>New SafeStudy Trial Signup!</h1>

      <p>Someone just started a free trial for SafeStudy.</p>

      <h2>Customer Details:</h2>
      <ul>
        <li><strong>Name:</strong> ${args.userName}</li>
        <li><strong>Email:</strong> ${args.userEmail}</li>
        <li><strong>Type:</strong> 7-Day Free Trial</li>
        <li><strong>Trial Ends:</strong> ${new Date(trialEndsAt).toLocaleDateString()}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <p style="color: #6b7280; font-size: 14px;">You're receiving this because you're the admin of SafeStudy.</p>
    `;

    // Send welcome email to user
    const userEmailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin: 0 0 8px 0; font-size: 28px;">SafeStudy</h1>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Welcome to SafeStudy!</p>
          </div>

          <!-- Main Content -->
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${args.userName}!</h2>

            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Your <strong>7-day free trial</strong> has started! You now have full access to SafeStudy.
            </p>

            <p style="margin: 0 0 16px 0; font-size: 16px;">Here's what you can do:</p>

            <ul style="margin: 0 0 16px 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">AI-powered kid-safe seek results</li>
              <li style="margin-bottom: 8px;">Create separate profiles for each child</li>
              <li style="margin-bottom: 8px;">Set age-appropriate content strictness levels</li>
              <li style="margin-bottom: 8px;">Block specific topics you don't want searched</li>
              <li style="margin-bottom: 8px;">View search history and blocked attempts</li>
            </ul>

            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              Your trial ends on <strong>${new Date(trialEndsAt).toLocaleDateString()}</strong>.
              After that, it's just $4.99/month to keep your family protected.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://getsafestudy.com"
               style="display: inline-block; background: #7c3aed; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Get Started
            </a>
          </div>

          <!-- Getting Started Steps -->
          <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #5b21b6;">
              <strong>Quick Start:</strong><br>
              1. Create kid profiles with age ranges<br>
              2. Set content strictness and blocked topics<br>
              3. Share your Family Code with kids<br>
              4. They search safely with AI protection!
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Questions? Just reply to this email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              The SafeStudy Team
            </p>
          </div>

        </body>
      </html>
    `;

    const results = { admin: false, user: false };

    try {
      // Send admin notification
      const adminResult = await resend.emails.send({
        from: "SafeStudy Admin <notifications@getsafefamily.com>",
        to: process.env.ADMIN_EMAIL || 'jeremiah@getsafefamily.com',
        subject: `New SafeStudy Trial: ${args.userName}`,
        html: adminEmailContent,
      });
      console.log("[sendTrialSignupEmails] Admin notification sent successfully");
      results.admin = true;
    } catch (error) {
      console.error("Failed to send admin notification:", error);
    }

    try {
      // Send welcome email to user
      const userResult = await resend.emails.send({
        from: "SafeStudy <noreply@getsafefamily.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.userEmail,
        subject: "Welcome to SafeStudy! Your 7-Day Trial Has Started",
        html: userEmailContent,
      });
      console.log("[sendTrialSignupEmails] Welcome email sent successfully");
      results.user = true;
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }

    return { success: results.admin || results.user, results };
  },
});

/**
 * Send trial expiring warning email (2 days before expiration)
 */
export const sendTrialExpiringWarning = internalAction({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    trialEndsAt: v.number(),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin: 0 0 8px 0; font-size: 28px;">SafeStudy</h1>
          </div>

          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${args.userName}!</h2>

            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Your SafeStudy free trial ends on <strong>${new Date(args.trialEndsAt).toLocaleDateString()}</strong> (in 2 days).
            </p>

            <p style="margin: 0 0 16px 0; font-size: 16px;">
              To keep your kids searching safely, upgrade to a paid plan for just <strong>$4.99/month</strong>.
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="https://getsafestudy.com/login"
                 style="display: inline-block; background: #7c3aed; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Upgrade Now
              </a>
            </div>

            <p style="margin: 16px 0 0 0; font-size: 14px; color: #6b7280;">
              If you choose not to upgrade, your kids will lose access to SafeStudy when the trial ends.
            </p>
          </div>

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Questions? Just reply to this email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              The SafeStudy Team
            </p>
          </div>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 24px;">If you no longer wish to receive these emails, reply with "unsubscribe" and we'll remove you from future communications.</p>

        </body>
      </html>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeStudy <noreply@getsafefamily.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.userEmail,
        subject: "Your SafeStudy trial ends in 2 days",
        html: emailContent,
      });
      console.log("[sendTrialExpiringWarning] Trial warning email sent successfully");
      return { success: true };
    } catch (error) {
      console.error("Failed to send trial warning email:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send trial expired email
 */
export const sendTrialExpiredEmail = internalAction({
  args: {
    userEmail: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin: 0 0 8px 0; font-size: 28px;">SafeStudy</h1>
          </div>

          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${args.userName},</h2>

            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Your SafeStudy free trial has ended. Your kids no longer have access to safe, AI-powered search.
            </p>

            <p style="margin: 0 0 16px 0; font-size: 16px;">
              You can reactivate anytime for just <strong>$4.99/month</strong> and pick up right where you left off - all your kid profiles and settings are saved.
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="https://getsafestudy.com/login"
                 style="display: inline-block; background: #7c3aed; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reactivate SafeStudy
              </a>
            </div>
          </div>

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Questions? Just reply to this email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              The SafeStudy Team
            </p>
          </div>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 24px;">If you no longer wish to receive these emails, reply with "unsubscribe" and we'll remove you from future communications.</p>

        </body>
      </html>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeStudy <noreply@getsafefamily.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.userEmail,
        subject: "Your SafeStudy trial has ended",
        html: emailContent,
      });
      console.log("[sendTrialExpiredEmail] Trial expired email sent successfully");
      return { success: true };
    } catch (error) {
      console.error("Failed to send trial expired email:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send admin summary of trial expirations
 */
export const sendAdminTrialExpirationSummary = internalAction({
  args: {
    expiredUsers: v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
    })),
    warningUsers: v.array(v.object({
      email: v.string(),
      name: v.optional(v.string()),
      trialEndsAt: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const totalActions = args.expiredUsers.length + args.warningUsers.length;
    if (totalActions === 0) return { success: true, skipped: true };

    const emailContent = `
      <h1>SafeStudy Trial Expiration Summary</h1>
      <p>Daily trial expiration cron ran at ${new Date().toLocaleString()}</p>

      ${args.expiredUsers.length > 0 ? `
        <h2>Expired (${args.expiredUsers.length} users)</h2>
        <ul>
          ${args.expiredUsers.map(u => `<li>${u.name || 'No name'} (${u.email})</li>`).join('')}
        </ul>
      ` : ''}

      ${args.warningUsers.length > 0 ? `
        <h2>Warning Sent (${args.warningUsers.length} users)</h2>
        <ul>
          ${args.warningUsers.map(u => `<li>${u.name || 'No name'} (${u.email}) - expires ${new Date(u.trialEndsAt).toLocaleDateString()}</li>`).join('')}
        </ul>
      ` : ''}

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #6b7280; font-size: 14px;">SafeStudy Admin Notification</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeStudy Admin <notifications@getsafefamily.com>",
        to: process.env.ADMIN_EMAIL || 'jeremiah@getsafefamily.com',
        subject: `SafeStudy Trials: ${args.expiredUsers.length} expired, ${args.warningUsers.length} warned`,
        html: emailContent,
      });
      console.log("Admin trial summary sent:", result);
      return { success: true };
    } catch (error) {
      console.error("Failed to send admin trial summary:", error);
      return { success: false, error: String(error) };
    }
  },
});
