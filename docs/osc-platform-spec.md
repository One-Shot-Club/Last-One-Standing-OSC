# OneShotClub — Platform Rebuild Specification
**Version:** 1.0 · **Date:** June 2026  
**For:** Donnacha Holmes (Technical Director)  
**From:** Paul (Commercial Director)  
**Purpose:** Full specification for migrating off Lovable to a production-grade, self-serve multi-tenant SaaS platform.

---

## 1. Product Vision

OneShotClub is a self-serve fundraising competition platform built exclusively for Irish sports clubs. A club admin signs up, connects their Stripe account, configures a competition, and shares a link — that's it. Players enter and pay online. OSC takes a 3% platform fee automatically via Stripe Connect. Neither OSC nor the club treasurer manually touches money.

The target experience is closer to Entrypoint.club than a bespoke agency build: fast, self-explanatory, and repeatable across club types (GAA, soccer, rugby).

---

## 2. Brand & Design Tokens

Derived from oneshotclub.ie. All UI must be consistent with the live site.

```
--osc-green-dark:    #1A3A2A   /* primary brand dark green */
--osc-green-mid:     #2D5A3D   /* nav, buttons */
--osc-green-light:   #3D7A52   /* hover states */
--osc-gold:          #F5A623   /* accent — "ONE" in logo, CTAs */
--osc-gold-light:    #FFB84D   /* hover on gold elements */
--osc-cream:         #F5F0E8   /* page background */
--osc-white:         #FFFFFF
--osc-text-dark:     #1A1A1A
--osc-text-muted:    #5A5A5A
--osc-border:        #D4C9B8
--osc-error:         #C0392B
--osc-success:       #27AE60
```

**Typography**
- Display / headings: `Anton` or `Bebas Neue` (matches oneshotclub.ie hero treatment — all-caps, condensed)
- Body: `Inter` (clean, readable at small sizes)
- Mono / data: `JetBrains Mono` (entry counts, amounts, stats)

**Border radius:** `6px` standard, `4px` inputs, `999px` pill badges  
**Shadows:** Subtle — `0 2px 8px rgba(0,0,0,0.08)`

---

## 3. Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Framework | Next.js 14 (App Router) | SSR, API routes, file-based routing |
| Styling | Tailwind CSS + shadcn/ui | Tailwind config seeded with OSC tokens above |
| Auth | Supabase Auth | Email/password for club admins; magic link for scorers |
| Database | Supabase (Postgres + RLS) | See Section 6 for schema |
| Payments | Stripe Connect (Express) | Clubs onboard via Stripe OAuth; OSC never holds funds |
| Email | Resend | Entry confirmations, result notifications |
| Hosting | Vercel | Existing workflow — no change |
| Repo | GitHub | Existing workflow — no change |
| Dev tool | Cursor | AI-assisted build |

**Do not use Lovable for any new work.** Export the existing LMS prototype from Lovable to GitHub as a reference, lift React component logic and Supabase query patterns into the new codebase, rewrite routing and auth to Next.js App Router patterns.

---

## 4. URL & Routing Structure

```
/                              → Marketing homepage (oneshotclub.ie — existing, keep)
/signup                        → Club registration
/login                         → Club admin login
/onboarding                    → Stripe Connect setup (post-signup step)

/dashboard                     → Club admin home
/dashboard/competitions        → List all competitions
/dashboard/competitions/new    → Create competition wizard
/dashboard/competitions/[id]   → Manage a specific competition
/dashboard/competitions/[id]/entries    → View + export entries
/dashboard/competitions/[id]/results   → Post and manage results
/dashboard/payouts             → Payout history, Stripe dashboard link
/dashboard/settings            → Club profile, logo, contact, Stripe re-link

/[club-slug]/                  → Public club landing (optional, future)
/[club-slug]/[comp-slug]       → PUBLIC entry page (no login required)
/[club-slug]/[comp-slug]/confirmation   → Post-payment confirmation
/[club-slug]/[comp-slug]/leaderboard   → Public leaderboard (live results)

/api/webhooks/stripe           → Stripe webhook handler (service role only)
```

---

## 5. Authentication Design

### Club Admin (email/password)
- Sign up with email + password via Supabase Auth
- On first login after email verification → redirect to `/onboarding` (Stripe Connect)
- JWT includes `app_metadata.club_id` and `app_metadata.role: "admin"`
- Session persists via Supabase SSR cookie (`@supabase/ssr`)

### Club Scorer (magic link)
- Admin invites scorer from `/dashboard/settings`
- Supabase sends magic link email
- On click → session created, JWT includes `role: "scorer"`, scoped to same `club_id`
- Scorer can only access `/dashboard/competitions/[id]/results`

