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
import type * as ai_aiSearch from "../ai/aiSearch.js";
import type * as ai_contentReview from "../ai/contentReview.js";
import type * as ai_lyrics from "../ai/lyrics.js";
import type * as ai_recommendations from "../ai/recommendations.js";
import type * as albumRequests from "../albumRequests.js";
import type * as albums from "../albums.js";
import type * as auth from "../auth.js";
import type * as blockedSearches from "../blockedSearches.js";
import type * as checkAllUsers from "../checkAllUsers.js";
import type * as checkClaire from "../checkClaire.js";
import type * as checkUserMusic from "../checkUserMusic.js";
import type * as checkUserMusicInternal from "../checkUserMusicInternal.js";
import type * as cleanupKids from "../cleanupKids.js";
import type * as cleanupStarWars from "../cleanupStarWars.js";
import type * as crons from "../crons.js";
import type * as databaseStats from "../databaseStats.js";
import type * as debug from "../debug.js";
import type * as debugUsers from "../debugUsers.js";
import type * as deleteTestUsers from "../deleteTestUsers.js";
import type * as deleteTestUsersInternal from "../deleteTestUsersInternal.js";
import type * as deleteUser from "../deleteUser.js";
import type * as deleteUserHttpAction from "../deleteUserHttpAction.js";
import type * as discovery from "../discovery.js";
import type * as emailNotifications from "../emailNotifications.js";
import type * as emails from "../emails.js";
import type * as expoPushNotifications from "../expoPushNotifications.js";
import type * as expoPushTokens from "../expoPushTokens.js";
import type * as featured from "../featured.js";
import type * as featuredPlaylists from "../featuredPlaylists.js";
import type * as findBrokenIds from "../findBrokenIds.js";
import type * as findKidById from "../findKidById.js";
import type * as findKids from "../findKids.js";
import type * as findUserById from "../findUserById.js";
import type * as fixNullKidProfile from "../fixNullKidProfile.js";
import type * as fixNullKids from "../fixNullKids.js";
import type * as getAllApprovedSongs from "../getAllApprovedSongs.js";
import type * as grantLifetime from "../grantLifetime.js";
import type * as http from "../http.js";
import type * as kidProfiles from "../kidProfiles.js";
import type * as kidRequests from "../kidRequests.js";
import type * as listeningStats from "../listeningStats.js";
import type * as migrations from "../migrations.js";
import type * as migrations_fixFamiliesData from "../migrations/fixFamiliesData.js";
import type * as playlists from "../playlists.js";
import type * as preApprovedContent from "../preApprovedContent.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as pushSubscriptions from "../pushSubscriptions.js";
import type * as rateLimit from "../rateLimit.js";
import type * as recentlyPlayed from "../recentlyPlayed.js";
import type * as setSubscriptionStatus from "../setSubscriptionStatus.js";
import type * as songRequests from "../songRequests.js";
import type * as songs from "../songs.js";
import type * as stripe from "../stripe.js";
import type * as stripeActions from "../stripeActions.js";
import type * as subscriptionEvents from "../subscriptionEvents.js";
import type * as testHelpers from "../testHelpers.js";
import type * as timeControls from "../timeControls.js";
import type * as toggleArtwork from "../toggleArtwork.js";
import type * as toggleArtworkInternal from "../toggleArtworkInternal.js";
import type * as updateSubscriptionEndDate from "../updateSubscriptionEndDate.js";
import type * as userSync from "../userSync.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  admin: typeof admin;
  adminDashboard: typeof adminDashboard;
  "ai/aiSearch": typeof ai_aiSearch;
  "ai/contentReview": typeof ai_contentReview;
  "ai/lyrics": typeof ai_lyrics;
  "ai/recommendations": typeof ai_recommendations;
  albumRequests: typeof albumRequests;
  albums: typeof albums;
  auth: typeof auth;
  blockedSearches: typeof blockedSearches;
  checkAllUsers: typeof checkAllUsers;
  checkClaire: typeof checkClaire;
  checkUserMusic: typeof checkUserMusic;
  checkUserMusicInternal: typeof checkUserMusicInternal;
  cleanupKids: typeof cleanupKids;
  cleanupStarWars: typeof cleanupStarWars;
  crons: typeof crons;
  databaseStats: typeof databaseStats;
  debug: typeof debug;
  debugUsers: typeof debugUsers;
  deleteTestUsers: typeof deleteTestUsers;
  deleteTestUsersInternal: typeof deleteTestUsersInternal;
  deleteUser: typeof deleteUser;
  deleteUserHttpAction: typeof deleteUserHttpAction;
  discovery: typeof discovery;
  emailNotifications: typeof emailNotifications;
  emails: typeof emails;
  expoPushNotifications: typeof expoPushNotifications;
  expoPushTokens: typeof expoPushTokens;
  featured: typeof featured;
  featuredPlaylists: typeof featuredPlaylists;
  findBrokenIds: typeof findBrokenIds;
  findKidById: typeof findKidById;
  findKids: typeof findKids;
  findUserById: typeof findUserById;
  fixNullKidProfile: typeof fixNullKidProfile;
  fixNullKids: typeof fixNullKids;
  getAllApprovedSongs: typeof getAllApprovedSongs;
  grantLifetime: typeof grantLifetime;
  http: typeof http;
  kidProfiles: typeof kidProfiles;
  kidRequests: typeof kidRequests;
  listeningStats: typeof listeningStats;
  migrations: typeof migrations;
  "migrations/fixFamiliesData": typeof migrations_fixFamiliesData;
  playlists: typeof playlists;
  preApprovedContent: typeof preApprovedContent;
  pushNotifications: typeof pushNotifications;
  pushSubscriptions: typeof pushSubscriptions;
  rateLimit: typeof rateLimit;
  recentlyPlayed: typeof recentlyPlayed;
  setSubscriptionStatus: typeof setSubscriptionStatus;
  songRequests: typeof songRequests;
  songs: typeof songs;
  stripe: typeof stripe;
  stripeActions: typeof stripeActions;
  subscriptionEvents: typeof subscriptionEvents;
  testHelpers: typeof testHelpers;
  timeControls: typeof timeControls;
  toggleArtwork: typeof toggleArtwork;
  toggleArtworkInternal: typeof toggleArtworkInternal;
  updateSubscriptionEndDate: typeof updateSubscriptionEndDate;
  userSync: typeof userSync;
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
