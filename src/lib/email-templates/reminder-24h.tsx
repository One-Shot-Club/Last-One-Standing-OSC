import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { styles, Brand, Footer, Panel, colors } from './_shared'

interface Props {
  firstName?: string
  clubName?: string
  nextWeekLabel?: string
  deadline?: string
  playersRemaining?: number
  usedTeams?: string[]
  magicLink?: string
}

const Email = ({
  firstName = 'Player',
  clubName = 'Last Man Standing',
  nextWeekLabel = 'GW4',
  deadline = 'TBC',
  playersRemaining = 0,
  usedTeams = [],
  magicLink = '#',
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>24 hours left to pick your {nextWeekLabel} team.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <Panel>
          <Text style={styles.eyebrow}>⏰ 24 hours left</Text>
          <Heading style={styles.heading}>Pick your {nextWeekLabel} team, {firstName}</Heading>
          <Text style={styles.text}>
            You haven't made your {nextWeekLabel} pick yet. Picks lock at the deadline below.
          </Text>

          <Text style={styles.meta}>Deadline</Text>
          <Text style={{ ...styles.text, fontSize: '22px', color: colors.gold, fontWeight: 800, fontFamily: 'Barlow Condensed, Arial, sans-serif' }}>
            {deadline}
          </Text>

          <Text style={styles.meta}>Players remaining</Text>
          <Text style={styles.text}>{playersRemaining}</Text>

          <Section style={styles.ctaWrap}>
            <a href={magicLink} style={styles.cta}>Make your pick now →</a>
          </Section>

          {usedTeams.length > 0 && (
            <Section style={{ marginTop: '16px' }}>
              <Text style={styles.meta}>Teams you've already used</Text>
              <Text style={styles.text}>
                {usedTeams.map((t, i) => (
                  <span key={i} style={styles.pillUsed}>{t}</span>
                ))}
              </Text>
            </Section>
          )}
        </Panel>
        <Footer clubName={clubName} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `⏰ 24hrs left, ${d.firstName ?? 'Player'} — pick your ${d.nextWeekLabel ?? 'next'} team`,
  displayName: 'Reminder · 24h',
  previewData: {
    firstName: 'Tom',
    clubName: 'Last Man Standing',
    nextWeekLabel: 'GW4',
    deadline: 'Sat 30 Aug, 13:30',
    playersRemaining: 24,
    usedTeams: ['Liverpool', 'Man City', 'Arsenal'],
    magicLink: 'https://example.com/pick?token=abc',
  },
} satisfies TemplateEntry

export default Email
