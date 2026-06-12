import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getCompetition } from "@/lib/oneshot.functions";
import { Btn, Card, Eyebrow, Field, Shell } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";
import { cn } from "@/lib/utils";
import { useCompetitionBranding } from "@/lib/tenant/use-competition-branding";

type Search = { c: string; t: string };

export const Route = createFileRoute("/details")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    c: String(s.c ?? ""),
    t: String(s.t ?? ""),
  }),
  beforeLoad: ({ search }) => {
    if (!search.c || !search.t) throw redirect({ to: "/" });
  },
  component: Details,
});

function Details() {
  const { c, t } = Route.useSearch();
  const nav = useNavigate();
  const fetchComp = useServerFn(getCompetition);
  const { data: comp } = useQuery({
    queryKey: ["comp", c],
    queryFn: () => fetchComp({ data: { id: c } }),
    enabled: !!c,
  });
  const { logoUrl: tenantLogo, bgUrl } = useCompetitionBranding(c);

  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [offline, setOffline] = useState(false);
  const emailReady = offline ? true : !!form.email.trim();
  const valid = form.fullName.trim() && emailReady && form.phone.trim();

  return (
    <Shell bgUrl={bgUrl ?? undefined} bgBlur={6}>
      <ClubHeader
        clubName={comp?.club_name ?? "Last Man Standing"}
        logoUrl={tenantLogo ?? comp?.club_logo_url}
      />

      <div className="mt-8">
        <Eyebrow>Step 2 of 3</Eyebrow>
        <h1 className="display mt-2 text-3xl">Your details</h1>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Gameweek 1 pick</span>
          <span className="text-sm font-semibold text-primary">{t}</span>
        </div>
      </Card>

      <Card className="mt-6 space-y-4">
        <p className="eyebrow">Enter the comp</p>
        <Field
          label="Full name"
          placeholder="Tom Murphy"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />

        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <Field
            label="Email"
            type="email"
            placeholder={offline ? "Not required" : "tom@example.com"}
            value={offline ? "" : form.email}
            disabled={offline}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setOffline((v) => !v)}
            aria-pressed={offline}
            className={cn(
              "h-12 shrink-0 rounded-lg border px-3 text-[10px] font-semibold uppercase tracking-wider transition",
              offline
                ? "bg-destructive text-destructive-foreground border-destructive"
                : "border-destructive/60 text-destructive hover:bg-destructive/10",
            )}
            title="No email — communicate picks via the club admin"
          >
            Offline
            <br />
            Player
          </button>
        </div>
        {offline && (
          <p className="text-[11px] leading-snug text-destructive">
            Offline player: no email will be sent. Submit your weekly pick directly to the club admin.
          </p>
        )}

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
              to: "/pay",
              search: {
                c,
                t,
                n: form.fullName,
                e: offline ? "" : form.email,
                p: form.phone,
                ...(offline ? { o: "1" } : {}),
              },
            })
          }
        >
          Continue to payment →
        </Btn>
      </div>
    </Shell>
  );
}
