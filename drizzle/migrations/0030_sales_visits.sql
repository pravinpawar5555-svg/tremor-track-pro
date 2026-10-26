CREATE TABLE public.sales_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_no text NOT NULL DEFAULT '',
  visit_date date NOT NULL,
  actual_visit_date date,
  customer_type text NOT NULL DEFAULT 'existing',
  plant_id text NOT NULL DEFAULT '',
  company_name text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  branch_id text NOT NULL DEFAULT '',
  sales_engineer_id text NOT NULL DEFAULT '',
  visit_owner_id text NOT NULL DEFAULT '',
  visit_with text NOT NULL DEFAULT 'solo',
  participants jsonb NOT NULL DEFAULT '[]',
  purpose text NOT NULL DEFAULT '',
  objective text NOT NULL DEFAULT '',
  customer_met text NOT NULL DEFAULT '',
  fm_participants text NOT NULL DEFAULT '',
  discussion_summary text NOT NULL DEFAULT '',
  customer_requirement text NOT NULL DEFAULT '',
  applications text[] NOT NULL DEFAULT '{}',
  potential text NOT NULL DEFAULT '',
  visit_outcome text NOT NULL DEFAULT '',
  next_step text NOT NULL DEFAULT '',
  next_followup_date date,
  next_step_owner_id text NOT NULL DEFAULT '',
  next_action text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'planned',
  opportunity_id uuid,
  reminder_id uuid,
  history jsonb NOT NULL DEFAULT '[]',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_visits TO authenticated;
GRANT ALL ON public.sales_visits TO service_role;
ALTER TABLE public.sales_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales visits read" ON public.sales_visits FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) AND (public.user_domain(auth.uid()) = 'manager' OR created_by = auth.uid()));
CREATE POLICY "sales visits insert" ON public.sales_visits FOR INSERT TO authenticated
  WITH CHECK (public.is_approved(auth.uid()) AND public.user_domain(auth.uid()) IN ('manager','customer_success') AND (created_by = auth.uid() OR public.user_domain(auth.uid()) = 'manager'));
CREATE POLICY "sales visits update" ON public.sales_visits FOR UPDATE TO authenticated
  USING (public.is_approved(auth.uid()) AND (public.user_domain(auth.uid()) = 'manager' OR created_by = auth.uid()))
  WITH CHECK (public.is_approved(auth.uid()) AND (public.user_domain(auth.uid()) = 'manager' OR created_by = auth.uid()));
CREATE POLICY "sales visits delete" ON public.sales_visits FOR DELETE TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager');

CREATE SEQUENCE IF NOT EXISTS public.sales_visit_seq;
GRANT USAGE ON SEQUENCE public.sales_visit_seq TO authenticated;
CREATE OR REPLACE FUNCTION public.sales_visit_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.visit_no IS NULL OR NEW.visit_no = '' THEN
    NEW.visit_no := 'SV-' || to_char(coalesce(NEW.visit_date, current_date), 'YYYY') || '-' || lpad(nextval('public.sales_visit_seq')::text, 3, '0');
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER sales_visit_number BEFORE INSERT OR UPDATE ON public.sales_visits FOR EACH ROW EXECUTE FUNCTION public.sales_visit_number();

ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS sales_visit_id uuid;

INSERT INTO public.sales_visits (visit_date, actual_visit_date, customer_type, plant_id, company_name, location, visit_owner_id, purpose, objective, discussion_summary, status, created_by, history)
SELECT v.planned_date, v.completed_date, 'existing', v.plant_id, coalesce(p.customer, p.name, ''), coalesce(p.location, ''),
  coalesce(v.created_by, ''), 'Customer Relationship Visit', coalesce(v.purpose, ''), coalesce(v.observations, ''),
  CASE WHEN v.status = 'completed' THEN 'completed' WHEN v.status = 'cancelled' THEN 'cancelled' ELSE 'planned' END,
  NULL, '[{"text":"Moved from earlier private sales visit"}]'::jsonb
FROM public.visits v LEFT JOIN public.plants p ON p.id::text = v.plant_id::text
WHERE v.manager_only = true;