// Server-only email enqueue helper. Renders a registered template and pushes
// it onto the transactional_emails pgmq queue. The shared queue processor
// (/lovable/email/queue/process) handles actual sending, retries, and rate limits.
import * as React from 'react'
import { render } from '@react-email/components'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES, type TemplateEntry } from '@/lib/email-templates/registry'

const SITE_NAME = 'OneShotClub'
const SENDER_DOMAIN = 'notify.oneshotclub.ie'
const DEFAULT_FROM_NAME = 'OneShotClub Picks'
const FROM_LOCAL = 'picks'

function sanitizeFromName(name: string): string {
  // Strip characters that would break the RFC 5322 display-name. Allow most
  // text but trim quotes/backslashes/CR/LF that could inject headers.
  return name.replace(/["\\\r\n<>]/g, '').trim().slice(0, 60) || DEFAULT_FROM_NAME
}

function buildFromAddress(fromName: string | null | undefined): string {
  const display = sanitizeFromName(fromName || DEFAULT_FROM_NAME)
  return `${display} <${FROM_LOCAL}@${SENDER_DOMAIN}>`
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function redact(email: string) {
  const [u, d] = email.split('@')
  return u && d ? `${u[0]}***@${d}` : '***'
}

export interface SendEmailInput {
  templateName: string
  to: string
  idempotencyKey: string
  templateData?: Record<string, any>
  /** Per-tenant display name for the From header, e.g. "Killeshin GAA". */
  fromName?: string | null
}

export async function enqueueTemplatedEmail(input: SendEmailInput): Promise<
  | { ok: true; messageId: string; queued: true }
  | { ok: false; reason: string }
> {
  const { templateName, to, idempotencyKey, templateData = {} } = input
  const template: TemplateEntry | undefined = TEMPLATES[templateName]
  if (!template) {
    console.error('[email] template not found', { templateName })
    return { ok: false, reason: `template_not_found:${templateName}` }
  }

  const recipient = (template.to || to || '').trim()
  if (!recipient) return { ok: false, reason: 'missing_recipient' }
  const normalized = recipient.toLowerCase()
  const messageId = crypto.randomUUID()

  // Suppression
  const { data: suppressed, error: supErr } = await supabaseAdmin
    .from('suppressed_emails').select('id').eq('email', normalized).maybeSingle()
  if (supErr) {
    console.error('[email] suppression check failed', supErr)
    return { ok: false, reason: 'suppression_check_failed' }
  }
  if (suppressed) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId, template_name: templateName,
      recipient_email: recipient, status: 'suppressed',
    })
    return { ok: false, reason: 'email_suppressed' }
  }

  // Idempotency: if a row with the same idempotency-derived message_id already
  // logged as sent/pending, skip. We embed idempotencyKey via metadata.
  const { data: dup } = await supabaseAdmin
    .from('email_send_log')
    .select('id, status')
    .eq('message_id', idempotencyKey)
    .maybeSingle()
  if (dup) {
    return { ok: false, reason: `duplicate:${dup.status}` }
  }

  // Unsubscribe token (one per email)
  let unsubscribeToken: string
  const { data: existing } = await supabaseAdmin
    .from('email_unsubscribe_tokens').select('token, used_at').eq('email', normalized).maybeSingle()
  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token
  } else if (!existing) {
    unsubscribeToken = generateToken()
    await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .upsert({ token: unsubscribeToken, email: normalized }, { onConflict: 'email', ignoreDuplicates: true })
    const { data: stored } = await supabaseAdmin
      .from('email_unsubscribe_tokens').select('token').eq('email', normalized).maybeSingle()
    unsubscribeToken = stored?.token ?? unsubscribeToken
  } else {
    return { ok: false, reason: 'email_suppressed' }
  }

  // Render
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof template.subject === 'function'
    ? template.subject(templateData)
    : template.subject

  // Use the idempotencyKey as the canonical message_id so retries collapse.
  const canonicalMessageId = idempotencyKey

  await supabaseAdmin.from('email_send_log').insert({
    message_id: canonicalMessageId,
    template_name: templateName,
    recipient_email: recipient,
    status: 'pending',
  })

  const { error: enqErr } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: canonicalMessageId,
      to: recipient,
      from: FROM_ADDRESS,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqErr) {
    console.error('[email] enqueue failed', enqErr)
    await supabaseAdmin.from('email_send_log').insert({
      message_id: canonicalMessageId,
      template_name: templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: 'enqueue_failed',
    })
    return { ok: false, reason: 'enqueue_failed' }
  }

  console.log('[email] enqueued', { templateName, to: redact(recipient), id: canonicalMessageId })
  return { ok: true, messageId: canonicalMessageId, queued: true }
}
