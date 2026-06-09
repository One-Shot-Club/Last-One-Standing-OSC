import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Section } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { styles, Brand, Footer, Panel } from './_shared'

interface Props {
  firstName?: string
  clubName?: string
  subject?: string
  bodyText?: string
  magicLink?: string
}

const Email = ({
  firstName = 'Player',
  clubName = 'Last Man Standing',
  subject = 'Update',
  bodyText = '',
  magicLink,
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>{subject}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Brand />
        <Panel>
          <Text style={styles.eyebrow}>{clubName}</Text>
          <Heading style={styles.heading}>{subject}</Heading>
          <Text style={styles.text}>Hi {firstName},</Text>
          {bodyText.split(/\n\n+/).map((para, i) => (
            <Text key={i} style={styles.text}>{para}</Text>
          ))}
          {magicLink ? (
            <Section style={styles.ctaWrap}>
              <a href={magicLink} style={styles.cta}>Open your dashboard →</a>
            </Section>
          ) : null}
        </Panel>
        <Footer clubName={clubName} />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d.subject ?? 'Update',
  displayName: 'Broadcast',
  previewData: {
    firstName: 'Tom',
    clubName: 'Last Man Standing',
    subject: 'Important update',
    bodyText: 'This is a broadcast message body.\n\nSecond paragraph.',
  },
} satisfies TemplateEntry

export default Email
