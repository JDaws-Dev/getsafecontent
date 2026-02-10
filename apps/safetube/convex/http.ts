import { httpRouter } from "convex/server";
import adminDashboard from "./adminDashboard";
import stripeWebhook from "./stripe";
import setSubscriptionStatus from "./setSubscriptionStatus";
import deleteUser from "./deleteUser";
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

// Delete user (admin endpoint)
http.route({
  path: "/deleteUser",
  method: "GET",
  handler: deleteUser,
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

// Convex Auth routes
auth.addHttpRoutes(http);

export default http;
