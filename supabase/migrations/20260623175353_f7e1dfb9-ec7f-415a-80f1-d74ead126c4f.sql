DELETE FROM public.results r
USING public.gameweeks g
WHERE r.gameweek_id = g.id
  AND g.week_number = 1
  AND r.kickoff_at IS NULL;