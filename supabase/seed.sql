-- Front Porch Seed Data
-- Sample data for development and testing
-- Run this AFTER creating test users in Supabase Auth

-- ============================================================================
-- NOTE: Before running this seed, create these test users in Supabase Auth:
-- 
-- 1. alice@example.com (will be admin of Maplewood)
-- 2. bob@example.com (will be member of Maplewood)
-- 3. carol@example.com (will be member of Maplewood and Oakridge)
-- 4. dave@example.com (will be admin of Oakridge)
--
-- Then replace the UUIDs below with the actual auth.users IDs
-- ============================================================================

-- For now, we'll create placeholder UUIDs that you'll replace
-- In production, users are created through the auth flow

DO $$
DECLARE
    -- Replace these with actual auth.users IDs after creating users
    alice_id UUID := '00000000-0000-0000-0000-000000000001';
    bob_id UUID := '00000000-0000-0000-0000-000000000002';
    carol_id UUID := '00000000-0000-0000-0000-000000000003';
    dave_id UUID := '00000000-0000-0000-0000-000000000004';
    
    -- Neighborhood IDs
    maplewood_id UUID;
    oakridge_id UUID;
    
    -- Household IDs
    alice_house_id UUID;
    bob_house_id UUID;
    carol_maplewood_house_id UUID;
    carol_oakridge_house_id UUID;
    dave_house_id UUID;
    
    -- Item IDs for loans
    drill_id UUID;
    ladder_id UUID;
