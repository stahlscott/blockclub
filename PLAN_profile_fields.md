# Implementation Plan: Profile Fields & Directory Search

**Created:** January 8, 2026
**Status:** Ready to implement

## Overview

Add new profile fields for members and implement directory search/sorting.

### New Profile Fields
- **Address** (text, required) - e.g., "123 Main Street"
- **Unit** (text, optional) - e.g., "Apt 2B"
- **Move-in Year** (number, optional) - e.g., 2020
- **Children** (text, optional) - e.g., "Emma (8), Jack (5)"
- **Pets** (text, optional) - e.g., "Golden retriever named Max"

### Directory Features
- Search across name, address, bio, children, pets, phone numbers
- Sort by address (default), name, move-in year, join date
- Persist sort preference to localStorage

### Schema Changes
- Add new columns to `users` table
- Drop unused `households` table
- Remove `household_id` from `memberships` table

---

## Tasks

### Task 1: Database Migration
**File:** `supabase/migrations/00002_profile_fields.sql` (CREATE)

```sql
-- Add new profile fields to users table
ALTER TABLE public.users ADD COLUMN address TEXT;
ALTER TABLE public.users ADD COLUMN unit TEXT;
ALTER TABLE public.users ADD COLUMN move_in_year INTEGER;
ALTER TABLE public.users ADD COLUMN children TEXT;
ALTER TABLE public.users ADD COLUMN pets TEXT;

-- Add check constraint for move_in_year
ALTER TABLE public.users ADD CONSTRAINT check_move_in_year 
  CHECK (move_in_year IS NULL OR (move_in_year >= 1900 AND move_in_year <= EXTRACT(YEAR FROM NOW()) + 1));

-- Remove household_id from memberships (no longer needed)
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_household_id_fkey;
ALTER TABLE public.memberships DROP COLUMN IF EXISTS household_id;

-- Drop households table (never implemented)
DROP INDEX IF EXISTS idx_households_neighborhood;
DROP POLICY IF EXISTS "Members can read neighborhood households" ON public.households;
DROP POLICY IF EXISTS "Admins can create households" ON public.households;
DROP POLICY IF EXISTS "Admins can update households" ON public.households;
DROP POLICY IF EXISTS "Admins can delete households" ON public.households;
DROP TRIGGER IF EXISTS update_households_updated_at ON public.households;
DROP TABLE IF EXISTS public.households;
```

---

### Task 2: Update Validation Constants
**File:** `apps/web/src/lib/validation.ts` (EDIT)

Add to `MAX_LENGTHS`:
```js
children: 500,
pets: 500,
unit: 20,
```

Note: `address: 200` already exists.

---

### Task 3: Update Shared Types
**File:** `packages/shared/src/types.ts` (EDIT)

Changes needed:
- Remove `Household`, `HouseholdInsert`, `HouseholdUpdate` types
- Remove `household_id` from `Membership` type
- Remove `household` from `MembershipWithUser` type
- Remove `households` from `Database` type
- Add to `User` type: `address`, `unit`, `move_in_year`, `children`, `pets`

---

### Task 4: Update ensure-profile.ts
**File:** `apps/web/src/lib/ensure-profile.ts` (EDIT)

Add to the insert statement:
```js
address: null,
unit: null,
move_in_year: null,
children: null,
pets: null,
```

---

### Task 5: Update Profile Edit Page
**File:** `apps/web/src/app/(protected)/profile/page.tsx` (EDIT)

**Add state variables:**
- `address` (string)
- `unit` (string)
- `moveInYear` (string - for form input, convert to number on save)
- `children` (string)
- `pets` (string)

