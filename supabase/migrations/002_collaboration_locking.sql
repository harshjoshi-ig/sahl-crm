ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS done_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_remarked_at TIMESTAMPTZ;

DROP POLICY IF EXISTS "restaurants_update_own" ON public.restaurants;
DROP POLICY IF EXISTS "restaurants_update_authenticated" ON public.restaurants;

CREATE POLICY "restaurants_update_authenticated"
ON public.restaurants
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

ALTER TABLE public.restaurants REPLICA IDENTITY FULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_publication_tables
		WHERE pubname = 'supabase_realtime'
			AND schemaname = 'public'
			AND tablename = 'restaurants'
	) THEN
		ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
	END IF;
END $$;
