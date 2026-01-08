-- Front Porch Initial Schema
-- Multi-neighborhood community app with directory and lending library

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    phones JSONB DEFAULT '[]'::jsonb,
    primary_neighborhood_id UUID,  -- FK added after neighborhoods table
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.users.phones IS 'Array of {label: string, number: string} objects for household phone numbers';

-- Neighborhoods
CREATE TABLE public.neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    location TEXT,
    settings JSONB NOT NULL DEFAULT '{"require_approval": true, "allow_public_directory": false}'::jsonb,
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_neighborhoods_slug ON public.neighborhoods(slug);

-- Add FK from users to neighborhoods (deferred to avoid circular dependency)
ALTER TABLE public.users 
ADD CONSTRAINT fk_users_primary_neighborhood 
FOREIGN KEY (primary_neighborhood_id) REFERENCES public.neighborhoods(id) ON DELETE SET NULL;

CREATE INDEX idx_users_primary_neighborhood ON public.users(primary_neighborhood_id);

-- Households
CREATE TABLE public.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id UUID NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    unit TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_households_neighborhood ON public.households(neighborhood_id);

-- Memberships (links users to neighborhoods)
CREATE TYPE membership_role AS ENUM ('admin', 'member');
CREATE TYPE membership_status AS ENUM ('pending', 'active', 'inactive');

CREATE TABLE public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    neighborhood_id UUID NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    role membership_role NOT NULL DEFAULT 'member',
    status membership_status NOT NULL DEFAULT 'pending',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE(user_id, neighborhood_id)
);

CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_neighborhood ON public.memberships(neighborhood_id);
CREATE INDEX idx_memberships_household ON public.memberships(household_id);
CREATE INDEX idx_memberships_not_deleted ON public.memberships(neighborhood_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- LENDING LIBRARY
-- ============================================================================

CREATE TYPE item_category AS ENUM (
    'tools', 'kitchen', 'outdoor', 'sports', 'games', 
    'electronics', 'books', 'baby', 'travel', 'other'
);

CREATE TYPE item_availability AS ENUM ('available', 'borrowed', 'unavailable');

CREATE TABLE public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id UUID NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category item_category NOT NULL DEFAULT 'other',
    photo_urls TEXT[] DEFAULT '{}',
    availability item_availability NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_items_neighborhood ON public.items(neighborhood_id);
CREATE INDEX idx_items_owner ON public.items(owner_id);
CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_items_availability ON public.items(availability);
CREATE INDEX idx_items_not_deleted ON public.items(neighborhood_id) WHERE deleted_at IS NULL;

-- Loans
CREATE TYPE loan_status AS ENUM ('requested', 'approved', 'active', 'returned', 'cancelled');

CREATE TABLE public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status loan_status NOT NULL DEFAULT 'requested',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    start_date DATE,
    due_date DATE,
    returned_at TIMESTAMPTZ,
    notes TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_loans_item ON public.loans(item_id);
CREATE INDEX idx_loans_borrower ON public.loans(borrower_id);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_loans_not_deleted ON public.loans(item_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_neighborhoods_updated_at BEFORE UPDATE ON public.neighborhoods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON public.households
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_neighborhood_member(neighborhood_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.memberships
        WHERE neighborhood_id = neighborhood_uuid
        AND user_id = user_uuid
        AND status = 'active'
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_neighborhood_admin(neighborhood_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.memberships
        WHERE neighborhood_id = neighborhood_uuid
        AND user_id = user_uuid
        AND status = 'active'
        AND role = 'admin'
        AND deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS POLICIES
-- ============================================================================

CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can read neighborhood members profiles"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships m1
            JOIN public.memberships m2 ON m1.neighborhood_id = m2.neighborhood_id
            WHERE m1.user_id = auth.uid()
            AND m2.user_id = users.id
            AND m1.status = 'active'
            AND m2.status = 'active'
            AND m1.deleted_at IS NULL
            AND m2.deleted_at IS NULL
        )
    );

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- NEIGHBORHOODS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can read neighborhoods"
    ON public.neighborhoods FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create neighborhoods"
    ON public.neighborhoods FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update neighborhoods"
    ON public.neighborhoods FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.neighborhood_id = neighborhoods.id
            AND m.user_id = auth.uid()
            AND m.role = 'admin'
            AND m.status = 'active'
            AND m.deleted_at IS NULL
        )
    );

CREATE POLICY "Admins can delete neighborhoods"
    ON public.neighborhoods FOR DELETE
    USING (is_neighborhood_admin(id, auth.uid()));

-- ============================================================================
-- HOUSEHOLDS POLICIES
-- ============================================================================

