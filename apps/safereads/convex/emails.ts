"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Resend } from "resend";

/**
 * Send welcome email to a new user who just signed up for a trial
 */
export const sendWelcomeEmail = action({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
    const displayName = args.name || "there";

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #92400E; margin: 0 0 8px 0; font-size: 28px;">SafeReads</h1>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Welcome to SafeReads!</p>
          </div>

          <!-- Main Content -->
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${displayName}!</h2>

            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Your <strong>7-day free trial</strong> has started! You now have full access to SafeReads.
            </p>

            <p style="margin: 0 0 16px 0; font-size: 16px;">Here's what you can do:</p>

            <ul style="margin: 0 0 16px 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Search for any book and get an AI-powered content analysis</li>
              <li style="margin-bottom: 8px;">See detailed breakdowns of language, violence, sexual content, and more</li>
              <li style="margin-bottom: 8px;">Create kid profiles with age-appropriate reading levels</li>
              <li style="margin-bottom: 8px;">Build wishlists of parent-approved books</li>
            </ul>

            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              Your trial ends on <strong>${new Date(trialEndsAt).toLocaleDateString()}</strong>.
              After that, it's just $4.99/month to keep your family's reading safe.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://getsafereads.com/login"
               style="display: inline-block; background: #92400E; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Start Scanning Books
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Questions? Just reply to this email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              The SafeReads Team
            </p>
          </div>

        </body>
      </html>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeReads <noreply@getsafefamily.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.email,
        subject: "Welcome to SafeReads! Your 7-Day Trial Has Started",
        html: emailContent,
      });
      console.log(`Welcome email sent to ${args.email}:`, result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send admin notification when a new user signs up for SafeReads,
 * and also send the user a welcome email.
 */
export const sendTrialSignupNotification = action({
  args: {
    userEmail: v.string(),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

    const adminEmailContent = `
      <h1>🎉 New SafeReads Trial Signup!</h1>

      <p>Someone just started a free trial for SafeReads.</p>

      <h2>Customer Details:</h2>
      <ul>
        <li><strong>Name:</strong> ${args.userName || "Not provided"}</li>
        <li><strong>Email:</strong> ${args.userEmail}</li>
        <li><strong>Type:</strong> 7-Day Free Trial</li>
        <li><strong>Trial Ends:</strong> ${new Date(trialEndsAt).toLocaleDateString()}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>

      <p><a href="https://exuberant-puffin-838.convex.site/adminDashboard" style="background: #92400E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">View Admin Dashboard →</a></p>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <p style="color: #6b7280; font-size: 14px;">You're receiving this because you're the admin of SafeReads.</p>
    `;

    const results = { admin: false, user: false };

    // Send admin notification
    try {
      const adminResult = await resend.emails.send({
        from: "SafeReads Admin <notifications@getsafefamily.com>",
        to: process.env.ADMIN_EMAIL || "jeremiah@getsafefamily.com",
        subject: `🎉 SafeReads Trial: ${args.userName || args.userEmail}`,
        html: adminEmailContent,
      });

      console.log(`Admin notification sent for ${args.userEmail}:`, adminResult);
      results.admin = true;
    } catch (error) {
      console.error("Failed to send admin notification:", error);
    }

    // Send welcome email to user
    try {
      await ctx.runAction(internal.emails.sendWelcomeEmailInternal, {
        email: args.userEmail,
        name: args.userName,
      });
      results.user = true;
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }

    return { success: results.admin || results.user, results };
  },
});

/**
 * Internal version of sendWelcomeEmail (called from sendTrialSignupNotification)
 */
export const sendWelcomeEmailInternal = internalAction({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const displayName = args.name || "there";

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #92400E; margin: 0 0 8px 0; font-size: 28px;">SafeReads</h1>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Welcome to SafeReads!</p>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${displayName}!</h2>
            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Your <strong>7-day free trial</strong> has started! You now have full access to SafeReads.
            </p>
            <p style="margin: 0 0 16px 0; font-size: 16px;">Here's what you can do:</p>
            <ul style="margin: 0 0 16px 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Search for any book and get an AI-powered content analysis</li>
              <li style="margin-bottom: 8px;">See detailed breakdowns of language, violence, sexual content, and more</li>
              <li style="margin-bottom: 8px;">Create kid profiles with age-appropriate reading levels</li>
              <li style="margin-bottom: 8px;">Build wishlists of parent-approved books</li>
            </ul>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              Your trial ends on <strong>${new Date(trialEndsAt).toLocaleDateString()}</strong>.
              After that, it's just $4.99/month to keep your family's reading safe.
            </p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://getsafereads.com/login"
               style="display: inline-block; background: #92400E; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Start Scanning Books
            </a>
          </div>
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Questions? Just reply to this email.</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">The SafeReads Team</p>
          </div>
        </body>
      </html>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeReads <noreply@getsafefamily.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.email,
        subject: "Welcome to SafeReads! Your 7-Day Trial Has Started",
        html: emailContent,
      });
      console.log(`Welcome email sent to ${args.email}:`, result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send cancellation confirmation email to user
 */
export const sendCancellationConfirmation = action({
  args: {
    email: v.string(),
    name: v.string(),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const endsAtText = args.endsAt
      ? new Date(args.endsAt).toLocaleDateString()
      : "the end of your current billing period";

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #92400E; margin: 0 0 8px 0; font-size: 28px;">SafeReads</h1>
          </div>

          <!-- Main Content -->
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${args.name},</h2>

            <p style="margin: 0 0 16px 0; font-size: 16px;">
              We've received your cancellation request for SafeReads.
            </p>

            <h3 style="margin: 0 0 12px 0; color: #1f2937;">What this means:</h3>
            <ul style="margin: 0 0 16px 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">You'll keep full access until <strong>${endsAtText}</strong></li>
              <li style="margin-bottom: 8px;">No further charges will be made</li>
              <li style="margin-bottom: 8px;">All your book analyses, kid profiles, and wishlists are preserved</li>
              <li style="margin-bottom: 8px;">You can resubscribe anytime to restore full access instantly</li>
            </ul>

            <p style="margin: 0 0 16px 0; font-size: 16px;">
              We're sorry to see you go! If there's anything we could improve, we'd love to hear from you.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://getsafefamily.com/signup"
               style="display: inline-block; background: #92400E; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Resubscribe
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Thanks for trying SafeReads! Reply to this email if you have any questions.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              The SafeReads Team
            </p>
          </div>

        </body>
      </html>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeReads <noreply@getsafefamily.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.email,
        subject: "Your SafeReads Subscription Has Been Cancelled",
        html: emailContent,
      });

      console.log(`Cancellation confirmation sent to ${args.email}:`, result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send cancellation confirmation:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send admin notification when someone cancels their subscription
 */
export const sendCancellationReasonEmail = action({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    reason: v.string(),
    otherReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailContent = `
      <h1>Subscription Cancellation</h1>

      <p>A user is cancelling their SafeReads subscription.</p>

      <h2>Customer Details:</h2>
      <ul>
        <li><strong>Name:</strong> ${args.userName}</li>
        <li><strong>Email:</strong> ${args.userEmail}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>

      <h2>Reason for Cancelling:</h2>
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-weight: bold;">${args.reason}</p>
        ${args.otherReason ? `<p style="margin: 8px 0 0 0; color: #92400E;">${args.otherReason}</p>` : ""}
      </div>

      <p>Consider reaching out to understand their experience better.</p>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <p style="color: #6b7280; font-size: 14px;">You're receiving this because you're the admin of SafeReads.</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeReads Admin <notifications@getsafefamily.com>",
        to: process.env.ADMIN_EMAIL || "jeremiah@getsafefamily.com",
        subject: `Cancellation: ${args.userName} - ${args.reason}`,
        html: emailContent,
      });

      console.log(`Cancellation reason email sent for ${args.userEmail}:`, result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send cancellation reason email:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send trial expiring warning email (2 days before expiration)
 */
export const sendTrialExpiringWarning = internalAction({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #92400E; margin: 0 0 8px 0; font-size: 28px;">SafeReads</h1>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${args.name},</h2>
            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Your SafeReads free trial expires in <strong>2 days</strong>.
            </p>
            <p style="margin: 0 0 16px 0; font-size: 16px;">
              To keep your AI-powered book reviews, kid profiles, and wishlists active, subscribe for just <strong>$4.99/month</strong>.
            </p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">
              All your book analyses, kid profiles, and wishlists will be preserved when you subscribe.
            </p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://getsafefamily.com/signup" style="display: inline-block; background: #92400E; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Subscribe Now</a>
          </div>
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Questions? Reply to this email.</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">The SafeReads Team</p>
          </div>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 24px;">If you no longer wish to receive these emails, reply with "unsubscribe" and we'll remove you from future communications.</p>
        </body>
      </html>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeReads <noreply@getsafefamily.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.email,
        subject: "Your SafeReads trial expires in 2 days",
        html: emailContent,
      });
      console.log(`Trial warning email sent to ${args.email}:`, result);
      return { success: true, id: result.data?.id };
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
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #92400E; margin: 0 0 8px 0; font-size: 28px;">SafeReads</h1>
          </div>
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${args.name},</h2>
            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Your SafeReads free trial has ended.
            </p>
            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Don't worry — <strong>all your data is preserved</strong>. Your book analyses, kid profiles, and wishlists are waiting for you.
            </p>
            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Subscribe for just <strong>$4.99/month</strong> to restore full access instantly.
            </p>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://getsafefamily.com/signup" style="display: inline-block; background: #92400E; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Subscribe & Restore Access</a>
          </div>
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Questions? Reply to this email.</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">The SafeReads Team</p>
          </div>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 24px;">If you no longer wish to receive these emails, reply with "unsubscribe" and we'll remove you from future communications.</p>
        </body>
      </html>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeReads <noreply@getsafefamily.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.email,
        subject: "Your SafeReads trial has ended — your data is safe",
        html: emailContent,
      });
      console.log(`Trial expired email sent to ${args.email}:`, result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send trial expired email:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send admin summary of daily trial expiration activity
 */
export const sendAdminTrialExpirationSummary = internalAction({
  args: {
    expiredCount: v.number(),
    expiredEmails: v.array(v.string()),
    warningCount: v.number(),
    warningEmails: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const expiredList = args.expiredEmails.map((e) => `<li>${e}</li>`).join("");
    const warningList = args.warningEmails.map((e) => `<li>${e}</li>`).join("");

    const emailContent = `
      <h1>SafeReads Trial Expiration Summary</h1>
      <p>Daily trial check completed at ${new Date().toLocaleString()}.</p>

      ${args.expiredCount > 0 ? `
        <h2>Expired (${args.expiredCount})</h2>
        <p>These trials were set to "expired":</p>
        <ul>${expiredList}</ul>
      ` : ""}

      ${args.warningCount > 0 ? `
        <h2>Warning Sent (${args.warningCount})</h2>
        <p>These users received a 2-day warning email:</p>
        <ul>${warningList}</ul>
      ` : ""}

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #6b7280; font-size: 14px;">Automated daily trial check — SafeReads</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeReads Admin <notifications@getsafefamily.com>",
        to: process.env.ADMIN_EMAIL || "jeremiah@getsafefamily.com",
        subject: `SafeReads Trials: ${args.expiredCount} expired, ${args.warningCount} warnings`,
        html: emailContent,
      });
      console.log("Admin trial summary sent:", result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send admin trial summary:", error);
      return { success: false, error: String(error) };
    }
  },
});
