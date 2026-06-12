import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Img } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { buildStyles, Brand, Footer, Panel, type EmailThemeProp } from './_shared'

interface Props {
  firstName?: string
  clubName?: string
  competitionName?: string
  team?: string
  teamBadgeUrl?: string
  weekLabel?: string
  prizePool?: number
  playersEntered?: number
  deadline?: string
  magicLink?: string
  theme?: EmailThemeProp
}

const Email = ({
  firstName = 'Player',
  clubName = 'Last Man Standing',
  competitionName = 'Last Man Standing',
  team = 'Your team',
  teamBadgeUrl,
  weekLabel = 'GW1',
  prizePool = 0,
  playersEntered = 0,
  deadline = 'TBC',
  magicLink = '#',
  theme,
}: Props) => {
  const s = buildStyles(theme)
  const accent = theme?.accentColor || '#c9a84c'
  return (
    <Html lang="en">
      <Head />
      <Preview>You're officially in — pick locked for {weekLabel}.</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Brand theme={theme} />
          <Panel theme={theme}>
            <Text style={s.eyebrow}>Entry confirmed</Text>
            <Heading style={s.heading}>You're in, {firstName}</Heading>
            <Text style={s.text}>
              Welcome to {clubName} {competitionName}. Your entry is paid and locked in.
            </Text>

            <Section style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '16px', borderRadius: '8px', margin: '12px 0' }}>
              <Text style={s.meta}>Your {weekLabel} pick</Text>
              <Text style={{ ...s.text, fontSize: '22px', fontFamily: 'Barlow Condensed, Arial, sans-serif', color: accent, margin: 0 }}>
                {teamBadgeUrl ? <Img src={teamBadgeUrl} alt={team} style={s.badge} /> : null}
                {team}
              </Text>
            </Section>

            <Text style={s.meta}>Competition</Text>
            <Text style={s.text}>{competitionName} · Prize pool €{prizePool} · {playersEntered} players entered</Text>

            <Text style={s.meta}>{weekLabel} deadline</Text>
            <Text style={s.text}>{deadline}</Text>

            <Section style={s.ctaWrap}>
              <a href={magicLink} style={s.cta}>View my pick →</a>
            </Section>
            <Text style={{ ...s.meta, marginTop: '12px', textAlign: 'center' }}>
              Save this email — your magic link gets you back any time.
            </Text>
          </Panel>
          <Footer clubName={clubName} theme={theme} />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `You're in, ${d.firstName ?? 'Player'} — ${d.clubName ?? 'Last Man Standing'}`,
  displayName: 'Entry Confirmation',
  previewData: {
    firstName: 'Tom',
    clubName: 'Last Man Standing',
    competitionName: 'Last Man Standing 2026',
    team: 'Liverpool',
    weekLabel: 'GW1',
    prizePool: 1200,
    playersEntered: 87,
    deadline: 'Sat 16 Aug, 13:30',
    magicLink: 'https://example.com/pick?token=abc',
  },
} satisfies TemplateEntry

export default Email
