import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDemoCompetition } from "@/lib/oneshot.functions";
import { Btn, Card, Field, Shell } from "@/components/oneshot/ui";
import { ClubHeader } from "@/components/oneshot/ClubHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Killeshin GAA — Last Man Standing" },
      { name: "description", content: "Pick one Premier League team a week. Last one standing wins €3,000." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const fetchComp = useServerFn(getDemoCompetition);
  const { data: comp } = useQuery({ queryKey: ["demo-comp"], queryFn: () => fetchComp() });
  const nav = useNavigate();

  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const valid = form.fullName.trim() && form.email.trim() && form.phone.trim() && comp;

  return (
    <Shell>
      <header className="flex items-center justify-end">
        <Link to="/admin" className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </Link>
      </header>

      <div className="mt-2">
        <ClubHeader clubName={comp?.club_name ?? "Killeshin GAA"} logoUrl={comp?.club_logo_url} />
      </div>

      <Card className="mt-8 text-center">
        <p className="eyebrow">Winner Takes All</p>
        <div className="display mt-2 text-6xl text-primary leading-none">
          €{(comp?.prize_pool ?? 3000).toLocaleString()}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Entry <span className="text-foreground font-semibold">€{comp?.entry_fee ?? 10}</span> · Last Man Standing
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
              search: { c: comp!.id, n: form.fullName, e: form.email, p: form.phone },
            })
          }
        >
          Enter the Comp →
        </Btn>
      </div>
    </Shell>
  );
}
