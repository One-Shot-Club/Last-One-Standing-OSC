// Server-only: build a per-tenant theme object for emails. Pulled from
// tenant_settings.logo_url / primary_color / accent_color. Falls back to
// the OneShotClub house palette when a tenant hasn't set theirs.
import { supabaseAdmin } from '@/integrations/supabase/client.server'

export interface EmailTheme {
  primaryColor: string   // panel background
  accentColor: string    // CTA + eyebrow
  panelTextColor: string // contrast text on primary
  metaTextColor: string  // muted text on primary
  logoUrl: string | null // absolute URL or null
  clubName: string
  fromName: string       // display name in From header
}

const DEFAULT_PRIMARY = '#0e3a25'
const DEFAULT_ACCENT = '#c9a84c'
const DEFAULT_PANEL_TEXT = '#f8f3e3'
const DEFAULT_META_TEXT = '#cdbf9a'

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function safeHex(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback
  const trimmed = input.trim()
  return HEX_RE.test(trimmed) ? trimmed : fallback
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  const norm = [r, g, b].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2]
}

function appBaseUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.PUBLIC_APP_URL ||
    'https://last-one-standing.oneshotclub.ie'
  ).replace(/\/+$/, '')
}

function absoluteLogoUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  if (raw.startsWith('/')) return `${appBaseUrl()}${raw}`
  return raw
}

/**
 * Load and resolve the email theme for a competition's tenant.
 * Always returns a usable theme (defaults filled in).
 */
export async function loadEmailThemeForCompetition(
  competitionId: string,
): Promise<EmailTheme> {
  const { data: comp } = await supabaseAdmin
    .from('competitions')
    .select('tenant_id, club_name, name')
    .eq('id', competitionId)
    .maybeSingle()

  const clubName = (comp?.club_name || comp?.name || 'Last Man Standing').trim()
  let logoUrl: string | null = null
  let primary = DEFAULT_PRIMARY
  let accent = DEFAULT_ACCENT
  let panelTextOverride: string | null = null
  let metaTextOverride: string | null = null

  if (comp?.tenant_id) {
    const { data: settings } = await supabaseAdmin
      .from('tenant_settings')
      .select('logo_url, primary_color, accent_color, panel_text_color, meta_text_color')
      .eq('tenant_id', comp.tenant_id)
      .maybeSingle()
    if (settings) {
      const s = settings as Record<string, string | null>
      logoUrl = absoluteLogoUrl(s.logo_url ?? null)
      primary = safeHex(s.primary_color, DEFAULT_PRIMARY)
      accent = safeHex(s.accent_color, DEFAULT_ACCENT)
      if (s.panel_text_color && HEX_RE.test(s.panel_text_color.trim())) {
        panelTextOverride = s.panel_text_color.trim()
      }
      if (s.meta_text_color && HEX_RE.test(s.meta_text_color.trim())) {
        metaTextOverride = s.meta_text_color.trim()
      }
    }
  }

  // Pick a readable text colour on top of the chosen primary when not overridden.
  const dark = luminance(primary) < 0.5
  const panelTextColor = panelTextOverride ?? (dark ? DEFAULT_PANEL_TEXT : '#0a0a0a')
  const metaTextColor = metaTextOverride ?? (dark ? DEFAULT_META_TEXT : 'rgba(0,0,0,0.55)')

  return {
    primaryColor: primary,
    accentColor: accent,
    panelTextColor,
    metaTextColor,
    logoUrl,
    clubName,
    fromName: clubName,
  }
}
