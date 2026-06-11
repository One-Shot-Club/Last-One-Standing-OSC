## Route map (current)

### Public / marketing
- **`/`** — Hard redirect to `/oneshotclub`. No UI of its own.
- **`/oneshotclub`** (`$tenantSlug/` with slug `oneshotclub`) — **Master tenant landing.** Primary access to the master tenant; lists all live clubs and is where global brand edits should originate and cascade to child tenants.
- **`/[club-slug]`** (e.g. `/killeshin-gaa`, `/st-josephs-afc`) — Tenant landing + entry form. Player enters name / email (or "Offline Player") / phone. Shows tenant logo + blurred background.
- **`/how-it-works`** — Step 2 of the join flow. Shows the rules and Gameweek 1 fixtures so the player picks their first team before paying.
- **`/pay`** — Step 3 of the join flow. Records the entry (`joinCompetition`) and shows the club's payment link (Stripe / Revolut / manual).
- **`/welcome`** — Step 4 of the join flow. Confirmation screen with magic-link deep link for future weeks.
- **`/auth`** — Supabase Auth sign-in (platform admins + tenant members). Google + email.
- **`/unsubscribe`** — Email-link landing page to confirm unsubscribe.

### Player (magic-token, no auth)
- **`/pick?token=…`** — The live weekly pick page. Renders `NextGameweekView`: survival banner, full fixture list, prior-picks history, current pick marker, lock-in / update button. This is the canonical per-week page.

### Club admin (PIN-protected, per tenant)
- **`/[club-slug]/admin`** — Club admin PIN login for that specific tenant. Issues a club admin session.
- **`/admin/panel`** — The full club admin console (entries, payments, gameweeks, results, broadcasts, audit log). Opened after PIN login.
- **`/admin/next-gameweek-preview`** — UI preview of what `/pick` will show players for the upcoming gameweek. Used by club admins to sanity-check fixtures / deadline / messaging before publishing.

### Platform admin (Supabase Auth)
- **`/dashboard`** (`_authenticated/dashboard`) — Landing for any signed-in tenant member; lists tenants you belong to.
- **`/platform/admin`** (`_authenticated/platform/admin`) — **Platform admin console.** Create new tenants, run the activation wizard (branding, logo, background, fixtures), edit branding, pause / archive, open live URL, manage platform admins.

### Server / utility routes (not user-facing pages)
- **`/api/public/tenant-assets/*`** — Proxy that serves private tenant logo / background uploads.
- **`/api/public/cron/check-reminders`** — Cron endpoint that sends 24h / 1h pick reminders.
- **`/email/unsubscribe`** — JSON endpoint backing the `/unsubscribe` page.
- **`/lovable/email/*`** — Internal email queue / suppression / preview endpoints (Lovable Email infra).

---

## Legacy / duplicated routes to remove

These no longer carry their own purpose and are superseded by newer routes:

1. **`/admin` (`src/routes/admin.index.tsx`)** — A thin redirect that just sends signed-in users to `/dashboard` and otherwise links to `/auth`. The footer note ("Club admins should use `/[your-club]/admin`") is already documented elsewhere. **Remove**; point any remaining links straight to `/auth`.
2. **`/gw2` (`src/routes/gw2.tsx`)** — Gameweek-2-specific pick page from before `/pick` was generalised. `/pick` now handles every gameweek via `getPickContext` + `NextGameweekView`. **Remove**; any stale links should be rewritten to `/pick?token=…`.
3. **`/welcome`'s "Open Gameweek 2" link** (if it points at `/gw2`) — update to `/pick` as part of the `/gw2` removal.

Kept (looks like a duplicate but isn't):
- **`/admin/panel` vs `/[club-slug]/admin`** — `/[club-slug]/admin` is the PIN login screen; `/admin/panel` is the full console you land in after login. Different jobs, both still needed. (Optional follow-up: nest the panel under `/[club-slug]/admin/panel` so the URL reflects the tenant — flagged but not in this change.)

---

## What this plan delivers

- Updates `.lovable/plan.md` to the route inventory above so you have a single editable reference page (visible in the right-hand plan view you're currently using).
- Deletes `src/routes/admin.index.tsx` and `src/routes/gw2.tsx`.
- Searches the codebase for any `<Link to="/admin">`, `nav({ to: "/admin" })`, or `/gw2` references and rewrites them to `/auth` and `/pick` respectively (notably the `nav({ to: "/admin" })` fallback inside `admin.next-gameweek-preview.tsx` and the welcome / email templates if they link to `/gw2`).
- Regenerates `routeTree.gen.ts` via the Vite plugin (automatic on next dev run).

## Out of scope

- No DB / schema changes.
- No change to `/admin/panel` location (flagged as a possible future move under the tenant slug).
- No change to the master-tenant cascade behaviour itself — just documenting that `/oneshotclub` is the source of truth.
