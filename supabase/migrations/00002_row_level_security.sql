-- Front Porch Row Level Security Policies
-- All data is scoped to neighborhood membership

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.childcare_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.childcare_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

-- Users can read profiles of people in their neighborhoods
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
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- NEIGHBORHOODS POLICIES
-- ============================================================================

-- Anyone can read neighborhoods (for discovery/joining)
CREATE POLICY "Anyone can read neighborhoods"
    ON public.neighborhoods FOR SELECT
    USING (true);

-- Only authenticated users can create neighborhoods
CREATE POLICY "Authenticated users can create neighborhoods"
    ON public.neighborhoods FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Only admins can update neighborhoods
CREATE POLICY "Admins can update neighborhoods"
    ON public.neighborhoods FOR UPDATE
    USING (is_neighborhood_admin(id, auth.uid()))
    WITH CHECK (is_neighborhood_admin(id, auth.uid()));

-- Only admins can delete neighborhoods
CREATE POLICY "Admins can delete neighborhoods"
    ON public.neighborhoods FOR DELETE
    USING (is_neighborhood_admin(id, auth.uid()));

-- ============================================================================
-- HOUSEHOLDS POLICIES
-- ============================================================================

-- Members can read households in their neighborhood
CREATE POLICY "Members can read neighborhood households"
    ON public.households FOR SELECT
    USING (is_neighborhood_member(neighborhood_id, auth.uid()));

-- Admins can create households
CREATE POLICY "Admins can create households"
    ON public.households FOR INSERT
    WITH CHECK (is_neighborhood_admin(neighborhood_id, auth.uid()));

-- Admins can update households
CREATE POLICY "Admins can update households"
    ON public.households FOR UPDATE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()))
    WITH CHECK (is_neighborhood_admin(neighborhood_id, auth.uid()));

-- Admins can delete households
CREATE POLICY "Admins can delete households"
    ON public.households FOR DELETE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()));

-- ============================================================================
-- MEMBERSHIPS POLICIES
-- ============================================================================

-- Users can read their own memberships
CREATE POLICY "Users can read own memberships"
    ON public.memberships FOR SELECT
    USING (auth.uid() = user_id);

-- Members can read memberships in their neighborhood
CREATE POLICY "Members can read neighborhood memberships"
    ON public.memberships FOR SELECT
    USING (is_neighborhood_member(neighborhood_id, auth.uid()));

-- Anyone can request to join (insert pending membership)
CREATE POLICY "Users can request membership"
    ON public.memberships FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND status = 'pending'
        AND role = 'member'
    );

-- Admins can update memberships (approve/reject)
CREATE POLICY "Admins can update memberships"
    ON public.memberships FOR UPDATE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()))
    WITH CHECK (is_neighborhood_admin(neighborhood_id, auth.uid()));

-- Users can delete their own membership (leave neighborhood)
CREATE POLICY "Users can delete own membership"
    ON public.memberships FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can delete memberships (remove members)
CREATE POLICY "Admins can delete memberships"
    ON public.memberships FOR DELETE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()));

-- ============================================================================
-- ITEMS POLICIES (Lending Library)
-- ============================================================================

-- Members can read items in their neighborhood
CREATE POLICY "Members can read neighborhood items"
    ON public.items FOR SELECT
    USING (is_neighborhood_member(neighborhood_id, auth.uid()));

-- Members can create items in their neighborhood
CREATE POLICY "Members can create items"
    ON public.items FOR INSERT
    WITH CHECK (
        is_neighborhood_member(neighborhood_id, auth.uid())
        AND auth.uid() = owner_id
    );

-- Owners can update their items
CREATE POLICY "Owners can update their items"
    ON public.items FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Owners can delete their items
CREATE POLICY "Owners can delete their items"
    ON public.items FOR DELETE
    USING (auth.uid() = owner_id);

-- ============================================================================
-- LOANS POLICIES
-- ============================================================================

-- Members can read loans for items in their neighborhood
CREATE POLICY "Members can read neighborhood loans"
    ON public.loans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.items i
            WHERE i.id = loans.item_id
            AND is_neighborhood_member(i.neighborhood_id, auth.uid())
        )
    );

-- Members can request to borrow items
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

