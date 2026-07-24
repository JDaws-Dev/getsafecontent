# Convex Backup Automation Setup

> ## ⚠️ RETIRED July 20, 2026 — replaced by a LOCAL backup
>
> The GitHub Actions + Cloudflare R2 pipeline described below is **disabled** (`daily-backup.yml` state = `disabled_manually`). It had failed every night since ~July 15 for two reasons:
> 1. It ran `npx convex export` from the **repo root**, which has no `package.json` → `ENOENT` on every export. (Patched in commit `77426b61`, but moot — see below.)
> 2. **The repo has ZERO GitHub Actions secrets** (`gh secret list` → 0). Every `CONVEX_DEPLOY_KEY_*`, `R2_*`, and `RESEND_API_KEY` resolved to an empty string → "No CONVEX_DEPLOYMENT set", dead R2 upload, and a `401` on the Resend alert.
>
> Rather than provision R2 + 6 deploy keys for a family-scale app, backups now run **locally**. See **[Current setup](#current-setup-local-launchd--icloud)** below. Everything after that section is kept for historical reference only.
>
> ---
>
> ## Current setup (local launchd → iCloud)
>
> - **Script**: `scripts/backup-convex-local.sh` — exports **all 6 production deployments** using the locally-authenticated Convex CLI. **No secrets, no R2, no deploy keys.**
> - **Schedule**: launchd agent `~/Library/LaunchAgents/com.safefamily.convexbackup.plist` (label `com.safefamily.convexbackup`), **daily 3:00 AM local**. Log: `~/Library/Logs/safefamily-backup.log`.
> - **Destination**: iCloud Drive — `~/Library/Mobile Documents/com~apple~CloudDocs/SafeFamilyBackups/` (off-site via iCloud sync). Override with `SAFEFAMILY_BACKUP_DIR`.
> - **Retention**: 30 days (`find -mtime +30 -delete`).
> - **Coverage**: safetunes, safetube, safereads, **safestudy**, **safespark**, marketing — the old CI skipped SafeStudy and SafeSpark entirely.
> - **Run manually**: `launchctl start com.safefamily.convexbackup`
> - **Restore**: `npx convex import` from the relevant `.zip`.
>
> **⚠️ Critical gotcha:** target each deployment **explicitly** with `npx convex export --deployment-name <name>`. Using `CONVEX_DEPLOYMENT=prod:<name>` **silently misroutes** — a SafeTunes export via that env hit the *dev* deployment (`reminiscent-cod-488`) instead of prod, producing a useless backup. `--deployment-name` and `--prod` both target correctly.
>
> Verified July 20, 2026: manual run produced all 6 zips in iCloud (safespark ~30M, safetunes 3M, safetube 1.4M, safestudy 385K, safereads 280K, marketing 64K) — "6 ok, none failed".

---

## Historical: GitHub Actions + R2 (retired)

Automated daily backups of all Convex production deployments to Cloudflare R2.

## Overview

- **Schedule**: Daily at 3:00 AM UTC
- **Storage**: Cloudflare R2 (S3-compatible)
- **Retention**: 30 days (auto-deleted via R2 lifecycle rules)
- **Alert**: Email on failure via Resend

## Required Secrets

Add these secrets to GitHub repository settings:

### Convex Deploy Keys

Get production deploy keys from [Convex Dashboard](https://dashboard.convex.dev) → Project → Settings → Deploy Keys.

| Secret | Value |
|--------|-------|
| `CONVEX_DEPLOY_KEY_SAFETUNES` | `prod:formal-chihuahua-623\|eyJ...` |
| `CONVEX_DEPLOY_KEY_SAFETUBE` | `prod:rightful-rabbit-333\|eyJ...` |
| `CONVEX_DEPLOY_KEY_SAFEREADS` | `prod:exuberant-puffin-838\|eyJ...` |
| `CONVEX_DEPLOY_KEY_MARKETING` | `prod:adamant-crow-705\|eyJ...` |

### Cloudflare R2 Credentials

Get from [Cloudflare Dashboard](https://dash.cloudflare.com) → R2 → Manage R2 API Tokens.

| Secret | Description |
|--------|-------------|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | Bucket name (e.g., `safefamily-backups`) |

### Email Alerts

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | Already configured in Vercel - use same key |

## R2 Bucket Setup

### 1. Create Bucket

```bash
# Via Wrangler CLI
npm install -g wrangler
wrangler r2 bucket create safefamily-backups
```

Or via Cloudflare Dashboard → R2 → Create bucket.

### 2. Create API Token

1. Go to R2 → Manage R2 API Tokens
2. Create token with:
   - Permission: Object Read & Write
   - Scope: Apply to specific bucket → `safefamily-backups`
3. Save the Access Key ID and Secret Access Key

### 3. Configure 30-Day Retention

Add lifecycle rule to auto-delete old backups:

```bash
# Via Wrangler CLI
wrangler r2 bucket lifecycle add safefamily-backups \
  --prefix "" \
  --expire-days 30
```

Or via Dashboard:
1. R2 → `safefamily-backups` → Settings
2. Object lifecycle rules → Add rule
3. Rule name: "Delete after 30 days"
4. Apply to all objects (or prefix: empty)
5. Action: Expire/delete after 30 days

## Manual Trigger

Run backup manually via GitHub Actions:

1. Go to Actions → "Daily Convex Backup"
2. Click "Run workflow"
3. Optionally check "Include file storage" for full backup

## Monitoring

### Check backup status

View run history in GitHub Actions → "Daily Convex Backup".

### List backups in R2

```bash
# Via Wrangler CLI
wrangler r2 object list safefamily-backups

# Or via AWS CLI (S3 compatible)
aws s3 ls s3://safefamily-backups/ \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

### Restore from backup

```bash
# 1. Download from R2
wrangler r2 object get safefamily-backups/2026-02-24/safetunes-2026-02-24.zip \
  --local ./restore/safetunes.zip

# 2. Unzip
unzip ./restore/safetunes.zip -d ./restore/safetunes

# 3. Import to Convex (use with caution - overwrites data!)
cd ~/safecontent/apps/safetunes
npx convex import --path ./restore/safetunes

# Or to a specific deployment
CONVEX_DEPLOY_KEY="prod:formal-chihuahua-623|..." npx convex import --path ./restore/safetunes
```

## Cost Estimate

Cloudflare R2 pricing (as of 2026):
- Storage: $0.015/GB/month
- Class A operations (writes): $4.50/million
- Class B operations (reads): $0.36/million

Estimated monthly cost for backups:
- 4 apps × ~50MB each × 30 days = ~6GB storage = ~$0.09/month
- Daily writes: negligible

**Free tier**: 10GB storage + 1M writes/month = likely $0/month

## Troubleshooting

### Export fails with "not authenticated"

Check that the deploy key:
1. Is a **production** deploy key (starts with `prod:`)
2. Includes the full key including the `|eyJ...` part
3. Is set as a GitHub secret (not just env var)

### R2 upload fails

1. Verify R2 credentials have write permission
2. Check bucket exists and name matches secret
3. Ensure API token has access to the specific bucket

### Email alert not sending

1. Verify `RESEND_API_KEY` is set
2. Check Resend dashboard for email logs
3. Ensure `noreply@getsafefamily.com` is a verified sender
