## Goal

Keep email simple and predictable:

- **1 automated email** — Entry Confirmation (fires after payment, already works)
- **3 manual bulk sends** — surfaced as Tasks in the Tenant Admin Panel after each gameweek
- All emails **branded per tenant** (logo + primary/accent colours + from-name)

## What stays vs what changes


| Email                                              | Today                    | After plan                                                |
| -------------------------------------------------- | ------------------------ | --------------------------------------------------------- |
| Entry Confirmation                                 | Auto on entry            | Auto on entry (unchanged trigger) — re-skinned per tenant |
| Progression ("You're through — make GW{n+1} pick") | Auto from results engine | **Manual bulk** from Admin Tasks                          |
| Elimination ("Sorry, thanks for taking part")      | Auto from results engine | **Manual bulk** from Admin Tasks                          |
| Reminder ("Don't forget your pick")                | Auto cron (24h + 1h)     | **Manual bulk** from Admin Tasks; cron disabled           |
| reminder-24h, reminder-1h templates                | 2 files                  | Collapse to 1 `pick-reminder` template                    |
| broadcast                                          | Exists                   | Keep as-is (ad-hoc) What is "Broadcast" for?              |


## Per-tenant branding

Thread tenant theme into every email:

- **Logo** — `tenant_settings.logo_url` → header `<Img>` (replaces hardcoded "OneShotClub · Last Man Standing" wordmark)
- **Primary colour** — `tenant_settings.primary_color` → panel background (replaces `#0e3a25`)
- **Accent colour** — `tenant_settings.accent_color` → CTA button + eyebrow text (replaces `#c9a84c`)
- **Club name** — from `competitions.club_name` (already wired) → also drives the **From name**: `Killeshin GAA <notify@oneshotclub.ie>` — same verified sender, per-tenant display name only. No DNS work per club.

Body background stays `#ffffff` (email-client requirement). Light/dark text auto-picked from primary colour luminance so light-themed tenants stay readable. 

## Admin Panel: Gameweek Tasks

After results are saved for a gameweek, the results engine **stops sending emails** and instead writes a row to a new `email_tasks` table for each pending bulk send. The Admin Panel grows a "Tasks" badge/section showing:

```text
GW3 results saved · 2 Aug
┌──────────────────────────────────────────────────────────┐
│ ☐ Send "You're Through" to 24 survivors      [Preview] [Send] │
│ ☐ Send "Sorry you're out" to 18 eliminated   [Preview] [Send] │
└──────────────────────────────────────────────────────────┘

GW4 opens · deadline Sat 30 Aug 13:30
┌──────────────────────────────────────────────────────────┐
│ ☐ Send pick reminder to 24 players           [Preview] [Send] │
└──────────────────────────────────────────────────────────┘
```

Each task:

- Preview → renders the template with sample data in a dialog
- Send → calls a server fn that loops the recipient list, enqueues one email per player (idempotency key `task-{taskId}-{playerId}` so re-clicking is safe), marks the task `sent_at`
- Shows sent count + timestamp once done

## Files

**New**

- `supabase/migrations/*` — `email_tasks` table (tenant_id, gameweek_id, kind: 'progression'|'elimination'|'reminder', recipient_count, sent_at, sent_by) + GRANTs + RLS
- `src/lib/email-templates/pick-reminder.tsx` — merged reminder template
- `src/lib/email/tenant-theme.server.ts` — loads tenant_settings, builds `{ logoUrl, primaryColor, accentColor, fromName }` and passes into every `templateData`
- `src/lib/admin-tasks.functions.ts` — `listTasks`, `runTask` (PIN-gated)
- `src/components/admin/GameweekTasks.tsx` — UI section in admin panel

**Edited**

- `src/lib/email-templates/_shared.tsx` — accept `theme` prop, replace hardcoded colours/wordmark; helper for contrast text colour
- `src/lib/email-templates/{entry-confirmation,progression,elimination}.tsx` — consume theme
- `src/lib/email/triggers.server.ts` — inject theme into every `templateData`; `sendProgression`/`sendElimination`/`sendReminder` become callable by the task runner over a list
- `src/lib/email/send.server.ts` — set per-tenant `fromName` when enqueueing
- `src/lib/results-engine.server.ts` — **remove** direct `sendElimination`/`sendProgression` calls; instead `INSERT INTO email_tasks` one row per kind
- `src/routes/api/public/cron/check-reminders.ts` — disable (or delete) the cron; reminders are manual now
- `src/routes/admin.panel.tsx` — add `GameweekTasks` section above existing tabs

**Untouched**

- Entry confirmation trigger in `src/lib/oneshot.functions.ts` (stays automated)
- `broadcast` template
- Email infrastructure (pgmq queue, send route, suppression, unsubscribe)

## Technical notes

- "Manual" still uses the existing pgmq queue — admin click enqueues N messages and the `/lovable/email/queue/process` cron drains them at ~120/min. No new sending infra.
- Idempotency keys ensure double-clicking "Send" never duplicates an email.
- From-name override: pass `fromName` through `enqueueTemplatedEmail` → set when building the Resend/Lovable send payload as `"{clubName} <notify@oneshotclub.ie>"`.
- Branding colours validated server-side (hex regex) before injection into inline styles to prevent CSS injection.

## Out of scope

- Per-tenant verified domains (would need DNS per club — deferred)
- Automated reminders (cron) — disabled per your decision; can be re-enabled later by flipping the task to auto-send
- Marketing/newsletter sends (not supported by Lovable Emails by policy)