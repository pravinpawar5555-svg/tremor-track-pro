ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS mom_required boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.assign_mom_no()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE d date;
BEGIN
  IF NEW.status = 'completed' AND NEW.mom_required AND coalesce(NEW.mom_no,'') = '' THEN
    d := coalesce(NEW.completed_date, NEW.planned_date, current_date);
    NEW.mom_no := 'FM/' || to_char(d,'YYYY') || '/' || to_char(d,'MM') || '/' || lpad(nextval('public.mom_serial_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END $function$;