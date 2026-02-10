"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import webpush from "web-push";

// Internal action to send push notification (called from request mutations via scheduler)
export const sendPushNotificationInternal = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get all subscriptions for this user
    const subscriptions = await ctx.runQuery(api.pushSubscriptions.getSubscriptions, {
      userId: args.userId,
    });

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions for user ${args.userId}`);
      return { success: false, reason: "no_subscriptions" };
    }

    // Get VAPID keys from environment
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:hello@getsafetunes.com";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return { success: false, reason: "vapid_not_configured" };
    }

    // Configure web-push
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url || "/",
      tag: args.tag || "safetunes-request",
    });

    const results = [];

    for (const subscription of subscriptions) {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);

        // Update last used timestamp
        await ctx.runMutation(api.pushSubscriptions.updateLastUsed, {
          subscriptionId: subscription._id,
        });

        results.push({ endpoint: subscription.endpoint, success: true });
        console.log(`Push notification sent to ${subscription.endpoint.substring(0, 50)}...`);
      } catch (error: unknown) {
        const err = error as { statusCode?: number; message?: string };
        console.error("Push notification error:", err.message);

        // If subscription is expired or invalid (410 Gone, 404 Not Found), remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await ctx.runMutation(api.pushSubscriptions.removeInvalidSubscription, {
            subscriptionId: subscription._id,
          });
          console.log(`Removed expired subscription ${subscription._id}`);
        }

        results.push({
          endpoint: subscription.endpoint,
          success: false,
          reason: err.message || String(error),
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Push notifications: ${successCount}/${results.length} sent successfully`);

    return { success: successCount > 0, results };
  },
});

// Public action for testing push notifications
export const testPushNotification = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.pushNotifications.sendPushNotificationInternal, {
      userId: args.userId,
      title: "Test Notification",
      body: "Push notifications are working!",
      url: "/",
      tag: "test",
    });
  },
});
