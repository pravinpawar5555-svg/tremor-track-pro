ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS plant_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS due_time text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS waiting_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS carry_forward_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS activity jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.tasks SET due_date = original_date WHERE due_date IS NULL;
UPDATE public.tasks SET carry_forward_count = GREATEST(0, task_date - original_date) WHERE carry_forward_count = 0;

CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  plant_id text NOT NULL DEFAULT '',
  task_id text NOT NULL DEFAULT '',
  remind_date date NOT NULL,
  remind_time text NOT NULL DEFAULT '',
  notify text NOT NULL DEFAULT 'on_time',
  status text NOT NULL DEFAULT 'active',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved reminders" ON public.reminders FOR ALL TO authenticated
  USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));

CREATE TABLE public.day_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engineer_id text NOT NULL,
  work_date date NOT NULL,
  assigned integer NOT NULL DEFAULT 0,
  completed integer NOT NULL DEFAULT 0,
  remaining integer NOT NULL DEFAULT 0,
  waiting integer NOT NULL DEFAULT 0,
  carried integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  closed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (engineer_id, work_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_closures TO authenticated;
GRANT ALL ON public.day_closures TO service_role;
ALTER TABLE public.day_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved closures" ON public.day_closures FOR ALL TO authenticated
  USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));