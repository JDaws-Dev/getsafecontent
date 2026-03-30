# SafeStudy Improvement Plan

## Status: MVP working (Mar 28, 2026)
Core search works — OpenAI gpt-4o-mini, kid profiles, time limits, family code entry.
Needs significant buildout before launch.

---

## CRITICAL (Must-have for launch)

- [ ] **Stripe subscription flow** — webhook handler, checkout session, customer portal
- [ ] **useSubscriptionSync hook** — periodic sync with Marketing Central (copy from SafeTube)
- [ ] **UpgradePrompt component** — trial expiry UI, upgrade buttons in settings
- [ ] **Promo code support** — DAWSFRIEND, DEWITT validation in signup/settings

## HIGH PRIORITY (Before beta)

- [ ] **Admin "Home" tab** — kid activity overview cards showing searches today, flagged count, time remaining
- [ ] **Getting Started / Onboarding** — QR code for family code, setup checklist, first-login wizard (see memory note)
- [ ] **Settings expansion** — Stripe portal link, timezone auto-detect, parent PIN, account deletion, support links, trial countdown
- [ ] **Landing page overhaul** — FAQ section with schema markup, testimonials, hero image (Pexels), comparison table, installation guide, sticky header, mobile menu
- [ ] **Email templates** — subscription confirmation, password reset, payment failed, cancellation confirmation, blocked search parent notification
- [ ] **Mobile menu** — hamburger nav for admin dashboard, 48px tap targets throughout

## MEDIUM (v1.1)

- [ ] **Wikipedia integration** — use Wikipedia API for factual content + Wikimedia Commons for images. Supplement AI answers with real encyclopedia data. Kid-friendly summaries pulled from Simple English Wikipedia where available.
- [ ] **Image search** — Two sources: (1) Wikimedia Commons for educational/encyclopedia images (free), (2) Google Custom Search Image API with SafeSearch=strict for broader results. Both filtered through AI safety layer before displaying. Parent toggle per kid profile to enable/disable.
- [ ] **Request system** — kids can flag searches for parent review, parent approval UI in admin
- [ ] **Blocked/flagged searches UI** — dedicated admin tab showing what was blocked and why
- [ ] **Search result polish** — section formatting, thumbnails, better typography
- [ ] **Saved/favorite searches** — kids can bookmark answers to revisit
- [ ] **Search cache** — cache common queries (dinosaurs, space, etc.) to reduce API costs
- [ ] **Password strength indicator** — for signup/password change flows

## NICE TO HAVE (v2)

- [ ] **Search analytics** — per-kid stats: total searches, top topics, blocked %, trends over time
- [ ] **Activity notifications** — email/push to parents for flagged searches
- [ ] **Personalized suggestions** — based on age, interests, search history
- [ ] **Screen time reports** — weekly email summary of kid activity
- [ ] **Follow-up questions** — conversational search (ask follow-ups in context)
- [ ] **Voice search** — speech-to-text for younger kids who can't type well
- [ ] **Multiple languages** — Spanish, etc.

---

## Architecture & Cost Optimization

### Current: Pure OpenAI (gpt-4o-mini)
- $0.0006 per query (~715 input tokens, ~800 output tokens)
- 100 users × 10/day = $17/month | 1,000 users = $176/month
- Already very cost-effective (3.5% of revenue at scale)

### Planned: Tiered hybrid approach
**Tier 0 — Cache check (free):** Normalize query, check Convex cache. 24hr TTL. Expected 40-60% hit rate.
**Tier 1 — Wikipedia (free):** Factual queries (what/who/where/when). Wikipedia API + Simple English Wikipedia for younger kids. Wikimedia Commons for images.
**Tier 2 — OpenAI gpt-4o-mini:** Complex/creative questions, content safety filtering, kid-friendly summarization.
**Tier 3 — Google Custom Search (later):** Real web results for current events, if needed at scale.

### Optimizations to implement
1. **Search cache table** — copy SafeTube's `youtubeSearchCache` pattern (normalize, TTL, reuse tracking)
2. **Structured outputs** — use OpenAI JSON schema mode, eliminate parse failures, trim ~300 tokens from prompt
3. **Client-side debounce** — 2 second delay on search input
4. **Server-side rate limit** — 3-5 queries/minute per kid
5. **Global circuit breaker** — 10,000 queries/day max across all users ($6/day ceiling)
6. **Query classification** — simple regex: what/who/where/when = factual (Wikipedia first), why/how/explain = AI

### Cost projections with optimizations
| Scale | Pure AI | With cache + Wikipedia | Savings |
|-------|---------|----------------------|---------|
| 100 users | $17/mo | ~$7/mo | 60% |
| 500 users | $88/mo | ~$35/mo | 60% |
| 1,000 users | $176/mo | ~$70/mo | 60% |

### Model notes
- GPT-4o-mini is already cheapest reliable option
- Gemini Flash-Lite is 6x cheaper but less reliable safety filtering — not worth the risk for a kid product
- Self-hosting not cost-effective below 5,000 users

---

## Branding

- Primary accent: Blue/cyan (#3B82F6)
- Safe Family brand: cream (#FDF8F3), navy (#1a1a2e), peach (#F5A962)
- Peach for CTAs to match other apps
- Hero image: Pexels (kid on laptop — IDs: 5632646, 5632632, 3807517)
- Domain: getsafestudy.com (available, $11.25/yr, not yet purchased)

---

## Feature Parity Gaps vs SafeTunes/SafeTube

| Feature | SafeTunes | SafeTube | SafeStudy |
|---------|-----------|----------|----------|
| Stripe webhooks | Yes | Yes | Missing |
| Subscription sync | Yes | Yes | Missing |
| Getting Started | Yes (QR code) | Yes | Missing |
| Requests system | Song/album | Video/channel | Missing |
| Settings (full) | 7+ sections | Full | Basic only |
| Landing page | Rich (FAQ, testimonials) | Rich | Minimal |
| Mobile menu | Hamburger | Hamburger | Missing |
| Email templates | 12 | 11 | 4 |
| Empty states | Illustrated | Multiple variants | Minimal |
| Kid experience | Music player | Video player | Search (functional) |

---

*Last updated: Mar 28, 2026*
