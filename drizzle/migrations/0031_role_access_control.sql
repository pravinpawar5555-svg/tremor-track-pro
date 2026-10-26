CREATE TABLE public.role_permissions (
  role text NOT NULL CHECK (role IN ('customer_success','execution')),
  module text NOT NULL,
  action text NOT NULL,
  level text NOT NULL DEFAULT 'own' CHECK (level IN ('none','own','all')),
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, module, action)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read perms" ON public.role_permissions FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manager writes perms" ON public.role_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));

CREATE TABLE public.reminder_rules (
  from_domain text NOT NULL CHECK (from_domain IN ('customer_success','execution')),
  to_domain text NOT NULL CHECK (to_domain IN ('customer_success','execution')),
  allowed boolean NOT NULL DEFAULT true,
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_domain, to_domain)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminder_rules TO authenticated;
GRANT ALL ON public.reminder_rules TO service_role;
ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read rules" ON public.reminder_rules FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manager writes rules" ON public.reminder_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'manager')) WITH CHECK (public.has_role(auth.uid(),'manager'));

CREATE TABLE public.permission_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting text NOT NULL,
  old_value text NOT NULL DEFAULT '',
  new_value text NOT NULL DEFAULT '',
  changed_by text NOT NULL DEFAULT '',
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.permission_audit TO authenticated;
GRANT ALL ON public.permission_audit TO service_role;
ALTER TABLE public.permission_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager reads audit" ON public.permission_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'manager'));

CREATE OR REPLACE FUNCTION public.perm_level(_uid uuid, _module text, _action text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(_uid,'manager') THEN 'all'
    ELSE COALESCE((SELECT level FROM public.role_permissions WHERE role = public.user_domain(_uid) AND module = _module AND action = _action), 'own') END
$$;

CREATE OR REPLACE FUNCTION public.person_domain(_id text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.engineers WHERE id = _id AND role = 'manager') THEN 'manager'
    WHEN public.is_exec_engineer_id(_id) OR EXISTS (SELECT 1 FROM public.engineers WHERE id = _id AND role = 'execution') THEN 'execution'
    ELSE 'customer_success' END
$$;

CREATE OR REPLACE FUNCTION public.audit_permission_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'role_permissions' THEN
    IF TG_OP = 'INSERT' OR OLD.level IS DISTINCT FROM NEW.level THEN
      INSERT INTO public.permission_audit(setting, old_value, new_value, changed_by)
      VALUES (NEW.role||' · '||NEW.module||' · '||NEW.action, CASE WHEN TG_OP='INSERT' THEN 'own' ELSE OLD.level END, NEW.level, public.actor_name());
    END IF;
  ELSE
    IF TG_OP = 'INSERT' OR OLD.allowed IS DISTINCT FROM NEW.allowed THEN
      INSERT INTO public.permission_audit(setting, old_value, new_value, changed_by)
      VALUES ('reminder handoff '||NEW.from_domain||' → '||NEW.to_domain, CASE WHEN TG_OP='INSERT' THEN 'allowed' WHEN OLD.allowed THEN 'allowed' ELSE 'blocked' END, CASE WHEN NEW.allowed THEN 'allowed' ELSE 'blocked' END, public.actor_name());
    END IF;
  END IF;
  NEW.updated_at := now(); NEW.updated_by := public.actor_name();
  RETURN NEW;
END $$;
CREATE TRIGGER role_permissions_audit BEFORE INSERT OR UPDATE ON public.role_permissions FOR EACH ROW EXECUTE FUNCTION public.audit_permission_change();
CREATE TRIGGER reminder_rules_audit BEFORE INSERT OR UPDATE ON public.reminder_rules FOR EACH ROW EXECUTE FUNCTION public.audit_permission_change();

-- Data-level enforcement: 'none' denies (restrictive), 'all' widens (permissive), 'own' keeps existing rules.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('tasks','tasks'),('reminders','reminders'),('messages','discussions'),('tickets','discussions'),
    ('visits','visits'),('execution_jobs','execution'),('execution_site_visits','execution'),
    ('opportunities','opportunities'),('reports','reports'),('recurring_reports','reports'),
    ('plants','plants'),('customer_contacts','contacts')) AS t(tbl, module)
  LOOP
    EXECUTE format('CREATE POLICY "perm deny view" ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.perm_level(auth.uid(), %L, ''view'') <> ''none'')', r.tbl, r.module);
    EXECUTE format('CREATE POLICY "perm deny create" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.perm_level(auth.uid(), %L, ''create'') <> ''none'')', r.tbl, r.module);
    EXECUTE format('CREATE POLICY "perm deny edit" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.perm_level(auth.uid(), %L, ''edit'') <> ''none'')', r.tbl, r.module);
    EXECUTE format('CREATE POLICY "perm deny delete" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.perm_level(auth.uid(), %L, ''edit'') <> ''none'')', r.tbl, r.module);
    EXECUTE format('CREATE POLICY "perm all view" ON public.%I FOR SELECT TO authenticated USING (public.is_approved(auth.uid()) AND public.perm_level(auth.uid(), %L, ''view'') = ''all'')', r.tbl, r.module);
    EXECUTE format('CREATE POLICY "perm all edit" ON public.%I FOR UPDATE TO authenticated USING (public.is_approved(auth.uid()) AND public.perm_level(auth.uid(), %L, ''edit'') = ''all'')', r.tbl, r.module);
  END LOOP;
END $$;

-- Reminder handoffs and resolve permission
CREATE OR REPLACE FUNCTION public.enforce_reminder_rules() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me text := public.user_domain(auth.uid()); target text;
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(),'manager') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    target := public.person_domain(NEW.user_id);
    IF target IN ('customer_success','execution') AND EXISTS (
      SELECT 1 FROM public.reminder_rules WHERE from_domain = me AND to_domain = target AND NOT allowed) THEN
      RAISE EXCEPTION 'Reminders from % to % are turned off in Settings', me, target;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'done' AND OLD.status <> 'done'
     AND public.perm_level(auth.uid(),'reminders','resolve') = 'none' THEN
    RAISE EXCEPTION 'You are not allowed to resolve reminders';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reminders_rules BEFORE INSERT OR UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.enforce_reminder_rules();

-- Defaults = current behaviour
INSERT INTO public.role_permissions(role, module, action, level)
SELECT d, m, a, CASE
  WHEN m IN ('engineers','settings') THEN 'none'
  WHEN d = 'customer_success' AND m = 'execution' THEN 'none'
  WHEN d = 'execution' AND m IN ('visits','reports') THEN 'none'
  ELSE 'own' END
FROM unnest(ARRAY['customer_success','execution']) d,
     unnest(ARRAY['tasks','reminders','discussions','visits','execution','opportunities','reports','plants','contacts','engineers','settings']) m,
     unnest(ARRAY['view','create','edit','assign','approve','close','export','resolve']) a
WHERE a <> 'resolve' OR m = 'reminders';
INSERT INTO public.role_permissions(role, module, action, level)
SELECT d, 'dash:'||s, 'view', 'own'
FROM unnest(ARRAY['customer_success','execution']) d,
     unnest(ARRAY['kpis','alerts','tasks','reports','visits','execution','opportunities','workload']) s;
INSERT INTO public.reminder_rules(from_domain, to_domain, allowed) VALUES
 ('customer_success','customer_success',true),('customer_success','execution',true),
 ('execution','execution',true),('execution','customer_success',true);
DELETE FROM public.permission_audit WHERE true;