## Email Automation Plan

Use the **existing Lovable Emails infrastructure** (already set up on `notify.oneshotclub.ie`). Send from `picks@notify.oneshotclub.ie`. All scheduling runs through TanStack server routes + `pg_cron`. No Resend, no Edge Functions.

---

### 1. New database tables

`**gameweeks**`

- `id`, `competition_id`, `week_label` (e.g. "GW31"), `week_number` (int)
- `first_kickoff_at`, `last_match_ends_at`, `deadline_at` (auto = first_kickoff_at − 2h via trigger)
- `results_locked` (bool, default false), `processed_at` (nullable), timestamps

`**results**`

- `id`, `gameweek_id`, `home_team`, `away_team`, `home_score`, `away_score`
- `winner` ('home' | 'away' | 'draw'), timestamps

`**teams**` (new, lightweight) — so admin can manage badge URLs once and reuse them

- `id`, `competition_id`, `name`, `badge_url`, timestamps

`**reminders_sent**` — idempotency guard for the 24h / 1h reminders

- `id`, `player_id`, `gameweek_id`, `kind` ('24h' | '1h' | 'elim' | 'progress' | 'entry'), `sent_at`
- Unique (`player_id`, `gameweek_id`, `kind`)

All deny-all RLS; server-only access via `supabaseAdmin`.

---

### 2. Email templates (React Email under `src/lib/email-templates/`)

Branding: dark green background panel, gold accent, Barlow Condensed headings (with web-safe fallback), `Body` stays `#ffffff` per Lovable requirement. Footer/unsubscribe auto-appended.

1. `entry-confirmation.tsx` — Email 1
2. `elimination.tsx` — Email 2A
3. `progression.tsx` — Email 2B
4. `reminder-24h.tsx` — Email 3
5. `reminder-1h.tsx` — Email 4

Each registered in `src/lib/email-templates/registry.ts`.

---

### 3. Triggers


| Email                          | Trigger                                                                            | Implementation                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Entry confirmation          | After `joinCompetition` server fn inserts player                                   | Call internal send helper at end of handler                                                                                          |
| 2A/2B. Elimination/Progression | Admin clicks "Lock results" **or** auto via cron 70 min after `last_match_ends_at` | `processGameweekResults` server fn iterates alive players, updates `alive`, enqueues 2A or 2B per player                             |
| 3. 24h reminder                | `pg_cron` every 10 min hits `/api/public/cron/check-reminders`                     | Finds gameweeks where `deadline_at` is 23h45m–24h15m away; for each alive player without a pick + no `reminders_sent` row, enqueue 2 |
| 4. 1h reminder                 | Same cron route                                                                    | Same logic, 45–75 min window                                                                                                         |


Idempotency: insert into `reminders_sent` before enqueue; unique constraint prevents duplicates.

---

### 4. Server-side code

**Server functions** (`src/lib/`)

- `gameweeks.functions.ts` — admin CRUD for gameweeks, fixtures, results, teams (PIN-gated)
- `results.functions.ts` — `processGameweekResults({competitionId, gameweekId, pin})`
- `email-triggers.server.ts` — internal helpers that render a template and call `/lovable/email/transactional/send` with an idempotency key like `entry-${playerId}` / `gw-${gameweekId}-${playerId}-elim`

**Server route** (`src/routes/api/public/cron/check-reminders.ts`)

- Auth via `apikey` header = Supabase anon key
- Scans for due 24h reminders, 1h reminders, and overdue unprocessed gameweeks; enqueues sends and triggers `processGameweekResults` when due

**pg_cron**

- `* * * * *` (every minute) → POST to `/api/public/cron/check-reminders`
- Existing email queue cron (`process-email-queue` every 5s) handles delivery

---

### 5. Pick screen updates (`/pick?token=...`)

Server fn `getPickContext({token})` returns: player, alive status, previous picks, **current gameweek** (fixtures, deadline_at, last_match_ends_at), used teams.

UI:

- Countdown timer to `deadline_at`
- Fixtures with home/away badges from `teams.badge_url`
- Used teams greyed out + disabled
- If `now > deadline_at`: "Picks are locked"
- If `!alive`: "You've been eliminated" screen

`submitPick` adds guard: reject if `now > deadline_at` or player not alive.

---

### 6. Admin panel additions

- "Gameweeks" tab: add gameweek (week label, first kickoff, last match ends — deadline auto), add fixtures
- "Results" tab: enter scores for current gameweek, "Lock results" button → calls `processGameweekResults`
- "Teams" tab: add/edit team name + badge URL (one-time setup; reused across gameweeks)

---

### 7. Team badges

Premier League fixtures aren't out yet and `premierleague.com` blocks scraping. Practical approach: admin pastes a badge URL per team once in the Teams tab. Suggested free source: `https://resources.premierleague.com/premierleague/badges/t<id>.png` (publicly hosted) — admin can paste these as fixtures are confirmed. Reused in emails and pick screen.

---

### 8. Out of scope (per your spec)

SMS, WhatsApp, push, custom template builder, Resend.

---

### Order of build

1. Migrations: `gameweeks`, `results`, `teams`, `reminders_sent` + deadline trigger
2. Email templates + registry
3. Internal email send helper
4. `gameweeks` / `results` / `teams` server fns + admin UI tabs
5. `processGameweekResults` + wire 2A/2B
6. Update `joinCompetition` to send Email 1
7. Cron route + pg_cron schedule + Emails 3/4
8. Refactor pick screen to use new gameweek model + countdown + lockout