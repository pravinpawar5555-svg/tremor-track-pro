CREATE POLICY "plant chat shared" ON public.messages FOR ALL TO authenticated
USING (thread LIKE 'plant:%' AND public.is_approved(auth.uid()))
WITH CHECK (thread LIKE 'plant:%' AND public.is_approved(auth.uid()) AND author_id IN (SELECT public.my_person_ids(auth.uid())));