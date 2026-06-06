import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Btn, Card, Eyebrow, Field, Logo, Shell } from "@/components/oneshot/ui";

type Search = { c?: string };

export const Route = createFileRoute("/join")({
  validateSearch: (s: Record<string, unknown>): Search => ({ c: s.c as string | undefined }),
  component: Join,
});

function Join() {
  const { c } = Route.useSearch();
  const nav = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });

  const valid = form.fullName.trim() && form.email.trim() && form.phone.trim() && c;

  return (
    <Shell>
      <Logo />
      <div className="mt-10">
        <Eyebrow>Step 1 of 3</Eyebrow>
        <h1 className="display mt-2 text-4xl">Your details</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We need a way to send you weekly pick reminders.
        </p>
      </div>
      <Card className="mt-6 space-y-4">
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
          label="Phone"
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
              search: { c: c!, n: form.fullName, e: form.email, p: form.phone },
            })
          }
        >
          Continue →
        </Btn>
      </div>
    </Shell>
  );
}
