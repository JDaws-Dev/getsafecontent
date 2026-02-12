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
import type * as ai_channelReview from "../ai/channelReview.js";
import type * as auth from "../auth.js";
import type * as channelRequests from "../channelRequests.js";
import type * as channels from "../channels.js";
import type * as deleteUser from "../deleteUser.js";
import type * as emails from "../emails.js";
import type * as extensionApi from "../extensionApi.js";
import type * as grantLifetime from "../grantLifetime.js";
import type * as http from "../http.js";
import type * as kidPlaylists from "../kidPlaylists.js";
import type * as kidProfiles from "../kidProfiles.js";
import type * as provisionUser from "../provisionUser.js";
import type * as setSubscriptionStatus from "../setSubscriptionStatus.js";
import type * as setupOnboarding from "../setupOnboarding.js";
import type * as stripe from "../stripe.js";
import type * as stripeActions from "../stripeActions.js";
import type * as subscriptionEvents from "../subscriptionEvents.js";
import type * as timeLimits from "../timeLimits.js";
import type * as userSync from "../userSync.js";
import type * as users from "../users.js";
import type * as videoRequests from "../videoRequests.js";
import type * as videos from "../videos.js";
import type * as watchHistory from "../watchHistory.js";
import type * as youtubeCache from "../youtubeCache.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  admin: typeof admin;
  adminDashboard: typeof adminDashboard;
  "ai/channelReview": typeof ai_channelReview;
  auth: typeof auth;
  channelRequests: typeof channelRequests;
  channels: typeof channels;
  deleteUser: typeof deleteUser;
  emails: typeof emails;
  extensionApi: typeof extensionApi;
  grantLifetime: typeof grantLifetime;
  http: typeof http;
  kidPlaylists: typeof kidPlaylists;
  kidProfiles: typeof kidProfiles;
  provisionUser: typeof provisionUser;
  setSubscriptionStatus: typeof setSubscriptionStatus;
  setupOnboarding: typeof setupOnboarding;
  stripe: typeof stripe;
  stripeActions: typeof stripeActions;
  subscriptionEvents: typeof subscriptionEvents;
  timeLimits: typeof timeLimits;
  userSync: typeof userSync;
  users: typeof users;
  videoRequests: typeof videoRequests;
  videos: typeof videos;
  watchHistory: typeof watchHistory;
  youtubeCache: typeof youtubeCache;
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