### Entrants (public, no account)
- No login required to enter a competition
- Entry confirmed via Resend email (contains entry ID and reference)
- Results page is fully public (`/[club-slug]/[comp-slug]/leaderboard`)

---

## 6. Database Schema (Supabase / Postgres)

All tables use Row Level Security (RLS). Every table with club-scoped data enforces:
```sql
club_id = (auth.jwt() -> 'app_metadata' ->> 'club_id')::uuid
```

### `clubs`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
name            text NOT NULL
slug            text UNIQUE NOT NULL          -- url-safe: "naomh-eoin-sligo"
county          text
contact_email   text
contact_phone   text
logo_url        text
stripe_account_id text                        -- set after Stripe Connect onboarding
stripe_onboarded  boolean DEFAULT false
subscription_tier text DEFAULT 'starter'      -- for future tier logic
created_at      timestamptz DEFAULT now()
```

### `club_users`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE
club_id     uuid REFERENCES clubs(id) ON DELETE CASCADE
role        text CHECK (role IN ('admin', 'scorer', 'viewer'))
created_at  timestamptz DEFAULT now()
UNIQUE (user_id, club_id)
```

### `competitions`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
club_id         uuid REFERENCES clubs(id) ON DELETE CASCADE
name            text NOT NULL
slug            text NOT NULL                 -- scoped to club, not globally unique
type            text NOT NULL                 -- 'last_man_standing', 'golf_classic', 'prediction'
format          jsonb                         -- type-specific config (see Section 7)
entry_fee       numeric(10,2) NOT NULL
max_entries     integer
prize_pool      numeric(10,2)
prize_config    jsonb                         -- {first: 0.5, second: 0.3, third: 0.2}
start_date      date
end_date        date
status          text DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'closed', 'paid_out'))
insurance_req   boolean DEFAULT false
created_at      timestamptz DEFAULT now()
UNIQUE (club_id, slug)
```

### `entries`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
competition_id      uuid REFERENCES competitions(id) ON DELETE CASCADE
competitor_name     text NOT NULL
email               text NOT NULL
phone               text
selections          jsonb                     -- type-specific picks
payment_intent_id   text                      -- Stripe PaymentIntent ID
payment_status      text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'void', 'refunded'))
amount_paid         numeric(10,2)
entry_number        integer                   -- sequential per competition, set via trigger
created_at          timestamptz DEFAULT now()
```

### `results`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
competition_id  uuid REFERENCES competitions(id) ON DELETE CASCADE
round           integer                       -- for LMS: week number; for golf: round
entry_id        uuid REFERENCES entries(id)
outcome         text                          -- 'survived', 'eliminated', 'winner'
score           numeric                       -- for golf/prediction scoring
posted_by       uuid REFERENCES auth.users(id)
posted_at       timestamptz DEFAULT now()
notes           text
```

### `payouts`
```sql
id                  uuid PRIMARY KEY DEFAULT gen_random_uuid()
competition_id      uuid REFERENCES competitions(id)
stripe_transfer_id  text
amount              numeric(10,2)
currency            text DEFAULT 'eur'
recipient_entry_id  uuid REFERENCES entries(id)
status              text DEFAULT 'pending'
created_at          timestamptz DEFAULT now()
```

### RLS Policies (key examples)

```sql
-- clubs: admin can read/update their own club
CREATE POLICY "club_admin_own" ON clubs
  FOR ALL USING (id = (auth.jwt()->'app_metadata'->>'club_id')::uuid);

-- competitions: public can SELECT live; admin can do all on their club
CREATE POLICY "competitions_public_read" ON competitions
  FOR SELECT USING (status = 'live');

CREATE POLICY "competitions_admin_all" ON competitions
  FOR ALL USING (club_id = (auth.jwt()->'app_metadata'->>'club_id')::uuid);

-- entries: public can INSERT (paying entrant); admin can SELECT all for their club
CREATE POLICY "entries_public_insert" ON entries
  FOR INSERT WITH CHECK (
    competition_id IN (SELECT id FROM competitions WHERE status = 'live')
  );

-- results: public SELECT; scorer/admin INSERT
CREATE POLICY "results_public_read" ON results FOR SELECT USING (true);
CREATE POLICY "results_scorer_insert" ON results
  FOR INSERT WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') IN ('admin', 'scorer')
  );
