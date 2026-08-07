# @safefamily/ui

Shared UI package for the Safe Family suite (SafeTunes, SafeTube, SafeReads,
SafeStudy). Extracted components live here to eliminate the 4x reimplementation
tax we hit every time we refresh the design (primary buttons, family-code input,
kid avatar picker, empty states, bottom nav).

**Status: scaffold.** Components here are source-of-truth but apps have not been
migrated to consume them yet. Next session's work:

1. Decide workspace strategy — npm workspaces vs. pnpm workspaces vs. Turborepo.
   All four apps already build independently today, so the migration path is
   non-trivial (each app's tsconfig paths, build output, etc. need updating).
2. Wire one app (probably SafeStudy, since it's the newest) to import from
   `@safefamily/ui` as the pilot.
3. Migrate the other three apps one by one.

## Components in this package

- `FamilyCodeInput` — the 6-box segmented code entry kids see at
  `{app}.com/play` (or `/read` for SafeReads). Themable by `accent` prop.
  Extracted from SafeStudy's latest FamilyCodeEntry component (2026-04-19 UX
  audit round 5).

## Intended future additions

- `KidProfileCard` with `<AvatarPicker>` — color + emoji selection (SafeReads
  pattern already maps color → emoji consistently)
- `BottomNav` — shared kids-app bottom navigation with safe-area-inset handling
- `PrimaryButton` / `SecondaryButton` — with per-app accent tokens
- `StatCard` — for admin dashboards (SafeStudy's 3-stat card is the template)
- `EmptyState` — SafeStudy's "What are you curious about?" chips pattern
- `Toast` — replacing each app's independent toast implementation

## Why this exists

From the 2026-04-19 UX audit:

> Current state: each app reimplements family-code entry, kid profile picker,
> empty states, and primary buttons. Four implementations, four flavors, one
> maintenance burden.
>
> Impact: every new feature benefits every app; QA surface shrinks; the brand
> finally feels unified.
