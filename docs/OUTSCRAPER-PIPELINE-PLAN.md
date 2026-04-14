# Outscraper Lead-Gen Pipeline — Build Plan

> Status: **Planned, not started.** Picked up from conversation 2026-04-08.
> Related: `docs/OUTREACH-RESEARCH-2026-04-08.md` (informed ICP & tactics).

## Pilot scope

Florida homeschool co-ops as FPEA convention (May 21-23, 2026) warm-up. Goal: 150-300 validated leads → 3-touch cold email sequence → drive free-trial signups via promo code `FLCOOP2026`.

## Locked decisions

| # | Decision |
|---|----------|
| 1 | **Send infra:** Instantly ($37/mo) — purpose-built for cold; keeps Resend clean for transactional |
| 2 | **Sending domain:** subdomain `mail.getsafefamily.com` (⚠️ risk flagged: subdomain reputation can leak to root and hurt transactional deliverability — Jeremiah accepted the risk to save $12/yr) |
| 3 | **Outscraper budget cap:** $10 for pilot (~3-5K raw records → ~150-300 sendable after filtering) |
| 4 | **Email validation:** Outscraper built-in (bundled, cheaper than NeverBounce) |
| 5 | **Touch-1 goal:** Free trial signup with promo `FLCOOP2026` |

## Open decisions (need before Phase 1 starts)

1. **CTA framing:** "start your family's free trial" (parent-as-individual) vs "set up free trials for your co-op families" (co-op leader as channel partner). Second is more leveraged but heavier ask.
2. **Sender persona:** `jeremiah@mail.getsafefamily.com` (founder voice, higher reply rate) vs `hello@mail.getsafefamily.com` (team voice).
3. **Storage location confirmation:** Build into Marketing Central (`adamant-crow-705`) so conversion attribution is one DB? (Default yes.)
4. **Dev vs prod for schema rollout:** Does Marketing Central have a dev deployment, or go straight to prod with additive-only schema?
5. **Reconsider subdomain decision?** Worth one more nudge — separate domain is cheap insurance.

## Architecture

```
Outscraper API → R2 (raw JSON archive) → Convex import endpoint
  → leads table (Marketing Central)
  → Outscraper email validation pass
  → priority scoring → cohort export
  → Instantly campaign (3-touch sequence)
  → reply/bounce/unsub webhooks → status updates
  → Stripe webhook → conversion attribution back to lead
```

## Convex schema (Marketing Central)

```ts
leads: defineTable({
  // Identity (dedupe on placeId)
  placeId: v.string(),
  source: v.union(v.literal("outscraper_gmaps"), v.literal("manual")),
  sourceQuery: v.string(),

  // Org info
  name: v.string(),
  category: v.optional(v.string()),
  website: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  state: v.optional(v.string()),
  zip: v.optional(v.string()),
  rating: v.optional(v.number()),
  reviewsCount: v.optional(v.number()),

  // Contact
  email: v.optional(v.string()),
  emailStatus: v.optional(v.union(
    v.literal("unvalidated"), v.literal("valid"),
    v.literal("risky"), v.literal("invalid"),
    v.literal("role_based"), v.literal("personal_domain")
  )),
  contactName: v.optional(v.string()),

  // Segmentation
  persona: v.string(),       // "homeschool_coop" | "church" | etc.
  cohort: v.string(),        // "fl_coops_2026_04"
  priorityScore: v.number(),

  // Outreach state
  outreachStatus: v.union(
    v.literal("new"), v.literal("queued"), v.literal("sent"),
    v.literal("opened"), v.literal("replied"), v.literal("bounced"),
    v.literal("unsubscribed"), v.literal("converted"), v.literal("excluded")
  ),
  touchCount: v.number(),
  firstContactedAt: v.optional(v.number()),
  lastContactedAt: v.optional(v.number()),
  promoCode: v.optional(v.string()),
  notes: v.optional(v.string()),
  rawDataR2Key: v.optional(v.string()),
})
  .index("by_placeId", ["placeId"])
  .index("by_email", ["email"])
  .index("by_status", ["outreachStatus"])
  .index("by_cohort", ["cohort"])

leadsSuppression: defineTable({
  email: v.string(),
  reason: v.union(
    v.literal("unsubscribed"), v.literal("hard_bounce"),
    v.literal("complaint"), v.literal("manual")
  ),
  addedAt: v.number(),
}).index("by_email", ["email"])

leadsOutreachLog: defineTable({
  leadId: v.id("leads"),
  touch: v.number(),         // 1, 2, 3
  template: v.string(),
  sentAt: v.number(),
  openedAt: v.optional(v.number()),
  repliedAt: v.optional(v.number()),
  bouncedAt: v.optional(v.number()),
}).index("by_lead", ["leadId"])
```

