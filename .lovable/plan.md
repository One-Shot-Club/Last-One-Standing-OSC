## Goal

One canonical "Last Man Standing" entry experience, rendered per tenant. Every tenant — Killeshin, St. Joseph's AFC, and any future club — uses the **same template**, just branded and scoped to its own competition. No more parallel half-built tenant page.

## Current state (the "half setup")

- `/` — full working funnel (hero → name/email/phone → how-it-works → pick → pay), but hardcoded to a "demo competition" (Killeshin) via `getDemoCompetition()`.
- `/$tenantSlug/` — different page: branding header + a competitions list card. **No entry form.** That's why St. Joseph's looks broken.

Two parallel implementations, only one of which actually lets people enter.

## Target architecture

```text
/                 → 302 redirect to /killeshin (default tenant)
/{tenantSlug}/    → THE entry template (same hero, same form, same flow)
                     - branding: tenant.logo_url, tenant.name, tenant colors
                     - competition: tenant's primary active competition
                     - submit → /how-it-works?c={compId}&n=&e=&p= (already tenant-agnostic)
```

Killeshin loses its "special" status at `/` and just lives at `/killeshin`. St. Joseph's at `/st-josephs-afc` automatically gets the identical experience.

## Changes

### 1. New server function: `getTenantEntryContext({ slug })`
In `src/lib/tenant.functions.ts`. Returns `{ tenant, competition }` where `competition` is the tenant's primary active competition (single competition assumption matches today's data — one comp per tenant). Same shape `getDemoCompetition` returns today so the template can consume it uniformly.

### 2. Rewrite `src/routes/$tenantSlug.index.tsx`
Replace the current branded-list layout with a **copy of `src/routes/index.tsx`'s `Landing` component**, but:
- Data source: `getTenantEntryContext({ slug: params.tenantSlug })` instead of `getDemoCompetition()`.
- `ClubHeader` driven by `tenant.name` + `tenant.logo_url` (falls back to competition's `club_name`/`club_logo_url`).
- Apply `useTenantBranding(tenant)` so colors theme the page.
- `head()` uses tenant name + competition prize for proper OG/share metadata.
- `notFound` if slug doesn't resolve.

### 3. Convert `/` into a redirect
`src/routes/index.tsx` becomes a tiny route that `throw redirect({ to: "/$tenantSlug/", params: { tenantSlug: "killeshin" } })` in `beforeLoad`. Delete the inline `Landing` component (it's now lifted into the tenant route, or extracted as a shared `<TenantEntry tenant comp />` component if cleaner).

**Cleaner variant (recommended):** extract the funnel UI into `src/components/oneshot/TenantEntry.tsx` and have **both** `$tenantSlug.index.tsx` render it. `index.tsx` is just the redirect. Single source of truth for the funnel — fixing a bug or restyling the hero updates every tenant at once.

### 4. Downstream flow already works
`/how-it-works`, team picker, and payment pages already take a `c=competitionId` search param and are tenant-agnostic. No changes needed there.

### 5. Keep `getDemoCompetition` for now
Don't delete it in this pass — it may be referenced elsewhere. Mark for follow-up after verifying no other call sites.

## What does NOT change

- DB schema. No migrations.
- `/platform/admin` and the Activate Tenant wizard. Once a tenant has a competition + branding, `/{slug}` just works.
- Auth/RLS posture. Still deny-all + server functions.
- Admin pages, magic-token flows, payment provider integrations.

## Verification

1. Visit `/` → lands on `/killeshin` showing the existing Killeshin hero/form (identical to today's `/`).
2. Visit `/st-josephs-afc` → same template, St. Joseph's branding, St. Joseph's competition (`6b149c5a-…`), prize pool / entry fee from that comp.
3. Submit form on `/st-josephs-afc` → continues into `/how-it-works?c=6b149c5a-…` and through to pick/pay.
4. Visit `/does-not-exist` → tenant-not-found state.

## Open items (small, can decide while building)

- Where to extract the shared funnel component (`src/components/oneshot/TenantEntry.tsx` vs inline duplication). I'll go with extraction unless you prefer otherwise.
- Whether `/killeshin` should keep its current `club_name`/`club_logo_url` from the competitions row, or switch to the tenants row. Plan: prefer tenant row, fall back to competition row, so nothing visually changes for Killeshin.
