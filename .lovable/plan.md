## Goal
Make the broadcast + audience selector easier to find by giving it its own top-level tab in the admin panel, instead of being buried inside the Emails tab.

## Changes (single file: `src/routes/admin.panel.tsx`)

1. **Add a new tab key** `"broadcast"` to the `Tab` union and to the visible `tabs` array, placed right after `"emails"` so the order is:
   `players, entries, picks, gameweeks, teams, stats, emails, broadcast`.

2. **Extract** the existing Broadcast card (the "SEND MESSAGE" card with the Audience dropdown) and the "Recent broadcasts" card from the `Emails` component into a new `Broadcast` component in the same file. It reuses the same props (`compId`, `pin`) and the same server functions (`broadcastMessage`, `getBroadcastAudienceCounts`, `listBroadcasts`) — no server-side changes.

3. **Render** `{tab === "broadcast" && <Broadcast compId={compId!} pin={pin!} />}` alongside the other tab renderers.

4. **Emails tab** keeps the email template editor / preview / test-send UI but no longer contains the broadcast composer.

## Out of scope
- No DB migration.
- No server function changes.
- No template changes.
- No styling overhaul — the new tab reuses existing `Card` / `Field` / `Btn` styles.

## Result
Admin lands on `/admin/panel`, clicks the **Broadcast** tab, and sees the audience selector (with live counts) + subject/body + recent broadcasts as the only content on that tab.
