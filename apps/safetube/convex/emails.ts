"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

/**
 * Send notification emails when a new trial user signs up
 * This sends both admin notification and user welcome email
 */
export const sendTrialSignupEmails = action({
  args: {
    userEmail: v.string(),
    userName: v.string(),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

    // Send admin notification
    const adminEmailContent = `
      <h1>🎉 New SafeTube Trial Signup!</h1>

      <p>Someone just started a free trial for SafeTube.</p>

      <h2>Customer Details:</h2>
      <ul>
        <li><strong>Name:</strong> ${args.userName}</li>
        <li><strong>Email:</strong> ${args.userEmail}</li>
        <li><strong>Type:</strong> 7-Day Free Trial</li>
        <li><strong>Trial Ends:</strong> ${new Date(trialEndsAt).toLocaleDateString()}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>

      <p><a href="https://rightful-rabbit-333.convex.cloud/adminDashboard?key=safetube-admin-2024" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 0;">View Admin Dashboard →</a></p>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <p style="color: #6b7280; font-size: 14px;">You're receiving this because you're the admin of SafeTube.</p>
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
            <h1 style="color: #dc2626; margin: 0 0 8px 0; font-size: 28px;">SafeTube</h1>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Welcome to SafeTube!</p>
          </div>

          <!-- Main Content -->
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${args.userName}!</h2>

            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Your <strong>7-day free trial</strong> has started! You now have full access to SafeTube.
            </p>

            <p style="margin: 0 0 16px 0; font-size: 16px;">Here's what you can do:</p>

            <ul style="margin: 0 0 16px 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">✅ Approve YouTube channels for your kids</li>
              <li style="margin-bottom: 8px;">✅ Create separate profiles for each child</li>
              <li style="margin-bottom: 8px;">✅ Kids can ONLY watch approved content</li>
              <li style="margin-bottom: 8px;">✅ No YouTube algorithm or recommendations</li>
            </ul>

            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              Your trial ends on <strong>${new Date(trialEndsAt).toLocaleDateString()}</strong>.
              After that, it's just $4.99/month to keep your family protected.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://getsafetube.com/onboarding"
               style="display: inline-block; background: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Complete Setup →
            </a>
          </div>

          <!-- Getting Started Steps -->
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">
              <strong>Quick Start:</strong><br>
              1. Create kid profiles<br>
              2. Search and approve YouTube channels<br>
              3. Share your Family Code with kids<br>
              4. They can only watch what you approve!
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Questions? Just reply to this email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              The SafeTube Team
            </p>
          </div>

        </body>
      </html>
    `;

    const results = { admin: false, user: false };

    try {
      // Send admin notification
      const adminResult = await resend.emails.send({
        from: "SafeTube Admin <notifications@getsafetube.com>",
        to: process.env.ADMIN_EMAIL || 'jeremiah@getsafefamily.com',
        subject: `🎉 SafeTube Trial: ${args.userName}`,
        html: adminEmailContent,
      });
      console.log(`Admin notification sent for ${args.userEmail}:`, adminResult);
      results.admin = true;
    } catch (error) {
      console.error("Failed to send admin notification:", error);
    }

    try {
      // Send welcome email to user
      const userResult = await resend.emails.send({
        from: "SafeTube <noreply@getsafetube.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.userEmail,
        subject: "Welcome to SafeTube! Your 7-Day Trial Has Started 🎬",
        html: userEmailContent,
      });
      console.log(`Welcome email sent to ${args.userEmail}:`, userResult);
      results.user = true;
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }

    return { success: results.admin || results.user, results };
  },
});

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = action({
  args: {
    email: v.string(),
    resetUrl: v.string(),
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

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0 0 8px 0; font-size: 28px;">SafeTube</h1>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Password Reset Request</p>
          </div>

          <!-- Main Content -->
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Hi,</p>

            <p style="margin: 0 0 20px 0; font-size: 16px;">
              We received a request to reset your SafeTube password. Click the button below to create a new password:
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${args.resetUrl}"
                 style="display: inline-block; background: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>

            <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
              Or copy and paste this link into your browser:<br>
              <a href="${args.resetUrl}" style="color: #dc2626; word-break: break-all;">${args.resetUrl}</a>
            </p>
          </div>

          <!-- Security Notice -->
          <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #92400E;">
              <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Questions? Contact us at <a href="mailto:jeremiah@getsafefamily.com" style="color: #dc2626; text-decoration: none;">jeremiah@getsafefamily.com</a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              The SafeTube Team
            </p>
          </div>

        </body>
      </html>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTube <noreply@getsafetube.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.email,
        subject: "Reset Your SafeTube Password",
        html: emailContent,
      });

      console.log(`Password reset email sent to ${args.email}:`, result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send subscription confirmation email (when user pays)
 */
export const sendSubscriptionConfirmation = action({
  args: {
    email: v.string(),
    name: v.string(),
    subscriptionType: v.string(), // "trial" or "paid"
    trialEndsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject = args.subscriptionType === "trial"
      ? "Welcome to SafeTube! Your 7-Day Trial Has Started 🎬"
      : "Welcome to SafeTube! Your Subscription is Active 🎬";

    const emailContent = args.subscriptionType === "trial" ? `
      <h1>Welcome to SafeTube, ${args.name}!</h1>

      <p>Your 7-day free trial has started! You now have full access to:</p>

      <ul>
        <li>✅ Approve YouTube channels for your kids</li>
        <li>✅ Create separate profiles for each child</li>
        <li>✅ Kids can ONLY watch approved content</li>
        <li>✅ No YouTube algorithm or recommendations</li>
      </ul>

      <h2>What happens next?</h2>
      <p>Your trial ends on <strong>${new Date(args.trialEndsAt || Date.now()).toLocaleDateString()}</strong>.</p>
      <p>After that, you'll be charged $4.99/month. You can cancel anytime before then.</p>

      <h2>Get Started:</h2>
      <ol>
        <li>Create profiles for your kids</li>
        <li>Search and approve YouTube channels</li>
        <li>Share your Family Code with kids</li>
      </ol>

      <p><a href="https://getsafetube.com/onboarding" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">Complete Onboarding →</a></p>

      <p>Questions? Reply to this email or contact us at jeremiah@getsafefamily.com</p>

      <p>Thanks for choosing SafeTube!<br>The SafeTube Team</p>
    ` : `
      <h1>Welcome to SafeTube, ${args.name}!</h1>

      <p>Thanks for subscribing! Your payment of $4.99 has been processed successfully.</p>

      <p>You now have full access to SafeTube:</p>

      <ul>
        <li>✅ Unlimited YouTube channel approvals</li>
        <li>✅ Complete parental controls</li>
        <li>✅ Separate profiles for each child</li>
        <li>✅ No YouTube algorithm exposure</li>
      </ul>

      <h2>Subscription Details:</h2>
      <p><strong>Plan:</strong> SafeTube Monthly</p>
      <p><strong>Price:</strong> $4.99/month</p>
      <p><strong>Next billing date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>

      <p><a href="https://getsafetube.com/admin" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">Go to Dashboard →</a></p>

      <p>You can manage your subscription anytime from your account settings.</p>

      <p>Questions? Reply to this email or contact us at jeremiah@getsafefamily.com</p>

      <p>Thanks for choosing SafeTube!<br>The SafeTube Team</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTube <noreply@getsafetube.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.email,
        subject: subject,
        html: emailContent,
      });

      console.log(`Email sent to ${args.email}:`, result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send email:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send cancellation confirmation email
 */
export const sendCancellationConfirmation = action({
  args: {
    email: v.string(),
    name: v.string(),
    endsAt: v.number(),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailContent = `
      <h1>Subscription Cancelled</h1>

      <p>Hi ${args.name},</p>

      <p>We've received your cancellation request for SafeTube.</p>

      <h2>What this means:</h2>
      <ul>
        <li>✅ You'll keep full access until <strong>${new Date(args.endsAt).toLocaleDateString()}</strong></li>
        <li>✅ No further charges will be made</li>
        <li>✅ You can reactivate anytime before this date</li>
      </ul>

      <p>We're sorry to see you go! If there's anything we could improve, we'd love to hear from you.</p>

      <p><a href="https://getsafetube.com/admin" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">Reactivate Subscription →</a></p>

      <p>Thanks for trying SafeTube!<br>The SafeTube Team</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTube <noreply@getsafetube.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.email,
        subject: "Your SafeTube Subscription Has Been Cancelled",
        html: emailContent,
      });

      console.log(`Cancellation email sent to ${args.email}:`, result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send cancellation email:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send payment failed email
 */
export const sendPaymentFailedEmail = action({
  args: {
    email: v.string(),
    name: v.string(),
    amountDue: v.number(),
    nextAttempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailContent = `
      <h1>Payment Failed</h1>

      <p>Hi ${args.name},</p>

      <p>We tried to process your SafeTube subscription payment of $${(args.amountDue / 100).toFixed(2)}, but the payment failed.</p>

      <h2>What you need to do:</h2>
      <ol>
        <li>Update your payment method in your account settings</li>
        <li>Make sure your card has sufficient funds</li>
        <li>We'll automatically retry${args.nextAttempt ? ` on ${new Date(args.nextAttempt * 1000).toLocaleDateString()}` : ''}</li>
      </ol>

      <p><strong>To avoid losing access,</strong> please update your payment method as soon as possible.</p>

      <p><a href="https://getsafetube.com/admin" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">Update Payment Method →</a></p>

      <p>Questions? Reply to this email or contact us at jeremiah@getsafefamily.com</p>

      <p>The SafeTube Team</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTube <noreply@getsafetube.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.email,
        subject: "⚠️ Payment Failed - Action Required",
        html: emailContent,
      });

      console.log(`Payment failed email sent to ${args.email}:`, result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send payment failed email:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send admin notification when someone cancels their subscription
 * Includes their reason for cancelling
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

      <p>A user is cancelling their SafeTube subscription.</p>

      <h2>Customer Details:</h2>
      <ul>
        <li><strong>Name:</strong> ${args.userName}</li>
        <li><strong>Email:</strong> ${args.userEmail}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>

      <h2>Reason for Cancelling:</h2>
      <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-weight: bold;">${args.reason}</p>
        ${args.otherReason ? `<p style="margin: 8px 0 0 0; color: #92400E;">${args.otherReason}</p>` : ''}
      </div>

      <p>Consider reaching out to understand their experience better.</p>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <p style="color: #6b7280; font-size: 14px;">You're receiving this because you're the admin of SafeTube.</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTube Admin <notifications@getsafetube.com>",
        to: process.env.ADMIN_EMAIL || 'jeremiah@getsafefamily.com',
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
 * Send batched channel/video request notification email
 * This email summarizes multiple requests from kids to prevent spam
 */
export const sendBatchedRequestNotification = action({
  args: {
    userEmail: v.string(),
    userName: v.optional(v.string()),
    requests: v.array(v.object({
      kidName: v.string(),
      contentName: v.string(),
      channelName: v.optional(v.string()),
      itemType: v.string(), // "channel_request" | "video_request"
    })),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const requestCount = args.requests.length;
    const isMultiple = requestCount > 1;
    const greeting = args.userName ? `Hi ${args.userName}` : "Hi";

    // Group requests by kid for better readability
    const requestsByKid = args.requests.reduce((acc, req) => {
      if (!acc[req.kidName]) {
        acc[req.kidName] = [];
      }
      acc[req.kidName].push(req);
      return acc;
    }, {} as Record<string, typeof args.requests>);

    // Build request list HTML
    const requestListHTML = Object.entries(requestsByKid)
      .map(([kidName, kidRequests]) => {
        const items = kidRequests
          .map((req) => {
            const type = req.itemType === "channel_request" ? "Channel" : "Video";
            const channelInfo = req.channelName ? ` from ${req.channelName}` : '';
            return `<li style="margin-bottom: 8px;"><strong>${req.contentName}</strong>${channelInfo} <span style="color: #6b7280;">(${type})</span></li>`;
          })
          .join("");

        return `
          <div style="margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">${kidName} requested:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${items}
            </ul>
          </div>
        `;
      })
      .join("");

    try {
      const result = await resend.emails.send({
        from: "SafeTube <notifications@getsafetube.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.userEmail,
        subject: isMultiple
          ? `${requestCount} New YouTube Requests from Your Kids`
          : `New YouTube Request from ${args.requests[0].kidName}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

              <!-- Header -->
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #dc2626; margin: 0 0 8px 0; font-size: 28px;">SafeTube</h1>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">YouTube Request${isMultiple ? "s" : ""} Ready for Review</p>
              </div>

              <!-- Main Content -->
              <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 20px 0; font-size: 16px;">${greeting},</p>

                <p style="margin: 0 0 20px 0; font-size: 16px;">
                  ${isMultiple
                    ? `Your kids have submitted <strong>${requestCount} new YouTube requests</strong> for you to review.`
                    : `${args.requests[0].kidName} has submitted a new YouTube request for you to review.`
                  }
                </p>

                ${requestListHTML}
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://getsafetube.com/admin"
                   style="display: inline-block; background: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Review Request${isMultiple ? "s" : ""}
                </a>
              </div>

              <!-- Info Box -->
              <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #991b1b;">
                  <strong>Quick Tip:</strong> You can approve or deny each request directly from your admin dashboard. Preview any video before approving to make sure it's appropriate for your child.
                </p>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                  You're receiving this because you have request notifications enabled.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  <a href="https://getsafetube.com/admin/settings" style="color: #dc2626; text-decoration: none;">Manage notification preferences</a>
                </p>
              </div>

            </body>
          </html>
        `,
      });

      console.log(`Batched request notification sent to ${args.userEmail}:`, result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send batched request notification:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Send admin notification when someone signs up via Stripe
 */
export const sendAdminNotification = action({
  args: {
    userEmail: v.string(),
    userName: v.string(),
    subscriptionType: v.string(), // "trial" or "paid"
    subscriptionId: v.string(),
    stripeCustomerId: v.string(),
    amountPaid: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailContent = `
      <h1>🎉 New SafeTube Signup!</h1>

      <p>Someone just signed up for SafeTube.</p>

      <h2>Customer Details:</h2>
      <ul>
        <li><strong>Name:</strong> ${args.userName}</li>
        <li><strong>Email:</strong> ${args.userEmail}</li>
        <li><strong>Type:</strong> ${args.subscriptionType === 'trial' ? '7-Day Free Trial' : 'Paid Subscription'}</li>
        <li><strong>Amount:</strong> ${args.amountPaid ? `$${(args.amountPaid / 100).toFixed(2)}` : 'Free trial'}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>

      <h2>Stripe Details:</h2>
      <ul>
        <li><strong>Customer ID:</strong> ${args.stripeCustomerId}</li>
        <li><strong>Subscription ID:</strong> ${args.subscriptionId}</li>
      </ul>

      <p><a href="https://dashboard.stripe.com/customers/${args.stripeCustomerId}" style="background: #635BFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 8px 16px 0;">View in Stripe →</a></p>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <p style="color: #6b7280; font-size: 14px;">You're receiving this because you're the admin of SafeTube.</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTube Admin <notifications@getsafetube.com>",
        to: process.env.ADMIN_EMAIL || 'jeremiah@getsafefamily.com',
        subject: `🎉 New Signup: ${args.userName} (${args.subscriptionType})`,
        html: emailContent,
      });

      console.log(`Admin notification sent for ${args.userEmail}:`, result);
      return { success: true, id: result.data?.id };
    } catch (error) {
      console.error("Failed to send admin notification:", error);
      return { success: false, error: String(error) };
    }
  },
});
