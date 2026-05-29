// Marketing Central is SafeSpark's sole identity provider as of 2026-05-28.
// Convex verifies incoming JWTs against the .well-known/jwks.json endpoint
// on adamant-crow-705; `ctx.auth.getUserIdentity()` returns the marketing
// user._id as `subject` and the email as `email`. `getActor()` in
// convex/actors.ts resolves the SafeSpark user row by matching that email
// against `users.email`.
//
// Kid sessions don't go through this provider — they pass `sessionToken`
// as a query arg and `resolveSafeSparkIdentity` looks them up directly
// from the `kidSessions` table (no JWT involved).
//
// The Clerk provider entry that used to be here was removed when Clerk
// was retired; existing Clerk users were migrated to Marketing Central
// via password-reset email + /login flow.
const authConfig = {
  providers: [
    {
      domain: 'https://adamant-crow-705.convex.site',
      applicationID: 'convex',
    },
  ],
};

export default authConfig;
