CREATE TYPE public.app_role AS ENUM ('manager', 'engineer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  engineer_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved')
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_approved(auth.uid()));
CREATE POLICY "manager updates profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "manager deletes profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'manager'));

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_approved(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''),
          COALESCE(NEW.raw_user_meta_data->>'phone', ''), 'pending');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'engineer');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Manager approves: creates the engineer row and links it
CREATE OR REPLACE FUNCTION public.review_user(_user_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles;
BEGIN
  IF NOT public.has_role(auth.uid(), 'manager') THEN RAISE EXCEPTION 'Only a manager can do this'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'User not found'; END IF;
  IF _approve THEN
    IF p.engineer_id = '' THEN
      INSERT INTO public.engineers (id, name, initials, role)
      VALUES (_user_id::text, COALESCE(NULLIF(p.full_name, ''), p.email), '', 'analyst')
      ON CONFLICT (id) DO NOTHING;
      UPDATE public.profiles SET status = 'approved', engineer_id = _user_id::text WHERE id = _user_id;
    ELSE
      UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
    END IF;
  ELSE
    UPDATE public.profiles SET status = 'rejected' WHERE id = _user_id;
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.review_user(uuid, boolean) TO authenticated;

CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id text NOT NULL,
  title text NOT NULL,
  task_date date NOT NULL DEFAULT current_date,
  original_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  assigned_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved users tasks" ON public.tasks FOR ALL TO authenticated
  USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

CREATE TABLE public.recurring_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id text NOT NULL,
  type text NOT NULL DEFAULT 'weekly',
  next_due date NOT NULL,
  engineer_id text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_reports TO authenticated;
GRANT ALL ON public.recurring_reports TO service_role;
ALTER TABLE public.recurring_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read recurring" ON public.recurring_reports FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()));
CREATE POLICY "manager manages recurring" ON public.recurring_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'manager'));

-- Lock existing tables to approved signed-in users
DROP POLICY IF EXISTS "engineers open" ON public.engineers;
DROP POLICY IF EXISTS "plants open" ON public.plants;
DROP POLICY IF EXISTS "reports open" ON public.reports;
DROP POLICY IF EXISTS "tickets open" ON public.tickets;
DROP POLICY IF EXISTS "messages open" ON public.messages;
DROP POLICY IF EXISTS "daily_updates open" ON public.daily_updates;
CREATE POLICY "approved all" ON public.engineers FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "manager writes engineers" ON public.engineers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'manager')) WITH CHECK (public.has_role(auth.uid(), 'manager'));
CREATE POLICY "approved all" ON public.plants FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "approved all" ON public.reports FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "approved all" ON public.tickets FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "approved all" ON public.messages FOR ALL TO authenticated USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "approved all" ON public.daily_updates FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
COMMENT ON TABLE public.daily_updates IS 'DEPRECATED: replaced by tasks';
