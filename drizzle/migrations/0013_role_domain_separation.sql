CREATE OR REPLACE FUNCTION public.user_domain(_uid uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT public.is_approved(_uid) THEN 'none'
    WHEN public.has_role(_uid, 'manager') THEN 'manager'
    WHEN EXISTS (SELECT 1 FROM public.execution_engineers WHERE linked_user_id = _uid::text)
      OR EXISTS (SELECT 1 FROM public.profiles p JOIN public.engineers e ON e.id = p.engineer_id WHERE p.id = _uid AND e.role = 'execution')
      THEN 'execution'
    ELSE 'customer_success' END
$$;

CREATE OR REPLACE FUNCTION public.is_exec_engineer_id(_id text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.engineers WHERE id = _id AND role = 'execution')
      OR EXISTS (SELECT 1 FROM public.execution_engineers WHERE linked_user_id = _id)
$$;

CREATE OR REPLACE FUNCTION public.my_exec_ids(_uid uuid) RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id::text FROM public.execution_engineers WHERE linked_user_id = _uid::text
$$;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS work_domain text NOT NULL DEFAULT 'customer_success';
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS work_domain text NOT NULL DEFAULT 'customer_success';
ALTER TABLE public.day_closures ADD COLUMN IF NOT EXISTS work_domain text NOT NULL DEFAULT 'customer_success';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS work_domain text NOT NULL DEFAULT 'customer_success';

UPDATE public.tasks SET work_domain = 'execution' WHERE public.is_exec_engineer_id(engineer_id);
UPDATE public.reminders SET work_domain = 'execution' WHERE public.is_exec_engineer_id(user_id);
UPDATE public.day_closures SET work_domain = 'execution' WHERE public.is_exec_engineer_id(engineer_id);
UPDATE public.messages SET work_domain = 'execution' WHERE public.is_exec_engineer_id(author_id);

CREATE OR REPLACE FUNCTION public.stamp_work_domain() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target text;
BEGIN
  IF TG_TABLE_NAME IN ('tasks','day_closures') THEN target := NEW.engineer_id;
  ELSIF TG_TABLE_NAME = 'reminders' THEN target := NEW.user_id;
  ELSE target := NEW.author_id; END IF;
  IF public.user_domain(auth.uid()) = 'execution' OR public.is_exec_engineer_id(target) THEN
    NEW.work_domain := 'execution';
  ELSIF TG_OP = 'INSERT' THEN
    NEW.work_domain := 'customer_success';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tasks_domain BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.stamp_work_domain();
CREATE TRIGGER reminders_domain BEFORE INSERT ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.stamp_work_domain();
CREATE TRIGGER closures_domain BEFORE INSERT ON public.day_closures FOR EACH ROW EXECUTE FUNCTION public.stamp_work_domain();
CREATE TRIGGER messages_domain BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.stamp_work_domain();

-- Domain-scoped work tables
DROP POLICY IF EXISTS "approved users tasks" ON public.tasks;
CREATE POLICY "domain tasks" ON public.tasks FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager', work_domain))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager', work_domain));
DROP POLICY IF EXISTS "approved reminders" ON public.reminders;
CREATE POLICY "domain reminders" ON public.reminders FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager', work_domain))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager', work_domain));
DROP POLICY IF EXISTS "approved closures" ON public.day_closures;
CREATE POLICY "domain closures" ON public.day_closures FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager', work_domain))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager', work_domain));
DROP POLICY IF EXISTS "approved all" ON public.messages;
CREATE POLICY "domain messages" ON public.messages FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager', work_domain))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager', work_domain));

-- Customer Success only tables
DROP POLICY IF EXISTS "approved all visits" ON public.visits;
CREATE POLICY "cs visits" ON public.visits FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','customer_success'))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager','customer_success'));
DROP POLICY IF EXISTS "approved all" ON public.reports;
CREATE POLICY "cs reports" ON public.reports FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','customer_success'))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager','customer_success'));
DROP POLICY IF EXISTS "approved manage recurring" ON public.recurring_reports;
DROP POLICY IF EXISTS "approved read recurring" ON public.recurring_reports;
CREATE POLICY "cs recurring" ON public.recurring_reports FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','customer_success'))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager','customer_success'));
DROP POLICY IF EXISTS "approved all" ON public.daily_updates;
CREATE POLICY "cs daily updates" ON public.daily_updates FOR SELECT TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','customer_success'));
DROP POLICY IF EXISTS "approved all" ON public.tickets;
CREATE POLICY "cs tickets" ON public.tickets FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','customer_success'))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager','customer_success'));

-- Execution tables
DROP POLICY IF EXISTS "approved exec jobs" ON public.execution_jobs;
CREATE POLICY "exec jobs read" ON public.execution_jobs FOR SELECT TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager' OR (public.user_domain(auth.uid()) = 'execution' AND (assigned_engineer_id IN (SELECT public.my_exec_ids(auth.uid())) OR secondary_engineer_id IN (SELECT public.my_exec_ids(auth.uid())) OR assigned_engineer_id = '')));
CREATE POLICY "exec jobs insert" ON public.execution_jobs FOR INSERT TO authenticated
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager','execution'));
CREATE POLICY "exec jobs update" ON public.execution_jobs FOR UPDATE TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager' OR (public.user_domain(auth.uid()) = 'execution' AND (assigned_engineer_id IN (SELECT public.my_exec_ids(auth.uid())) OR secondary_engineer_id IN (SELECT public.my_exec_ids(auth.uid())) OR assigned_engineer_id = '')))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager','execution'));
CREATE POLICY "exec jobs delete" ON public.execution_jobs FOR DELETE TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager' OR (public.user_domain(auth.uid()) = 'execution' AND assigned_engineer_id IN (SELECT public.my_exec_ids(auth.uid()))));

DROP POLICY IF EXISTS "approved exec updates" ON public.execution_daily_updates;
CREATE POLICY "exec updates" ON public.execution_daily_updates FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','execution') AND job_id IN (SELECT id FROM public.execution_jobs))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager','execution'));
DROP POLICY IF EXISTS "approved add exec activity" ON public.execution_activity;
DROP POLICY IF EXISTS "approved read exec activity" ON public.execution_activity;
CREATE POLICY "exec activity read" ON public.execution_activity FOR SELECT TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','execution') AND job_id IN (SELECT id FROM public.execution_jobs));
CREATE POLICY "exec activity add" ON public.execution_activity FOR INSERT TO authenticated
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager','execution'));
CREATE POLICY "exec activity delete" ON public.execution_activity FOR DELETE TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','execution') AND job_id IN (SELECT id FROM public.execution_jobs));
GRANT DELETE ON public.execution_activity TO authenticated;
DROP POLICY IF EXISTS "approved read exec engineers" ON public.execution_engineers;
CREATE POLICY "exec engineers read" ON public.execution_engineers FOR SELECT TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','execution'));

-- Plants: CS/manager full, execution only plants on visible jobs (read)
DROP POLICY IF EXISTS "approved all" ON public.plants;
CREATE POLICY "cs plants" ON public.plants FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','customer_success'))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager','customer_success'));
CREATE POLICY "exec plants read" ON public.plants FOR SELECT TO authenticated
  USING (public.user_domain(auth.uid()) = 'execution' AND id IN (SELECT plant_id FROM public.execution_jobs));