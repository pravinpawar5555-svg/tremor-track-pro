CREATE TABLE public.execution_engineers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  employee_id text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  mobile text NOT NULL DEFAULT '',
  branch text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'engineer',
  status text NOT NULL DEFAULT 'active',
  linked_user_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execution_engineers TO authenticated;
GRANT ALL ON public.execution_engineers TO service_role;
ALTER TABLE public.execution_engineers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read exec engineers" ON public.execution_engineers FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manager writes exec engineers" ON public.execution_engineers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'manager'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'manager'::app_role));

CREATE TABLE public.execution_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_type text NOT NULL DEFAULT 'demo',
  plant_id text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  plant_name text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  expected_execution_date date,
  assigned_engineer_id text NOT NULL DEFAULT '',
  secondary_engineer_id text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'lead',
  notes text NOT NULL DEFAULT '',
  schedule_notes text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  sensors_installed integer NOT NULL DEFAULT 0,
  machines_covered integer NOT NULL DEFAULT 0,
  kickoff_completed text NOT NULL DEFAULT 'no',
  configuration_completed text NOT NULL DEFAULT 'no',
  aip_generated text NOT NULL DEFAULT 'no',
  report_link text NOT NULL DEFAULT '',
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  comments text NOT NULL DEFAULT '',
  pending_reason text NOT NULL DEFAULT '',
  pending_remark text NOT NULL DEFAULT '',
  next_planned_date date,
  completed_at timestamptz,
  completed_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execution_jobs TO authenticated;
GRANT ALL ON public.execution_jobs TO service_role;
ALTER TABLE public.execution_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved exec jobs" ON public.execution_jobs FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

CREATE TABLE public.execution_daily_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.execution_jobs(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  remark text NOT NULL DEFAULT '',
  work_completed text NOT NULL DEFAULT '',
  pending_next_action text NOT NULL DEFAULT '',
  attachment_link text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execution_daily_updates TO authenticated;
GRANT ALL ON public.execution_daily_updates TO service_role;
ALTER TABLE public.execution_daily_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved exec updates" ON public.execution_daily_updates FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

CREATE TABLE public.execution_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.execution_jobs(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'note',
  text text NOT NULL DEFAULT '',
  by_user text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.execution_activity TO authenticated;
GRANT ALL ON public.execution_activity TO service_role;
ALTER TABLE public.execution_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read exec activity" ON public.execution_activity FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "approved add exec activity" ON public.execution_activity FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()));