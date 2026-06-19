
-- 1) pl_teams lookup
CREATE TABLE public.pl_teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  badge_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pl_teams TO authenticated;
GRANT ALL ON public.pl_teams TO service_role;
ALTER TABLE public.pl_teams ENABLE ROW LEVEL SECURITY;
-- deny-all; service role bypasses

-- 2) results: add fpl_fixture_id + kickoff_at
ALTER TABLE public.results
  ADD COLUMN fpl_fixture_id INTEGER,
  ADD COLUMN kickoff_at TIMESTAMPTZ,
  ADD COLUMN finished BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX results_fpl_fixture_id_key ON public.results(fpl_fixture_id) WHERE fpl_fixture_id IS NOT NULL;

-- 3) gameweeks: add fpl_event + last_synced_at; relax NOT NULL on kickoff/last_end so we can import skeletons
ALTER TABLE public.gameweeks
  ADD COLUMN fpl_event INTEGER,
  ADD COLUMN last_synced_at TIMESTAMPTZ;
