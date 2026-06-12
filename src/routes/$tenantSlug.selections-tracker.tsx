import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getSelectionsTracker,
  type SelectionsTrackerData,
} from "@/lib/selections-tracker.functions";
import { Shell, Logo } from "@/components/oneshot/ui";
import { cn } from "@/lib/utils";

const MASTER_ALIASES = new Set(["oneshotclub", "Master"]);
const resolveSlug = (slug: string) =>
  MASTER_ALIASES.has(slug) ? "oneshotclub-master" : slug;

const trackerQuery = (slug: string) =>
  queryOptions({
    queryKey: ["selections-tracker", resolveSlug(slug)],
    queryFn: () => getSelectionsTracker({ data: { slug: resolveSlug(slug) } }),
  });

export const Route = createFileRoute("/$tenantSlug/selections-tracker")({
  loader: async ({ params, context }) => {
    try {
      await context.queryClient.ensureQueryData(trackerQuery(params.tenantSlug));
    } catch {
      throw notFound();
    }
  },
  head: ({ params }) => ({
    meta: [
      { title: `Selections Tracker · ${params.tenantSlug}` },
      {
        name: "description",
        content: `Live Last One Standing selections tracker for ${params.tenantSlug}.`,
      },
    ],
  }),
  component: SelectionsTrackerPage,
  errorComponent: () => (
    <Shell>
      <Logo />
      <p className="mt-12 text-sm text-destructive">Tenant not found.</p>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <Logo />
      <p className="mt-12 text-sm text-destructive">Tenant not found.</p>
    </Shell>
  ),
});

const WINDOW = 8;

function SelectionsTrackerPage() {
  const { tenantSlug } = Route.useParams();
  const { data } = useSuspenseQuery(trackerQuery(tenantSlug));
  return <Tracker data={data} slug={tenantSlug} />;
}

