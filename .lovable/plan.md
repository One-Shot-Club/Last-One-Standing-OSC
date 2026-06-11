## Goal

Stop hiding the fixtures once a pick exists for the current gameweek. Always show the full fixture list, mark the player's current pick with a visible "Selected" marker, and let them swap to a different team any time before the deadline.

## What changes for the player

- The fixtures section is always rendered (no more "Your pick for GWx: …" replacement card).
- Their existing pick for the current week is pre-marked: highlighted border, a small "Your pick" badge on the team button, and used as the initial `selected` state.
- They can click any other (non-used, non-locked) team to change their selection.
- The lock-in button label adapts:
  - No existing pick → `Lock in {team} →`
  - Existing pick, no change → button disabled, label `Your pick is locked in — tap another team to change`
  - Existing pick, different team chosen → `Update pick to {team} →`
- After the deadline, all buttons are disabled and the current pick is shown with a "Locked" badge instead of "Your pick".
- Teams used in prior weeks stay greyed out + line-through (unchanged).

## Preview mode

- Same layout: fixtures visible, the synthetic player's "current week" pick (if any) is pre-marked. In preview, the lock-in button stays disabled with the existing "Lock-in disabled in preview" copy.
- Note: the current preview seeds picks for GW1–3 using the first three teams alphabetically (Arsenal, Aston Villa, Bournemouth). That's why Aston Villa currently looks tied to the selection — it's a *used* team from a prior week, greyed out. After this change, no team is auto-selected unless the synthetic player has a pick for the *current* preview week. To make the "change your pick" state visible in preview, seed one extra synthetic pick for the current preview week (e.g. the 4th team) so the preview shows the pre-marked state.

## Server change (small)

`submitPickV2` currently throws `"You already picked this week"` if a pick exists for the current week. Change it to:
- If a pick already exists for `(player_id, week_number)` and the deadline hasn't passed: `UPDATE` that row's `team` instead of inserting.
- Keep the "team already used in another week" check (compare against picks where `week != current week`).
- Keep the deadline + alive checks unchanged.
- Keep the "team not used" check — but exclude the current week's existing pick from the comparison.

No schema changes, no new server functions.

## Files

**Edited**

- `src/components/oneshot/NextGameweekView.tsx`
  - Remove the early-exit `alreadyPickedThisWeek` card.
  - Initialise `selected` from `picks.find(p => p.week === gameweek.week_number)?.team`.
  - In the fixtures section, render even when a pick exists; pass an `isCurrent` flag to `TeamButton` so the existing pick shows a "Your pick" / "Locked" badge and a stronger border.
  - Update the lock-in button label/disabled logic per the rules above; only call `onSubmit` when `selected !== existingPick`.
- `src/lib/gameweeks.functions.ts`
  - `submitPickV2`: switch to upsert-by-week semantics described above.
  - `getNextGameweekPreviewContext`: add a 4th synthetic pick for the current preview week so preview demonstrates the "change your pick" state.

## Out of scope

- No changes to history section, survival stats, top picks, eliminated screen, or email templates.
- No new routes or admin permissions.
- No change to how teams are marked as used across prior weeks.
