// Dual-provider auth for the Clerk → Marketing Central migration window.
//
// Provider 1 (legacy): Clerk. Existing parents (jedaws + soonerjace) and
// any active sessions continue to authenticate via Clerk-issued JWTs.
// Their JWT template must be named "convex" on the Clerk side.
//
// Provider 2 (federated): Marketing Central. Convex Auth on
// adamant-crow-705 issues JWTs that Convex here verifies via the
// .well-known/jwks.json discovery endpoint on the same domain. Users
// authenticated through the new `/login` route send these JWTs and
// `ctx.auth.getUserIdentity()` returns identity with their Marketing
// user._id as `subject` and their email as `email`.
//
// `getActor()` in convex/actors.ts handles both subject formats:
// Clerk subjects (user_xxx) are matched against `users.clerkUserId`;
// Marketing subjects don't match anything in `users.clerkUserId` so
// the fallback path matches by `identity.email`.
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL ?? '',
      applicationID: 'convex',
    },
    {
      domain: 'https://adamant-crow-705.convex.site',
      applicationID: 'convex',
    },
  ],
};

export default authConfig;
