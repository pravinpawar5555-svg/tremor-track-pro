ALTER TABLE public.plants ADD COLUMN operational_status text NOT NULL DEFAULT 'active', ADD COLUMN demo_removed_date date, ADD COLUMN sales_followup_date date, ADD COLUMN lifecycle_note text NOT NULL DEFAULT '', ADD COLUMN lifecycle_history jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.plants ADD CONSTRAINT plants_operational_status_valid CHECK (operational_status IN ('active','sales_followup','closed_lost'));
CREATE OR REPLACE FUNCTION public.record_plant_lifecycle() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'UPDATE' THEN
  NEW.lifecycle_history := OLD.lifecycle_history;
  IF NEW.operational_status IS DISTINCT FROM OLD.operational_status THEN
   IF NOT public.is_approved(auth.uid()) OR public.perm_level(auth.uid(),'plants','edit') = 'none' THEN RAISE EXCEPTION 'Plant edit permission required'; END IF;
   IF NEW.operational_status = 'sales_followup' AND (NEW.category <> 'demo' OR NEW.demo_removed_date IS NULL) THEN RAISE EXCEPTION 'Record the demo sensor removal date first'; END IF;
   IF NEW.operational_status = 'closed_lost' AND btrim(NEW.lifecycle_note) = '' THEN RAISE EXCEPTION 'A lost-order reason is required'; END IF;
   IF OLD.operational_status <> 'active' AND NEW.operational_status = 'active' AND NEW.category = 'order' THEN
    NEW.amc_start := NULL; NEW.amc_end := NULL;
   END IF;
   NEW.lifecycle_history := OLD.lifecycle_history || jsonb_build_array(jsonb_build_object('from',OLD.operational_status,'to',NEW.operational_status,'date',now(),'by',public.actor_name(),'note',NEW.lifecycle_note,'removed_date',NEW.demo_removed_date));
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER plants_lifecycle_history BEFORE UPDATE ON public.plants FOR EACH ROW EXECUTE FUNCTION public.record_plant_lifecycle();