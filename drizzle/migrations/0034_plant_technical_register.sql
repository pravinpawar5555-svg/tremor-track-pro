CREATE TABLE public.plant_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id text NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  name text NOT NULL, code text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_by text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.plant_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id text NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.plant_areas(id),
  name text NOT NULL, tag text NOT NULL DEFAULT '', machine_type text NOT NULL DEFAULT '',
  manufacturer text NOT NULL DEFAULT '', model text NOT NULL DEFAULT '', rated_kw text NOT NULL DEFAULT '',
  rated_rpm text NOT NULL DEFAULT '', operating_rpm text NOT NULL DEFAULT '', criticality text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'running', notes text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.measurement_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id text NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  machine_id uuid NOT NULL REFERENCES public.plant_machines(id),
  name text NOT NULL, component text NOT NULL DEFAULT '', position text NOT NULL DEFAULT '',
  orientation text NOT NULL DEFAULT '', bearing_no text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_by text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.plant_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id text NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  area_id uuid REFERENCES public.plant_areas(id),
  name text NOT NULL, serial_no text NOT NULL, model text NOT NULL DEFAULT '', location text NOT NULL DEFAULT '',
  install_date date, ip_address text NOT NULL DEFAULT '', connectivity text NOT NULL DEFAULT '', network_type text NOT NULL DEFAULT '',
  firmware text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'online', notes text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.plant_sensors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id text NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  point_id uuid REFERENCES public.measurement_points(id),
  gateway_id uuid REFERENCES public.plant_gateways(id),
  serial_no text NOT NULL, sensor_type text NOT NULL, model text NOT NULL DEFAULT '',
  install_date date, commission_date date, firmware text NOT NULL DEFAULT '', battery text NOT NULL DEFAULT '',
  comm_status text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'installed', notes text NOT NULL DEFAULT '',
  replaced_by uuid, removed_date date,
  created_by text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX plant_sensors_active_serial ON public.plant_sensors (lower(serial_no)) WHERE status NOT IN ('replaced','removed','returned','inactive');
CREATE UNIQUE INDEX plant_gateways_serial ON public.plant_gateways (lower(serial_no)) WHERE status NOT IN ('replaced','inactive');
CREATE TABLE public.technical_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id text NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  entity text NOT NULL, entity_id uuid NOT NULL, kind text NOT NULL,
  issue_type text NOT NULL DEFAULT '', remark text NOT NULL DEFAULT '', detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_date date NOT NULL DEFAULT current_date,
  by_user text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX technical_events_entity ON public.technical_events (entity_id);

GRANT SELECT, INSERT, UPDATE ON public.plant_areas, public.plant_machines, public.measurement_points, public.plant_gateways, public.plant_sensors TO authenticated;
GRANT SELECT, INSERT ON public.technical_events TO authenticated;
GRANT ALL ON public.plant_areas, public.plant_machines, public.measurement_points, public.plant_gateways, public.plant_sensors, public.technical_events TO service_role;

ALTER TABLE public.plant_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_events ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['plant_areas','plant_machines','measurement_points','plant_gateways','plant_sensors'] LOOP
    EXECUTE format('CREATE POLICY "tech read" ON public.%I FOR SELECT TO authenticated USING (public.is_approved(auth.uid()) AND plant_id IN (SELECT id FROM public.plants))', t);
    EXECUTE format('CREATE POLICY "tech insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()) AND plant_id IN (SELECT id FROM public.plants))', t);
    EXECUTE format('CREATE POLICY "tech update" ON public.%I FOR UPDATE TO authenticated USING (public.is_approved(auth.uid()) AND plant_id IN (SELECT id FROM public.plants)) WITH CHECK (plant_id IN (SELECT id FROM public.plants))', t);
  END LOOP;
END $$;
CREATE POLICY "tech events read" ON public.technical_events FOR SELECT TO authenticated USING (public.is_approved(auth.uid()) AND plant_id IN (SELECT id FROM public.plants));
CREATE POLICY "tech events add" ON public.technical_events FOR INSERT TO authenticated WITH CHECK (public.is_approved(auth.uid()) AND plant_id IN (SELECT id FROM public.plants));