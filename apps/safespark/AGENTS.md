<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# SafeSpark — Safe Family Platform Member

SafeSpark is part of the Safe Family lineup. Companion apps live in
`~/Projects/safecontent/apps/` (safetunes, safetube, safereads, safeseek).

## Platform contract

Same shape as the sibling apps:

| Item | SafeSpark value |
|------|-----------------|
| Domain | `getsafespark.com` |
| Convex prod | `giddy-peacock-124` |
| Convex site URL | `giddy-peacock-124.convex.site` |
| Shared admin key env | `SAFESPARK_ADMIN_KEY` (matches the shared family key) |
| Family code alphabet | `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (6 chars) |
| Subscription status enum | `trial | active | lifetime | cancelled | expired` |

## HTTP admin endpoints

All take `?key=$SAFESPARK_ADMIN_KEY`. Same shape as SafeTunes/SafeReads.

```bash
KEY="$(python3 -c 'import urllib.parse; print(urllib.parse.quote("YOUR_KEY"))')"
BASE="https://giddy-peacock-124.convex.site"

curl "$BASE/adminDashboard?key=$KEY"
curl "$BASE/grantLifetime?email=foo@example.com&key=$KEY"
curl "$BASE/setSubscriptionStatus?email=foo@example.com&status=trial&key=$KEY"
curl "$BASE/syncFamilyCode?email=foo@example.com&code=ABCD23&key=$KEY"
curl "$BASE/deleteUser?email=foo@example.com&key=$KEY"
```

## Identity model

- **Parent** = Clerk signup, role `parent`. Owns one family.
- **Kid** = picks profile from `/start` after entering parent's family code.
  No Clerk account; identified by `lumiKidSession` token in localStorage.
  Convex calls use `sessionToken` arg; rows scope to synthetic
  `clerkUserId = "kid:<kidProfileId>"`.

## Public routes

| Path | Purpose |
|------|---------|
| `/` | Marketing landing |
| `/make` | The maker (canonical) |
| `/lumi`, `/demo`, `/spark` | Legacy aliases — redirect to `/make` |
| `/start` | Family-code entry (kid OR parent self-profile) |
| `/parent` | Parent dashboard (family code, profiles, usage, cap meter) |
| `/parent/setup` | Add/edit profiles |
| `/parent/profile/[id]` | Per-profile drill-down (full project gallery + usage + recent prompts) |
| `/s/[id]` | Public project share viewer (serves live HTML from source project) |
| `/admin/spark` | Operator-only prompt log (gated by `PARENT_EMAIL`) |

## Trainer (stripped)

The old BELLA trainer routes (`/chat`, `/learn`, `/literacy`, `/journey`,
`/studio`, `/apis`, `/build`, `/claim`) and their Convex backends have
been removed from the bundle. They now redirect to `/` via
`next.config.ts`. Restore point: the BELLA archive repo at
`~/Projects/BELLA/` carries the full pre-strip history, tagged
`archive/pre-trainer-strip`.

## spark.db SDK

Kid-built projects can persist shared state across visitors via a
`window.spark.db` SDK injected at render time. Backed by Convex's
`sparkProjectData` table, scoped per project. Use for leaderboards,
message walls, shared counters. Caps: 4 KB per value, 200 keys per
project, arrays capped at 500 items.
