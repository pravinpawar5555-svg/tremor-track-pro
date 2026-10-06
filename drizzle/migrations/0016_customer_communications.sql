CREATE TABLE public.customer_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id text NOT NULL,
  comm_date date NOT NULL,
  comm_time text NOT NULL DEFAULT '',
  contact_person text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  fm_representative text NOT NULL DEFAULT '',
  participants text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'phone',
  comm_type text NOT NULL DEFAULT 'Regular Follow-up',
  subject text NOT NULL DEFAULT '',
  discussion_summary text NOT NULL DEFAULT '',
  customer_comments text NOT NULL DEFAULT '',
  fm_response text NOT NULL DEFAULT '',
  customer_commitment text NOT NULL DEFAULT '',
  action_required boolean NOT NULL DEFAULT false,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  follow_up_status text NOT NULL DEFAULT 'none',
  next_follow_up_date date,
  follow_up_owner text NOT NULL DEFAULT '',
  internal_note text NOT NULL DEFAULT '',
  attachment_links text NOT NULL DEFAULT '',
  related_ticket_id text NOT NULL DEFAULT '',
  related_visit_id text NOT NULL DEFAULT '',
  related_report_id text NOT NULL DEFAULT '',
  linked_task_id text NOT NULL DEFAULT '',
  linked_reminder_id text NOT NULL DEFAULT '',
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_communications_plant_idx ON public.customer_communications(plant_id, comm_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_communications TO authenticated;
GRANT ALL ON public.customer_communications TO service_role;
ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs comms" ON public.customer_communications FOR ALL TO authenticated
USING (public.user_domain(auth.uid()) IN ('manager','customer_success'))
WITH CHECK (public.user_domain(auth.uid()) IN ('manager','customer_success'));