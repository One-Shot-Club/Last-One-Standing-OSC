import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getTenantForEdit, updateTenant } from "@/lib/platform-admin.functions";
import { Btn, Field } from "@/components/oneshot/ui";

type Settings = {
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  intro_copy: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_link: string | null;
};

export function EditTenantPanel({
  tenantId,
  onClose,
  onSaved,
}: {
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const loadFn = useServerFn(getTenantForEdit);
  const saveFn = useServerFn(updateTenant);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [s, setS] = useState<Settings>({
    logo_url: "",
    primary_color: "",
    accent_color: "",
    intro_copy: "",
    contact_email: "",
    contact_phone: "",
    whatsapp_link: "",
  });

  useEffect(() => {
    let cancelled = false;
    loadFn({ data: { tenantId } })
      .then((r) => {
        if (cancelled) return;
        const res = r as unknown as { tenant: { name: string; slug: string }; settings: Settings };
        setName(res.tenant.name);
        setSlug(res.tenant.slug);
        setS({
          logo_url: res.settings.logo_url ?? "",
          primary_color: res.settings.primary_color ?? "",
          accent_color: res.settings.accent_color ?? "",
          intro_copy: res.settings.intro_copy ?? "",
          contact_email: res.settings.contact_email ?? "",
          contact_phone: res.settings.contact_phone ?? "",
          whatsapp_link: res.settings.whatsapp_link ?? "",
        });
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tenantId, loadFn]);

  async function handleSave() {
    setErr(null);
    setSaving(true);
    try {
      await saveFn({
        data: {
          tenantId,
          name,
          slug,
          settings: {
            logo_url: s.logo_url || null,
            primary_color: s.primary_color || null,
            accent_color: s.accent_color || null,
            intro_copy: s.intro_copy || null,
            contact_email: s.contact_email || null,
            contact_phone: s.contact_phone || null,
            whatsapp_link: s.whatsapp_link || null,
          },
        },
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const set = <K extends keyof Settings>(k: K, v: string) =>
    setS((prev) => ({ ...prev, [k]: v }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-xl border border-border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="display text-lg">Edit tenant</h3>
          <button className="text-sm text-muted-foreground" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {err && (
          <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            {err}
          </p>
        )}

        {!loading && (
          <div className="space-y-3">
            <Field label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
            <Field
              label="Slug (lowercase, dashes)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />

            <Field
              label="Logo URL"
              value={s.logo_url ?? ""}
              onChange={(e) => set("logo_url", e.target.value)}
              placeholder="https://…/logo.png"
            />
            {s.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.logo_url}
                alt="Logo preview"
                className="h-16 w-16 rounded-md border border-border object-contain"
              />
            )}

            <ColorField
              label="Primary color"
              value={s.primary_color ?? ""}
              onChange={(v) => set("primary_color", v)}
            />
            <ColorField
              label="Accent color"
              value={s.accent_color ?? ""}
              onChange={(v) => set("accent_color", v)}
            />

            <label className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                Intro copy
              </span>
              <textarea
                value={s.intro_copy ?? ""}
                onChange={(e) => set("intro_copy", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-4 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </label>

            <Field
              label="Contact email"
              value={s.contact_email ?? ""}
              onChange={(e) => set("contact_email", e.target.value)}
              placeholder="admin@club.ie"
            />
            <Field
              label="Contact phone"
              value={s.contact_phone ?? ""}
              onChange={(e) => set("contact_phone", e.target.value)}
              placeholder="+353…"
            />
            <Field
              label="WhatsApp link"
              value={s.whatsapp_link ?? ""}
              onChange={(e) => set("whatsapp_link", e.target.value)}
              placeholder="https://chat.whatsapp.com/…"
            />

            <div className="flex gap-2 pt-2">
              <Btn onClick={handleSave} disabled={saving || !name || !slug}>
                {saving ? "Saving…" : "Save changes"}
              </Btn>
              <Btn variant="ghost" onClick={onClose}>
                Cancel
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={isHex ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-14 cursor-pointer rounded-lg border border-[color:var(--border)] bg-[color:var(--input)]"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1a1a2e"
          className="h-12 flex-1 rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>
    </label>
  );
}
