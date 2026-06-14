import * as React from 'react'
import { Section, Text, Img } from '@react-email/components'

export interface EmailThemeProp {
  primaryColor?: string
  accentColor?: string
  panelTextColor?: string
  metaTextColor?: string
  logoUrl?: string | null
  clubName?: string
}

export const colors = {
  bg: '#ffffff',
  panel: '#0e3a25',
  panelText: '#f8f3e3',
  gold: '#c9a84c',
  goldDark: '#a8862e',
  muted: '#7c7363',
  border: '#e5e0d2',
  text: '#1a1a1a',
}

export const fontStack = {
  display: '"Barlow Condensed", "Arial Narrow", Arial, sans-serif',
  body: '"DM Sans", Arial, sans-serif',
}

interface ResolvedTheme {
  primary: string
  accent: string
  panelText: string
  metaText: string
  logoUrl: string | null
  clubName: string
}

function resolve(theme?: EmailThemeProp): ResolvedTheme {
  return {
    primary: theme?.primaryColor || colors.panel,
    accent: theme?.accentColor || colors.gold,
    panelText: theme?.panelTextColor || colors.panelText,
    metaText: theme?.metaTextColor || '#cdbf9a',
    logoUrl: theme?.logoUrl ?? null,
    clubName: theme?.clubName || 'Last Man Standing',
  }
}

/**
 * Build a styles object themed to the tenant. Templates should call this
 * with their `theme` prop and use the returned `s` instead of the static
 * `styles` export.
 */
