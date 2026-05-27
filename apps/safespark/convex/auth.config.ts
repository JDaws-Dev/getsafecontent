// Convex ↔ Clerk integration. Convex actions/queries authenticate Bella's
// requests by verifying the Clerk-issued JWT. The Clerk app's JWT template
// must be named "convex" — Clerk dashboard → JWT Templates → New template.
// See https://docs.convex.dev/auth/clerk for the once-only setup.
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL ?? '',
      applicationID: 'convex',
    },
  ],
};

export default authConfig;
