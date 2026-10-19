ALTER TABLE public.tickets ADD COLUMN machines text[] NOT NULL DEFAULT '{}';
UPDATE public.tickets SET machines = ARRAY[machine] WHERE machine <> '' AND machines = '{}';
COMMENT ON COLUMN public.tickets.machine IS 'Primary machine name; full list in machines.';