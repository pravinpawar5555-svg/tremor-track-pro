ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS mom_no text NOT NULL DEFAULT '';
CREATE SEQUENCE IF NOT EXISTS public.mom_serial_seq;
GRANT USAGE ON SEQUENCE public.mom_serial_seq TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.assign_mom_no() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d date;
BEGIN
  IF NEW.status = 'completed' AND coalesce(NEW.mom_no,'') = '' THEN
    d := coalesce(NEW.completed_date, NEW.planned_date, current_date);
    NEW.mom_no := 'FM/' || to_char(d,'YYYY') || '/' || to_char(d,'MM') || '/' || lpad(nextval('public.mom_serial_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS visits_assign_mom_no ON public.visits;
CREATE TRIGGER visits_assign_mom_no BEFORE INSERT OR UPDATE ON public.visits FOR EACH ROW EXECUTE FUNCTION public.assign_mom_no();
CREATE UNIQUE INDEX IF NOT EXISTS visits_mom_no_key ON public.visits(mom_no) WHERE mom_no <> '';
UPDATE public.visits SET mom_no = '' WHERE status = 'completed' AND mom_no = '';