BEGIN
    -- ========================================================================
    -- USERS (profiles)
    -- ========================================================================
    
    INSERT INTO public.users (id, email, name, bio, phone) VALUES
    (alice_id, 'alice@example.com', 'Alice Johnson', 'Community organizer and gardening enthusiast', '555-0101'),
    (bob_id, 'bob@example.com', 'Bob Smith', 'DIY hobbyist, happy to help with home projects', '555-0102'),
    (carol_id, 'carol@example.com', 'Carol Williams', 'Working mom of two, love connecting with neighbors', '555-0103'),
    (dave_id, 'dave@example.com', 'Dave Brown', 'Retired teacher, always up for a chat', '555-0104')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        bio = EXCLUDED.bio,
        phone = EXCLUDED.phone;

    -- ========================================================================
    -- NEIGHBORHOODS
    -- ========================================================================
    
    INSERT INTO public.neighborhoods (name, slug, description, location, settings, created_by)
    VALUES (
        'Maplewood Heights',
        'maplewood-heights',
        'A friendly neighborhood in the heart of the city. We love block parties and helping each other out!',
        'Downtown Area',
        '{"require_approval": true, "allow_public_directory": false}'::jsonb,
        alice_id
    )
    RETURNING id INTO maplewood_id;

    INSERT INTO public.neighborhoods (name, slug, description, location, settings, created_by)
    VALUES (
        'Oakridge Community',
        'oakridge-community',
        'Suburban neighborhood with great schools and parks. Very family-friendly!',
        'Oakridge District',
        '{"require_approval": true, "allow_public_directory": false}'::jsonb,
        dave_id
    )
    RETURNING id INTO oakridge_id;

    -- ========================================================================
    -- HOUSEHOLDS
    -- ========================================================================
    
    INSERT INTO public.households (neighborhood_id, address, unit)
    VALUES (maplewood_id, '123 Maple Street', NULL)
    RETURNING id INTO alice_house_id;

    INSERT INTO public.households (neighborhood_id, address, unit)
    VALUES (maplewood_id, '456 Maple Street', 'Apt 2B')
    RETURNING id INTO bob_house_id;

    INSERT INTO public.households (neighborhood_id, address, unit)
    VALUES (maplewood_id, '789 Oak Avenue', NULL)
    RETURNING id INTO carol_maplewood_house_id;

    INSERT INTO public.households (neighborhood_id, address, unit)
    VALUES (oakridge_id, '321 Pine Road', NULL)
    RETURNING id INTO carol_oakridge_house_id;

    INSERT INTO public.households (neighborhood_id, address, unit)
    VALUES (oakridge_id, '654 Cedar Lane', NULL)
    RETURNING id INTO dave_house_id;

    -- ========================================================================
    -- MEMBERSHIPS
    -- ========================================================================
    
    -- Maplewood memberships
    INSERT INTO public.memberships (user_id, neighborhood_id, household_id, role, status) VALUES
    (alice_id, maplewood_id, alice_house_id, 'admin', 'active'),
    (bob_id, maplewood_id, bob_house_id, 'member', 'active'),
    (carol_id, maplewood_id, carol_maplewood_house_id, 'member', 'active');

    -- Oakridge memberships
    INSERT INTO public.memberships (user_id, neighborhood_id, household_id, role, status) VALUES
    (dave_id, oakridge_id, dave_house_id, 'admin', 'active'),
    (carol_id, oakridge_id, carol_oakridge_house_id, 'member', 'active');

    -- ========================================================================
    -- LENDING LIBRARY ITEMS
    -- ========================================================================
    
    INSERT INTO public.items (neighborhood_id, owner_id, name, description, category, availability)
    VALUES (
        maplewood_id,
        bob_id,
        'Power Drill',
        'DeWalt 20V cordless drill with extra battery. Great for most home projects.',
        'tools',
        'available'
    )
    RETURNING id INTO drill_id;

    INSERT INTO public.items (neighborhood_id, owner_id, name, description, category, availability)
    VALUES (
        maplewood_id,
        bob_id,
        'Extension Ladder',
        '24-foot aluminum extension ladder. Can reach most 2-story roofs.',
        'tools',
        'available'
    )
    RETURNING id INTO ladder_id;

    INSERT INTO public.items (neighborhood_id, owner_id, name, description, category, availability) VALUES
    (maplewood_id, alice_id, 'KitchenAid Stand Mixer', 'Professional 5-quart stand mixer. Perfect for baking!', 'kitchen', 'available'),
    (maplewood_id, alice_id, 'Camping Tent (4-person)', 'Coleman 4-person dome tent, barely used', 'outdoor', 'available'),
    (maplewood_id, carol_id, 'Pack n Play', 'Graco Pack n Play with bassinet attachment', 'baby', 'available'),
    (maplewood_id, carol_id, 'Board Game Collection', 'Settlers of Catan, Ticket to Ride, Pandemic - take your pick!', 'games', 'available'),
    (oakridge_id, dave_id, 'Pressure Washer', 'Electric pressure washer, great for decks and driveways', 'tools', 'available'),
    (oakridge_id, dave_id, 'Lawn Aerator', 'Manual lawn aerator. Your grass will thank you!', 'outdoor', 'available'),
    (oakridge_id, carol_id, 'Jogging Stroller', 'BOB Revolution jogging stroller', 'baby', 'available');

    -- ========================================================================
    -- SAMPLE LOAN (active)
    -- ========================================================================
    
    INSERT INTO public.loans (item_id, borrower_id, status, start_date, due_date, notes)
    VALUES (
        drill_id,
        alice_id,
        'active',
        CURRENT_DATE - 3,
        CURRENT_DATE + 4,
        'Need it for installing shelves'
    );

    -- ========================================================================
    -- EVENTS
    -- ========================================================================
    
    INSERT INTO public.events (neighborhood_id, host_id, title, description, location, starts_at, ends_at) VALUES
    (
        maplewood_id,
        alice_id,
        'Summer Block Party',
        'Annual neighborhood block party! Bring a dish to share. We''ll have games for kids and a potluck dinner.',
        '123 Maple Street (front yard)',
        NOW() + INTERVAL '14 days' + TIME '16:00',
        NOW() + INTERVAL '14 days' + TIME '20:00'
    ),
    (
        maplewood_id,
        bob_id,
        'DIY Workshop: Basic Home Repairs',
        'Learn how to fix common household issues. I''ll cover leaky faucets, squeaky doors, and drywall patches.',
        'Bob''s Garage - 456 Maple Street',
        NOW() + INTERVAL '7 days' + TIME '10:00',
        NOW() + INTERVAL '7 days' + TIME '12:00'
    ),
    (
        oakridge_id,
        dave_id,
        'Morning Coffee Walk',
        'Join us for a casual morning walk around the neighborhood followed by coffee at my place.',
        'Meet at corner of Pine & Cedar',
        NOW() + INTERVAL '3 days' + TIME '08:00',
        NOW() + INTERVAL '3 days' + TIME '09:30'
    );

    -- ========================================================================
    -- EVENT RSVPs
    -- ========================================================================
    
    -- RSVPs for Block Party
    INSERT INTO public.event_rsvps (event_id, user_id, status, guest_count)
    SELECT e.id, bob_id, 'yes', 2
    FROM public.events e WHERE e.title = 'Summer Block Party';

    INSERT INTO public.event_rsvps (event_id, user_id, status, guest_count)
    SELECT e.id, carol_id, 'yes', 3
    FROM public.events e WHERE e.title = 'Summer Block Party';

    -- ========================================================================
    -- CHILDCARE AVAILABILITY
    -- ========================================================================
    
    INSERT INTO public.childcare_availability (user_id, neighborhood_id, date, start_time, end_time, capacity, notes) VALUES
    (
        carol_id,
        maplewood_id,
        CURRENT_DATE + 5,
        '09:00',
        '12:00',
        2,
        'Happy to watch kids while parents run errands. Ages 3-8 preferred.'
    ),
    (
        alice_id,
        maplewood_id,
        CURRENT_DATE + 7,
        '14:00',
        '17:00',
        3,
        'Afternoon availability. Have a fenced backyard!'
    );

    RAISE NOTICE 'Seed data created successfully!';
    RAISE NOTICE 'Maplewood Heights ID: %', maplewood_id;
    RAISE NOTICE 'Oakridge Community ID: %', oakridge_id;
END $$;
