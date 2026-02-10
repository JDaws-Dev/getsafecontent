"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Internal action to send Expo push notification
export const sendExpoPushNotificationInternal = internalAction({
  args: {
    expoPushToken: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.object({
      url: v.optional(v.string()),
      type: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { expoPushToken, title, body, data } = args;

    // Validate Expo push token format
    if (!expoPushToken.startsWith("ExponentPushToken[") && !expoPushToken.startsWith("ExpoPushToken[")) {
      console.log("Invalid Expo push token format:", expoPushToken);
      return { success: false, reason: "invalid_token_format" };
    }

    const message = {
      to: expoPushToken,
      sound: "default" as const,
      title,
      body,
      data: data || {},
    };

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();

      if (result.data?.status === "ok") {
        console.log(`Push notification sent to ${expoPushToken.substring(0, 30)}...`);
        return { success: true };
      } else {
        console.log("Push notification error:", result);
        return { success: false, reason: result.data?.message || "unknown_error" };
      }
    } catch (error) {
      console.error("Error sending push notification:", error);
      return { success: false, reason: String(error) };
    }
  },
});

// Send push notification to a parent (when kid submits request)
export const notifyParentOfRequest = internalAction({
  args: {
    userId: v.id("users"),
    kidName: v.string(),
    contentName: v.string(),
    contentType: v.string(), // "album" or "song"
  },
  handler: async (ctx, args) => {
    // Get user's push token
    const user = await ctx.runQuery(api.users.getUser, { userId: args.userId });

    if (!user?.expoPushToken) {
      console.log(`No push token for user ${args.userId}`);
      return { success: false, reason: "no_push_token" };
    }

    const title = `${args.kidName} requested music`;
    const body = `${args.kidName} wants to add "${args.contentName}" to their library`;

    return await ctx.runAction(internal.expoPushNotifications.sendExpoPushNotificationInternal, {
      expoPushToken: user.expoPushToken,
      title,
      body,
      data: {
        url: "/app",
        type: "new_request",
      },
    });
  },
});

// Send push notification to a kid (when parent approves/denies request)
export const notifyKidOfReview = internalAction({
  args: {
    kidProfileId: v.id("kidProfiles"),
    contentName: v.string(),
    status: v.string(), // "approved" or "denied"
  },
  handler: async (ctx, args) => {
    // Get kid's push token
    const kid = await ctx.runQuery(api.kidProfiles.getKidProfile, { profileId: args.kidProfileId });

    if (!kid?.expoPushToken) {
      console.log(`No push token for kid ${args.kidProfileId}`);
      return { success: false, reason: "no_push_token" };
    }

    const isApproved = args.status === "approved";
    const title = isApproved ? "Request approved!" : "Request reviewed";
    const body = isApproved
      ? `"${args.contentName}" has been added to your library!`
      : `Your request for "${args.contentName}" wasn't approved`;

    return await ctx.runAction(internal.expoPushNotifications.sendExpoPushNotificationInternal, {
      expoPushToken: kid.expoPushToken,
      title,
      body,
      data: {
        url: isApproved ? "/app" : "/app",
        type: isApproved ? "request_approved" : "request_denied",
      },
    });
  },
});

// Test push notification (for debugging)
export const testExpoPushNotification = action({
  args: {
    expoPushToken: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.expoPushNotifications.sendExpoPushNotificationInternal, {
      expoPushToken: args.expoPushToken,
      title: "Test Notification",
      body: "Push notifications are working!",
      data: {
        url: "/app",
        type: "test",
      },
    });
  },
});