function Tracker({ data, slug }: { data: SelectionsTrackerData; slug: string }) {
  const { tenant, competition, players, picks, maxWeek } = data;

  // Sort: alive first, then by name. Eliminated to the bottom.
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return a.full_name.localeCompare(b.full_name);
    });
  }, [players]);

  const picksByPlayer = useMemo(() => {
    const m = new Map<string, Map<number, { team: string; badge: string | null; result: string | null }>>();
    for (const p of picks) {
      if (!m.has(p.player_id)) m.set(p.player_id, new Map());
      m.get(p.player_id)!.set(p.week, { team: p.team, badge: p.badge_url, result: p.result });
    }
    return m;
  }, [picks]);

  const totalWeeks = Math.max(maxWeek, WINDOW);
  // Default start so the latest played week is visible.
  const defaultStart = Math.max(
    1,
    Math.min(
      totalWeeks - WINDOW + 1,
      Math.max(1, (competition?.current_week ?? 1) - WINDOW + 1),
    ),
  );
  const [start, setStart] = useState(defaultStart);
  const end = Math.min(start + WINDOW - 1, totalWeeks);
  const weeks = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const primary = tenant.primary_color || "#0e3a25";
  const accent = tenant.accent_color || "#c9a84c";
  const panelText = tenant.panel_text_color || "#f8f3e3";
  const metaText = tenant.meta_text_color || "#cdbf9a";

  const aliveCount = players.filter((p) => p.alive).length;

  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: primary,
        backgroundImage: tenant.background_url ? `url(${tenant.background_url})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div
        className="min-h-screen w-full"
        style={{
          background: `linear-gradient(180deg, ${primary}e6 0%, ${primary}f5 100%)`,
        }}
      >
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Header */}
          <header className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {(competition?.club_logo_url || tenant.logo_url) && (
                <img
                  src={competition?.club_logo_url || tenant.logo_url || ""}
                  alt=""
                  className="h-12 w-12 object-contain"
                />
              )}
              <div>
                <div
                  className="text-[10px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: accent }}
                >
                  Last One Standing · Selections
                </div>
                <h1
                  className="display text-2xl leading-tight"
                  style={{ color: panelText }}
                >
                  {competition?.club_name || tenant.name}
                </h1>
                <p className="mt-0.5 text-xs" style={{ color: metaText }}>
                  {aliveCount} alive of {players.length} ·{" "}
                  Gameweek {competition?.current_week ?? 1}
                </p>
              </div>
            </div>
            <Link
              to="/$tenantSlug"
              params={{ tenantSlug: slug }}
              className="rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest"
              style={{ background: accent, color: pickOnAccent(accent) }}
            >
              Back to entry
            </Link>
          </header>

          {/* Pager */}
          <div className="mb-3 flex items-center justify-between">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: metaText }}
            >
              Showing GW{start}–GW{end}
            </div>
            <div className="flex gap-2">
              <PagerBtn
                onClick={() => setStart(Math.max(1, start - WINDOW))}
                disabled={start <= 1}
                accent={accent}
                panelText={panelText}
              >
                ◀ Prev
              </PagerBtn>
              <PagerBtn
                onClick={() =>
                  setStart(Math.min(Math.max(1, totalWeeks - WINDOW + 1), start + WINDOW))
                }
                disabled={end >= totalWeeks}
                accent={accent}
                panelText={panelText}
              >
                Next ▶
              </PagerBtn>
            </div>
          </div>

          {/* Table */}
          <div
            className="overflow-x-auto rounded-2xl border shadow-2xl"
            style={{
              borderColor: `${panelText}22`,
              background: `${primary}cc`,
              backdropFilter: "blur(6px)",
            }}
          >
            <table className="w-full text-sm" style={{ color: panelText }}>
              <thead style={{ background: `${panelText}10` }}>
                <tr>
                  <th
                    className="sticky left-0 z-10 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em]"
                    style={{ background: `${primary}f5`, color: metaText }}
                  >
                    Entrant
                  </th>
                  {weeks.map((w) => (
                    <th
                      key={w}
                      className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em]"
                      style={{ color: metaText }}
                    >
                      GW{w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.length === 0 && (
                  <tr>
                    <td
                      colSpan={1 + weeks.length}
                      className="px-4 py-10 text-center text-xs"
                      style={{ color: metaText }}
                    >
                      No entrants yet.
                    </td>
                  </tr>
                )}
                {sortedPlayers.map((p) => {
                  const playerPicks = picksByPlayer.get(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        "border-t",
                        !p.alive && "opacity-50",
                      )}
                      style={{ borderColor: `${panelText}14` }}
                    >
                      <td
                        className="sticky left-0 z-10 px-4 py-2.5 align-middle"
                        style={{ background: `${primary}f5` }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold leading-tight">
                            {p.full_name}
                          </span>
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
                            style={
                              p.alive
                                ? { background: `${accent}26`, color: accent }
                                : { background: "rgba(220,38,38,0.18)", color: "#fca5a5" }
                            }
                          >
                            {p.alive ? "Alive" : "Elim"}
                          </span>
                        </div>
                      </td>
                      {weeks.map((w) => {
                        const pick = playerPicks?.get(w);
                        if (!pick) {
                          return (
                            <td
                              key={w}
                              className="px-2 py-2 text-center"
                              style={{ color: `${metaText}88` }}
                            >
                              —
                            </td>
                          );
                        }
                        const greyed = !p.alive;
                        return (
                          <td key={w} className="px-2 py-2 text-center">
                            <div
                              className={cn(
                                "mx-auto flex h-9 w-9 items-center justify-center rounded-md",
                                greyed && "grayscale",
                              )}
                              style={{
                                background: `${panelText}12`,
                                outline:
                                  pick.result === "win"
                                    ? `2px solid ${accent}`
                                    : pick.result === "loss"
                                      ? "2px solid rgba(220,38,38,0.7)"
                                      : "none",
                                outlineOffset: "1px",
                              }}
                              title={`${pick.team}${pick.result ? ` · ${pick.result}` : ""}`}
                            >
                              {pick.badge ? (
                                <img
                                  src={pick.badge}
                                  alt={pick.team}
                                  className="h-7 w-7 object-contain"
                                />
                              ) : (
                                <span
                                  className="text-[9px] font-semibold uppercase"
                                  style={{ color: panelText }}
                                >
                                  {abbreviate(pick.team)}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div
            className="mt-4 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-widest"
            style={{ color: metaText }}
          >
            <LegendDot color={accent} label="Pick won" />
            <LegendDot color="rgba(220,38,38,0.7)" label="Pick lost" />
            <span>· Greyed picks = entrant eliminated</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PagerBtn({
  children,
  onClick,
  disabled,
  accent,
  panelText,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent: string;
  panelText: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition disabled:opacity-30"
      style={{
        borderColor: `${panelText}33`,
        color: disabled ? panelText : accent,
        background: `${panelText}08`,
      }}
    >
      {children}
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function abbreviate(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function pickOnAccent(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return "#000";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? "#0a0a0a" : "#ffffff";
}
