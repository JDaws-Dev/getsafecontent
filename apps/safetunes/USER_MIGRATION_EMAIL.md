# Email to Send to 14 Legacy Users

## Subject Line
**Important: Update Your SafeTunes Password**

---

## Email Body

Hi there,

We've upgraded SafeTunes with enhanced security features! 🎉

**ACTION REQUIRED:** You'll need to create a new password to continue using your account.

### How to Update Your Account (takes < 1 minute):

1. Go to https://getsafetunes.com/login
2. Enter your email and try to log in with your old password
3. You'll automatically be prompted to create a new password
4. That's it! All your data is preserved.

### What's Preserved:
✅ Your family code
✅ Your subscription
✅ All approved music
✅ Kid profiles
✅ Everything else!

### Why the Change?

We've implemented industry-standard authentication (Better Auth) to keep your family's data more secure. This is a one-time update that ensures your account is protected with the latest security standards.

### Need Help?

If you have any issues with the migration:
- Visit https://getsafetunes.com/support
- Reply to this email
- Check our migration guide: https://getsafetunes.com/migrate-account

Thanks for being part of SafeTunes! We're committed to keeping your family's music safe and secure.

Best regards,
The SafeTunes Team

---

## Alternative: If They Try the Old Separate Migration Page

If for some reason they go directly to `/migrate-account` instead of trying to login:

1. Go to https://getsafetunes.com/migrate-account
2. Enter your email address
3. Create a new secure password
4. Click "Migrate Account"
5. Done! You can now log in with your new password

---

## Testing Instructions for You

Before sending this email, test the flow one more time:

1. Go to https://getsafetunes.com/login
2. Try logging in with `metrotter@gmail.com` (or any of your 14 legacy users)
3. Enter any password → Login fails
4. **Automatic migration UI appears!**
5. Fill in name and new password
6. Submit → Account migrated!
7. Login with new password → Success!

---

## List of 14 Legacy Users

You'll need to check your production Convex database to get the list of users with `passwordHash` field set.

Go to: https://dashboard.convex.dev → Your production deployment → Functions → `createTestLegacyUser:listUsers`

Run it to see all users and which ones have `isLegacy: true`

Then send this email to all 14 of them.

---

## Monitoring

After sending the email, monitor:
- How many users successfully migrate (check Convex logs)
- Any support requests
- Failed migration attempts

**Goal:** All 14 users migrated within 7 days.
