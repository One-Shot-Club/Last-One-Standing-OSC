## Goal

Auto-populate fixtures and results from the free FPL public JSON API (no key, no cost), refresh every 20 minutes during match windows, let admins import gameweeks on demand (if 1st import of gameweek fixtures is unsuccessful), and auto-process eliminations when every fixture in a gameweek is full-time.

## Data source

- `https://fantasy.premierleague.com/api/bootstrap-static/` — team list + id map (cached daily)
- `https://fantasy.premierleague.com/api/fixtures/?event={gw}` — fixtures + live scores + `finished` flag per gameweek

No API key, no rate-limit headers, generous in practice. We'll cache the team-id → name map in a small lookup table.

## Changes

### 1. DB migration — `pl_teams` lookup + add `external_id` columns

- New `public.pl_teams` (id int PK = FPL team id, name text, short_name text, badge_url text). Seeded by the sync job.
- Add `fpl_fixture_id int unique` to `public.results` so we can upsert by FPL id instead of guessing by team names.
- Add `fpl_event int` to `public.gameweeks` (which FPL "event" number this maps to; defaults to `week_number`).
- Standard grants + RLS (deny-all anon/auth; only service role writes).

### 2. New server-only helpers — `src/lib/fpl/`

- `fpl-client.server.ts` — typed `fetch` wrappers for `bootstrap-static` and `fixtures?event=N`. No secrets.
- `fpl-sync.server.ts`:
  - `syncTeams()` — upserts `pl_teams` from bootstrap.
  - `importGameweekFixtures(competitionId, week)` — pulls fixtures for that FPL event, upserts into `results` (home_team, away_team, kickoff_at, fpl_fixture_id), and sets `gameweeks.first_kickoff_at` (trigger recomputes `deadline_at`).
  - `syncGameweekResults(competitionId, week)` — refetches fixtures for the week, updates `home_score`, `away_score`, `winner` on each row matched by `fpl_fixture_id`. Returns `{ allFinished: boolean }`.

### 3. Server functions (admin-callable) — `src/lib/fpl.functions.ts`

All wrap `verifyAdmin(competitionId, pin)`:

- `importGameweekFromFPL({ competitionId, week })` — runs `syncTeams` (if stale) then `importGameweekFixtures`. Used by an "Import from FPL" button on the Gameweeks tab.
- `syncGameweekFromFPL({ competitionId, week })` — manual "Sync now" button.

### 4. Cron — `src/routes/api/public/cron/sync-fpl-results.ts`

- POST, secured by `apikey` header (Supabase anon key — per platform convention).
- Iterates every competition with a current, unprocessed gameweek whose `first_kickoff_at` is within the last 4 hours OR within the next 15 min (so we cover live windows + a small buffer).
- Calls `syncGameweekResults` for each.
- If `allFinished === true` AND gameweek not yet processed, calls existing `processGameweekResultsInternal` — this already creates email tasks for the admin to send.
- pg_cron schedule (registered via `supabase--insert`): every 20 minutes.

### 5. Admin Panel UI — `src/routes/admin.panel.tsx` (Gameweeks tab only)

- New row per gameweek:
  - **"Import fixtures from FPL"** button (visible if results table empty for that week)
  - **"Sync results from FPL"** button (visible once fixtures exist and gw not processed)
  - Small last-synced timestamp.
- No changes to picks, payments, broadcast, or email flows.

### 6. Static `src/lib/fixtures.ts`

- Keep the existing hardcoded GW1–3 file as a fallback for the marketing/how-it-works page only. Real comp data now comes from DB.

## Out of scope

- No live in-match events (FPL doesn't expose them reliably).
- No fantasy points, lineups, or odds.
- No replacement of manual entry — admin can still type results in if FPL is down.
- No change to email templates or send infra.

## Technical notes

- Cron auth uses the existing `apikey` header pattern (no new secrets).
- All writes use `supabaseAdmin` loaded inside handlers, never at module scope.
- Team-name matching uses `pl_teams.name` so an admin who created a gameweek manually with "Man Utd" vs FPL's "Man Utd" needs no remapping — we store by FPL fixture id once imported.
- The auto-process step reuses `processGameweekResultsInternal` unchanged; behaviour (email tasks queued for admin) stays identical.

## Result

Admin opens Gameweeks tab → If Auto API call for GAMEweek fixtures doesn't pull in, the admin can click "Import from FPL" for GW4 → fixtures + deadline populate. Matches play. Cron fills in scores every 20 min. When the last match goes FT, eliminations run automatically and elimination/progression/reminder email tasks appear in the Emails tab for the admin to send.