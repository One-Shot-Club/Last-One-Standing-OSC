
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS club_name text,
  ADD COLUMN IF NOT EXISTS club_logo_url text,
  ADD COLUMN IF NOT EXISTS revolut_link text,
  ADD COLUMN IF NOT EXISTS payment_link text,
  ADD COLUMN IF NOT EXISTS whatsapp_link text;

UPDATE public.competitions
SET name = 'Killeshin GAA World Cup Fundraiser',
    club_name = 'Killeshin GAA',
    club_logo_url = '/__l5e/assets-v1/killeshin-crest',
    entry_fee = 10,
    prize_pool = 3000
WHERE name = 'Demo Comp 2' OR club_name IS NULL;