## Files to create

```
sites/marketing/
  src/lib/outscraper/
    client.ts                 # API wrapper, async + polling
    parsers.ts                # Google Maps response → Lead
  src/lib/leads/
    validation.ts             # email filtering rules
    scoring.ts                # priorityScore
    suppression.ts            # check before send
  scripts/leads/
    scrape.ts                 # CLI: kick off Outscraper job
    import.ts                 # CLI: ingest JSON → Convex
    validate-emails.ts        # CLI: validation pass
    export-to-instantly.ts    # CLI: push cohort to Instantly campaign
  src/app/api/leads/
    outscraper-webhook/route.ts   # Outscraper async callback
    unsubscribe/route.ts          # one-click unsub (signed token)
    instantly-webhook/route.ts    # bounce/open/reply events

apps/marketing-central convex/    # adamant-crow-705
  schema.ts                       # add 3 tables
  leads.ts                        # mutations + queries
  leadsHttp.ts                    # /admin/leads/* HTTP endpoints
```

## Validation rules (drop before send)

- ❌ Invalid syntax / no MX
- ❌ Personal domains (gmail, yahoo, hotmail, outlook, icloud, aol)
- ❌ Role-based on touch 1 (info@, admin@, contact@, hello@, support@) — keep but flag
- ❌ Catch-all domains → flag risky, max 1 touch
- ❌ EU/UK TLDs (.eu, .uk, .de, .fr, etc.) — GDPR risk
- ❌ On suppression list
- ❌ outreachStatus already in {unsubscribed, bounced, converted}

## Priority scoring (0-100)

- +30 valid business email
- +20 rating ≥ 4.5 AND reviews ≥ 10 (active org)
- +15 has website
- +15 name contains "co-op" / "academy" / "homeschool" / "classical"
- +10 Christian signal in name/category
- +10 in major FL metro (Orlando, Tampa, Jacksonville, Miami)

Sort send queue desc; cap pilot at top 300.

## Instantly setup checklist

- [ ] Register/configure `mail.getsafefamily.com` subdomain
- [ ] SPF, DKIM, DMARC aligned
- [ ] Custom tracking subdomain
- [ ] 3 inboxes: `jeremiah@`, `team@`, `hello@`
- [ ] 2-3 week warmup BEFORE real send
- [ ] Reply detection on
- [ ] Hard cap 50/day per inbox

## Phased build plan

**Phase 1 — Schema & infra**
1. Add 3 tables to Marketing Central schema
2. `convex/leads.ts` mutations + queries
3. `convex/leadsHttp.ts` admin endpoints
4. Deploy to dev first (or additive prod if no dev exists)

**Phase 2 — Outscraper integration**
5. `client.ts` API wrapper
6. `parsers.ts` Google Maps → Lead
7. `validation.ts` filters
8. `scoring.ts`
9. `scripts/leads/scrape.ts`
10. 🛑 **Review sample data with Jeremiah before $10 spend**

**Phase 3 — Import & validate**
11. `scripts/leads/import.ts` (dedupe on placeId)
12. Tiny test scrape (1-2 cities, ~$0.50) end to end
13. 🛑 **Sanity check imported quality with Jeremiah**

**Phase 4 — Send pipeline**
14. Register subdomain, DNS, connect Instantly
15. `unsubscribe/route.ts` with signed JWT token
16. `instantly-webhook/route.ts`
17. `export-to-instantly.ts`
18. Draft 3 cold email templates — 🛑 **review with Jeremiah**

**Phase 5 — Launch pilot**
19. Full $10 FL scrape
20. Validate → import → score
21. Export top 200-300 to Instantly
22. Run 2-3 week Instantly warmup
23. Send sequence after warmup

## Compliance non-negotiables

- CAN-SPAM: physical address + working unsubscribe in every email
- One-click unsub writes to `leadsSuppression`, never re-contacted on future scrapes
- Suppression list checked before every send
- Skip EU/UK
- Skip personal domains on first touch
- Audit log every send
- Hard bounce rate must stay <2% or domain burns

## Attribution

- Unique cohort promo code (`FLCOOP2026`)
- UTM params on every link (`?utm_source=outreach&utm_campaign=fl_coops&utm_content=touch1`)
- Stripe webhook → match conversion by email → set `outreachStatus=converted`
- Funnel metrics per cohort: sent → delivered → opened → replied → trial → paid
