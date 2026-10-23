CREATE OR REPLACE FUNCTION public.validate_customer_contact() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.name := btrim(NEW.name);
 IF NEW.name = '' THEN RAISE EXCEPTION 'Contact name is required'; END IF;
 IF NEW.is_primary AND NEW.active THEN
   PERFORM 1 FROM public.plants WHERE id = NEW.plant_id FOR UPDATE;
   UPDATE public.customer_contacts SET is_primary = false WHERE plant_id = NEW.plant_id AND id <> NEW.id AND is_primary AND active;
 END IF;
 NEW.updated_at := now();
 RETURN NEW;
END;
$$;