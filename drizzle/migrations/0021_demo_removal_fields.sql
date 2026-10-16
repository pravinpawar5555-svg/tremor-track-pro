ALTER TABLE public.execution_jobs
  ADD COLUMN removal_planned_date date,
  ADD COLUMN removal_completed_date date,
  ADD COLUMN sensors_removed integer NOT NULL DEFAULT 0,
  ADD COLUMN removal_notes text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.execution_jobs.removal_planned_date IS 'Planned demo sensor removal/retrieval site day (demo jobs)';
COMMENT ON COLUMN public.execution_jobs.removal_completed_date IS 'Actual demo sensor removal date; set when removal visit is done';
COMMENT ON COLUMN public.execution_jobs.sensors_removed IS 'Number of demo sensors retrieved back from site';
COMMENT ON COLUMN public.execution_jobs.removal_notes IS 'Hardware condition / retrieval remarks from demo removal';