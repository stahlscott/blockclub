-- Neighborhood Guides Feature
-- A single editable page per neighborhood for standing information

-- ============================================================================
-- NEIGHBORHOOD GUIDES TABLE
-- ============================================================================

CREATE TABLE public.neighborhood_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id UUID NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE UNIQUE,
    title TEXT NOT NULL DEFAULT 'Neighborhood Notes',
    content TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Index for fast lookup by neighborhood
CREATE INDEX idx_neighborhood_guides_neighborhood ON public.neighborhood_guides(neighborhood_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.neighborhood_guides ENABLE ROW LEVEL SECURITY;

-- Members can view their neighborhood's guide
CREATE POLICY "Members can view guide"
    ON public.neighborhood_guides FOR SELECT
    USING (is_neighborhood_member(neighborhood_id, auth.uid()));

-- Admins can insert guide (for first creation)
CREATE POLICY "Admins can create guide"
    ON public.neighborhood_guides FOR INSERT
    WITH CHECK (is_neighborhood_admin(neighborhood_id, auth.uid()));

-- Admins can update their neighborhood's guide
CREATE POLICY "Admins can update guide"
    ON public.neighborhood_guides FOR UPDATE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()))
    WITH CHECK (is_neighborhood_admin(neighborhood_id, auth.uid()));
