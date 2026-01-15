-- Bulletin Board Feature
-- Allows neighborhood members to post messages and react with emojis

-- ============================================================================
-- BULLETIN BOARD TABLES
-- ============================================================================

-- Reaction type enum
CREATE TYPE bulletin_reaction_type AS ENUM ('thumbs_up', 'heart', 'pray', 'celebrate');

-- Bulletin posts table
CREATE TABLE public.bulletin_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id UUID NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    edited_at TIMESTAMPTZ DEFAULT NULL,
    edited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Indexes for bulletin posts
CREATE INDEX idx_bulletin_posts_neighborhood ON public.bulletin_posts(neighborhood_id);
CREATE INDEX idx_bulletin_posts_author ON public.bulletin_posts(author_id);
CREATE INDEX idx_bulletin_posts_not_deleted ON public.bulletin_posts(neighborhood_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_bulletin_posts_expires ON public.bulletin_posts(expires_at)
    WHERE expires_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_bulletin_posts_pinned ON public.bulletin_posts(neighborhood_id, is_pinned)
    WHERE deleted_at IS NULL;

-- Bulletin reactions table
CREATE TABLE public.bulletin_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.bulletin_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction bulletin_reaction_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id, reaction)
);

-- Indexes for bulletin reactions
CREATE INDEX idx_bulletin_reactions_post ON public.bulletin_reactions(post_id);
CREATE INDEX idx_bulletin_reactions_user ON public.bulletin_reactions(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulletin_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- BULLETIN_POSTS POLICIES
-- ============================================================================

-- Members can read non-deleted, non-expired posts in their neighborhood
CREATE POLICY "Members can read neighborhood posts"
    ON public.bulletin_posts FOR SELECT
    USING (
        is_neighborhood_member(neighborhood_id, auth.uid())
        AND deleted_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
    );

-- Members can create posts in their neighborhood
CREATE POLICY "Members can create posts"
    ON public.bulletin_posts FOR INSERT
    WITH CHECK (
        is_neighborhood_member(neighborhood_id, auth.uid())
        AND auth.uid() = author_id
    );

-- Authors can update their own posts (no deleted_at check - SELECT policy handles visibility)
CREATE POLICY "Authors can update own posts"
    ON public.bulletin_posts FOR UPDATE
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- Admins can update any post in their neighborhood (including pin toggle and soft-delete)
CREATE POLICY "Admins can update neighborhood posts"
    ON public.bulletin_posts FOR UPDATE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()))
    WITH CHECK (is_neighborhood_admin(neighborhood_id, auth.uid()));

-- Authors can soft-delete their own posts
CREATE POLICY "Authors can delete own posts"
    ON public.bulletin_posts FOR DELETE
    USING (auth.uid() = author_id);

-- Admins can delete any post in their neighborhood
CREATE POLICY "Admins can delete neighborhood posts"
    ON public.bulletin_posts FOR DELETE
    USING (is_neighborhood_admin(neighborhood_id, auth.uid()));

-- ============================================================================
-- BULLETIN_REACTIONS POLICIES
-- ============================================================================

-- Members can read reactions on posts they can see
CREATE POLICY "Members can read reactions"
    ON public.bulletin_reactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bulletin_posts p
            WHERE p.id = bulletin_reactions.post_id
            AND is_neighborhood_member(p.neighborhood_id, auth.uid())
            AND p.deleted_at IS NULL
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
        )
    );

-- Members can add reactions to posts they can see
CREATE POLICY "Members can add reactions"
    ON public.bulletin_reactions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.bulletin_posts p
            WHERE p.id = post_id
            AND is_neighborhood_member(p.neighborhood_id, auth.uid())
            AND p.deleted_at IS NULL
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
        )
    );

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
    ON public.bulletin_reactions FOR DELETE
    USING (auth.uid() = user_id);
