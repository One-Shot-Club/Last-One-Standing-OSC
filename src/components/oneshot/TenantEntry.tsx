import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Field, Shell } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { useTenantBranding } from "@/lib/tenant/branding";
import type { TenantBranding } from "@/lib/tenant.functions";

export type EntryCompetition = {
  id: string;
  entry_fee: number | string | null;
  prize_pool: number | string | null;
  club_name: string | null;
  club_logo_url: string | null;
};

export function TenantEntry({
  tenant,
  competition,
}: {
  tenant: TenantBranding | null;
  competition: EntryCompetition | null;
}) {
  useTenantBranding(tenant);
  const nav = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const valid =
    form.fullName.trim() && form.email.trim() && form.phone.trim() && competition;

  const clubName =
    tenant?.name ?? competition?.club_name ?? "LAST MAN STANDING";
  const logoUrl = tenant?.logo_url ?? competition?.club_logo_url ?? undefined;
  const prize = Number(competition?.prize_pool ?? 3000);
  const fee = Number(competition?.entry_fee ?? 10);

  return (
    <Shell>
      <div className="mt-2">
        <ClubHeader clubName={clubName} logoUrl={logoUrl} />
      </div>

      <Card className="mt-8 text-center">
        <p className="eyebrow">Winner Takes All</p>
        <div className="display mt-2 text-6xl text-primary leading-none">
          €{prize.toLocaleString()}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Entry <span className="text-foreground font-semibold">€{fee}</span> · Last Man Standing
        </p>
      </Card>

      <Card className="mt-6 space-y-4">
        <p className="eyebrow">Enter the comp</p>
        <Field
          label="Full name"
          placeholder="Tom Murphy"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <Field
          label="Email"
          type="email"
          placeholder="tom@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Field
          label="Mobile"
          placeholder="087 123 4567"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </Card>

      <div className="mt-6">
        <Btn
          disabled={!valid}
          onClick={() =>
            nav({
              to: "/how-it-works",
              search: {
                c: competition!.id,
                n: form.fullName,
                e: form.email,
                p: form.phone,
              },
            })
          }
        >
          Enter the Comp →
        </Btn>
      </div>
    </Shell>
  );
}
