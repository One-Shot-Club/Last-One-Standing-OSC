# Multi-Tenant Refactor: Last One Standing Platform

Goal: turn the current single-club MVP into a shared platform where multiple clubs (tenants) run their own branded Last One Standing competitions on one codebase, one Supabase project, one shared engine. The current Killeshin GAA instance becomes **Tenant Zero** and must keep working at every step.

This plan is sequenced so nothing breaks mid-flight. We migrate data and code in phases behind the existing URLs, then add tenant-aware routes and platform admin on top. Production is not a Priority -  It's not officially live so it you need to break things and take them down to be quicker or more efficient do so. 

---

## 1. Target architecture (3 layers)

```text
Platform layer        OneShotClub super-admin, shared EPL fixtures/results,
                      shared engine (picks, elimination, emails, queue),
                      shared UI primitives.

Tenant layer          One row in `tenants` per club. Owns branding, settings,
                      members/roles, payment links, sponsor copy, reminders.

Competition layer     One or many competitions per tenant. Owns rounds,
                      entrants, picks, payments, messages, audit.
```

Core principle: **fixtures and results are global** (shared EPL ingestion). Everything that represents a club's instance of a competition is **tenant-scoped** via `tenant_id`.

---

## 2. URL & routing model

- Tenant Zero keeps its current URLs working via a redirect/alias layer (`/pick`, `/pay`, `/admin/panel` → resolve to Tenant Zero).
- New canonical routes:
  - `/:tenantSlug` – club landing
  - `/:tenantSlug/:competitionSlug/join`
  - `/:tenantSlug/:competitionSlug/pick?token=...`
  - `/:tenantSlug/:competitionSlug/pay`
  - `/:tenantSlug/admin` – tenant admin (requires tenant membership)
  - `/platform/admin` – OneShotClub super-admin
- A `TenantProvider` resolves `tenantSlug` once per route and exposes `tenant`, `branding`, `settings` to children. Pages stop reading any hardcoded club name.

---

## 3. Data model

New / changed tables (all in `public`, all get GRANTs + RLS):


