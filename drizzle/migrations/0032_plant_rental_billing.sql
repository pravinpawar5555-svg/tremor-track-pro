CREATE TABLE public.plant_billing (
  plant_id text PRIMARY KEY REFERENCES public.plants(id) ON DELETE CASCADE,
  model text NOT NULL DEFAULT 'none',
  frequency text NOT NULL DEFAULT 'quarterly',
  start_date date,
  status text NOT NULL DEFAULT 'active',
  report_required boolean NOT NULL DEFAULT true,
  po_ref text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plant_billing TO authenticated;
GRANT ALL ON public.plant_billing TO service_role;
ALTER TABLE public.plant_billing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing cfg read" ON public.plant_billing FOR SELECT TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','customer_success'));
CREATE POLICY "billing cfg manager write" ON public.plant_billing FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager') WITH CHECK (public.user_domain(auth.uid()) = 'manager');

CREATE TABLE public.billing_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id text NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  frequency text NOT NULL,
  status text NOT NULL DEFAULT 'sent_to_team',
  report_ids text[] NOT NULL DEFAULT '{}',
  reports_sent integer NOT NULL DEFAULT 0,
  reports_total integer NOT NULL DEFAULT 0,
  po_ref text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  hold_reason text NOT NULL DEFAULT '',
  sent_by text NOT NULL DEFAULT '',
  sent_at timestamptz,
  invoice_no text NOT NULL DEFAULT '',
  invoice_date date,
  invoice_link text NOT NULL DEFAULT '',
  invoice_comment text NOT NULL DEFAULT '',
  invoice_sent_date date,
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plant_id, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_periods TO authenticated;
GRANT ALL ON public.billing_periods TO service_role;
ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing period read" ON public.billing_periods FOR SELECT TO authenticated
  USING (public.user_domain(auth.uid()) IN ('manager','customer_success'));
CREATE POLICY "billing period manager write" ON public.billing_periods FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager') WITH CHECK (public.user_domain(auth.uid()) = 'manager');