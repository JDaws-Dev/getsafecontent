"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Send subscription confirmation email
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
      ? "Welcome to SafeTunes! Your 7-Day Trial Has Started 🎵"
      : "Welcome to SafeTunes! Your Subscription is Active 🎵";

    const emailContent = args.subscriptionType === "trial" ? `
      <h1>Welcome to SafeTunes, ${args.name}!</h1>

      <p>Your 7-day free trial has started! You now have full access to:</p>

      <ul>
        <li>✅ Curated music library for kids</li>
        <li>✅ Parental controls and content filtering</li>
        <li>✅ Custom playlists for each child</li>
        <li>✅ Request & approval system</li>
      </ul>

      <h2>What happens next?</h2>
      <p>Your trial ends on <strong>${new Date(args.trialEndsAt || Date.now()).toLocaleDateString()}</strong>.</p>
      <p>After that, you'll be charged $4.99/month. You can cancel anytime before then.</p>

      <h2>Get Started:</h2>
      <ol>
        <li>Connect your Apple Music account</li>
        <li>Create profiles for your kids</li>
        <li>Start approving music they'll love!</li>
      </ol>

      <p><a href="https://getsafetunes.com/onboarding" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">Complete Onboarding →</a></p>

      <p>Questions? Reply to this email or contact us at ${process.env.SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}</p>

      <p>Thanks for choosing SafeTunes!<br>The SafeTunes Team</p>
    ` : `
      <h1>Welcome to SafeTunes, ${args.name}!</h1>

      <p>Thanks for subscribing! Your payment of $4.99 has been processed successfully.</p>

      <p>You now have full access to SafeTunes:</p>

      <ul>
        <li>✅ Unlimited curated music for your kids</li>
        <li>✅ Complete parental controls</li>
        <li>✅ Custom playlists and profiles</li>
        <li>✅ Request & approval system</li>
      </ul>

      <h2>Subscription Details:</h2>
      <p><strong>Plan:</strong> SafeTunes Monthly</p>
      <p><strong>Price:</strong> $4.99/month</p>
      <p><strong>Next billing date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>

      <h2>Get Started:</h2>
      <ol>
        <li>Connect your Apple Music account</li>
        <li>Create profiles for your kids</li>
        <li>Start approving music they'll love!</li>
      </ol>

      <p><a href="https://getsafetunes.com/admin" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">Go to Dashboard →</a></p>

      <p>You can manage your subscription anytime from your account settings.</p>

      <p>Questions? Reply to this email or contact us at ${process.env.SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}</p>

      <p>Thanks for choosing SafeTunes!<br>The SafeTunes Team</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTunes <noreply@getsafetunes.com>",
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

// Send cancellation confirmation email
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

      <p>We've received your cancellation request for SafeTunes.</p>

      <h2>What this means:</h2>
      <ul>
        <li>✅ You'll keep full access until <strong>${new Date(args.endsAt).toLocaleDateString()}</strong></li>
        <li>✅ No further charges will be made</li>
        <li>✅ You can reactivate anytime before this date</li>
      </ul>

      <p>We're sorry to see you go! If there's anything we could improve, we'd love to hear from you.</p>

      <p><a href="https://getsafetunes.com/admin" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">Reactivate Subscription →</a></p>

      <p>Thanks for trying SafeTunes!<br>The SafeTunes Team</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTunes <noreply@getsafetunes.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.email,
        subject: "Your SafeTunes Subscription Has Been Cancelled",
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

// Send payment failed email
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

      <p>We tried to process your SafeTunes subscription payment of $${(args.amountDue / 100).toFixed(2)}, but the payment failed.</p>

      <h2>What you need to do:</h2>
      <ol>
        <li>Update your payment method in your account settings</li>
        <li>Make sure your card has sufficient funds</li>
        <li>We'll automatically retry${args.nextAttempt ? ` on ${new Date(args.nextAttempt * 1000).toLocaleDateString()}` : ''}</li>
      </ol>

      <p><strong>To avoid losing access,</strong> please update your payment method as soon as possible.</p>

      <p><a href="https://getsafetunes.com/admin" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 16px;">Update Payment Method →</a></p>

      <p>Questions? Reply to this email or contact us at ${process.env.SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}</p>

      <p>The SafeTunes Team</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTunes <noreply@getsafetunes.com>",
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

// Send admin notification when someone signs up
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
      <h1>🎉 New SafeTunes Signup!</h1>

      <p>Someone just signed up for SafeTunes.</p>

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

      <p><a href="https://formal-chihuahua-623.convex.cloud/deployment/data/users?query=${encodeURIComponent(args.userEmail)}" style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin: 16px 8px 16px 0;">View in Convex →</a></p>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <p style="color: #6b7280; font-size: 14px;">You're receiving this because you're the admin of SafeTunes.</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTunes Admin <notifications@getsafetunes.com>",
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

// Send password reset email
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
            <h1 style="color: #7C3AED; margin: 0 0 8px 0; font-size: 28px;">SafeTunes</h1>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Password Reset Request</p>
          </div>

          <!-- Main Content -->
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Hi,</p>

            <p style="margin: 0 0 20px 0; font-size: 16px;">
              We received a request to reset your SafeTunes password. Click the button below to create a new password:
            </p>

            <div style="text-align: center; margin: 24px 0;">
              <a href="${args.resetUrl}"
                 style="display: inline-block; background: #7C3AED; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Reset Password
              </a>
            </div>

            <p style="margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
              Or copy and paste this link into your browser:<br>
              <a href="${args.resetUrl}" style="color: #7C3AED; word-break: break-all;">${args.resetUrl}</a>
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
              Questions? Contact us at <a href="mailto:${process.env.SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}" style="color: #7C3AED; text-decoration: none;">${process.env.SUPPORT_EMAIL || 'jeremiah@getsafefamily.com'}</a>
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
        to: args.email,
        subject: "Reset Your SafeTunes Password",
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

      <p>A user is cancelling their SafeTunes subscription.</p>

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

      <p style="color: #6b7280; font-size: 14px;">You're receiving this because you're the admin of SafeTunes.</p>
    `;

    try {
      const result = await resend.emails.send({
        from: "SafeTunes Admin <notifications@getsafetunes.com>",
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
 * Send batched music request notification email
 * This email summarizes multiple requests from kids to prevent spam
 */
export const sendBatchedRequestNotification = action({
  args: {
    userEmail: v.string(),
    userName: v.optional(v.string()),
    requests: v.array(v.object({
      kidName: v.string(),
      contentName: v.string(),
      artistName: v.string(),
      itemType: v.string(), // "album_request" | "song_request"
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
            const type = req.itemType === "album_request" ? "Album" : "Song";
            return `<li style="margin-bottom: 8px;"><strong>${req.contentName}</strong> by ${req.artistName} <span style="color: #6b7280;">(${type})</span></li>`;
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
        from: "SafeTunes <notifications@getsafetunes.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.userEmail,
        subject: isMultiple
          ? `${requestCount} New Music Requests from Your Kids`
          : `New Music Request from ${args.requests[0].kidName}`,
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
                <h1 style="color: #7C3AED; margin: 0 0 8px 0; font-size: 28px;">SafeTunes</h1>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">Music Request${isMultiple ? "s" : ""} Ready for Review</p>
              </div>

              <!-- Main Content -->
              <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 20px 0; font-size: 16px;">${greeting},</p>

                <p style="margin: 0 0 20px 0; font-size: 16px;">
                  ${isMultiple
                    ? `Your kids have submitted <strong>${requestCount} new music requests</strong> for you to review.`
                    : `${args.requests[0].kidName} has submitted a new music request for you to review.`
                  }
                </p>

                ${requestListHTML}
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="https://getsafetunes.com/admin"
                   style="display: inline-block; background: #7C3AED; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Review Request${isMultiple ? "s" : ""}
                </a>
              </div>

              <!-- Info Box -->
              <div style="background: #EEF2FF; border-left: 4px solid #7C3AED; padding: 16px; margin-bottom: 24px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #4c1d95;">
                  <strong>Quick Tip:</strong> You can approve, deny, or preview each request directly from your admin dashboard. Denied requests include an option to leave a note explaining why.
                </p>
              </div>

              <!-- Footer -->
              <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                  You're receiving this because you have "New Music Requests" notifications enabled.
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  <a href="https://getsafetunes.com/admin/settings" style="color: #7C3AED; text-decoration: none;">Manage notification preferences</a>
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
 * Send notification emails when a new trial user signs up (no Stripe required)
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
      <h1>🎉 New SafeTunes Trial Signup!</h1>

      <p>Someone just started a free trial for SafeTunes.</p>

      <h2>Customer Details:</h2>
      <ul>
        <li><strong>Name:</strong> ${args.userName}</li>
        <li><strong>Email:</strong> ${args.userEmail}</li>
        <li><strong>Type:</strong> 7-Day Free Trial</li>
        <li><strong>Trial Ends:</strong> ${new Date(trialEndsAt).toLocaleDateString()}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>

      <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />

      <p style="color: #6b7280; font-size: 14px;">You're receiving this because you're the admin of SafeTunes.</p>
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
            <h1 style="color: #7C3AED; margin: 0 0 8px 0; font-size: 28px;">SafeTunes</h1>
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Welcome to SafeTunes!</p>
          </div>

          <!-- Main Content -->
          <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; color: #1f2937;">Hi ${args.userName}!</h2>

            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Your <strong>7-day free trial</strong> has started! You now have full access to SafeTunes.
            </p>

            <p style="margin: 0 0 16px 0; font-size: 16px;">Here's what you can do:</p>

            <ul style="margin: 0 0 16px 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">✅ Approve albums for your kids to listen to</li>
              <li style="margin-bottom: 8px;">✅ Hide inappropriate album artwork</li>
              <li style="margin-bottom: 8px;">✅ Get notified when kids search for unapproved content</li>
              <li style="margin-bottom: 8px;">✅ Create separate profiles for each child</li>
            </ul>

            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              Your trial ends on <strong>${new Date(trialEndsAt).toLocaleDateString()}</strong>.
              After that, it's just $4.99/month to keep your family protected.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://getsafetunes.com/onboarding"
               style="display: inline-block; background: #7C3AED; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Complete Setup →
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
              Questions? Just reply to this email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              The SafeTunes Team
            </p>
          </div>

        </body>
      </html>
    `;

    const results = { admin: false, user: false };

    try {
      // Send admin notification
      const adminResult = await resend.emails.send({
        from: "SafeTunes Admin <notifications@getsafetunes.com>",
        to: process.env.ADMIN_EMAIL || 'jeremiah@getsafefamily.com',
        subject: `🎉 New Trial: ${args.userName}`,
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
        from: "SafeTunes <noreply@getsafetunes.com>",
        replyTo: "jeremiah@getsafefamily.com",
        to: args.userEmail,
        subject: "Welcome to SafeTunes! Your 7-Day Trial Has Started 🎵",
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
