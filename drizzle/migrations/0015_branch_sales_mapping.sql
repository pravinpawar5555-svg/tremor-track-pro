CREATE TABLE public.ho_division_kams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  mobile text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name text NOT NULL UNIQUE,
  ho_division_kam_id uuid REFERENCES public.ho_division_kams(id),
  branch_rm_name text NOT NULL DEFAULT '',
  branch_rm_contact text NOT NULL DEFAULT '',
  branch_rm_email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.sales_engineers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  employee_id text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  mobile text NOT NULL DEFAULT '',
  branch_id uuid REFERENCES public.branches(id),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.ownership_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_id text NOT NULL,
  entity_name text NOT NULL DEFAULT '',
  field text NOT NULL,
  old_value text NOT NULL DEFAULT '',
  new_value text NOT NULL DEFAULT '',
  changed_by text NOT NULL DEFAULT '',
  changed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plants ADD COLUMN branch_id text NOT NULL DEFAULT '';
ALTER TABLE public.plants ADD COLUMN sales_engineer_id text NOT NULL DEFAULT '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ho_division_kams, public.branches, public.sales_engineers TO authenticated;
GRANT SELECT ON public.ownership_audit TO authenticated;
GRANT ALL ON public.ho_division_kams, public.branches, public.sales_engineers, public.ownership_audit TO service_role;

ALTER TABLE public.ho_division_kams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_engineers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read kams" ON public.ho_division_kams FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manage kams" ON public.ho_division_kams FOR ALL TO authenticated USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));
CREATE POLICY "read branches" ON public.branches FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manage branches" ON public.branches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));
CREATE POLICY "read sales" ON public.sales_engineers FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manage sales" ON public.sales_engineers FOR ALL TO authenticated USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));
CREATE POLICY "read audit" ON public.ownership_audit FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

CREATE OR REPLACE FUNCTION public.actor_name() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT NULLIF(full_name,'') FROM public.profiles WHERE id = auth.uid()), 'System')
$$;

CREATE OR REPLACE FUNCTION public.audit_branch_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.branch_rm_name IS DISTINCT FROM OLD.branch_rm_name THEN
    INSERT INTO public.ownership_audit(entity,entity_id,entity_name,field,old_value,new_value,changed_by)
    VALUES ('branch',NEW.id::text,NEW.branch_name,'Branch RM',OLD.branch_rm_name,NEW.branch_rm_name,public.actor_name());
  END IF;
  IF NEW.branch_rm_contact IS DISTINCT FROM OLD.branch_rm_contact THEN
    INSERT INTO public.ownership_audit(entity,entity_id,entity_name,field,old_value,new_value,changed_by)
    VALUES ('branch',NEW.id::text,NEW.branch_name,'Branch RM Contact',OLD.branch_rm_contact,NEW.branch_rm_contact,public.actor_name());
  END IF;
  IF NEW.branch_rm_email IS DISTINCT FROM OLD.branch_rm_email THEN
    INSERT INTO public.ownership_audit(entity,entity_id,entity_name,field,old_value,new_value,changed_by)
    VALUES ('branch',NEW.id::text,NEW.branch_name,'Branch RM Email',OLD.branch_rm_email,NEW.branch_rm_email,public.actor_name());
  END IF;
  IF NEW.ho_division_kam_id IS DISTINCT FROM OLD.ho_division_kam_id THEN
    INSERT INTO public.ownership_audit(entity,entity_id,entity_name,field,old_value,new_value,changed_by)
    VALUES ('branch',NEW.id::text,NEW.branch_name,'HO Division KAM',
      COALESCE((SELECT name FROM public.ho_division_kams WHERE id=OLD.ho_division_kam_id),''),
      COALESCE((SELECT name FROM public.ho_division_kams WHERE id=NEW.ho_division_kam_id),''),public.actor_name());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER branches_audit BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.audit_branch_change();

CREATE OR REPLACE FUNCTION public.audit_plant_ownership() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
    INSERT INTO public.ownership_audit(entity,entity_id,entity_name,field,old_value,new_value,changed_by)
    VALUES ('plant',NEW.id,NEW.name,'Branch',
      COALESCE((SELECT branch_name FROM public.branches WHERE id::text=OLD.branch_id),''),
      COALESCE((SELECT branch_name FROM public.branches WHERE id::text=NEW.branch_id),''),public.actor_name());
  END IF;
  IF NEW.sales_engineer_id IS DISTINCT FROM OLD.sales_engineer_id THEN
    INSERT INTO public.ownership_audit(entity,entity_id,entity_name,field,old_value,new_value,changed_by)
    VALUES ('plant',NEW.id,NEW.name,'Sales Engineer',
      COALESCE((SELECT name FROM public.sales_engineers WHERE id::text=OLD.sales_engineer_id),''),
      COALESCE((SELECT name FROM public.sales_engineers WHERE id::text=NEW.sales_engineer_id),''),public.actor_name());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER plants_ownership_audit AFTER UPDATE ON public.plants FOR EACH ROW EXECUTE FUNCTION public.audit_plant_ownership();

INSERT INTO public.ho_division_kams(name) VALUES ('Yogesh'),('Amrit'),('Monica');
INSERT INTO public.branches(branch_name, ho_division_kam_id, branch_rm_name, branch_rm_contact, branch_rm_email)
SELECT v.b, k.id, v.rm, v.ph, v.em FROM (VALUES
 ('Yogesh','CHENNAI','Victor Raja','7299056465','vraja@forbesmarshall.com'),
 ('Yogesh','BANGALORE','Rajesh Singh','9204788001','rsingh@forbesmarshall.com'),
 ('Yogesh','COIMBATORE','Anand Sherin','9944000816','asherin@forbesmarshall.com'),
 ('Yogesh','KOLKATA','Priyankar Dey','9830829653','pdey@forbesmarshall.com'),
 ('Yogesh','BHUVANESHWAR','Somnath Chakraborty','8910095157','somnathc@forbesmarshall.com'),
 ('Yogesh','MUMBAI','Shakti Solar','9819034951','ssolar@forbesmarshall.com'),
 ('Yogesh','HYDERABAD','Vishal Agrawal','9099915825','vagrawal@forbesmarshall.com'),
 ('Yogesh','VIZAG','Rahul Chillara','9545033255','rchillara@forbesmarshall.com'),
 ('Amrit','JAMSHEDPUR','Abhijeet Sarkar','9973681215','asarkar@forbesmarshall.com'),
 ('Amrit','AHMEDABAD','Upendra Patel','925800785','upatel@forbesmarshall.com'),
 ('Amrit','BARODA','Kalpesh Sheladiya','9825000717','ksheladiya@forbesmarshall.com'),
 ('Amrit','DELHI','Raghavendra Singh','9560200333','rgsingh@forbesmarshall.com'),
 ('Amrit','CHANDIGARH','Deepak Sharma','8288020349','drdsharma@forbesmarshall.com'),
 ('Amrit','LUCKNOW','Neeraj Singh','9721456212','nnsingh@forbesmarshall.com'),
 ('Amrit','SURAT','Jitendra Patil','9377006552','jmpatil@forbesmarshall.com'),
 ('Monica','NAGPUR','Sameer Chaudhari','9975455632','schaudhari@forbesmarshall.com'),
 ('Monica','VASHI','Girish Bhatia','9922027666','gbhatia@forbesmarshall.com'),
 ('Monica','PUNE','Amol Taware','9881001543','ataware@forbesmarshall.com')
) AS v(k,b,rm,ph,em) JOIN public.ho_division_kams k ON k.name = v.k;