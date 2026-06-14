## Goal

Remove unused legacy reminder templates and make the Progression + Pick Reminder emails use generic "Next Gameweek" wording instead of dynamic gameweek labels (e.g. "GW4").

## Changes

### 1. Delete legacy reminder templates
- Delete `src/lib/email-templates/reminder-1h.tsx`
- Delete `src/lib/email-templates/reminder-24h.tsx`
- Remove their imports and registry entries from `src/lib/email-templates/registry.ts` (the `reminder-24h` and `reminder-1h` keys). Active sends already use `pick-reminder`, so no trigger code changes are needed.

### 2. Progression email — drop gameweek names
In `src/lib/email-templates/progression.tsx`:
- Remove the `weekLabel` / `nextWeekLabel` props (and their preview data).
- Preview text: "You're through to the next gameweek."
- Eyebrow: "Through"
- Heading: "You're through, {firstName}"
- Body: "Congratulations — you've survived this gameweek. You're through to the next gameweek."
- Deadline label: "Next gameweek deadline"
- CTA button: "Make your next pick →"
- Subject: "You're through, {firstName} — make your next pick"

### 3. Pick Reminder email — drop gameweek names
In `src/lib/email-templates/pick-reminder.tsx`:
- Remove the `nextWeekLabel` prop (and preview data).
- Preview text: "Don't forget — make your next gameweek pick."
- Heading: "Pick your next gameweek team, {firstName}"
- Body: "You haven't made your next gameweek pick yet. Picks lock at the deadline below — no pick means you're out."
- CTA: "Make your pick now →" (unchanged)
- Subject: "Reminder, {firstName} — pick your next gameweek team"

### 4. Trigger call sites
`src/lib/email/triggers.server.ts` currently passes `weekLabel` / `nextWeekLabel` in `templateData` for both templates. Leave the call sites untouched — the templates will simply ignore the now-unused fields. No behavioural change needed in `admin-tasks.functions.ts` or `results-engine.server.ts`.

## Files touched

- delete: `src/lib/email-templates/reminder-1h.tsx`
- delete: `src/lib/email-templates/reminder-24h.tsx`
- edit: `src/lib/email-templates/registry.ts`
- edit: `src/lib/email-templates/progression.tsx`
- edit: `src/lib/email-templates/pick-reminder.tsx`