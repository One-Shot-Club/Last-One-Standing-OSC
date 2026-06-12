import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { buildStyles, Brand, Footer, Panel, type EmailThemeProp } from './_shared'

interface Props {
  firstName?: string
  clubName?: string
  weekLabel?: string
  pickedTeam?: string
  resultLine?: string
  weeksSurvived?: number
  pickHistory?: Array<{ week: string; team: string }>
  shareUrl?: string
  noPick?: boolean
  theme?: EmailThemeProp
}

const Email = ({
  firstName = 'Player',
  clubName = 'Last Man Standing',
  weekLabel = 'GW1',
  pickedTeam = '',
  resultLine = '',
  weeksSurvived = 0,
  pickHistory = [],
  shareUrl = '#',
  noPick = false,
  theme,
}: Props) => {
  const s = buildStyles(theme)
  const accent = theme?.accentColor || '#c9a84c'
  return (
    <Html lang="en">
      <Head />
      <Preview>Tough luck — you've been knocked out.</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Brand theme={theme} />
          <Panel theme={theme}>
            <Text style={s.eyebrow}>Eliminated · {weekLabel}</Text>
            <Heading style={s.heading}>Tough luck, {firstName}</Heading>
            {noPick ? (
              <Text style={s.text}>
                You didn't submit a pick for {weekLabel}, so you've been eliminated from the competition.
              </Text>
            ) : (
              <>
                <Text style={s.text}>
                  Sorry, you've been knocked out this week. Your pick <strong style={{ color: accent }}>{pickedTeam}</strong> didn't get the result you needed.
                </Text>
                {resultLine ? <Text style={s.meta}>{resultLine}</Text> : null}
              </>
            )}

            <Section style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '16px', borderRadius: '8px', margin: '14px 0' }}>
              <Text style={s.meta}>Weeks survived</Text>
              <Text style={{ ...s.text, fontSize: '28px', fontFamily: 'Barlow Condensed, Arial, sans-serif', color: accent, margin: '0 0 8px' }}>
                {weeksSurvived}
              </Text>
              {pickHistory.length > 0 && (
                <>
                  <Text style={s.meta}>Your picks</Text>
                  <Text style={s.text}>
                    {pickHistory.map((p, i) => (
                      <span key={i} style={s.pill}>{p.week}: {p.team}</span>
                    ))}
                  </Text>
                </>
              )}
            </Section>

            <Text style={s.text}>
              Thank you for playing and for supporting {clubName}. Every entry goes into the prize pool and back into the club.
            </Text>

            <Section style={s.ctaWrap}>
              <a href={shareUrl} style={s.cta}>Share with a friend →</a>
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
  subject: (d: Record<string, any>) => `Tough luck, ${d.firstName ?? 'Player'} — you've been eliminated`,
  displayName: 'Elimination',
  previewData: {
    firstName: 'Tom',
    clubName: 'Last Man Standing',
    weekLabel: 'GW3',
    pickedTeam: 'Arsenal',
    resultLine: 'Arsenal 1 – 2 Brighton',
    weeksSurvived: 2,
    pickHistory: [
      { week: 'GW1', team: 'Liverpool' },
      { week: 'GW2', team: 'Man City' },
      { week: 'GW3', team: 'Arsenal' },
    ],
    shareUrl: 'https://example.com/?c=demo',
  },
} satisfies TemplateEntry

export default Email
