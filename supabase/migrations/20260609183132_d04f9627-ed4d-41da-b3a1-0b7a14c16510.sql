
-- 1. Roles enum
CREATE TYPE public.tenant_role AS ENUM (
  'platform_super_admin',
  'tenant_owner',
  'tenant_admin',
  'tenant_operator',
  'tenant_viewer'
);

-- 2. tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 3. tenant_settings
CREATE TABLE public.tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  logo_url TEXT,
  primary_color TEXT,
  accent_color TEXT,
  intro_copy TEXT,
  sponsor_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_email TEXT,
  contact_phone TEXT,
  reminder_offsets JSONB NOT NULL DEFAULT '{"hours_before":[24,1]}'::jsonb,
  whatsapp_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.tenant_settings TO service_role;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- 4. tenant_members
CREATE TABLE public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.tenant_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX idx_tenant_members_user ON public.tenant_members(user_id, tenant_id);
GRANT ALL ON public.tenant_members TO service_role;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 5. platform_admins
CREATE TABLE public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 6. Helper functions (SECURITY DEFINER, no recursion)
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.tenant_role_for(_user_id UUID, _tenant_id UUID)
RETURNS public.tenant_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.tenant_members
   WHERE user_id = _user_id AND tenant_id = _tenant_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_tenant_access(_user_id UUID, _tenant_id UUID, _min_role public.tenant_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_admin(_user_id)
      OR EXISTS (
        SELECT 1 FROM public.tenant_members m
         WHERE m.user_id = _user_id
           AND m.tenant_id = _tenant_id
           -- enum order: super_admin < owner < admin < operator < viewer
           -- viewer is lowest privilege; require role <= min_role by enum position
           AND (
             CASE m.role
               WHEN 'platform_super_admin' THEN 5
               WHEN 'tenant_owner' THEN 4
               WHEN 'tenant_admin' THEN 3
               WHEN 'tenant_operator' THEN 2
               WHEN 'tenant_viewer' THEN 1
             END
           ) >= (
             CASE _min_role
               WHEN 'platform_super_admin' THEN 5
               WHEN 'tenant_owner' THEN 4
               WHEN 'tenant_admin' THEN 3
               WHEN 'tenant_operator' THEN 2
               WHEN 'tenant_viewer' THEN 1
             END
           )
      );
$$;

-- 7. Add nullable tenant_id to existing tables
ALTER TABLE public.competitions   ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.players        ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.picks          ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.gameweeks      ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.teams          ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.reminders_sent ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);

-- 8. Seed Tenant Zero from existing competition data
DO $$
DECLARE
  v_tenant_id UUID;
  v_comp RECORD;
BEGIN
  SELECT * INTO v_comp FROM public.competitions
    ORDER BY created_at ASC LIMIT 1;

  IF v_comp.id IS NULL THEN
    RAISE NOTICE 'No competition found; skipping Tenant Zero seed';
    RETURN;
  END IF;

  INSERT INTO public.tenants (slug, name, status)
  VALUES ('killeshin', COALESCE(v_comp.club_name, 'Killeshin GAA'), 'active')
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_settings (
    tenant_id, logo_url, primary_color, accent_color, intro_copy, whatsapp_link
  ) VALUES (
    v_tenant_id,
    v_comp.club_logo_url,
    NULL, NULL,
    'Last Man Standing — Killeshin GAA Fundraiser',
    v_comp.whatsapp_link
  );

  -- Backfill tenant_id everywhere
  UPDATE public.competitions   SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.gameweeks      SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.teams          SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.players        SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.picks          SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
  UPDATE public.reminders_sent SET tenant_id = v_tenant_id WHERE tenant_id IS NULL;
END $$;

-- 9. Indexes for tenant filtering
CREATE INDEX idx_competitions_tenant   ON public.competitions(tenant_id);
CREATE INDEX idx_players_tenant        ON public.players(tenant_id);
CREATE INDEX idx_picks_tenant          ON public.picks(tenant_id);
CREATE INDEX idx_gameweeks_tenant      ON public.gameweeks(tenant_id);
CREATE INDEX idx_teams_tenant          ON public.teams(tenant_id);
CREATE INDEX idx_reminders_sent_tenant ON public.reminders_sent(tenant_id);

-- 10. updated_at trigger for new tables
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_tenant_settings_updated_at BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
