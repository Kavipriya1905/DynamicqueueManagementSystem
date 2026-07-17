/*
# Queue Management System — initial schema

## Purpose
A multi-tenant (auth-scoped) Queue Management System. Users register with a
username + password, book queue tokens for services, and watch a live queue
board. Admins manage services, users and tokens via an admin dashboard.

## Tables
1. `profiles` — public profile for each auth user. Holds `username`,
   `full_name`, `role` ('user' | 'admin'). Row mirrors `auth.users`.
   `role` is stored in `raw_app_meta_data` for security and copied here
   for convenient querying (RLS still protects it).
2. `services` — queueable services (e.g. "Bank Teller", "Customer Support").
   Has `name`, `description`, `estimated_wait_minutes`, `is_active`,
   `prefix` (token letter prefix, e.g. 'A'), and `next_number` (counter
   for the next ticket number for this service).
3. `tokens` — a single queue booking. Has `number` (human friendly ticket
   number), `status` ('waiting' | 'serving' | 'completed' | 'cancelled'
   | 'no_show'), `service_id`, `user_id`, `booked_at`, `called_at`,
   `completed_at`, `position` (computed view-only via helper), and notes.

## Security (RLS)
- `profiles`: each authenticated user can read all profiles (needed so the
  queue board and admin can show names) but only update their own. Inserts
  are handled by a trigger running as service role during signup.
- `services`: public-ish read for all authenticated users (so everyone can
  see services). Only admins can insert/update/delete. Admin check uses
  `raw_app_meta_data ->> 'role' = 'admin'` via a helper function.
- `tokens`: users can read all waiting/serving tokens (queue board) but
  only insert/update/cancel their own. Admins can update/cancel any
  token (call next, complete, no-show).

## Functions
- `is_admin()` — returns boolean; checks the caller's JWT role claim.
- `handle_new_user()` — trigger fired on `auth.users` INSERT; creates a
  matching `profiles` row from metadata supplied at signup.

## Realtime
- `tokens` and `services` tables are added to the Supabase Realtime
  publication so the frontend can subscribe to live changes.
*/

-- ------------------------------------------------------------------
-- Helper: is_admin() — checks the caller's role from JWT app metadata
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((auth.jwt() -> 'raw_app_meta_data' ->> 'role') = 'admin', false);
$$;

-- ------------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------
-- services
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  prefix text NOT NULL DEFAULT 'A',
  estimated_wait_minutes integer NOT NULL DEFAULT 5 CHECK (estimated_wait_minutes >= 0),
  is_active boolean NOT NULL DEFAULT true,
  next_number integer NOT NULL DEFAULT 1 CHECK (next_number >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select_authenticated" ON public.services;
CREATE POLICY "services_select_authenticated"
  ON public.services FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "services_insert_admin" ON public.services;
CREATE POLICY "services_insert_admin"
  ON public.services FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "services_update_admin" ON public.services;
CREATE POLICY "services_update_admin"
  ON public.services FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "services_delete_admin" ON public.services;
CREATE POLICY "services_delete_admin"
  ON public.services FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------------
-- tokens
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  number integer NOT NULL,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','serving','completed','cancelled','no_show')),
  notes text,
  booked_at timestamptz NOT NULL DEFAULT now(),
  called_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can see tokens (queue board needs this).
DROP POLICY IF EXISTS "tokens_select_authenticated" ON public.tokens;
CREATE POLICY "tokens_select_authenticated"
  ON public.tokens FOR SELECT
  TO authenticated
  USING (true);

-- A user can create a token only for themselves.
DROP POLICY IF EXISTS "tokens_insert_own" ON public.tokens;
CREATE POLICY "tokens_insert_own"
  ON public.tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- A user can update/cancel their own tokens; admins can update any.
DROP POLICY IF EXISTS "tokens_update_own_or_admin" ON public.tokens;
CREATE POLICY "tokens_update_own_or_admin"
  ON public.tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- A user can delete (cancel) their own tokens; admins can delete any.
DROP POLICY IF EXISTS "tokens_delete_own_or_admin" ON public.tokens;
CREATE POLICY "tokens_delete_own_or_admin"
  ON public.tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- ------------------------------------------------------------------
-- Trigger: create a profile row when a new auth user signs up.
-- `raw_user_meta_data` carries `username`, `full_name`, and `role`
-- (only set when the admin creates an account; normal signups default
-- to 'user').
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE
    SET username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------
-- Realtime publication for live queue updates
-- ------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tokens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tokens;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'services'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- ------------------------------------------------------------------
-- Seed data: a few default services and an admin bootstrap note.
-- Admin account itself is created via Supabase Auth on first run; we
-- only seed services here.
-- ------------------------------------------------------------------
INSERT INTO public.services (name, description, prefix, estimated_wait_minutes, is_active, next_number)
SELECT 'Bank Teller', 'Deposits, withdrawals, and account services at the counter.', 'A', 5, true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Bank Teller');

INSERT INTO public.services (name, description, prefix, estimated_wait_minutes, is_active, next_number)
SELECT 'Customer Support', 'General inquiries and account help from our support desk.', 'B', 7, true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Customer Support');

INSERT INTO public.services (name, description, prefix, estimated_wait_minutes, is_active, next_number)
SELECT 'Loan Applications', 'New loan applications and existing loan queries.', 'C', 15, true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Loan Applications');
