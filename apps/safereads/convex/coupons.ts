import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Redeem a coupon code for the current user.
 * Returns success/failure with a message.
 */
export const redeemCoupon = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { success: false, message: "Not authenticated" };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Check if user already redeemed a coupon
    if (user.redeemedCoupon) {
      return {
        success: false,
        message: "You have already redeemed a coupon code",
      };
    }

    // Check if user already has an active subscription
    if (user.subscriptionStatus === "active") {
      return {
        success: false,
        message: "You already have an active subscription",
      };
    }

    // Look up the coupon code (case-insensitive)
    const normalizedCode = args.code.trim().toUpperCase();

    // Query without index first (index might not be built yet)
    const allCoupons = await ctx.db.query("couponCodes").collect();
    const coupon = allCoupons.find((c) => c.code === normalizedCode);

    if (!coupon) {
      return { success: false, message: "Invalid coupon code" };
    }

    if (!coupon.active) {
      return { success: false, message: "This coupon is no longer active" };
    }

    // Check usage limit
    if (
      coupon.usageLimit !== undefined &&
      coupon.usageCount >= coupon.usageLimit
    ) {
      return {
        success: false,
        message: "This coupon has reached its usage limit",
      };
    }

    // Apply the coupon based on type
    if (coupon.type === "lifetime") {
      // Grant lifetime pro access
      await ctx.db.patch(userId, {
        subscriptionStatus: "active",
        // No subscriptionCurrentPeriodEnd = never expires
        redeemedCoupon: normalizedCode,
      });
    } else if (coupon.type === "trial") {
      // Trial coupons could have a period end date
      // For now, just grant active status
      await ctx.db.patch(userId, {
        subscriptionStatus: "active",
        redeemedCoupon: normalizedCode,
      });
    }

    // Increment usage count
    await ctx.db.patch(coupon._id, {
      usageCount: coupon.usageCount + 1,
    });

    return {
      success: true,
      message:
        coupon.type === "lifetime"
          ? "Lifetime pro access activated!"
          : "Coupon redeemed successfully!",
    };
  },
});

/**
 * Check if a coupon code is valid (for UI feedback before submission).
 */
export const validateCoupon = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedCode = args.code.trim().toUpperCase();
    const allCoupons = await ctx.db.query("couponCodes").collect();
    const coupon = allCoupons.find((c) => c.code === normalizedCode);

    if (!coupon || !coupon.active) {
      return { valid: false };
    }

    if (
      coupon.usageLimit !== undefined &&
      coupon.usageCount >= coupon.usageLimit
    ) {
      return { valid: false };
    }

    return {
      valid: true,
      type: coupon.type,
      description: coupon.description,
    };
  },
});

/**
 * Get all coupon codes (admin only - for future admin page).
 */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("couponCodes").collect();
  },
});

/**
 * Seed a coupon code (idempotent - won't create duplicates).
 * Run via Convex dashboard or CLI.
 */
export const seedCoupon = mutation({
  args: {
    code: v.string(),
    type: v.union(v.literal("lifetime"), v.literal("trial")),
    usageLimit: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedCode = args.code.trim().toUpperCase();

    // Check if coupon already exists
    const allCoupons = await ctx.db.query("couponCodes").collect();
    const existing = allCoupons.find((c) => c.code === normalizedCode);

    if (existing) {
      return { created: false, message: "Coupon already exists", id: existing._id };
    }

    const id = await ctx.db.insert("couponCodes", {
      code: normalizedCode,
      type: args.type,
      usageLimit: args.usageLimit,
      usageCount: 0,
      active: true,
      description: args.description,
    });

    return { created: true, message: "Coupon created", id };
  },
});
