CREATE POLICY "exec plants full" ON public.plants FOR ALL TO authenticated
USING (public.user_domain(auth.uid()) = 'execution')
WITH CHECK (public.user_domain(auth.uid()) = 'execution');