ALTER TABLE public.execution_jobs ADD COLUMN IF NOT EXISTS engineer_ids text[] NOT NULL DEFAULT '{}';
UPDATE public.execution_jobs SET engineer_ids = array_remove(ARRAY[NULLIF(assigned_engineer_id,''), NULLIF(secondary_engineer_id,'')], NULL) WHERE engineer_ids = '{}';
DROP POLICY IF EXISTS "exec jobs read" ON public.execution_jobs;
CREATE POLICY "exec jobs read" ON public.execution_jobs FOR SELECT TO authenticated
USING (public.user_domain(auth.uid()) = 'manager' OR (public.user_domain(auth.uid()) = 'execution' AND (assigned_engineer_id IN (SELECT public.my_exec_ids(auth.uid())) OR secondary_engineer_id IN (SELECT public.my_exec_ids(auth.uid())) OR engineer_ids && ARRAY(SELECT public.my_exec_ids(auth.uid())) OR assigned_engineer_id = '')));
DROP POLICY IF EXISTS "exec jobs update" ON public.execution_jobs;
CREATE POLICY "exec jobs update" ON public.execution_jobs FOR UPDATE TO authenticated
USING (public.user_domain(auth.uid()) = 'manager' OR (public.user_domain(auth.uid()) = 'execution' AND (assigned_engineer_id IN (SELECT public.my_exec_ids(auth.uid())) OR secondary_engineer_id IN (SELECT public.my_exec_ids(auth.uid())) OR engineer_ids && ARRAY(SELECT public.my_exec_ids(auth.uid())) OR assigned_engineer_id = '')))
WITH CHECK (public.user_domain(auth.uid()) = ANY (ARRAY['manager','execution']));