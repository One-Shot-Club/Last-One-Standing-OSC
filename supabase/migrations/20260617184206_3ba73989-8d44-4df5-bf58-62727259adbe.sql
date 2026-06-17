
ALTER TABLE public.competition_entries
  ADD COLUMN IF NOT EXISTS display_name text;

UPDATE public.competition_entries ce
   SET display_name = COALESCE(
     (SELECT p.full_name FROM public.players p WHERE p.id = ce.player_id),
     (SELECT e.full_name FROM public.entrants e WHERE e.id = ce.entrant_id),
     'Entry'
   )
 WHERE ce.display_name IS NULL;

ALTER TABLE public.competition_entries
  ALTER COLUMN display_name SET NOT NULL,
  ALTER COLUMN display_name SET DEFAULT 'Entry';

ALTER TABLE public.competition_entries
  DROP CONSTRAINT IF EXISTS competition_entries_competition_id_entrant_id_key;

DROP TRIGGER IF EXISTS trg_players_sync_entry ON public.players;

ALTER TABLE public.picks
  ADD COLUMN IF NOT EXISTS entry_id uuid
    REFERENCES public.competition_entries(id) ON DELETE CASCADE;

UPDATE public.picks pk
   SET entry_id = ce.id
  FROM public.competition_entries ce
 WHERE ce.player_id = pk.player_id
   AND pk.entry_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_picks_entry ON public.picks(entry_id);
CREATE UNIQUE INDEX IF NOT EXISTS picks_entry_week_key
  ON public.picks(entry_id, week)
  WHERE entry_id IS NOT NULL;

ALTER TABLE public.reminders_sent
  ADD COLUMN IF NOT EXISTS entry_id uuid
    REFERENCES public.competition_entries(id) ON DELETE CASCADE;

UPDATE public.reminders_sent r
   SET entry_id = ce.id
  FROM public.competition_entries ce
 WHERE ce.player_id = r.player_id
   AND r.entry_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_reminders_entry ON public.reminders_sent(entry_id);
CREATE UNIQUE INDEX IF NOT EXISTS reminders_sent_entry_gw_kind_key
  ON public.reminders_sent(entry_id, gameweek_id, kind)
  WHERE entry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_competition_entries_account
  ON public.competition_entries(entrant_id, competition_id);
