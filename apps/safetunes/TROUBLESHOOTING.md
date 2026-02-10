# SafeTunes Troubleshooting Guide

**Last Updated:** November 17, 2025

---

## 🔍 Database Issues

### Problem: Convex CLI Shows Wrong/Stale Data

**Symptoms:**
- `npx convex run` returns outdated results
- CLI shows fewer users/kids than actually exist
- Data on live site doesn't match CLI queries
- Browser shows different data than CLI

**Example:**
```bash
# CLI shows only 1 user
npx convex run findKids:findAllKids
# Result: 1 user, 2 kids

# But live site shows 7 users with 7 kids
```

**Root Cause:**
The Convex CLI can cache query results, showing stale data even when the database has been updated.

**Solution 1: Use HTTP API (Recommended)**

Query the database directly via HTTP to bypass CLI caching:

```bash
# Get all users and kids (real-time, no cache)
curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  -d '{"path":"findKids:findAllKids","format":"json","args":[{}]}'

# Get database statistics
curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  -d '{"path":"databaseStats:getDatabaseStats","format":"json","args":[{}]}'

# Get all users
curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  -d '{"path":"checkAllUsers:getAllUsers","format":"json","args":[{}]}'
```

**Solution 2: Browser Console Verification**

1. Go to https://getsafetunes.com
2. Open Developer Tools (F12)
3. Go to Console tab
4. Run this code:

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

**Solution 3: Check Convex Dashboard**

1. Go to https://dashboard.convex.dev
2. Log into your account
3. Select the `applemusicwhitelist` project
4. Click on the `formal-chihuahua-623` deployment (production)
5. Go to "Data" tab
6. Manually browse the `users` and `kidProfiles` tables

**Prevention:**
- Always verify critical data with HTTP API instead of CLI
- Use browser console for quick verification
- Check Convex Dashboard when in doubt

**Real Case Study (Nov 17, 2025):**
- Issue: User reported seeing Claire and Brady on live site, but CLI showed they didn't exist
- Investigation: CLI showed 1 user, HTTP API showed 7 users
- Resolution: Database was healthy - only CLI view was stale
- Impact: None - all user signups worked correctly, data was never lost

---

## 🔐 Authentication Issues

### Problem: User Can't Log In

**Check:**
1. Verify email is in database:
   ```bash
   curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
     -H 'Content-Type: application/json' \
     -d '{"path":"users:getUserByEmail","format":"json","args":[{"email":"user@example.com"}]}'
   ```

2. Check browser console for errors
3. Verify password is correct (re-send password reset if needed)

### Problem: Kid Login Not Working

**Check:**
1. Verify family code exists and is correct
2. Check kid profile has correct PIN
3. Verify kid profile belongs to the right user

---

## 🌐 Deployment Issues

### Problem: Environment Variable Has Newline Character

**Symptom:**
Environment variable looks like: `"https://formal-chihuahua-623.convex.cloud\n"`

**Impact:**
Actually harmless! JavaScript's `.trim()` automatically removes it. The site works fine.

**Fix (if desired):**
```bash
# Remove the variable
vercel env rm VITE_CONVEX_URL production

# Add it back without newline
printf "https://formal-chihuahua-623.convex.cloud" | vercel env add VITE_CONVEX_URL production

# Redeploy
vercel --prod --yes
```

**Verification:**
```bash
# Check the variable
vercel env pull --environment production .env.check
cat .env.check | grep CONVEX_URL | od -c
# Should end with " not \n"
```

---

## 📊 Data Verification Commands

### Quick Health Check

```bash
# Production database stats (via HTTP API)
curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  -d '{"path":"databaseStats:getDatabaseStats","format":"json","args":[{}]}' \
  | python3 -m json.tool

# All users
curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  -d '{"path":"checkAllUsers:getAllUsers","format":"json","args":[{}]}' \
  | python3 -m json.tool

# All kids
curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  -d '{"path":"findKids:findAllKids","format":"json","args":[{}]}' \
  | python3 -m json.tool
```

### Find Specific User

```bash
# By email
curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  -d '{"path":"users:getUserByEmail","format":"json","args":[{"email":"jedaws@gmail.com"}]}' \
  | python3 -m json.tool

# By family code
curl -X POST 'https://formal-chihuahua-623.convex.cloud/api/query' \
  -H 'Content-Type: application/json' \
  -d '{"path":"kidProfiles:getKidProfilesByFamilyCode","format":"json","args":[{"familyCode":"GEGZ49"}]}' \
  | python3 -m json.tool
```

---

## 🚨 Common Error Messages

### "Could not find function"

**Error:**
```
Error: Could not find function for 'someFunction:someQuery'
```

**Cause:** Function hasn't been deployed to that environment

**Fix:**
```bash
# Deploy to production
CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex deploy

# Or deploy to dev
npx convex dev --once
```

### "ArgumentValidationError"

**Error:**
```
ArgumentValidationError: Found ID "xxx" from table `recentlyPlayed`, which does not match the table name in validator `v.id("users")`
```

**Cause:** Using an ID from the wrong table

**Fix:** Verify you're using the correct ID type for the function argument

---

## 📞 Getting Help

If you encounter an issue not covered here:

1. **Check recent logs:**
   ```bash
   CONVEX_DEPLOYMENT=prod:formal-chihuahua-623 npx convex logs --history 100
   ```

2. **Verify with HTTP API** (not CLI) to ensure data accuracy

3. **Check Convex Dashboard:** https://dashboard.convex.dev

4. **Review PROGRESS.md** for recent changes and known issues

5. **Check browser console** on live site for client-side errors

---

## 📚 Additional Resources

- **Database Status:** See `DATABASE_STATUS.md`
- **Convex Setup:** See `CONVEX_SETUP.md`
- **Production Checklist:** See `PRODUCTION_CHECKLIST.md`
- **Development Progress:** See `PROGRESS.md`

---

**Remember:** When in doubt, verify with the HTTP API or Convex Dashboard. The CLI can be misleading due to caching!