| Table                                 | Purpose                                                                           | Key columns                                                                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenants`                             | One per club                                                                      | `id`, `slug` (unique), `name`, `status`, `created_at`                                                                                                      |
| `tenant_settings`                     | Branding/config                                                                   | `tenant_id`, `logo_url`, `primary_color`, `accent_color`, `intro_copy`, `sponsor_assets jsonb`, `contact_email`, `contact_phone`, `reminder_offsets jsonb` |
| `tenant_members`                      | Admin access                                                                      | `tenant_id`, `user_id` (auth.users), `role` (enum)                                                                                                         |
| `platform_admins`                     | Super-admins                                                                      | `user_id`                                                                                                                                                  |
| `competitions` *(existing, modified)* | + `tenant_id`, `slug`, `config_overrides jsonb`, drop hardcoded club fields       | &nbsp;                                                                                                                                                     |
| `competition_rounds`                  | Replaces ad-hoc gameweeks numbering per comp                                      | `competition_id`, `round_number`, `gameweek_id`, `deadline_at`, `locked_at`                                                                                |
| `fixtures` *(global)*                 | Shared EPL fixtures                                                               | `gameweek_id`, `home`, `away`, `kickoff_at`                                                                                                                |
| `results` *(existing, global)*        | unchanged shape, no tenant_id                                                     | &nbsp;                                                                                                                                                     |
| `entrants`                            | Person record                                                                     | `tenant_id`, `full_name`, `email`, `phone`, `source` (`online`/`offline`/`import`)                                                                         |
| `competition_entries`                 | Entrant in a comp                                                                 | `tenant_id`, `competition_id`, `entrant_id`, `paid`, `alive`, `magic_token`                                                                                |
| `picks` *(existing, modified)*        | + `tenant_id`, `competition_id`, FK to `competition_entries` instead of `players` | &nbsp;                                                                                                                                                     |
| `payments`                            | Track manual + online                                                             | `tenant_id`, `entry_id`, `method`, `amount`, `recorded_by`, `note`                                                                                         |
| `messages`                            | Reminders/broadcasts                                                              | `tenant_id`, `competition_id`, `audience`, `template`, `sent_at`                                                                                           |
| `admin_actions`                       | Manual ops log                                                                    | `tenant_id`, `actor_id`, `action`, `target_type`, `target_id`, `payload jsonb`                                                                             |
| `audit_logs`                          | Generic change log                                                                | `tenant_id` (nullable for platform), `actor_id`, `table_name`, `row_id`, `diff jsonb`                                                                      |


Roles enum: `platform_super_admin`, `tenant_owner`, `tenant_admin`, `tenant_operator`, `tenant_viewer`.

`players` becomes a view over `entrants` + `competition_entries` during the transition, then is dropped.

---

## 4. RLS strategy

- Deny-all by default (matches current security posture).
- Helper SECURITY DEFINER functions (no recursion):
  - `is_platform_admin(uid)`
  - `tenant_role(uid, tenant_id)` → returns enum or null
  - `has_tenant_access(uid, tenant_id, min_role)`
- Tenant-scoped tables: policies use `has_tenant_access(auth.uid(), tenant_id, 'tenant_viewer')` for reads, higher roles for writes.
- Global tables (`fixtures`, `results`, `teams`) readable by any authenticated user; writable only by `platform_super_admin`.
- All server-side data access still goes through server functions using `supabaseAdmin` (current pattern). RLS becomes the second line of defense and the foundation for any future direct-from-client reads.
- Public flows (entrant join, pick via magic token) continue to use server functions that validate the token and resolve `tenant_id` from it — no anon RLS exceptions needed.

---

## 5. Auth & admin model

- Introduce real Supabase Auth (email + Google) for admins only. End users still use magic tokens — unchanged.
- Replace the hardcoded `Demo@Demo.ie` PIN with:
  - Tenant admins authenticate via Supabase Auth, then are matched to `tenant_members`.
  - Existing PIN flow kept temporarily as a "legacy admin" shim for Tenant Zero so the current panel keeps working during migration.
- `/_authenticated/...` layout for admin areas; `/platform/admin` gated by `is_platform_admin`.

---

## 6. Frontend refactor

- Introduce `src/lib/tenant/` with: `TenantProvider`, `useTenant()`, `useBranding()`, `resolveTenantBySlug` server fn.
- Replace `ClubHeader` hardcoding with `useBranding()` (logo, name, colours via CSS vars set on `<html>` from tenant settings).
- All existing server functions in `src/lib/oneshot.functions.ts`, `gameweeks.functions.ts`, `results-engine.server.ts` get a `tenantId` (or `competitionId` that implies it) parameter and filter every query.
- Email templates take `tenant` + `competition` props — no hardcoded club name or colours.
- Admin panel becomes `/:tenantSlug/admin` with the same components; one extra `/platform/admin` shell for cross-tenant views.

---

## 7. Seed strategy for Tenant Zero

Single migration seeds:

1. `tenants` row: `slug='killeshin'`, `name='Killeshin GAA'`, `status='active'`.
2. `tenant_settings` row populated from current hardcoded values (logo, colours, intro copy).
3. `tenant_members`: insert any existing admin user (or leave empty and rely on legacy PIN shim until a real admin signs up).
4. Backfill `tenant_id` on `competitions`, `players`→`entrants`+`competition_entries`, `picks`, `gameweeks` (if tenant-scoped) using the Tenant Zero id.
5. Add NOT NULL + FK on `tenant_id` only **after** backfill verifies zero nulls.
6. Add URL aliases so `/pick`, `/pay`, `/admin/panel` resolve to Tenant Zero.

---

## 8. Migration phases (incremental, each phase ships green)

**Phase 1 – Foundations (no behavior change)**

- Create `tenants`, `tenant_settings`, `tenant_members`, `platform_admins`, role enum, helper functions.
- Seed Tenant Zero.
- Add nullable `tenant_id` to `competitions`, `players`, `picks`, `payments-equivalent`, `gameweeks` and backfill.

**Phase 2 – Engine becomes tenant-aware**

- All server functions accept/require `tenant_id` (derived from `competitionId` where possible).
- RLS helper functions in place; policies added in audit-only mode (server still uses admin client).
- Flip `tenant_id` to NOT NULL.

**Phase 3 – Entrants split & new tables**

- Introduce `entrants` + `competition_entries`. Migrate `players` data. Switch `picks` FK. Keep `players` as view.
- Add `payments`, `messages`, `admin_actions`, `audit_logs`. Wire admin actions to log automatically.

**Phase 4 – Admin features**

- Offline entrant add, bulk import (CSV), manual payments, pick-on-behalf, override pick, reinstate, manual eliminate, broadcast reminders, audit history view.
- Replace PIN with Supabase Auth + `tenant_members`. Keep PIN shim behind a flag for one release.

**Phase 5 – Tenant-aware routing & branding**

- Add `/:tenantSlug/...` routes; keep legacy URLs as aliases to Tenant Zero.
- `TenantProvider` + dynamic theming via CSS variables.
- Email templates read tenant branding.

**Phase 6 – Platform admin**

- `/platform/admin`: list tenants, create new tenant (slug, branding, owner invite), view cross-tenant stats, impersonate for support.

**Phase 7 – Cleanup**

- Drop `players` view, remove PIN shim, remove legacy single-tenant code paths.

---

## 9. Risks, edge cases, assumptions

- **Magic tokens** are currently globally unique on `players`. After split, `competition_entries.magic_token` must remain unique globally — otherwise a token could resolve to the wrong tenant. Add a unique index and resolve `tenant_id` from the token row, never from URL.
- **Email deliverability per tenant**: the shared email infra sends from one Lovable domain. Per-tenant from-addresses are a later add; flag as out-of-scope for v1.
- **Slugs** must be reserved (`platform`, `admin`, `api`, `auth`, `pick`, `pay`, etc.) to avoid collisions with system routes.
- **Tenant Zero PIN**: keep working until at least one real Supabase admin user exists for the tenant; otherwise the club loses access.
- **Gameweeks**: currently appear single-comp. Decide whether gameweeks are global (shared EPL) or per-competition (rounds reference a global gameweek). Plan: global `gameweeks` + per-comp `competition_rounds` pointer.
- **Payments**: current Stripe/Revolut links are competition-level. Per-tenant payout accounts are future work; v1 stores them as tenant_settings strings.
- **RLS performance**: `has_tenant_access` will be called frequently. Mark STABLE, index `tenant_members(user_id, tenant_id)`.
- **Data backfill safety**: every backfill migration runs inside a transaction and asserts `count(*) where tenant_id is null = 0` before adding NOT NULL.
- **No anon RLS**: keep deny-all; public surface stays behind server functions. This matches the project memory.

---

## 10. What I will deliver per phase

Each phase is one or more PRs containing: a migration (with GRANTs + RLS), updated server functions, updated UI, and a short verification checklist (existing Tenant Zero flows must pass: join, pay link, pick, lock week, eliminate, reminders).

If you approve this plan, I'll start with **Phase 1** (tenants + settings + members + Tenant Zero seed, nullable `tenant_id` backfill) — zero behavior change, fully reversible.