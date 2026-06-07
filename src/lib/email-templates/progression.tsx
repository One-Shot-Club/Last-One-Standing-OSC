import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { styles, Brand, Footer, Panel, colors } from './_shared'

interface Props {
  firstName?: string
  clubName?: string
  weekLabel?: string         // the week just played e.g. GW3
  nextWeekLabel?: string     // next week e.g. GW4
  playersRemaining?: number
  prizePool?: number
  deadline?: string
  countdownCopy?: string
  magicLink?: string
  usedTeams?: string[]
}

const Email = ({
  firstName = 'Player',
  clubName = 'Killeshin GAA',
  weekLabel = 'GW3',
  nextWeekLabel = 'GW4',
  playersRemaining = 0,
  prizePool = 0,
  deadline = 'TBC',
  countdownCopy = '',
  magicLink = '#',
  usedTeams = [],
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Through to {nextWeekLabel} — make your next pick.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <Panel>
          <Text style={styles.eyebrow}>Through · {weekLabel}</Text>
          <Heading style={styles.heading}>You're through, {firstName}</Heading>
          <Text style={styles.text}>
            Congratulations — you've survived {weekLabel}. On to {nextWeekLabel}.
          </Text>

          <Section style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '16px', borderRadius: '8px', margin: '12px 0' }}>
            <Text style={styles.meta}>Players remaining</Text>
            <Text style={{ ...styles.text, fontSize: '28px', fontFamily: 'Barlow Condensed, Arial, sans-serif', color: colors.gold, margin: '0 0 8px' }}>
              {playersRemaining}
            </Text>
            <Text style={styles.meta}>Prize pool</Text>
            <Text style={{ ...styles.text, fontSize: '20px', fontFamily: 'Barlow Condensed, Arial, sans-serif', color: colors.gold, margin: 0 }}>
              €{prizePool}
            </Text>
          </Section>

          <Text style={styles.meta}>{nextWeekLabel} deadline</Text>
          <Text style={{ ...styles.text, fontSize: '18px', color: colors.gold, fontWeight: 700 }}>{deadline}</Text>
          {countdownCopy && <Text style={styles.text}>{countdownCopy}</Text>}

          {usedTeams.length > 0 && (
            <Section style={{ margin: '16px 0' }}>
              <Text style={styles.meta}>Teams you've already used</Text>
              <Text style={{ ...styles.text, fontSize: '14px', color: colors.gold, margin: '4px 0 0' }}>
                {usedTeams.join(' · ')}
              </Text>
            </Section>
          )}

          <Section style={styles.ctaWrap}>
            <a href={magicLink} style={styles.cta}>Make your {nextWeekLabel} pick →</a>
          </Section>
        </Panel>
        <Footer clubName={clubName} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `You're through, ${d.firstName ?? 'Player'} — make your ${d.nextWeekLabel ?? 'next'} pick`,
  displayName: 'Progression',
  previewData: {
    firstName: 'Tom',
    clubName: 'Killeshin GAA',
    weekLabel: 'GW3',
    nextWeekLabel: 'GW4',
    playersRemaining: 24,
    prizePool: 1200,
    deadline: 'Sat 30 Aug, 13:30',
    countdownCopy: 'You have 6 days 4 hours to make your pick',
    magicLink: 'https://example.com/pick?token=abc',
    usedTeams: ['Liverpool', 'Arsenal', 'Man City'],
  },
} satisfies TemplateEntry

export default Email
