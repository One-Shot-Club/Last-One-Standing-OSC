-- Public entry URLs: /{club-slug}/{comp-slug}
ALTER TABLE public.competitions ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.competitions
SET slug = 'last-man-standing'
WHERE slug IS NULL
  AND tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'killeshin');

UPDATE public.competitions
SET slug = trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
WHERE slug IS NULL OR slug = '';

UPDATE public.competitions
SET slug = 'comp-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS competitions_tenant_slug_uidx
  ON public.competitions(tenant_id, slug);

ALTER TABLE public.competitions ALTER COLUMN slug SET NOT NULL;
