import { httpRouter } from "convex/server";
import grantLifetime from "./grantLifetime";
import setSubscriptionStatus from "./setSubscriptionStatus";
import deleteUser from "./deleteUser";
import adminDashboard from "./adminDashboard";
import setupOnboarding from "./setupOnboarding";
import provisionUser from "./provisionUser";
import syncFamilyCode from "./syncFamilyCode";

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

// Provision user route (creates user for central auth)
http.route({
  path: "/provisionUser",
  method: "POST",
  handler: provisionUser,
});

// Sync family code route (admin - reads or sets familyCode by email)
http.route({
  path: "/syncFamilyCode",
  method: "GET",
  handler: syncFamilyCode,
});

export default http;
