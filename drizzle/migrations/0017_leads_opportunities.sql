CREATE SEQUENCE IF NOT EXISTS public.opportunity_serial_seq;

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_number text NOT NULL DEFAULT '',
  lead_source text NOT NULL DEFAULT 'Branch Sales',
  lead_source_other text NOT NULL DEFAULT '',
  plant_id text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  plant_name text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  branch_id text NOT NULL DEFAULT '',
  sales_engineer_id text NOT NULL DEFAULT '',
  opportunity_type text NOT NULL DEFAULT 'Order',
  requirement_summary text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  contact_mobile text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  expected_sensor_qty integer NOT NULL DEFAULT 0,
  expected_machine_qty integer NOT NULL DEFAULT 0,
  expected_date date,
  priority text NOT NULL DEFAULT 'normal',
  stage text NOT NULL DEFAULT 'new',
  next_action text NOT NULL DEFAULT '',
  next_action_owner text NOT NULL DEFAULT '',
  next_action_date date,
  notes text NOT NULL DEFAULT '',
  attachment_links text NOT NULL DEFAULT '',
  estimated_value numeric,
  related_execution_job_id text NOT NULL DEFAULT '',
  exec_handover jsonb NOT NULL DEFAULT '{}'::jsonb,
  cs_handover jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_success_engineer_id text NOT NULL DEFAULT '',
  lost_reason text NOT NULL DEFAULT '',
  lost_remark text NOT NULL DEFAULT '',
  hold_reason text NOT NULL DEFAULT '',
  hold_review_date date,
  archived boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT '',
  created_by_domain text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
GRANT USAGE ON SEQUENCE public.opportunity_serial_seq TO authenticated, service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opp manager all" ON public.opportunities FOR ALL TO authenticated
  USING (public.user_domain(auth.uid()) = 'manager') WITH CHECK (public.user_domain(auth.uid()) = 'manager');
CREATE POLICY "opp own read" ON public.opportunities FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) AND created_by = auth.uid()::text);
CREATE POLICY "opp own insert" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (public.is_approved(auth.uid()) AND created_by = auth.uid()::text);

CREATE TABLE public.opportunity_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'system',
  text text NOT NULL DEFAULT '',
  by_user text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.opportunity_activity TO authenticated;
GRANT ALL ON public.opportunity_activity TO service_role;
ALTER TABLE public.opportunity_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "opp act read" ON public.opportunity_activity FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id));
CREATE POLICY "opp act insert" ON public.opportunity_activity FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.opportunities o WHERE o.id = opportunity_id));

CREATE OR REPLACE FUNCTION public.opportunity_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.opportunity_number,'') = '' THEN
      NEW.opportunity_number := 'FM-OPP-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.opportunity_serial_seq')::text, 4, '0');
    END IF;
    NEW.created_by_domain := public.user_domain(auth.uid());
  ELSE
    NEW.updated_at := now();
    NEW.opportunity_number := OLD.opportunity_number;
    NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER opportunities_before BEFORE INSERT OR UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.opportunity_before();

-- When a linked execution job is completed, move the opportunity forward automatically.
CREATE OR REPLACE FUNCTION public.sync_opportunity_from_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.opportunities;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    FOR o IN SELECT * FROM public.opportunities WHERE related_execution_job_id = NEW.id::text LOOP
      IF NEW.installation_type = 'demo' THEN
        UPDATE public.opportunities SET stage = 'demo_completed',
          next_action = 'Commercial follow-up after demo', next_action_date = current_date WHERE id = o.id;
        INSERT INTO public.opportunity_activity(opportunity_id, text, by_user)
          VALUES (o.id, 'Demo execution completed — commercial follow-up required', 'System');
      ELSE
        UPDATE public.opportunities SET stage = 'cs_handover',
          cs_handover = jsonb_build_object('status','ready') WHERE id = o.id;
        INSERT INTO public.opportunity_activity(opportunity_id, text, by_user)
          VALUES (o.id, 'Execution completed — Customer Success handover ready', 'System');
      END IF;
    END LOOP;
  ELSIF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' THEN
    UPDATE public.opportunities SET stage = CASE WHEN NEW.installation_type = 'demo' THEN 'demo_progress' ELSE 'exec_progress' END
      WHERE related_execution_job_id = NEW.id::text AND stage IN ('handed_exec','demo_planned');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER execution_jobs_sync_opp AFTER UPDATE ON public.execution_jobs
  FOR EACH ROW EXECUTE FUNCTION public.sync_opportunity_from_job();