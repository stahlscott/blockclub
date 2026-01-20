# Email Management Feature Design

**Date:** 2026-01-20
**Status:** Ready for implementation

## Problem

Users who sign up with a typo in their email address get stuck on the "Check your email" page. They never receive the confirmation email and have no way to correct the mistake or resend the confirmation.

## Solution

Add email management capabilities in two places:

1. **Signup confirmation page** - Help unverified users who typed their email wrong
2. **Account Settings** - Allow verified users to change their email later

## Implementation Details

### 1. Database Migration: Sync Email Changes

**File:** `supabase/migrations/00020_sync_email_changes.sql`

Create a trigger to sync email changes from `auth.users` to `public.users`:

```sql
-- Sync email changes from auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.users
    SET email = NEW.email
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_change();
```

This complements the existing `on_auth_user_created` trigger (migration 00003) which only handles INSERT.

### 2. Signup Page: Check Your Email State

**File:** `apps/web/src/app/(auth)/signup/page.tsx`

Enhance the success state (lines 76-93) with:

#### Resend Confirmation
- Button: "Resend confirmation email"
- Calls `supabase.auth.resend({ type: 'signup', email })`
- Shows success feedback: "Confirmation email sent!"
- Rate-limited by Supabase

#### Change Email Address
- Link: "Wrong email? Update it"
- Reveals inline form with email input (pre-filled with current email)
- Calls `supabase.auth.updateUser({ email: newEmail })`
- On success: Updates displayed email, shows "Confirmation sent to new address!"

#### New State Variables
```typescript
const [resendLoading, setResendLoading] = useState(false);
const [resendSuccess, setResendSuccess] = useState(false);
const [resendError, setResendError] = useState<string | null>(null);
const [showChangeEmail, setShowChangeEmail] = useState(false);
const [newEmail, setNewEmail] = useState("");
const [changeEmailLoading, setChangeEmailLoading] = useState(false);
const [changeEmailSuccess, setChangeEmailSuccess] = useState(false);
const [changeEmailError, setChangeEmailError] = useState<string | null>(null);
```

#### UI Layout
```
┌─────────────────────────────────────┐
│         Check your email            │
│                                     │
│  We've sent a confirmation link to  │
│  stahl.scott@gmail.com              │
│                                     │
│  Click the link to activate your    │
│  account.                           │
│                                     │
│  [Resend confirmation email]        │
│                                     │
│  Wrong email? Update it             │
│                                     │
│  ← Back to sign in                  │
└─────────────────────────────────────┘
```

### 3. Account Settings: Email Section

**Files:**
- `apps/web/src/app/(protected)/settings/page.tsx` - Pass user email to client
- `apps/web/src/app/(protected)/settings/SettingsClient.tsx` - Add email section

#### Props Change
```typescript
interface SettingsClientProps {
  initialMembershipId: string | null;
  initialNeighborhoodName: string | null;
  isImpersonating: boolean;
  userEmail: string; // NEW
}
```

#### New Section (between Notifications and Change Password)
- Display current email
- "Change email address" button
- Inline form when clicked:
  - New email input
  - Update / Cancel buttons
- Calls `supabase.auth.updateUser({ email: newEmail })`
- Success message: "Check your new email address for a confirmation link"
- Hidden when impersonating (like other sensitive settings)

#### UI Layout
```
┌─────────────────────────────────────┐
│  Email Address                      │
│                                     │
│  Your current email:                │
│  stahl.scott@gmail.com              │
│                                     │
│  [Change email address]             │
└─────────────────────────────────────┘
```

When form is open:
```
┌─────────────────────────────────────┐
│  Email Address                      │
│                                     │
│  New email address:                 │
│  [_________________________]        │
│                                     │
│  [Update email]  [Cancel]           │
└─────────────────────────────────────┘
```

## Supabase Methods

| Method | Purpose |
|--------|---------|
| `supabase.auth.resend({ type: 'signup', email })` | Resend confirmation email |
| `supabase.auth.updateUser({ email })` | Change email (sends verification to new address) |

## Test IDs

### Signup Page
- `signup-resend-confirmation-button`
- `signup-resend-success`
- `signup-resend-error`
- `signup-change-email-link`
- `signup-new-email-input`
- `signup-update-email-button`
- `signup-change-email-success`
- `signup-change-email-error`

### Settings Page
- `settings-email-section`
- `settings-current-email`
- `settings-change-email-button`
- `settings-new-email-input`
- `settings-update-email-button`
- `settings-cancel-email-button`
- `settings-email-success`
- `settings-email-error`

## E2E Tests

**File:** `apps/web/e2e/email-management.spec.ts`

### Signup Page Tests

1. **Resend confirmation email**
   - Sign up with valid email
   - Click "Resend confirmation email" button
   - Verify success message appears

2. **Change email address**
   - Sign up with valid email
   - Click "Wrong email? Update it"
   - Verify email input appears with current email pre-filled
   - Enter new email, submit
   - Verify success message shows new email
   - Verify displayed email updates to new address

3. **Change email validation**
   - Attempt to submit empty/invalid email
   - Verify error message appears

### Settings Page Tests

4. **View current email**
   - Navigate to /settings as authenticated user
   - Verify current email is displayed

5. **Change email from settings**
   - Click "Change email address"
   - Verify form appears
   - Enter new email, submit
   - Verify success message about confirmation email

6. **Cancel email change**
   - Click "Change email address"
   - Click "Cancel"
   - Verify form closes, no changes made

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/00020_sync_email_changes.sql` | NEW - Email sync trigger |
| `apps/web/src/app/(auth)/signup/page.tsx` | Modify - Add resend/change email to success state |
| `apps/web/src/app/(protected)/settings/page.tsx` | Modify - Pass user email to client |
| `apps/web/src/app/(protected)/settings/SettingsClient.tsx` | Modify - Add email section |
| `apps/web/e2e/email-management.spec.ts` | NEW - E2E tests |

## Dependencies

No new dependencies required.
