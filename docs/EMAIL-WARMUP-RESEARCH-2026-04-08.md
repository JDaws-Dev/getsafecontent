# Email Warmup Research — April 2026

**Context:** Solo founder (SafeFamily) planning cold outreach to homeschool co-ops. ~150–300 leads/cohort, 1 domain, ~3 inboxes, Instantly as send platform, infrequent campaigns. Transactional email runs on root `getsafefamily.com` via Resend; cold would run on a subdomain (e.g., `mail.getsafefamily.com`).

---

## 1. TL;DR — Recommendation for SafeFamily

**Do not buy a dedicated warmup tool. Do NOT use Instantly's built-in warmup aggressively. Do manual/hybrid warmup on a dedicated cold subdomain, then ramp real campaign volume slowly.**

Concrete plan:

1. **Set up a dedicated cold subdomain** — `outreach.getsafefamily.com` (NOT `mail.` — that name is conventionally transactional and you'd muddle intent). Full SPF, DKIM, and DMARC (`p=none` for the subdomain initially, root stays at whatever enforcement you already use). Google's Feb 2024 bulk-sender rules make this non-negotiable. ([Valimail](https://www.valimail.com/blog/google-email-compliance-enforcement/), [dmarcwise](https://dmarcwise.io/blog/gmail-sender-requirements-enforcement))
2. **Wait 7–10 days after DNS propagation** before first send. ([Prospeo](https://prospeo.io/s/gmail-warm-up))
3. **Week 1:** manual — 5–10/day to real humans who will open and reply (yourself on Gmail/Outlook, spouse, friends, a few existing SafeFamily customers who opted in).
4. **Week 2:** 15–25/day, mix in a handful of genuine homeschool contacts you already know.
5. **Weeks 3–4:** 25–50/day — start the real cohort send, but pace it across days. Never spike.
6. **Leave Instantly's built-in warmup ON at a low setting (10–20/day)** as background cover only after week 1. Do not crank it — its network quality is the weakest part of Instantly. ([Mailreach Instantly review](https://www.mailreach.co/blog/instantly-warmup-review))
7. **Monitor Google Postmaster Tools** (domain reputation, spam rate) on the subdomain. Target <0.1% complaint rate; hard ceiling is Google's 0.3%. ([factors.ai](https://www.factors.ai/blog/google-bulk-email-senders-guidelines))
8. **Budget: $0–30/mo.** Instantly's warmup is already included. A dedicated warmup tool is overkill and arguably counterproductive at 150–300 leads/cohort.

**Only consider a paid warmup tool (Mailreach, ~$25/inbox/mo) if:** Postmaster shows degrading reputation after several cohorts, or you scale to 500+/day sustained, or you add 5+ inboxes. ([Mailreach pricing](https://www.mailreach.co/email-warmup))

---

## 2. Comparison Table

| Tool | Pricing (2026) | Model | Network | Providers | Standalone? | Notes |
|---|---|---|---|---|---|---|
| **Instantly (built-in)** | Bundled w/ send plans (~$30/mo flat, unlimited inboxes) | Peer pool, open SMTP | Largest / open-door (quality concerns) | Gmail, M365, SMTP | No — only with Instantly sending | Widely criticized for mixed-quality pool ([Mailreach](https://www.mailreach.co/blog/instantly-warmup-review)) |
| **Smartlead (built-in)** | $39/mo flat, unlimited warmup | AI-generated replies, private pool | Private | Gmail, M365, SMTP | No — only with Smartlead sending | No inbox-placement visibility during warmup ([Mailreach](https://www.mailreach.co/blog/smartlead-warmup-alternatives)) |
| **Mailreach** | $25/inbox/mo (annual ~$20) | Private peer network, synthetic conversations | 30,000+ real inboxes | Gmail, M365 (best); Yahoo supported | Yes — works alongside any sender | Highest-quality pool; no free trial by design ([Mailreach](https://www.mailreach.co/email-warmup)) |
| **Lemwarm (Lemlist)** | $24–40/inbox/mo; free w/ Lemlist | Peer network | 20,000+ B2B inboxes | Gmail, M365, SMTP | Technically yes but best inside Lemlist | ([coldemailkit](https://coldemailkit.com/tools/lemwarm)) |
| **Warmup Inbox** | ~$19/inbox/mo (1 inbox) | Peer network | Claims 30,000+ inboxes | Gmail, M365, SMTP | Yes | Cheapest "real" standalone ([trulyinbox](https://www.trulyinbox.com/blog/inboxally-alternatives/)) |
| **Warmy.io** | $49 (1 inbox) → $189+ (5+) | AI-adaptive, multi-language, custom topics | Private | Gmail, M365, SMTP | Yes | Per-inbox pricing explodes at scale ([trulyinbox](https://www.trulyinbox.com/blog/warmy-review/)) |
| **InboxAlly** | $149/mo (1 inbox starter) | Seed list engages with YOUR real content; opens, scrolls, clicks, replies, marks important | US-only seed list | Any provider | Yes | Most aggressive engagement; US-centric; pricey ([inboxally](https://www.inboxally.com/compare/inboxally-vs-lemwarm)) |
| **Folderly** | ~$96/inbox/mo | GPT-generated convo + spam testing + DNS audit | Private | Gmail, M365 | Yes (full deliverability platform) | Enterprise-ish pricing ([trulyinbox](https://www.trulyinbox.com/blog/email-warm-up-services/)) |
| **Mailwarm** | $79/mo (1 inbox) | Peer network | ~5,000 inboxes (small) | Gmail, M365 | Yes | Weakest network for the price ([emailwarmup.com](https://emailwarmup.com/blog/email-deliverability-tools/mailwarm-review/)) |
| **TrulyInbox** | $29/mo flat, unlimited inboxes; free plan | Peer network | Not disclosed | Gmail, M365, SMTP | Yes | Cheapest flat-rate standalone ([trulyinbox](https://www.trulyinbox.com/blog/email-warm-up-services/)) |
| **Allegrow** | From $40/inbox/mo | Warmup + list validation + spam-trap + DNS monitoring | Private | Gmail, M365 | Yes | Positioning as deliverability suite, not just warmup ([allegrow](https://www.allegrow.co/knowledge-base/warmy-reviews)) |
| **Mailivery** | Flat-rate, unlimited | Peer network | Medium | Gmail, M365, SMTP | Yes | ([mailivery](https://mailivery.io/blog/best-email-warm-up-tools)) |

All pricing figures verified April 2026 from vendor or comparison-site sources cited. Network size numbers are **vendor-reported, unverified** by independent audit.

---

## 3. Per-Tool Deep Dives

### Instantly (built-in warmup)
- Bundled free with Instantly sending plans.
- Peer-to-peer pool with open enrollment; the pool accepts users with custom SMTP and reportedly poor sending hygiene, which Mailreach argues contaminates engagement quality for everyone in the network. ([Mailreach critique](https://www.mailreach.co/blog/instantly-warmup-review))
- Ignores engagement velocity and content patterns; pushes volume regardless of feedback signals per same source.
- No standalone use — only works with Instantly as send tool.
- **Consensus:** Fine as background cover; not trustworthy as your primary deliverability strategy. "The weakest part of Instantly" is a widely repeated take among competitors (biased) and on Reddit (less biased).

### Smartlead (built-in warmup)
- $39/mo base, unlimited mailbox warmup. ([smartlead](https://www.smartlead.ai/pricing))
- Private AI-driven pool; generates replies automatically.
- **Critical gap:** no inbox-placement visibility during warmup, no mailbox-health diagnostics. You're flying blind. ([Mailreach](https://www.mailreach.co/blog/smartlead-warmup-alternatives))
- Smartlead itself is highly regarded for sending; warmup is a secondary feature.

### Mailreach
- $25/inbox/mo (~$20 annual). No free trial — deliberate, to keep the network clean. ([mailreach](https://www.mailreach.co/email-warmup))
- Private network of 30,000+ high-reputation inboxes, emphasizing Google Workspace and M365 users — which is exactly what you want if your targets are homeschool co-ops on Gmail.
- Synthetic conversations mirror real business patterns; engagement is one-directional (seeds engage with your account but don't initiate).
- **Standalone** — works alongside Instantly, Smartlead, anyone.
- Provides visual reputation scoring, inbox placement tests (Gmail/M365/Yahoo separately), and spam test credits.
- **Strongest consensus pick** among independent reviewers when budget allows.

### Lemwarm
- $24–40/inbox/mo; **free if you already use Lemlist**. ([coldemailkit](https://coldemailkit.com/tools/lemwarm))
- 20,000+ B2B-focused pool.
- Only worth it if you're in the Lemlist ecosystem. Not relevant here since you're on Instantly.

### Warmup Inbox (warmupinbox.com)
- Claims 30,000+ inboxes in the network. ([trulyinbox](https://www.trulyinbox.com/blog/inboxally-alternatives/))
- ~$19/mo for a single inbox — cheapest "real" standalone.
- Mid-tier reputation in reviews. Fine for budget solo ops but no strong edge.

### Lemwarm (by Lemlist)
Same as above. Covered.

### Warmy.io
- $49/mo (starter, 1 inbox) → $129 (5) → $189+ (premium features). ([trulyinbox](https://www.trulyinbox.com/blog/warmy-review/))
- AI-adaptive pacing, multi-language, custom warmup topics (affiliate, B2C gaming, etc.) — niche features.
- Per-inbox pricing balloons at scale. Not a fit for 3 inboxes on a budget.

### Folderly
- ~$96/inbox/mo. ([trulyinbox](https://www.trulyinbox.com/blog/email-warm-up-services/))
- Full deliverability platform: warmup + spam testing + DNS audit + GPT-generated convos.
- Priced for enterprises/agencies. Overkill.

### Mailwarm
- $79/mo for 1 inbox. ([emailwarmup.com](https://emailwarmup.com/blog/email-deliverability-tools/mailwarm-review/))
- Only ~5,000 inboxes in network — smallest of the paid options.
- Bad value. Skip.

### TrulyInbox
- $29/mo flat, unlimited inboxes, free plan available. ([trulyinbox](https://www.trulyinbox.com/blog/email-warm-up-services/))
- Note: TrulyInbox reviews their own competitors, so take their comparison content with a grain of salt.
- Cheapest standalone flat-rate option if you decide you want a tool.

### Allegrow
- From $40/inbox/mo. ([allegrow](https://www.allegrow.co/knowledge-base/warmy-reviews))
- Full deliverability suite: list validation, spam-trap detection, hourly SPF/DKIM/DMARC checks, warmup.
- Still independent as of April 2026 per their knowledge base (the prompt asked if they were acquired — **unverified**, nothing in search suggests an acquisition).

### InboxAlly
- $149/mo per inbox (starter). ([inboxally](https://www.inboxally.com/compare/inboxally-vs-lemwarm))
- **Fundamentally different model:** uses a human seed list that engages with YOUR real campaign content — opens, scrolls, clicks links, replies, marks as important. Not synthetic.
- **US-only seed list** — if targeting US homeschool co-ops this is fine; if international, problem.
- Most aggressive engagement simulation on the market. Also most likely to trigger the "artificial engagement" detectors if Google's crackdown (see §4) continues tightening.
- Expensive relative to your use case.

### 2025/2026 newcomers / others noted
- **Mailivery** — flat-rate, unlimited inboxes, peer network. ([mailivery](https://mailivery.io/blog/best-email-warm-up-tools))
- **Warmforge.ai** — review/analysis tool rather than pure warmup; publishes independent audits of 13+ tools. ([warmforge](https://www.warmforge.ai/blog/email-warmup-tools))
- **Apollo.io removed its warmup feature in 2024** and replaced it with "Inbox Ramp Up" — volume pacing without fake engagement. This is a signal. ([prospeo](https://prospeo.io/s/does-email-warmup-work))
- **GMass shut down its warmup system Jan 31, 2023** after Google told them to kill it or lose Gmail API access. Had sent 1.29B warmup emails across 236K accounts. ([prospeo](https://prospeo.io/s/does-email-warmup-work))

---

## 4. The Google 2024 Crackdown — What Actually Changed

**February 1, 2024:** Google + Yahoo rolled out bulk sender requirements for anyone sending >5,000/day:
- SPF, DKIM, **and DMARC** authentication mandatory
- One-click unsubscribe (RFC 8058) for marketing
- Spam complaint rate must stay <0.3% (hard threshold), ideally <0.1%
- Sources: [factors.ai](https://www.factors.ai/blog/google-bulk-email-senders-guidelines), [Valimail](https://www.valimail.com/blog/google-email-compliance-enforcement/), [dmarcwise](https://dmarcwise.io/blog/gmail-sender-requirements-enforcement)

**Enforcement ramped in 2025.** Google started actively rejecting non-compliant mail rather than just warning. ([powerdmarc](https://powerdmarc.com/gmail-enforcement-email-rejection/), [spamresource](https://www.spamresource.com/2025/11/google-warns-sender-requirements.html))

**At <5,000/day you are technically below the bulk threshold** — SafeFamily at 150–300/cohort is nowhere near this. But the DMARC/SPF/DKIM + <0.3% complaint rules are still enforced on individual domains, and Google uses them as reputation signals for smaller senders too.

### Warmup networks specifically

- **GMass shutdown (Jan 2023)** — Google told GMass to kill its warmup network or lose Gmail API access. ([prospeo](https://prospeo.io/s/does-email-warmup-work))
- **Apollo dropped warmup (2024)** and pivoted to volume-only "ramp up."
- **Postbox Services independent test** reported no measurable improvement in open rates and no lift in Google Postmaster reputation scores across nearly all major warmup tools. Explanation: automated openers on cloud infrastructure create detectable patterns; Google's ML distinguishes bot opens from human behavior. ([postboxservices](https://postboxservices.com/blogs/post/do-email-warmup-tools-work-in-2025), [prospeo](https://prospeo.io/s/does-email-warmup-work))
- **Google's position** (as reported by multiple deliverability blogs): Google can detect repetitive warmup-pattern engagement and **discounts** those signals from reputation calculations. Whether it actively **penalizes** domains is debated — the stronger consensus is "discounted/ignored," not "penalized." Mark as **partially verified**.

**Bottom line for 2026:** Warmup networks are in a worse position every year. They still provide some lift for brand-new domains with zero history, but the gap between tool-warmup and manual-warmup has narrowed or reversed. Mailivery's and Prospeo's data claim **manual 93.7% vs. automated 91.3%** inbox placement at week 4 ([mailivery](https://mailivery.io/blog/email-warmup-schedule), [prospeo](https://prospeo.io/s/automated-email-warmup)) — numbers are **vendor-reported, unverified**, but the direction matches independent sentiment.

---

## 5. Manual Warmup vs. Tool Warmup — When Each Makes Sense

### Manual warmup wins when:
- You have 1–3 inboxes on 1 domain.
- Volume is <50/day sustained.
- You have access to real humans (yourself, team, existing customers) who will genuinely engage.
- You can spend 10 min/day for 2 weeks.
- **This is SafeFamily's situation.**

Protocol (from [prospeo](https://prospeo.io/s/how-to-warm-up-an-email-address), [omnisend](https://www.omnisend.com/blog/warm-up-email-domain/), [imisofts](https://imisofts.com/blog/cold-email-domain-warmup-2026/)):
- Days 1–3: 5–10 emails/day to friendly, high-reputation inboxes (aged Gmail, Outlook) that will open and reply
- Days 4–7: 15–25/day, mix warm + first cold
- Days 8–10: 25–35/day, mostly cold
- Days 11–14: 35–50/day, full cold

### Tool warmup wins when:
- You have 3+ domains to manage in parallel
- You have 10+ inboxes (time cost of manual becomes prohibitive)
- You're an agency running sustained high-volume campaigns
- Your targets are B2B enterprise where placement testing (Mailreach) has real ROI

### Hybrid (recommended for SafeFamily):
- Manual the first 2 weeks (engaged humans, no pool)
- Layer Instantly's included warmup at LOW volume (10–20/day) as background from week 2 onward
- Skip dedicated paid warmup entirely unless Postmaster shows problems

---

## 6. Subdomain Warmup Risk Analysis — SafeFamily Specifically

**Your situation:** Root `getsafefamily.com` sends transactional via Resend. You're considering `mail.getsafefamily.com` for cold.

### The good news
Mailbox providers treat subdomains as **distinct reputation identities** from the root. Even if root is years old, a new subdomain starts at neutral/zero and must be warmed independently. **This isolates risk** — spam complaints on the cold subdomain should not directly tank root reputation. ([mailgun](https://www.mailgun.com/blog/email/the-basics-of-email-subdomains/), [growleads](https://growleads.io/blog/subdomain-for-cold-email-protect-main-domain/), [InboxAlly KB](https://docs.inboxally.com/warm-up-sending-strategy/how-does-reputation-work-between-sub-domains/))

### The nuance (important)
1. **Isolation is not absolute.** Subdomain reputation is "mostly independent" but not "fully firewalled." Extreme abuse on a subdomain (blacklistings, spam-trap hits) can bleed to the root via shared organizational DMARC alignment and provider-level "domain family" heuristics. Magnitude is disputed and **unverified at the case level**. ([mailpool](https://www.mailpool.ai/blog/subdomain-vs-root-domain-sending-the-strategic-choice-that-impacts-your-brand))
2. **DMARC alignment matters.** If root `getsafefamily.com` runs `p=reject` or `p=quarantine`, the subdomain inherits the policy **unless** you set a subdomain policy override (`sp=none`) on the root DMARC record, or publish a subdomain-specific DMARC record. Set the cold subdomain to `p=none` initially so failures don't bounce, then tighten to `p=quarantine` once stable.
3. **Name choice matters for recipient perception.** `mail.` reads as transactional/system email. `outreach.` or `hello.` or `news.` reads more honestly as marketing/outreach. Recipients and filters may weight these subtly differently. **Recommendation: use `outreach.getsafefamily.com`, not `mail.`** to avoid confusing Resend transactional and cold outreach paths both conceptually and operationally.
4. **Don't reuse `mail.` if Resend already claims it.** Check your current Resend DNS setup — if Resend has CNAMEs under `mail.` or `send.`, you must pick a different subdomain. (Resend commonly uses `send.yourdomain.com` by default.)

### Documented disaster cases
Searches did not surface high-confidence documented cases of cold-email subdomain abuse tanking root transactional reputation at small (<1000/day) volumes. At high volumes and with sustained complaint rates, anecdotes exist on r/Emailmarketing but are **unverified**. For your volume (150–300/cohort), the risk is low **if** you respect ramp and complaint thresholds.

### Net recommendation
- Use **`outreach.getsafefamily.com`** (not `mail.`) for cold.
- Set subdomain DMARC to `p=none` for the first month, tighten after.
- Keep Resend's transactional subdomain (likely `send.` or whatever Resend configured) completely separate.
- Monitor **both** root and subdomain in Google Postmaster Tools independently.

---

## 7. Recommended Setup for SafeFamily

**Domain & DNS (Week 0):**
- Create `outreach.getsafefamily.com` subdomain
- Configure SPF, DKIM (via Instantly's connected Google Workspace / M365 inbox), DMARC `v=DMARC1; p=none; rua=mailto:dmarc@getsafefamily.com`
- Verify in Google Postmaster Tools as a separate property
- Wait 7–10 days before any send

**Inboxes:**
- 3 inboxes on the subdomain (e.g., `jeremiah@`, `hello@`, `team@`). Google Workspace or M365 — avoid SMTP providers with mixed reputations.
- Full name + signature + profile photo on each.

**Warmup (Weeks 1–2):**
- Manual: 5→10→15→25 emails/day to real humans who will open and ideally reply
- Mix: yourself on Gmail, spouse, 5–10 friends, existing customers who opt in
- Add a conversational reply step — real back-and-forth is the highest-value signal

**Background (Week 2+):**
- Turn on Instantly's built-in warmup at **10–20/day max**, not the default 40+
- Leave it on continuously

**Real campaign (Week 3+):**
- Day 1 of campaign: 20 cold sends across 3 inboxes (~7 each)
- Day 2: 30. Day 3: 40. Ramp to ~75/day max during active cohort
- A 150-lead cohort = ~4 days. A 300-lead cohort = ~8 days. Never compress.
- Pauses between cohorts: 1–2 weeks minimum

**Monitoring (continuous):**
- **Google Postmaster Tools** — domain reputation, spam rate, authentication pass rate (check weekly)
- **Instantly's deliverability dashboard** — placement and bounce
- **Mail-tester.com** — one-off placement test before each cohort launch (free for 3/day)
- **Hard thresholds:** bounce rate >3% = stop, investigate list; complaint rate >0.1% = stop, review copy; Postmaster reputation <"Medium" = pause 2 weeks

**Cost:**
- Instantly subscription: already committed (~$37–97/mo depending on plan)
- Warmup: **$0 incremental**
- mail-tester credits: $0 (free tier)
- Optional later: Mailreach at $25/inbox × 3 = **$75/mo** only if Postmaster shows degradation

---

## 8. Anti-Patterns — What to Avoid

1. **Turning Instantly warmup to max (40+/day) on a brand-new domain.** The pool quality is mixed; you'll get engagement from low-reputation inboxes that Google's ML may flag. ([Mailreach critique](https://www.mailreach.co/blog/instantly-warmup-review))
2. **Using InboxAlly at SafeFamily's scale.** $149/inbox × 3 = $447/mo. You don't send enough to justify this, and its aggressive real-content engagement is the most likely model to get caught by Google's artificial-engagement detection if it tightens further.
3. **Sending cold email from root `getsafefamily.com`.** Would put your Stripe receipts, password resets, and marketing signup confirmations at risk if anything goes sideways with outreach. Subdomain isolation is cheap insurance.
4. **Using `mail.` as the cold subdomain name.** Confusing with transactional conventions. Use `outreach.` or similar.
5. **Skipping DMARC.** Google's Feb 2024 rules require it for bulk but reputation signals use it regardless. Non-negotiable. ([factors.ai](https://www.factors.ai/blog/google-bulk-email-senders-guidelines))
6. **Warmup >7 days with ZERO real sends.** The network pattern without any real engagement actually looks MORE suspicious to Google, not less. Real engagement from week 1, even if tiny.
7. **Spiking volume.** 0→150 in one day on a fresh domain = instant spam classification regardless of warmup.
8. **Paying for warmup before authentication is clean.** "Warmup is step 5, not step 1." If DNS/DMARC/list hygiene isn't solid, no tool saves you. ([Reddit consensus via skrapp.io](https://skrapp.io/blog/email-warm-up/))
9. **Using the same domain for cold outreach and Convex/Resend transactional mail without subdomain separation.**
10. **Buying a warmup tool and treating it as insurance to send more aggressively.** It isn't insurance. It's at best a modest signal booster.

---

## Sources

### Instantly / Smartlead / Mailreach
- [Mailreach: Instantly Warmup Review](https://www.mailreach.co/blog/instantly-warmup-review) (biased, but detailed)
- [Mailreach: Smartlead Warmup Alternatives](https://www.mailreach.co/blog/smartlead-warmup-alternatives)
- [Mailreach: Automated vs Manual Warmup](https://www.mailreach.co/blog/automated-vs-manual-email-warmup)
- [Smartlead Pricing](https://www.smartlead.ai/pricing)
- [Warmforge: Smartlead Warmup 30-mailbox test](https://www.warmforge.ai/blog/smartlead-email-warmup)
- [Instantly's own 2026 warmup tool roundup (self-biased)](https://instantly.ai/blog/email-warmup-tools/)

### Google 2024 sender requirements
- [Valimail: Google compliance enforcement](https://www.valimail.com/blog/google-email-compliance-enforcement/)
- [Factors.ai: Understanding Google's new guidelines](https://www.factors.ai/blog/google-bulk-email-senders-guidelines)
- [dmarcwise: Gmail enforcement](https://dmarcwise.io/blog/gmail-sender-requirements-enforcement)
- [powerdmarc: Gmail rejecting emails 2025](https://powerdmarc.com/gmail-enforcement-email-rejection/)
- [spamresource: Google warns sender requirements Nov 2025](https://www.spamresource.com/2025/11/google-warns-sender-requirements.html)
- [Google's sender guidelines FAQ](https://support.google.com/a/answer/14229414?hl=en)

### Do warmup tools actually work
- [Postbox Services: Do warmup tools work in 2025](https://postboxservices.com/blogs/post/do-email-warmup-tools-work-in-2025)
- [Prospeo: Does email warmup work (2026 data)](https://prospeo.io/s/does-email-warmup-work)
- [Prospeo: Gmail warm up honest guide 2026](https://prospeo.io/s/gmail-warm-up)
- [Prospeo: Automated email warmup what works](https://prospeo.io/s/automated-email-warmup)
- [Prospeo: How to warm up an email address 2026](https://prospeo.io/s/how-to-warm-up-an-email-address)

### Tool pricing & reviews
- [Mailivery: 11 best warmup tools 2026 (with scale pricing)](https://mailivery.io/blog/best-email-warm-up-tools)
- [Mailivery: Email warmup schedule day-by-day](https://mailivery.io/blog/email-warmup-schedule)
- [Mails.ai: Top 15 warmup services 2025](https://blog.mails.ai/posts/top-15-email-warm-up-service-comparison-for-2025)
- [Warmforge: 13 warmup tools analyzed](https://www.warmforge.ai/blog/email-warmup-tools)
- [Trulyinbox: Top 11 warmup services](https://www.trulyinbox.com/blog/email-warm-up-services/)
- [Trulyinbox: InboxAlly alternatives](https://www.trulyinbox.com/blog/inboxally-alternatives/)
- [Trulyinbox: Warmy review](https://www.trulyinbox.com/blog/warmy-review/)
- [Coldemailkit: Lemwarm review](https://coldemailkit.com/tools/lemwarm)
- [InboxAlly vs Lemwarm](https://www.inboxally.com/compare/inboxally-vs-lemwarm)
- [Emailwarmup.com: Mailwarm review](https://emailwarmup.com/blog/email-deliverability-tools/mailwarm-review/)
- [Allegrow: Warmy comparison](https://www.allegrow.co/knowledge-base/warmy-reviews)
- [Salesforge: Mailreach alternatives](https://www.salesforge.ai/blog/mailreach-alternatives)

### Subdomain strategy
- [Mailgun: Email subdomain basics](https://www.mailgun.com/blog/email/the-basics-of-email-subdomains/)
- [Mailgun: IP/domain warmup guide](https://www.mailgun.com/blog/deliverability/domain-warmup-reputation-stretch-before-you-send/)
- [Growleads: Subdomain for cold email 2026](https://growleads.io/blog/subdomain-for-cold-email-protect-main-domain/)
- [Mailpool: Subdomain vs root strategic choice](https://www.mailpool.ai/blog/subdomain-vs-root-domain-sending-the-strategic-choice-that-impacts-your-brand)
- [InboxAlly KB: Do subdomains share reputation](https://docs.inboxally.com/warm-up-sending-strategy/how-does-reputation-work-between-sub-domains/)
- [Allegrow: Subdomain best practices](https://www.allegrow.co/knowledge-base/email-subdomain-best-practices-for-deliverability)
- [Warmup Inbox: Domain warm-up guide](https://www.warmupinbox.com/blog/email-warmup/domain-warm-up/)

### Manual vs tool, Reddit sentiment
- [Skrapp: 8 best warmup tools 2025 (Reddit cites)](https://skrapp.io/blog/email-warm-up/)
- [Imisofts: Cold email domain warmup 2026 protocol](https://imisofts.com/blog/cold-email-domain-warmup-2026/)
- [Omnisend: 10 best practices 2026](https://www.omnisend.com/blog/warm-up-email-domain/)

---

*Research date: April 8, 2026. All pricing verified from vendor or comparison sources on this date. Network-size claims are vendor-reported and unverified by independent audit. Google behavior statements marked "partially verified" reflect strong deliverability-community consensus without official Google confirmation.*
