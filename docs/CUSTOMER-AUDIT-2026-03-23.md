# Customer & Billing Audit — March 23, 2026

## Action Items

### URGENT — Customers Waiting for Replies

- [ ] **Reply to Brandon Watters** (bjak24@gmail.com) — **25 DAYS WAITING**
  - Thread: Feb 27 → can't login + double billing → you promised refund + lifetime → Mar 4 password reset instructions → Mar 5 "code never shows up" → no response since
  - **DONE**: Marketing Central account created (lifetime all 3 apps)
  - **DONE**: Stripe sub cancelled, $4.99 refunded (only 1 charge found, not double)
  - **TODO**: Send him email with updated login instructions (use Forgot Password at getsafefamily.com)
  - Draft: Apologize for delay, explain new login system, confirm refund processed, confirm lifetime access

- [ ] **Reply to Crystal Dawn** (mailings@pobox.com) — **22 DAYS WAITING**
  - Thread: Mar 1 → "Is there something wrong with the website?" couldn't access SafeTube/SafeReads → no response
  - **DONE**: Marketing Central updated (now has safetube + safereads access)
  - **Issue**: Possible duplicate user record in Marketing Central (status update didn't stick cleanly)
  - **TODO**: Send her email confirming access restored, instructions to login

- [ ] **Reply to Steven Kirkham** (kirkhamsm@mac.com) — **15 DAYS WAITING**
  - Thread: Mar 8 → couldn't login to SafeTube → no response
  - **DONE**: Marketing Central account created (active, all 3 apps)
  - **TODO**: Send email confirming access, apologize for delay
  - **TODO**: Issue partial refund on his $99/yr subscription for the trouble

- [ ] **Reply to Nathan Joiner** (njoiner18@gmail.com) — **15+ DAYS WAITING**
  - Thread: Asked about features → no response
  - Trial user with 282 approved songs — potential conversion

### HIGH PRIORITY — Billing Fixes

- [ ] **Cancel Ben Purves Stripe sub** (sub_1SpIoyKgkIT46sg7xRMO13eK, $4.99/mo, cus_TmsaR5UpZBRnhB)
  - He's lifetime now — shouldn't be paying
  - You gave him all 3 apps free per email evidence
- [ ] **Cancel Jolene Bryan Stripe sub** (sub_1T1eoTKgkIT46sg7azUHDxwa, $4.99/mo, cus_Tze6XEIw4oiNRV)
  - She's lifetime in Marketing — sub should be cancelled
- [ ] **Issue partial refund to Steven Kirkham** ($99/yr, cus_U4UI0DU7vKYtTB)
  - Annual sub still active. He couldn't login for 2+ weeks.

### MEDIUM PRIORITY

- [ ] **Investigate Crystal/Chad duplicate user records** in Marketing Central
  - `updateSubscription` mutation returned different userId than `getAccount` — suggests duplicate records
  - Both currently show as `lifetime` when they should be `active` (paying customers)
- [ ] **Verify Malen Siefert** (mike@Teamsiefert.com) — new trial signup Mar 22
  - SafeTunes free trial via Stripe (cus_UF0VIFBKj5M7O6)
  - Confirm provisioned correctly in Marketing + SafeTunes
- [ ] **Investigate lcdata1701@thisishoweitis.com** — unknown customer
  - $2.99 charge on Mar 11 (ch_3R9rXYKgkIT46sg70P8dcXLT)
  - Not in any admin dashboard — who is this?
- [ ] **Fix daily Convex backup failures** (GitHub Actions failing Mar 21-22)
- [ ] **Fix SafeReads Stripe webhook delivery issues**
- [ ] **Reach out to Sadie Smith** (sadie.selk808@gmail.com) — 1907 songs, 8 kid profiles, still on trial
- [ ] **Jessica Rollins** — TABLED. 3 accounts, both refunded. Revisit later.

### LOW PRIORITY

- [ ] **Reply to Reddit partnership** — Caleb Hunt (v.caleb.hunt@reddit.com), 3 unanswered emails
- [ ] **Follow up with Abigail Finan** (abigail.finan@gmail.com) — responded positively to SafeTube pitch Jan 14
- [ ] **Verify Stripe webhook secret rotation** — GitGuardian flagged exposure Feb 5
- [ ] **Fix Sentry error** — Invalid email `gs12305@ctreg14` hitting POST /api/ (Mar 13)
- [ ] **niichota1977@yahoo.com email bounced** — Maria Todea. Marketing account created but email may be wrong.

---

## Completed Actions (This Session)

- [x] Created Marketing Central accounts for 9 lifetime users (bjak24, kristen.eleveld, cpayne333, nichita1977, niichota1977, pduffie, ginzo.web, gwdaws, Hudson.daws)
- [x] Fixed Ben Purves — Marketing now has all 3 apps (lifetime)
- [x] Fixed Steven Kirkham — Marketing account created (active, all 3 apps)
- [x] Fixed sh-lab17@artiosacademies.com — Marketing updated to lifetime
- [x] Cancelled Brandon's Stripe subscription
- [x] Brandon's $4.99 charge already refunded
- [x] Refunded Jessica Rollins — both accounts ($4.99 x2) — TABLED
- [x] Refunded 6 test account charges
- [x] Searched all 4 email inboxes for missed customer issues
- [x] Compiled sent email history to determine who got free access

---

## Financial Summary

### Revenue (All Time)

| Customer | Total Charged | Refunded | Net Revenue | Status |
|----------|--------------|----------|-------------|--------|
| mailings@pobox.com (Crystal) | $49.90 | $0 | $49.90 | Active $4.99/mo |
| chadwatsn@gmail.com (Chad) | $49.90 | $0 | $49.90 | Active $4.99/mo |
| kirkhamsm@mac.com (Steven) | $99.00 | $0 | $99.00 | Active $99/yr |
| benpurves@hotmail.com (Ben) | $34.93 | $0 | $34.93 | Active $4.99/mo — **CANCEL (lifetime)** |
| jolene_bryan@yahoo.com (Jolene) | $9.98 | $0 | $9.98 | Active $4.99/mo — **CANCEL (lifetime)** |
| jessica@jessicarollins.com | $4.99 | $4.99 | $0 | Refunded, sub active — TABLED |
| jessicarollins@icloud.com | $4.99 | $4.99 | $0 | Refunded, sub active — TABLED |
| bjak24@gmail.com (Brandon) | $4.99 | $4.99 | $0 | Refunded + cancelled |
| sh-lab17@artiosacademies.com | $9.99+ | refunded | $0 | Test account |
| lcdata1701@thisishoweitis.com | $2.99 | $0 | $2.99 | Unknown — investigate |
| mike@Teamsiefert.com (Malen) | $0 | $0 | $0 | Free trial (Mar 22) |
| **TOTAL (real customers)** | | | **~$246.70** | |

### Active Subscriptions (Real Customers)

| Customer | Plan | Amount | Stripe Sub |
|----------|------|--------|------------|
| kirkhamsm@mac.com | Annual | $99/yr | cus_U4UI0DU7vKYtTB |
| chadwatsn@gmail.com | Monthly | $4.99/mo | cus_TiMz4NQgApapci |
| mailings@pobox.com | Monthly | $4.99/mo | cus_TiitLjYNEcaIEy |
| benpurves@hotmail.com | Monthly | $4.99/mo | cus_TmsaR5UpZBRnhB — **CANCEL** |
| jolene_bryan@yahoo.com | Monthly | $4.99/mo | cus_Tze6XEIw4oiNRV — **CANCEL** |

**MRR after cancellations**: ~$18.27/mo ($9.98 monthly + $8.25 annual amortized)

---

## Complete User Database

### Paying / Active Customers

| Email | Name | Marketing | SafeTunes | SafeTube | SafeReads | Stripe | Login OK? | Notes |
|-------|------|-----------|-----------|----------|-----------|--------|-----------|-------|
| chadwatsn@gmail.com | Chad Watson | lifetime* | active | active | active | $4.99/mo active | Yes | *Should be active, not lifetime — duplicate record issue |
| mailings@pobox.com | Crystal Dawn | lifetime* | active | active | active | $4.99/mo active | Yes | *Should be active, not lifetime — duplicate record issue. **22 DAYS WAITING** |
| kirkhamsm@mac.com | Steven Kirkham | active | cancelled | active | active | $99/yr active | Yes | **15 DAYS WAITING** — partial refund owed |
| benpurves@hotmail.com | Ben Purves | lifetime | active | active | — | $4.99/mo active | Yes | Cancel sub — he's lifetime |
| jolene_bryan@yahoo.com | Jolene Bryan | lifetime | active | active | active | $4.99/mo active | Yes | Cancel sub — she's lifetime |
| sh-lab17@artiosacademies.com | — | lifetime | active | active | active | $9.99/mo | ? | Test account |
| sh-lab18@artiosacademies.com | — | expired | cancelled | trial | trial | expired | ? | Test account |

### Lifetime Users (Free / DAWSFRIEND)

| Email | Name | Marketing | SafeTunes | SafeTube | SafeReads | Login OK? | Notes |
|-------|------|-----------|-----------|----------|-----------|-----------|-------|
| jedaws@gmail.com | Jeremiah Daws | lifetime | lifetime | lifetime | lifetime | Yes | Owner |
| metrotter@gmail.com | Michelle Trotter | lifetime | lifetime | lifetime | lifetime | Yes | |
| jennydaws@gmail.com | Jenny Braziel | lifetime | lifetime | lifetime | lifetime | Yes | |
| ashley.grindlay@gmail.com | Ashley | lifetime | lifetime | — | — | Yes | |
| jdaws47@gmail.com | Josh Daws | lifetime | lifetime | — | — | Yes | |
| bjak24@gmail.com | Brandon Watters | lifetime | lifetime | lifetime | lifetime | Needs pwd reset | **25 DAYS WAITING** — refunded, sub cancelled |
| kristen.eleveld@gmail.com | Kristen Eleveld | lifetime | lifetime | — | — | Needs pwd reset | DAWSFRIEND |
| cpayne333@gmail.com | Christie Payne | lifetime | lifetime | — | — | Needs pwd reset | DAWSFRIEND |
| nichita1977@yahoo.com | Lucas Todea | lifetime | lifetime | — | — | Needs pwd reset | DAWSFRIEND |
| niichota1977@yahoo.com | Maria Todea | lifetime | lifetime | — | — | Needs pwd reset | Email may bounce |
| pduffie@comcast.net | Philip Duffie | lifetime | lifetime | — | — | Needs pwd reset | DAWSFRIEND |
| ginzo.web@gmail.com | John Ginzo | lifetime | lifetime | — | — | Needs pwd reset | DAWSFRIEND |
| gwdaws@gmail.com | Grant Daws | lifetime | lifetime | — | — | Needs pwd reset | DAWSFRIEND |
| Hudson.daws@gmail.com | Hudson Daws | lifetime | lifetime | — | — | Needs pwd reset | DAWSFRIEND |
| jessica@jessicarollins.com | Jessica Rollins | lifetime | lifetime | — | — | ? | TABLED — refunded, 3 accounts |

### Trial / Expired (No Payment)

| Email | Name | Apps | Marketing | Activity | Notes |
|-------|------|------|-----------|----------|-------|
| sadie.selk808@gmail.com | Sadie Smith | SafeTunes trial | expired | 1907 songs, 8 kids | Power user — outreach candidate |
| njoiner18@gmail.com | Nathan Joiner | SafeTunes trial | expired | 282 songs | **15+ DAYS WAITING** |
| mike@Teamsiefert.com | Malen Siefert | SafeTunes trial | ? | New signup Mar 22 | Verify provisioned |
| MattFoxTX@icloud.com | James Fox | SafeTunes trial | trial | — | |
| ddewitt@gmail.com | David DeWitt | SafeTunes trial | expired | — | |
| hromero.mx@gmail.com | Hector | SafeTunes trial | expired | — | |
| aowen@clscubs.org | Angie | ST+STube trial | expired | — | |
| anniekatehead@gmail.com | Annie Kate Head | ST+STube trial | expired | — | |
| wilsonmatthew@yahoo.com | Matt Wilson | ST+STube trial | expired | — | |
| hurtb@ccisd.com | Bonnie Hurt | ST+STube trial | expired | — | |
| nathank@icloud.com | Nathan | SafeTunes trial | expired | — | |
| checkup.maroon-39@icloud.com | Jeremy B | SafeTunes trial | expired | — | |
| juliettebechtold@gmail.com | Juliette Bechtold | ST cancelled | canceled | — | |
| danisterner@gmail.com | Dani Sterner | SafeReads trial | created | — | Marketing account created this session |
| deannaballinger@yahoo.com | Deanna Orza | SafeTunes trial | created | — | Marketing account created this session |
| linda.menking@yahoo.com | Linda Menking | SafeTunes trial | created | — | Marketing account created this session |
| belltownshell@yahoo.com | Rachelle | SafeTunes trial | created | — | Marketing account created this session |

### Unknown / Unresolved

| Email | Notes |
|-------|-------|
| lcdata1701@thisishoweitis.com | $2.99 Stripe charge Mar 11. Not in any admin dashboard. Investigate. |

---

## Who Got Free Access (Email Evidence)

### Lifetime / DAWSFRIEND
Given lifetime via promo code or manual grant:
- kristen.eleveld@gmail.com — DAWSFRIEND
- cpayne333@gmail.com — DAWSFRIEND
- nichita1977@yahoo.com — DAWSFRIEND
- niichota1977@yahoo.com — DAWSFRIEND
- pduffie@comcast.net — DAWSFRIEND
- ginzo.web@gmail.com — DAWSFRIEND
- gwdaws@gmail.com — DAWSFRIEND
- Hudson.daws@gmail.com — DAWSFRIEND
- bjak24@gmail.com — Promised lifetime after billing complaint

### All 3 Apps for Price of 1
Per email evidence (mass email sent to paying customers):
- benpurves@hotmail.com — Given all 3 free (was paying for SafeTunes only)
- mailings@pobox.com — Given all 3 free (was paying for SafeTunes only)
- chadwatsn@gmail.com — Given all 3 free (was paying for SafeTunes only)
- jolene_bryan@yahoo.com — Already lifetime all 3
- kirkhamsm@mac.com — Given all 3 (paying $99/yr annual)

---

## Recent Stripe Refunds (Mar 23, 2026)

| Charge | Customer | Amount | Refund Status |
|--------|----------|--------|---------------|
| jessica@jessicarollins.com | cus_U9NFkZCmTsInDL | $4.99 | Full refund |
| jessicarollins@icloud.com | cus_U9QZ3oQ4Isvbob | $4.99 | Full refund |
| 6 test account charges | various | $40.94 total | Full refunds |
| bjak24@gmail.com | — | $4.99 | Refunded (earlier) |

---

## Infrastructure Issues

- [ ] **Daily Convex backups failing** — GitHub Actions failed Mar 21-22
- [ ] **SafeReads webhook delivery issues** — Stripe webhooks not reaching SafeReads
- [ ] **Stripe webhook secret possibly exposed** — GitGuardian flagged Feb 5, rotation status unknown
- [ ] **Sentry error** — Invalid email `gs12305@ctreg14` hitting POST /api/ (Mar 13)

---

## Key Reference

### Admin Endpoints
```
Marketing: https://adamant-crow-705.convex.site
SafeTunes: https://formal-chihuahua-623.convex.site
SafeTube:  https://rightful-rabbit-333.convex.site
SafeReads: https://exuberant-puffin-838.convex.site
```

### Stripe Customer IDs
| Email | Stripe ID |
|-------|-----------|
| chadwatsn@gmail.com | cus_TiMz4NQgApapci |
| mailings@pobox.com | cus_TiitLjYNEcaIEy (also cus_Tj9kkIpZ8DRMFS) |
| benpurves@hotmail.com | cus_TmsaR5UpZBRnhB (also cus_Tmsnqxj0m9diyU) |
| jolene_bryan@yahoo.com | cus_Tze6XEIw4oiNRV (also cus_U5I2GN4JW9iR5z) |
| kirkhamsm@mac.com | cus_U4UI0DU7vKYtTB (also cus_U4UT5eSmoc4NAN) |
| jessica@jessicarollins.com | cus_U9NFkZCmTsInDL |
| jessicarollins@icloud.com | cus_U9QZ3oQ4Isvbob |
| mike@Teamsiefert.com | cus_UF0VIFBKj5M7O6 |

---

*Generated: March 23, 2026*
