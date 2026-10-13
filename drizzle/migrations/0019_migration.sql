CREATE OR REPLACE FUNCTION public.my_person_ids(_uid uuid) RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid::text
  UNION SELECT engineer_id FROM public.profiles WHERE id = _uid AND engineer_id <> ''
  UNION SELECT id::text FROM public.execution_engineers WHERE linked_user_id = _uid::text
$$;

CREATE POLICY "reminders involving me" ON public.reminders FOR ALL TO authenticated
USING (public.is_approved(auth.uid()) AND (user_id IN (SELECT public.my_person_ids(auth.uid())) OR created_by IN (SELECT public.my_person_ids(auth.uid()))))
WITH CHECK (public.is_approved(auth.uid()) AND (user_id IN (SELECT public.my_person_ids(auth.uid())) OR created_by IN (SELECT public.my_person_ids(auth.uid()))));