import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

export default convexAuthNextjsMiddleware();

export const config = {
  // Only run middleware on the /api/auth route (Convex Auth proxy)
  matcher: ["/api/auth"],
};
