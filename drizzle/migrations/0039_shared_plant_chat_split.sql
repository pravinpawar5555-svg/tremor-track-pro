DROP POLICY "plant chat shared" ON public.messages;
CREATE POLICY "plant chat read" ON public.messages FOR SELECT TO authenticated
USING (thread LIKE 'plant:%' AND public.is_approved(auth.uid()));
CREATE POLICY "plant chat mark read" ON public.messages FOR UPDATE TO authenticated
USING (thread LIKE 'plant:%' AND public.is_approved(auth.uid()))
WITH CHECK (thread LIKE 'plant:%' AND public.is_approved(auth.uid()));
CREATE POLICY "plant chat post" ON public.messages FOR INSERT TO authenticated
WITH CHECK (thread LIKE 'plant:%' AND public.is_approved(auth.uid()));