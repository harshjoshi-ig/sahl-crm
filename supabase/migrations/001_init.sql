CREATE TYPE remark_flag AS ENUM ('call_again', 'interested', 'not_interested', 'custom');

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  country TEXT NOT NULL,
  state TEXT NOT NULL,
  city TEXT NOT NULL,
  demo_sent BOOLEAN NOT NULL DEFAULT false,
  brochure_sent BOOLEAN NOT NULL DEFAULT false,
  meeting_scheduled_at TIMESTAMPTZ,
  lead_status remark_flag,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.remarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  status_flag remark_flag NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restaurants_select_authenticated"
ON public.restaurants
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "restaurants_insert_authenticated"
ON public.restaurants
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "restaurants_update_own"
ON public.restaurants
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "restaurants_delete_own"
ON public.restaurants
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "remarks_select_authenticated"
ON public.remarks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "remarks_insert_authenticated"
ON public.remarks
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "remarks_update_own"
ON public.remarks
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "remarks_delete_own"
ON public.remarks
FOR DELETE
TO authenticated
USING (created_by = auth.uid());
