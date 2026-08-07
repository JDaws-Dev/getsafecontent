# Unified Authentication Architecture for Safe Family

**Version:** 1.0
**Date:** February 12, 2026
**Author:** Claude (Architecture Document)
**Status:** Draft - Pending Review

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State](#current-state)
3. [Target State](#target-state)
4. [Data Flow](#data-flow)
5. [API Specifications](#api-specifications)
6. [Database Schema Changes](#database-schema-changes)
7. [Security Considerations](#security-considerations)
8. [App Upgrade/Downgrade Flow](#app-upgradedowngrade-flow)
9. [Migration Plan](#migration-plan)
10. [User Communication Plan](#user-communication-plan)
11. [Rollback Plan](#rollback-plan)
    - [Immediate Rollback (< 5 minutes)](#immediate-rollback--5-minutes)
    - [Data Rollback Considerations](#data-rollback-considerations)
    - [Monitoring Checklist](#monitoring-checklist)
    - [Runbook for Common Issues](#runbook-for-common-issues)
12. [Gaps and Risks](#gaps-and-risks)
13. [Edge Cases](#edge-cases)
14. [Testing Strategy](#testing-strategy)
15. [Implementation Beads](#implementation-beads)

---

## Executive Summary

### Problem Statement

Currently, Safe Family has a fragmented authentication experience:

1. Users can sign up via individual apps (SafeTunes, SafeTube, SafeReads)
2. Users can also purchase a bundle on the marketing site (getsafefamily.com)
3. **Bundle purchases create subscription records but NOT authentication credentials**
4. Users who buy bundles cannot log into apps without creating separate accounts
5. Each app maintains its own user database with independent authentication

### Proposed Solution

Implement a **Central Authentication Service** on the marketing site that:

1. Handles all user registration (signup with email + password)
2. Syncs credentials to all apps upon purchase
3. Manages subscription status centrally
4. Allows SSO-like experience across all apps

---

## Current State

### Architecture Diagram (As-Is)

```
                                    ┌─────────────────────────────────────┐
                                    │         Marketing Site              │
                                    │       (getsafefamily.com)           │
                                    │                                     │
                                    │  ┌───────────────────────────────┐  │
                                    │  │    Stripe Checkout            │  │
                                    │  │    - Creates subscription     │  │
                                    │  │    - Collects email           │  │
                                    │  │    - NO password collection   │  │
                                    │  └───────────────────────────────┘  │
                                    │               │                     │
                                    │               ▼                     │
                                    │  ┌───────────────────────────────┐  │
                                    │  │    Stripe Webhook             │  │
                                    │  │    - Receives payment event   │  │
                                    │  │    - Calls app endpoints      │  │
                                    │  └───────────────────────────────┘  │
                                    └─────────────┬───────────────────────┘
                                                  │
                    ┌─────────────────────────────┼─────────────────────────────┐
                    │                             │                             │
                    ▼                             ▼                             ▼
    ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
    │        SafeTunes          │ │        SafeTube           │ │        SafeReads          │
    │   (formal-chihuahua-623)  │ │  (rightful-rabbit-333)    │ │  (exuberant-puffin-838)   │
    │                           │ │                           │ │                           │
    │ /setSubscriptionStatus    │ │ /setSubscriptionStatus    │ │ /setSubscriptionStatus    │
    │                           │ │                           │ │                           │
    │ ✓ Creates/updates user    │ │ ✓ Creates/updates user    │ │ ✓ Creates/updates user    │
    │   with email + status     │ │   with email + status     │ │   with email + status     │
    │                           │ │                           │ │                           │
    │ ✗ NO password             │ │ ✗ NO password             │ │ ✗ NO password             │
    │ ✗ NO auth credentials     │ │ ✗ NO auth credentials     │ │ ✗ NO auth credentials     │
    │                           │ │                           │ │                           │
    │ Uses: Convex Auth         │ │ Uses: Convex Auth         │ │ Uses: Convex Auth         │
    │   - Password provider     │ │   - Password provider     │ │   - Password provider     │
    │   - Google OAuth          │ │   - Google OAuth          │ │   - Google OAuth          │
    └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
```

### Current User Flow (Bundle Purchase)

```
1. User visits getsafefamily.com
2. User clicks "Start Free Trial" or "Subscribe"
3. Stripe Checkout collects: email, payment info
4. User completes payment
5. Stripe webhook triggers
6. Webhook calls /setSubscriptionStatus on each app:
   - Creates user record with email + subscription status
   - User has NO password hash
7. User tries to login to SafeTunes
8. ❌ LOGIN FAILS - No password exists
9. User must create NEW account (separate signup flow)
10. Now user has 2 accounts: provisioned (no password) + self-created (with password)
```

### Current App Authentication

Each app uses **Convex Auth** with:

- **Password provider**: Email + password (bcrypt hashed via Convex Auth)
- **Google OAuth**: Sign in with Google
- **Password reset**: OTP via Resend email

**Key Issue:** Convex Auth stores password hashes in `authAccounts` table, NOT in the `users` table. The `setSubscriptionStatus` endpoint only creates/updates the `users` table, but doesn't touch `authAccounts`.

### Database Schema (Current)

**SafeTunes/SafeTube `users` table:**
```typescript
users: defineTable({
  // Convex Auth required fields
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  emailVerificationTime: v.optional(v.float64()),
  // ...other auth fields

  // Custom fields
  subscriptionStatus: v.optional(v.string()), // "trial", "active", "lifetime", etc.
  subscriptionId: v.optional(v.string()),
  stripeCustomerId: v.optional(v.string()),
  familyCode: v.optional(v.string()),
  // ...more app-specific fields
})
```

**Convex Auth tables (auto-generated):**
```typescript
authAccounts: defineTable({
  userId: v.id("users"),
  provider: v.string(),        // "password" or "google"
  providerAccountId: v.string(), // For password: email, for OAuth: provider's ID
  secret: v.optional(v.string()), // Password hash (bcrypt) for password provider
  // ...other fields
})

authSessions: defineTable({
  userId: v.id("users"),
  // ...session fields
})
```

---

## Convex Auth Table Structure

This section documents the internal structure of Convex Auth's `authAccounts` table, which is critical for understanding how to provision users with password credentials.

### Research Findings

**Source:** `@convex-dev/auth` package version in `apps/safetunes/node_modules`

#### authAccounts Table Schema

The `authAccounts` table is defined in `@convex-dev/auth/src/server/implementation/types.ts`:

```typescript
authAccounts: defineTable({
  userId: v.id("users"),           // Required: Reference to users table
  provider: v.string(),            // Required: "password", "google", etc.
  providerAccountId: v.string(),   // Required: For password provider = email (lowercase)
  secret: v.optional(v.string()),  // Optional: Password hash (bcrypt/scrypt)
  emailVerified: v.optional(v.string()), // Optional: Verified email address
  phoneVerified: v.optional(v.string()), // Optional: Verified phone number
})
  .index("userIdAndProvider", ["userId", "provider"])
  .index("providerAndAccountId", ["provider", "providerAccountId"])
```

#### Password Hashing

Convex Auth uses **Scrypt** (from Lucia library) by default, NOT bcrypt:

```typescript
// From @convex-dev/auth/src/providers/Password.ts
import { Scrypt } from "lucia";

crypto: {
  async hashSecret(password: string) {
    return await new Scrypt().hash(password);
  },
  async verifySecret(password: string, hash: string) {
    return await new Scrypt().verify(hash, password);
  },
},
```

**Important:** The hash format is NOT standard bcrypt (`$2a$...`). Scrypt produces a different format. This affects our provisioning approach.

#### How Account Creation Works

From `@convex-dev/auth/src/server/implementation/users.ts`:

```typescript
// Account creation (line 184-203)
async function createOrUpdateAccount(
  ctx: MutationCtx,
  userId: GenericId<"users">,
  account: { providerAccountId: string; secret?: string },
  args: CreateOrUpdateUserArgs,
) {
  const accountId = await ctx.db.insert("authAccounts", {
    userId,
    provider: args.provider.id,        // "password"
    providerAccountId: account.providerAccountId, // email (lowercase)
    secret: account.secret,            // hashed password
  });
  // ... additional verification handling
}
```

#### Key Indexes Used for Login

When a user logs in, Convex Auth queries:

```typescript
// From createAccountFromCredentials.ts
const existingAccount = await ctx.db
  .query("authAccounts")
  .withIndex("providerAndAccountId", (q) =>
    q.eq("provider", provider.id).eq("providerAccountId", account.id)
  )
  .unique();
```

The `providerAccountId` is the **lowercase email** for password authentication.

### Fields Required for User Provisioning

To provision a user that can log in with password auth, we need:

| Field | Table | Required | Value |
|-------|-------|----------|-------|
| `email` | `users` | Yes | User's email |
| `name` | `users` | No | Display name |
| `userId` | `authAccounts` | Yes | Reference to users._id |
| `provider` | `authAccounts` | Yes | `"password"` |
| `providerAccountId` | `authAccounts` | Yes | `email.toLowerCase()` |
| `secret` | `authAccounts` | Yes | Scrypt hash of password |

### Relationship Between Tables

```
┌─────────────────────────────────────────────────┐
│                   users                          │
├─────────────────────────────────────────────────┤
│ _id: Id<"users">                                │
│ email: string                                    │
│ name?: string                                    │
│ emailVerificationTime?: number                   │
│ ... (app-specific fields like subscriptionStatus)│
└──────────────────────┬──────────────────────────┘
                       │ 1
                       │
                       │ *
┌──────────────────────┴──────────────────────────┐
│                authAccounts                      │
├─────────────────────────────────────────────────┤
│ _id: Id<"authAccounts">                         │
│ userId: Id<"users">  ←── links to users table   │
│ provider: "password" | "google" | ...           │
│ providerAccountId: string (email for password)  │
│ secret?: string (password hash)                 │
│ emailVerified?: string                          │
│ phoneVerified?: string                          │
└─────────────────────────────────────────────────┘
```

A user can have **multiple** authAccounts (one per provider). For example:
- One for password auth (provider: "password", secret: scrypt hash)
- One for Google OAuth (provider: "google", no secret)

### Can We Write to authAccounts Directly?

**YES.** The `authAccounts` table is a standard Convex table. We can:

1. **Insert directly via internal mutation:**
   ```typescript
   await ctx.db.insert("authAccounts", {
     userId,
     provider: "password",
     providerAccountId: email.toLowerCase(),
     secret: passwordHash,
   });
   ```

2. **Query existing accounts:**
   ```typescript
   const existingAuth = await ctx.db
     .query("authAccounts")
     .withIndex("providerAndAccountId", (q) =>
       q.eq("provider", "password").eq("providerAccountId", email.toLowerCase())
     )
     .first();
   ```

3. **Update password hash:**
   ```typescript
   await ctx.db.patch(authAccountId, {
     secret: newPasswordHash,
   });
   ```

### Password Hash Compatibility

**CRITICAL ISSUE:** Convex Auth uses Scrypt, but our marketing site may use bcrypt.

**Options:**

1. **Match Convex Auth (Recommended):**
   - Marketing site hashes with Scrypt (Lucia library)
   - Apps receive Scrypt hash, store as-is
   - Login works because hash format matches

2. **Use bcrypt everywhere (Requires Custom Provider):**
   - Customize Password provider with bcrypt crypto
   - All apps must use same bcrypt implementation
   - Marketing site uses bcrypt

**Recommended Approach:**

```typescript
// Marketing site - hash password with Scrypt (same as Convex Auth)
import { Scrypt } from "lucia";

const scrypt = new Scrypt();
const passwordHash = await scrypt.hash(plainPassword);

// This hash can be directly stored in authAccounts.secret
// and Convex Auth will verify it correctly on login
```

### Implementation Notes

1. **authAccounts table already exists** - Created by spreading `...authTables` in schema.ts

2. **No schema changes needed** - We can write to authAccounts as-is

3. **Provider ID must be "password"** - This matches what Password provider expects

4. **Email must be lowercase** - Convex Auth lowercases emails for lookups

5. **Hash format must match** - Use same hashing library as Convex Auth (Scrypt from Lucia)

### Verification Query

To verify a user can log in after provisioning:

```typescript
// Check user exists
const user = await ctx.db
  .query("users")
  .withIndex("email", (q) => q.eq("email", email))
  .first();

// Check authAccount exists for password provider
const authAccount = await ctx.db
  .query("authAccounts")
  .withIndex("providerAndAccountId", (q) =>
    q.eq("provider", "password").eq("providerAccountId", email.toLowerCase())
  )
  .first();

// Both must exist and be linked
const canLogin = user && authAccount && authAccount.userId === user._id;
```

---

## Target State

### Architecture Diagram (To-Be)

```
                                    ┌─────────────────────────────────────────────────┐
                                    │              Marketing Site                     │
                                    │            (getsafefamily.com)                  │
                                    │                                                 │
                                    │  ┌─────────────────────────────────────────┐    │
                                    │  │       Central Auth Service              │    │
                                    │  │                                         │    │
                                    │  │  POST /api/auth/signup                  │    │
                                    │  │    - Collects: email, password, name    │    │
                                    │  │    - Stores: hashed password            │    │
                                    │  │    - Returns: user ID, session token    │    │
                                    │  │                                         │    │
                                    │  │  GET /api/auth/verify                   │    │
                                    │  │    - Validates session/credentials      │    │
                                    │  │                                         │    │
                                    │  └─────────────────────────────────────────┘    │
                                    │                      │                          │
                                    │  ┌───────────────────┴───────────────────┐      │
                                    │  │         Stripe Checkout               │      │
                                    │  │  - Pre-filled with user email         │      │
                                    │  │  - Linked to existing user record     │      │
                                    │  └───────────────────────────────────────┘      │
                                    │                      │                          │
                                    │  ┌───────────────────┴───────────────────┐      │
                                    │  │         Enhanced Webhook              │      │
                                    │  │  - Calls /provisionUser on each app   │      │
                                    │  │  - Passes: email, passwordHash, name  │      │
                                    │  │  - Passes: subscription status        │      │
                                    │  │  - Passes: entitled apps list         │      │
                                    │  └───────────────────────────────────────┘      │
                                    │                                                 │
                                    │  ┌─────────────────────────────────────────┐    │
                                    │  │       Central User Database             │    │
                                    │  │                                         │    │
                                    │  │  centralUsers table:                    │    │
                                    │  │    - email (unique)                     │    │
                                    │  │    - passwordHash                       │    │
                                    │  │    - name                               │    │
                                    │  │    - stripeCustomerId                   │    │
                                    │  │    - entitledApps: ["safetunes", ...]   │    │
                                    │  │    - subscriptionStatus                 │    │
                                    │  │    - createdAt, updatedAt               │    │
                                    │  └─────────────────────────────────────────┘    │
                                    └─────────────────────────┬───────────────────────┘
                                                              │
                    ┌─────────────────────────────────────────┼───────────────────────────────────┐
                    │                                         │                                   │
                    ▼                                         ▼                                   ▼
    ┌───────────────────────────────┐   ┌───────────────────────────────┐   ┌───────────────────────────────┐
    │          SafeTunes            │   │          SafeTube             │   │          SafeReads            │
    │    (formal-chihuahua-623)     │   │   (rightful-rabbit-333)       │   │   (exuberant-puffin-838)      │
    │                               │   │                               │   │                               │
    │  NEW: /provisionUser          │   │  NEW: /provisionUser          │   │  NEW: /provisionUser          │
    │                               │   │                               │   │                               │
    │  Receives:                    │   │  Receives:                    │   │  Receives:                    │
    │    - email                    │   │    - email                    │   │    - email                    │
    │    - passwordHash             │   │    - passwordHash             │   │    - passwordHash             │
    │    - name                     │   │    - name                     │   │    - name                     │
    │    - subscriptionStatus       │   │    - subscriptionStatus       │   │    - subscriptionStatus       │
    │    - entitledToThisApp        │   │    - entitledToThisApp        │   │    - entitledToThisApp        │
    │                               │   │                               │   │                               │
    │  Creates:                     │   │  Creates:                     │   │  Creates:                     │
    │    - users table entry        │   │    - users table entry        │   │    - users table entry        │
    │    - authAccounts entry       │   │    - authAccounts entry       │   │    - authAccounts entry       │
    │      (password provider)      │   │      (password provider)      │   │      (password provider)      │
    │                               │   │                               │   │                               │
    │  Result:                      │   │  Result:                      │   │  Result:                      │
    │    ✓ User can login           │   │    ✓ User can login           │   │    ✓ User can login           │
    │    ✓ Same credentials work    │   │    ✓ Same credentials work    │   │    ✓ Same credentials work    │
    └───────────────────────────────┘   └───────────────────────────────┘   └───────────────────────────────┘
```

### Target User Flow (Bundle Purchase)

```
1. User visits getsafefamily.com
2. User clicks "Start Free Trial" → Signup page
3. Signup form collects: email, password, name, selected apps
4. Marketing site:
   a. Validates email uniqueness
   b. Hashes password (bcrypt, 12 rounds)
   c. Creates centralUsers record
   d. Returns session token
5. User is now "logged in" on marketing site
6. User redirected to Stripe Checkout (email pre-filled)
7. User completes payment
8. Stripe webhook triggers
9. Webhook calls /provisionUser on EACH app (all 3):
   a. Passes: email, passwordHash, name
   b. Passes: subscriptionStatus based on entitlement
   c. Creates user + authAccounts entry in each app
10. User visits SafeTunes (any entitled app)
11. ✓ User logs in with same email/password from signup
12. ✓ App checks subscriptionStatus - shows full access if entitled
13. ✓ Non-entitled apps show "Upgrade to access this app"
```

---

## Data Flow

### Signup and Checkout Flow

```
┌──────────────┐     ┌─────────────────┐     ┌────────────────┐     ┌────────────────┐
│    User      │     │  Marketing Site │     │     Stripe     │     │   App Convex   │
└──────┬───────┘     └────────┬────────┘     └───────┬────────┘     └───────┬────────┘
       │                      │                      │                      │
       │  1. Fill signup form │                      │                      │
       │  (email, password,   │                      │                      │
       │   name, apps)        │                      │                      │
       │─────────────────────>│                      │                      │
       │                      │                      │                      │
       │                      │  2. Hash password    │                      │
       │                      │  3. Store in DB      │                      │
       │                      │  4. Create session   │                      │
       │                      │                      │                      │
       │  5. Redirect to      │                      │                      │
       │     checkout         │                      │                      │
       │<─────────────────────│                      │                      │
       │                      │                      │                      │
       │  6. Complete payment │                      │                      │
       │──────────────────────┼─────────────────────>│                      │
       │                      │                      │                      │
       │                      │  7. Webhook          │                      │
       │                      │     (checkout.       │                      │
       │                      │      session.        │                      │
       │                      │      completed)      │                      │
       │                      │<─────────────────────│                      │
       │                      │                      │                      │
       │                      │  8. Fetch user from  │                      │
       │                      │     centralUsers DB  │                      │
       │                      │                      │                      │
       │                      │  9. For each app:    │                      │
       │                      │     POST /provisionUser                     │
       │                      │────────────────────────────────────────────>│
       │                      │     { email,         │                      │
       │                      │       passwordHash,  │                      │
       │                      │       name,          │                      │
       │                      │       status }       │                      │
       │                      │                      │                      │
       │                      │                      │  10. Create user     │
       │                      │                      │      + authAccounts  │
       │                      │                      │                      │
       │                      │  11. Return success  │                      │
       │                      │<────────────────────────────────────────────│
       │                      │                      │                      │
       │  12. Redirect to     │                      │                      │
       │      success page    │                      │                      │
       │<─────────────────────│                      │                      │
       │                      │                      │                      │
       │  13. Navigate to app │                      │                      │
       │  14. Login with      │                      │                      │
       │      credentials     │                      │                      │
       │─────────────────────────────────────────────────────────────────────>│
       │                      │                      │                      │
       │  15. ✓ Access granted│                      │                      │
       │<─────────────────────────────────────────────────────────────────────│
```

### Password Change Sync Flow

```
┌──────────────┐     ┌─────────────────┐     ┌────────────────┐
│    User      │     │   SafeTunes     │     │  Other Apps    │
└──────┬───────┘     └────────┬────────┘     └───────┬────────┘
       │                      │                      │
       │  1. Change password  │                      │
       │      in SafeTunes    │                      │
       │─────────────────────>│                      │
       │                      │                      │
       │                      │  2. Hash new password│
       │                      │  3. Update local     │
       │                      │     authAccounts     │
       │                      │                      │
       │                      │  4. Call central     │
       │                      │     /syncPassword    │
       │                      │────────────────────> │ (via marketing site)
       │                      │                      │
       │                      │  5. Central updates  │
       │                      │     all apps         │
       │                      │     /updatePassword  │
       │                      │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ >│
       │                      │                      │
       │  6. Success          │                      │
       │<─────────────────────│                      │
       │                      │                      │
       │  7. Can now login    │                      │
       │     to any app with  │                      │
       │     new password     │                      │
```

---

## API Specifications

### 1. Marketing Site: POST /api/auth/signup

**Purpose:** Create a new central user account

**Request:**
```typescript
{
  email: string;          // User's email (unique)
  password: string;       // Plain text password (will be hashed)
  name: string;           // Display name
  selectedApps: string[]; // ["safetunes", "safetube", "safereads"]
  promoCode?: string;     // Optional promo code (DAWSFRIEND, DEWITT)
}
```

**Response:**
```typescript
{
  success: boolean;
  userId: string;
  sessionToken: string;   // JWT or session cookie
  error?: string;
}
```

**Implementation Notes:**
- Hash password with bcrypt (12 rounds)
- Store in new `centralUsers` table (Prisma/Supabase/Convex)
- Generate session token
- Set HTTP-only cookie for session

---

### 2. App Convex: POST /provisionUser

**Purpose:** Create authenticated user in app database

**HTTP Endpoint Configuration:**
```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/provisionUser",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Validate admin key
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    if (!key || key !== process.env.ADMIN_KEY) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.passwordHash) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const result = await ctx.runMutation(internal.users.provisionUserInternal, {
        email: body.email,
        passwordHash: body.passwordHash,
        name: body.name || null,
        subscriptionStatus: body.subscriptionStatus || "active",
        entitledToThisApp: body.entitledToThisApp !== false,
        stripeCustomerId: body.stripeCustomerId || null,
        subscriptionId: body.subscriptionId || null,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message,
        provisioned: false,
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
```

**Request Body:**
```typescript
{
  email: string;              // User's email
  passwordHash: string;       // Pre-hashed password (bcrypt)
  name?: string;              // Display name
  subscriptionStatus: string; // "trial" | "active" | "lifetime" | "inactive"
  entitledToThisApp: boolean; // Whether user paid for THIS specific app
  stripeCustomerId?: string;  // Stripe customer ID
  subscriptionId?: string;    // Stripe subscription ID
}
```

**Response:**
```typescript
{
  success: boolean;
  userId: string;           // Convex user ID
  provisioned: boolean;     // Was a new user created?
  updated: boolean;         // Was existing user updated?
  authAccountCreated: boolean; // Was authAccounts entry created?
  error?: string;
}
```

---

### 3. Internal Mutation: provisionUserInternal

**Location:** Each app's `convex/users.ts`

```typescript
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const provisionUserInternal = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.union(v.string(), v.null()),
    subscriptionStatus: v.string(),
    entitledToThisApp: v.boolean(),
    stripeCustomerId: v.union(v.string(), v.null()),
    subscriptionId: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    // 1. Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    let userId;
    let wasCreated = false;

    if (existingUser) {
      userId = existingUser._id;

      // Update subscription status
      await ctx.db.patch(userId, {
        subscriptionStatus: args.entitledToThisApp
          ? args.subscriptionStatus
          : "inactive", // Not entitled to this app
        stripeCustomerId: args.stripeCustomerId ?? existingUser.stripeCustomerId,
        subscriptionId: args.subscriptionId ?? existingUser.subscriptionId,
        name: args.name ?? existingUser.name,
      });
    } else {
      // Create new user with family code
      const familyCode = await generateUniqueFamilyCode(ctx);

      userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name ?? undefined,
        subscriptionStatus: args.entitledToThisApp
          ? args.subscriptionStatus
          : "inactive",
        familyCode,
        createdAt: Date.now(),
        stripeCustomerId: args.stripeCustomerId ?? undefined,
        subscriptionId: args.subscriptionId ?? undefined,
      });
      wasCreated = true;
    }

    // 2. Check if authAccounts entry exists for password provider
    const existingAuthAccount = await ctx.db
      .query("authAccounts")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("provider"), "password")
        )
      )
      .first();

    let authAccountCreated = false;

    if (!existingAuthAccount) {
      // Create authAccounts entry for password authentication
      // This is the KEY step that allows login to work
      await ctx.db.insert("authAccounts", {
        userId,
        provider: "password",
        providerAccountId: args.email.toLowerCase(),
        secret: args.passwordHash, // The bcrypt hash
        // Convex Auth may require additional fields - check your schema
      });
      authAccountCreated = true;
    } else if (args.passwordHash !== existingAuthAccount.secret) {
      // Update password hash if different (password was changed centrally)
      await ctx.db.patch(existingAuthAccount._id, {
        secret: args.passwordHash,
      });
    }

    return {
      success: true,
      userId: userId,
      provisioned: wasCreated,
      updated: !wasCreated,
      authAccountCreated,
    };
  },
});

// Helper function to generate unique family code
async function generateUniqueFamilyCode(ctx: MutationCtx): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let attempts = 0;

  while (attempts < 10) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_family_code", (q) => q.eq("familyCode", code))
      .first();

    if (!existing) {
      return code;
    }
    attempts++;
  }

  throw new Error("Failed to generate unique family code");
}
```

---

### 4. Marketing Site: POST /api/auth/sync-password

**Purpose:** Sync password change from an app to central and all other apps

**Request:**
```typescript
{
  email: string;
  newPasswordHash: string;
  sourceApp: string;      // Which app initiated the change
  adminKey: string;       // Verification
}
```

**Response:**
```typescript
{
  success: boolean;
  syncedApps: string[];   // Apps that were updated
  errors: string[];       // Any apps that failed
}
```

---

### 5. App Convex: POST /updatePassword

**Purpose:** Update password hash from central sync

**Request:**
```typescript
{
  email: string;
  passwordHash: string;
  adminKey: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  updated: boolean;
}
```

---

## Database Schema Changes

### Marketing Site: New `centralUsers` Table

```typescript
// Option A: Using Prisma (recommended for marketing site)
model CentralUser {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String
  name            String?

  // Stripe
  stripeCustomerId   String?
  subscriptionId     String?
  subscriptionStatus String  @default("trial") // trial, active, lifetime, canceled, expired

  // Entitlements
  entitledApps    String[] @default([])  // ["safetunes", "safetube", "safereads"]

  // Promo codes
  promoCode       String?

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Tracking
  onboardingData  Json?    // Store onboarding answers for app sync

  @@index([email])
  @@index([stripeCustomerId])
}
```

### App Convex: Schema Additions

**Minimal changes needed - just ensure authAccounts is accessible:**

```typescript
// convex/schema.ts
// No schema changes needed if using Convex Auth's default tables
// The authAccounts table is created by ...authTables

// If you need to query authAccounts directly, it's already there:
// authAccounts: defineTable({ ... }) // Created by authTables
```

### Auth Accounts Structure (Convex Auth Default)

```typescript
// This is what Convex Auth creates automatically
authAccounts: defineTable({
  userId: v.id("users"),
  provider: v.string(),         // "password", "google", etc.
  providerAccountId: v.string(), // For password: the email
  secret: v.optional(v.string()), // Password hash for password provider
  emailVerified: v.optional(v.boolean()),
  // ... other fields depending on Convex Auth version
})
  .index("userIdAndProvider", ["userId", "provider"])
  .index("providerAndAccountId", ["provider", "providerAccountId"])
```

---

## Security Considerations

### 1. Password Handling

**CRITICAL:** Passwords must NEVER be transmitted in plain text between services.

```
✓ CORRECT FLOW:
   User → Marketing Site: Plain password (HTTPS)
   Marketing Site: Hash with bcrypt (12 rounds)
   Marketing Site → App: Pre-hashed password
   App: Store hash as-is (no re-hashing)

✗ WRONG FLOW:
   User → Marketing Site: Plain password
   Marketing Site → App: Plain password (SECURITY RISK!)
   App: Hash password
```

**Password Hashing Standard:**
- Algorithm: bcrypt
- Rounds: 12 (minimum)
- Salt: Auto-generated by bcrypt

**Implementation:**
```typescript
import bcrypt from "bcryptjs";

// Marketing site hashes password
const passwordHash = await bcrypt.hash(plainPassword, 12);

// App verifies password (during login)
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

### 2. API Key Security

**Transport:**
- All `/provisionUser` calls use HTTPS
- Admin key passed as URL parameter (over HTTPS)
- Consider moving to Authorization header for better logging hygiene

**Key Rotation:**
```bash
# When rotating ADMIN_KEY:
1. Generate new key: openssl rand -base64 32
2. Update marketing site env vars
3. Update all 3 Convex deployments
4. Verify webhook calls succeed
5. Old key immediately invalid
```

### 3. Password Hash Transport

**Q: Is it safe to send password hashes between servers?**

**A: Yes, with these conditions:**
- Hashes are sent over HTTPS (encrypted in transit)
- Hashes are bcrypt (computationally expensive to brute force)
- Even if intercepted, attacker cannot reverse the hash
- Admin key validates the request source

**Risk:** If ADMIN_KEY is compromised, attacker could provision arbitrary users. Mitigate with:
- IP allowlisting (Vercel → Convex only)
- Request signing with timestamps
- Rate limiting on provision endpoint

### 4. Considerations for OAuth Users

**Current State:**
- SafeReads uses Google OAuth only
- SafeTunes/SafeTube support both password and Google

**Challenge:**
- Central signup uses password
- User might already have Google OAuth in one app
- Need to handle account linking

**Solution:**
- On provision, check for existing user by email
- If user exists with Google OAuth:
  - Add password provider as additional auth method
  - User can login with either
- If user exists with password:
  - Update password hash
  - Maintain existing OAuth links

---

## App Upgrade/Downgrade Flow

Users need an easy way to modify their subscription - adding/removing apps, and changing billing cycles. This section details the complete upgrade/downgrade flow.

### Pricing Reference

| Plan | Price | Apps |
|------|-------|------|
| Single App | $4.99/mo | 1 app |
| 2-App Bundle | $7.99/mo | 2 apps (save $2/mo) |
| 3-App Bundle Monthly | $9.99/mo | 3 apps (save $5/mo) |
| 3-App Bundle Yearly | $99/year | 3 apps (save ~$20/year) |

### Use Cases

#### 1. Upgrade: Add More Apps

**Scenario:** User has SafeTunes only ($4.99/mo), wants to add SafeTube

**User Experience:**
1. User opens SafeTunes Settings page
2. Clicks "Manage Apps" button
3. Sees current plan: SafeTunes ($4.99/mo)
4. Toggles SafeTube ON
5. Sees price preview: "2-App Bundle: $7.99/mo (save $2/mo)"
6. Clicks "Confirm Upgrade"
7. Stripe subscription is updated (prorated)
8. SafeTube is provisioned immediately
9. User can now log into SafeTube with same credentials

**Technical Flow:**
```
┌──────────┐     ┌─────────────────┐     ┌────────────────┐     ┌────────────────┐
│  User    │     │   App Settings  │     │  Marketing API │     │     Stripe     │
└────┬─────┘     └───────┬─────────┘     └───────┬────────┘     └───────┬────────┘
     │                   │                       │                      │
     │  1. Click         │                       │                      │
     │     "Manage Apps" │                       │                      │
     │──────────────────>│                       │                      │
     │                   │                       │                      │
     │                   │  2. GET /api/subscription/current            │
     │                   │──────────────────────>│                      │
     │                   │                       │                      │
     │                   │  3. Return current    │                      │
     │                   │     apps + pricing    │                      │
     │                   │<──────────────────────│                      │
     │                   │                       │                      │
     │  4. Toggle SafeTube ON                    │                      │
     │  5. See price preview                     │                      │
     │<──────────────────│                       │                      │
     │                   │                       │                      │
     │  6. Confirm       │                       │                      │
     │──────────────────>│                       │                      │
     │                   │                       │                      │
     │                   │  7. POST /api/subscription/update            │
     │                   │     { apps: ["safetunes", "safetube"] }      │
     │                   │──────────────────────>│                      │
     │                   │                       │                      │
     │                   │                       │  8. Update           │
     │                   │                       │     subscription     │
     │                   │                       │────────────────────> │
     │                   │                       │                      │
     │                   │                       │  9. Webhook:         │
     │                   │                       │     subscription.    │
     │                   │                       │     updated          │
     │                   │                       │<──────────────────── │
     │                   │                       │                      │
     │                   │                       │  10. Provision       │
     │                   │                       │      SafeTube        │
     │                   │                       │                      │
     │                   │  11. Success response │                      │
     │                   │<──────────────────────│                      │
     │                   │                       │                      │
     │  12. "SafeTube    │                       │                      │
     │      added!"      │                       │                      │
     │<──────────────────│                       │                      │
```

#### 2. Downgrade: Remove Apps

**Scenario:** User has 3-App Bundle, wants to drop SafeReads

**User Experience:**
1. User opens any app's Settings page
2. Clicks "Manage Apps"
3. Sees current plan: 3-App Bundle ($9.99/mo)
4. Toggles SafeReads OFF
5. Sees warning: "You'll lose access to SafeReads content"
6. Sees price preview: "2-App Bundle: $7.99/mo"
7. Clicks "Confirm Changes"
8. SafeReads access is revoked at end of billing period (or immediately, depending on policy)
9. Subscription amount decreases

**Technical Flow:**
```typescript
// POST /api/subscription/update
{
  action: "update_apps",
  apps: ["safetunes", "safetube"], // SafeReads removed
  effectiveDate: "end_of_period" | "immediate"
}

// Response
{
  success: true,
  newPrice: 7.99,
  billingPeriod: "monthly",
  removedApps: ["safereads"],
  effectiveDate: "2026-03-11T00:00:00Z", // End of current period
  prorationAmount: 0 // No proration on downgrades (service until end of period)
}
```

**Revocation Policy:**
- **Immediate revocation:** User loses access right away, gets prorated credit
- **End-of-period revocation (recommended):** User keeps access until next billing date

#### 3. Change Billing Cycle

**Scenario:** User on monthly 3-app bundle ($9.99/mo) wants to switch to yearly ($99/year)

**User Experience:**
1. User opens Settings
2. Sees toggle: "Monthly" / "Yearly (save $20/year)"
3. User toggles to Yearly
4. Sees: "You'll be charged $99 now, then $99/year"
5. Sees proration: "Credit for remaining days: -$5.50"
6. Net charge shown: "$93.50 today"
7. User confirms
8. Subscription updated immediately

**Technical Flow:**
```typescript
// POST /api/subscription/update
{
  action: "change_billing_cycle",
  billingCycle: "yearly", // or "monthly"
  apps: ["safetunes", "safetube", "safereads"] // Current apps (unchanged)
}

// Response
{
  success: true,
  previousBillingCycle: "monthly",
  newBillingCycle: "yearly",
  proratedCredit: 5.50, // Credit for unused days on monthly
  newPrice: 99.00,
  chargedAmount: 93.50, // Net charge
  nextBillingDate: "2027-02-12T00:00:00Z"
}
```

### API Specifications for Upgrade/Downgrade

#### GET /api/subscription/current

**Purpose:** Get user's current subscription details for display in Settings

**Request:**
```typescript
// Headers
Authorization: Bearer <session_token>
```

**Response:**
```typescript
{
  subscriptionId: string;
  stripeCustomerId: string;
  currentApps: string[];           // ["safetunes", "safetube"]
  billingCycle: "monthly" | "yearly";
  currentPrice: number;            // 7.99
  status: "active" | "trial" | "canceled" | "past_due";
  trialEndsAt?: string;            // ISO date if on trial
  currentPeriodEnd: string;        // ISO date
  cancelAtPeriodEnd: boolean;

  // For UI display
  availablePlans: {
    apps: string[];
    monthlyPrice: number;
    yearlyPrice: number;
    savings: number;
  }[];
}
```

#### POST /api/subscription/update

**Purpose:** Update user's subscription (add/remove apps, change billing cycle)

**Request:**
```typescript
{
  action: "update_apps" | "change_billing_cycle";

  // For update_apps
  apps?: string[];                 // New list of apps

  // For change_billing_cycle
  billingCycle?: "monthly" | "yearly";

  // Common
  prorationBehavior?: "create_prorations" | "none" | "always_invoice";
}
```

**Response:**
```typescript
{
  success: boolean;
  subscription: {
    apps: string[];
    billingCycle: "monthly" | "yearly";
    price: number;
    nextBillingDate: string;
  };
  proration?: {
    credit: number;
    charge: number;
    netAmount: number;
  };
  provisioningResults?: {
    app: string;
    success: boolean;
    error?: string;
  }[];
}
```

#### POST /api/subscription/preview

**Purpose:** Preview price changes before confirming

**Request:**
```typescript
{
  apps: string[];                  // Proposed app list
  billingCycle: "monthly" | "yearly";
}
```

**Response:**
```typescript
{
  currentPlan: {
    apps: string[];
    price: number;
    billingCycle: "monthly" | "yearly";
  };
  proposedPlan: {
    apps: string[];
    price: number;
    billingCycle: "monthly" | "yearly";
  };
  proration: {
    unusedCredit: number;          // Credit for unused time on current plan
    immediateCharge: number;       // Charge for upgrade (if applicable)
    netChange: number;             // Net amount (positive = charge, negative = credit)
  };
  effectiveDate: string;           // When changes take effect
  savings?: number;                // Monthly savings vs. individual apps
}
```

### Stripe Integration Details

#### Price IDs

```typescript
const STRIPE_PRICES = {
  // Individual apps (for individual app purchases, not bundles)
  safetunes_monthly: "price_XXXX_safetunes_monthly",
  safetube_monthly: "price_XXXX_safetube_monthly",
  safereads_monthly: "price_XXXX_safereads_monthly",

  // Bundles
  bundle_2_monthly: "price_XXXX_bundle_2_monthly",      // $7.99
  bundle_3_monthly: "price_1SxaerKgkIT46sg7NHNy0wk8",  // $9.99
  bundle_3_yearly: "price_1SzLJUKgkIT46sg7xsKo2A71",   // $99
};

// Determine price ID based on app count and billing cycle
function getPriceId(apps: string[], billingCycle: "monthly" | "yearly"): string {
  const count = apps.length;

  if (count === 3 && billingCycle === "yearly") {
    return STRIPE_PRICES.bundle_3_yearly;
  }
  if (count === 3 && billingCycle === "monthly") {
    return STRIPE_PRICES.bundle_3_monthly;
  }
  if (count === 2) {
    return STRIPE_PRICES.bundle_2_monthly;
  }
  // Single app - return individual price
  return STRIPE_PRICES[`${apps[0]}_monthly`];
}
```

#### Updating Subscription

```typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function updateSubscription(
  subscriptionId: string,
  newApps: string[],
  newBillingCycle: "monthly" | "yearly"
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const newPriceId = getPriceId(newApps, newBillingCycle);

  // Update the subscription
  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations", // Handle proration
    metadata: {
      apps: newApps.join(","),
      billingCycle: newBillingCycle,
    },
  });

  return updatedSubscription;
}
```

#### Webhook: subscription.updated

```typescript
case "customer.subscription.updated": {
  const subscription = event.data.object as Stripe.Subscription;
  const previousAttributes = event.data.previous_attributes as any;

  const customerEmail = await getCustomerEmail(subscription.customer as string);
  const newApps = parseApps(subscription.metadata.apps);
  const previousApps = parseApps(previousAttributes?.metadata?.apps);

  // Determine what changed
  const addedApps = newApps.filter(app => !previousApps.includes(app));
  const removedApps = previousApps.filter(app => !newApps.includes(app));

  // Provision new apps
  for (const app of addedApps) {
    const user = await getCentralUser(customerEmail);
    await provisionUser(app, {
      email: customerEmail,
      passwordHash: user.passwordHash,
      name: user.name,
      subscriptionStatus: "active",
      entitledToThisApp: true,
    });
  }

  // Revoke access to removed apps
  for (const app of removedApps) {
    await revokeAppAccess(app, customerEmail);
  }

  // Update central user record
  await updateCentralUser(customerEmail, {
    entitledApps: newApps,
    billingCycle: subscription.metadata.billingCycle || "monthly",
  });

  break;
}
```

### Settings UI Component

Each app needs a unified Settings UI for subscription management.

#### Component Structure

```typescript
// src/components/SubscriptionManager.tsx

interface SubscriptionManagerProps {
  currentApp: "safetunes" | "safetube" | "safereads";
}

export function SubscriptionManager({ currentApp }: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [preview, setPreview] = useState<PricePreview | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch current subscription on mount
  useEffect(() => {
    fetchSubscription();
  }, []);

  // Update preview when selections change
  useEffect(() => {
    if (hasChanges) {
      fetchPreview(selectedApps, billingCycle);
    }
  }, [selectedApps, billingCycle]);

  return (
    <div className="subscription-manager">
      <h2>Manage Your Subscription</h2>

      {/* Current Plan Display */}
      <CurrentPlanCard subscription={subscription} />

      {/* App Toggle Section */}
      <section className="app-selection">
        <h3>Your Apps</h3>
        {APPS.map(app => (
          <AppToggle
            key={app.id}
            app={app}
            isEnabled={selectedApps.includes(app.id)}
            isCurrentApp={app.id === currentApp}
            onChange={(enabled) => toggleApp(app.id, enabled)}
            disabled={app.id === currentApp} // Can't remove current app from current app
          />
        ))}
      </section>

      {/* Billing Cycle Toggle */}
      <section className="billing-cycle">
        <h3>Billing Cycle</h3>
        <BillingCycleToggle
          value={billingCycle}
          onChange={setBillingCycle}
          showSavings={selectedApps.length === 3}
        />
      </section>

      {/* Price Preview */}
      {preview && hasChanges && (
        <PricePreviewCard
          preview={preview}
          onConfirm={handleConfirmUpdate}
          isLoading={isUpdating}
        />
      )}

      {/* Cancel Subscription Link */}
      <CancelSubscriptionLink subscription={subscription} />
    </div>
  );
}
```

#### App Toggle Component

```typescript
interface AppToggleProps {
  app: { id: string; name: string; icon: string; description: string };
  isEnabled: boolean;
  isCurrentApp: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function AppToggle({ app, isEnabled, isCurrentApp, onChange, disabled }: AppToggleProps) {
  return (
    <div className={`app-toggle ${isEnabled ? "enabled" : ""} ${disabled ? "disabled" : ""}`}>
      <div className="app-info">
        <img src={app.icon} alt={app.name} />
        <div>
          <h4>{app.name}</h4>
          <p>{app.description}</p>
          {isCurrentApp && <span className="badge">Current App</span>}
        </div>
      </div>

      <Switch
        checked={isEnabled}
        onChange={onChange}
        disabled={disabled}
        aria-label={`Toggle ${app.name}`}
      />

      {!isEnabled && !disabled && (
        <span className="add-price">+ included in bundle</span>
      )}
    </div>
  );
}
```

#### Price Preview Component

```typescript
interface PricePreviewCardProps {
  preview: PricePreview;
  onConfirm: () => void;
  isLoading: boolean;
}

function PricePreviewCard({ preview, onConfirm, isLoading }: PricePreviewCardProps) {
  const isUpgrade = preview.proration.netChange > 0;
  const isDowngrade = preview.proration.netChange < 0;

  return (
    <div className="price-preview-card">
      <h3>Plan Changes</h3>

      {/* What's Changing */}
      <div className="changes-summary">
        <div className="from">
          <span>Current:</span>
          <strong>{preview.currentPlan.apps.length} apps - ${preview.currentPlan.price}/mo</strong>
        </div>
        <div className="to">
          <span>New:</span>
          <strong>{preview.proposedPlan.apps.length} apps - ${preview.proposedPlan.price}/mo</strong>
        </div>
      </div>

      {/* Proration Details */}
      <div className="proration-details">
        {preview.proration.unusedCredit > 0 && (
          <div className="credit">
            <span>Credit for unused time:</span>
            <span>-${preview.proration.unusedCredit.toFixed(2)}</span>
          </div>
        )}

        {isUpgrade && (
          <div className="charge">
            <span>Charge today:</span>
            <span>${preview.proration.immediateCharge.toFixed(2)}</span>
          </div>
        )}

        <div className="net-change">
          <span>Net change:</span>
          <strong className={isUpgrade ? "charge" : "credit"}>
            {isUpgrade ? "+" : "-"}${Math.abs(preview.proration.netChange).toFixed(2)}
          </strong>
        </div>
      </div>

      {/* Savings Message */}
      {preview.savings && preview.savings > 0 && (
        <div className="savings-message">
          You're saving ${preview.savings.toFixed(2)}/month with the bundle!
        </div>
      )}

      {/* Warning for Downgrades */}
      {isDowngrade && preview.proposedPlan.apps.length < preview.currentPlan.apps.length && (
        <div className="downgrade-warning">
          <WarningIcon />
          <p>
            You'll lose access to{" "}
            {preview.currentPlan.apps
              .filter(app => !preview.proposedPlan.apps.includes(app))
              .join(", ")}
            {" "}at the end of your current billing period.
          </p>
        </div>
      )}

      {/* Confirm Button */}
      <button
        className="confirm-button"
        onClick={onConfirm}
        disabled={isLoading}
      >
        {isLoading ? (
          <Spinner />
        ) : isUpgrade ? (
          `Upgrade - Pay $${preview.proration.netChange.toFixed(2)} now`
        ) : (
          "Confirm Changes"
        )}
      </button>

      <p className="fine-print">
        Changes take effect {isUpgrade ? "immediately" : `on ${formatDate(preview.effectiveDate)}`}.
      </p>
    </div>
  );
}
```

### Validation Rules

1. **Minimum Apps:** User must have at least 1 app
2. **Current App Lock:** Can't remove the app you're currently using (must do from different app or marketing site)
3. **Trial Restrictions:** Can't change plan during trial (must wait or convert)
4. **Past Due Restrictions:** Can't upgrade if subscription is past due (must resolve first)
5. **Downgrade Grace Period:** Removed apps accessible until end of billing period

### Error Handling

```typescript
const SUBSCRIPTION_ERRORS = {
  MIN_APPS_REQUIRED: "You must have at least one app in your subscription",
  CANNOT_REMOVE_CURRENT: "Switch to a different app before removing this one",
  TRIAL_RESTRICTION: "Plan changes are available after your trial ends",
  PAST_DUE: "Please update your payment method before making changes",
  STRIPE_ERROR: "Unable to process subscription change. Please try again.",
  PROVISION_FAILED: "Some apps could not be set up. Our team has been notified.",
};
```

---

## Migration Plan

### Phase 0: Preparation (1 week)

1. **Backup Production Data**
   - Export all user tables from each Convex deployment
   - Document current user counts

2. **Create Migration Test Environment**
   - Clone production Convex deployments
   - Create staging marketing site

3. **Identify Existing User Overlap**
   - Query: users with same email across multiple apps
   - Determine which should be linked

### Phase 1: Marketing Site Central Auth (1 week)

1. **Add Central Database**
   - Set up Prisma/Supabase for centralUsers
   - Create migration scripts

2. **Build Signup Flow**
   - Create `/api/auth/signup` endpoint
   - Build signup page with app selection
   - Add session management

3. **Update Checkout Flow**
   - Require signup before checkout (or during)
   - Pre-fill email from session
   - Store user ID in checkout metadata

### Phase 2: App Provision Endpoints (1 week)

1. **SafeTunes**
   - Add `/provisionUser` HTTP endpoint
   - Add `provisionUserInternal` mutation
   - Test locally with dev Convex

2. **SafeTube**
   - Same as SafeTunes

3. **SafeReads**
   - Same but consider OAuth differences

### Phase 3: Webhook Enhancement (3 days)

1. **Update Webhook Handler**
   - Fetch user from centralUsers on payment
   - Call new `/provisionUser` endpoint
   - Maintain backward compatibility with old flow

2. **Add Error Handling**
   - Log provision failures to audit log
   - Send admin alert on failure
   - Implement retry logic

### Phase 4: Testing (1 week)

1. **Integration Testing**
   - End-to-end signup → checkout → provision → login
   - Test all app combinations
   - Test promo codes

2. **Edge Case Testing**
   - Existing user with different passwords per app
   - User with OAuth in one app
   - Partial provision failure recovery

### Phase 5: Migration (2 days)

1. **Deploy to Production**
   - Deploy marketing site changes
   - Deploy Convex function updates

2. **Gradual Rollout**
   - Enable for new signups only initially
   - Monitor for 48 hours
   - Enable full migration

### Phase 6: Existing User Migration - DECISION: NO MIGRATION NEEDED

**Status:** Closed - Decision Made February 12, 2026

#### Analysis: Existing Bundle Purchasers

Users who purchased bundles before unified auth was implemented have:

1. **App accounts created via `/setSubscriptionStatus`** - These users exist in each app's `users` table with their subscription status set correctly.

2. **NO `centralUsers` entries** - They never went through the new signup flow that creates a central account with password hash.

3. **App-specific authentication** - They either:
   - Created their own password in each app separately
   - Used Google OAuth (SafeReads only)
   - Never logged in (received subscription status but didn't complete signup)

#### Migration Options Evaluated

| Option | Approach | Risk | Effort | User Impact |
|--------|----------|------|--------|-------------|
| **A: No Migration** | Existing users continue with app-specific logins | None | None | None |
| B: Opt-in Linking | Email users asking them to create a unified account | Low | Medium | Requires user action |
| C: Auto-migration | Programmatically create centralUsers from app data | High | High | Forced password reset |

#### Decision: Option A - No Migration Required

**Rationale:**

1. **Existing users keep working perfectly** - Their app-specific logins are unaffected by the new unified auth system.

2. **Technical limitation prevents Option C** - We cannot extract password hashes from Convex Auth's `authAccounts` table. The hashes are stored using Scrypt (Lucia library) and there's no API to read them out. Auto-migration would require forcing all users to reset their passwords.

3. **Low user volume** - The number of existing bundle purchasers is small (< 50 users as of February 2026). The operational complexity of a migration outweighs the benefits.

4. **Graceful fallback already implemented** - The webhook automatically detects whether a user has a `centralUser` entry:
   - If yes: Uses new `/provisionUser` flow (with password hash)
   - If no: Falls back to legacy `/setSubscriptionStatus` flow

5. **Future unified experience** - If a legacy user cancels and later re-subscribes through the marketing site, they'll naturally go through the new signup flow and get a `centralUser` entry.

#### Code Reference

The fallback logic is in `/sites/marketing/src/app/api/stripe/webhook/route.ts`:

```typescript
// Lines 371-378
} else {
  // Fall back to legacy flow (no password hash available)
  // This happens for:
  // 1. Users who signed up before unified auth was implemented
  // 2. Users who went directly to Stripe checkout without creating a central account
  console.log(`[grantAppAccess] UNIFIED_AUTH enabled but no centralUser - falling back to LEGACY flow for ${email}`);
  return grantAppAccessLegacy(email, apps, status);
}
```

#### Future Considerations

If business requirements change and migration becomes necessary:

1. **Opt-in approach recommended** - Send email to affected users with a link to "Upgrade to Unified Login"
2. **Create a `/migrate-account` page** on the marketing site
3. **User sets a new password** during migration (required since we can't read existing hashes)
4. **Provision to all apps** with the new password hash

For now, this is not needed and would add unnecessary complexity.

---

## User Communication Plan

**Status:** Complete - No Communication Required
**Decision Date:** February 12, 2026

Since we chose Option A (No Migration) for existing users, there is no user communication campaign required. This section documents the decision and provides guidance for future consideration.

### Summary

| User Segment | Current Experience | Communication | Action Required |
|--------------|-------------------|---------------|-----------------|
| **Existing bundle purchasers** | App-specific logins work | None | None |
| **Existing individual app users** | App-specific logins work | None | None |
| **New users (post-unified-auth)** | Unified auth automatically | None | Uses new flow by default |

### Why No Communication Is Needed

1. **No Forced Migration**
   - Existing users continue using their current logins
   - No passwords are being reset or changed
   - No accounts are being merged or modified

2. **Transparent Transition**
   - New unified auth only affects users who sign up through the marketing site after implementation
   - Existing users are completely unaware of the change
   - Both old and new flows coexist without conflict

3. **No User Action Required**
   - Unlike typical migrations, users don't need to "do" anything
   - No "please update your password" emails
   - No "confirm your account" workflows

### In-App Messaging: Not Recommended

We evaluated adding in-app messaging to inform existing users about unified login. **Recommendation: Do NOT implement.**

**Reasons:**

| Consideration | Analysis |
|---------------|----------|
| User benefit | Minimal - saving one password vs multiple is a minor convenience |
| User confusion | High - "Why am I being asked to change my password?" |
| Support load | Would generate tickets from confused users |
| Development cost | Significant - UI, migration flow, testing |
| User base size | Small (< 50 existing bundle users) |
| ROI | Negative - cost exceeds benefit |

**If we ever reconsider:**

A future "Opt-in Unified Login" feature could include:
1. Banner in Settings page: "Use the same login across all Safe Family apps"
2. Link to `/migrate-account` on marketing site
3. User creates a new unified password
4. New password syncs to all entitled apps
5. User's old app-specific logins stop working

**Triggers to reconsider:**
- User base exceeds 1,000 active users
- Multiple users request unified login via support
- Business acquires another app that needs integration
- Partnership requires SSO capabilities

### Email Templates (Not Needed, But Documented)

If circumstances change and communication becomes necessary, here are template outlines:

#### Template A: Informational Only (No Action Required)

```
Subject: Safe Family Update - Nothing You Need to Do

Hi [Name],

We've made some behind-the-scenes improvements to how Safe Family accounts work.

The good news? You don't need to do anything. Your existing login continues
to work exactly as before.

What changed:
- New users who sign up now can use one password across all Safe Family apps
- Your existing login is unaffected

Questions? Reply to this email.

- The Safe Family Team
```

#### Template B: Opt-In Migration (If Ever Implemented)

```
Subject: Simplify Your Safe Family Login

Hi [Name],

You can now use a single login across all Safe Family apps!

Currently, you might have different passwords for SafeTunes, SafeTube, and
SafeReads. We can unify these into one login.

[Upgrade to Unified Login]

What happens:
- You choose a new password
- That password works on ALL your Safe Family apps
- Your app data and settings remain unchanged

This is completely optional. Your current logins will continue to work if
you prefer not to change anything.

- The Safe Family Team
```

### Support Playbook

If existing users contact support about login issues:

| Scenario | Response |
|----------|----------|
| "I can't login to SafeTunes" | Check if user exists in app's admin dashboard. If yes, use password reset flow. If no, check if they have a subscription. |
| "Why do I have different passwords?" | "If you signed up for each app separately, they have independent accounts. This is by design and you can continue using them this way." |
| "Can I use one password for everything?" | "Currently, each app has its own login. We're working on unified login for new users, but existing accounts aren't affected. You can use password reset to set the same password on multiple apps if you'd like." |
| "I bought the bundle but can't login" | Check webhook logs. If subscription status shows active but user can't login, they may have never completed signup. Guide them through password reset or account creation. |

### Metrics to Monitor

Even without a communication campaign, track these metrics to ensure the non-migration approach is working:

1. **Support ticket volume** - Should remain stable
2. **Login failure rate** - Should not increase
3. **Password reset requests** - Should not spike
4. **User complaints about "can't login"** - Track and categorize

If any metric shows an unexpected increase, investigate whether the unified auth changes are causing confusion despite no direct communication.

---

## Rollback Plan

This section provides comprehensive rollback procedures and a runbook for handling issues with the unified authentication system in production.

### Triggers for Rollback

- Webhook success rate drops below 95%
- Login success rate drops below 90%
- Multiple user complaints about lost access
- Security incident detected
- Auth errors spike in Sentry
- Password verification failures increase

---

### Immediate Rollback (< 5 minutes)

The fastest way to revert to the old behavior is via the feature flag.

#### Step 1: Disable Feature Flag

```bash
# In Vercel Dashboard or CLI:
# Set ENABLE_UNIFIED_AUTH=false

# Via Vercel CLI:
vercel env rm ENABLE_UNIFIED_AUTH production
vercel env add ENABLE_UNIFIED_AUTH production
# Enter: false

# Or via Dashboard:
# 1. Go to https://vercel.com/your-team/safe-family-marketing/settings/environment-variables
# 2. Find ENABLE_UNIFIED_AUTH
# 3. Change value to "false"
```

#### Step 2: Redeploy Marketing Site

```bash
# Trigger a redeploy to pick up the env var change
cd ~/safecontent/sites/marketing
vercel --prod

# Or from Vercel Dashboard:
# Deployments → Latest → "..." → Redeploy
```

#### Step 3: Verify Rollback

```bash
# Test that old flow is active
curl -X POST https://getsafefamily.com/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "checkout.session.completed", "data": {"object": {"customer_email": "test@test.com"}}}'

# Should use /setSubscriptionStatus (old flow), not /provisionUser (new flow)
# Check Vercel logs to confirm
```

**Result:** System immediately reverts to the old subscription provisioning behavior. Users can still purchase and will be provisioned via the legacy `/setSubscriptionStatus` endpoint (without credentials - they'll need to create accounts manually).

---

### Data Rollback Considerations

#### What Happens to Data After Rollback

| Data | Location | Rollback Impact |
|------|----------|-----------------|
| `centralUsers` table | Marketing site DB | **Can be ignored** - Apps still work independently |
| `authAccounts` entries | Each app's Convex | **No need to delete** - Won't cause issues |
| `users` table entries | Each app's Convex | **Preserved** - Users keep access |
| Stripe subscriptions | Stripe | **Unchanged** - Billing continues normally |

#### Key Points

1. **centralUsers table can be safely ignored**
   - Apps function independently without central auth
   - The table just sits there unused until re-enabled
   - No cleanup required

2. **No need to delete authAccounts entries**
   - Extra entries in authAccounts don't hurt anything
   - Users who were provisioned via unified auth retain login ability
   - Legacy users created after rollback will create their own authAccounts

3. **Users created during unified auth period**
   - These users WILL be able to login (their authAccounts exist)
   - If they need to reset password, the standard app reset flow works
   - No manual intervention needed unless password sync issues occurred

#### Manual Password Reset (if needed)

If a user was created during unified auth and needs a password reset:

```bash
# The user can use the standard "Forgot Password" flow in any app
# OR an admin can manually trigger a reset:

# 1. Get the user's email
EMAIL="user@example.com"

# 2. User goes to app login page → "Forgot Password"
# 3. Receives reset email via Resend
# 4. Sets new password (creates new authAccounts.secret)
```

---

### Monitoring Checklist

After rollback (or during incident), verify these metrics:

#### 1. Check Sentry for Auth Errors

```bash
# Sentry Dashboard: https://safetunes.sentry.io/projects/safe-family-marketing/

# Look for:
# - "PROV001" through "PROV006" errors (provisioning failures)
# - "SYNC001" through "SYNC003" errors (password sync failures)
# - 401/403 errors on /provisionUser endpoints
# - bcrypt/scrypt verification failures
```

**Key Error Patterns:**
- `Error: Invalid password hash format` - Hash mismatch issue
- `Error: authAccounts insert failed` - Database write issue
- `Error: User already exists with different provider` - Account conflict

#### 2. Check Stripe Webhook Success Rate

```bash
# Stripe Dashboard: https://dashboard.stripe.com/webhooks

# 1. Go to Developers → Webhooks
# 2. Click on the getsafefamily.com webhook endpoint
# 3. Check "Recent events" tab
# 4. Look for failed deliveries (red X)

# Target: > 99% success rate
# Alert threshold: < 95%
```

**What to Look For:**
- HTTP 500 responses (server errors)
- HTTP 504 responses (timeouts)
- Retry attempts (indicates initial failures)

#### 3. Check App Login Success Rates

```bash
# For each app, check Convex dashboard logs

# SafeTunes:
# https://dashboard.convex.dev/d/formal-chihuahua-623/logs

# SafeTube:
# https://dashboard.convex.dev/d/rightful-rabbit-333/logs

# SafeReads:
# https://dashboard.convex.dev/d/exuberant-puffin-838/logs

# Search for:
# - "signIn" function calls
# - "InvalidPassword" errors
# - "AccountNotFound" errors
```

#### 4. Monitor Support Tickets

- Check support email: jeremiah@getsafefamily.com
- Check for patterns: same error, same time, same app
- Escalate if > 3 tickets about same issue in 1 hour

---

### Runbook for Common Issues

#### Issue 1: "User can't login after purchase"

**Symptoms:**
- User completed checkout (payment successful)
- User received confirmation email
- User cannot login to any app
- Error: "Invalid email or password" or "Account not found"

**Diagnosis:**

```bash
# 1. Check if user exists in the app
# Go to Convex dashboard → Data → users table
# Search for user's email

# 2. Check if authAccounts entry exists
# Data → authAccounts table
# Filter by: provider = "password" AND providerAccountId = "user@email.com"

# 3. Check centralUsers (if unified auth was active)
# Query marketing site database for the email
```

**Resolution:**

```bash
# Option A: If authAccounts entry is missing
# Manually provision the user using admin endpoint

# Get admin key
KEY=$(CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex env list 2>/dev/null | grep ADMIN_KEY | cut -d= -f2)
ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$KEY'))")

# For SafeTunes:
curl "https://formal-chihuahua-623.convex.site/setSubscriptionStatus?email=USER_EMAIL&status=active&key=$ENCODED"

# Tell user to use "Forgot Password" to set their password

# Option B: If user record exists but no authAccount
# User must go through "Sign Up" flow in the app
# This will create the authAccount entry
# Then admin sets their subscription status
```

---

#### Issue 2: "Webhook timeout"

**Symptoms:**
- Stripe shows webhook delivery failures
- HTTP 504 timeout errors
- User payment succeeded but wasn't provisioned

**Diagnosis:**

```bash
# 1. Check Vercel function logs
# https://vercel.com/your-team/safe-family-marketing/logs

# 2. Check which app is slow/down
# Try hitting each app's health endpoint:
curl -w "%{time_total}s\n" "https://formal-chihuahua-623.convex.site/health"
curl -w "%{time_total}s\n" "https://rightful-rabbit-333.convex.site/health"
curl -w "%{time_total}s\n" "https://exuberant-puffin-838.convex.site/health"

# 3. Check Convex status: https://status.convex.dev/
```

**Resolution:**

```bash
# 1. If one app is down, manually provision once it's back:
curl "https://[APP].convex.site/setSubscriptionStatus?email=USER_EMAIL&status=active&key=$ENCODED"

# 2. If Convex is having issues, wait and retry webhook:
# Stripe Dashboard → Webhooks → Failed event → "Resend"

# 3. For immediate user access, manually provision:
# Use the admin dashboard or curl commands above

# 4. If timeouts persist, check if circuit breaker is open:
# The webhook has 5s timeout per app with 3 retries
# Check Upstash logs for rate limiting
```

---

#### Issue 3: "Password mismatch" / User can't login but account exists

**Symptoms:**
- User can see their account exists (email recognized)
- Password they entered doesn't work
- They haven't changed their password

**Diagnosis:**

```bash
# 1. Verify the password hash format in authAccounts
# Go to Convex dashboard → Data → authAccounts
# Find the user's entry (providerAccountId = email)
# Check the "secret" field

# Correct Scrypt hash starts with: $scrypt$ or is a long base64 string
# Correct bcrypt hash starts with: $2a$ or $2b$

# If hash looks malformed or truncated, that's the issue
```

**Resolution:**

```bash
# Option A: Have user reset password
# 1. User clicks "Forgot Password" in app
# 2. Receives reset email
# 3. Sets new password
# 4. New hash is stored correctly

# Option B: Admin force-resets (if email not working)
# 1. Delete the authAccounts entry for this user
# 2. Have user go through "Sign Up" flow
# 3. They'll create fresh credentials
# 4. Admin sets subscription status

# Option C: If Scrypt/bcrypt mismatch (hash format issue)
# This requires code fix - the marketing site and apps must use same hash algorithm
# Temporary fix: have all affected users reset passwords
```

---

#### Issue 4: "Partial provisioning failure"

**Symptoms:**
- User can access some apps but not others
- Webhook logs show partial success

**Diagnosis:**

```bash
# 1. Check which apps succeeded
# Vercel logs will show individual provision results

# 2. Check each app's user table
# Does user exist in SafeTunes? SafeTube? SafeReads?

# 3. Check Sentry for specific error on failed app
```

**Resolution:**

```bash
# Manually provision the failed app(s):

# For SafeTunes:
curl "https://formal-chihuahua-623.convex.site/setSubscriptionStatus?email=USER_EMAIL&status=active&key=$ENCODED"

# For SafeTube:
curl "https://rightful-rabbit-333.convex.site/setSubscriptionStatus?email=USER_EMAIL&status=active&key=$ENCODED"

# For SafeReads:
curl "https://exuberant-puffin-838.convex.site/grantLifetime?email=USER_EMAIL&key=$ENCODED"
# (SafeReads uses different endpoint name)

# User will need to "Sign Up" in failed app to create auth credentials
# Or use "Forgot Password" if account was created without authAccounts
```

---

#### Issue 5: "User has different passwords in different apps"

**Symptoms:**
- User can login to SafeTunes with password A
- User can login to SafeTube with password B
- This happened before unified auth was enabled

**Resolution:**

This is expected for legacy users. Options:

1. **User chooses one password:**
   - Have user reset password in ALL apps to the same value
   - They can do this via "Forgot Password" in each app

2. **Wait for migration:**
   - When unified auth migrates existing users (Phase 6)
   - They'll be prompted to set a single password

3. **Keep as-is:**
   - Users can continue with different passwords per app
   - Not ideal but functional

---

### Emergency Contacts

| Role | Contact | When to Escalate |
|------|---------|------------------|
| Owner | jedaws@gmail.com | Security incidents, data loss, 10+ affected users |
| Convex Support | support@convex.dev | Convex-specific issues, database problems |
| Stripe Support | https://support.stripe.com/ | Payment/webhook issues |
| Vercel Support | https://vercel.com/support | Deployment, function issues |

---

### Post-Incident Checklist

After resolving an incident:

- [ ] All affected users can now login
- [ ] Stripe webhooks are succeeding (> 99%)
- [ ] Sentry error rate has returned to baseline
- [ ] Document what happened in `/admin/audit-logs`
- [ ] Update this runbook if new issue type discovered
- [ ] Consider if rollback can be un-done (re-enable unified auth)
- [ ] Send communication to affected users if > 5 impacted

---

## Gaps and Risks

### High Priority Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Convex Auth internals change | Auth breaks | Low | Pin Convex Auth version, test on upgrade |
| Password hash format mismatch | Login fails | Medium | Validate hash format before provision |
| Partial provision failure | Some apps inaccessible | Medium | Retry logic, admin alerts, manual fix endpoint |
| Existing user account conflict | Data loss | Medium | Merge strategy, preserve both accounts |

### Security Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Admin key leaked | Unauthorized provisions | IP allowlist, key rotation, audit logs |
| Password hash interception | Account takeover | HTTPS only, bcrypt resistant to brute force |
| SSRF via provision endpoint | Internal access | Validate request origin, rate limit |

### Technical Gaps

1. **Convex Auth Table Access**
   - Need to verify we can write to `authAccounts` directly
   - May require internal mutation or custom auth handler
   - Fallback: Extend Convex Auth with custom password provider

2. **Session Sync**
   - Marketing site session doesn't carry to apps
   - User must login to each app separately
   - Consider: JWT-based SSO for seamless experience

3. **Google OAuth Handling**
   - Central signup is password-only currently
   - Users with only Google OAuth in apps can't be provisioned
   - Consider: Add Google OAuth to central auth

4. **Trial Expiration Sync**
   - Trial dates may differ between central and apps
   - Need single source of truth
   - Recommend: Central controls, apps check via verifyCentralAccess

---

## Edge Cases

### 1. User Upgrades/Downgrades Apps

**Scenario:** User has 1-app bundle, upgrades to 3-app bundle

**Flow:**
1. User initiates upgrade in Stripe portal or via checkout
2. Webhook receives `customer.subscription.updated`
3. Parse new `apps` metadata
4. Provision newly entitled apps
5. Existing app status unchanged

**Code:**
```typescript
// In webhook handler
case "customer.subscription.updated": {
  const newApps = parseAppsFromMetadata(subscription.metadata);
  const previousApps = parseAppsFromMetadata(previousAttributes?.metadata);

  const appsToProvision = newApps.filter(app => !previousApps.includes(app));
  const appsToRevoke = previousApps.filter(app => !newApps.includes(app));

  // Provision new apps with existing credentials
  for (const app of appsToProvision) {
    await provisionUser(email, passwordHash, app, "active");
  }

  // Revoke access to removed apps
  for (const app of appsToRevoke) {
    await setSubscriptionStatus(email, app, "inactive");
  }
}
```

### 2. Password Changed on One App

**Scenario:** User changes password in SafeTunes, expects it to work in SafeTube

**Flow:**
1. SafeTunes receives password change request
2. Hashes new password, updates local authAccounts
3. Calls central `/api/auth/sync-password`
4. Central updates centralUsers, calls other apps' `/updatePassword`
5. All apps now have new hash

**Handling Conflicts:**
- Last write wins (most recent timestamp)
- Audit log tracks all password changes
- Admin can manually resolve if needed

### 3. User Already Has Separate Accounts

**Scenario:** jedaws@gmail.com exists in SafeTunes AND SafeTube with DIFFERENT passwords

**Detection:**
```typescript
// Migration script
for (const email of allEmails) {
  const accounts = await Promise.all([
    safetunes.getUserByEmail(email),
    safetube.getUserByEmail(email),
    safereads.getUserByEmail(email),
  ]);

  const existingAccounts = accounts.filter(Boolean);
  if (existingAccounts.length > 1) {
    // Flag for manual review
    console.log(`Conflict: ${email} exists in ${existingAccounts.length} apps`);
  }
}
```

**Resolution Options:**
1. **Keep Newest:** Use most recently created account's password
2. **Keep Active:** Use account with active subscription
3. **User Choice:** Email user to choose which password to keep
4. **Force Reset:** Require password reset on next login

### 4. One App Provision Fails

**Scenario:** SafeTunes and SafeTube provision succeed, SafeReads fails

**Current Behavior:**
- Webhook returns 500 (causes Stripe retry)
- User has partial access

**Improved Behavior:**
```typescript
const results = await Promise.allSettled([
  provisionToSafeTunes(email, hash, apps.includes("safetunes")),
  provisionToSafeTube(email, hash, apps.includes("safetube")),
  provisionToSafeReads(email, hash, apps.includes("safereads")),
]);

const failed = results.filter(r => r.status === "rejected");

if (failed.length > 0) {
  // Log failed provisions
  await logProvisionFailure(email, failed);

  // Alert admin
  await sendProvisionFailureAlert(email, failed);

  // Still return 200 - user has partial access
  // Admin will fix manually
  return NextResponse.json({
    success: true,
    partialFailure: true,
    failedApps: failed.map(f => f.reason.app),
  });
}
```

### 5. User Signs Up Directly on App (Bypass Marketing Site)

**Scenario:** User goes directly to getsafetunes.com and signs up there

**Current Behavior:** Works fine, app-local account created

**New Behavior:**
- App signup should sync TO central (reverse direction)
- On successful app signup, call central `/api/auth/sync-user`
- Central creates record, ready for future bundle upgrade

**OR:**
- Disable direct signup on apps
- All signups go through marketing site
- Apps only allow login (not signup)

---

## Testing Strategy

### Unit Tests

```typescript
// test/provisionUser.test.ts
describe("provisionUser", () => {
  it("creates new user with auth account", async () => {
    const result = await provisionUserInternal({
      email: "test@example.com",
      passwordHash: "$2a$12$...",
      name: "Test User",
      subscriptionStatus: "active",
      entitledToThisApp: true,
    });

    expect(result.success).toBe(true);
    expect(result.provisioned).toBe(true);
    expect(result.authAccountCreated).toBe(true);
  });

  it("updates existing user, creates auth account", async () => {
    // First, create user without auth
    await createUser({ email: "existing@example.com" });

    const result = await provisionUserInternal({
      email: "existing@example.com",
      passwordHash: "$2a$12$...",
      subscriptionStatus: "active",
      entitledToThisApp: true,
    });

    expect(result.provisioned).toBe(false);
    expect(result.updated).toBe(true);
    expect(result.authAccountCreated).toBe(true);
  });

  it("handles non-entitled app correctly", async () => {
    const result = await provisionUserInternal({
      email: "notentitled@example.com",
      passwordHash: "$2a$12$...",
      subscriptionStatus: "active",
      entitledToThisApp: false,
    });

    const user = await getUserByEmail("notentitled@example.com");
    expect(user.subscriptionStatus).toBe("inactive");
  });
});
```

### Integration Tests

```typescript
// test/e2e/signup-checkout.test.ts
describe("Full Signup → Checkout → Login Flow", () => {
  it("allows login after bundle purchase", async () => {
    // 1. Sign up on marketing site
    const signupResponse = await fetch("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "e2e-test@example.com",
        password: "TestPassword123!",
        name: "E2E Test",
        selectedApps: ["safetunes", "safetube"],
      }),
    });
    expect(signupResponse.ok).toBe(true);

    // 2. Simulate Stripe webhook
    await simulateStripeWebhook("checkout.session.completed", {
      customer_email: "e2e-test@example.com",
      metadata: { apps: "safetunes,safetube" },
    });

    // 3. Attempt login on SafeTunes
    const loginResponse = await safeTunesClient.signIn({
      email: "e2e-test@example.com",
      password: "TestPassword123!",
    });
    expect(loginResponse.success).toBe(true);

    // 4. Verify subscription status
    const user = await safeTunesClient.getCurrentUser();
    expect(user.subscriptionStatus).toBe("active");
  });
});
```

### Manual Testing Checklist

- [ ] Sign up with new email → checkout → login to SafeTunes
- [ ] Sign up with new email → checkout → login to SafeTube
- [ ] Sign up with new email → checkout → login to SafeReads
- [ ] Use promo code DAWSFRIEND → verify lifetime on all apps
- [ ] Change password in SafeTunes → verify works in SafeTube
- [ ] Upgrade from 1-app to 3-app → verify new apps accessible
- [ ] Downgrade from 3-app to 1-app → verify removed apps inaccessible
- [ ] Attempt login before checkout completes → verify appropriate error
- [ ] Simulate webhook failure → verify admin alert sent
- [ ] Verify existing users not affected by deployment

---

## Appendix A: Convex Auth Deep Dive

### How Convex Auth Password Provider Works

1. **User Registration (signUp):**
   ```typescript
   // Convex Auth internally does:
   const userId = await ctx.db.insert("users", { email, name });
   const hash = await bcrypt.hash(password, 10);
   await ctx.db.insert("authAccounts", {
     userId,
     provider: "password",
     providerAccountId: email.toLowerCase(),
     secret: hash,
   });
   ```

2. **User Login (signIn):**
   ```typescript
   // Convex Auth internally does:
   const account = await ctx.db
     .query("authAccounts")
     .withIndex("providerAndAccountId", q =>
       q.eq("provider", "password").eq("providerAccountId", email.toLowerCase())
     )
     .first();

   if (!account) throw new Error("Account not found");

   const valid = await bcrypt.compare(password, account.secret);
   if (!valid) throw new Error("Invalid password");

   // Create session...
   ```

### Why Current Provisioning Doesn't Work

The current `/setSubscriptionStatus` endpoint only creates/updates the `users` table:

```typescript
// Current implementation
if (!user) {
  userId = await ctx.db.insert("users", {
    email: args.email,
    subscriptionStatus: args.status,
  });
}
```

**Missing step:** Creating the `authAccounts` entry. Without this, `signIn` fails because there's no password to compare against.

### Solution: Provision Auth Account Too

```typescript
// New implementation
if (!user) {
  userId = await ctx.db.insert("users", { email, ... });
}

// CRITICAL: Also create auth account
const existingAuth = await ctx.db
  .query("authAccounts")
  .filter(q => q.eq(q.field("userId"), userId))
  .first();

if (!existingAuth) {
  await ctx.db.insert("authAccounts", {
    userId,
    provider: "password",
    providerAccountId: email.toLowerCase(),
    secret: passwordHash, // From central auth
  });
}
```

---

## Appendix B: Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| PROV001 | User already exists with different provider | Link accounts or force password auth |
| PROV002 | Password hash format invalid | Check bcrypt format ($2a$12$...) |
| PROV003 | Admin key invalid | Verify ADMIN_KEY matches |
| PROV004 | Email validation failed | Check email format |
| PROV005 | Database insert failed | Check Convex logs, retry |
| PROV006 | Family code generation exhausted | Increase code length or retry |
| SYNC001 | Password sync source unverified | Check admin key in request |
| SYNC002 | Target app unreachable | Check app endpoint, retry later |
| SYNC003 | Conflict: different hash in target | Last-write-wins or manual resolve |

---

## Appendix C: Monitoring and Alerting

### Key Metrics to Track

1. **Provision Success Rate**
   - Target: > 99%
   - Alert threshold: < 95%

2. **Provision Latency**
   - Target: < 2s per app
   - Alert threshold: > 5s

3. **Login Success Rate Post-Provision**
   - Target: > 99%
   - Alert threshold: < 95%

### Log Format

```json
{
  "event": "user_provisioned",
  "timestamp": "2026-02-12T10:30:00Z",
  "email": "user@example.com",
  "app": "safetunes",
  "success": true,
  "duration_ms": 450,
  "provisioned": true,
  "authAccountCreated": true
}
```

### Sentry Integration

```typescript
captureProvisioningEvent({
  email,
  app,
  success,
  error: error?.message,
  latency,
});
```

---

## Appendix D: Implementation Beads Summary

The following beads (issues) have been created in the project tracker to implement unified authentication.

### Epic

- **safecontent-i5w** [EPIC] - Unified Authentication Across Safe Family Apps

### P1 Tasks (Core Implementation)

| Bead ID | Title | Description |
|---------|-------|-------------|
| safecontent-i5w.1 | Create centralUsers database table | Add Prisma schema for central user storage |
| safecontent-i5w.2 | Build user signup API endpoint | POST /api/auth/signup with password hashing |
| safecontent-i5w.3 | Create signup page UI | Marketing site signup form |
| safecontent-i5w.4 | Add /provisionUser to SafeTunes | HTTP endpoint + internal mutation |
| safecontent-i5w.5 | Add /provisionUser to SafeTube | HTTP endpoint + internal mutation |
| safecontent-i5w.6 | Add /provisionUser to SafeReads | HTTP endpoint + internal mutation |
| safecontent-i5w.7 | Update Stripe webhook | Use new provision flow with credentials |
| safecontent-i5w.13 | Add feature flag | Gradual rollout toggle |
| safecontent-i5w.19 | Document rollback procedures | Runbook for production issues |
| safecontent-i5w.21 | Verify Convex Auth authAccounts | Confirm we can write to auth tables |

### P1 Tasks (Upgrade/Downgrade Flow)

| Bead ID | Title | Description |
|---------|-------|-------------|
| safecontent-i5w.24 | GET /api/subscription/current | Return user's current subscription details for Settings UI |
| safecontent-i5w.25 | POST /api/subscription/preview | Preview price changes before confirming |
| safecontent-i5w.26 | POST /api/subscription/update (backend) | Update subscription apps and billing cycle via Stripe |
| safecontent-i5w.27 | Webhook: subscription.updated handler | Provision/revoke apps on subscription changes |
| safecontent-i5w.28 | /revokeAccess endpoint (all apps) | Set user status to inactive when app removed |
| safecontent-i5w.29 | Stripe price IDs setup | Create bundle price IDs for 1-app and 2-app plans |

### P2 Tasks (Secondary/Enhancement)

| Bead ID | Title | Description |
|---------|-------|-------------|
| safecontent-i5w.8 | Implement password sync | Sync password changes across apps |
| safecontent-i5w.9 | Handle upgrade/downgrade | App entitlement changes |
| safecontent-i5w.10 | Add 'inactive' status UI | Show upgrade prompt for non-entitled apps |
| safecontent-i5w.11 | Migrate existing purchasers | Convert existing users to unified auth |
| safecontent-i5w.12 | Handle account conflicts | Same email, different passwords |
| safecontent-i5w.14 | Write integration tests | E2E test coverage |
| safecontent-i5w.17 | Add monitoring/alerting | Sentry + dashboard metrics |
| safecontent-i5w.18 | Create admin provision tool | Manual provisioning UI |
| safecontent-i5w.20 | Handle direct app signup | Decide: redirect vs sync |
| safecontent-i5w.22 | Add rate limiting | Protect provision endpoints |
| safecontent-i5w.23 | User communication plan | Migration email templates |

### P2 Tasks (Settings UI)

| Bead ID | Title | Description |
|---------|-------|-------------|
| safecontent-i5w.30 | SubscriptionManager component (SafeTunes) | Settings page UI for managing subscription |
| safecontent-i5w.31 | SubscriptionManager component (SafeTube) | Port from SafeTunes with app-specific styling |
| safecontent-i5w.32 | SubscriptionManager component (SafeReads) | Port from SafeTunes, adjust for Next.js |
| safecontent-i5w.33 | AppToggle component | Toggle switch for adding/removing apps |
| safecontent-i5w.34 | BillingCycleToggle component | Monthly/yearly toggle with savings display |
| safecontent-i5w.35 | PricePreviewCard component | Shows proration and confirms changes |
| safecontent-i5w.36 | Integration tests - upgrade/downgrade | E2E tests for plan changes |

### P3 Tasks (Future/Nice-to-Have)

| Bead ID | Title | Description |
|---------|-------|-------------|
| safecontent-i5w.15 | Add Google OAuth support | OAuth in central auth |
| safecontent-i5w.16 | Implement SSO | Cross-app session sharing |

### Related Issues

| Bead ID | Title | Description |
|---------|-------|-------------|
| safecontent-44m | Fix promo signup | Bug - promo users can't login |

### Implementation Order

**Phase 1: Foundation (Week 1)**
1. safecontent-i5w.21 - Verify Convex Auth (MUST DO FIRST - blocking risk)
2. safecontent-i5w.1 - Create centralUsers table
3. safecontent-i5w.2 - Build signup API
4. safecontent-i5w.3 - Create signup UI

**Phase 2: App Endpoints (Week 1-2)**
5. safecontent-i5w.4 - SafeTunes /provisionUser
6. safecontent-i5w.5 - SafeTube /provisionUser
7. safecontent-i5w.6 - SafeReads /provisionUser
8. safecontent-i5w.28 - /revokeAccess endpoint (all apps)

**Phase 3: Core Integration (Week 2)**
9. safecontent-i5w.7 - Update webhook
10. safecontent-i5w.13 - Feature flag
11. safecontent-i5w.19 - Rollback docs

**Phase 4: Upgrade/Downgrade Backend (Week 3)**
12. safecontent-i5w.29 - Stripe price IDs setup
13. safecontent-i5w.24 - GET /api/subscription/current
14. safecontent-i5w.25 - POST /api/subscription/preview
15. safecontent-i5w.26 - POST /api/subscription/update
16. safecontent-i5w.27 - Webhook: subscription.updated handler

**Phase 5: Settings UI (Week 3-4)**
17. safecontent-i5w.33 - AppToggle component
18. safecontent-i5w.34 - BillingCycleToggle component
19. safecontent-i5w.35 - PricePreviewCard component
20. safecontent-i5w.30 - SubscriptionManager (SafeTunes)
21. safecontent-i5w.31 - SubscriptionManager (SafeTube)
22. safecontent-i5w.32 - SubscriptionManager (SafeReads)

**Phase 6: Testing & Launch (Week 4)**
23. safecontent-i5w.14 - Integration tests (auth flow)
24. safecontent-i5w.36 - Integration tests (upgrade/downgrade)
25. safecontent-i5w.17 - Monitoring/alerting

**Phase 7: Migration (Week 5)**
26. safecontent-i5w.11 - Migrate existing users (CLOSED - No migration needed)
27. safecontent-i5w.23 - User communications (CLOSED - No communication needed)

---

*Document Version: 1.4*
*Last Updated: February 12, 2026*
*Status: Draft - Includes Upgrade/Downgrade Flow, Rollback Procedures, and User Communication Plan*

See also: [UNIFIED-AUTH-BEADS.md](./UNIFIED-AUTH-BEADS.md) for detailed implementation tasks.
