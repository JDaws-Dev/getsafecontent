# Safe Family — Unified Login & Family Code

> Status: **PROPOSED** (2026-06-06). One parent login across all apps, one kid
> code across all apps, parent-swappable. Companion to
> [AUTH-ARCHITECTURE.md](AUTH-ARCHITECTURE.md) (the shared security toolkit this
> sits on).

## The goal (plain)

1. **One parent login** that works on every app — log in once at central, every
   app trusts it.
2. **One kid code** that gets the kid into every app — the same code everywhere.
3. **Swappable** — if a code leaks, the parent makes a new one and the old one
   stops working everywhere, immediately.

## What exists today (and why it doesn't deliver this)

The intent is already in the code — `signupInternal.ts`: *"Marketing Central is
the source of truth for the family code; apps …"* — but it's half-wired:

- ✅ Central (`adamant-crow-705`) stores `familyCode` + `entitledApps` per user.
- ✅ A provisioning pipe passes `familyCode` to apps (`provisionUser` body:
  "shared family code across apps").
- ❌ **Apps also generate their own family codes** (per-app `generateFamilyCode`)
  → drift. Real case: Michelle Trotter = `ERLW4U` on 4 apps, stale `DMQM3F` on
  SafeTube.
- ❌ **The login JWT carries only `sub` + `email`** — not `familyCode` or
  `entitledApps` — so apps can't read the authoritative code on login; they
  depend on a sync that demonstrably misses.
- ❌ **Rotation lives only in SafeTunes** (`regenerateFamilyCode`) and isn't
  propagated to central or the other apps.
- ❌ SafeSpark isn't in the family-code sync loop at all.

## Design — make central the one source, and let the token carry it

### 1. Central is the single authority
The family code is **generated only in central**, at signup, and stored on the
central `users` row. Apps **stop generating their own** — `generateFamilyCode`
is removed from every app; apps only ever *receive* the code.

### 2. Put it in the login token (the key robustness change)
Central's JWT gains two claims: `familyCode` and `entitledApps`. So the moment a
parent logs in, every app has the authoritative code + entitlements straight
from the signed token — no dependency on a side-channel sync that can fail.

```
JWT claims:  { sub, email, familyCode, entitledApps, iss: getsafefamily.com, exp }
```

App side (via the shared toolkit's `verifyMarketingToken`): verify → trust login
→ read `familyCode`/`entitledApps` from the verified claims → upsert onto the
local `users` row. One code, everywhere, with no drift, because the token *is*
the source.

### 3. Kid code → kid session (one code, every app)
A kid enters the **central family code** (+ PIN) on any app. The app validates it
against the value it got from central (token/provisioning), checks the hashed PIN
(toolkit), and issues a scoped `kidSession` token (toolkit). Same code works on
every app because every app uses central's code. (Kid sessions + hashed PINs are
the AUTH-ARCHITECTURE work.)

### 4. Swap it — central-driven, suite-wide
One `regenerateFamilyCode` action **in central** (triggered from any app's parent
settings → calls central, or from the central dashboard):
1. Central generates a new code, writes it to the central `users` row.
2. Central pushes it to **all** apps via the existing provisioning/sync pipe
   (and it rides the next login token automatically).
3. Every app **invalidates all `kidSession`s for that family** → anyone holding
   the old code is logged out everywhere. The old code no longer validates.

The SafeTunes-only `regenerateFamilyCode` is replaced by this central-driven one.

### 5. Repair existing drift
A one-time central → app re-sync pass to heal accounts where the code already
drifted (e.g., push central's `ERLW4U` to SafeTube to overwrite the stale
`DMQM3F`).

## What changes, per app

- Remove per-app `generateFamilyCode`; never mint a code locally.
- On parent login: read `familyCode` + `entitledApps` from the verified JWT
  claims; upsert to the local `users` row (the toolkit + `identity.ts` glue).
- Kid entry: validate against central's code; issue a `kidSession`.
- Add the sync/invalidate hook so a central rotation clears local kid sessions.

## Migration safety (additive, nobody locked out)

1. **Central adds the claims** to the JWT (additive — old apps ignore unknown
   claims).
2. **Apps read the claims when present**, else fall back to today's
   provisioning/sync (so nothing breaks before an app is updated).
3. **Apps stop generating** codes and switch to claim-as-source.
4. **Rotation** goes central-driven; remove the app-local version.
5. **Repair pass** heals drifted accounts.

## Rollout order

1. **Central**: add `familyCode` + `entitledApps` to the JWT; make
   `regenerateFamilyCode` the suite-wide authority (central mutation + push +
   session-invalidate fan-out); a repair endpoint.
2. **SafeReads** (already mid-retrofit): consume the claims, drop local code
   generation, wire kid sessions to the central code. Reference implementation.
3. **SafeSeek → SafeTunes → SafeTube**: same.
4. **SafeSpark**: join the family-code sync loop; consume claims.

## Open decisions

- **Rotation entry point:** parent-facing button in each app's settings (calls
  central) AND/OR only on the central account page? Recommend both — button
  everywhere, central does the work.
- **Code format:** keep the current 6-char alphabet
  (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`) for one canonical generator in central.
- **Session TTL on rotation:** rotation hard-invalidates immediately (that's the
  point); normal expiry is the 30-day kid-session TTL from AUTH-ARCHITECTURE.

---

## Go-live runbook — central foundation (ready now)

What's built + committed (dev only; prod untouched): the family code rides the
login JWT, and central generates/guarantees a code for every account. This slice
is **additive and non-breaking** — apps that don't read the new claim simply
ignore it; logins keep working exactly as before. Deploy it on its own to lay the
foundation, then verify, before any app starts *enforcing*.

### Deploy (deliberate)
1. **Central → prod:** `cd sites/marketing && npx convex deploy --prod`
   (or via Vercel as usual). Ships the JWT `familyCode` claim, the
   `by_familyCode` index, and the `familyCode.ts` generator.
2. **Backfill the 4 codeless accounts:**
   `npx convex run familyCode:backfillFamilyCodes --prod`
   → expect `{ total: 43, created: 4 }` (idempotent; safe to re-run).

### Verify
- Coverage: every central `users` row now has a `familyCode`
  (`npx convex data users --prod` → no empty code column).
- Token: log in once and decode the JWT (jwt.io) → confirm a `familyCode` claim
  is present alongside `entitledApps`.

### Rollback
- Non-destructive. The claim + `ensureFamilyCode` are harmless; to revert code,
  redeploy the prior commit. The backfill only *fills empty* codes — it never
  overwrites or deletes, so there's nothing to undo.

### NOT in this slice (deliberately later, higher risk)
- Apps reading the claim + dropping their own generators.
- Apps *enforcing* identity (the `requireOwner` hard-flip) — needs each app's
  frontend to thread the token first.
- Kid sessions + rotation — need the per-app session tables.
- Prereq for any app-side enforcement: set `MARKETING_JWT_SECRET` on each app's
  Convex deployment (= the value already on SafeSpark/Marketing).
