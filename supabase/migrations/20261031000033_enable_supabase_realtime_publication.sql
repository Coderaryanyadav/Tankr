-- ==============================================================================
-- TANKR DATABASE MIGRATION 33: Enable Supabase Realtime Publication
-- Enables live WebSocket streaming for Tankers, Bookings, Telemetry, and Community Pools
-- ==============================================================================

-- Ensure publication exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add essential tables to live replication publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.tankers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_dispatches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_pools;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_pool_contributions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_breadcrumbs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_addresses;

-- Set REPLICA IDENTITY FULL for tables requiring detailed old/new payloads
ALTER TABLE public.tankers REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.community_pools REPLICA IDENTITY FULL;
ALTER TABLE public.tracking_breadcrumbs REPLICA IDENTITY FULL;

