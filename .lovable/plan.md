# Edit Tenant UI

Lets platform admins edit any tenant's name, slug, branding, and contact info from the platform admin panel — no DB edits needed.

## What you'll be able to edit

From `/platform/admin`, click an "Edit" button on any tenant row to open an edit panel with:

**Identity (tenants table)**
- Name
- Slug (with format validation `^[a-z0-9-]+$`, uniqueness check)

**Branding & contact (tenant_settings table)**
- Logo URL
- Primary color, accent color (color pickers + hex input)
- Intro copy (textarea)
- Contact email, contact phone, WhatsApp link

Status (active/paused/archived) stays on the existing row buttons.

## How it works

1. **New server functions** in `src/lib/platform-admin.functions.ts`:
   - `getTenantForEdit({ tenantId })` — returns tenant + tenant_settings joined.
   - `updateTenant({ tenantId, name, slug, settings })` — validates slug, updates both tables, writes an `audit_logs` entry with the diff.
   - Both gated by `assertPlatformAdmin`.

2. **New component** `src/components/platform/EditTenantPanel.tsx`:
   - Modal/drawer (using existing `Card`/`Btn`/`Field` primitives from `@/components/oneshot/ui`).
   - Loads current values, lets you edit, saves, then triggers `refresh()` on the parent.
   - Color fields render a swatch preview; logo URL shows a small preview image.

3. **Wire-up in `platform.admin.tsx`**:
   - Add an "Edit" button next to each tenant row's existing status controls.
   - Manages `editingTenantId` state to open the panel.

## Technical notes

- Slug-change safety: if slug is used in URLs or links anywhere, updating it changes those URLs. The migration just updates the `tenants.slug` field; existing competition links remain valid because they're keyed by tenant_id, not slug. Magic tokens unchanged.
- `tenant_settings` row is upserted (some older tenants may lack one).
- All writes go through `supabaseAdmin` server-side; no client RLS changes needed.
- No new tables or columns — uses existing schema.

## Out of scope (can do later if you want)

- Logo file upload to Storage (this version takes a URL — paste a hosted image link).
- Editing `reminder_offsets` or `sponsor_assets` JSON (kept as DB-only for now).
- Tenant deletion.
