-- Migration: Explicit API-role table privileges
--
-- Supabase's API roles require table privileges in addition to RLS policies.
-- The initial schema creates application tables as postgres but never grants
-- service_role/authenticated/anon access, which causes both the service-role
-- fixture setup client and ordinary PostgREST clients to fail before policy
-- evaluation. RLS remains the authorization boundary for anon/authenticated;
-- service_role is restricted to server/test setup clients and bypasses RLS.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.users,
  public.neighborhoods,
  public.memberships,
  public.items,
  public.loans,
  public.posts,
  public.post_reactions,
  public.neighborhood_guides
TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.users,
  public.neighborhoods,
  public.memberships,
  public.items,
  public.loans,
  public.posts,
  public.post_reactions,
  public.neighborhood_guides
TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

COMMENT ON SCHEMA public IS
  'Application API roles have explicit table privileges; RLS policies and server-side authorization constrain access.';
