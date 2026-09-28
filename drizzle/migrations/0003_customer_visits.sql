CREATE TABLE public.visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id text NOT NULL,
  engineer_ids text[] NOT NULL DEFAULT '{}',
  visit_type text NOT NULL DEFAULT 'amc',
  frequency text NOT NULL DEFAULT 'none',
  custom_every integer NOT NULL DEFAULT 1,
  custom_unit text NOT NULL DEFAULT 'months',
  planned_date date NOT NULL,
  purpose text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'planned',
  completed_date date,
  discussion_points text[] NOT NULL DEFAULT '{}',
  observations text NOT NULL DEFAULT '',
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_visit_date date,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visits TO authenticated;
GRANT ALL ON public.visits TO service_role;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved all visits" ON public.visits FOR ALL TO authenticated
  USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));