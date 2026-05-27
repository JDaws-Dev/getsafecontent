# SafeSpark Pricing

## Unit economics

Cost sources in code:
- `convex/chat.ts:14` — gpt-5.5 chat at $2.50/M input, $10/M output
- `convex/images.ts:30` — gpt-image-1.5 at $0.04 medium → $0.10 high+large
- `convex/safespark.ts:1267` — pricing constants used by the usage rollup
- Nano helpers (`dailyCardsAction.ts`, `enrichment.ts`, follow-ups in `chat.ts`) — gpt-5.4-nano, rounding error

Per-turn / per-image estimates:
- Chat turn (~1.5K in, ~400 out) ≈ **$0.008**
- Image generate (avg medium/high) ≈ **$0.05**

### Per-kid monthly COGS

| Usage | Turns | Images | COGS |
|---|---|---|---|
| Light | 30 | 5 | $0.50 |
| Medium | 150 | 20 | $2.20 |
| Heavy | 500 | 75 | $7.75 |
| Power tail | 1500 | 200 | ~$22 |

Family of 3 kids, realistic mix (1 medium + 1 heavy + 1 light) ≈ **$10–12 COGS/mo**. A single obsessed kid in the power tail can hit $20+ alone.

## Context

- Sibling apps (SafeTunes / SafeTube / SafeReads / SafeSeek) are each $4.99/mo standalone, bundled at **$9.99/mo for all 4**.
- Those four are near-zero marginal cost. SafeSpark is not — it's the first variable-cost app in the family.
- Folding Spark into the $9.99 bundle as-is would turn a 90%+ margin bundle into a money-loser on heavy families.

## Options

### Option 1 — New bundle tier (recommended)
- Keep existing bundle at **$9.99/mo** (Tunes/Tube/Reads/Seek)
- Add **"Family + Spark" at $16.99/mo** (or $14.99 for aggressive growth)
- Standalone Spark at **$7.99/mo**
- Signals Spark as a premium add-on, protects existing bundle economics

### Option 2 — Bundle in, cap aggressively
- Spark joins the $9.99 bundle
- Per-kid fair-use cap (e.g. 300 turns + 40 images/mo)
- Past cap: soft-throttle ("Bella's resting — back tomorrow") or downgrade chat to nano
- Cleanest marketing, hardest UX for kids who hit the wall

### Option 3 — Bundle in, raise the bundle
- Move family bundle from $9.99 → $12.99 across the board
- Risks churn on existing Tunes/Tube customers who don't care about Spark

## Recommendation

**Option 1 at $16.99 "Family + Spark"** with a generous-but-real per-kid cap (~500 turns + 60 images/mo — covers 95% of kids, blocks only the runaway tail). The cap is the load-bearing piece — without it, one heavy household eats the margin from ten light ones.

Cap behavior to design:
- Soft-throttle first (downgrade to nano model + lower-quality images)
- Hard-stop only at 2× cap with a parent-visible notice in the dashboard
- Reset monthly on billing date

## Pre-launch validation

Pull `safesparkUsage.totalCents` distribution from prod before locking the price. The numbers above are model-based; real kid behavior may skew lighter (drift off after a week) or heavier (the ones who stick, really stick) than estimated.

## Already cost-optimized

- Daily cards → nano (`convex/dailyCardsAction.ts`)
- Follow-up question generator → nano (`convex/chat.ts`)
- Memory enrichment → nano (`convex/enrichment.ts`)
- Wikipedia/search results cached (`convex/searchCache.ts`)

Keep this discipline — push anything that isn't user-facing creative chat to nano.
