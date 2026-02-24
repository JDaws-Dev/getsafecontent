import { httpRouter } from "convex/server";
import adminDashboard from "./adminDashboard";
import stripeWebhook from "./stripe";
import setSubscriptionStatus from "./setSubscriptionStatus";
import provisionUser from "./provisionUser";
import updatePassword from "./updatePassword";
import deleteUser from "./deleteUser";
import setupOnboarding from "./setupOnboarding";
import createAuthAccountHttp from "./createAuthAccountHttp";
import exportUsersForMigration from "./exportUsersForMigration";
import { extensionAddVideo, extensionGetKids } from "./extensionApi";
import { auth } from "./auth";

const http = httpRouter();

// Admin dashboard route
http.route({
  path: "/adminDashboard",
  method: "GET",
  handler: adminDashboard,
});

// Admin dashboard CORS preflight
http.route({
  path: "/adminDashboard",
  method: "OPTIONS",
  handler: adminDashboard,
});

// Stripe webhook route
http.route({
  path: "/stripe",
  method: "POST",
  handler: stripeWebhook,
});

// Set subscription status (admin endpoint)
http.route({
  path: "/setSubscriptionStatus",
  method: "GET",
  handler: setSubscriptionStatus,
});

// Provision user with auth credentials (for unified auth from marketing site)
http.route({
  path: "/provisionUser",
  method: "POST",
  handler: provisionUser,
});

// Update password route (for password sync from central auth)
http.route({
  path: "/updatePassword",
  method: "POST",
  handler: updatePassword,
});

// Update password CORS preflight
http.route({
  path: "/updatePassword",
  method: "OPTIONS",
  handler: updatePassword,
});

// Delete user (admin endpoint)
http.route({
  path: "/deleteUser",
  method: "GET",
  handler: deleteUser,
});

// Create auth account for legacy users (admin)
http.route({
  path: "/createAuthAccount",
  method: "GET",
  handler: createAuthAccountHttp,
});

// Setup onboarding route (creates kid profile from marketing site onboarding)
http.route({
  path: "/setupOnboarding",
  method: "GET",
  handler: setupOnboarding,
});

// Chrome extension API routes
http.route({
  path: "/extension/add-video",
  method: "POST",
  handler: extensionAddVideo,
});

http.route({
  path: "/extension/add-video",
  method: "OPTIONS",
  handler: extensionAddVideo,
});

http.route({
  path: "/extension/get-kids",
  method: "GET",
  handler: extensionGetKids,
});

http.route({
  path: "/extension/get-kids",
  method: "OPTIONS",
  handler: extensionGetKids,
});

// Export users for migration (one-time use)
http.route({
  path: "/exportUsersForMigration",
  method: "GET",
  handler: exportUsersForMigration,
});

// Convex Auth routes
auth.addHttpRoutes(http);

export default http;
