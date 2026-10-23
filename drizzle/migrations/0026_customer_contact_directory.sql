CREATE TABLE public.customer_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 plant_id text NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
 name text NOT NULL,
 area text NOT NULL DEFAULT '',
 department text NOT NULL DEFAULT '',
 position text NOT NULL DEFAULT '',
 phone text NOT NULL DEFAULT '',
 alternate_phone text NOT NULL DEFAULT '',
 email text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '',
 is_primary boolean NOT NULL DEFAULT false,
 active boolean NOT NULL DEFAULT true,
 created_by uuid DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_contacts TO authenticated;
GRANT ALL ON public.customer_contacts TO service_role;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users access visible plant contacts" ON public.customer_contacts FOR ALL TO authenticated
 USING (public.is_approved(auth.uid()) AND public.user_domain(auth.uid()) IN ('manager','customer_success','execution') AND EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id))
 WITH CHECK (public.is_approved(auth.uid()) AND public.user_domain(auth.uid()) IN ('manager','customer_success','execution') AND EXISTS (SELECT 1 FROM public.plants p WHERE p.id = plant_id));
CREATE INDEX customer_contacts_plant_idx ON public.customer_contacts(plant_id);
CREATE UNIQUE INDEX customer_contacts_primary_idx ON public.customer_contacts(plant_id) WHERE is_primary AND active;
CREATE FUNCTION public.validate_customer_contact() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.name := btrim(NEW.name);
 IF NEW.name = '' THEN RAISE EXCEPTION 'Contact name is required'; END IF;
 NEW.updated_at := now();
 RETURN NEW;
END;
$$;
CREATE TRIGGER validate_customer_contact_before BEFORE INSERT OR UPDATE ON public.customer_contacts FOR EACH ROW EXECUTE FUNCTION public.validate_customer_contact();
INSERT INTO public.customer_contacts (plant_id, name, phone, is_primary)
 SELECT id, btrim(contact), contact_phone, true FROM public.plants WHERE btrim(contact) <> '';
