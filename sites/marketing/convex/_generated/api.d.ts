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
import type * as auth from "../auth.js";
import type * as authEndpoints from "../authEndpoints.js";
import type * as debugAuth from "../debugAuth.js";
import type * as emails from "../emails.js";
import type * as forceProvision from "../forceProvision.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as passwordReset from "../passwordReset.js";
import type * as signupInternal from "../signupInternal.js";
import type * as verifyCentralCredentials from "../verifyCentralCredentials.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  accounts: typeof accounts;
  auth: typeof auth;
  authEndpoints: typeof authEndpoints;
  debugAuth: typeof debugAuth;
  emails: typeof emails;
  forceProvision: typeof forceProvision;
  http: typeof http;
  migrations: typeof migrations;
  passwordReset: typeof passwordReset;
  signupInternal: typeof signupInternal;
  verifyCentralCredentials: typeof verifyCentralCredentials;
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
