import type { ComponentType } from 'react'
import { template as entryConfirmation } from './entry-confirmation'
import { template as elimination } from './elimination'
import { template as progression } from './progression'
import { template as reminder24h } from './reminder-24h'
import { template as reminder1h } from './reminder-1h'
import { template as broadcast } from './broadcast'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'entry-confirmation': entryConfirmation,
  'elimination': elimination,
  'progression': progression,
  'reminder-24h': reminder24h,
  'reminder-1h': reminder1h,
  'broadcast': broadcast,
}
