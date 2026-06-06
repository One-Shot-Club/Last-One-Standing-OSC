import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Img } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { styles, Brand, Footer, Panel, colors } from './_shared'

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
}

const Email = ({
  firstName = 'Player',
  clubName = 'Killeshin GAA',
  competitionName = 'Last Man Standing',
  team = 'Your team',
  teamBadgeUrl,
  weekLabel = 'GW1',
  prizePool = 0,
  playersEntered = 0,
  deadline = 'TBC',
  magicLink = '#',
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>You're officially in — pick locked for {weekLabel}.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <Panel>
          <Text style={styles.eyebrow}>Entry confirmed</Text>
          <Heading style={styles.heading}>You're in, {firstName}</Heading>
          <Text style={styles.text}>
            Welcome to {clubName} {competitionName}. Your entry is paid and locked in.
          </Text>

          <Section style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '16px', borderRadius: '8px', margin: '12px 0' }}>
            <Text style={styles.meta}>Your {weekLabel} pick</Text>
            <Text style={{ ...styles.text, fontSize: '22px', fontFamily: 'Barlow Condensed, Arial, sans-serif', color: colors.gold, margin: 0 }}>
              {teamBadgeUrl ? <Img src={teamBadgeUrl} alt={team} style={styles.badge} /> : null}
              {team}
            </Text>
          </Section>

          <Text style={styles.meta}>Competition</Text>
          <Text style={styles.text}>{competitionName} · Prize pool €{prizePool} · {playersEntered} players entered</Text>

          <Text style={styles.meta}>{weekLabel} deadline</Text>
          <Text style={styles.text}>{deadline}</Text>

          <Section style={styles.ctaWrap}>
            <a href={magicLink} style={styles.cta}>View my pick →</a>
          </Section>
          <Text style={{ ...styles.meta, marginTop: '12px', textAlign: 'center' }}>
            Save this email — your magic link gets you back any time.
          </Text>
        </Panel>
        <Footer clubName={clubName} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `You're in, ${d.firstName ?? 'Player'} — ${d.clubName ?? 'Killeshin GAA'} Last Man Standing`,
  displayName: 'Entry Confirmation',
  previewData: {
    firstName: 'Tom',
    clubName: 'Killeshin GAA',
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
