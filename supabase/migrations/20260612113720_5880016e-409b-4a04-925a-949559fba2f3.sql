CREATE TABLE public.email_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  gameweek_id uuid REFERENCES public.gameweeks(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('progression','elimination','reminder')),
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX email_tasks_unique
  ON public.email_tasks(competition_id, gameweek_id, kind);

CREATE INDEX email_tasks_open_idx
  ON public.email_tasks(competition_id)
  WHERE sent_at IS NULL AND dismissed_at IS NULL;

GRANT ALL ON public.email_tasks TO service_role;

ALTER TABLE public.email_tasks ENABLE ROW LEVEL SECURITY;
-- No policies: matches the project's deny-all RLS posture.
-- All access goes through server functions using supabaseAdmin (service role).

CREATE TRIGGER trg_email_tasks_updated_at
  BEFORE UPDATE ON public.email_tasks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();