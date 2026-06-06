
-- gameweeks
CREATE TABLE public.gameweeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL,
  week_number integer NOT NULL,
  week_label text NOT NULL,
  first_kickoff_at timestamptz NOT NULL,
  last_match_ends_at timestamptz NOT NULL,
  deadline_at timestamptz NOT NULL,
  results_locked boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, week_number)
);
GRANT ALL ON public.gameweeks TO service_role;
ALTER TABLE public.gameweeks ENABLE ROW LEVEL SECURITY;

-- Auto-set deadline_at = first_kickoff_at - 2 hours
CREATE OR REPLACE FUNCTION public.set_gameweek_deadline()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.deadline_at := NEW.first_kickoff_at - INTERVAL '2 hours';
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gameweeks_set_deadline
BEFORE INSERT OR UPDATE OF first_kickoff_at ON public.gameweeks
FOR EACH ROW EXECUTE FUNCTION public.set_gameweek_deadline();

-- results (per match)
CREATE TABLE public.results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gameweek_id uuid NOT NULL REFERENCES public.gameweeks(id) ON DELETE CASCADE,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_score integer,
  away_score integer,
  winner text CHECK (winner IN ('home','away','draw')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.results TO service_role;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- teams (badge URLs)
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL,
  name text NOT NULL,
  badge_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, name)
);
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- reminders_sent idempotency
CREATE TABLE public.reminders_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  gameweek_id uuid,
  kind text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, gameweek_id, kind)
);
GRANT ALL ON public.reminders_sent TO service_role;
ALTER TABLE public.reminders_sent ENABLE ROW LEVEL SECURITY;
