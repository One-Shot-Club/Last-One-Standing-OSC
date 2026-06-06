
## Restructure the join flow — 4 pages, Killeshin GAA branded

Rework the existing flow into the 4 pages you described. Pull club branding (Killeshin GAA) from the referenced project. Keep existing design tokens, Supabase schema (minor additions), fixtures, and admin panel.

### Page 1 — Landing (`/`)
Replaces current landing + `/join`.

- **Header band**: Killeshin GAA crest + "Killeshin GAA" club name, "Powered by OneShotClub" lockup beneath. Crest copied from the Killeshin project (`src/assets/killeshin-crest.png.asset.json`) into this project's assets.
- **Hero**: "€3,000 — Winner Takes All" as the dominant gold display number. "Entry €10" beneath. Pulled from `competitions.prize_pool` / `entry_fee`.
- **Capture form (inline)**: Full name, Email, Mobile. Primary CTA "Enter the Comp →".
- On submit, carry { name, email, phone } via search params to Page 2. No DB write yet.

### Page 2 — How It Works + Pick (`/how-it-works`)
- 4 short rules (Pick one team each week / Win to survive / Can't reuse a team / Last one standing wins the pot).
- Fixture list for Gameweek 1 — reuses the existing fixture-card UI. Sticky "LOCK IN [TEAM] →" CTA.
- On lock-in, carry { name, email, phone, team } forward to Page 3 via search params. Still no DB write.

### Page 3 — Payment (`/pay`)
- Order summary: Killeshin GAA, entry €10, selected Week 1 team.
- **Three payment buttons, always visible**: Stripe, Revolut, Payment Link.
  - If the corresponding link is configured on the competition, the button opens it in a new tab.
  - If not configured, the button opens a small inline "Set up payment link" panel where an admin PIN + URL can be entered; on submit, the link is saved to the competition row via a server fn and the button immediately becomes a live payment link. (No separate admin trip needed.)
- "I've Paid — Continue →" ghost button enabled after any payment button is tapped. On confirm:
  1. `joinCompetition` creates the player row (existing fn, unchanged).
  2. `submitPick` writes the Week 1 pick (existing fn, unchanged).
  3. Navigate to Page 4 with the player's `magic_token`.

### Page 4 — Thank You (`/welcome`)
Replaces `/confirmed`.
- Tick + "You're in, [first name]" + the team they locked in.
- **Join the WhatsApp Community** — primary button linking to `competitions.whatsapp_link` (hidden if not set; otherwise opens in new tab).
- Secondary: "Back to home".
- **Referral block removed** as requested.

### Database migration
Add nullable columns to `competitions`:
- `club_name text` (seed: "Killeshin GAA")
- `club_logo_url text` (seed: CDN URL of the copied crest)
- `revolut_link text`
- `payment_link text`
- `whatsapp_link text`

Update Demo Comp 2 seed: `name = "Killeshin GAA World Cup Fundraiser"`, `prize_pool = 3000`, `entry_fee = 10`, `club_name = "Killeshin GAA"`, `club_logo_url = <crest>`.

### New server function
- `setPaymentLink({ competitionId, pin, kind: "stripe"|"revolut"|"payment", url })` — PIN-protected update of one of the three link columns on `competitions`. Used by the inline "set up" panel on Page 3.

### Files
- Copy: Killeshin crest asset into `src/assets/killeshin-crest.png.asset.json`.
- New: `src/routes/how-it-works.tsx`, `src/routes/welcome.tsx`.
- Rewrite: `src/routes/index.tsx` (landing + capture form), `src/routes/pay.tsx` (3 payment buttons + inline setup).
- Delete: `src/routes/join.tsx`, `src/routes/pick.tsx`, `src/routes/confirmed.tsx`.
- Extend: `src/lib/oneshot.functions.ts` with `setPaymentLink`.
- Migration: 5 new columns + reseed of Demo Comp 2.

Ready to build on approval.
