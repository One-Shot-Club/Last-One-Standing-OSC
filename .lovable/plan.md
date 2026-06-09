## Goal

Replace the multi-page "go fiddle in 4 different screens" activation process with a single **Activate tenant** wizard launched from `/platform/admin`. After it finishes, the tenant's public URL (e.g. `/st-josephs-afc`) is fully playable.

## Where it lives

- New button **Activate** on each tenant row in `/platform/admin` (next to **Edit**). For tenants that already have a competition + gameweek 1 seeded + payment link, the button reads **Re-run setup**.
- Opens a single modal/sheet with 5 steps and a progress bar. Back/Next, no page reloads.

## Wizard steps

```text
1 Brand           2 Competition     3 Fixtures        4 Payments        5 Go live
  logo + colours    name, fee,        seed GW1          stripe / revolut    review + launch
  intro copy        prize, PIN        (one click)       / bank link
```

1. **Brand** — logo URL, primary + accent colour, intro copy, contact email/phone, WhatsApp link. Pre-filled from `tenant_settings` if present.
2. **Competition** — name (default `"{Tenant} Last Man Standing"`), entry fee (default `10`), prize pool (optional), club name + logo (defaulted from step 1), 4-digit admin PIN (auto-generated, copy-to-clipboard, editable). Creates the `competitions` row if missing; otherwise updates it.
3. **Fixtures** — single button **Seed Gameweek 1** that calls the existing `seedGameweek` server fn with the PIN from step 2. Shows the seeded fixtures inline; success tick when done.
4. **Payments** — three optional inputs (Stripe link, Revolut link, bank transfer text). Must have at least one to continue. Saved onto the `competitions` row.
5. **Go live** — read-only summary + checklist (brand ✓, competition ✓, GW1 ✓, ≥1 payment link ✓) + **Launch** button. Launch sets `tenants.status = 'active'`, opens the public URL in a new tab, and closes the wizard.

Steps the wizard already detects as complete are pre-ticked and skippable.

## Server functions (new, in `src/lib/platform-admin.functions.ts`)

All gated by `assertPlatformAdmin`, all return JSON the wizard can use to refresh state.

- `getTenantActivation({ tenantId })` — returns `{ tenant, settings, competition, hasGameweek1, paymentLinks }` so the wizard can pre-tick completed steps.
- `upsertCompetition({ tenantId, name, entryFee, prizePool, clubName, clubLogoUrl, adminPin })` — creates or updates the tenant's primary competition; if PIN omitted on create, generates a 4-digit one and returns it.
- `setPaymentLinks({ competitionId, stripeLink?, revolutLink?, paymentLink? })` — updates the three columns on `competitions`.
- `launchTenant({ tenantId })` — re-checks all prerequisites server-side, then sets `tenants.status = 'active'` and writes an `audit_logs` row.

Fixtures step reuses the existing `seedGameweek` server function — no new endpoint.

## UI files

- `src/components/platform/ActivateTenantWizard.tsx` — the modal/sheet, step state machine, step components inline.
- Edit `src/routes/_authenticated/platform.admin.tsx` — add **Activate** button per row, mount the wizard.
- Edit `EditTenantPanel.tsx` only to share the brand form fields (extract to `BrandFormFields.tsx` so both the wizard and the existing edit panel use the same inputs — no duplication).

## What stays the same

- `/admin/panel` (PIN-protected per-tenant admin) is untouched — it remains for ongoing weekly admin (seed GW2+, set winners, manage entrants).
- Existing `createTenant`, `updateTenant`, `seedGameweek` behaviour unchanged; the wizard composes them.
- No schema changes.

## Out of scope

- Tenant member invitation UI.
- Editing the wizard's steps after launch (use existing screens).
- Uploading logos (still URL-based, same as today).
