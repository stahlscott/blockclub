-- Front Porch Initial Schema
-- Multi-neighborhood community app with directory and lending library

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Neighborhoods
CREATE TABLE public.neighborhoods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Households
CREATE TABLE public.households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    neighborhood_id UUID NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
    household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
    role membership_role NOT NULL DEFAULT 'member',
    status membership_status NOT NULL DEFAULT 'pending',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, neighborhood_id)
);

CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_neighborhood ON public.memberships(neighborhood_id);
CREATE INDEX idx_memberships_household ON public.memberships(household_id);

-- ============================================================================
-- LENDING LIBRARY
-- ============================================================================

CREATE TYPE item_category AS ENUM (
    'tools', 'kitchen', 'outdoor', 'sports', 'games', 
    'electronics', 'books', 'baby', 'travel', 'other'
);

CREATE TYPE item_availability AS ENUM ('available', 'borrowed', 'unavailable');

CREATE TABLE public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    neighborhood_id UUID NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category item_category NOT NULL DEFAULT 'other',
    photo_urls TEXT[] DEFAULT '{}',
    availability item_availability NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_neighborhood ON public.items(neighborhood_id);
CREATE INDEX idx_items_owner ON public.items(owner_id);
CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_items_availability ON public.items(availability);

-- Loans
CREATE TYPE loan_status AS ENUM ('requested', 'approved', 'active', 'returned', 'cancelled');

CREATE TABLE public.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status loan_status NOT NULL DEFAULT 'requested',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    start_date DATE,
    due_date DATE,
    returned_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX idx_loans_item ON public.loans(item_id);
CREATE INDEX idx_loans_borrower ON public.loans(borrower_id);
CREATE INDEX idx_loans_status ON public.loans(status);

-- ============================================================================
-- EVENTS
-- ============================================================================

CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    neighborhood_id UUID NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_neighborhood ON public.events(neighborhood_id);
CREATE INDEX idx_events_host ON public.events(host_id);
CREATE INDEX idx_events_starts_at ON public.events(starts_at);

-- Event RSVPs
CREATE TYPE rsvp_status AS ENUM ('yes', 'no', 'maybe');

CREATE TABLE public.event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status rsvp_status NOT NULL DEFAULT 'yes',
    guest_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_rsvps_event ON public.event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_user ON public.event_rsvps(user_id);

-- ============================================================================
-- CHILDCARE
-- ============================================================================

CREATE TABLE public.childcare_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    neighborhood_id UUID NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_childcare_availability_user ON public.childcare_availability(user_id);
CREATE INDEX idx_childcare_availability_neighborhood ON public.childcare_availability(neighborhood_id);
CREATE INDEX idx_childcare_availability_date ON public.childcare_availability(date);

-- Childcare requests
CREATE TYPE childcare_request_status AS ENUM ('pending', 'approved', 'declined', 'cancelled');

CREATE TABLE public.childcare_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    availability_id UUID NOT NULL REFERENCES public.childcare_availability(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status childcare_request_status NOT NULL DEFAULT 'pending',
    children_count INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_childcare_requests_availability ON public.childcare_requests(availability_id);
CREATE INDEX idx_childcare_requests_requester ON public.childcare_requests(requester_id);

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

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_childcare_availability_updated_at BEFORE UPDATE ON public.childcare_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTION: Check if user is member of neighborhood
-- ============================================================================

CREATE OR REPLACE FUNCTION is_neighborhood_member(neighborhood_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.memberships
        WHERE neighborhood_id = neighborhood_uuid
        AND user_id = user_uuid
        AND status = 'active'
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_neighborhood_admin(neighborhood_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.memberships
        WHERE neighborhood_id = neighborhood_uuid
        AND user_id = user_uuid
        AND status = 'active'
        AND role = 'admin'
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;
