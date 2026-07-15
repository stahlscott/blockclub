-- Migration: Post mutation integrity boundaries
--
-- Ordinary post mutations are named operations. They preserve post and
-- reaction history, reject broad direct UPDATE/DELETE paths, and return
-- structured affected-row results for server actions.

CREATE TYPE public.post_operation_result AS (
  success BOOLEAN,
  reason TEXT,
  post_id UUID,
  affected_post_count INTEGER
);

CREATE TYPE public.post_reaction_operation_result AS (
  success BOOLEAN,
  reason TEXT,
  post_id UUID,
  reaction post_reaction_type,
  active BOOLEAN,
  affected_reaction_count INTEGER
);

CREATE OR REPLACE FUNCTION public.soft_delete_post(p_post_id UUID)
RETURNS public.post_operation_result
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_post public.posts%ROWTYPE; v_count INTEGER := 0;
BEGIN
  SELECT p.* INTO v_post FROM public.posts p
  WHERE p.id = p_post_id AND p.deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN ROW(FALSE, 'not_found', p_post_id, 0)::public.post_operation_result; END IF;
  IF v_post.author_id <> auth.uid()
     AND NOT public.is_neighborhood_admin(v_post.neighborhood_id, auth.uid()) THEN
    RETURN ROW(FALSE, 'not_authorized', v_post.id, 0)::public.post_operation_result;
  END IF;
  UPDATE public.posts SET deleted_at = NOW(), edited_at = NOW(), edited_by = auth.uid()
  WHERE id = v_post.id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RETURN ROW(FALSE, 'conflict', v_post.id, 0)::public.post_operation_result; END IF;
  RETURN ROW(TRUE, 'updated', v_post.id, v_count)::public.post_operation_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_post_pin(p_post_id UUID, p_is_pinned BOOLEAN)
RETURNS public.post_operation_result
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_post public.posts%ROWTYPE; v_count INTEGER := 0;
BEGIN
  SELECT p.* INTO v_post FROM public.posts p
  WHERE p.id = p_post_id AND p.deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN ROW(FALSE, 'not_found', p_post_id, 0)::public.post_operation_result; END IF;
  IF NOT public.is_neighborhood_admin(v_post.neighborhood_id, auth.uid()) THEN
    RETURN ROW(FALSE, 'not_authorized', v_post.id, 0)::public.post_operation_result;
  END IF;
  UPDATE public.posts SET is_pinned = p_is_pinned, edited_at = NOW(), edited_by = auth.uid()
  WHERE id = v_post.id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RETURN ROW(FALSE, 'conflict', v_post.id, 0)::public.post_operation_result; END IF;
  RETURN ROW(TRUE, CASE WHEN p_is_pinned THEN 'pinned' ELSE 'unpinned' END, v_post.id, v_count)::public.post_operation_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_post(
  p_post_id UUID, p_content TEXT, p_image_url TEXT, p_expires_at TIMESTAMPTZ,
  p_is_pinned BOOLEAN DEFAULT NULL
)
RETURNS public.post_operation_result
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_post public.posts%ROWTYPE; v_is_admin BOOLEAN; v_count INTEGER := 0;
BEGIN
  IF p_content IS NULL OR LENGTH(BTRIM(p_content)) = 0 OR LENGTH(p_content) > 2000 THEN
    RETURN ROW(FALSE, 'invalid_content', p_post_id, 0)::public.post_operation_result;
  END IF;
  SELECT p.* INTO v_post FROM public.posts p
  WHERE p.id = p_post_id AND p.deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN ROW(FALSE, 'not_found', p_post_id, 0)::public.post_operation_result; END IF;
  v_is_admin := public.is_neighborhood_admin(v_post.neighborhood_id, auth.uid());
  IF v_post.author_id <> auth.uid() AND NOT v_is_admin THEN
    RETURN ROW(FALSE, 'not_authorized', v_post.id, 0)::public.post_operation_result;
  END IF;
  IF p_is_pinned IS NOT NULL AND NOT v_is_admin THEN
    RETURN ROW(FALSE, 'not_authorized', v_post.id, 0)::public.post_operation_result;
  END IF;
  UPDATE public.posts SET
    content = BTRIM(p_content), image_url = p_image_url, expires_at = p_expires_at,
    is_pinned = COALESCE(p_is_pinned, v_post.is_pinned), edited_at = NOW(), edited_by = auth.uid()
  WHERE id = v_post.id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN RETURN ROW(FALSE, 'conflict', v_post.id, 0)::public.post_operation_result; END IF;
  RETURN ROW(TRUE, 'updated', v_post.id, v_count)::public.post_operation_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_post_reaction(p_post_id UUID, p_reaction post_reaction_type)
