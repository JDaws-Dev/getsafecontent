import { httpRouter } from "convex/server";
import stripe from "./stripe";
import adminDashboard from "./adminDashboard";
import grantLifetime from "./grantLifetime";
import setSubscriptionStatus from "./setSubscriptionStatus";
import checkUserMusic from "./checkUserMusic";
import toggleArtwork from "./toggleArtwork";
import deleteTestUsers from "./deleteTestUsers";
import deleteUserHttpAction from "./deleteUserHttpAction";
import setupOnboarding from "./setupOnboarding";
import provisionUser from "./provisionUser";
import { auth } from "./auth";

const http = httpRouter();

// Admin dashboard route - must be before auth routes
// Supports both GET (data) and OPTIONS (CORS preflight)
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

// Grant lifetime subscription route
http.route({
  path: "/grantLifetime",
  method: "GET",
  handler: grantLifetime,
});

// Set subscription status route (for paying customers)
http.route({
  path: "/setSubscriptionStatus",
  method: "GET",
  handler: setSubscriptionStatus,
});

// Check user music library route
http.route({
  path: "/checkUserMusic",
  method: "GET",
  handler: checkUserMusic,
});

// Toggle artwork route
http.route({
  path: "/toggleArtwork",
  method: "GET",
  handler: toggleArtwork,
});

// Delete test users route
http.route({
  path: "/deleteTestUsers",
  method: "GET",
  handler: deleteTestUsers,
});

// Delete user route (admin - deletes user and all associated data)
http.route({
  path: "/deleteUser",
  method: "GET",
  handler: deleteUserHttpAction,
});

// Setup onboarding route (creates kid profile from marketing site onboarding)
http.route({
  path: "/setupOnboarding",
  method: "GET",
  handler: setupOnboarding,
});

// Provision user route (creates user with auth credentials from central auth)
http.route({
  path: "/provisionUser",
  method: "POST",
  handler: provisionUser,
});

// Provision user CORS preflight
http.route({
  path: "/provisionUser",
  method: "OPTIONS",
  handler: provisionUser,
});

// Stripe webhook route
http.route({
  path: "/stripe",
  method: "POST",
  handler: stripe,
});

// Convex Auth routes
auth.addHttpRoutes(http);

export default http;
