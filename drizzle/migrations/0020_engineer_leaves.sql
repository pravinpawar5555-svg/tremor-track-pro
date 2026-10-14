ALTER TABLE public.workload_settings ALTER COLUMN non_working_days SET DEFAULT '{0,6}';
CREATE TABLE public.engineer_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL DEFAULT 'Casual',
  note text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.engineer_leaves TO authenticated;
GRANT ALL ON public.engineer_leaves TO service_role;
ALTER TABLE public.engineer_leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaves manager all" ON public.engineer_leaves FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager') WITH CHECK (public.user_domain(auth.uid()) = 'manager');
CREATE POLICY "leaves own" ON public.engineer_leaves FOR ALL TO authenticated
  USING (public.is_approved(auth.uid()) AND person_id IN (SELECT public.my_person_ids(auth.uid())))
  WITH CHECK (public.is_approved(auth.uid()) AND person_id IN (SELECT public.my_person_ids(auth.uid())));