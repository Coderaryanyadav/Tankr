-- ==============================================================================
-- TANKR DATABASE MIGRATION: Security Linter Fix for public.spatial_ref_sys
-- ==============================================================================

-- Resolves Supabase Security Advisor lint 0013_rls_disabled_in_public for spatial_ref_sys
-- Revokes API exposure from anon and authenticated PostgREST roles
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;