export function buildStyles(theme?: EmailThemeProp) {
  const t = resolve(theme)
  return {
    main: { backgroundColor: colors.bg, fontFamily: fontStack.body, color: colors.text, margin: 0, padding: 0 } as React.CSSProperties,
    container: { maxWidth: '560px', margin: '0 auto', padding: '24px 20px' } as React.CSSProperties,
    panel: { backgroundColor: t.primary, color: t.panelText, padding: '32px 28px', borderRadius: '10px' } as React.CSSProperties,
    eyebrow: { color: t.accent, textTransform: 'uppercase' as const, letterSpacing: '2px', fontSize: '11px', fontWeight: 700, margin: 0 },
    heading: { fontFamily: fontStack.display, color: t.panelText, fontSize: '28px', lineHeight: '1.1', margin: '8px 0 16px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.5px' } as React.CSSProperties,
    text: { color: t.panelText, fontSize: '15px', lineHeight: '1.6', margin: '0 0 14px' } as React.CSSProperties,
    meta: { color: t.metaText, fontSize: '13px', margin: '0 0 6px' } as React.CSSProperties,
    cta: {
      display: 'inline-block',
      backgroundColor: t.accent,
      color: '#0a0a0a',
      fontFamily: fontStack.display,
      fontWeight: 800,
      textTransform: 'uppercase' as const,
      letterSpacing: '1.5px',
      fontSize: '15px',
      padding: '14px 24px',
      borderRadius: '6px',
      textDecoration: 'none',
      marginTop: '8px',
    } as React.CSSProperties,
    ctaWrap: { textAlign: 'center' as const, padding: '8px 0 4px' } as React.CSSProperties,
    hr: { borderColor: 'rgba(255,255,255,0.12)', margin: '20px 0' } as React.CSSProperties,
    footer: { color: colors.muted, fontSize: '12px', textAlign: 'center' as const, padding: '16px 20px', marginTop: '12px' } as React.CSSProperties,
    pill: { display: 'inline-block', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', backgroundColor: `${t.accent}30`, color: t.accent, margin: '2px 4px 2px 0', fontWeight: 600 } as React.CSSProperties,
    pillUsed: { display: 'inline-block', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.06)', color: t.metaText, margin: '2px 4px 2px 0', textDecoration: 'line-through' } as React.CSSProperties,
    badge: { width: '28px', height: '28px', verticalAlign: 'middle', marginRight: '8px', borderRadius: '4px' } as React.CSSProperties,
    logo: { display: 'block', maxHeight: '64px', maxWidth: '180px', margin: '0 auto 16px', objectFit: 'contain' as const } as React.CSSProperties,
    brandText: { fontFamily: fontStack.display, color: t.primary, textAlign: 'center' as const, margin: '0 0 16px', fontSize: '20px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '1.5px' } as React.CSSProperties,
  }
}

// Static export retained for any legacy imports. Prefer buildStyles(theme).
export const styles = buildStyles()

export function Brand({ theme }: { theme?: EmailThemeProp }) {
  const t = resolve(theme)
  if (t.logoUrl) {
    return <Img src={t.logoUrl} alt={t.clubName} style={buildStyles(theme).logo} />
  }
  return <Text style={buildStyles(theme).brandText}>{t.clubName}</Text>
}

export function Footer({ clubName, theme }: { clubName?: string; theme?: EmailThemeProp }) {
  const t = resolve(theme)
  return (
    <Text style={buildStyles(theme).footer}>
      Sent by {clubName ?? t.clubName} via OneShotClub.
    </Text>
  )
}

export function Panel({ children, theme }: { children: React.ReactNode; theme?: EmailThemeProp }) {
  return <Section style={buildStyles(theme).panel}>{children}</Section>
}

export interface CompetitionStats {
  alive: number
  eliminated: number
  total: number
  picksPerWeek?: Array<{ week: number; count: number }>
}

export function StatsBlock({ stats, theme }: { stats?: CompetitionStats; theme?: EmailThemeProp }) {
  if (!stats) return null
  const t = resolve(theme)
  const s = buildStyles(theme)
  const cardWrap: React.CSSProperties = {
    display: 'inline-block',
    width: '48%',
    boxSizing: 'border-box',
    padding: '14px 16px',
    margin: '0 1% 8px 0',
    borderRadius: '10px',
    border: `1px solid ${t.panelText}22`,
    backgroundColor: 'rgba(255,255,255,0.04)',
    verticalAlign: 'top',
  }
  const cardLabel: React.CSSProperties = {
    color: t.metaText,
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    margin: '0 0 4px',
  }
  const cardValue: React.CSSProperties = {
    color: t.panelText,
    fontFamily: fontStack.display,
    fontSize: '28px',
    fontWeight: 800,
    lineHeight: 1,
    margin: 0,
  }
  const ppw = stats.picksPerWeek ?? []
  const maxCount = ppw.reduce((m, r) => Math.max(m, r.count), 0) || 1
  return (
    <Section style={{ margin: '18px 0 8px' }}>
      <div style={{ marginBottom: '6px' }}>
        <div style={cardWrap}>
          <Text style={cardLabel}>Alive</Text>
          <Text style={cardValue}>{stats.alive}</Text>
        </div>
        <div style={cardWrap}>
          <Text style={cardLabel}>Eliminated</Text>
          <Text style={cardValue}>{stats.eliminated}</Text>
        </div>
      </div>
      {ppw.length > 0 && (
        <Section
          style={{
            padding: '14px 16px',
            borderRadius: '10px',
            border: `1px solid ${t.panelText}22`,
            backgroundColor: 'rgba(255,255,255,0.04)',
            marginTop: '4px',
          }}
        >
          <Text style={{ ...s.meta, fontSize: '10px', letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 10px' }}>
            Picks per week
          </Text>
          {ppw.map((r) => {
            const pct = Math.round((r.count / maxCount) * 100)
            return (
              <div key={r.week} style={{ margin: '0 0 6px' }}>
                <div style={{ display: 'inline-block', width: '44px', color: t.metaText, fontSize: '11px', fontWeight: 700, letterSpacing: '1px' }}>
                  GW{r.week}
                </div>
                <div style={{ display: 'inline-block', width: 'calc(100% - 80px)', verticalAlign: 'middle', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '8px', backgroundColor: t.accent, borderRadius: '4px' }} />
                </div>
                <div style={{ display: 'inline-block', width: '32px', textAlign: 'right', color: t.panelText, fontSize: '12px', fontWeight: 700 }}>
                  {r.count}
                </div>
              </div>
            )
          })}
        </Section>
      )}
    </Section>
  )
}

export { React }
