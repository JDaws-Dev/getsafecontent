/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as admin from "../admin.js";
import type * as adminDashboard from "../adminDashboard.js";
import type * as analyses from "../analyses.js";
import type * as auth from "../auth.js";
import type * as books from "../books.js";
import type * as chat from "../chat.js";
import type * as coupons from "../coupons.js";
import type * as deleteUser from "../deleteUser.js";
import type * as emails from "../emails.js";
import type * as grantLifetime from "../grantLifetime.js";
import type * as http from "../http.js";
import type * as kids from "../kids.js";
import type * as lib_doesTheDogDie from "../lib/doesTheDogDie.js";
import type * as notes from "../notes.js";
import type * as reports from "../reports.js";
import type * as searchHistory from "../searchHistory.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";
import type * as wishlists from "../wishlists.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  admin: typeof admin;
  adminDashboard: typeof adminDashboard;
  analyses: typeof analyses;
  auth: typeof auth;
  books: typeof books;
  chat: typeof chat;
  coupons: typeof coupons;
  deleteUser: typeof deleteUser;
  emails: typeof emails;
  grantLifetime: typeof grantLifetime;
  http: typeof http;
  kids: typeof kids;
  "lib/doesTheDogDie": typeof lib_doesTheDogDie;
  notes: typeof notes;
  reports: typeof reports;
  searchHistory: typeof searchHistory;
  subscriptions: typeof subscriptions;
  users: typeof users;
  wishlists: typeof wishlists;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
