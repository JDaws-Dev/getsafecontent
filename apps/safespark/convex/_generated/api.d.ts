/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actors from "../actors.js";
import type * as crons from "../crons.js";
import type * as families from "../families.js";
import type * as http from "../http.js";
import type * as kidProfiles from "../kidProfiles.js";
import type * as kidSessions from "../kidSessions.js";
import type * as provisionUser from "../provisionUser.js";
import type * as provisionUserInternal from "../provisionUserInternal.js";
import type * as safespark from "../safespark.js";
import type * as sparkdb from "../sparkdb.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actors: typeof actors;
  crons: typeof crons;
  families: typeof families;
  http: typeof http;
  kidProfiles: typeof kidProfiles;
  kidSessions: typeof kidSessions;
  provisionUser: typeof provisionUser;
  provisionUserInternal: typeof provisionUserInternal;
  safespark: typeof safespark;
  sparkdb: typeof sparkdb;
  users: typeof users;
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
