// Admin-only: send a registered email template to an arbitrary recipient
// using the tenant's branding/fromName. Goes through the real pipeline
// (suppression -> log -> pgmq -> dispatcher -> Mailgun) so what arrives in
// the inbox is exactly what real players receive.
import { createServerFn } from "@tanstack/react-start";
import { verifyAdmin } from "@/lib/admin-auth.server";

export const listEmailTemplates = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);
    const { TEMPLATES } = await import("@/lib/email-templates/registry");
    return Object.entries(TEMPLATES).map(([name, t]) => ({
      name,
      displayName: t.displayName ?? name,
      hasPreview: !!t.previewData,
    }));
  });

export const sendTestEmail = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      competitionId: string;
      pin: string;
      templateName: string;
      recipientEmail: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const comp = await verifyAdmin(data.competitionId, data.pin);

    const email = data.recipientEmail.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Invalid email address");
    }

    const { TEMPLATES } = await import("@/lib/email-templates/registry");
    const template = TEMPLATES[data.templateName];
    if (!template) throw new Error(`Unknown template: ${data.templateName}`);

    const { loadEmailThemeForCompetition } = await import(
      "@/lib/email/tenant-theme.server"
    );
    const { enqueueTemplatedEmail } = await import("@/lib/email/send.server");
    const theme = await loadEmailThemeForCompetition(comp.id);

    // Merge tenant theme into previewData so the test render matches the
    // tenant's real branding instead of the template's default sample theme.
    const previewData = template.previewData ?? {};
    const themeProp = {
      primaryColor: theme.primaryColor,
      accentColor: theme.accentColor,
      panelTextColor: theme.panelTextColor,
      metaTextColor: theme.metaTextColor,
      logoUrl: theme.logoUrl,
      clubName: theme.clubName,
    };
    const templateData = {
      ...previewData,
      clubName: theme.clubName ?? previewData.clubName,
      theme: themeProp,
    };

    // Unique idempotency key per send so the admin can re-send freely.
    const stamp = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    const idempotencyKey = `test-${data.templateName}-${stamp}-${rand}`;

    const result = await enqueueTemplatedEmail({
      templateName: data.templateName,
      to: email,
      idempotencyKey,
      fromName: theme.fromName,
      templateData,
    });

    if (!result.ok) throw new Error(`Send failed: ${result.reason}`);

    const { logAction } = await import("@/lib/admin-ops.server");
    await logAction(
      comp.tenant_id,
      "email.send_test",
      comp.actorLabel,
      "email",
      result.messageId,
      { template: data.templateName, to: email },
    );

    return { ok: true, messageId: result.messageId };
  });

export const listRecentEmailLog = createServerFn({ method: "POST" })
  .inputValidator((d: { competitionId: string; pin: string; limit?: number }) => d)
  .handler(async ({ data }) => {
    await verifyAdmin(data.competitionId, data.pin);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(Math.max(data.limit ?? 25, 1), 100);
    // email_send_log has no tenant column today; surface the most recent
    // rows so the admin can see live progress of their test send.
    const { data: rows, error } = await supabaseAdmin
      .from("email_send_log")
      .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return rows ?? [];
  });
