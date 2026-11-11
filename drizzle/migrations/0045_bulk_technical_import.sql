CREATE INDEX IF NOT EXISTS plant_areas_import_lookup ON public.plant_areas (plant_id, lower(name));
CREATE INDEX IF NOT EXISTS plant_machines_import_lookup ON public.plant_machines (plant_id, area_id, lower(name));
CREATE INDEX IF NOT EXISTS measurement_points_import_lookup ON public.measurement_points (plant_id, machine_id, lower(name));
CREATE INDEX IF NOT EXISTS plant_sensors_plant ON public.plant_sensors (plant_id);
CREATE INDEX IF NOT EXISTS plant_gateways_plant ON public.plant_gateways (plant_id);

CREATE OR REPLACE FUNCTION public.import_technical(p_plant text, p_rows jsonb, p_by text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
 v_rows jsonb; n_area int; n_machine int; n_point int; n_gw int; n_sensor int; n_requested int;
BEGIN
 IF NOT public.is_approved(auth.uid()) OR NOT EXISTS (SELECT 1 FROM public.plants WHERE id = p_plant) THEN
  RAISE EXCEPTION 'You do not have access to this plant';
 END IF;
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Import rows must be an array'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'area',btrim(coalesce(r->>'area','')), 'machine',btrim(coalesce(r->>'machine','')),
  'point',btrim(coalesce(r->>'point','')), 'serial',btrim(coalesce(r->>'serial','')),
  'gateway',btrim(coalesce(r->>'gateway','')), 'tag',btrim(coalesce(r->>'tag','')),
  'machineType',btrim(coalesce(r->>'machineType','')), 'component',btrim(coalesce(r->>'component','')),
  'position',btrim(coalesce(r->>'position','')), 'bearing',btrim(coalesce(r->>'bearing','')),
  'sensorType',coalesce(nullif(btrim(r->>'sensorType'),''),'Other'),
  'model',btrim(coalesce(r->>'model','')), 'installDate',nullif(r->>'installDate','')::date
 ) ORDER BY ord),'[]'::jsonb) INTO v_rows FROM jsonb_array_elements(p_rows) WITH ORDINALITY AS x(r,ord);
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_rows) r WHERE r->>'area'='' OR r->>'machine'='') THEN
  RAISE EXCEPTION 'Every row needs an area and a machine name';
 END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_rows) r WHERE r->>'serial'<>'' AND r->>'point'='') THEN
  RAISE EXCEPTION 'Every sensor needs a measurement point';
 END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_rows) r WHERE r->>'serial'<>'' GROUP BY lower(r->>'serial') HAVING count(*)>1) THEN
  RAISE EXCEPTION 'A sensor serial is repeated in the file';
 END IF;
 -- Keep one transaction and caller RLS, but evaluate each hierarchy level in one statement.
 WITH wanted AS (
  SELECT DISTINCT ON (lower(r->>'area')) r->>'area' AS name FROM jsonb_array_elements(v_rows) r
 ), added AS (
  INSERT INTO public.plant_areas(plant_id,name,created_by)
  SELECT p_plant,w.name,p_by FROM wanted w WHERE NOT EXISTS (
   SELECT 1 FROM public.plant_areas a WHERE a.plant_id=p_plant AND lower(a.name)=lower(w.name)
  ) RETURNING id,name
 ), logged AS (
  INSERT INTO public.technical_events(plant_id,entity,entity_id,kind,remark,by_user)
  SELECT p_plant,'area',id,'created','Added area '||name||' (import)',p_by FROM added RETURNING id
 ) SELECT count(*) INTO n_area FROM logged;

 WITH wanted AS (
  SELECT DISTINCT ON (lower(r->>'area'),lower(r->>'machine')) r
  FROM jsonb_array_elements(v_rows) WITH ORDINALITY x(r,ord) ORDER BY lower(r->>'area'),lower(r->>'machine'),ord
 ), added AS (
  INSERT INTO public.plant_machines(plant_id,area_id,name,tag,machine_type,created_by)
  SELECT p_plant,a.id,w.r->>'machine',w.r->>'tag',w.r->>'machineType',p_by
  FROM wanted w CROSS JOIN LATERAL (
   SELECT id FROM public.plant_areas WHERE plant_id=p_plant AND lower(name)=lower(w.r->>'area') LIMIT 1
  ) a WHERE NOT EXISTS (
   SELECT 1 FROM public.plant_machines m WHERE m.plant_id=p_plant AND m.area_id=a.id AND lower(m.name)=lower(w.r->>'machine')
  ) RETURNING id,name
 ), logged AS (
  INSERT INTO public.technical_events(plant_id,entity,entity_id,kind,remark,by_user)
  SELECT p_plant,'machine',id,'created','Added machine '||name||' (import)',p_by FROM added RETURNING id
 ) SELECT count(*) INTO n_machine FROM logged;

 WITH wanted AS (
  SELECT DISTINCT ON (lower(r->>'area'),lower(r->>'machine'),lower(r->>'point')) r
  FROM jsonb_array_elements(v_rows) WITH ORDINALITY x(r,ord) WHERE r->>'point'<>''
  ORDER BY lower(r->>'area'),lower(r->>'machine'),lower(r->>'point'),ord
 ), added AS (
  INSERT INTO public.measurement_points(plant_id,machine_id,name,component,position,bearing_no,created_by)
  SELECT p_plant,m.id,w.r->>'point',w.r->>'component',w.r->>'position',w.r->>'bearing',p_by
  FROM wanted w CROSS JOIN LATERAL (
   SELECT m.id FROM public.plant_machines m JOIN public.plant_areas a ON a.id=m.area_id
   WHERE m.plant_id=p_plant AND a.plant_id=p_plant AND lower(a.name)=lower(w.r->>'area') AND lower(m.name)=lower(w.r->>'machine') LIMIT 1
  ) m WHERE NOT EXISTS (
   SELECT 1 FROM public.measurement_points pt WHERE pt.plant_id=p_plant AND pt.machine_id=m.id AND lower(pt.name)=lower(w.r->>'point')
  ) RETURNING id,name
 ), logged AS (
  INSERT INTO public.technical_events(plant_id,entity,entity_id,kind,remark,by_user)
  SELECT p_plant,'point',id,'created','Added point '||name||' (import)',p_by FROM added RETURNING id
 ) SELECT count(*) INTO n_point FROM logged;

 WITH wanted AS (
  SELECT DISTINCT ON (lower(r->>'gateway')) r FROM jsonb_array_elements(v_rows) WITH ORDINALITY x(r,ord)
  WHERE r->>'gateway'<>'' ORDER BY lower(r->>'gateway'),ord
 ), added AS (
  INSERT INTO public.plant_gateways(plant_id,area_id,name,serial_no,created_by)
  SELECT p_plant,a.id,w.r->>'gateway',w.r->>'gateway',p_by
  FROM wanted w CROSS JOIN LATERAL (
   SELECT id FROM public.plant_areas WHERE plant_id=p_plant AND lower(name)=lower(w.r->>'area') LIMIT 1
  ) a WHERE NOT EXISTS (
   SELECT 1 FROM public.plant_gateways g WHERE g.plant_id=p_plant AND lower(g.serial_no)=lower(w.r->>'gateway') AND g.status NOT IN ('replaced','inactive')
  ) RETURNING id,serial_no
 ), logged AS (
  INSERT INTO public.technical_events(plant_id,entity,entity_id,kind,remark,by_user)
  SELECT p_plant,'gateway',id,'created','Added gateway '||serial_no||' (import)',p_by FROM added RETURNING id
 ) SELECT count(*) INTO n_gw FROM logged;

 SELECT count(*) INTO n_requested FROM jsonb_array_elements(v_rows) r WHERE r->>'serial'<>'';
 WITH wanted AS (
  SELECT r FROM jsonb_array_elements(v_rows) r WHERE r->>'serial'<>''
 ), added AS (
  INSERT INTO public.plant_sensors(plant_id,point_id,gateway_id,serial_no,sensor_type,model,install_date,created_by)
  SELECT p_plant,pt.id,g.id,w.r->>'serial',w.r->>'sensorType',w.r->>'model',(w.r->>'installDate')::date,p_by
  FROM wanted w CROSS JOIN LATERAL (
   SELECT pt.id FROM public.measurement_points pt JOIN public.plant_machines m ON m.id=pt.machine_id JOIN public.plant_areas a ON a.id=m.area_id
   WHERE pt.plant_id=p_plant AND m.plant_id=p_plant AND a.plant_id=p_plant AND lower(a.name)=lower(w.r->>'area')
    AND lower(m.name)=lower(w.r->>'machine') AND lower(pt.name)=lower(w.r->>'point') LIMIT 1
  ) pt LEFT JOIN LATERAL (
   SELECT id FROM public.plant_gateways WHERE plant_id=p_plant AND lower(serial_no)=lower(w.r->>'gateway') AND status NOT IN ('replaced','inactive') LIMIT 1
  ) g ON true WHERE NOT EXISTS (
   SELECT 1 FROM public.plant_sensors s WHERE s.plant_id=p_plant AND lower(s.serial_no)=lower(w.r->>'serial') AND s.status NOT IN ('replaced','removed','returned','inactive')
  ) RETURNING id,serial_no,install_date
 ), logged AS (
  INSERT INTO public.technical_events(plant_id,entity,entity_id,kind,remark,event_date,by_user)
  SELECT p_plant,'sensor',a.id,'installed','Installed (import) at '||(w.r->>'machine')||' / '||(w.r->>'point'),coalesce(a.install_date,current_date),p_by
  FROM added a JOIN wanted w ON lower(a.serial_no)=lower(w.r->>'serial') RETURNING id
 ) SELECT count(*) INTO n_sensor FROM logged;
 RETURN jsonb_build_object('areas',n_area,'machines',n_machine,'points',n_point,'gateways',n_gw,'sensors',n_sensor,'skipped',n_requested-n_sensor);
EXCEPTION WHEN unique_violation THEN
 RAISE EXCEPTION 'A sensor or gateway serial number in the file is already active at another plant';
END $$;
REVOKE ALL ON FUNCTION public.import_technical(text,jsonb,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.import_technical(text,jsonb,text) TO authenticated;
COMMENT ON FUNCTION public.import_technical(text,jsonb,text) IS 'Atomic, set-based technical import. SECURITY INVOKER preserves caller plant RLS; only adds missing records and appends history.';