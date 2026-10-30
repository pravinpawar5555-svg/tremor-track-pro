CREATE OR REPLACE FUNCTION public.import_technical(p_plant text, p_rows jsonb, p_by text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  r jsonb; v_area uuid; v_machine uuid; v_point uuid; v_gw uuid; v_sensor uuid;
  n_area int := 0; n_machine int := 0; n_point int := 0; n_gw int := 0; n_sensor int := 0; n_skip int := 0;
  v_area_name text; v_machine_name text; v_point_name text; v_gw_serial text; v_serial text; v_inst date;
BEGIN
  IF NOT public.is_approved(auth.uid()) OR NOT EXISTS (SELECT 1 FROM public.plants WHERE id = p_plant) THEN
    RAISE EXCEPTION 'You do not have access to this plant';
  END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_area_name := btrim(coalesce(r->>'area',''));
    v_machine_name := btrim(coalesce(r->>'machine',''));
    v_point_name := btrim(coalesce(r->>'point',''));
    v_gw_serial := btrim(coalesce(r->>'gateway',''));
    v_serial := btrim(coalesce(r->>'serial',''));
    v_inst := nullif(r->>'installDate','')::date;
    IF v_area_name = '' OR v_machine_name = '' THEN RAISE EXCEPTION 'Every row needs an area and a machine name'; END IF;

    SELECT id INTO v_area FROM plant_areas WHERE plant_id = p_plant AND lower(name) = lower(v_area_name) LIMIT 1;
    IF v_area IS NULL THEN
      INSERT INTO plant_areas (plant_id, name, created_by) VALUES (p_plant, v_area_name, p_by) RETURNING id INTO v_area;
      INSERT INTO technical_events (plant_id, entity, entity_id, kind, remark, by_user) VALUES (p_plant, 'area', v_area, 'created', 'Added area ' || v_area_name || ' (import)', p_by);
      n_area := n_area + 1;
    END IF;

    SELECT id INTO v_machine FROM plant_machines WHERE area_id = v_area AND lower(name) = lower(v_machine_name) LIMIT 1;
    IF v_machine IS NULL THEN
      INSERT INTO plant_machines (plant_id, area_id, name, tag, machine_type, created_by)
      VALUES (p_plant, v_area, v_machine_name, btrim(coalesce(r->>'tag','')), btrim(coalesce(r->>'machineType','')), p_by) RETURNING id INTO v_machine;
      INSERT INTO technical_events (plant_id, entity, entity_id, kind, remark, by_user) VALUES (p_plant, 'machine', v_machine, 'created', 'Added machine ' || v_machine_name || ' (import)', p_by);
      n_machine := n_machine + 1;
    END IF;

    v_point := NULL;
    IF v_point_name <> '' THEN
      SELECT id INTO v_point FROM measurement_points WHERE machine_id = v_machine AND lower(name) = lower(v_point_name) LIMIT 1;
      IF v_point IS NULL THEN
        INSERT INTO measurement_points (plant_id, machine_id, name, component, position, bearing_no, created_by)
        VALUES (p_plant, v_machine, v_point_name, btrim(coalesce(r->>'component','')), btrim(coalesce(r->>'position','')), btrim(coalesce(r->>'bearing','')), p_by) RETURNING id INTO v_point;
        INSERT INTO technical_events (plant_id, entity, entity_id, kind, remark, by_user) VALUES (p_plant, 'point', v_point, 'created', 'Added point ' || v_point_name || ' (import)', p_by);
        n_point := n_point + 1;
      END IF;
    END IF;

    v_gw := NULL;
    IF v_gw_serial <> '' THEN
      SELECT id INTO v_gw FROM plant_gateways WHERE plant_id = p_plant AND lower(serial_no) = lower(v_gw_serial) AND status NOT IN ('replaced','inactive') LIMIT 1;
      IF v_gw IS NULL THEN
        INSERT INTO plant_gateways (plant_id, area_id, name, serial_no, created_by) VALUES (p_plant, v_area, v_gw_serial, v_gw_serial, p_by) RETURNING id INTO v_gw;
        INSERT INTO technical_events (plant_id, entity, entity_id, kind, remark, by_user) VALUES (p_plant, 'gateway', v_gw, 'created', 'Added gateway ' || v_gw_serial || ' (import)', p_by);
        n_gw := n_gw + 1;
      END IF;
    END IF;

    IF v_serial <> '' THEN
      IF v_point IS NULL THEN RAISE EXCEPTION 'Sensor % needs a measurement point', v_serial; END IF;
      IF EXISTS (SELECT 1 FROM plant_sensors WHERE plant_id = p_plant AND lower(serial_no) = lower(v_serial) AND status NOT IN ('replaced','removed','returned','inactive')) THEN
        n_skip := n_skip + 1;
      ELSE
        INSERT INTO plant_sensors (plant_id, point_id, gateway_id, serial_no, sensor_type, model, install_date, created_by)
        VALUES (p_plant, v_point, v_gw, v_serial, coalesce(nullif(btrim(r->>'sensorType'),''),'Other'), btrim(coalesce(r->>'model','')), v_inst, p_by) RETURNING id INTO v_sensor;
        INSERT INTO technical_events (plant_id, entity, entity_id, kind, remark, event_date, by_user) VALUES (p_plant, 'sensor', v_sensor, 'installed', 'Installed (import) at ' || v_machine_name || ' / ' || v_point_name, coalesce(v_inst, current_date), p_by);
        n_sensor := n_sensor + 1;
      END IF;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('areas', n_area, 'machines', n_machine, 'points', n_point, 'gateways', n_gw, 'sensors', n_sensor, 'skipped', n_skip);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'A sensor or gateway serial number in the file is already active at another plant';
END $$;
REVOKE ALL ON FUNCTION public.import_technical(text, jsonb, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.import_technical(text, jsonb, text) TO authenticated;