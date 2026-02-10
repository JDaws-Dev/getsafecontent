"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

/**
 * Send admin notification when a new user signs up for SafeReads
 */
export const sendTrialSignupNotification = action({
  args: {
    userEmail: v.string(),
    userName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

    const emailContent = `
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

    try {
      const result = await resend.emails.send({
        from: "SafeReads Admin <notifications@getsafereads.com>",
        to: process.env.ADMIN_EMAIL || "jeremiah@getsafefamily.com",
        subject: `🎉 SafeReads Trial: ${args.userName || args.userEmail}`,
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
        from: "SafeReads Admin <notifications@getsafereads.com>",
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
