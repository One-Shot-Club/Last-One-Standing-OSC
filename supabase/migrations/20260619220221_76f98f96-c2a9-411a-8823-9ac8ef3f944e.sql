ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS stripe_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS revolut_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_enabled boolean NOT NULL DEFAULT true;