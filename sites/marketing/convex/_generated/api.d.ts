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
import type * as accounts from "../accounts.js";
import type * as admin from "../admin.js";
import type * as adminDashboard from "../adminDashboard.js";
import type * as analyses from "../analyses.js";
import type * as auth from "../auth.js";
import type * as books from "../books.js";
import type * as centralUsers from "../centralUsers.js";
import type * as chat from "../chat.js";
import type * as coupons from "../coupons.js";
import type * as createCentralUser from "../createCentralUser.js";
import type * as deleteUser from "../deleteUser.js";
import type * as emails from "../emails.js";
import type * as getCentralUser from "../getCentralUser.js";
import type * as grantLifetime from "../grantLifetime.js";
import type * as http from "../http.js";
import type * as httpRateLimit from "../httpRateLimit.js";
import type * as kids from "../kids.js";
import type * as lib_doesTheDogDie from "../lib/doesTheDogDie.js";
import type * as notes from "../notes.js";
import type * as passwordSync from "../passwordSync.js";
import type * as passwordSyncQueries from "../passwordSyncQueries.js";
import type * as provisionUser from "../provisionUser.js";
import type * as provisionUserInternal from "../provisionUserInternal.js";
import type * as reports from "../reports.js";
import type * as searchHistory from "../searchHistory.js";
import type * as setSubscriptionStatus from "../setSubscriptionStatus.js";
import type * as setupOnboarding from "../setupOnboarding.js";
import type * as subscriptions from "../subscriptions.js";
import type * as updateCentralPassword from "../updateCentralPassword.js";
import type * as updatePassword from "../updatePassword.js";
import type * as updatePasswordInternal from "../updatePasswordInternal.js";
import type * as users from "../users.js";
import type * as wishlists from "../wishlists.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  accounts: typeof accounts;
  admin: typeof admin;
  adminDashboard: typeof adminDashboard;
  analyses: typeof analyses;
  auth: typeof auth;
  books: typeof books;
  centralUsers: typeof centralUsers;
  chat: typeof chat;
  coupons: typeof coupons;
  createCentralUser: typeof createCentralUser;
  deleteUser: typeof deleteUser;
  emails: typeof emails;
  getCentralUser: typeof getCentralUser;
  grantLifetime: typeof grantLifetime;
  http: typeof http;
  httpRateLimit: typeof httpRateLimit;
  kids: typeof kids;
  "lib/doesTheDogDie": typeof lib_doesTheDogDie;
  notes: typeof notes;
  passwordSync: typeof passwordSync;
  passwordSyncQueries: typeof passwordSyncQueries;
  provisionUser: typeof provisionUser;
  provisionUserInternal: typeof provisionUserInternal;
  reports: typeof reports;
  searchHistory: typeof searchHistory;
  setSubscriptionStatus: typeof setSubscriptionStatus;
  setupOnboarding: typeof setupOnboarding;
  subscriptions: typeof subscriptions;
  updateCentralPassword: typeof updateCentralPassword;
  updatePassword: typeof updatePassword;
  updatePasswordInternal: typeof updatePasswordInternal;
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
