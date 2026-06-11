## Goal

Replace the current `/pick` page with a richer "Next Gameweek" experience that survivors see between rounds, and add a preview route so you can review the look & feel without a real magic token.

## What players will see (in order, top → bottom)

1. **Club header** (logo + name, same as today).
2. **"You're through to GW{n}" hero** — eyebrow shows the week they just survived; big headline confirms progression.
3. **Week label + deadline date** e.g. `GW4 · Sat 30 Aug 13:30`
4. **Countdown timer** — large `Dd Hh Mm Ss` ticking to the next deadline (reuses existing `useCountdown` from `/pick`). Turns red in last hour; "Picks locked" state when expired.
  &nbsp;
5. **Your picks so far** — every prior gameweek with the team they used. Acts as the "history".
6. **Next gameweek fixtures** — fixture rows with the home/away buttons (same as today). Teams the player has already used are visually greyed out, line-through, and disabled. Lock-in button at the bottom; on submit, refetches and shows a confirmation card with the chosen team.
7. **Survival stats strip** — three tiles:
  - **Still alive**: `X players (Y%)`
  - **Eliminated**: `Z players (W%)`
    9. **Top 3 picks last week** — small leaderboard chip row: `Liverpool 14 · Arsenal 9 · Spurs 7` (most-picked teams from last completed gameweek, derived from `picks` joined on previous `gameweeks.week_number`).

If the player is eliminated → eliminated screen (unchanged). If there's no upcoming gameweek → "No upcoming gameweek yet" (unchanged).

## How to preview without a real token

Add a **preview mode** so you can validate the design:

- New route `/$tenantSlug/admin/next-gameweek-preview` (gated by the existing club-admin session) — renders the exact same component using **synthetic preview data**: a fake player named "Tom Murphy" who has survived 3 GWs with picks (Liverpool, Arsenal, Man City), a synthetic upcoming GW4 with the real fixtures from the tenant's current competition, a deadline of "now + 3 days", and synthetic survival stats (24 alive of 60, top 3 picks of last week).
- The preview screen has a thin banner at the top: **"Preview mode — synthetic data, no picks will be saved"** with the lock-in button disabled.
- Accessed from a new "Preview Next Gameweek email page" button on `/admin/panel`.

This lets you iterate purely on layout/copy without minting tokens or affecting live data.

## Files

**New**

- `src/components/oneshot/NextGameweekView.tsx` — the shared presentational component. Takes a fully-resolved data object (player, competition, gameweek, fixtures, badges, picks, survivalStats, topPicksLastWeek, mode: "live" | "preview") and renders sections 1–7 above. The `/pick` route and the preview route both render this component.
- `src/routes/$tenantSlug.admin.next-gameweek-preview.tsx` — admin-only route; loads real fixtures for the tenant's current competition, fabricates the rest, renders `NextGameweekView` in preview mode.

**Edited**

- `src/routes/pick.tsx` — keep the route, replace the layout with `<NextGameweekView mode="live" data={…} />`. Submission logic stays in `/pick`.
- `src/lib/gameweeks.functions.ts` — extend `getPickContext` (or add a sibling `getNextGameweekContext`) to also return: `playersAlive`, `playersEliminated`, `topPicksLastWeek: { team, count }[]`, and the previous week's label. All server-side via `supabaseAdmin`, no new client privileges.
- `src/routes/admin.panel.tsx` — add a "Preview Next Gameweek page" link.

## Out of scope

- No change to the eliminated screen, the entry/pay flow, or the email templates.
- No new admin permissions; preview route uses the existing club-admin session check.
- No changes to results/elimination engine.

## Open question

Should the **countdown turn red and pulse in the final hour**, or stay neutral until lock? Default = red + pulse, but easy to flip. Yes Red and pulse 