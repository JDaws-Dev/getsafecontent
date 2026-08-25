/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as admin from "../admin.js";
import type * as adminDashboard from "../adminDashboard.js";
import type * as adminUserEmail from "../adminUserEmail.js";
import type * as analyses from "../analyses.js";
import type * as approvedBooks from "../approvedBooks.js";
import type * as bible from "../bible.js";
import type * as bloomBooks from "../bloomBooks.js";
import type * as bookCovers from "../bookCovers.js";
import type * as bookDash from "../bookDash.js";
import type * as bookRequests from "../bookRequests.js";
import type * as books from "../books.js";
import type * as chat from "../chat.js";
import type * as coupons from "../coupons.js";
import type * as crons from "../crons.js";
import type * as deleteUser from "../deleteUser.js";
import type * as emails from "../emails.js";
import type * as familyCodes from "../familyCodes.js";
import type * as freeBooks from "../freeBooks.js";
import type * as generateClassicCovers from "../generateClassicCovers.js";
import type * as grantLifetime from "../grantLifetime.js";
import type * as http from "../http.js";
import type * as httpRateLimit from "../httpRateLimit.js";
import type * as identity from "../identity.js";
import type * as kidPass from "../kidPass.js";
import type * as kidSearchHistory from "../kidSearchHistory.js";
import type * as kids from "../kids.js";
import type * as lib_doesTheDogDie from "../lib/doesTheDogDie.js";
import type * as librivox from "../librivox.js";
import type * as lit2go from "../lit2go.js";
import type * as notes from "../notes.js";
import type * as preApprovedBooks from "../preApprovedBooks.js";
import type * as provisionUser from "../provisionUser.js";
import type * as provisionUserInternal from "../provisionUserInternal.js";
import type * as readingProgress from "../readingProgress.js";
import type * as readingStreaks from "../readingStreaks.js";
import type * as recommendations from "../recommendations.js";
import type * as reports from "../reports.js";
import type * as safeAuth from "../safeAuth.js";
import type * as searchHistory from "../searchHistory.js";
import type * as setSubscriptionStatus from "../setSubscriptionStatus.js";
import type * as setupOnboarding from "../setupOnboarding.js";
import type * as sharedScreenTime from "../sharedScreenTime.js";
import type * as subscriptions from "../subscriptions.js";
import type * as syncFamilyCode from "../syncFamilyCode.js";
import type * as timeLimits from "../timeLimits.js";
import type * as trialExpiration from "../trialExpiration.js";
import type * as trialExpirationActions from "../trialExpirationActions.js";
import type * as userSync from "../userSync.js";
import type * as users from "../users.js";
import type * as wishlists from "../wishlists.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  admin: typeof admin;
  adminDashboard: typeof adminDashboard;
  adminUserEmail: typeof adminUserEmail;
  analyses: typeof analyses;
  approvedBooks: typeof approvedBooks;
  bible: typeof bible;
  bloomBooks: typeof bloomBooks;
  bookCovers: typeof bookCovers;
  bookDash: typeof bookDash;
  bookRequests: typeof bookRequests;
  books: typeof books;
  chat: typeof chat;
  coupons: typeof coupons;
  crons: typeof crons;
  deleteUser: typeof deleteUser;
  emails: typeof emails;
  familyCodes: typeof familyCodes;
  freeBooks: typeof freeBooks;
  generateClassicCovers: typeof generateClassicCovers;
  grantLifetime: typeof grantLifetime;
  http: typeof http;
  httpRateLimit: typeof httpRateLimit;
  identity: typeof identity;
  kidPass: typeof kidPass;
  kidSearchHistory: typeof kidSearchHistory;
  kids: typeof kids;
  "lib/doesTheDogDie": typeof lib_doesTheDogDie;
  librivox: typeof librivox;
  lit2go: typeof lit2go;
  notes: typeof notes;
  preApprovedBooks: typeof preApprovedBooks;
  provisionUser: typeof provisionUser;
  provisionUserInternal: typeof provisionUserInternal;
  readingProgress: typeof readingProgress;
  readingStreaks: typeof readingStreaks;
  recommendations: typeof recommendations;
  reports: typeof reports;
  safeAuth: typeof safeAuth;
  searchHistory: typeof searchHistory;
  setSubscriptionStatus: typeof setSubscriptionStatus;
  setupOnboarding: typeof setupOnboarding;
  sharedScreenTime: typeof sharedScreenTime;
  subscriptions: typeof subscriptions;
  syncFamilyCode: typeof syncFamilyCode;
  timeLimits: typeof timeLimits;
  trialExpiration: typeof trialExpiration;
  trialExpirationActions: typeof trialExpirationActions;
  userSync: typeof userSync;
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
