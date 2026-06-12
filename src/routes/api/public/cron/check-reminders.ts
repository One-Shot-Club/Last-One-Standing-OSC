// Cron endpoint formerly handled pick reminders and auto-processing of
// gameweeks. Pick reminders are now manual tasks surfaced in the Admin
// Panel (see admin-tasks.functions.ts + email_tasks table). Auto-locking
// of gameweeks has also been removed — admins lock manually from the
// Gameweeks tab.
//
// The route is kept (instead of deleted) so any external cron entry that
// still hits it gets a clean 200 response instead of a 404.
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/public/cron/check-reminders')({
  server: {
    handlers: {
      POST: async () => Response.json({
        disabled: true,
        message: 'Automated reminders disabled. Admins send reminders manually from the Admin Panel.',
        ts: new Date().toISOString(),
      }),
    },
  },
})
