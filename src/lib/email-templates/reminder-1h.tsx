import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { styles, Brand, Footer, Panel, colors } from './_shared'

interface Props {
  firstName?: string
  clubName?: string
  nextWeekLabel?: string
  deadline?: string
  magicLink?: string
}

const Email = ({
  firstName = 'Player',
  clubName = 'Killeshin GAA',
  nextWeekLabel = 'GW4',
  deadline = 'TBC',
  magicLink = '#',
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>1 hour left — don't get eliminated by default.</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <Panel>
          <Text style={styles.eyebrow}>🚨 Final hour</Text>
          <Heading style={styles.heading}>Last chance, {firstName}</Heading>
          <Text style={styles.text}>
            Picks for {nextWeekLabel} lock in 1 hour.
          </Text>

          <Text style={styles.meta}>Deadline</Text>
          <Text style={{ ...styles.text, fontSize: '24px', color: colors.gold, fontWeight: 800, fontFamily: 'Barlow Condensed, Arial, sans-serif' }}>
            {deadline}
          </Text>

          <Section style={styles.ctaWrap}>
            <a href={magicLink} style={styles.cta}>Make your pick now →</a>
          </Section>

          <Text style={{ ...styles.text, marginTop: '16px', fontWeight: 700 }}>
            ⚠ If you don't pick before the deadline, you're automatically eliminated.
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
    `🚨 1 hour left — don't get eliminated by default, ${d.firstName ?? 'Player'}`,
  displayName: 'Reminder · 1h',
  previewData: {
    firstName: 'Tom',
    clubName: 'Killeshin GAA',
    nextWeekLabel: 'GW4',
    deadline: 'Sat 30 Aug, 13:30',
    magicLink: 'https://example.com/pick?token=abc',
  },
} satisfies TemplateEntry

export default Email
