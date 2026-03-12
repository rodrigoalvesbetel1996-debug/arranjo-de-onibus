-- Authentication and Congregations Schema Update

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Update congregations table
-- Alter existing table to add new columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'congregations' AND column_name = 'created_by') THEN
        ALTER TABLE public.congregations ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'congregations' AND column_name = 'created_at') THEN
        ALTER TABLE public.congregations ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. Create access_codes table
CREATE TABLE IF NOT EXISTS public.access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    congregation_id TEXT NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create users_congregations table
CREATE TABLE IF NOT EXISTS public.users_congregations (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    congregation_id TEXT NOT NULL REFERENCES public.congregations(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, congregation_id)
);

-- 5. Trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_congregation_id TEXT;
    v_access_code TEXT;
BEGIN
    INSERT INTO public.profiles (id, name, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', 'Usuário'),
        COALESCE(new.raw_user_meta_data->>'role', 'user')
    );

    -- Handle access code if provided
    v_access_code := new.raw_user_meta_data->>'accessCode';
    IF v_access_code IS NOT NULL THEN
        SELECT congregation_id INTO v_congregation_id
        FROM public.access_codes
        WHERE code = v_access_code AND active = true;

        IF v_congregation_id IS NOT NULL THEN
            INSERT INTO public.users_congregations (user_id, congregation_id)
            VALUES (new.id, v_congregation_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RPC Functions
CREATE OR REPLACE FUNCTION public.check_access_code(
    p_code TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.access_codes
        WHERE code = p_code AND active = TRUE
    ) INTO v_exists;
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_access_code TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_access_code_and_join(
    p_code TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_congregation_id TEXT;
BEGIN
    -- Find the active congregation for the code
    SELECT congregation_id INTO v_congregation_id
    FROM public.access_codes
    WHERE code = p_code AND active = TRUE;

    IF v_congregation_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Associate user with congregation
    INSERT INTO public.users_congregations (user_id, congregation_id)
    VALUES (p_user_id, v_congregation_id)
    ON CONFLICT DO NOTHING;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.validate_access_code_and_join TO anon, authenticated;

-- 7. Row Level Security (RLS) Policies

-- Drop old permissive policies from initial schema
DROP POLICY IF EXISTS "Allow all on congregations" ON public.congregations;
DROP POLICY IF EXISTS "Allow all on events" ON public.events;
DROP POLICY IF EXISTS "Allow all on users" ON public.users;
DROP POLICY IF EXISTS "Allow all on passengers" ON public.passengers;
DROP POLICY IF EXISTS "Allow all on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all on sh_reports" ON public.sh_reports;
DROP POLICY IF EXISTS "Allow all on expenses" ON public.expenses;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.congregations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_congregations ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile. Admins can read all profiles.
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Congregations: 
-- Users can view congregations they belong to.
-- Admins can view congregations they created.
CREATE POLICY "Users can view their congregations" ON public.congregations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users_congregations 
            WHERE user_id = auth.uid() AND congregation_id = congregations.id
        )
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert congregations" ON public.congregations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update their congregations" ON public.congregations
    FOR UPDATE USING (
        created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Access Codes: Admins can manage access codes for their congregations
CREATE POLICY "Admins can manage access codes" ON public.access_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.congregations 
            WHERE id = access_codes.congregation_id AND (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
        )
    );

-- Users Congregations: Users can view their own associations. Admins can view all.
CREATE POLICY "Users can view own associations" ON public.users_congregations
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Events: Admins can manage, Users can read
CREATE POLICY "Admins can manage events" ON public.events
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "Users can read events" ON public.events
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'user')
    );

-- Passengers: Users can manage passengers in their congregations. Admins can manage all.
CREATE POLICY "Users can manage their congregation passengers" ON public.passengers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users_congregations 
            WHERE user_id = auth.uid() AND congregation_id = passengers."congregationId"
        )
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Payments: Users can manage payments in their congregations. Admins can manage all.
CREATE POLICY "Users can manage their congregation payments" ON public.payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users_congregations 
            WHERE user_id = auth.uid() AND congregation_id = payments."congregationId"
        )
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- SH Reports: Users can manage reports in their congregations. Admins can manage all.
CREATE POLICY "Users can manage their congregation reports" ON public.sh_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users_congregations 
            WHERE user_id = auth.uid() AND congregation_id = sh_reports."congregationId"
        )
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Expenses: Admins can manage expenses.
CREATE POLICY "Admins can manage expenses" ON public.expenses
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

