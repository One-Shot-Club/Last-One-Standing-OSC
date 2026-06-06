import * as React from 'react'
import { Body, Container, Section, Text, Link, Hr, Heading, Img } from '@react-email/components'

export const colors = {
  bg: '#ffffff',
  panel: '#0e3a25',      // dark green
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

export const styles = {
  main: { backgroundColor: colors.bg, fontFamily: fontStack.body, color: colors.text, margin: 0, padding: 0 } as React.CSSProperties,
  container: { maxWidth: '560px', margin: '0 auto', padding: '24px 20px' } as React.CSSProperties,
  panel: { backgroundColor: colors.panel, color: colors.panelText, padding: '32px 28px', borderRadius: '10px' } as React.CSSProperties,
  eyebrow: { color: colors.gold, textTransform: 'uppercase' as const, letterSpacing: '2px', fontSize: '11px', fontWeight: 700, margin: 0 },
  heading: { fontFamily: fontStack.display, color: colors.panelText, fontSize: '28px', lineHeight: '1.1', margin: '8px 0 16px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.5px' } as React.CSSProperties,
  text: { color: colors.panelText, fontSize: '15px', lineHeight: '1.6', margin: '0 0 14px' } as React.CSSProperties,
  meta: { color: '#cdbf9a', fontSize: '13px', margin: '0 0 6px' } as React.CSSProperties,
  cta: {
    display: 'inline-block',
    backgroundColor: colors.gold,
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
  pill: { display: 'inline-block', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', backgroundColor: 'rgba(201,168,76,0.18)', color: colors.gold, margin: '2px 4px 2px 0', fontWeight: 600 } as React.CSSProperties,
  pillUsed: { display: 'inline-block', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.06)', color: '#8a8473', margin: '2px 4px 2px 0', textDecoration: 'line-through' } as React.CSSProperties,
  badge: { width: '28px', height: '28px', verticalAlign: 'middle', marginRight: '8px', borderRadius: '4px' } as React.CSSProperties,
}

export function Brand() {
  return (
    <Text style={{ ...styles.eyebrow, color: colors.goldDark, textAlign: 'center', marginBottom: '16px' }}>
      OneShotClub · Last Man Standing
    </Text>
  )
}

export function Footer({ clubName }: { clubName?: string }) {
  return (
    <Text style={styles.footer}>
      Sent by {clubName ?? 'your club'} via OneShotClub.
    </Text>
  )
}

export function Panel({ children }: { children: React.ReactNode }) {
  return <Section style={styles.panel}>{children}</Section>
}

export { React }
