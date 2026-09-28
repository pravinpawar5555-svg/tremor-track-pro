ALTER TABLE public.visits
ADD COLUMN IF NOT EXISTS sign_off_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.visits.sign_off_required IS 'Controls whether the generated MOM includes the acknowledgment and two-party signature section.';