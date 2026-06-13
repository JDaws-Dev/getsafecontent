# JWT Auth Migration Status

**Last Updated:** March 2, 2026

## Current State: PARTIALLY WORKING

### What's Working
- ✅ All three apps deployed with new JWT auth code (SafeTunes, SafeTube, SafeReads)
- ✅ Marketing JWT endpoints deployed (/login, /verifyToken, /requestPasswordReset, /resetPassword)
- ✅ Frontend no longer calls deleted Convex functions
- ✅ Users exist in Marketing central (you, Michelle, Jenny, Steven)
- ✅ Subscription statuses are correct (lifetime for family, active for Steven)
- ✅ AuthAccounts exist for password login

### What's NOT Working
- ❌ **Password reset emails not sending** - The `/requestPasswordReset` endpoint returns success but Resend emails are NOT being delivered
- ❌ Users cannot log in because they need to set passwords via reset flow

## The Email Problem

The Resend API works when called directly via curl:
```bash
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer re_<REDACTED>..." \
  -d '{"from": "Safe Family <noreply@getsafefamily.com>", "to": ["jedaws@gmail.com"], ...}'
# Returns: {"id":"..."} - SUCCESS
```

But when called from Convex httpAction, the email doesn't arrive:
- Endpoint returns `{"success": true}`
- No error in console
- Email never arrives

### Possible Causes
1. Convex httpAction environment variable access issue
2. Network/firewall blocking outbound requests from Convex
3. Resend API call silently failing
4. Email going to spam (checked - not there)

## Users Affected

| Email | Name | Status | AuthAccount | Can Login |
|-------|------|--------|-------------|-----------|
| jedaws@gmail.com | Jeremiah Daws | lifetime | ✅ NEEDS_RESET | ❌ No |
| metrotter@gmail.com | Michelle Trotter | lifetime | ✅ NEEDS_RESET | ❌ No |
| jennydaws@gmail.com | Jenny Braziel | lifetime | ✅ NEEDS_RESET | ❌ No |
| kirkhamsm@mac.com | Steven Kirkham | active | ✅ NEEDS_RESET | ❌ No |

## Manual OTP Codes Sent

These work! Sent via direct Resend API call:
- **jedaws@gmail.com**: Code `847291`
- **metrotter@gmail.com**: Code `028817`

Users can use these on the reset password page to set their passwords.

## Next Steps

### Immediate Fix (for launch)
1. Check Convex dashboard logs at: https://dashboard.convex.dev/t/jeremiah-daws/safe-family/adamant-crow-705/logs
2. See actual error from sendPasswordResetEmail
3. Fix the email sending issue

### If Email Fix Takes Too Long
Alternative: Skip email verification, allow direct password setting:
1. Create a `/setPassword` endpoint that accepts email + new password
2. Use admin key for authentication
3. Manually set passwords for key users

### Long Term
1. Fix the Resend integration properly
2. Test password reset flow end-to-end
3. Migrate remaining app users to Marketing central
4. Remove old auth code from apps (safecontent-mqy.7)

## Key Files

### Marketing (Central Auth)
- `convex/authEndpoints.ts` - JWT login, token verify, password reset
- `convex/passwordReset.ts` - OTP token storage
- `convex/signupInternal.ts` - User credentials lookup
- `convex/accounts.ts` - User management

### Apps (JWT Consumers)
- `apps/safetunes/src/contexts/AuthContext.jsx`
- `apps/safetube/src/contexts/AuthContext.jsx`
- `apps/safereads/src/contexts/AuthContext.tsx`

## Commands

### Check user credentials
```bash
npx convex run signupInternal:getUserCredentials '{"email": "user@example.com"}'
```

### Manually create user in Marketing
```bash
npx convex run accounts:createAccount '{"email": "...", "name": "...", "selectedApps": ["safetunes", "safetube", "safereads"]}'
npx convex run accounts:updateSubscription '{"email": "...", "subscriptionStatus": "lifetime"}'
npx convex run signupInternal:addAuthAccountToExistingUser '{"email": "...", "passwordHash": "NEEDS_PASSWORD_RESET:123"}'
```

### Manually send password reset
```bash
OTP="123456"
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer re_<REDACTED-rotate-me>" \
  -H "Content-Type: application/json" \
  -d "{\"from\": \"Safe Family <noreply@getsafefamily.com>\", \"to\": [\"USER@EMAIL\"], \"subject\": \"Your Safe Family Password Reset Code: $OTP\", \"html\": \"<h1>Code: $OTP</h1>\"}"
npx convex run passwordReset:createToken "{\"email\": \"USER@EMAIL\", \"token\": \"$OTP\", \"expiresAt\": $(( $(date +%s) * 1000 + 3600000 ))}"
```

### Deploy
```bash
# Marketing Convex
CONVEX_DEPLOYMENT=prod:adamant-crow-705 npx convex deploy

# Apps Vercel
cd apps/safetunes && vercel --prod --yes
cd apps/safetube && vercel --prod --yes
cd apps/safereads && vercel --prod --yes
```
