
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.tenant_role_for(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_tenant_access(uuid, uuid, public.tenant_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tenant_role_for(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_tenant_access(uuid, uuid, public.tenant_role) TO authenticated, service_role;
