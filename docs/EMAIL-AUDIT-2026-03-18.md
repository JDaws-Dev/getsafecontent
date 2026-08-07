# Email & Database Audit — March 18, 2026

## URGENT (Do Today)

### 1. Reply to Brandon (bjak24@gmail.com) — 13 DAYS WAITING
- **Timeline**: Feb 27 complained can't login + double billing → you promised refund + lifetime → Mar 4 you sent password reset instructions → Mar 5 he said "code never shows up in my email" → **NO RESPONSE SINCE**
- **Root cause**: NOT in Marketing Central. JWT auth requires Marketing account. No account = no password reset emails.
- **Action**:
  - [ ] Create Marketing Central account for bjak24@gmail.com
  - [ ] Verify password reset works for him
  - [ ] Check Stripe for double billing (receipts #2511-7239 and #2464-9964) and issue refunds as promised
  - [ ] Email him with updated login instructions
- **DB status**: lifetime in SafeTunes, SafeTube, SafeReads. Zero activity on all 3.

### 2. Create Marketing Central Accounts for Missing Users
These users exist in individual app DBs but NOT in Marketing Central — they cannot log in under JWT auth:

| Email | Name | App Access |
|---|---|---|
| bjak24@gmail.com | Brandon R Watters | SafeTunes, SafeTube, SafeReads (all lifetime) |
| kristen.eleveld@gmail.com | Kristen Eleveld | SafeTunes (lifetime, DAWSFRIEND) |
| cpayne333@gmail.com | Christie Payne | SafeTunes (lifetime, DAWSFRIEND) |
| nichita1977@yahoo.com | Lucas Todea | SafeTunes (lifetime, DAWSFRIEND) |
| niichota1977@yahoo.com | Maria Todea | SafeTunes (lifetime, DAWSFRIEND) |
| pduffie@comcast.net | Philip Duffie | SafeTunes (lifetime, DAWSFRIEND) |
| ginzo.web@gmail.com | John Ginzo | SafeTunes (lifetime, DAWSFRIEND) |
| gwdaws@gmail.com | Grant Daws | SafeTunes (lifetime, DAWSFRIEND) |
| Hudson.daws@gmail.com | Hudson Daws | SafeTunes (lifetime, DAWSFRIEND) |
| danisterner@gmail.com | Dani Sterner | SafeReads (trial) |
| deannaballinger@yahoo.com | Deanna Orza | SafeTunes (trial) |
| linda.menking@yahoo.com | Linda Menking | SafeTunes (trial) |
| belltownshell@yahoo.com | Rachelle | SafeTunes (trial) |

### 3. Fix Status Mismatches in Marketing Central

| Email | Issue |
|---|---|
| benpurves@hotmail.com | Marketing shows safetunes only, but has SafeTube/SafeReads access in apps |
| mailings@pobox.com | Marketing shows safetunes only, but has SafeTube/SafeReads access in apps |
| chadwatsn@gmail.com | Marketing shows safetunes only, but has SafeTube/SafeReads access in apps |
| kirkhamsm@mac.com | Active in SafeTube/SafeReads apps but expired in Marketing |
| sh-lab17@artiosacademies.com | Active in all 3 apps but expired in Marketing |
| jolene_bryan@yahoo.com | Lifetime in Marketing but still paying (active) in individual apps — cancel her Stripe sub? |

---

## HIGH PRIORITY (This Week)

### 4. Verify Stripe Webhook Secret Rotation
- GitGuardian flagged Stripe Webhook Secret exposed in `JDaws-Dev/SafeTube` on Feb 5, 2026
- GitHub also flagged it
- If not rotated, do it NOW

### 5. Brandon's Stripe Refund
- He was promised a refund on Feb 28
- Receipt #2511-7239 ($4.99 SafeTunes, Feb 28)
- Receipt #2464-9964 (unknown amount, also Feb 28 — "double billing")
- No Stripe customer ID on his records — need to search Stripe by email

### 6. Investigate Jessica Rollins Duplicate
- `jessica@jessicarollins.com` — lifetime, Stripe cus_U9NFkZCmTsInDL
- `jessicarollins@icloud.com` — trial, Stripe cus_U9QZ3oQ4Isvbob
- Same person? Consolidate?

### 7. Convert Power Trial User: Sadie Smith
- `sadie.selk808@gmail.com` — 1907 approved songs, 8 kid profiles, still on trial
- Heavy user who never paid — worth a personal outreach

---

## MEDIUM PRIORITY

### 8. Reply to Reddit Partnership
- Caleb Hunt (v.caleb.hunt@reddit.com) — 3 emails (Feb 19, 24, 27) about Reddit Ads for SafeTunes
- Unanswered

### 9. Follow Up with Abigail Finan
- abigail.finan@gmail.com — responded positively to SafeTube pitch Jan 14
- No follow-up

### 10. Fix Sentry Errors
- SAFE-FAMILY-MARKETING-5: Invalid email `gs12305@ctreg14` hitting POST /api/ (Mar 13) — add validation
- Earlier errors (Feb 12) may already be resolved: Redis URL, getCurrentUser, provisioning failures, applyLifetimeCode

### 11. App Store SafeTunes iOS
- Two submission rejections in Dec 2025 — were these resolved?

---

## Complete User Database Snapshot

### Paying/Active Customers

| Email | Name | SafeTunes | SafeTube | SafeReads | Marketing | Stripe ID |
|---|---|---|---|---|---|---|
| benpurves@hotmail.com | Ben Purves | active | active | — | active (safetunes) | cus_Tmsnqxj0m9diyU |
| mailings@pobox.com | Crystal | active | active | active | active (safetunes) | cus_Tj9kkIpZ8DRMFS |
| chadwatsn@gmail.com | Chad Watson | active | active | active | active (safetunes) | cus_TiMz4NQgApapci |
| jolene_bryan@yahoo.com | Jolene Bryan | active | active | active | lifetime (all 3) | cus_U5I2GN4JW9iR5z |
| jessica@jessicarollins.com | Jessica Rollins | lifetime | lifetime | — | lifetime (all 3) | cus_U9NFkZCmTsInDL |
| MattFoxTX@icloud.com | James Fox | trial | — | — | trial (safetunes) | cus_UAO79h3tWLlbwU |
| kirkhamsm@mac.com | Steven Kirkham | cancelled | active | active | expired | cus_U4UT5eSmoc4NAN |
| sh-lab17@artiosacademies.com | — | active | active | active | expired | cus_U56khvD7LqiTx2 |
| sh-lab18@artiosacademies.com | — | cancelled | trial | trial | expired | cus_U4tBSRsgF5dkqv |

### Lifetime (DAWSFRIEND / Manual)

| Email | Name | SafeTunes | SafeTube | SafeReads | Marketing |
|---|---|---|---|---|---|
| jedaws@gmail.com | Jeremiah | lifetime | lifetime | lifetime | lifetime (all 3) |
| metrotter@gmail.com | Michelle | lifetime | lifetime | lifetime | lifetime (all 3) |
| jennydaws@gmail.com | Jenny | lifetime | lifetime | lifetime | lifetime (all 3) |
| ashley.grindlay@gmail.com | Ashley | lifetime | — | — | lifetime (safetunes) |
| jdaws47@gmail.com | Josh Daws | lifetime | — | — | lifetime (safetunes) |
| bjak24@gmail.com | Brandon | lifetime | lifetime | lifetime | **MISSING** |
| kristen.eleveld@gmail.com | Kristen | lifetime | — | — | **MISSING** |
| cpayne333@gmail.com | Christie | lifetime | — | — | **MISSING** |
| nichita1977@yahoo.com | Lucas | lifetime | — | — | **MISSING** |
| niichota1977@yahoo.com | Maria | lifetime | — | — | **MISSING** |
| pduffie@comcast.net | Philip | lifetime | — | — | **MISSING** |
| ginzo.web@gmail.com | John | lifetime | — | — | **MISSING** |
| gwdaws@gmail.com | Grant | lifetime | — | — | **MISSING** |
| Hudson.daws@gmail.com | Hudson | lifetime | — | — | **MISSING** |

### Trial/Expired (No Payment)

| Email | Name | Apps | Marketing |
|---|---|---|---|
| ddewitt@gmail.com | David DeWitt | SafeTunes trial | expired |
| juliettebechtold@gmail.com | Juliette Bechtold | SafeTunes cancelled | canceled |
| sadie.selk808@gmail.com | Sadie Smith | SafeTunes trial (1907 songs!) | expired |
| njoiner18@gmail.com | Nathan | SafeTunes trial (282 songs) | expired |
| hromero.mx@gmail.com | Hector | SafeTunes trial | expired |
| aowen@clscubs.org | Angie | SafeTunes+SafeTube trial | expired |
| anniekatehead@gmail.com | Annie Kate Head | SafeTunes+SafeTube trial | expired |
| wilsonmatthew@yahoo.com | Matt Wilson | SafeTunes+SafeTube trial | expired |
| hurtb@ccisd.com | Bonnie Hurt | SafeTunes+SafeTube trial | expired |
| danisterner@gmail.com | Dani Sterner | SafeReads trial | **MISSING** |
| deannaballinger@yahoo.com | Deanna Orza | SafeTunes trial | **MISSING** |
| linda.menking@yahoo.com | Linda Menking | SafeTunes trial | **MISSING** |
| belltownshell@yahoo.com | Rachelle | SafeTunes trial | **MISSING** |
| nathank@icloud.com | Nathan | SafeTunes trial | expired |
| checkup.maroon-39@icloud.com | Jeremy B | SafeTunes trial | expired |

---

## What We Couldn't Check (Need Jarvis MCP)

- [ ] Actual inboxes for jeremiah@getsafetube.com, jeremiah@getsafetunes.com, jeremiah@getsafefamily.com — only had access to jedaws@gmail.com via Claude AI Gmail. Business inboxes may have additional customer emails we haven't seen.
- [ ] Stripe dashboard directly — need to search for bjak24@gmail.com, verify refund status, check for duplicate subscriptions across all customers
- [ ] Whether any customers emailed the business addresses with issues that never reached jedaws@gmail.com
