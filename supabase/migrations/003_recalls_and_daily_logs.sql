ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS next_recall_at TIMESTAMPTZ;

ALTER TABLE public.remarks
ADD COLUMN IF NOT EXISTS recall_scheduled_for TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.lead_take_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lead_id, user_id, log_date)
);

CREATE TABLE IF NOT EXISTS public.daily_lead_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leads_taken_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

ALTER TABLE public.lead_take_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_lead_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_take_events_select_authenticated" ON public.lead_take_events;
DROP POLICY IF EXISTS "lead_take_events_insert_own" ON public.lead_take_events;
DROP POLICY IF EXISTS "daily_lead_logs_select_authenticated" ON public.daily_lead_logs;
DROP POLICY IF EXISTS "daily_lead_logs_upsert_own" ON public.daily_lead_logs;

CREATE POLICY "lead_take_events_select_authenticated"
ON public.lead_take_events
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "lead_take_events_insert_own"
ON public.lead_take_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "daily_lead_logs_select_authenticated"
ON public.daily_lead_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "daily_lead_logs_upsert_own"
ON public.daily_lead_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "daily_lead_logs_update_own" ON public.daily_lead_logs;
CREATE POLICY "daily_lead_logs_update_own"
ON public.daily_lead_logs
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
