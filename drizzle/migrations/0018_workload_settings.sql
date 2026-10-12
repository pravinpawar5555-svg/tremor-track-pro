CREATE TABLE public.workload_settings (
  id text PRIMARY KEY DEFAULT 'default',
  cs_high integer,
  cs_over integer,
  exec_high integer,
  exec_over integer,
  non_working_days integer[] NOT NULL DEFAULT '{0}',
  holidays date[] NOT NULL DEFAULT '{}',
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.workload_settings TO authenticated;
GRANT ALL ON public.workload_settings TO service_role;
ALTER TABLE public.workload_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workload settings read" ON public.workload_settings FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "workload settings manager write" ON public.workload_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'manager'));