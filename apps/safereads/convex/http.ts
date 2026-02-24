import { httpRouter } from "convex/server";
import { auth } from "./auth";
import grantLifetime from "./grantLifetime";
import setSubscriptionStatus from "./setSubscriptionStatus";
import deleteUser from "./deleteUser";
import adminDashboard from "./adminDashboard";
import setupOnboarding from "./setupOnboarding";
import provisionUser from "./provisionUser";
import getCentralUser from "./getCentralUser";
import createCentralUser from "./createCentralUser";
import updatePassword from "./updatePassword";
import updateCentralPassword from "./updateCentralPassword";
import verifyCentralCredentials from "./verifyCentralCredentials";
import migrateToCentralUsers from "./migrateToCentralUsers";
import exportUsersForMigration from "./exportUsersForMigration";
import migrateBetterAuthUser from "./migrateBetterAuthUser";

const http = httpRouter();

// Grant lifetime subscription route (admin)
http.route({
  path: "/grantLifetime",
  method: "GET",
  handler: grantLifetime,
});

// Set subscription status route (admin - for paid users)
http.route({
  path: "/setSubscriptionStatus",
  method: "GET",
  handler: setSubscriptionStatus,
});

// Delete user and all associated data route (admin)
http.route({
  path: "/deleteUser",
  method: "GET",
  handler: deleteUser,
});

// Admin dashboard route (GET for data, OPTIONS for CORS preflight)
http.route({
  path: "/adminDashboard",
  method: "GET",
  handler: adminDashboard,
});

http.route({
  path: "/adminDashboard",
  method: "OPTIONS",
  handler: adminDashboard,
});

// Setup onboarding route (creates kid profile from marketing site onboarding)
http.route({
  path: "/setupOnboarding",
  method: "GET",
  handler: setupOnboarding,
});

// Provision user route (creates user AND authAccounts entry for central auth)
http.route({
  path: "/provisionUser",
  method: "POST",
  handler: provisionUser,
});

// Get central user route (for marketing site webhook to look up passwordHash)
http.route({
  path: "/getCentralUser",
  method: "GET",
  handler: getCentralUser,
});

// Create central user route (for marketing site signup)
http.route({
  path: "/createCentralUser",
  method: "POST",
  handler: createCentralUser,
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

// Update central password route (for app -> central sync)
http.route({
  path: "/updateCentralPassword",
  method: "POST",
  handler: updateCentralPassword,
});

// Update central password CORS preflight
http.route({
  path: "/updateCentralPassword",
  method: "OPTIONS",
  handler: updateCentralPassword,
});

// Verify central credentials route (for apps to authenticate against central DB)
http.route({
  path: "/verifyCentralCredentials",
  method: "POST",
  handler: verifyCentralCredentials,
});

// Verify central credentials CORS preflight
http.route({
  path: "/verifyCentralCredentials",
  method: "OPTIONS",
  handler: verifyCentralCredentials,
});

// Migration route (one-time use to migrate existing users to centralUsers)
http.route({
  path: "/migrateToCentralUsers",
  method: "GET",
  handler: migrateToCentralUsers,
});

// Export users for migration (one-time use)
http.route({
  path: "/exportUsersForMigration",
  method: "GET",
  handler: exportUsersForMigration,
});

// Migrate BetterAuth user to centralUsers (one-time use)
http.route({
  path: "/migrateBetterAuthUser",
  method: "GET",
  handler: migrateBetterAuthUser,
});

auth.addHttpRoutes(http);

export default http;
