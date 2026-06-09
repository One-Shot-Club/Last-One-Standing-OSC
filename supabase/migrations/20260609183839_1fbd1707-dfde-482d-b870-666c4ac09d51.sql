
-- 1. entrant source enum
CREATE TYPE public.entrant_source AS ENUM ('online', 'offline', 'import');
CREATE TYPE public.payment_method AS ENUM ('online_stripe', 'online_revolut', 'online_other', 'cash', 'bank_transfer', 'manual_other');

-- 2. entrants (one person per tenant)
CREATE TABLE public.entrants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source public.entrant_source NOT NULL DEFAULT 'online',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entrants_tenant ON public.entrants(tenant_id);
CREATE INDEX idx_entrants_email  ON public.entrants(tenant_id, lower(email));
GRANT ALL ON public.entrants TO service_role;
ALTER TABLE public.entrants ENABLE ROW LEVEL SECURITY;

-- 3. competition_entries (entrant in a specific competition)
CREATE TABLE public.competition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  entrant_id UUID NOT NULL REFERENCES public.entrants(id) ON DELETE CASCADE,
  paid BOOLEAN NOT NULL DEFAULT false,
  alive BOOLEAN NOT NULL DEFAULT true,
  magic_token UUID NOT NULL DEFAULT gen_random_uuid(),
  player_id UUID UNIQUE,  -- bridge back to legacy players row during transition
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (competition_id, entrant_id)
);
CREATE UNIQUE INDEX idx_competition_entries_token ON public.competition_entries(magic_token);
CREATE INDEX idx_competition_entries_comp  ON public.competition_entries(competition_id);
CREATE INDEX idx_competition_entries_tenant ON public.competition_entries(tenant_id);
GRANT ALL ON public.competition_entries TO service_role;
ALTER TABLE public.competition_entries ENABLE ROW LEVEL SECURITY;

-- 4. payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.competition_entries(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  recorded_by UUID REFERENCES auth.users(id),
  note TEXT,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX idx_payments_entry  ON public.payments(entry_id);
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 5. messages (broadcasts / reminder log)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  competition_id UUID REFERENCES public.competitions(id) ON DELETE SET NULL,
  audience TEXT NOT NULL,           -- 'all' | 'alive' | 'eliminated' | 'entry:<id>'
  template TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  sent_by UUID REFERENCES auth.users(id),
  recipient_count INT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_tenant ON public.messages(tenant_id);
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. admin_actions (manual ops log)
CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  actor_label TEXT,                 -- e.g. 'PIN admin' when no auth user yet
  action TEXT NOT NULL,             -- e.g. 'pick.override', 'entry.reinstate'
  target_type TEXT,                 -- e.g. 'competition_entry', 'pick'
  target_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_actions_tenant ON public.admin_actions(tenant_id);
CREATE INDEX idx_admin_actions_target ON public.admin_actions(target_type, target_id);
GRANT ALL ON public.admin_actions TO service_role;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- 7. audit_logs (generic diff log)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  row_id UUID,
  op TEXT NOT NULL,                 -- 'insert' | 'update' | 'delete'
  diff JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_row    ON public.audit_logs(table_name, row_id);
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. updated_at triggers
CREATE TRIGGER trg_entrants_updated_at BEFORE UPDATE ON public.entrants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_competition_entries_updated_at BEFORE UPDATE ON public.competition_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 9. Backfill: for each player row, create entrant + competition_entry
DO $$
DECLARE r RECORD; v_entrant_id UUID;
BEGIN
  FOR r IN SELECT * FROM public.players LOOP
    -- Try to reuse an existing entrant in this tenant matched by email (case-insensitive); else create.
    SELECT id INTO v_entrant_id
      FROM public.entrants
      WHERE tenant_id = r.tenant_id
        AND r.email IS NOT NULL AND lower(email) = lower(r.email)
      LIMIT 1;

    IF v_entrant_id IS NULL THEN
      INSERT INTO public.entrants (tenant_id, full_name, email, phone, source, created_at)
      VALUES (r.tenant_id, r.full_name, r.email, r.phone, 'online', r.created_at)
      RETURNING id INTO v_entrant_id;
    END IF;

    INSERT INTO public.competition_entries
      (tenant_id, competition_id, entrant_id, paid, alive, magic_token, player_id, created_at)
    VALUES
      (r.tenant_id, r.competition_id, v_entrant_id,
       COALESCE(r.paid, false), COALESCE(r.alive, true), r.magic_token, r.id, r.created_at)
    ON CONFLICT (competition_id, entrant_id) DO NOTHING;
  END LOOP;
END $$;

-- 10. Sync trigger: keep competition_entries up-to-date when players changes
CREATE OR REPLACE FUNCTION public.sync_player_to_entry()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_entrant_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.competition_entries WHERE player_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Ensure an entrant exists (match by email within tenant, else create)
  SELECT id INTO v_entrant_id
    FROM public.entrants
    WHERE tenant_id = NEW.tenant_id
      AND NEW.email IS NOT NULL AND lower(email) = lower(NEW.email)
    LIMIT 1;

  IF v_entrant_id IS NULL THEN
    INSERT INTO public.entrants (tenant_id, full_name, email, phone, source)
    VALUES (NEW.tenant_id, NEW.full_name, NEW.email, NEW.phone, 'online')
    RETURNING id INTO v_entrant_id;
  END IF;

  INSERT INTO public.competition_entries
    (tenant_id, competition_id, entrant_id, paid, alive, magic_token, player_id, created_at)
  VALUES
    (NEW.tenant_id, NEW.competition_id, v_entrant_id,
     COALESCE(NEW.paid, false), COALESCE(NEW.alive, true), NEW.magic_token, NEW.id, NEW.created_at)
  ON CONFLICT (competition_id, entrant_id) DO UPDATE
    SET paid = EXCLUDED.paid,
        alive = EXCLUDED.alive,
        magic_token = EXCLUDED.magic_token,
        player_id = EXCLUDED.player_id,
        updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_players_sync_entry
  AFTER INSERT OR UPDATE OR DELETE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.sync_player_to_entry();
