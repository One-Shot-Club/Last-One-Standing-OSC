import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { styles, Brand, Footer, Panel, colors } from './_shared'

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
}

const Email = ({
  firstName = 'Player',
  clubName = 'Killeshin GAA',
  weekLabel = 'GW1',
  pickedTeam = '',
  resultLine = '',
  weeksSurvived = 0,
  pickHistory = [],
  shareUrl = '#',
  noPick = false,
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Tough luck — you've been knocked out.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <Panel>
          <Text style={styles.eyebrow}>Eliminated · {weekLabel}</Text>
          <Heading style={styles.heading}>Tough luck, {firstName}</Heading>
          {noPick ? (
            <Text style={styles.text}>
              You didn't submit a pick for {weekLabel}, so you've been eliminated from the competition.
            </Text>
          ) : (
            <>
              <Text style={styles.text}>
                Sorry, you've been knocked out this week. Your pick <strong style={{ color: colors.gold }}>{pickedTeam}</strong> didn't get the result you needed.
              </Text>
              {resultLine ? <Text style={styles.meta}>{resultLine}</Text> : null}
            </>
          )}

          <Section style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '16px', borderRadius: '8px', margin: '14px 0' }}>
            <Text style={styles.meta}>Weeks survived</Text>
            <Text style={{ ...styles.text, fontSize: '28px', fontFamily: 'Barlow Condensed, Arial, sans-serif', color: colors.gold, margin: '0 0 8px' }}>
              {weeksSurvived}
            </Text>
            {pickHistory.length > 0 && (
              <>
                <Text style={styles.meta}>Your picks</Text>
                <Text style={styles.text}>
                  {pickHistory.map((p, i) => (
                    <span key={i} style={styles.pill}>{p.week}: {p.team}</span>
                  ))}
                </Text>
              </>
            )}
          </Section>

          <Text style={styles.text}>
            Thank you for playing and for supporting {clubName}. Every entry goes into the prize pool and back into the club.
          </Text>

          <Section style={styles.ctaWrap}>
            <a href={shareUrl} style={styles.cta}>Share with a friend →</a>
          </Section>
        </Panel>
        <Footer clubName={clubName} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Tough luck, ${d.firstName ?? 'Player'} — you've been eliminated`,
  displayName: 'Elimination',
  previewData: {
    firstName: 'Tom',
    clubName: 'Killeshin GAA',
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
