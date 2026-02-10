# Legacy User Migration Guide

## Problem
After upgrading to Better Auth, existing 14 users with bcrypt password hashes in the SafeTunes database cannot log in because:
1. Better Auth uses its own separate database tables for authentication
2. Old users only exist in the SafeTunes `users` table (not in Better Auth's tables)
3. When they try to login, Better Auth doesn't find them

## Solution Implemented

We've created a **seamless migration flow** that allows existing users to migrate their accounts with minimal friction.

### What We Built

#### 1. **Account Migration Page** (`/migrate-account`)
- Verifies the user exists in the legacy system
- Allows them to create a new password for Better Auth
- Preserves all their existing data (family code, subscription, approved music, etc.)
- Automatically links the new Better Auth account to their SafeTunes data

#### 2. **Forgot Password Page** (`/forgot-password`)
- Working "Forgot Password" link on login page
- Directs users to either migrate (if legacy) or contact support
- Future-ready for full password reset functionality

#### 3. **Updated Login Page**
- Banner alerting existing users about the migration
- Working "Forgot password?" link
- Clear instructions to migrate account if login fails

#### 4. **Updated Signup Page**
- Link to migration page for existing users
- Better error handling for duplicate accounts

#### 5. **Backend Migration Support**
- Updated `syncBetterAuthUser` mutation to handle legacy users
- Automatically clears old `passwordHash` when migration completes
- Preserves all existing user data

---

## How It Works

### For Existing Users:

1. **User tries to login** → Gets error (Better Auth doesn't have their credentials)
2. **User sees blue banner** → "Existing users: migrate your account"
3. **User clicks "migrate account"** → Goes to `/migrate-account`
4. **Enter email** → System checks if they're a legacy user
5. **Set new password** → Creates Better Auth account
6. **Migration complete** → Can now login with new password

### Behind the Scenes:

```
1. User submits email on /migrate-account
   ↓
2. System queries SafeTunes users table
   ↓
3. If user has passwordHash → Legacy user (needs migration)
   If no passwordHash → Already migrated
   ↓
4. User creates new password
   ↓
5. Better Auth creates new user account
   ↓
6. syncBetterAuthUser mutation:
   - Finds existing SafeTunes user by email
   - Clears old passwordHash
   - Links Better Auth account to SafeTunes data
   ↓
7. User can now login normally
```

---

## Files Created/Modified

### New Files:
- ✅ `src/pages/MigrateAccountPage.jsx` - Account migration UI
- ✅ `src/pages/ForgotPasswordPage.jsx` - Password reset UI
- ✅ `convex/legacyAuth.ts` - Legacy user verification queries
- ✅ `convex/migrateLegacyUsers.ts` - Migration helper functions

### Modified Files:
- ✅ `src/App.jsx` - Added `/migrate-account` and `/forgot-password` routes
- ✅ `src/pages/LoginPage.jsx` - Added migration banner + working forgot password link
- ✅ `src/pages/SignupPage.jsx` - Added migration link for existing users
- ✅ `convex/userSync.ts` - Updated to handle legacy user migration

---

## User Instructions

### For Your 14 Existing Users:

**Send them this email:**

---

**Subject: Action Required: SafeTunes Account Migration**

Hi [Name],

We've upgraded SafeTunes with better security! To continue using your account, you'll need to migrate to our new authentication system.

**This is quick and easy:**

1. Go to: https://getsafetunes.com/migrate-account
2. Enter your email address
3. Create a new password (your old one won't work anymore)
4. Done! All your approved music and settings are preserved.

**What stays the same:**
- Your family code
- Your subscription status
- All approved albums and songs
- Kid profiles
- Everything else!

**What's new:**
- More secure authentication
- Better session management
- Improved password security

If you have any issues, reply to this email or contact support at support@getsafetunes.com

Thanks for being an early supporter!

The SafeTunes Team

---

## Testing Checklist

Before sending the migration email, test the flow:

- [ ] Visit `/migrate-account`
- [ ] Enter an existing user's email (one with passwordHash)
- [ ] Verify it shows "Account found" message
- [ ] Create a new password
- [ ] Click "Migrate Account"
- [ ] Verify redirect to login with success message
- [ ] Login with the new password
- [ ] Verify all user data is intact (family code, subscriptions, music library)
- [ ] Check Convex dashboard - old passwordHash should be cleared

---

## Database State

### Before Migration:
```javascript
// SafeTunes users table
{
  _id: "xyz123",
  email: "user@example.com",
  passwordHash: "$2b$10$...", // OLD bcrypt hash
  name: "John Doe",
  familyCode: "ABC123",
  subscriptionStatus: "active",
  // ... other data
}

// Better Auth tables
// ❌ No user found
```

### After Migration:
```javascript
// SafeTunes users table
{
  _id: "xyz123",
  email: "user@example.com",
  passwordHash: undefined, // ✅ CLEARED
  name: "John Doe",
  familyCode: "ABC123",
  subscriptionStatus: "active",
  // ... all other data preserved
}

// Better Auth tables
{
  id: "ba_xyz789",
  email: "user@example.com",
  emailVerified: true,
  name: "John Doe",
  // ... Better Auth manages passwords securely
}
```

---

## Troubleshooting

### User says "Email not found"
- Check if their email is spelled correctly
- Verify they're in the SafeTunes users table
- Check Convex dashboard for their record

### User says "Already migrated"
- They can just login normally
- Direct them to `/login`

### User can't login after migration
- Check if Better Auth user was created
- Check if passwordHash was cleared in SafeTunes table
- Verify syncBetterAuthUser ran successfully
- Check browser console for errors

### Migration fails
- Check Convex logs for errors
- Verify Better Auth is configured correctly
- Check SITE_URL environment variable

---

## Future Improvements

1. **Automatic Email Notifications**
   - Set up email service (Resend, SendGrid, etc.)
   - Send migration emails automatically
   - Send confirmation after migration

2. **Password Reset for Better Auth Users**
   - Implement full password reset flow
   - Email reset links
   - Token expiration

3. **Bulk Migration Script**
   - Migrate all 14 users at once
   - Send them temporary passwords
   - Force password change on first login

4. **Admin Dashboard**
   - Show migration status for all users
   - Send migration reminders
   - Track completion rate

---

## Security Notes

✅ **What's Secure:**
- New passwords are hashed by Better Auth (server-side bcrypt)
- Old password hashes are cleared after migration
- Better Auth uses HTTP-only cookies
- Sessions expire and refresh automatically
- CSRF protection enabled

❌ **Don't Do This:**
- Don't try to copy old bcrypt hashes to Better Auth
- Don't store passwords in plaintext anywhere
- Don't disable Better Auth security features
- Don't skip the migration - it's important!

---

## Quick Reference

| Route | Purpose |
|-------|---------|
| `/migrate-account` | Migrate legacy users to Better Auth |
| `/forgot-password` | Password reset (directs to migration for legacy users) |
| `/login` | Login page with migration banner |
| `/signup` | Signup with migration link |

| Query/Mutation | Purpose |
|----------------|---------|
| `api.users.getUserByEmail` | Check if user exists in SafeTunes |
| `api.userSync.syncBetterAuthUser` | Link Better Auth to SafeTunes, handle migration |
| `signUp.email()` | Create Better Auth account |
| `signIn.email()` | Login with Better Auth |

---

## Need Help?

- Better Auth docs: https://www.better-auth.com/docs
- Convex docs: https://docs.convex.dev
- Support: support@getsafetunes.com

---

**Status: ✅ Ready for Testing**

Test the migration flow with 1-2 users before sending the email to all 14 users.