CREATE POLICY "Members can read neighborhood households"
    ON public.households FOR SELECT
    USING (is_neighborhood_member(neighborhood_id, auth.uid()));

CREATE POLICY "Admins can create households"
    ON public.households FOR INSERT
    WITH CHECK (is_neighborhood_admin(neighborhood_id, auth.uid()));

CREATE POLICY "Admins can update households"
    ON public.households FOR UPDATE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()))
    WITH CHECK (is_neighborhood_admin(neighborhood_id, auth.uid()));

CREATE POLICY "Admins can delete households"
    ON public.households FOR DELETE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()));

-- ============================================================================
-- MEMBERSHIPS POLICIES
-- ============================================================================

CREATE POLICY "Users can read own memberships"
    ON public.memberships FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Members can read neighborhood memberships"
    ON public.memberships FOR SELECT
    USING (
        is_neighborhood_member(neighborhood_id, auth.uid()) 
        AND deleted_at IS NULL
    );

CREATE POLICY "Users can create membership"
    ON public.memberships FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND (
            -- Regular join request: pending member
            (status = 'pending' AND role = 'member')
            OR
            -- Neighborhood creator adding themselves: active admin
            (status = 'active' AND role = 'admin' AND EXISTS (
                SELECT 1 FROM public.neighborhoods n
                WHERE n.id = neighborhood_id
                AND n.created_by = auth.uid()
            ))
        )
    );

CREATE POLICY "Admins can update memberships"
    ON public.memberships FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.neighborhood_id = memberships.neighborhood_id
            AND m.user_id = auth.uid()
            AND m.role = 'admin'
            AND m.status = 'active'
            AND m.deleted_at IS NULL
        )
    );

CREATE POLICY "Users can delete own membership"
    ON public.memberships FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete memberships"
    ON public.memberships FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.neighborhood_id = memberships.neighborhood_id
            AND m.user_id = auth.uid()
            AND m.role = 'admin'
            AND m.status = 'active'
            AND m.deleted_at IS NULL
        )
    );

-- ============================================================================
-- ITEMS POLICIES (Lending Library)
-- ============================================================================

CREATE POLICY "Members can read neighborhood items"
    ON public.items FOR SELECT
    USING (
        is_neighborhood_member(neighborhood_id, auth.uid()) 
        AND deleted_at IS NULL
    );

CREATE POLICY "Members can create items"
    ON public.items FOR INSERT
    WITH CHECK (
        is_neighborhood_member(neighborhood_id, auth.uid())
        AND auth.uid() = owner_id
    );

CREATE POLICY "Owners can update their items"
    ON public.items FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their items"
    ON public.items FOR DELETE
    USING (auth.uid() = owner_id);

CREATE POLICY "Admins can delete neighborhood items"
    ON public.items FOR DELETE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()));

-- ============================================================================
-- LOANS POLICIES
-- ============================================================================

CREATE POLICY "Members can read neighborhood loans"
    ON public.loans FOR SELECT
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.items i
            WHERE i.id = loans.item_id
            AND is_neighborhood_member(i.neighborhood_id, auth.uid())
        )
    );

CREATE POLICY "Members can request loans"
    ON public.loans FOR INSERT
    WITH CHECK (
        auth.uid() = borrower_id
        AND status = 'requested'
        AND EXISTS (
            SELECT 1 FROM public.items i
            WHERE i.id = item_id
            AND is_neighborhood_member(i.neighborhood_id, auth.uid())
        )
    );

CREATE POLICY "Owners can update loan status"
    ON public.loans FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.items i
            WHERE i.id = loans.item_id
            AND i.owner_id = auth.uid()
        )
    );

CREATE POLICY "Borrowers can cancel own loans"
    ON public.loans FOR UPDATE
    USING (auth.uid() = borrower_id AND status = 'requested')
    WITH CHECK (auth.uid() = borrower_id AND status = 'cancelled');

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Avatars bucket for user profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Items bucket for lending library item photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'items',
    'items',
    true,
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Members can upload item photos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'items'
        AND EXISTS (
            SELECT 1 FROM public.items i
            WHERE i.id::text = (storage.foldername(name))[1]
            AND i.owner_id = auth.uid()
        )
    );

CREATE POLICY "Owners can update item photos"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'items'
        AND EXISTS (
            SELECT 1 FROM public.items i
            WHERE i.id::text = (storage.foldername(name))[1]
            AND i.owner_id = auth.uid()
        )
    );

CREATE POLICY "Owners can delete item photos"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'items'
        AND EXISTS (
            SELECT 1 FROM public.items i
            WHERE i.id::text = (storage.foldername(name))[1]
            AND i.owner_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view item photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'items');
