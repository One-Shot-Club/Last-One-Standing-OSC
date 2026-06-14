import type { ComponentType } from 'react'
import { template as entryConfirmation } from './entry-confirmation'
import { template as elimination } from './elimination'
import { template as progression } from './progression'
import { template as pickReminder } from './pick-reminder'
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
  'pick-reminder': pickReminder,
  'broadcast': broadcast,
}
