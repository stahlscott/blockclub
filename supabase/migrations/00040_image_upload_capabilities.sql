CREATE TABLE IF NOT EXISTS public.image_upload_capabilities (
  nonce TEXT PRIMARY KEY,
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  effective_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  profile TEXT NOT NULL CHECK (profile IN ('post', 'item')),
  operation TEXT NOT NULL CHECK (operation = 'create'),
  neighborhood_id UUID NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS image_upload_capabilities_expiry_idx
  ON public.image_upload_capabilities (expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE public.image_upload_capabilities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.image_upload_capabilities FROM anon, authenticated;
GRANT ALL ON public.image_upload_capabilities TO service_role;

CREATE OR REPLACE FUNCTION public.consume_image_upload_capability(
  p_nonce TEXT,
  p_actor_id UUID,
  p_effective_user_id UUID,
  p_profile TEXT,
  p_operation TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.image_upload_capabilities
  SET consumed_at = NOW()
  WHERE nonce = p_nonce
    AND actor_id = p_actor_id
    AND effective_user_id = p_effective_user_id
    AND profile = p_profile
    AND operation = p_operation
    AND consumed_at IS NULL
    AND expires_at > NOW();
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_image_upload_capability(TEXT, UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_image_upload_capability(TEXT, UUID, UUID, TEXT, TEXT) TO service_role;
