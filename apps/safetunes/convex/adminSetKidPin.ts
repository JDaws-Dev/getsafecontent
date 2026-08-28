import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { hashPin } from "./safeAuth";

/**
 * Operator tool: set (or clear) a kid profile's PIN.
 *
 * Exists because an unlocked sibling profile is a complete bypass of every
 * per-kid control. All the safety state — repeat-search detection, the
 * concern-rephrase guard, daily query budget, and the family screen-time cap —
 * is keyed on kidProfileId, so a child who is capped or blocked on their own
 * profile can switch to an unlocked sibling and reset all of it in one tap.
 *
 * internalMutation: the public `updateKidProfile` already requires a parent
 * token, and this must not become a second, weaker way in. Stores a PBKDF2
 * hash via the shared helper — never plaintext.
 */
export const setKidPin = internalMutation({
  args: {
    profileId: v.id("kidProfiles"),
    pin: v.string(), // 4 digits, or "" to remove
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("kid profile not found");

    if (args.pin !== "" && !/^\d{4}$/.test(args.pin)) {
      throw new Error("PIN must be exactly 4 digits");
    }

    await ctx.db.patch(args.profileId, {
      pin: args.pin === "" ? undefined : await hashPin(args.pin),
      pinFailedAttempts: undefined,
      pinLockedUntil: undefined,
    });

    return { profile: profile.name, pinSet: args.pin !== "" };
  },
});
