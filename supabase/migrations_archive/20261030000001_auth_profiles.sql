-- ==============================================================================
-- TANKR DATABASE MIGRATION: Auth Profiles & Onboarding
-- ==============================================================================

-- 1. Create User Roles Enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'supplier', 'driver', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Profiles Table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    is_onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    profile_photo_url TEXT,
    preferred_address TEXT,
    city TEXT DEFAULT 'Bengaluru',
    pincode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 5. Trigger function to auto-create profile record upon phone signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, phone_number, full_name, is_onboarding_completed)
    VALUES (
        NEW.id,
        COALESCE(NEW.phone, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
        FALSE
    )
    ON CONFLICT (id) DO UPDATE
    SET phone_number = EXCLUDED.phone_number,
        updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 6. Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