-- Item owners can update loan status (approve/reject)
CREATE POLICY "Owners can update loan status"
    ON public.loans FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.items i
            WHERE i.id = loans.item_id
            AND i.owner_id = auth.uid()
        )
    );

-- Borrowers can cancel their own loan requests
CREATE POLICY "Borrowers can cancel own loans"
    ON public.loans FOR UPDATE
    USING (auth.uid() = borrower_id AND status = 'requested')
    WITH CHECK (auth.uid() = borrower_id AND status = 'cancelled');

-- ============================================================================
-- EVENTS POLICIES
-- ============================================================================

-- Members can read events in their neighborhood
CREATE POLICY "Members can read neighborhood events"
    ON public.events FOR SELECT
    USING (is_neighborhood_member(neighborhood_id, auth.uid()));

-- Members can create events
CREATE POLICY "Members can create events"
    ON public.events FOR INSERT
    WITH CHECK (
        is_neighborhood_member(neighborhood_id, auth.uid())
        AND auth.uid() = host_id
    );

-- Hosts can update their events
CREATE POLICY "Hosts can update their events"
    ON public.events FOR UPDATE
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);

-- Hosts can delete their events
CREATE POLICY "Hosts can delete their events"
    ON public.events FOR DELETE
    USING (auth.uid() = host_id);

-- Admins can delete any event in their neighborhood
CREATE POLICY "Admins can delete neighborhood events"
    ON public.events FOR DELETE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()));

-- ============================================================================
-- EVENT RSVPS POLICIES
-- ============================================================================

-- Members can read RSVPs for events in their neighborhood
CREATE POLICY "Members can read event RSVPs"
    ON public.event_rsvps FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_rsvps.event_id
            AND is_neighborhood_member(e.neighborhood_id, auth.uid())
        )
    );

-- Members can RSVP to events
CREATE POLICY "Members can RSVP to events"
    ON public.event_rsvps FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = event_id
            AND is_neighborhood_member(e.neighborhood_id, auth.uid())
        )
    );

-- Users can update their own RSVP
CREATE POLICY "Users can update own RSVP"
    ON public.event_rsvps FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own RSVP
CREATE POLICY "Users can delete own RSVP"
    ON public.event_rsvps FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- CHILDCARE AVAILABILITY POLICIES
-- ============================================================================

-- Members can read availability in their neighborhood
CREATE POLICY "Members can read childcare availability"
    ON public.childcare_availability FOR SELECT
    USING (is_neighborhood_member(neighborhood_id, auth.uid()));

-- Members can create their own availability
CREATE POLICY "Members can create availability"
    ON public.childcare_availability FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND is_neighborhood_member(neighborhood_id, auth.uid())
    );

-- Users can update their own availability
CREATE POLICY "Users can update own availability"
    ON public.childcare_availability FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own availability
CREATE POLICY "Users can delete own availability"
    ON public.childcare_availability FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- CHILDCARE REQUESTS POLICIES
-- ============================================================================

-- Users can read requests they made or received
CREATE POLICY "Users can read own childcare requests"
    ON public.childcare_requests FOR SELECT
    USING (
        auth.uid() = requester_id
        OR EXISTS (
            SELECT 1 FROM public.childcare_availability ca
            WHERE ca.id = childcare_requests.availability_id
            AND ca.user_id = auth.uid()
        )
    );

-- Members can create childcare requests
CREATE POLICY "Members can create childcare requests"
    ON public.childcare_requests FOR INSERT
    WITH CHECK (
        auth.uid() = requester_id
        AND EXISTS (
            SELECT 1 FROM public.childcare_availability ca
            WHERE ca.id = availability_id
            AND is_neighborhood_member(ca.neighborhood_id, auth.uid())
        )
    );

-- Availability owners can update request status
CREATE POLICY "Availability owners can update requests"
    ON public.childcare_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.childcare_availability ca
            WHERE ca.id = childcare_requests.availability_id
            AND ca.user_id = auth.uid()
        )
    );

-- Requesters can cancel their own requests
CREATE POLICY "Requesters can cancel own requests"
    ON public.childcare_requests FOR UPDATE
    USING (auth.uid() = requester_id AND status = 'pending')
    WITH CHECK (auth.uid() = requester_id AND status = 'cancelled');
