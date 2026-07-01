import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const waitlistSchema = z.object({
  clubName: z.string().trim().min(2, "Club name required").max(120),
  contactName: z.string().trim().min(2, "Your name required").max(80),
  email: z.string().trim().email("Valid email required").max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  county: z.string().trim().max(60).optional().or(z.literal("")),
  estimatedMembers: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type LmsWaitlistPayload = z.infer<typeof waitlistSchema>;

export const submitLmsWaitlist = createServerFn({ method: "POST" })
  .inputValidator((d: LmsWaitlistPayload) => d)
  .handler(async ({ data }) => {
    if (data.website) {
      return { ok: true as const };
    }

    const parsed = waitlistSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Invalid form data");
    }

    const { website: _hp, ...payload } = parsed.data;

    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: null,
      op: "lms_waitlist",
      table_name: "lms_waitlist",
      diff: {
        ...payload,
        requestedAt: new Date().toISOString(),
      },
    });

    return { ok: true as const };
  });
