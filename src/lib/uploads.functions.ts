import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertPlatformAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: platform admin only");
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

export const uploadTenantAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenantId: string;
      kind: "logo" | "background";
      filename: string;
      contentType: string;
      dataBase64: string;
    }) => {
      if (!d.tenantId) throw new Error("tenantId required");
      if (!ALLOWED.has(d.contentType)) throw new Error("Unsupported image type");
      if (!d.dataBase64) throw new Error("No file data");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await assertPlatformAdmin(userId);

    const bytes = Buffer.from(data.dataBase64, "base64");
    if (bytes.length > MAX_BYTES) throw new Error("File exceeds 5MB limit");

    const ext = (data.filename.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${data.tenantId}/${data.kind}-${Date.now()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("tenant-assets")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (error) throw error;

    return { path, url: `/api/public/tenant-assets/${path}` };
  });
