# Resend Email Integration Plan (Auth Only)

> Saved for later implementation

## Overview

Configure Supabase to use Resend as its SMTP provider for authentication emails:
- Email confirmation on signup
- Password reset emails

## Scope

This is primarily **configuration work**, minimal code changes required.

## Implementation Steps

### Step 1: Create Resend Account

1. Sign up at [resend.com](https://resend.com)
2. Get API key from dashboard (this doubles as SMTP password)

### Step 2: Domain Verification (Production)

1. In Resend dashboard: Domains → Add Domain
2. Add DNS records (TXT, DKIM) to your domain
3. Wait for verification (usually a few minutes)

For testing, you can use Resend's test domain (`onboarding@resend.dev`)

### Step 3: Configure Supabase SMTP (Production)

In Supabase Dashboard → Settings → Auth → SMTP Settings:

| Setting | Value |
|---------|-------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Your Resend API key |
| Sender email | `noreply@yourdomain.com` |
| Sender name | `Block Club` |

### Step 4: Enable Email Confirmations

In Supabase Dashboard → Settings → Auth → Email Auth:
- Enable "Confirm email" toggle

### Step 5: Update Local Supabase Config

Modify `supabase/config.toml`:

```toml
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true  # Changed from false
```

For local development with SMTP (optional):
```toml
[auth.email.smtp]
enabled = true
host = "smtp.resend.com"
port = 465
user = "resend"
pass = "env(RESEND_API_KEY)"
sender_name = "Block Club"
```

### Step 6: Customize Email Templates (Optional)

In Supabase Dashboard → Auth → Email Templates, customize:

**Confirm signup:**
```html
<h2>Welcome to Block Club!</h2>
<p>Click below to confirm your email:</p>
<a href="{{ .ConfirmationURL }}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
  Confirm Email
</a>
```

**Reset password:**
```html
<h2>Reset Your Password</h2>
<p>Click below to reset your password:</p>
<a href="{{ .ConfirmationURL }}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
  Reset Password
</a>
```

## Files to Modify

- `supabase/config.toml` - Enable email confirmations
- `apps/web/.env.example` - Document RESEND_API_KEY (for local SMTP)

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `RESEND_API_KEY` | `.env.local` / Vercel | SMTP password for local dev |

Note: Production SMTP is configured in Supabase Dashboard, not env vars.

## Verification

1. **Test signup flow:**
   - Create new account with real email
   - Verify confirmation email arrives
   - Click link, confirm account is activated

2. **Test password reset:**
   - Click "Forgot password" on signin page
   - Verify reset email arrives
   - Complete password reset flow

3. **Check Resend dashboard:**
   - View sent emails
   - Monitor delivery status

---

## Future: Notification Emails

When ready to add loan notifications, will need:
- Install `resend` and `@react-email/components` packages
- Create email service module at `apps/web/src/lib/email/`
- Add React Email templates for loan notifications
- Create server actions to trigger emails on loan events
