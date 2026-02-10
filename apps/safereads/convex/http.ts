import { httpRouter } from "convex/server";
import { auth } from "./auth";
import grantLifetime from "./grantLifetime";
import deleteUser from "./deleteUser";
import adminDashboard from "./adminDashboard";

const http = httpRouter();

// Grant lifetime subscription route (admin)
http.route({
  path: "/grantLifetime",
  method: "GET",
  handler: grantLifetime,
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

auth.addHttpRoutes(http);

export default http;