RETURNS public.post_reaction_operation_result
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_post public.posts%ROWTYPE; v_reaction public.post_reactions%ROWTYPE; v_count INTEGER := 0;
BEGIN
  SELECT p.* INTO v_post FROM public.posts p
  WHERE p.id = p_post_id AND p.deleted_at IS NULL
    AND (p.expires_at IS NULL OR p.expires_at > NOW()) FOR UPDATE;
  IF NOT FOUND THEN RETURN ROW(FALSE, 'not_found', p_post_id, p_reaction, FALSE, 0)::public.post_reaction_operation_result; END IF;
  IF NOT public.is_neighborhood_member(v_post.neighborhood_id, auth.uid()) THEN
    RETURN ROW(FALSE, 'not_authorized', v_post.id, p_reaction, FALSE, 0)::public.post_reaction_operation_result;
  END IF;
  SELECT r.* INTO v_reaction FROM public.post_reactions r
  WHERE r.post_id = v_post.id AND r.user_id = auth.uid() AND r.reaction = p_reaction FOR UPDATE;
  IF FOUND THEN
    DELETE FROM public.post_reactions WHERE id = v_reaction.id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN ROW(TRUE, 'removed', v_post.id, p_reaction, FALSE, v_count)::public.post_reaction_operation_result;
  END IF;
  INSERT INTO public.post_reactions(post_id, user_id, reaction)
  VALUES (v_post.id, auth.uid(), p_reaction);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN ROW(TRUE, 'added', v_post.id, p_reaction, TRUE, v_count)::public.post_reaction_operation_result;
EXCEPTION WHEN unique_violation THEN
  RETURN ROW(FALSE, 'conflict', p_post_id, p_reaction, FALSE, 0)::public.post_reaction_operation_result;
END;
$$;

DROP POLICY IF EXISTS "Authors can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update neighborhood posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete neighborhood posts" ON public.posts;
DROP POLICY IF EXISTS "Members can add reactions" ON public.post_reactions;
DROP POLICY IF EXISTS "Users can remove own reactions" ON public.post_reactions;

REVOKE UPDATE, DELETE ON TABLE public.posts FROM anon, authenticated;
REVOKE UPDATE, DELETE ON TABLE public.post_reactions FROM anon, authenticated;

CREATE POLICY "Members can add reactions" ON public.post_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_id
      AND public.is_neighborhood_member(p.neighborhood_id, auth.uid())
      AND p.deleted_at IS NULL AND (p.expires_at IS NULL OR p.expires_at > NOW())
  )
);

CREATE POLICY "Users can remove own reactions" ON public.post_reactions FOR DELETE
USING (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_id
      AND public.is_neighborhood_member(p.neighborhood_id, auth.uid()) AND p.deleted_at IS NULL
  )
);

REVOKE ALL ON FUNCTION public.soft_delete_post(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_post_pin(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_post(UUID, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.toggle_post_reaction(UUID, post_reaction_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_post(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_post_pin(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_post(UUID, TEXT, TEXT, TIMESTAMPTZ, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_post_reaction(UUID, post_reaction_type) TO authenticated;
