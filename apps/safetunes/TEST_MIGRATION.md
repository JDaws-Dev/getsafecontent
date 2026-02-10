# Migration Testing Guide

## Quick Test Steps

### 1. Start Dev Environment
```bash
npm run dev
```

### 2. Test Migration Flow

#### Step 1: Check Login Page
1. Visit `http://localhost:5173/login`
2. ✅ Verify blue banner appears: "Existing users: We've upgraded our security!"
3. ✅ Verify "migrate your account" link works
4. ✅ Verify "Forgot password?" link works

#### Step 2: Test Forgot Password
1. Click "Forgot password?" on login page
2. ✅ Should go to `/forgot-password`
3. ✅ Verify blue banner mentions account migration tool
4. ✅ Verify "Account Migration tool" link works
5. Enter any email and submit
6. ✅ Verify "Check Your Email" message appears

#### Step 3: Test Migration Page
1. Go to `http://localhost:5173/migrate-account`
2. ✅ Page loads without errors
3. ✅ Info banner explains migration process

#### Step 4: Test with Legacy User
1. **Find a legacy user email** (check Convex dashboard)
   - Look for users with `passwordHash` field
2. On `/migrate-account`, enter the legacy email
3. Click "Continue"
4. ✅ Should show "Account found" green banner
5. ✅ Form should advance to password creation step
6. Enter a name and password (8+ characters)
7. Confirm password
8. Click "Migrate Account"
9. ✅ Should redirect to login with success message
10. Try logging in with the new password
11. ✅ Should login successfully
12. ✅ Verify all user data is intact (check admin dashboard)

#### Step 5: Verify Database State
1. Go to Convex dashboard
2. Find the migrated user in `users` table
3. ✅ `passwordHash` should be empty/undefined
4. ✅ All other fields preserved (familyCode, subscriptionStatus, etc.)

#### Step 6: Test Already Migrated User
1. Try migrating the same user again
2. Enter their email on `/migrate-account`
3. Click "Continue"
4. ✅ Should show error: "This account has already been migrated"

#### Step 7: Test Non-Existent User
1. Enter a fake email on `/migrate-account`
2. Click "Continue"
3. ✅ Should show error: "No account found with this email"

### 3. Test New User Signup

1. Go to `http://localhost:5173/signup`
2. ✅ Verify "Existing user who can't log in? Migrate account" link appears
3. Try signing up with an existing user's email
4. ✅ Should show error with migration link

### 4. Test Navigation Flow

```
/login
  ↓ (click "migrate your account")
/migrate-account
  ↓ (enter email)
Verify legacy user
  ↓ (create password)
Migrate complete
  ↓
/login (with success message)
  ↓ (login)
/admin or /onboarding
```

---

## Checklist Before Going Live

- [ ] Migration page works for legacy users
- [ ] Migration page rejects already-migrated users
- [ ] Migration page rejects non-existent emails
- [ ] Forgot password page loads correctly
- [ ] Login page shows migration banner
- [ ] Signup page shows migration link
- [ ] "Forgot password?" link works on login page
- [ ] Successfully migrated user can login
- [ ] User data is preserved after migration
- [ ] Old passwordHash is cleared after migration
- [ ] Better Auth session works after migration
- [ ] Admin dashboard loads for migrated user
- [ ] Family code still works after migration

---

## Common Issues & Fixes

### Issue: "Better Auth user creation failed"
**Fix:** Check that Better Auth is properly configured in `convex/auth.ts`

### Issue: "SafeTunes user not found"
**Fix:** Verify the email exists in Convex `users` table

### Issue: Page shows "Error: Cannot read property..."
**Fix:** Check browser console for specific error, verify all imports

### Issue: Migration succeeds but can't login
**Fix:**
1. Check Better Auth created the user
2. Verify passwordHash was cleared in SafeTunes table
3. Try clearing browser cookies and cache

### Issue: "User already exists" error during migration
**Fix:** The Better Auth user was already created. User can just login normally.

---

## Production Checklist

Before deploying to production:

- [ ] Test migration on staging/dev environment first
- [ ] Verify all environment variables are set in Vercel:
  - `BETTER_AUTH_SECRET`
  - `SITE_URL`
  - `NEXT_PUBLIC_CONVEX_SITE_URL`
- [ ] Test the entire flow on production URL
- [ ] Prepare email template for existing users
- [ ] Set up support email/channel for migration questions
- [ ] Monitor Convex logs during migration period
- [ ] Have rollback plan ready (git commit hash)

---

## Email Template for Users

```
Subject: Important: Update Your SafeTunes Password

Hi there,

We've upgraded SafeTunes with enhanced security features! 🎉

ACTION REQUIRED: You'll need to create a new password to continue using your account.

👉 Click here to migrate: https://getsafetunes.com/migrate-account

This takes less than 1 minute and preserves:
✅ Your family code
✅ Your subscription
✅ All approved music
✅ Kid profiles
✅ Everything else!

Why the change?
We've implemented industry-standard authentication to keep your family's data more secure.

Questions?
Reply to this email or visit getsafetunes.com/support

Thanks for being part of SafeTunes!
```

---

## Monitoring Post-Launch

Track these metrics:
- Number of legacy users who successfully migrated
- Number of failed migration attempts
- Support tickets related to migration
- Time to complete migration (should be < 2 minutes)

Goal: All 14 legacy users migrated within 7 days.

---

## Success Criteria

✅ **Migration Successful When:**
1. User can login with new password
2. All SafeTunes data preserved
3. Old passwordHash cleared from database
4. Better Auth session works properly
5. User can access admin dashboard
6. Family sharing still works

❌ **Migration Failed If:**
1. User can't login after migration
2. Data is lost or corrupted
3. Better Auth user not created
4. Multiple attempts required
5. Errors in Convex logs

---

## Next Steps After Testing

1. ✅ Test migration flow thoroughly (use this guide)
2. ✅ Fix any issues found
3. ✅ Deploy to production
4. ✅ Send email to all 14 legacy users
5. ✅ Monitor migration completion rate
6. ✅ Provide support for users who have issues
7. ✅ After all users migrated, remove legacy code

---

## Rollback Plan

If critical issues occur:

```bash
# Rollback to previous version
git checkout <previous-commit-hash>

# Redeploy
git push origin main --force

# Or use Vercel rollback feature
vercel rollback
```

**Note:** Users who already migrated will continue to work. Only new migration attempts will be affected.

---

## Questions to Ask Yourself

- [ ] Can I successfully migrate a test user?
- [ ] Does the migrated user have all their data?
- [ ] Is the migration process intuitive?
- [ ] Are error messages helpful?
- [ ] Is there a clear path if users have issues?
- [ ] Have I tested on mobile?
- [ ] Are the existing 14 users notified?

If you answered YES to all: **You're ready to go! 🚀**
