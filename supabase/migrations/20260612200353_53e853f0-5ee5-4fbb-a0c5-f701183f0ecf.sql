ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS panel_text_color text,
  ADD COLUMN IF NOT EXISTS meta_text_color text;