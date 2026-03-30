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
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as kidProfiles from "../kidProfiles.js";
import type * as research from "../research.js";
import type * as search from "../search.js";
import type * as searchCache from "../searchCache.js";
import type * as searchQueries from "../searchQueries.js";
import type * as timeLimits from "../timeLimits.js";
import type * as topicRequests from "../topicRequests.js";
import type * as users from "../users.js";
import type * as warmCache from "../warmCache.js";
import type * as wikipedia from "../wikipedia.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  emails: typeof emails;
  http: typeof http;
  kidProfiles: typeof kidProfiles;
  research: typeof research;
  search: typeof search;
  searchCache: typeof searchCache;
  searchQueries: typeof searchQueries;
  timeLimits: typeof timeLimits;
  topicRequests: typeof topicRequests;
  users: typeof users;
  warmCache: typeof warmCache;
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
