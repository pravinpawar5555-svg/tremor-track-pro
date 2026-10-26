ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS manager_only boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "cs visits" ON public.visits;
CREATE POLICY "cs visits" ON public.visits FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager' OR (public.user_domain(auth.uid()) = 'customer_success' AND manager_only = false))
  WITH CHECK (public.user_domain(auth.uid()) = 'manager' OR (public.user_domain(auth.uid()) = 'customer_success' AND manager_only = false));

CREATE OR REPLACE FUNCTION public.stamp_work_domain() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target text;
BEGIN
  IF TG_TABLE_NAME IN ('tasks','day_closures') THEN target := NEW.engineer_id;
  ELSIF TG_TABLE_NAME = 'reminders' THEN target := NEW.user_id;
  ELSE target := NEW.author_id; END IF;
  IF TG_TABLE_NAME IN ('tasks','reminders','day_closures')
     AND EXISTS (SELECT 1 FROM public.engineers e WHERE e.id = target AND e.role = 'manager') THEN
    NEW.work_domain := 'manager';
  ELSIF public.user_domain(auth.uid()) = 'execution' OR public.is_exec_engineer_id(target) THEN
    NEW.work_domain := 'execution';
  ELSIF TG_OP = 'INSERT' THEN
    NEW.work_domain := 'customer_success';
  END IF;
  RETURN NEW;
END $$;

UPDATE public.tasks t SET work_domain = 'manager' FROM public.engineers e WHERE e.id = t.engineer_id AND e.role = 'manager';