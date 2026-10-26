ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS areas text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS analysis jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS published_on date;
UPDATE public.tickets SET areas = ARRAY[area] WHERE coalesce(area,'') <> '' AND cardinality(areas) = 0;