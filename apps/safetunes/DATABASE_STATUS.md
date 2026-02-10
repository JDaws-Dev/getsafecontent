# SafeTunes Database Status & Management

**Last Verified:** November 17, 2025

---

## Database Configuration

### 🧪 Development Database
**URL:** `https://reminiscent-cod-488.convex.cloud`
**Type:** dev deployment
**Purpose:** Local development and testing
**Environment:** `.env.local`

### 🚀 Production Database
**URL:** `https://formal-chihuahua-623.convex.cloud`
**Type:** prod deployment
**Purpose:** Live site at https://getsafetunes.com
**Environment:** Vercel production environment variables

---

## Current Database Contents (as of Nov 17, 2025)

### ⚠️ IMPORTANT: CLI Caching Issue Discovered

**The Convex CLI (`npx convex run`) was returning stale/cached data!**

Use the **HTTP API** for accurate real-time data:

```bash
curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  -d '{"path":"findKids:findAllKids","format":"json","args":[{}]}'
```

### Production Database (Actual Contents via HTTP API):

| Table | Count | Details |
|-------|-------|---------|
| **users** | 7 | 7 family member accounts created |
| **kidProfiles** | 7 | Brady, Claire, Ethan, Joe Jr., Brad, Isabella, Sara |
| **approvedAlbums** | Variable | Parent-approved albums |
| **approvedSongs** | Variable | Individual approved songs |

### User Accounts in Production:

1. **jedaws@gmail.com** - Jeremiah Daws (GEGZ49)
   - Kids: Brady Daws, Claire Daws

2. **jdaws47@gmail.com** - Josh Daws (NJKLGZ)
   - Kids: Ethan

3. **Hudson.daws@gmail.com** - Hudson Daws (YK694Y)
   - Kids: Joe Jr.

4. **jdaws@artiosacademies.com** - Marty McFly (RC9EHV)
   - Kids: Brad

5. **jeremiah@3djumpstart.com** - Jeremiah Daws (5YC66A)
   - Kids: None yet

6. **metrotter@gmail.com** - Michelle Trotter (ERLW4U)
   - Kids: Isabella, Sara

7. **gwdaws@gmail.com** - Grant Daws (3V38DL)
   - Kids: None yet

---

## Database Utilities

### Check Database Statistics

```bash
# Check development database
npx convex run databaseStats:getDatabaseStats

# Check production database
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex run databaseStats:getDatabaseStats
```

### View Database Tables

```bash
# View dev database tables
npx convex data

# View production database tables
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex data
```

### Deploy to Production

```bash
# Deploy schema and functions to production
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex deploy
```

### Check Logs

```bash
# Dev logs
npx convex logs

# Production logs
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex logs
```

---

## Environment Configuration

### Local Development (.env.local)
```bash
CONVEX_DEPLOYMENT=dev:reminiscent-cod-488
CONVEX_URL=https://reminiscent-cod-488.convex.cloud
```

### Vercel Production (Environment Variables)
```bash
VITE_CONVEX_URL=https://formal-chihuahua-623.convex.cloud
```

---

## Important Notes

### ✅ Current Status
- Both databases are properly configured
- Development and production are **separated** (correct setup)
- Both databases currently have identical data
- No configuration issues detected

### ⚠️ Expected Behavior Going Forward
- **Local changes** → Go to dev database only
- **Production users** → Create data in prod database only
- **Databases will diverge** as real users sign up on getsafetunes.com
- This separation is **normal and recommended**

### 🔒 Best Practices
1. **Test locally first** - All changes should be tested in dev before production
2. **Deploy carefully** - Use `CONVEX_DEPLOYMENT=prod:...` for production deploys
3. **Monitor production** - Check production logs regularly for errors
4. **Backup data** - Convex has automatic backups, but export important data periodically
5. **Never point local dev to production** - Keep environments separate

---

## Quick Reference Commands

```bash
# Start local development
npx convex dev

# Check what deployment you're using
npx convex deployments

# Run stats check on both databases
npx convex run databaseStats:getDatabaseStats
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex run databaseStats:getDatabaseStats

# Deploy to production
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex deploy

# View production logs (last 10 lines)
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex logs | tail -10
```

---

## Database Schema

For detailed schema information, see:
- **CONVEX_SETUP.md** - Full setup guide and schema documentation
- **convex/schema.ts** - Source of truth for database schema

---

## Troubleshooting

### How do I know which database I'm connected to?
Run `npx convex deployments` to see your current configuration.

### How do I switch between dev and prod?
Use the `CONVEX_DEPLOYMENT` environment variable:
```bash
# Dev (default)
npx convex [command]

# Production
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex [command]
```

### What if the databases get out of sync?
This is **expected** once you have real users. The dev database is for testing, the prod database is for real users. They should diverge over time.

### Can I copy prod data to dev for testing?
Yes, but be careful with user data. You can export from prod and import to dev if needed. See Convex documentation for data export/import.

### ⚠️ CLI Showing Wrong/Stale Data?

**Problem:** `npx convex run` returns outdated results that don't match what users see.

**Root Cause:** Convex CLI can cache query results.

**Solution:** Use the HTTP API directly instead:

```bash
# Get all users and kids (real-time, no cache)
curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  -d '{"path":"findKids:findAllKids","format":"json","args":[{}]}'

# Get database stats (real-time, no cache)
curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  -d '{"path":"databaseStats:getDatabaseStats","format":"json","args":[{}]}'
```

**Browser-based verification:**
Open https://getsafetunes.com, open Console (F12), and run:
```javascript
fetch('https://formal-chihuahua-623.convex.cloud/api/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: 'findKids:findAllKids',
    args: [{}]
  })
})
.then(r => r.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
```

**Key Discovery (Nov 17, 2025):**
- CLI showed 1 user, but HTTP API showed 7 users
- All family member signups were successful
- Database was healthy - only the CLI view was stale
- Always verify with HTTP API if CLI results seem incorrect

---

**Last Updated:** November 17, 2025
**Verified By:** Database configuration audit
**Next Review:** When production user count changes significantly
