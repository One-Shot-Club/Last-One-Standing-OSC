## Goal
Extend the admin Broadcast panel so admins can target more audiences and see the recipient count for each before sending.

## Audiences (final list)
- All players
- Still alive
- All eliminated
- Eliminated in last gameweek
- (keep) Paid / Unpaid

Each option in the dropdown shows its live count, e.g. `Still alive (42)`.

## Changes

### 1. Server: `src/lib/admin-ops.functions.ts`
- Add `"eliminated_last_gw"` to the `audience` union on `broadcastMessage`. Resolve it by finding the most recently completed gameweek for the competition and selecting players whose pick that week has `result = 'loss'` (and who are not alive).
- New server fn `getBroadcastAudienceCounts({ competitionId, pin })` returning `{ all, alive, eliminated, eliminated_last_gw, paid, unpaid, last_gw_week }`. PIN-verified like the other admin fns.

### 2. UI: `src/routes/admin.panel.tsx` Broadcast card
- Extend `audience` state union with `"eliminated_last_gw"`.
- Fetch counts via the new server fn on mount + after each successful broadcast; re-fetch when the admin opens the Broadcast tab.
- Render dropdown options with counts inline, e.g. `All players (128)`, `Still alive (42)`, `All eliminated (86)`, `Eliminated in last GW (11)`, `Paid (120)`, `Unpaid (8)`.
- Disable "Eliminated in last GW" option when no completed gameweek exists yet (label it `Eliminated in last GW (none yet)`).
- Update the confirm dialog to show the selected count: `Send broadcast to N "<audience>" players?`.

### 3. Recent broadcasts list
- Map the new key to a friendly label ("Eliminated in last GW") in the Recent Broadcasts list.

## Out of scope
- No template changes; the existing `broadcast` email template is reused.
- No DB migration — derived from existing `picks` / `gameweeks` / `players` tables.
