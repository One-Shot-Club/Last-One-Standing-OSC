
## Goal

Create a hard-wired Gameweek 2 picks page at `/gw2?token=...` that serves as the destination for magic-link emails. Style mirrors How It Works. Teams already used by the entrant are dynamically greyed-out and unselectable.

## GW2 fixtures (mapped to current-season clubs)

The screenshot includes clubs not in this season's set (Ipswich, Leicester, Southampton). Mapped to the nearest equivalents from the existing 20-team list in `src/lib/fixtures.ts`:

```text
Bournemouth                 vs  Newcastle             (← Leicester → Newcastle)
Fulham                      vs  Manchester City
Sunderland                  vs  West Ham              (← Ipswich → Sunderland)
Liverpool                   vs  Crystal Palace
Manchester United           vs  Aston Villa
Burnley                     vs  Everton               (← Newcastle home → Burnley)
Nottingham Forest           vs  Chelsea
Leeds United                vs  Arsenal               (← Southampton → Leeds)
Tottenham                   vs  Brighton
Wolverhampton Wanderers     vs  Brentford
```

These are picked so every fixture uses a team currently in `TEAMS`. I'll call this out at the top of the new page ("Gameweek 2 fixtures — Premier League").

## Changes

### 1. `src/lib/fixtures.ts`
Replace `FIXTURES_BY_WEEK[2]` with the 10 pairings above so existing code paths (badges, helpers) work unchanged.

### 2. New page `src/routes/gw2.tsx`
- Route: `/gw2`, search param `{ token: string }`.
- Uses existing `getPickContext` server fn purely to resolve the player from `token` (full_name, alive, picks history).
- Ignores the DB gameweek — renders hard-wired GW2 fixtures from `getFixtures(2)`.
- Layout reuses `Shell`, `ClubHeader`, `Eyebrow`, `Card`, `Btn` and the `FixtureCard`/`TeamBtn` styling from `how-it-works.tsx` (same compact rows, same typography).
- Greys-out & disables any team present in `data.picks[*].team` (line-through, opacity-40, `pointer-events-none`).
- Shows the user's previous picks list at the bottom (read-only).
- Submission calls a new `submitGw2Pick` server fn (see §4) which looks up the GW2 row in DB by `week_number = 2` and inserts via the existing pick rules.
- Countdown to GW2 deadline (read from DB row).
- Handles: invalid token, eliminated player, already-picked-this-week, locked deadline — matching `/pick` UX copy.

### 3. Seed GW2 in the database (migration)
Add a migration that, for the Killeshin competition:
- Inserts a `gameweeks` row: `week_number = 2`, `week_label = 'Gameweek 2'`, `first_kickoff_at` = (current `gameweeks` row for week 1's `last_match_ends_at` + 5 days), `last_match_ends_at` = first_kickoff + 2 hours. The existing `set_gameweek_deadline` trigger sets `deadline_at = first_kickoff - 2h`.
- Inserts the 10 `results` rows (home/away teams only, no scores) so the admin panel and any downstream code see the GW2 fixture list.
- Upserts the 10 team names into `teams` (idempotent on `(competition_id, name)`) with Premier League badge URLs from `fixtures.ts`.

Idempotent via `ON CONFLICT DO NOTHING`.

### 4. New server fn `submitGw2Pick` in `src/lib/gameweeks.functions.ts`
Thin wrapper around the existing `submitPickV2` logic but resolves the gameweek by `(competition_id, week_number=2)` from the player's competition — so the client never needs the gameweek UUID. Same alive/deadline/dup-team/dup-week guards.

### 5. Email magic link target
Update `magicLinkFor()` in `src/lib/email/triggers.server.ts` to return `${APP_URL}/gw2?token=...` so the 24h and 1h reminder emails land directly on the GW2 page. Entry confirmation can stay pointing at `/gw2` too for consistency.

## Out of scope
- No changes to `/pick` (kept as the generic dynamic flow for future gameweeks).
- No changes to admin panel, results processing, or elimination engine.
- No changes to how-it-works visuals — purely reused as the style reference.