```

---

## 7. Competition Types & Format Config

The `competitions.format` JSONB field stores type-specific configuration.

### Last Man Standing (`type: 'last_man_standing'`)
```json
{
  "league": "premier_league",
  "season": "2026-27",
  "allow_multiple_entries": true,
  "max_entries_per_person": 3,
  "weekly_picks": true,
  "pick_deadline_hours_before_kickoff": 1
}
```
Player selects one team to win each week. Miss a pick or pick a loser → eliminated.

### Golf Classic (`type: 'golf_classic'`)
```json
{
  "format": "stableford",
  "holes": 18,
  "handicap_allowance": 0.85,
  "rounds": 1,
  "scoring": "gross_or_nett"
}
```

### Prediction Competition (`type: 'prediction'`)
```json
{
  "questions": [
    {"id": "q1", "text": "Who wins the All-Ireland?", "type": "team_select", "points": 5},
    {"id": "q2", "text": "Top scorer?", "type": "player_select", "points": 3}
  ],
  "reveal_date": "2026-09-20"
}
```

---

## 8. Stripe Connect Integration

OSC uses **Stripe Connect Express** — clubs get their own Stripe accounts, OSC charges a platform fee on each transaction. OSC never holds funds.

### Onboarding Flow

```
1. Club signs up → account created in Supabase
2. POST /api/stripe/connect/create-link
   → Stripe: stripe.accountLinks.create({ type: 'account_onboarding' })
   → Redirect club to Stripe's hosted onboarding
3. Stripe redirects back to /onboarding/complete?account_id=acct_xxx
4. Store stripe_account_id on clubs table, set stripe_onboarded = true
5. Club lands on /dashboard — ready to create competitions
```

### Payment Flow (Entrant)

```
1. Entrant submits entry form on /[club-slug]/[comp-slug]
2. POST /api/entries/create
   → Validate: competition is live, under max_entries
   → Create entry record (status: pending)
   → stripe.paymentIntents.create({
       amount: entry_fee_in_cents,
       currency: 'eur',
       application_fee_amount: Math.round(entry_fee_in_cents * 0.03),
       transfer_data: { destination: club.stripe_account_id }
     })
   → Return client_secret to frontend
3. Frontend: Stripe.js confirmPayment()
4. Redirect to /[club-slug]/[comp-slug]/confirmation
5. Stripe webhook → payment_intent.succeeded
   → Update entry.payment_status = 'paid'
   → Trigger Resend confirmation email
