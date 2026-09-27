ALTER TABLE public.plants ADD COLUMN category text NOT NULL DEFAULT 'order';
COMMENT ON COLUMN public.plants.category IS 'Customer category: order (paying) or demo (trial).';