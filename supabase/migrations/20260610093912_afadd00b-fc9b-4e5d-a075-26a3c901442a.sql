
-- Per-tenant Club Admin credentials (single account per tenant, set by platform admin)
CREATE TABLE public.tenant_admin_credentials (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.tenant_admin_credentials TO service_role;
ALTER TABLE public.tenant_admin_credentials ENABLE ROW LEVEL SECURITY;
-- Deny-all: no anon/auth policies. Access only via server functions using service role.

CREATE TRIGGER touch_tenant_admin_credentials
  BEFORE UPDATE ON public.tenant_admin_credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Session tokens issued at club admin login
CREATE TABLE public.club_admin_sessions (
  token TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.club_admin_sessions TO service_role;
ALTER TABLE public.club_admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX club_admin_sessions_tenant_idx ON public.club_admin_sessions(tenant_id);
CREATE INDEX club_admin_sessions_expires_idx ON public.club_admin_sessions(expires_at);
