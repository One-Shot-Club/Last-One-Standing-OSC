
-- 1. Trigger that copies tenant_id from competitions via competition_id
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_competition()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.competition_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.competitions WHERE id = NEW.competition_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Trigger that copies tenant_id from gameweeks via gameweek_id (for reminders_sent)
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_gameweek()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.gameweek_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.gameweeks WHERE id = NEW.gameweek_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Attach triggers (BEFORE INSERT OR UPDATE)
CREATE TRIGGER trg_gameweeks_set_tenant      BEFORE INSERT OR UPDATE ON public.gameweeks
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_competition();
CREATE TRIGGER trg_teams_set_tenant          BEFORE INSERT OR UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_competition();
CREATE TRIGGER trg_players_set_tenant        BEFORE INSERT OR UPDATE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_competition();
CREATE TRIGGER trg_picks_set_tenant          BEFORE INSERT OR UPDATE ON public.picks
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_competition();
CREATE TRIGGER trg_reminders_sent_set_tenant BEFORE INSERT OR UPDATE ON public.reminders_sent
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_gameweek();

-- 4. Safety: any remaining NULLs would block NOT NULL. Re-backfill in case of drift.
UPDATE public.competitions   c SET tenant_id = (SELECT id FROM public.tenants WHERE slug='killeshin')
  WHERE c.tenant_id IS NULL;
UPDATE public.gameweeks      g SET tenant_id = c.tenant_id FROM public.competitions c
  WHERE g.competition_id = c.id AND g.tenant_id IS NULL;
UPDATE public.teams          t SET tenant_id = c.tenant_id FROM public.competitions c
  WHERE t.competition_id = c.id AND t.tenant_id IS NULL;
UPDATE public.players        p SET tenant_id = c.tenant_id FROM public.competitions c
  WHERE p.competition_id = c.id AND p.tenant_id IS NULL;
UPDATE public.picks          pk SET tenant_id = c.tenant_id FROM public.competitions c
  WHERE pk.competition_id = c.id AND pk.tenant_id IS NULL;
UPDATE public.reminders_sent r SET tenant_id = g.tenant_id FROM public.gameweeks g
  WHERE r.gameweek_id = g.id AND r.tenant_id IS NULL;

-- 5. Assert clean state before flipping NOT NULL
DO $$
DECLARE n_bad INT;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM public.competitions   WHERE tenant_id IS NULL) +
    (SELECT COUNT(*) FROM public.gameweeks      WHERE tenant_id IS NULL) +
    (SELECT COUNT(*) FROM public.teams          WHERE tenant_id IS NULL) +
    (SELECT COUNT(*) FROM public.players        WHERE tenant_id IS NULL) +
    (SELECT COUNT(*) FROM public.picks          WHERE tenant_id IS NULL) +
    (SELECT COUNT(*) FROM public.reminders_sent WHERE tenant_id IS NULL)
  INTO n_bad;
  IF n_bad > 0 THEN
    RAISE EXCEPTION 'Refusing to flip NOT NULL: % rows still have NULL tenant_id', n_bad;
  END IF;
END $$;

-- 6. Flip NOT NULL
ALTER TABLE public.competitions   ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.gameweeks      ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.teams          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.players        ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.picks          ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.reminders_sent ALTER COLUMN tenant_id SET NOT NULL;
