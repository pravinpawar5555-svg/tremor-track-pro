CREATE POLICY "tasks assigned by me" ON public.tasks FOR ALL TO authenticated
USING (public.is_approved(auth.uid()) AND assigned_by <> '' AND assigned_by IN (SELECT public.my_person_ids(auth.uid())))
WITH CHECK (public.is_approved(auth.uid()) AND assigned_by <> '' AND assigned_by IN (SELECT public.my_person_ids(auth.uid())));