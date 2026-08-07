# Safe Family — Marketing Strategy (May 2026)

*Audience: solo founder, ~35 paying users, $9.99/mo bundle, Christian + homeschool fit, $20–50/day Meta budget for pilot.*

## TL;DR — what to do

1. **Spend the first dollar on warm-audience retargeting and influencer seeding, not cold Meta.** At 35 users you don't have the data Meta needs to find you more.
2. **Run Meta in *parallel* with affiliate seeding to ~10 Christian/homeschool mom creators.** Meta is the volume engine you grow into; affiliates are the credibility engine you start with.
3. **Lead with one app, not the bundle.** SafeTube is the fattest-keyword, highest-pain wedge. Sell SafeTube → upsell bundle on the thank-you page.
4. **Optimize Meta for `Lead` (Trial Start), not `Subscribe`.** You don't have enough purchase events yet, and Meta will starve a Subscribe campaign at this scale.
5. **Don't say "kids" or "your child" in ad copy.** Talk to the parent's experience. This is also how you stay out of Meta's sensitive-categories filter.

---

## 1. Meta ads playbook

### 1a. Campaign structure

**Use ABO, not CBO.** At $20–50/day, CBO will starve 2–3 of your ad sets and never give them enough budget to exit the learning phase (which Meta requires ~50 conversions/week per ad set). With ABO you can guarantee one ad set gets the full $30/day it needs to learn. A 2025 Lebesgue analysis found ABO outperformed CBO 94% vs 81% ROAS on prospecting campaigns at small budgets ([RebootIQ: ABO vs CBO](https://rebootiq.com/abo-vs-cbo-meta-ads/), [Madgicx](https://madgicx.com/blog/cbo-facebook)).

**Recommended structure for the pilot:**

```
Campaign: SafeTube — Trial Start (Lead optimization)
├── Ad Set A: Broad / Advantage+ Audience           ($15/day)
├── Ad Set B: Interest stack — Homeschool/Faith      ($15/day)
└── Ad Set C: Retargeting — site visitors 30d        ($10/day)

Campaign: Safe Family Bundle — Purchase (when >50 trials/wk)
└── Ad Set: Lookalike 1% from converters             (turn on later)
```

Switch to CBO only after one ad set is consistently winning and you want Meta to scale spend behind it.

### 1b. Audience targeting

**Tier 1 — Custom audiences (highest priority, build now):**
- Newsletter list (Resend) — upload as CSV, build as Custom Audience
- Existing 35 paying users — upload, exclude from prospecting *and* use as the seed for a 1% Lookalike
- All-site-visitors 180d (via Pixel)
- Blog readers who hit `/blog/*` and stayed >30s
- Add-to-trial intent: hit `/signup` but didn't convert

These are your highest-ROAS audiences, period. They're also the only way you'll get Christian targeting working — Meta removed religious affinity targeting years ago, so first-party data + lookalikes is the workaround ([Parable Digital](https://digital.parablegroup.com/articles/target-christians-facebook), [FrontGate Media](https://www.frontgatemedia.com/best-christian-facebook-alternative-for-paid-ads/)).

**Tier 2 — Interest stacks (cold prospecting):**
- *Homeschool stack:* Homeschooling, Charlotte Mason, Classical Conversations, Abeka, BJU Press, Sonlight, The Good and the Beautiful
- *Faith-adjacent stack:* Focus on the Family, K-LOVE, Air1, Christian Broadcasting Network, Crosswalk.com, Dave Ramsey, Christian Book Distributors
- *Concerned-parent stack:* Common Sense Media, Bark, Aura, Circle by Disney, Gabb Wireless, Protect Young Eyes, Smart Social
- *Apple Music parent angle (SafeTunes):* Apple Music + Parents (children: 6–12)

Stack 5–8 interests per ad set, layer the demographic filter "Parents (with children 6–17)," exclude under-21 and over-65.

**Tier 3 — Broad / Advantage+ (let the algo find them):**
With strong creative, broad often beats interests in 2026. Run one ad set fully open with Advantage+ audience, age 28–55, parents only, US. This is the long-term winner if creative is good.

### 1c. Optimization event

**Use `Lead` (fired when a trial signup completes), not `Subscribe`.** Reasons:

- You're trial-first with no credit card. "Subscribe" only fires when someone converts to paid 7 days later — Meta needs ~50 events/week per ad set, and at 35 paying users you simply don't have that signal yet.
- Optimizing for trial-start gets the algo learning fast. You then track *trial→paid conversion rate* offline and use it to back into true CAC.
- The standard advice is "optimize for the deepest event you have volume for" ([Stackmatix Meta Funnel Guide](https://www.stackmatix.com/blog/meta-ads-funnel-strategy)). For you that's Lead until you cross ~50 paid subs/week.
- **Caveat:** trial optimization is "blind" to paid conversion. Meta will happily find cheap trial-starters who never pay. Watch trial→paid % weekly; if it drops below 25%, narrow the audience or change creative.

Once you cross ~200 paid subs and have a stable trial→paid rate, layer in a `Purchase` campaign with a 1% lookalike of converters. That's where scaling lives.

### 1d. Budget guidance for the pilot

- **Floor:** $30/day. Below this, statistical learning is too slow; you'll burn 60 days reading noise. The Pilothouse 3-3-3 framework assumes ~$30/day per variant to clear the kill threshold in 48h ([Pilothouse 3-3-3](https://www.pilothouse.co/post/meta-creative-testing-framework-the-3-3-3-approach-to-finding-winners)).
- **Recommended pilot:** $40/day for 4 weeks = $1,120 total commitment. This is the floor that lets you get real data on 6–10 creatives.
- **Stretch:** $50/day if you can run 4 ad sets in parallel.
- Don't go above $50/day until you have one ad with proven CPA below $15/trial. Scaling losers is the #1 way solo founders torch budgets.

### 1e. CAC benchmarks for $5–10/mo parenting SaaS

Hard numbers are scarce because most parenting-SaaS companies don't publish, but the ranges from cross-industry data:

- **Baby & Parenting Products on Meta:** average CPC $0.09 — one of the cheapest verticals on the platform ([TwoMinuteReports Benchmarks](https://twominutereports.com/blog/facebook-ads-benchmarks)). You will not pay $5/click here.
- **Education SaaS CAC:** ~$42 on a $12 ARPU product, 3.8-month payback ([Proven SaaS Benchmarks](https://proven-saas.com/benchmarks/cac-payback-benchmarks)). This is your closest analog — kid-safety apps behave like consumer-edu, not B2B SaaS.
- **B2C subscription apps cost-per-trial:** $5–25 is typical for well-targeted creative; $40+ means kill it ([Adapty: First $10K on Meta for Subscription Apps](https://adapty.io/blog/first-10k-meta-ads-subscription-apps/)).
- **Your math at $9.99/mo bundle, 60% trial→paid, ~12mo retention:** LTV ≈ $72. To hit a 3:1 LTV:CAC you need CAC ≤ $24, meaning cost-per-trial ≤ $14 at 60% conversion. That's your kill line.

### 1f. COPPA / sensitive-content restrictions on Meta

Three real risks; none are blockers, but you'll get flagged if you're sloppy:

1. **No "personal attributes" copy.** Meta's policy explicitly bans ads that imply or assert personal attributes about the viewer, including being a parent of a specific child ([AdAmigo Meta Compliance](https://www.adamigo.ai/blog/meta-ads-compliance-avoiding-teen-targeting-risks)). ❌ "Worried your 8-year-old is watching toxic YouTube?" → ✅ "YouTube's algorithm doesn't know what your family's standards are. We do."
2. **No targeting users under 18.** You're targeting *parents*, never kids. Use the Demographics → Parents filter exclusively. Don't run "interests" that include kid pages (Bluey, Cocomelon) — those can flag your account as potentially child-targeted.
3. **COPPA April 2026 update is about *your* data collection, not Meta's ads.** New COPPA rules went into effect April 22, 2026 — they tightened consent requirements for collecting data from under-13s ([Respectlytics COPPA 2026](https://respectlytics.com/blog/coppa-rules-2026-mobile-app-compliance/), [FTC Final Rule](https://outsidegc.com/blog/ftc-finalizes-updated-coppa-rules/)). Make sure your kid-side flows have *separate* parental consent for any third-party data sharing. This is a compliance issue (separate from ads) — get the privacy policy reviewed.
4. **KOSA (Kids Online Safety Act) is now passed.** Marketing-wise, this is a tailwind: it pushes parents toward exactly what you sell. Lean into it in copy.

---

## 2. Channel comparison — most efficient first dollar

Ranked by what works *at 35 users with a solo founder*:

| Rank | Channel | Why now | Cost | First-test ROI horizon |
|---|---|---|---|---|
| **1** | **Christian/homeschool affiliate seeding** | Trust transfers; Christian audiences buy on creator endorsement, not ads | $0 + 30% commission | 30–60 days |
| **2** | **Meta Ads (this playbook)** | Cheapest-CPC vertical; required for lookalike data flywheel | $40/day | 30–45 days |
| **3** | **Pinterest Ads** | Homeschool moms over-index here; ironically a good ad-out for SafeStudy | $20/day | 60 days |
| **4** | **Google Search (high-intent terms)** | Smaller volume but pure intent; "youtube parental controls" type queries | $20/day | 14 days |
| **5** | **Church bulletin / homeschool co-op newsletter sponsorships** | Hyper-targeted, high trust, terrible analytics | $50–500 each | 90+ days |
| **6** | **TikTok / #momsoftiktok** | Cheap reach but the demo skews younger and less Christian-aligned | $20/day | 60+ days |

**Recommendation: split first $1,500 as 60% Meta / 30% affiliates / 10% Google search.** Skip Pinterest, TikTok, and church sponsorships until Meta is proven.

### Why affiliates beat ads at this scale

A single Erica Arndt mention (Confessions of a Homeschooler, ~250k followers) or Pam Barnhill (Your Morning Basket podcast) outperforms $5,000 of cold Meta in this niche. Christian/homeschool creators have unusually high trust transfer — readers buy because *she* recommended it, not because of the ad copy. Education affiliates earn an avg ~$15k/mo, meaning the creators you want already have monetization muscle ([AuthorityHacker Homeschool Affiliate Programs](https://www.authorityhacker.com/homeschool-affiliate-programs/), [Influencer-Hero Top 100 Homeschool Influencers](https://www.influencer-hero.com/top-influencers/top-100-homeschooling-influencers-in-the-us)).

**Action:** Build a 30%-recurring-commission affiliate program (use Rewardful or LemonSqueezy affiliate). Personally email 20 creators offering: free lifetime access for them + 30% recurring on referrals + a custom promo code. Target: 5 yes responses, 2 active promoters in 60 days.

### Google Search — small but high-intent

Search ads on the keywords below should run at $20/day in parallel. CPCs are $1–3 in the family/safety vertical, you'll get ~10 clicks/day, and the intent is far higher than Meta's interruption traffic ([WebFX 2026 PPC Benchmarks](https://www.webfx.com/blog/marketing/ppc-benchmarks-to-know/)):

- "youtube parental controls"
- "kid safe music app"
- "apple music parental controls"
- "christian alternative to bark"
- "homeschool ai search engine" (very low volume but you'll own it)

Don't bid on competitor names (Bark, Gabb, Aura) yet — Quality Score will be low and you'll burn budget.

### Pinterest — phase 2

Skip for the pilot. It's correctly identified as a strong homeschool channel, but Pinterest's ad platform is meaningfully worse than Meta for direct response, and you need creative budget you don't have. Revisit at $5K/mo ad spend.

---

## 3. Creative angles — six concepts the founder can shoot tomorrow

Listed strongest to weakest. All shot on iPhone, vertical 9:16, 15–25 seconds, no music until the last 2 seconds. Hook → problem → solution → CTA, per the standard direct-response UGC formula ([Motion App: 25 Ad Hooks That Convert](https://motionapp.com/blog/best-dtc-meta-ad-hooks-2025)).

### Concept 1 — **The Search History Reveal** (lead)
- **Hook:** "I checked my 9-year-old's iPad search history last night. I'm not okay."
- **Visual:** Founder/spouse on couch, iPad in hand, scrolling visibly concerned. Cut to phone showing SafeStudy's parent dashboard with the intent classifier flagging "aesthetic browsing" and "self-image" categories.
- **CTA:** "We built SafeStudy because your kid shouldn't have to use Google. Try it free for 7 days, no card."
- **Why it wins:** The Bella Trotter story (212 searches, 57 aesthetic-browsing) is THE founder story. It's specific, it's true, and the Pinterest-substitute angle is differentiated. This is the strongest hook because no one else in the space can credibly tell it.

### Concept 2 — **The YouTube Rabbit Hole Demo**
- **Hook:** "Watch how fast YouTube's algorithm goes from Bluey to this." (cut to genuinely concerning Recommended sidebar)
- **Visual:** Screen-record an actual YouTube session starting with a kids' video, fast-forward through 4 algorithmic recommendations until something clearly inappropriate appears. Then split-screen: SafeTube — only approved channels visible.
- **CTA:** "Same iPad. Different ending. SafeTube."
- **Why it wins:** Before/after is the highest-converting format in family safety. Bark and Aura both run versions of this.

### Concept 3 — **The Parent-Approval Workflow** (UGC mom voice)
- **Hook:** "My daughter wanted to listen to Olivia Rodrigo. I didn't say no. I said send me the song."
- **Visual:** Mom recording selfie-style at kitchen counter. Phone notification chimes — SafeTunes "approval request." She listens to a 30s preview, taps "Approve." Cut to kid dancing in living room.
- **CTA:** "Apple Music parental controls that work the way you do. SafeTunes."
- **Why it wins:** Reframes parental control from *blocking* to *partnering*. Christian moms specifically respond better to "discernment together" than "lock it down."

### Concept 4 — **The "I'm Not the Algorithm" Manifesto**
- **Hook:** "I'm not paranoid. I'm just not letting four billion-dollar algorithms raise my kids."
- **Visual:** Founder direct-to-camera, tight crop, slightly raw lighting. 20 seconds of conviction, no demo, ends on logo.
- **CTA:** "Safe Family. Four apps, one promise. Start free."
- **Why it wins:** Brand video for the warm audience / retargeting set. Won't scale cold, but converts retargeting beautifully.

### Concept 5 — **Christian-Faith Reading Demo (SafeReads)**
- **Hook:** "My 11-year-old asked me what 'predestination' means. We pulled it up together in SafeReads."
- **Visual:** Mom + kid on couch with iPad. Show SafeReads' Bible reader with ESV, then the AI study notes ("conservative Baptist perspective") rendering an age-appropriate explanation.
- **CTA:** "Bible study tools your kid will actually use. SafeReads."
- **Why it wins:** Explicitly Christian — won't scale broadly but will absolutely crush among the warm + lookalike Christian audience. Pair with the affiliate push.

### Concept 6 — **The Stack Reveal (bundle)**
- **Hook:** "I was paying for Bark, Apple Family, and a YouTube parental control app. $34 a month. None of them did what I needed."
- **Visual:** Founder showing receipts/screenshots of those subscriptions, then a single Safe Family screen with all 4 apps.
- **CTA:** "$9.99 for all four. Cancel anytime. getsafefamily.com."
- **Why it wins:** Closes the price-anchor question. Save for retargeting + bottom-of-funnel.

**Production guidance:** Shoot 3 of the 6 in one weekend. Ideally Concept 1, 2, and 3 — different formats so you're not testing variants, you're testing concepts. Each gets 2 hooks (different first line). That's 6 ads, $30/day, 48-hour kill window. Total weekly burn $210. Kill anything above $20/trial after 1,000 impressions ([Pilothouse 3-3-3](https://www.pilothouse.co/post/meta-creative-testing-framework-the-3-3-3-approach-to-finding-winners)).

---

## 4. Funnel diagnosis

### Landing page — what to test

The fact that you're trial-first (no card) is your single biggest conversion advantage. Don't bury it.

**Test these in priority order:**

1. **Hero copy variant: SafeTube-only LP vs bundle LP.** Send 50% of Meta traffic to a dedicated `/safetube` landing page selling only that app, 50% to the bundle hero. I strongly suspect single-app LPs convert ~2× better cold; bundle goes on the *thank-you page* upsell.
2. **Headline test:** "Start your 7-day free trial — no credit card" vs "Take YouTube back from the algorithm." Friction-removal vs emotional. Run as a 2-week split.
3. **Above-the-fold social proof:** Add the customer count ("Trusted by [X] families") and one big testimonial quote with a real photo. The current testimonials sit too far down.
4. **Sticky mobile CTA copy:** "Start Free Trial" is fine, but test "Try SafeTube Free →" (specific app + arrow) on the SafeTube LP.

### Meta optimization event

Already covered above: **Lead (TrialStart)** until you have >50/week paid conversions. Then layer in a parallel **Purchase**-optimized campaign and starve the Lead campaign down.

### Bundle vs single-app decision

The bundle is the right *price* but the wrong *first ask*. Cold traffic does not understand "4 apps for $9.99." They have one specific problem: YouTube, or music, or AI search. Sell them that one app.

**Funnel map:**
```
Cold Meta ad (SafeTube angle)
  → /safetube landing page
  → Trial signup (single-app SafeTube trial)
  → Thank-you page: "Want all 4 apps for $5 more? Upgrade your trial to the bundle"
  → Email day 3: "Did you know SafeTube comes with 3 sister apps?"
  → Email day 6: bundle upgrade offer with code
  → Day 7: trial-end reminder with bundle as default selection
```

This raises both single-app trial conversion *and* bundle attach rate. The 35-existing-user data should tell you what % of trial starters upgrade to bundle today; that's your benchmark.

---

## 5. Don't-do list (parenting-app Meta landmines)

1. **Don't use second-person + child references in ad copy.** "Is your 9-year-old watching..." trips Meta's personal-attributes filter. Use third-person framing or talk about the algorithm/world, not the viewer's specific kid ([AdAmigo Meta Compliance](https://www.adamigo.ai/blog/meta-ads-compliance-avoiding-teen-targeting-risks)).
2. **Don't show kids' faces in ads if they're not your own kids and explicitly model-released.** Either shoot with your own family (best — adds authenticity) or use over-the-shoulder / hands-only / B-roll-of-devices framing.
3. **Don't run "Christian" or "homeschool" as ad copy keywords on broad audiences.** Meta no longer allows religious targeting and the algo doesn't know how to optimize for it on cold. Keep faith-coded copy for warm-audience and affiliate channels.
4. **Don't optimize for Subscribe with <50 events/week.** You'll burn budget while Meta hunts for a signal it can't find. Lead first, Subscribe later.
5. **Don't run more than one campaign objective in week 1.** Solo founders constantly split budget across Awareness + Traffic + Conversions and learn nothing on any of them. One campaign, one objective, one optimization event for the first 4 weeks.
6. **Don't scale a winner by 2× in a day.** Meta resets the learning phase if you change daily budget by >20%. Scale 20% every 3 days max.
7. **Don't link your ad account to your personal FB profile without 2FA + a backup admin.** Family-safety ads get falsely flagged with "child safety" reviews more than any other vertical. If your account is suspended and you have no backup admin, you lose all your custom audiences and pixel history. Add a backup admin (your spouse or co-conspirator) today.
8. **Don't ignore the iOS 14.5+ attribution window.** Your real CPA is 20–40% better than Meta's dashboard shows (off-platform conversions don't all attribute). Cross-check against your Convex `users` table signups by UTM, weekly.

---

## 6. 30-day starter plan

Assumes $40/day Meta budget = $1,120 over 30 days, plus ~10 hours/week founder time.

### Week 1 — Foundation
- **Mon:** Add Meta Pixel + Conversions API to getsafefamily.com (verify `Lead` fires on trial-signup completion). Create custom audiences: 35 paying users, newsletter list, all-site-visitors-180d.
- **Tue:** Build `/safetube` single-app landing page (or A/B variant of current homepage with SafeTube-only hero).
- **Wed–Thu:** Shoot Concepts 1, 2, 3 (one weekend afternoon — your kitchen, your iPad). Edit on CapCut. Two hook variants per concept = 6 ads.
- **Fri:** Stand up Rewardful (or LemonSqueezy affiliate). Build `/affiliate` page. Draft outreach email template.
- **Weekend:** Send personalized affiliate-invite emails to 20 Christian/homeschool creators. Don't bulk send — copy a recent post of theirs into each email and reference it.

### Week 2 — Launch Meta + first affiliate yeses
- **Mon:** Launch Meta campaign. Single ABO campaign, 3 ad sets (Broad/Advantage+, Homeschool-interest stack, 30d Retargeting). 6 creatives, 2 per ad set. Optimize for Lead.
- **Tue–Fri:** Don't touch the campaign. Seriously. Let Meta learn for 96 hours minimum.
- **Daily:** 30 minutes following up with affiliate prospects who didn't respond. Aim for 3–5 yeses by end of week.
- **Friday review:** Check CPA per ad set. Kill any creative >$25 cost-per-Lead with >1,000 impressions. Note what's winning.

### Week 3 — Iterate creative + add Google Search
- **Mon:** Replace 2 worst-performing creatives. Shoot Concepts 4 + 5 if you have a winner-pattern (e.g., founder direct-to-camera worked → make 2 more in that style).
- **Tue:** Launch Google Search campaign at $20/day on the 5 keywords from Section 2. Single campaign, single ad group, exact + phrase match.
- **Wed:** Send first affiliate creator their assets (talking points, custom code, free lifetime access activation).
- **Thu–Fri:** Weekly retro. Track: cost per Lead, trial→paid % (manually from your Convex data), affiliate-attributed signups.

### Week 4 — Scale or kill
- **Mon:** If you have a winning creative under $15 CPL: increase its ad set budget 20%. Build a 1% Lookalike from your trial-starters list and add as a new ad set.
- **Tue:** Launch first retargeting-only creative (Concept 4 or 6) targeting all-site-visitors-30d who didn't sign up. Budget $10/day.
- **Wed:** Email blast to the newsletter list with "new app spotlight" — drives warm traffic to retargeting pool.
- **Thu:** First Google Search optimization pass — kill keywords with >$8 CPC and zero conversions.
- **Fri:** End-of-month report. Decision criteria:
  - **Continue at $40/day** if blended CPA per trial < $20 *and* trial→paid > 30%.
  - **Pause Meta** if CPA > $30 AND no creative variant has broken through. Re-shoot. Don't keep paying for noise.
  - **Scale to $75/day** if CPA < $12. Add bundle-Purchase campaign with lookalike.

### What success looks like at day 30

- 60–100 new trial-starters from Meta (CPA $12–20)
- 1–3 active affiliate creators driving 5–15 trials/month
- 10–20 Google Search trials at higher trial→paid %
- Pixel data on ~150 conversions, enough to start lookalikes
- A winning creative pattern you can keep iterating on

If you hit those numbers, you've gone from 35 → ~80–100 paying users in ~60 days from start (accounting for trial→paid lag). That's the inflection point where Meta's flywheel starts spinning on its own.

---

## Sources

- [TwoMinuteReports — 2025 Facebook Ads Benchmarks by Industry](https://twominutereports.com/blog/facebook-ads-benchmarks)
- [Proven SaaS — CAC Payback Benchmarks 2026](https://proven-saas.com/benchmarks/cac-payback-benchmarks)
- [Adapty — How to Spend Your First $10K on Meta Ads (Subscription Apps)](https://adapty.io/blog/first-10k-meta-ads-subscription-apps/)
- [Stackmatix — Meta Ads Funnel Strategy 2026](https://www.stackmatix.com/blog/meta-ads-funnel-strategy)
- [Pilothouse — Meta Creative Testing 3-3-3 Framework](https://www.pilothouse.co/post/meta-creative-testing-framework-the-3-3-3-approach-to-finding-winners)
- [RebootIQ — ABO vs CBO Scaling Playbook](https://rebootiq.com/abo-vs-cbo-meta-ads/)
- [Madgicx — Difference Between Facebook ABO and CBO](https://madgicx.com/blog/cbo-facebook)
- [Motion App — 25 Video Ad Hooks That Convert in 2025](https://motionapp.com/blog/best-dtc-meta-ad-hooks-2025)
- [AdAmigo — Meta Ads Compliance: Avoiding Teen Targeting Risks](https://www.adamigo.ai/blog/meta-ads-compliance-avoiding-teen-targeting-risks)
- [Respectlytics — New COPPA Rules 2026: Mobile App Compliance Before April 22](https://respectlytics.com/blog/coppa-rules-2026-mobile-app-compliance/)
- [Outside GC — FTC Finalizes Updated COPPA Rules](https://outsidegc.com/blog/ftc-finalizes-updated-coppa-rules/)
- [Parable Digital — Targeting Christians on Facebook](https://digital.parablegroup.com/articles/target-christians-facebook)
- [FrontGate Media — Best Christian Facebook Alternative for Paid Ads](https://www.frontgatemedia.com/best-christian-facebook-alternative-for-paid-ads/)
- [AuthorityHacker — 15 Best Homeschool Affiliate Programs (2025)](https://www.authorityhacker.com/homeschool-affiliate-programs/)
- [Influencer-Hero — Top 100 Homeschooling Influencers in the US](https://www.influencer-hero.com/top-influencers/top-100-homeschooling-influencers-in-the-us)
- [WebFX — 2026 PPC Benchmarks: CPC, CPL, CTR & ROAS by Industry](https://www.webfx.com/blog/marketing/ppc-benchmarks-to-know/)
- [Jen Merckling — 6 Effective Facebook Ad Targeting Tips](https://jenmerckling.com/facebook-ad-targeting/)
- [iHomeschool Network — Build Your Perfect Homeschool Marketing Campaign](https://ihomeschoolnetwork.com/perfect-homeschool-marketing-campaign/)

*Saved to `~/safecontent/docs/MARKETING-STRATEGY-2026-05.md` — May 2026.*
