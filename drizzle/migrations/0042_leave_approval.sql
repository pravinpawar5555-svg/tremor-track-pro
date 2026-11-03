ALTER TABLE public.engineer_leaves ADD COLUMN status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.engineer_leaves ADD COLUMN reviewed_by text NOT NULL DEFAULT '';
ALTER TABLE public.engineer_leaves ALTER COLUMN status SET DEFAULT 'pending';
DROP POLICY IF EXISTS "leaves own" ON public.engineer_leaves;
CREATE POLICY "leaves team read" ON public.engineer_leaves FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "leaves own request" ON public.engineer_leaves FOR INSERT TO authenticated
  WITH CHECK (public.is_approved(auth.uid()) AND status = 'pending' AND person_id IN (SELECT public.my_person_ids(auth.uid())));
CREATE POLICY "leaves own cancel" ON public.engineer_leaves FOR DELETE TO authenticated
  USING (public.is_approved(auth.uid()) AND status = 'pending' AND person_id IN (SELECT public.my_person_ids(auth.uid())));