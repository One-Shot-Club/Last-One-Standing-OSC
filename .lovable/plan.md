# Multi-entry flow

Let one buyer pay once and register several GW1 entries — for themselves or friends/family — all grouped under the original account owner.

## User flow

1. **Pick (GW1)** → **Details** → **Pay** screen now shows two CTAs:
  - **Just one entry — Pay** (existing flow, goes to payment options)
  - **Add another entry (for me or someone else)** (new — loops back to pick)
2. Clicking "Add another entry" returns to the **GW1 selection** page in "additional entry" mode.
3. After picking, a slimmed **Details** page asks **only for the entrant's full name** (or Name followed by 1,2,3 as an example if its their own picks. )(no email/phone — they inherit the owner's contact).
4. Returns to the **Pay** screen, which now lists every entry (owner + each additional), shows fee × count, and the same two CTAs. Repeat until they hit Pay.
5. Payment confirmation creates all players at once and fires a **single** confirmation email listing every entrant + their magic link.

## Data model

Add to `players`:

- `owner_player_id uuid null` — self-FK. Null = account owner. Set = sub-entry grouped under that owner.
- Index on `owner_player_id`.

Owner keeps email/phone. Sub-entries have `full_name` only; `email`/`phone` left null; they get their own `magic_token` (so each entry has its own pick link).

## Email aggregation

- **Entry confirmation** (sent once to the owner after payment): lists all entrants with name + magic-link button per entry. Also allow that if a person goes into their Magic link before the GW deadline they can change their selection as much as they want up until the deadline. 
- **Pick reminders / elimination / progression**: triggered per player. If `owner_player_id` is set, send to the owner's email but address the recipient by the sub-entry's name and include that entry's magic link. Group multiple due-today reminders for the same owner into a single digest email.

## Pages / files

- New route `/pick-additional?c=…&owner=<token>` — same GW1 picker UI, posts to a new flow that stashes pick + name in URL state, returns to `/pay`.
- New route `/details-additional?c=…&owner=<token>&t=<team>` — name-only form.
- `/pay` reworked to hold a list of pending entries in URL/sessionStorage, render summary, two CTAs, and on confirm create owner + all sub-entries in one server call.
- New server fn `joinCompetitionWithEntries({ owner, additionalEntries[] })` — single transaction-style insert; returns owner magic_token.
- Update `sendEntryConfirmation` to include all entries owned by the player.
- Update reminder/elimination/progression trigger queries to fan out per player but coalesce by owner email.

## Admin

Admin panel player list groups sub-entries under their owner (indented) and shows "Owner: &nbsp;" badge. Eliminations still operate per player.

## Out of scope

- Refunds/removing entries mid-flow (just "back to pick" overwrites the in-progress draft).
- Per-entry payment splitting — one combined fee.
- Changing existing single-entry players retroactively.

## Open question

For the **payment amount**: should the fee shown on the Pay screen multiply by entry count (e.g. €10 × 3 = €30) and the buyer pay the total via one Stripe/Revolut link? Assuming **yes** unless you say otherwise.