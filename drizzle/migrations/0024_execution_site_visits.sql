CREATE TABLE public.execution_site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time text NOT NULL DEFAULT '',
  end_time text NOT NULL DEFAULT '',
  engineer_ids text[] NOT NULL DEFAULT '{}',
  plant_id text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  visit_type text NOT NULL DEFAULT 'other',
  purpose text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  sensors_collected integer NOT NULL DEFAULT 0,
  sensors_delivered integer NOT NULL DEFAULT 0,
  outcome text NOT NULL DEFAULT 'completed',
  attachment_link text NOT NULL DEFAULT '',
  related_job_id text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execution_site_visits TO authenticated;
GRANT ALL ON public.execution_site_visits TO service_role;
ALTER TABLE public.execution_site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec site visits read" ON public.execution_site_visits FOR SELECT TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager' OR (public.user_domain(auth.uid()) = 'execution' AND engineer_ids && ARRAY(SELECT public.my_exec_ids(auth.uid()))));
CREATE POLICY "exec site visits insert" ON public.execution_site_visits FOR INSERT TO authenticated
  WITH CHECK (public.user_domain(auth.uid()) = 'manager' OR (public.user_domain(auth.uid()) = 'execution' AND engineer_ids && ARRAY(SELECT public.my_exec_ids(auth.uid()))));
CREATE POLICY "exec site visits update" ON public.execution_site_visits FOR UPDATE TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager' OR (public.user_domain(auth.uid()) = 'execution' AND engineer_ids && ARRAY(SELECT public.my_exec_ids(auth.uid()))))
  WITH CHECK (public.user_domain(auth.uid()) IN ('manager','execution'));
CREATE POLICY "exec site visits delete" ON public.execution_site_visits FOR DELETE TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager' OR (public.user_domain(auth.uid()) = 'execution' AND engineer_ids && ARRAY(SELECT public.my_exec_ids(auth.uid()))));