```

### Webhook Handler (`/api/webhooks/stripe`)

```
Events to handle:
- payment_intent.succeeded       → mark entry paid, send confirmation
- payment_intent.payment_failed  → mark entry void, notify entrant
- account.updated                → sync stripe_onboarded status
- payout.paid                    → log to payouts table
```

Always verify webhook signature with `stripe.webhooks.constructEvent()`.

---

## 9. Key UI Screens

### 9.1 Club Signup (`/signup`)
- Fields: Club name, county (dropdown), admin name, email, password
- On submit → Supabase `signUp()` → verification email
- Copy: "Get your club live in under 10 minutes."
- Post-verify → redirect `/onboarding`

### 9.2 Stripe Onboarding (`/onboarding`)
- Single-purpose screen: explain what Stripe Connect is, why it matters
- Copy: "Payments go directly to your club account. We never touch your money."
- Primary CTA: "Connect your club's Stripe account →"
- If stripe_onboarded already: skip to `/dashboard`

### 9.3 Club Dashboard (`/dashboard`)
- Header: club logo (if set), club name, "Your competitions"
- Stats row: Active competitions / Total entries this month / Revenue this month
- Competition list: name, type, status badge, entry count, quick actions (View / Share / Close)
- Empty state: "No competitions yet. [Create your first →]"

### 9.4 Create Competition Wizard (`/dashboard/competitions/new`)
Three steps. No page reloads — single-page wizard with step indicator.

**Step 1 — Type**
- Card grid: Last Man Standing / Golf Classic / Prediction Competition
- Each card has icon, title, 1-line description, example ("€5 per entry, 64 players")

**Step 2 — Details**
- Name (auto-suggested based on type + club name)
- Entry fee (€ input, live preview: "3% = €0.15 · Club receives €4.85")
- Max entries (optional)
- Start/end dates
- Prize split (simple toggle: Winner Takes All / 50/30/20 / Custom)
- Type-specific fields (league selector for LMS, format for Golf, etc.)

**Step 3 — Review & Publish**
- Summary card of all settings
- Share link preview: `oneshotclub.ie/[club-slug]/[comp-slug]`
- Toggle: Save as Draft / Publish Now
- On publish: copy link to clipboard, show WhatsApp share button

### 9.5 Public Entry Page (`/[club-slug]/[comp-slug]`)
This is the high-traffic page. Optimise for mobile.

- Club logo + competition name at top
- Entry count ticker: "47 entered · 53 spots left"
- Entry form: Name, Email, Phone (optional), type-specific selections (team picker for LMS, etc.)
- Stripe Payment Element (embedded, not redirect)
- Submit: "Enter Now — €[fee]"
- T&Cs checkbox with link
- Below fold: How it works (3 steps), FAQ accordion

### 9.6 Public Leaderboard (`/[club-slug]/[comp-slug]/leaderboard`)
- Real-time via Supabase Realtime subscription on `results` table
- For LMS: grid of all entrants, green/red/grey status per week
- For Prediction: ranked table with points
- For Golf: scorecard-style leaderboard
- No login required to view

### 9.7 Results Entry (`/dashboard/competitions/[id]/results`)
- Accessible to admin and scorer roles
- LMS: weekly round form — select result for each fixture, auto-eliminates entrants who picked the loser
- Golf: scorecard input per player
- Prediction: mark correct/incorrect per question, auto-scores

---

## 10. Email Templates (Resend)

All emails use OSC branding: dark green header, gold accent, white body, Inter font.

| Trigger | Subject | Content |
|---------|---------|---------|
| Entry confirmed | "You're in — [Competition Name]" | Name, entry ref, selections summary, leaderboard link |
| Entry failed payment | "Entry not completed — [Competition Name]" | What happened, retry link |
| Round result posted | "Week [N] results — [Competition Name]" | Survived/eliminated status, leaderboard link |
| Winner confirmed | "🏆 [Competition Name] — Winner!" | Congratulations, prize info, payout timeline |
| Club invite (scorer) | "You've been added to [Club Name] on OneShotClub" | Magic link, what access they have |

---

## 11. LMS Migration from Lovable

### Steps for Donnacha:
1. In Lovable, go to project settings → Export to GitHub
2. Clone the exported repo locally
3. Identify and copy:
   - `/src/components/` — React component JSX for team picker, entry form, leaderboard grid
   - `/src/lib/supabase.js` — Supabase client setup and query patterns
   - Any Tailwind config or custom CSS
4. Do NOT carry over:
   - Routing (rewrite for Next.js App Router)
   - Auth handling (replace with Supabase SSR pattern)
   - Any Lovable-generated wrappers or config files
5. Rebuild LMS as the first competition type in the new platform, using lifted components as the base

Expected time saving vs. from-scratch: ~30–40% on the LMS screens.

---

## 12. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-side only, never exposed to client

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
OSC_PLATFORM_FEE_PERCENT=3

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@oneshotclub.ie

# App
NEXT_PUBLIC_APP_URL=https://oneshotclub.ie
```

---

## 13. Build Sequence (Recommended)

Ship in this order to unlock commercial onboarding ASAP:

| Phase | What | Target |
|-------|------|--------|
| 1 | Auth (signup, login, session, RLS) | Week 1 |
| 2 | Stripe Connect onboarding + dashboard shell | Week 1–2 |
| 3 | Create Competition wizard (LMS first) | Week 2 |
| 4 | Public entry page + Stripe payment flow | Week 2–3 |
| 5 | Webhook handler + entry confirmation email | Week 3 |
| 6 | Results entry + public leaderboard (Realtime) | Week 3–4 |
| 7 | Golf Classic & Prediction types | Week 4–5 |
| 8 | Payout dashboard, settings, scorer invites | Week 5 |

**Hard deadline for Phase 1–5: August 9** (one week before Premier League opener August 16).

---

## 14. Out of Scope (v1)

- White-label / custom domains per club
- Native mobile app
- Cash payment / offline entry recording
- County board / federation accounts
- Automated prize payouts (v1: manual trigger by OSC; v2: automate)
- SMS notifications
- Public club directory / OSC marketplace

---

## 15. Open Questions for Donnacha

1. **Slug generation:** Auto-generate `club.slug` from club name on signup (kebab-case), or let admin choose? Recommend: auto-generate with edit option.
2. **Multi-entry LMS:** How to handle the same email entering 3 times? Separate entry records with a `parent_entry_id`? Or `entries.entry_number` per email?
3. **Stripe Connect type:** Express (recommended — simpler onboarding) or Standard? Express means club sees Stripe-hosted dashboard; Standard means more control but more compliance overhead for OSC.
4. **Magic link vs password for scorers:** Supabase magic link simplest — confirm that's the preference.
5. **Lovable export:** Do this immediately and share the GitHub repo link so component lifting can begin in parallel with infra setup.
