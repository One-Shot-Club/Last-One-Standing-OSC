## Goal

Create a new **OneShotClub** master tenant, separate from Killeshin, and make the root URL (`/`) redirect to it instead of `/killeshin`.

## Changes

### 1. Database — insert new tenant

Add via the data tool (not a schema migration):

- `tenants` row: `slug = 'oneshotclub'`, `name = 'OneShotClub'`, `status = 'active'`
- `tenant_settings` row for that tenant with placeholder branding (no logo, intro copy like "The home of Last One Standing competitions for Irish clubs."). No competition is created — OneShotClub is a brand/landing tenant, not a club running a comp.

Killeshin and St. Joseph's AFC tenants remain untouched.

### 2. Root redirect

`src/routes/index.tsx` currently redirects to `/killeshin`. Change the target to `/oneshotclub`.

### 3. Landing page behaviour at `/oneshotclub`

The tenant route (`/$tenantSlug/`) renders `<TenantEntry>`, which expects a `competition`. Since OneShotClub has no competition, the existing component will render with `competition: null`. Two options:

- **(a) Reuse `TenantEntry`** as-is and let it show its empty/no-comp state.
- **(b) Branch in `$tenantSlug.index.tsx`**: if `competition === null`, render a simple OneShotClub master landing (logo, tagline, short "what is this" copy, link to how-it-works). No new route file needed.

Plan: go with **(b)** — cleaner and gives OneShotClub a proper brand landing rather than a half-filled entry form. Add a small `MasterTenantLanding` component in `src/components/oneshot/`.

### 4. Out of scope

- No change to Killeshin's slug, name, branding, or URLs.
- No change to St. Joseph's AFC.
- No new admin/auth or platform-admin wiring — OneShotClub is just another tenant row that happens to be the default redirect.

## Resulting URLs

```
/                            → redirects to /oneshotclub
/oneshotclub                 → OneShotClub master landing
/killeshin                   → Killeshin LMS entry (unchanged)
/st-josephs-afc              → St. Joseph's AFC entry (unchanged)
```

Custom domain equivalent: `https://last-one-standing.oneshotclub.ie/` → OneShotClub landing.

## Open question

Do you want the OneShotClub landing to list the live club competitions (Killeshin, St. Joseph's AFC) as clickable cards, or stay as a plain brand page with no club list for now?
