import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listEmailTasks,
  runEmailTask,
  dismissEmailTask,
  previewEmailTask,
  type AdminEmailTask,
} from "@/lib/admin-tasks.functions";
import { Card, Btn } from "@/components/oneshot/ui";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<AdminEmailTask["kind"], string> = {
  progression: "You're through — make next pick",
  elimination: "Sorry, you're out",
  reminder: "Pick reminder",
};

const KIND_TONE: Record<AdminEmailTask["kind"], string> = {
  progression: "text-success",
  elimination: "text-destructive",
  reminder: "text-primary",
};

export function GameweekTasks({ compId, pin }: { compId: string; pin: string }) {
  const fetchTasks = useServerFn(listEmailTasks);
  const runTask = useServerFn(runEmailTask);
  const dismissTask = useServerFn(dismissEmailTask);
  const previewTask = useServerFn(previewEmailTask);
  const qc = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ["email-tasks", compId, pin],
    queryFn: () => fetchTasks({ data: { competitionId: compId, pin } }),
    enabled: !!compId && !!pin,
    refetchInterval: 60_000,
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null);

  const pending = (tasks as AdminEmailTask[]).filter((t) => !t.sent_at);
  const recentlySent = (tasks as AdminEmailTask[]).filter((t) => t.sent_at).slice(0, 3);

  if (pending.length === 0 && recentlySent.length === 0) return null;

  return (
    <>
      <Card className="space-y-3 border-primary/40 bg-primary/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
              Email tasks
            </p>
            <p className="text-xs text-muted-foreground">
              Review and send manually. Tasks appear automatically once a gameweek is locked.
            </p>
          </div>
          {pending.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
              {pending.length} pending
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">No pending tasks.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-2 rounded-md border border-[color:var(--border)] bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={cn("font-semibold", KIND_TONE[t.kind])}>
                      {KIND_LABEL[t.kind]}
                    </span>
                    {t.week_label && (
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                        {t.week_label}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {t.recipient_count} {t.recipient_count === 1 ? "recipient" : "recipients"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busyId === t.id}
                    className="rounded-md border border-[color:var(--border)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest hover:bg-muted disabled:opacity-50"
                    onClick={async () => {
                      setBusyId(t.id);
                      try {
                        const out = await previewTask({ data: { competitionId: compId, pin, taskId: t.id } });
                        setPreview(out);
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "Preview failed");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Preview
                  </button>
                  <Btn
                    disabled={busyId === t.id || t.recipient_count === 0}
                    onClick={async () => {
                      if (!confirm(
                        `Send "${KIND_LABEL[t.kind]}" to ${t.recipient_count} ${t.recipient_count === 1 ? "player" : "players"}?`,
                      )) return;
                      setBusyId(t.id);
                      try {
                        const out = await runTask({ data: { competitionId: compId, pin, taskId: t.id } });
                        alert(`Queued ${out.queued} email${out.queued === 1 ? "" : "s"}.`);
                        await qc.invalidateQueries({ queryKey: ["email-tasks", compId, pin] });
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "Send failed");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Send
                  </Btn>
                  <button
                    disabled={busyId === t.id}
                    className="rounded-md px-2 py-1.5 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-destructive disabled:opacity-50"
                    title="Dismiss without sending"
                    onClick={async () => {
                      if (!confirm("Dismiss this task without sending?")) return;
                      setBusyId(t.id);
                      try {
                        await dismissTask({ data: { competitionId: compId, pin, taskId: t.id } });
                        await qc.invalidateQueries({ queryKey: ["email-tasks", compId, pin] });
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {recentlySent.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Recently sent ({recentlySent.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {recentlySent.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-muted-foreground">
                  <span>
                    {KIND_LABEL[t.kind]} · {t.week_label ?? "—"}
                  </span>
                  <span>
                    {t.sent_count} sent · {t.sent_at ? new Date(t.sent_at).toLocaleString() : ""}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Subject</p>
                <p className="truncate text-sm font-semibold">{preview.subject}</p>
              </div>
              <button
                className="ml-3 rounded-md border border-[color:var(--border)] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
                onClick={() => setPreview(null)}
              >
                Close
              </button>
            </div>
            <iframe title="Email preview" srcDoc={preview.html} className="flex-1 bg-white" />
          </div>
        </div>
      )}
    </>
  );
}
