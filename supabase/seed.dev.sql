-- Block Club Development Seed Data
-- This creates a test neighborhood with sample data for local development and demos.
--
-- PREREQUISITES:
-- 1. Create a demo user in Supabase Auth first:
--    - Email: demo@blockclub.app
--    - Password: demo1234
--    - You can do this via Supabase Dashboard → Authentication → Users → Add User
--    - Or sign up through the app normally with these credentials
--
-- USAGE:
--   Run in Supabase SQL Editor or: psql $DATABASE_URL -f supabase/seed.dev.sql
--
-- NOTE: This script is idempotent - safe to run multiple times.

-- ============================================================================
-- CLEANUP (optional - uncomment to reset test data, or run separately)
-- ============================================================================
-- DELETE FROM public.loans WHERE item_id IN (SELECT id FROM public.items WHERE neighborhood_id = 'a0000000-0000-0000-0000-000000000001');
-- DELETE FROM public.posts WHERE neighborhood_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.items WHERE neighborhood_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.memberships WHERE neighborhood_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM public.neighborhoods WHERE slug = 'maplewood-heights';
-- DELETE FROM public.users WHERE email LIKE '%@example.local';
-- DELETE FROM auth.users WHERE email LIKE '%@example.local';

DO $$
DECLARE
    demo_user_id UUID;
    demo_user_email TEXT := 'demo@blockclub.app';
    neighborhood_id UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
    -- Fixed UUIDs for display users (deterministic for idempotency)
    sarah_id UUID := 'b0000000-0000-0000-0000-000000000001'::UUID;
    mike_id UUID := 'b0000000-0000-0000-0000-000000000002'::UUID;
    garcia_id UUID := 'b0000000-0000-0000-0000-000000000003'::UUID;
    pat_id UUID := 'b0000000-0000-0000-0000-000000000004'::UUID;
    -- Fixed UUIDs for items (needed for loan reference)
    item_drill_id UUID := 'c0000000-0000-0000-0000-000000000001'::UUID;
    item_ladder_id UUID := 'c0000000-0000-0000-0000-000000000002'::UUID;
    item_mixer_id UUID := 'c0000000-0000-0000-0000-000000000003'::UUID;
    item_tent_id UUID := 'c0000000-0000-0000-0000-000000000004'::UUID;
    item_projector_id UUID := 'c0000000-0000-0000-0000-000000000005'::UUID;
    item_kayak_id UUID := 'c0000000-0000-0000-0000-000000000006'::UUID;
    item_catan_id UUID := 'c0000000-0000-0000-0000-000000000007'::UUID;
    item_snowblower_id UUID := 'c0000000-0000-0000-0000-000000000008'::UUID;
    item_stroller_id UUID := 'c0000000-0000-0000-0000-000000000009'::UUID;
    item_luggage_id UUID := 'c0000000-0000-0000-0000-000000000010'::UUID;
