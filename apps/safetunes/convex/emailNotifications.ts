import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Add a new music request to the email notification batch
 * This prevents spam by batching multiple requests within 15 minutes
 */
export const addRequestToBatch = mutation({
  args: {
    userId: v.id("users"),
    requestType: v.string(), // "album_request" | "song_request"
    requestId: v.string(), // ID stored as string to handle both album and song requests
    kidName: v.string(),
    contentName: v.string(),
    artistName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const BATCH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
    const THROTTLE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

    // Check if user has notification preference enabled
    const user = await ctx.db.get(args.userId);
    if (!user?.notifyOnRequest) {
      console.log(`User ${args.userId} has email notifications disabled`);
      return { batched: false, reason: "notifications_disabled" };
    }

    // Find existing batch for this user (new_requests type)
    const existingBatch = await ctx.db
      .query("emailNotificationBatch")
      .withIndex("by_user_and_type", (q) =>
        q.eq("userId", args.userId).eq("batchType", "new_requests")
      )
      .filter((q) => q.eq(q.field("emailSent"), false))
      .first();

    if (existingBatch) {
      // Add to existing batch
      const updatedItems = [
        ...existingBatch.pendingItems,
        {
          itemType: args.requestType,
          itemId: args.requestId,
          kidName: args.kidName,
          contentName: args.contentName,
          artistName: args.artistName,
          requestedAt: now,
        },
      ];

      await ctx.db.patch(existingBatch._id, {
        pendingItems: updatedItems,
      });

      console.log(`Added request to existing batch ${existingBatch._id}. Total items: ${updatedItems.length}`);
      return { batched: true, batchId: existingBatch._id, itemCount: updatedItems.length };
    }

    // Check throttling - has an email been sent in the last hour?
    const recentBatch = await ctx.db
      .query("emailNotificationBatch")
      .withIndex("by_user_and_type", (q) =>
        q.eq("userId", args.userId).eq("batchType", "new_requests")
      )
      .filter((q) => q.eq(q.field("emailSent"), true))
      .order("desc")
      .first();

    let shouldSendAt = now + BATCH_WINDOW_MS; // Default: send in 15 minutes

    if (recentBatch?.sentAt && now - recentBatch.sentAt < THROTTLE_WINDOW_MS) {
      // Last email was sent less than 1 hour ago - extend the delay
      const timeSinceLastEmail = now - recentBatch.sentAt;
      const remainingThrottle = THROTTLE_WINDOW_MS - timeSinceLastEmail;
      shouldSendAt = now + Math.max(BATCH_WINDOW_MS, remainingThrottle);

      console.log(`Throttling applied. Last email sent ${Math.round(timeSinceLastEmail / 1000 / 60)} min ago. Delaying email by ${Math.round(remainingThrottle / 1000 / 60)} min.`);
    }

    // Create new batch
    const batchId = await ctx.db.insert("emailNotificationBatch", {
      userId: args.userId,
      batchType: "new_requests",
      pendingItems: [
        {
          itemType: args.requestType,
          itemId: args.requestId,
          kidName: args.kidName,
          contentName: args.contentName,
          artistName: args.artistName,
          requestedAt: now,
        },
      ],
      firstRequestAt: now,
      lastEmailSentAt: recentBatch?.sentAt,
      shouldSendAt,
      emailSent: false,
    });

    console.log(`Created new batch ${batchId}. Will send at ${new Date(shouldSendAt).toISOString()}`);
    return { batched: true, batchId, itemCount: 1 };
  },
});

/**
 * Get all batches ready to be sent (internal use by scheduled function)
 */
export const getBatchesReadyToSend = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const readyBatches = await ctx.db
      .query("emailNotificationBatch")
      .withIndex("by_email_sent", (q) => q.eq("emailSent", false))
      .filter((q) => q.lte(q.field("shouldSendAt"), now))
      .collect();

    return readyBatches;
  },
});

/**
 * Mark a batch as sent (internal use after email is delivered)
 */
export const markBatchAsSent = internalMutation({
  args: {
    batchId: v.id("emailNotificationBatch"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.batchId, {
      emailSent: true,
      sentAt: Date.now(),
    });
  },
});

/**
 * Get pending batches for a user (for admin dashboard visibility)
 */
export const getPendingBatchesForUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const batches = await ctx.db
      .query("emailNotificationBatch")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("emailSent"), false))
      .collect();

    return batches;
  },
});

/**
 * Process email batches ready to send (called by cron job)
 */
export const processEmailBatches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find batches ready to send
    const readyBatches = await ctx.db
      .query("emailNotificationBatch")
      .withIndex("by_email_sent", (q) => q.eq("emailSent", false))
      .filter((q) => q.lte(q.field("shouldSendAt"), now))
      .collect();

    console.log(`Found ${readyBatches.length} batches ready to send`);

    let successCount = 0;
    let errorCount = 0;

    for (const batch of readyBatches) {
      try {
        // Get user info
        const user = await ctx.db.get(batch.userId);
        if (!user || !user.email) {
          console.error(`User not found for batch ${batch._id}`);
          errorCount++;
          continue;
        }

        // Check if user still has notifications enabled
        if (!user.notifyOnRequest) {
          console.log(`User ${user.email} has disabled notifications, skipping batch ${batch._id}`);
          // Mark as sent to prevent re-processing
          await ctx.db.patch(batch._id, {
            emailSent: true,
            sentAt: now,
          });
          continue;
        }

        // Prepare request data for email
        const requests = batch.pendingItems.map((item) => ({
          kidName: item.kidName,
          contentName: item.contentName,
          artistName: item.artistName,
          itemType: item.itemType,
        }));

        // Schedule email action (actions can't be called directly from mutations)
        await ctx.scheduler.runAfter(0, internal.emails.sendBatchedRequestNotification, {
          userEmail: user.email,
          userName: user.name,
          requests,
        });

        // Mark batch as sent
        await ctx.db.patch(batch._id, {
          emailSent: true,
          sentAt: now,
        });

        console.log(`Scheduled email for batch ${batch._id} to ${user.email} (${requests.length} requests)`);
        successCount++;
      } catch (error) {
        console.error(`Error processing batch ${batch._id}:`, error);
        errorCount++;
      }
    }

    console.log(`Processed ${readyBatches.length} batches: ${successCount} success, ${errorCount} errors`);
    return { totalBatches: readyBatches.length, successCount, errorCount };
  },
});

/**
 * Clean up old sent batches (run periodically to prevent database bloat)
 */
export const cleanupOldBatches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const oldBatches = await ctx.db
      .query("emailNotificationBatch")
      .withIndex("by_email_sent", (q) => q.eq("emailSent", true))
      .filter((q) => q.lte(q.field("sentAt"), thirtyDaysAgo))
      .collect();

    for (const batch of oldBatches) {
      await ctx.db.delete(batch._id);
    }

    console.log(`Cleaned up ${oldBatches.length} old email batches`);
    return { deletedCount: oldBatches.length };
  },
});
