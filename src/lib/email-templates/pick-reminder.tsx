import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { buildStyles, Brand, Footer, Panel, StatsBlock, type CompetitionStats, type EmailThemeProp } from './_shared'

interface Props {
  firstName?: string
  clubName?: string
  deadline?: string
  countdownCopy?: string
  playersRemaining?: number
  usedTeams?: string[]
  magicLink?: string
  theme?: EmailThemeProp
}

const Email = ({
  firstName = 'Player',
  clubName = 'Last Man Standing',
  deadline = 'TBC',
  countdownCopy = '',
  playersRemaining = 0,
  usedTeams = [],
  magicLink = '#',
  theme,
}: Props) => {
  const s = buildStyles(theme)
  const accent = theme?.accentColor || '#c9a84c'
  return (
    <Html lang="en">
      <Head />
      <Preview>Don't forget — make your next gameweek pick.</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Brand theme={theme} />
          <Panel theme={theme}>
            <Text style={s.eyebrow}>Pick reminder</Text>
            <Heading style={s.heading}>Pick your next gameweek team, {firstName}</Heading>
            <Text style={s.text}>
              You haven't made your next gameweek pick yet. Picks lock at the deadline below — no pick means you're out.
            </Text>

            <Text style={s.meta}>Deadline</Text>
            <Text style={{ ...s.text, fontSize: '22px', color: accent, fontWeight: 800, fontFamily: 'Barlow Condensed, Arial, sans-serif' }}>
              {deadline}
            </Text>
            {countdownCopy && <Text style={s.text}>{countdownCopy}</Text>}

            <Text style={s.meta}>Players remaining</Text>
            <Text style={s.text}>{playersRemaining}</Text>

            <Section style={s.ctaWrap}>
              <a href={magicLink} style={s.cta}>Make your pick now →</a>
            </Section>

            {usedTeams.length > 0 && (
              <Section style={{ marginTop: '16px' }}>
                <Text style={s.meta}>Teams you've already used</Text>
                <Text style={s.text}>
                  {usedTeams.map((t, i) => (
                    <span key={i} style={s.pillUsed}>{t}</span>
                  ))}
                </Text>
              </Section>
            )}
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
    `Reminder, ${d.firstName ?? 'Player'} — pick your next gameweek team`,
  displayName: 'Pick Reminder',
  previewData: {
    firstName: 'Tom',
    clubName: 'Last Man Standing',
    deadline: 'Sat 30 Aug, 13:30',
    countdownCopy: 'You have 1 day 4 hours to make your pick',
    playersRemaining: 24,
    usedTeams: ['Liverpool', 'Man City', 'Arsenal'],
    magicLink: 'https://example.com/pick?token=abc',
  },
} satisfies TemplateEntry

export default Email
