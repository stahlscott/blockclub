-- Update handle_new_user trigger to extract address from user metadata
-- This allows address to be captured at signup and automatically added to the user profile

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, address, avatar_url, bio, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'address',
        NULL,
        NULL,
        NULL
    )
    ON CONFLICT (id) DO NOTHING;  -- In case profile already exists
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
