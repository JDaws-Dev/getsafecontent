# Safe Family — Unified Auth Architecture

> Status: **PROPOSED** (2026-06-05). One auth model for all five apps, parent + kid
> side. Approve this before code lands across the live apps.

## Why

Today each app authenticates differently, and most don't authenticate server-side at all:

| App | Parent JWT verified | Kid session token | PIN |
|-----|:---:|:---:|:---:|
| SafeSpark | ✅ | ✅ | ⚠️ plaintext |
| SafeReads | ✅ *(just added)* | ❌ | ⚠️ plaintext |
| SafeTunes | ❌ | ❌ | ⚠️ plaintext |
| SafeTube | ❌ | ❌ | ⚠️ plaintext |
| SafeSeek | ❌ | ❌ | ⚠️ plaintext |

The core flaw: backends trust a **client-supplied `userId`/`kidId`** for authorization. Any
caller can pass another family's id and read or modify that family's children's data (names,
ages, PINs, reading/watch/search history) — an IDOR on child PII (COPPA-relevant). All five
frontends already log in through central (`getsafefamily.com`), so the *parent* credential is
already uniform; only the server-side enforcement and the kid side are missing.

## The canonical model

### Parent
1. Frontend already holds a Marketing Central **HS256 JWT** (issuer `getsafefamily.com`).
2. It passes that JWT as a `userToken` arg on **every** Convex call.
3. Server verifies it (`verifyMarketingToken`, shared `MARKETING_JWT_SECRET`) → email → local
   `users` row.
4. `requireOwner(ctx, userToken, ownerId)` guards every user-owned function. **No backend ever
   trusts a client `userId` for authorization again.**

### Kid
1. Kid enters **family code** (the parent's `users.familyCode`), picks a profile, enters **PIN**.
2. `startKidSession({ familyCode, kidProfileId, pin })` validates the code + PIN (hashed, rate-
   limited) and issues a crypto-random **`sessionToken`** stored in a `kidSessions` table
   (`{ sessionToken, kidProfileId, familyUserId, createdAt, expiresAt }`).
3. Frontend stores the token, passes it as `sessionToken` on kid-facing calls.
4. `resolveKidIdentity(ctx, sessionToken)` → kid profile, and all data is scoped to that
   profile/family. (This is exactly SafeSpark's existing mechanism.)

### PINs
Hashed everywhere (incl. SafeSpark today): `hashPin`/`verifyPin` with a per-kid salt, constant-
time compare, keeping the existing `pinFailedAttempts`/`pinLockedUntil` lockout. PINs are never
returned in query payloads. (4-digit PINs are low-entropy, so the **lockout is the real defense**;
hashing removes the at-rest plaintext + the cross-tenant read risk.)

## Package layout — one source of truth for the dangerous logic

```
packages/safe-auth/            # new workspace package, imported by all 5 convex backends
  src/index.ts
    verifyMarketingToken(token, secret)   -> { marketingUserId, email } | null   (HS256 + issuer)
    newSessionToken()                     -> crypto-random URL-safe token
    hashPin(pin, salt) / verifyPin(...)   -> Web Crypto (PBKDF2); constant-time
  package.json   ("@safefamily/auth", workspace:*)
```

These are **pure** (no DB, Web-Crypto only — Convex-runtime safe). Being shared, the security-
critical bits are byte-identical in every app. Each app then keeps a thin, schema-aware glue file:

```
apps/<app>/convex/identity.ts   # per-app, wires the shared primitives to THIS app's tables
  resolveParentIdentity(ctx, userToken)  -> users row        (verifyMarketingToken + email lookup)
  resolveKidIdentity(ctx, sessionToken)  -> kid profile      (kidSessions lookup)
  requireOwner / requireOwnerSoft        -> ownership assert
```

Per-app glue is necessary because table names differ (**SafeReads uses `kids`; the others use
`kidProfiles`**) and each app has its own `users` table. The glue is ~60 lines and identical in
shape across apps; only the table names change.

> Convex bundles `convex/` and follows imports, including workspace packages declared as deps.
> Main setup risk is the bundler resolving `@safefamily/auth` — validated once on the first app,
> then it's free for the rest.

## Migration safety — additive, never breaks a live app

Per app, in this order, so the 5 live deployments keep working throughout:

1. **Foundation** — add the package dep + `identity.ts`. Pure addition.
2. **Backend retrofit (soft)** — every user-owned fn takes an *optional* `userToken`/`sessionToken`
   and calls `requireOwnerSoft` (enforce when present, log `UNVERIFIED` + allow when absent).
   Non-breaking; gives telemetry on tokenless traffic.
3. **Frontend** — thread the JWT (`userToken`) + kid `sessionToken` into every Convex call.
4. **Flip to hard** — `requireOwnerSoft` → `requireOwner`. **This is when the hole closes.**
5. **Kid sessions + PIN hashing** — add `kidSessions` + `startKidSession`; hash PINs (lazy migrate:
   on next successful plaintext verify, rehash).

## Rollout order

1. **`packages/safe-auth`** — build + prove the bundler on one app.
2. **SafeReads** — already in progress (identity.ts + `kids.ts` done); switch it to the shared
   package, finish its functions, do its frontend, flip. Hardest schema (`kids`), so it de-risks
   the rest.
3. **SafeSeek → SafeTunes → SafeTube** — same five steps each; mechanical once the pattern's set.
4. **SafeSpark** — adopt the shared package (replace its bespoke `verifyMarketingToken`), add PIN
   hashing. Mostly already compliant.

## Frontend changes (per app)

- **Parent:** read the central JWT from storage (all apps have it post central-login) and pass it
  as `userToken` on every `useQuery`/`useMutation`. Cleanest via a wrapper hook so it's one change,
  not hundreds of call sites.
- **Kid:** call `startKidSession` after family-code + PIN entry, store the returned token, pass it
  as `sessionToken`. SafeSpark's `/start` flow is the template.

## Secrets / env

`MARKETING_JWT_SECRET` set on **all 5** Convex deployments = the value already on Marketing/SafeSpark
(`npx convex env set MARKETING_JWT_SECRET '<value>' --prod`). Until set, verification fails closed
(soft phase still allows tokenless traffic, so no breakage).

## Effort (rough)

- Package: ~0.5 day. Per app: foundation ~0.5 day, backend retrofit ~1 day, frontend ~1 day, kid
  sessions + PIN ~1 day → **~3.5 days/app × ~4 apps + 1 for SafeSpark cleanup ≈ 2–3 focused weeks**,
  shippable app-by-app (each app fully consistent before moving on).

## Open decisions

- **PIN hash:** PBKDF2 via Web Crypto (Convex-runtime safe) vs. a slower hash in a Convex action.
  Recommend PBKDF2 — the lockout carries the real load.
- **Token expiry:** kid `sessionToken` TTL + silent re-issue (recommend 30 days, refresh on use).
- **Shared `users`/family model:** out of scope here — each app keeps its own `users` table; central
  remains the identity source via the JWT.