BEGIN
    -- Get demo user ID from auth.users
    SELECT id INTO demo_user_id FROM auth.users WHERE email = demo_user_email;

    IF demo_user_id IS NULL THEN
        RAISE EXCEPTION 'Demo user not found. Please create a user with email % in Supabase Auth first.', demo_user_email;
    END IF;

    -- Check if test data already exists
    IF EXISTS (SELECT 1 FROM public.neighborhoods WHERE slug = 'maplewood-heights') THEN
        RAISE NOTICE 'Test data already exists (neighborhood maplewood-heights found). Skipping seed.';
        RETURN;
    END IF;

    -- ============================================================================
    -- CREATE DEMO USER PROFILE (if not exists)
    -- ============================================================================
    INSERT INTO public.users (id, email, name, address, unit, bio, phones, emails, move_in_year, children, pets)
    VALUES (
        demo_user_id,
        demo_user_email,
        'Jordan & Alex Demo',
        '456 Oak Lane',
        NULL,
        'Just moved in from downtown! Jordan works in tech and Alex is a freelance graphic designer. We''re excited to meet everyone and get involved in the community.',
        '[{"label": "Jordan", "number": "5551234567"}, {"label": "Alex", "number": "5551234568"}]'::jsonb,
        '[{"label": "Jordan", "email": "demo@blockclub.app"}, {"label": "Alex", "email": "alex.demo@example.local"}]'::jsonb,
        2024,
        NULL,
        'Two cats: Luna and Olive'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = COALESCE(NULLIF(public.users.name, ''), EXCLUDED.name),
        address = COALESCE(public.users.address, EXCLUDED.address),
        bio = COALESCE(public.users.bio, EXCLUDED.bio),
        phones = COALESCE(public.users.phones, EXCLUDED.phones),
        emails = COALESCE(public.users.emails, EXCLUDED.emails),
        move_in_year = COALESCE(public.users.move_in_year, EXCLUDED.move_in_year),
        pets = COALESCE(public.users.pets, EXCLUDED.pets);

    -- ============================================================================
    -- CREATE AUTH ENTRIES FOR DISPLAY USERS
    -- ============================================================================
    -- These are "fake" auth entries with fixed UUIDs - they cannot actually sign in
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, instance_id, aud, role)
    VALUES
        (sarah_id, 'sarah.johnson@example.local', '', now(), now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
        (mike_id, 'mike.chen@example.local', '', now(), now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
        (garcia_id, 'garcias@example.local', '', now(), now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
        (pat_id, 'pat.williams@example.local', '', now(), now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;

    -- Create minimal user records (Sarah needed for neighborhood.created_by FK, others for consistency)
    -- The auth trigger may also create these, but ON CONFLICT DO NOTHING handles that
    INSERT INTO public.users (id, email, name) VALUES
        (sarah_id, 'sarah.johnson@example.local', 'Sarah & Tom Johnson'),
        (mike_id, 'mike.chen@example.local', 'Mike & Lisa Chen'),
        (garcia_id, 'garcias@example.local', 'The Garcia Household'),
        (pat_id, 'pat.williams@example.local', 'Pat Williams')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name;

    -- ============================================================================
    -- CREATE NEIGHBORHOOD
    -- ============================================================================
    INSERT INTO public.neighborhoods (id, name, slug, description, location, settings, created_by)
    VALUES (
        neighborhood_id,
        'Maplewood Heights',
        'maplewood-heights',
        'A friendly suburban neighborhood with tree-lined streets and active community spirit. We share tools, watch each other''s kids, and throw the best block parties!',
        'Maplewood, Minnesota',
        '{"require_approval": true, "allow_public_directory": false}'::jsonb,
        sarah_id
    );

    -- ============================================================================
    -- CREATE DISPLAY USERS WITH FULL PROFILES
    -- ============================================================================
    -- Now that neighborhood exists, we can set primary_neighborhood_id

    -- Sarah & Tom Johnson - Neighborhood admin, been here longest
    UPDATE public.users SET
        name = 'Sarah & Tom Johnson',
        address = '123 Maple Street',
        bio = 'Sarah coordinates the neighborhood activities. Tom works in construction and is always happy to lend a hand with home projects. We love gardening and hosting block parties!',
        phones = '[{"label": "Sarah", "number": "5559876543"}, {"label": "Tom", "number": "5551112222"}]'::jsonb,
        emails = '[{"label": "Sarah", "email": "sarah.johnson@example.local"}, {"label": "Tom", "email": "tom.johnson@example.local"}]'::jsonb,
        move_in_year = 2018,
        children = 'Emma (8) and Jake (5)',
        pets = 'Golden retriever named Max',
        primary_neighborhood_id = neighborhood_id
    WHERE id = sarah_id;

    -- Mike & Lisa Chen - Active members with lots of tools
    UPDATE public.users SET
        name = 'Mike & Lisa Chen',
        address = '789 Elm Avenue',
        unit = 'Unit B',
        bio = 'Mike is a DIY enthusiast and weekend woodworker - happy to help with home projects! Lisa is a pediatric nurse. We moved from the city and love the neighborhood vibe here.',
        phones = '[{"label": "Mike", "number": "5553334444"}, {"label": "Lisa", "number": "5553335555"}]'::jsonb,
        emails = '[{"label": "Mike", "email": "mike.chen@example.local"}, {"label": "Lisa", "email": "lisa.chen@example.local"}]'::jsonb,
        move_in_year = 2020,
        children = 'Expecting our first in March!',
        pets = 'Two cats: Mochi and Boba',
        primary_neighborhood_id = neighborhood_id
    WHERE id = mike_id;

    -- The Garcia Household - Family account
    UPDATE public.users SET
        name = 'The Garcia Household',
        address = '234 Birch Road',
        bio = 'Maria and Carlos here! We love cooking and hosting neighborhood potlucks - our door is always open. Carlos coaches little league and Maria runs a small catering business from home.',
        phones = '[{"label": "Maria", "number": "5555556666"}, {"label": "Carlos", "number": "5557778888"}]'::jsonb,
        emails = '[{"label": "Maria", "email": "maria.garcia@example.local"}, {"label": "Carlos", "email": "carlos.garcia@example.local"}]'::jsonb,
        move_in_year = 2019,
        children = 'Sofia (12), Luis (9), and Ana (6)',
        pets = 'Cat named Whiskers, hamster named Speedy',
        primary_neighborhood_id = neighborhood_id
    WHERE id = garcia_id;

    -- Pat Williams - Newer member, retired
    UPDATE public.users SET
        name = 'Pat Williams',
        address = '567 Cedar Court',
        unit = '2A',
        bio = 'Recently retired high school English teacher. Enjoying the slower pace of life - you''ll often find me reading on the porch or tending my container garden. Happy to help with proofreading or tutoring!',
        phones = '[{"label": "Cell", "number": "5559990000"}]'::jsonb,
        emails = '[{"label": "Personal", "email": "pat.williams@example.local"}]'::jsonb,
        move_in_year = 2023,
        children = 'Grown kids in Seattle and Denver',
        pets = 'Parakeet named Sunny',
        primary_neighborhood_id = neighborhood_id
    WHERE id = pat_id;

    -- ============================================================================
    -- CREATE MEMBERSHIPS
    -- ============================================================================
    INSERT INTO public.memberships (user_id, neighborhood_id, role, status)
    VALUES
        (sarah_id, neighborhood_id, 'admin', 'active'),
        (demo_user_id, neighborhood_id, 'member', 'active'),
        (mike_id, neighborhood_id, 'member', 'active'),
        (garcia_id, neighborhood_id, 'member', 'active'),
        (pat_id, neighborhood_id, 'member', 'active');

    -- Update demo user's primary neighborhood
    UPDATE public.users SET primary_neighborhood_id = neighborhood_id WHERE id = demo_user_id;

    -- ============================================================================
    -- CREATE LENDING LIBRARY ITEMS
    -- ============================================================================

    -- Mike's tools
    INSERT INTO public.items (id, neighborhood_id, owner_id, name, description, category, availability)
    VALUES
        (item_drill_id, neighborhood_id, mike_id, 'Cordless Drill Set', 'DeWalt 20V with multiple bits. Great for most home projects. Battery lasts about 2 hours of continuous use.', 'tools', 'available'),
        (item_ladder_id, neighborhood_id, mike_id, '24ft Extension Ladder', 'Werner aluminum ladder. Perfect for two-story homes, gutter cleaning, or roof access.', 'tools', 'available');

    -- Sarah's items
    INSERT INTO public.items (id, neighborhood_id, owner_id, name, description, category, availability)
    VALUES
        (item_mixer_id, neighborhood_id, sarah_id, 'KitchenAid Stand Mixer', 'Professional 5-quart mixer in red. Includes dough hook, paddle, and whisk attachments.', 'kitchen', 'available'),
        (item_tent_id, neighborhood_id, sarah_id, '6-Person Camping Tent', 'Coleman instant setup tent. Used twice, in great condition. Comes with rainfly and stakes.', 'outdoor', 'borrowed');

    -- Garcia family items
    INSERT INTO public.items (id, neighborhood_id, owner_id, name, description, category, availability)
    VALUES
        (item_projector_id, neighborhood_id, garcia_id, 'Movie Projector', 'Epson HD projector with portable screen. Great for backyard movie nights!', 'electronics', 'available'),
        (item_kayak_id, neighborhood_id, garcia_id, 'Tandem Kayak', 'Two-person kayak with paddles and life vests. Need truck or SUV to transport.', 'outdoor', 'available'),
        (item_catan_id, neighborhood_id, garcia_id, 'Board Game Collection', 'Settlers of Catan, Ticket to Ride, and Codenames. Perfect for game night!', 'games', 'available');

    -- Pat's items
    INSERT INTO public.items (id, neighborhood_id, owner_id, name, description, category, availability)
    VALUES
        (item_snowblower_id, neighborhood_id, pat_id, 'Snow Blower', 'Troy-Bilt 24-inch two-stage snowblower. Will clear your driveway in no time!', 'outdoor', 'unavailable'),
        (item_stroller_id, neighborhood_id, pat_id, 'Jogging Stroller', 'BOB Revolution. Grandkids have outgrown it. Great for running or long walks.', 'baby', 'available'),
        (item_luggage_id, neighborhood_id, pat_id, 'Large Suitcase Set', 'Three-piece Samsonite hardshell luggage set. Spinners in all sizes.', 'travel', 'available');

    -- ============================================================================
    -- CREATE POSTS
    -- ============================================================================

    -- Welcome/pinned post from admin
    INSERT INTO public.posts (neighborhood_id, author_id, content, is_pinned)
    VALUES (
        neighborhood_id,
        sarah_id,
        'Welcome to Maplewood Heights on Block Club! This is our neighborhood''s digital hub for sharing, connecting, and building community. Check out the Lending Library to borrow items from neighbors, and use the Directory to find contact info. Questions? Reach out to me anytime!',
        true
    );

    -- Event announcement
    INSERT INTO public.posts (neighborhood_id, author_id, content, is_pinned)
    VALUES (
        neighborhood_id,
        garcia_id,
        'Block party this Saturday at 4pm! We''ll have the grill going at our place (234 Birch Road). Bring a dish to share and your appetite. Kids welcome - we''ll set up lawn games in the backyard. RSVP in the comments so we know how much food to prepare!',
        false
    );

    -- General discussion
    INSERT INTO public.posts (neighborhood_id, author_id, content, is_pinned)
    VALUES (
        neighborhood_id,
        pat_id,
        'Has anyone seen a gray tabby cat wandering around Cedar Court? Not mine, but it seems lost. Very friendly, no collar. Let me know if you recognize it!',
        false
    );

    -- ============================================================================
    -- CREATE SAMPLE LOAN
    -- ============================================================================
    -- Demo user has borrowed the tent from Sarah
    INSERT INTO public.loans (item_id, borrower_id, status, start_date, due_date, notes)
    VALUES (
        item_tent_id,
        demo_user_id,
        'active',
        CURRENT_DATE - INTERVAL '3 days',
        CURRENT_DATE + INTERVAL '4 days',
        'Thanks for letting us borrow this for our camping trip!'
    );

END $$;

-- Show results
SELECT 'Seed complete!' AS status;
SELECT 'Neighborhood: ' || name || ' (slug: ' || slug || ')' AS neighborhood FROM public.neighborhoods WHERE slug = 'maplewood-heights';
SELECT 'Members: ' || COUNT(*)::text AS members FROM public.memberships m JOIN public.neighborhoods n ON m.neighborhood_id = n.id WHERE n.slug = 'maplewood-heights';
SELECT 'Items: ' || COUNT(*)::text AS items FROM public.items i JOIN public.neighborhoods n ON i.neighborhood_id = n.id WHERE n.slug = 'maplewood-heights';
SELECT 'Posts: ' || COUNT(*)::text AS posts FROM public.posts p JOIN public.neighborhoods n ON p.neighborhood_id = n.id WHERE n.slug = 'maplewood-heights';