**Add form fields (in this order):**
1. Email (existing, disabled)
2. Household Name (existing)
3. **Address** * (required text input, placeholder: "123 Main Street")
4. **Unit** (optional text input, placeholder: "Apt 2B")
5. Phone Numbers (existing)
6. **Move-in Year** (number input, placeholder: "2020", min 1900, max current year)
7. **Children** (textarea, hint: "e.g., Emma (8), Jack (5)")
8. **Pets** (textarea, hint: "e.g., Golden retriever named Max")
9. About Your Household (existing)

**Update load logic:**
- Load new fields from `profileData`

**Update save logic:**
- Validate address is not empty (show error: "Address is required")
- Validate move_in_year is in range if provided
- Save all new fields to `users` table

---

### Task 6: Update Member Profile Display
**File:** `apps/web/src/app/(protected)/neighborhoods/[slug]/members/[id]/page.tsx` (EDIT)

**Changes:**
1. Remove `household:households(*)` from membership query (line 60)
2. Update address display to use `member.address` and `member.unit` instead of `membership.household.address` (lines 120-125)
3. Add "Moved in [year]" display after address (if `move_in_year` exists)
4. Add "Family & Pets" section between profile header and Contact section:
   - Show children if present (with icon)
   - Show pets if present (with icon)

---

### Task 7: Update Directory Page
**File:** `apps/web/src/app/(protected)/neighborhoods/[slug]/directory/page.tsx` (EDIT)

**Changes:**
1. Remove `household:households(*)` from membership query (line 48)
2. Convert to thin wrapper that passes data to client component
3. Keep server-side data fetching for members

---

### Task 8: Create Directory Client Component
**File:** `apps/web/src/app/(protected)/neighborhoods/[slug]/directory/directory-client.tsx` (CREATE)

**Features:**
- Search input at top (debounced 300ms)
- Sort dropdown with options:
  - Address (A-Z) - **default**
  - Address (Z-A)
  - Name (A-Z)
  - Name (Z-A)
  - Move-in Year (Newest)
  - Move-in Year (Oldest)
  - Joined (Newest)
  - Joined (Oldest)
- Client-side filtering across: name, address, bio, children, pets, phone numbers (digits only)
- Persist sort preference to localStorage key: `directory-sort-preference`
- Show "No results found" message when search has no matches
- Move member card rendering and styles here

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/00002_profile_fields.sql` | CREATE | Add columns, drop households |
| `apps/web/src/lib/validation.ts` | EDIT | Add max lengths |
| `packages/shared/src/types.ts` | EDIT | Update types |
| `apps/web/src/lib/ensure-profile.ts` | EDIT | Add new fields |
| `apps/web/src/app/(protected)/profile/page.tsx` | EDIT | Add form fields |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/members/[id]/page.tsx` | EDIT | Update display |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/directory/page.tsx` | EDIT | Remove household join, use client component |
| `apps/web/src/app/(protected)/neighborhoods/[slug]/directory/directory-client.tsx` | CREATE | Search & sort UI |

---

## Implementation Order

1. Task 1: Database migration
2. Task 2: Validation constants
3. Task 3: Shared types
4. Task 4: ensure-profile.ts
5. Task 5: Profile edit page
6. Task 6: Member profile display
7. Task 7 & 8: Directory page + client component

---

## Key Decisions Made

1. **Address location**: Store on `users` table directly (not households) - simpler for per-household accounts
2. **Drop households table**: Never implemented, not needed for current use case
3. **Children/Pets format**: Free text (not structured) - more flexible
4. **Move-in year validation**: 1900 to current year + 1
5. **Default sort**: Address (A-Z)
6. **Search scope**: Name, address, bio, children, pets, phone numbers (digits only)
7. **Sort persistence**: localStorage

---

## Related TODO Items

From `TODO.md` "Next Up" section:
- [ ] Add "Move-in Year" to member's profile (number only)
- [ ] Add optional "Children" field to member's profile
- [ ] Add optional "Pets" field to member's profile
- [ ] Add mandatory "Address" field to member's profile (number and street name)
- [ ] Add sorting to directory
- [ ] Add search to directory
