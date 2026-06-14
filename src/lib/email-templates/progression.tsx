import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { buildStyles, Brand, Footer, Panel, StatsBlock, type CompetitionStats, type EmailThemeProp } from './_shared'

interface Props {
  firstName?: string
  clubName?: string
  playersRemaining?: number
  prizePool?: number
  deadline?: string
  countdownCopy?: string
  magicLink?: string
  usedTeams?: string[]
  stats?: CompetitionStats
  theme?: EmailThemeProp
}

const Email = ({
  firstName = 'Player',
  clubName = 'Last Man Standing',
  playersRemaining = 0,
  prizePool = 0,
  deadline = 'TBC',
  countdownCopy = '',
  magicLink = '#',
  usedTeams = [],
  stats,
  theme,
}: Props) => {
  const s = buildStyles(theme)
  const accent = theme?.accentColor || '#c9a84c'
  return (
    <Html lang="en">
      <Head />
      <Preview>You're through to the next gameweek.</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Brand theme={theme} />
          <Panel theme={theme}>
            <Text style={s.eyebrow}>Through</Text>
            <Heading style={s.heading}>You're through, {firstName}</Heading>
            <Text style={s.text}>
              Congratulations — you've survived this gameweek. You're through to the next gameweek.
            </Text>

            <Section style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '16px', borderRadius: '8px', margin: '12px 0' }}>
              <Text style={s.meta}>Players remaining</Text>
              <Text style={{ ...s.text, fontSize: '28px', fontFamily: 'Barlow Condensed, Arial, sans-serif', color: accent, margin: '0 0 8px' }}>
                {playersRemaining}
              </Text>
              <Text style={s.meta}>Prize pool</Text>
              <Text style={{ ...s.text, fontSize: '20px', fontFamily: 'Barlow Condensed, Arial, sans-serif', color: accent, margin: 0 }}>
                €{prizePool}
              </Text>
            </Section>

            <StatsBlock stats={stats} theme={theme} />


            <Text style={s.meta}>Next gameweek deadline</Text>
            <Text style={{ ...s.text, fontSize: '18px', color: accent, fontWeight: 700 }}>{deadline}</Text>
            {countdownCopy && <Text style={s.text}>{countdownCopy}</Text>}

            {usedTeams.length > 0 && (
              <Section style={{ margin: '16px 0' }}>
                <Text style={s.meta}>Teams you've already used</Text>
                <Text style={{ ...s.text, fontSize: '14px', color: accent, margin: '4px 0 0' }}>
                  {usedTeams.join(' · ')}
                </Text>
              </Section>
            )}

            <Section style={s.ctaWrap}>
              <a href={magicLink} style={s.cta}>Make your next pick →</a>
            </Section>
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
    `You're through, ${d.firstName ?? 'Player'} — make your next pick`,
  displayName: 'Progression',
  previewData: {
    firstName: 'Tom',
    clubName: 'Last Man Standing',
    playersRemaining: 24,
    prizePool: 1200,
    deadline: 'Sat 30 Aug, 13:30',
    countdownCopy: 'You have 6 days 4 hours to make your pick',
    magicLink: 'https://example.com/pick?token=abc',
    usedTeams: ['Liverpool', 'Arsenal', 'Man City'],
    stats: {
      alive: 11,
      eliminated: 1,
      total: 12,
      picksPerWeek: [
        { week: 1, count: 12 },
        { week: 2, count: 12 },
        { week: 3, count: 11 },
      ],
    },
  },
} satisfies TemplateEntry

export default Email
