import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FAMILY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateFamilyCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += FAMILY_CODE_ALPHABET.charAt(
      Math.floor(Math.random() * FAMILY_CODE_ALPHABET.length),
    );
  }
  return code;
}

/**
 * Provision a SafeSpark user row from Marketing Central.
 *
 * Called by the /provisionUser HTTP action when a Safe Family subscription
 * grants access to SafeSpark (the "Family + Spark" tier). Marketing
 * Central is the source of truth for auth identity; this mutation creates
 * or updates the local SafeSpark user record keyed by email, mirrors
 * subscription state, and ensures the family code matches whatever code
 * the user has across the rest of the family.
 *
 * Mirrors the contract used by SafeReads/SafeStudy/SafeTunes/SafeTube.
 *
 * Coexists with `upsertFromClerk` during the Clerk → federated-auth
 * migration: a row created by Clerk (with clerkUserId set) can be
 * enhanced in place by this mutation when the same email is provisioned
 * from Marketing — subscription/familyCode get filled in, clerkUserId is
 * preserved so the user's existing sessions keep working.
 */
export const provisionUserInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.optional(v.union(v.string(), v.null())), // accepted but unused — auth is federated
    name: v.union(v.string(), v.null()),
    subscriptionStatus: v.string(),
    entitledToThisApp: v.boolean(),
    stripeCustomerId: v.union(v.string(), v.null()),
    subscriptionId: v.union(v.string(), v.null()),
    isOAuthUser: v.optional(v.boolean()), // accepted but unused
    familyCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`[provisionUser] Starting for ${args.email}`);

    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email.toLowerCase()))
      .first();

    // Map status to the schema's union. "inactive" means provisioned-but-not-entitled
    // (their subscription doesn't include SafeSpark) and the app should gate access accordingly.
    const validStatuses = [
      'trial', 'active', 'lifetime', 'cancelled', 'expired', 'inactive',
    ] as const;
    type Status = (typeof validStatuses)[number];
    const incoming = args.entitledToThisApp ? args.subscriptionStatus : 'inactive';
    const resolvedStatus: Status = (validStatuses as readonly string[]).includes(incoming)
      ? (incoming as Status)
      : 'active';

    let userId;
    let wasCreated = false;
    let familyCode: string;

    if (existingUser) {
      userId = existingUser._id;
      familyCode = existingUser.familyCode ?? args.familyCode ?? generateFamilyCode();

      const patch: Record<string, unknown> = {
        subscriptionStatus: resolvedStatus,
        subscriptionUpdatedAt: Date.now(),
        stripeCustomerId: args.stripeCustomerId ?? existingUser.stripeCustomerId,
        subscriptionId: args.subscriptionId ?? existingUser.subscriptionId,
        name: args.name ?? existingUser.name,
      };
      // Only patch familyCode if Marketing sent one and it differs from what we have
      if (args.familyCode && args.familyCode !== existingUser.familyCode) {
        patch.familyCode = args.familyCode;
        familyCode = args.familyCode;
      } else if (!existingUser.familyCode) {
        patch.familyCode = familyCode;
      }
      await ctx.db.patch(userId, patch);

      console.log(
        `[provisionUser] Updated existing user ${args.email} (status=${resolvedStatus}, familyCode=${familyCode})`,
      );
    } else {
      // No existing row — create a Marketing-provisioned user.
      familyCode = args.familyCode || generateFamilyCode();

      // Best-effort collision check on the generated family code.
      if (!args.familyCode) {
        let attempts = 0;
        while (attempts < 10) {
          const collision = await ctx.db
            .query('users')
            .withIndex('by_family_code', (q) => q.eq('familyCode', familyCode))
            .first();
          if (!collision) break;
          familyCode = generateFamilyCode();
          attempts++;
        }
      }

      // Synthetic clerkUserId distinguishes Marketing-provisioned rows from
      // real Clerk sessions (`user_xxx`). When the same user later signs in
      // via Clerk, upsertFromClerk will find the existing row by email and
      // overwrite this synthetic value with the real Clerk subject.
      const syntheticClerkUserId = `marketing:${args.email.toLowerCase()}`;

      userId = await ctx.db.insert('users', {
        clerkUserId: syntheticClerkUserId,
        email: args.email.toLowerCase(),
        name: args.name ?? undefined,
        // displayName defaults to name (Marketing) or the email local part —
        // upsertFromClerk overrides this once the user signs in via the
        // existing Clerk flow; later, the federated-auth flow will set it
        // from the central display name.
        displayName: args.name ?? args.email.split('@')[0],
        role: 'parent',
        subscriptionStatus: resolvedStatus,
        subscriptionUpdatedAt: Date.now(),
        stripeCustomerId: args.stripeCustomerId ?? undefined,
        subscriptionId: args.subscriptionId ?? undefined,
        familyCode,
        createdAt: Date.now(),
      });
      wasCreated = true;

      console.log(
        `[provisionUser] Created new user ${args.email} (familyCode=${familyCode}, status=${resolvedStatus})`,
      );
    }

    return {
      success: true,
      userId,
      familyCode,
      provisioned: wasCreated,
      updated: !wasCreated,
      authAccountCreated: false,
      authAccountUpdated: false,
      passwordConflict: false,
    };
  },
});
