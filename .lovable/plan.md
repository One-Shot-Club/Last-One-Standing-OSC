## Goal

One email = one **account**. An account can own **1–12 entries** per competition (e.g. parent + family). All identity logic moves from `players` → `accounts` + `entries`. Picks/results/emails/admin re-point to `entry_id`.

Pick logic, fixture/results engine, branding, and design system are unchanged — this is an identity/ownership refactor.

---

## 1. Database migration (single migration, reviewed before run)

New tables in `public`:

- `**accounts**` — `id uuid pk`, `tenant_id uuid fk tenants`, `email citext not null`, `phone text null`, `created_at timestamptz`. Unique `(tenant_id, lower(email))`.
- `**entries**` — `id uuid pk`, `tenant_id uuid fk`, `account_id uuid fk accounts`, `competition_id uuid fk`, `display_name text not null`, `paid boolean default false`, `alive boolean default true`, `magic_token text unique`, `created_at timestamptz`, `updated_at timestamptz`. Unique `(competition_id, magic_token)`.

Both tables: deny-all RLS (matches existing posture — all access via server fns with `supabaseAdmin`), plus `GRANT ALL ... TO service_role`. No `anon`/`authenticated` grants.

Data migration (1:1 — confirmed):

- For every row in `players`, insert one `accounts` row keyed on `(tenant_id, lower(email))` (`ON CONFLICT DO NOTHING` so duplicates within a tenant collapse safely; phone taken from the first player seen).
- Insert one `entries` row per existing `players` row, linked to that account, carrying `paid`, `alive`, `magic_token`, and `full_name` → `display_name`.
- Add `entries.player_id_legacy uuid` for the migration window so picks/payments can be re-pointed, then drop it.

`picks` (and any other table referencing `player_id`): add `entry_id uuid`, backfill from `player_id_legacy`, make `entry_id NOT NULL`, drop `player_id`. Same for `payments`, `reminders_sent`, `competition_entries` (or fold `competition_entries` into the new `entries` if it's purely a join row — confirm during exploration before the migration runs).

Triggers: keep existing `set_tenant_id_from_competition` pattern on `entries`; add `touch_updated_at` trigger.

Old `players` table: kept read-only for one release cycle (renamed `players_legacy`) so we can roll back; sync trigger `sync_player_to_entry` is dropped.

## 2. Server functions (`src/lib/*.functions.ts`)

New / changed:

- `createAccountWithEntries({ tenantId, competitionId, email, phone, entries: [{ displayName }] })` — single transaction, returns `{ accountId, entryIds[] }`. Used by the join screen.
- `markAccountPaid({ accountId, competitionId })` — flips every entry under that account to `paid=true, alive=true`, generates a fresh `magic_token` per entry. Called by the "I've paid" handler.
- `getPickContext({ token })` — already exists; extended return now includes `siblingEntries: [{ id, displayName, alive, magicToken }]` (queried by `account_id`). The switcher uses `magicToken` for client-side route swaps.
- `submitPickV2` — scope by `entry_id` derived from the token; otherwise unchanged.
- Admin: `listEntries`, `addEntryManual({ tenantId, competitionId, email, phone, displayName })` (reuses account if email matches within tenant), `setEntryPaid`, etc. — all `entry_id`-scoped versions of today's player ops.

All continue to use `supabaseAdmin` per the project's deny-all RLS posture.

## 3. Join screen (`src/routes/details.tsx` + `TenantEntry.tsx`)

- Keep email (required) + phone (optional — per user's answer, spec relaxed).
- Add a **"How many entries?" stepper** (1–6, default 1).
- When >1, render N-1 optional name inputs (placeholder `Entry 2`, `Entry 3`, …). Blank → use placeholder as `display_name`. First entry's display_name = the player's own name field (already collected).
- Submit calls `createAccountWithEntries`, then routes to `/pay?account=…` (or carries the account id in state).

Validation: zod schema with `entries: z.array(z.object({ displayName: z.string().trim().max(60) })).min(1).max(6)`.

## 4. Payment screen (`src/routes/pay.tsx`)

- Loader fetches the account + its unpaid entries for this competition.
- Total = `entry_fee × entries.length`.
- Render a breakdown list (display_name per row, fee per row, total at bottom) above the existing Stripe / pay button.
- "I've paid" → `markAccountPaid` → success page lists each entry with its own magic link.

## 5. Pick screen (`src/routes/pick.tsx` + `NextGameweekView`)

- `getPickContext` now returns `siblingEntries`. When `siblingEntries.length > 1`, render a header dropdown **"Picking for: [display_name ▾]"**.
- Selecting a sibling navigates to `/pick?token=<sibling.magicToken>` — refetches context, so used-teams / pick history / alive state are scoped per entry automatically. No change to pick logic itself.
- Per the user's answer: holding any one sibling token grants switcher access to all siblings on the same account — no extra verification.

## 6. Emails — one digest per account per event

`src/lib/email/triggers.server.ts` changes:

- Trigger functions accept `accountId` instead of `playerId`. They load all entries on the account for the competition and compose a **single email** summarising every entry's status for that event.
- New shared section in `_shared.tsx`: `<EntriesDigest entries={…}/>` rendering one row per entry:
  - Alive + needs pick → name, last team, "Make your GW{n} pick →" button (magic link for that entry)
  - Eliminated → name + short "Eliminated, thanks for playing" line, no button
  - Through (progression digest) → name + "Through to GW{n+1}" + pick button
- Existing templates (`elimination`, `progression`, `pick-reminder`, `entry-confirmation`) gain an optional `entries` prop and fall back to the single-entry layout when only one is present (so existing preview data + single-entry accounts still look right).
- Idempotency key becomes `${event}-${accountId}-${gameweekId}` so retries dedupe at the account level.

## 7. Admin panel (`src/routes/admin.panel.tsx`)

- Rename "Players" tab → **"Entries"**.
- Row: `display_name` bold, then `account.full_name? — account.email` muted underneath (phone appended when present). E.g. `Hugo  (paul@gmail.com · 087…)`.
- Add **"Group by account"** toggle. On: sort by `account_id`, render an account header row (email + entry count) with its entries indented underneath.
- **Add entry manually** form: email + optional phone + display_name. Server fn matches existing account by `(tenant_id, lower(email))` or creates one, then inserts the entry as `paid=false`.
- Existing CSV / filter / paid-toggle controls re-point to `entry_id`.

## Out of scope

- No change to pick/fixture/elimination/results engine logic.
- No change to branding, themes, or design tokens.
- No new auth (still magic-token only for players; admin PIN unchanged).
- No payment provider changes.
- `players_legacy` cleanup happens in a follow-up after one release of monitoring.

## Rollout order

1. Migration (creates new tables, backfills, repoints `picks`/`payments`, renames `players` → `players_legacy`).
2. Server functions + email triggers.
3. Join + payment + pick UI.
4. Admin tab rename + grouping + manual-add.
5. Smoke test: existing magic links still resolve (token preserved 1:1), new multi-entry signup → pay → pick → digest email all work end-to-end.