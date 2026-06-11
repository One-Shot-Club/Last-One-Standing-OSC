
-- Add background_url for tenant settings
ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS background_url text;

-- Allow offline players (no email)
ALTER TABLE public.players ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS offline boolean NOT NULL DEFAULT false;

-- Allow entrants.email to be null too (existing trigger uses it)
ALTER TABLE public.entrants ALTER COLUMN email DROP NOT NULL;
