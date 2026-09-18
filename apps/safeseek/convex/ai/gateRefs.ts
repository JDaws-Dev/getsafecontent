/**
 * Convex function references the safety gate needs.
 *
 * `ai/safetyGate.ts` is deliberately free of generated-API imports so it stays
 * a plain, testable helper. The bindings live here instead, in one place, so
 * every caller passes an identical set and nobody can wire a surface up with,
 * say, the concern-alert reference missing.
 */

import { internal } from "../_generated/api";

export const SAFETY_GATE_REFS = {
  intentCacheGet: internal.intentCache.get,
  intentCachePut: internal.intentCache.put,
  insertBlockedSearch: internal.searchQueries.insertBlockedSearch,
  recordConcernAlert: internal.searchQueries.recordConcernAlert,
  getRecentConcernBlocks: internal.searchQueries.getRecentConcernBlocks,
  getRecentQueriesForLoopCheck: internal.searchQueries.getRecentQueriesForLoopCheck,
  sendParentEmail: internal.concernAlerts.sendParentEmail,
  noteClassifierDegraded: internal.opsAlerts.noteClassifierDegraded,
  sendClassifierDownAlert: internal.opsAlerts.sendClassifierDownAlert,
};
