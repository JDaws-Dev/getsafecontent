/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as ai_inputFilter from "../ai/inputFilter.js";
import type * as ai_intentClassifier from "../ai/intentClassifier.js";
import type * as ai_loopDetector from "../ai/loopDetector.js";
import type * as concernAlertQueries from "../concernAlertQueries.js";
import type * as concernAlerts from "../concernAlerts.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as intentCache from "../intentCache.js";
import type * as kidPass from "../kidPass.js";
import type * as kidProfiles from "../kidProfiles.js";
import type * as lib_cascadeDelete from "../lib/cascadeDelete.js";
import type * as lib_utils from "../lib/utils.js";
import type * as opsAlerts from "../opsAlerts.js";
import type * as orphanDetection from "../orphanDetection.js";
import type * as rateLimit from "../rateLimit.js";
import type * as research from "../research.js";
import type * as safeAuth from "../safeAuth.js";
import type * as search from "../search.js";
import type * as searchCache from "../searchCache.js";
import type * as searchQueries from "../searchQueries.js";
import type * as stripe from "../stripe.js";
import type * as stripeActions from "../stripeActions.js";
import type * as syncFamilyCode from "../syncFamilyCode.js";
import type * as timeLimits from "../timeLimits.js";
import type * as topicRequests from "../topicRequests.js";
import type * as trialExpiration from "../trialExpiration.js";
import type * as trialExpirationQueries from "../trialExpirationQueries.js";
import type * as tutor from "../tutor.js";
import type * as tutorSessions from "../tutorSessions.js";
import type * as userSync from "../userSync.js";
import type * as users from "../users.js";
import type * as warmCache from "../warmCache.js";
import type * as weeklyDigest from "../weeklyDigest.js";
import type * as weeklyDigestQueries from "../weeklyDigestQueries.js";
import type * as wikipedia from "../wikipedia.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "ai/inputFilter": typeof ai_inputFilter;
  "ai/intentClassifier": typeof ai_intentClassifier;
  "ai/loopDetector": typeof ai_loopDetector;
  concernAlertQueries: typeof concernAlertQueries;
  concernAlerts: typeof concernAlerts;
  crons: typeof crons;
  emails: typeof emails;
  http: typeof http;
  identity: typeof identity;
  intentCache: typeof intentCache;
  kidPass: typeof kidPass;
  kidProfiles: typeof kidProfiles;
  "lib/cascadeDelete": typeof lib_cascadeDelete;
  "lib/utils": typeof lib_utils;
  opsAlerts: typeof opsAlerts;
  orphanDetection: typeof orphanDetection;
  rateLimit: typeof rateLimit;
  research: typeof research;
  safeAuth: typeof safeAuth;
  search: typeof search;
  searchCache: typeof searchCache;
  searchQueries: typeof searchQueries;
  stripe: typeof stripe;
  stripeActions: typeof stripeActions;
  syncFamilyCode: typeof syncFamilyCode;
  timeLimits: typeof timeLimits;
  topicRequests: typeof topicRequests;
  trialExpiration: typeof trialExpiration;
  trialExpirationQueries: typeof trialExpirationQueries;
  tutor: typeof tutor;
  tutorSessions: typeof tutorSessions;
  userSync: typeof userSync;
  users: typeof users;
  warmCache: typeof warmCache;
  weeklyDigest: typeof weeklyDigest;
  weeklyDigestQueries: typeof weeklyDigestQueries;
  wikipedia: typeof wikipedia;
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
