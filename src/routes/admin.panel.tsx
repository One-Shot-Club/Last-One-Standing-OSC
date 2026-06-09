import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { adminGetData } from "@/lib/oneshot.functions";
import {
  listGameweeks,
  listTeams,
  upsertTeam,
  deleteTeam,
  listResults,
  processGameweekResults,
  seedGameweek,
  setFixtureWinner,
  unlockGameweek,

} from "@/lib/gameweeks.functions";
import {
  addManualEntrant,
  listEntries,
  recordPayment,
  setEntryPaid,
  listAdminActions,
  setPlayerAlive,
  overridePick,
  deletePick,
  importEntrants,
  broadcastMessage,
  listMessages,
} from "@/lib/admin-ops.functions";
import { FIXTURES_BY_WEEK } from "@/lib/fixtures";


import { Btn, Card, Eyebrow, Field, Logo, Shell } from "@/components/oneshot/ui";

import { cn } from "@/lib/utils";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell,
} from "recharts";

export const Route = createFileRoute("/admin/panel")({ component: Panel });

type Tab = "players" | "entries" | "picks" | "gameweeks" | "teams" | "stats" | "audit" | "tools";


function Panel() {
  const nav = useNavigate();
  const [pin, setPin] = useState<string | null>(null);
  const [compId, setCompId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("players");

  useEffect(() => {
    const p = sessionStorage.getItem("osc_pin");
    const c = sessionStorage.getItem("osc_comp");
    if (!p || !c) nav({ to: "/admin" });
    else {
      setPin(p);
      setCompId(c);
    }
  }, [nav]);

  const fetchData = useServerFn(adminGetData);
  const { data, refetch } = useQuery({
    queryKey: ["admin", compId, pin],
    queryFn: () => fetchData({ data: { competitionId: compId!, pin: pin! } }),
    enabled: !!pin && !!compId,
  });

  if (!data) {
    return (
      <Shell>
        <Logo />
        <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  const tabs: Tab[] = ["players", "entries", "picks", "gameweeks", "teams", "stats", "tools", "audit"];

  return (
    <Shell>
      <header className="flex items-center justify-between">
        <Logo />
        <button
          className="text-xs uppercase tracking-widest text-muted-foreground"
          onClick={() => {
            sessionStorage.clear();
            nav({ to: "/admin" });
          }}
        >
          Sign out
        </button>
      </header>

      <div className="mt-6">
        <Eyebrow>{data.competition.name}</Eyebrow>
        <h1 className="display mt-1 text-3xl">ADMIN CONTROL PANEL</h1>
      </div>

      <nav className="mt-5 grid grid-cols-4 gap-1 rounded-lg border border-[color:var(--border)] bg-card p-1 text-[10px] uppercase tracking-widest sm:grid-cols-8">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md py-2 font-semibold",
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "players" && <Players data={data} compId={compId!} pin={pin!} onChange={refetch} />}
        {tab === "entries" && <Entries compId={compId!} pin={pin!} onChange={refetch} />}
        {tab === "picks" && <Picks data={data} compId={compId!} pin={pin!} onChange={refetch} />}
        {tab === "gameweeks" && <Gameweeks compId={compId!} pin={pin!} />}
        {tab === "teams" && <Teams compId={compId!} pin={pin!} />}
        {tab === "stats" && <Stats data={data} />}
        {tab === "audit" && <Audit compId={compId!} pin={pin!} />}
        {tab === "tools" && <Tools compId={compId!} pin={pin!} />}

      </div>
    </Shell>
  );
}


type Data = Awaited<ReturnType<typeof adminGetData>>;

const WINDOW_SIZE = 8;

function Players({ data, compId, pin, onChange }: { data: Data; compId: string; pin: string; onChange: () => void }) {
  const fetchTeams = useServerFn(listTeams);
  const togglePlayer = useServerFn(setPlayerAlive);
  const overrideP = useServerFn(overridePick);
  const removeP = useServerFn(deletePick);
  const qc = useQueryClient();
  const { data: teams = [] } = useQuery({
    queryKey: ["teams", compId, pin],
    queryFn: () => fetchTeams({ data: { competitionId: compId, pin } }),
    enabled: !!pin,
  });

  const badgeByName = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const t of teams as any[]) m.set(t.name, t.badge_url ?? null);
    return m;
  }, [teams]);

  // Build picks lookup: playerId -> week -> team
  const picksByPlayer = useMemo(() => {
    const m = new Map<string, Map<number, { team: string; result: string | null }>>();
    for (const p of data.picks) {
      if (!m.has(p.player_id)) m.set(p.player_id, new Map());
      m.get(p.player_id)!.set(p.week, { team: p.team, result: p.result });
    }
    return m;
  }, [data.picks]);

  const maxWeek = Math.max(
    data.competition.current_week ?? 1,
    ...data.picks.map((p) => p.week),
    WINDOW_SIZE,
  );

  const [start, setStart] = useState(1);
  const end = Math.min(start + WINDOW_SIZE - 1, maxWeek);
  const weeks = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  if (data.players.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No players yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Showing GW{start}–GW{end}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setStart(Math.max(1, start - WINDOW_SIZE))}
            disabled={start <= 1}
            className="rounded-md border border-[color:var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-widest disabled:opacity-40"
          >
            ◀ Prev
          </button>
          <button
            onClick={() => setStart(Math.min(maxWeek - WINDOW_SIZE + 1, start + WINDOW_SIZE))}
            disabled={end >= maxWeek}
            className="rounded-md border border-[color:var(--border)] px-3 py-1 text-xs font-semibold uppercase tracking-widest disabled:opacity-40"
          >
            Next ▶
          </button>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-[color:var(--border)] bg-card">
            <tr>
              <th className="sticky left-0 z-10 bg-card px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Entrant
              </th>
              {weeks.map((w) => (
                <th
                  key={w}
                  className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  GW{w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.players.map((p) => {
              const picks = picksByPlayer.get(p.id);
              return (
                <tr key={p.id} className={cn("border-b border-[color:var(--border)] last:border-0", !p.alive && "opacity-60")}>
                  <td className="sticky left-0 z-10 bg-background/95 px-3 py-2 align-middle">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold leading-tight">{p.full_name}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{p.email}</div>
                      </div>
                      <button
                        title={p.alive ? "Eliminate" : "Reinstate"}
                        className={cn(
                          "shrink-0 rounded-md border border-[color:var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                          p.alive ? "text-destructive" : "text-success",
                        )}
                        onClick={async () => {
                          const verb = p.alive ? "Eliminate" : "Reinstate";
                          const reason = window.prompt(`${verb} ${p.full_name}? Optional reason:`, "");
                          if (reason === null) return;
                          await togglePlayer({
                            data: { competitionId: compId, pin, playerId: p.id, alive: !p.alive, reason: reason || null },
                          });
                          await qc.invalidateQueries({ queryKey: ["admin", compId, pin] });
                          onChange();
                        }}
                      >
                        {p.alive ? "Elim" : "Reinst"}
                      </button>
                    </div>
                  </td>
                  {weeks.map((w) => {
                    const pick = picks?.get(w);
                    const handleCellClick = async () => {
                      const teamNames = (teams as any[]).map((t) => t.name);
                      const current = pick?.team ?? "";
                      const next = window.prompt(
                        `${pick ? "Override" : "Set"} pick for ${p.full_name} — GW${w}\n\nTeams: ${teamNames.join(", ")}\n\nEnter team name (blank to clear):`,
                        current,
                      );
                      if (next === null) return;
                      const trimmed = next.trim();
                      if (!trimmed) {
                        if (!pick) return;
                        if (!window.confirm("Delete this pick?")) return;
                        await removeP({ data: { competitionId: compId, pin, playerId: p.id, week: w } });
                      } else {
                        if (!teamNames.includes(trimmed)) {
                          alert(`Unknown team: ${trimmed}`);
                          return;
                        }
                        await overrideP({
                          data: { competitionId: compId, pin, playerId: p.id, week: w, team: trimmed },
                        });
                      }
                      await qc.invalidateQueries({ queryKey: ["admin", compId, pin] });
                      onChange();
                    };
                    if (!pick) {
                      return (
                        <td key={w} className="px-2 py-2 text-center text-muted-foreground/40">
                          <button onClick={handleCellClick} className="rounded px-2 py-1 hover:bg-muted/40">—</button>
                        </td>
                      );
                    }
                    const badge = badgeByName.get(pick.team) ?? null;
                    const ring =
                      pick.result === "W"
                        ? "ring-2 ring-success"
                        : pick.result === "L"
                          ? "ring-2 ring-destructive opacity-60"
                          : pick.result === "D"
                            ? "ring-2 ring-muted"
                            : "";
                    return (
                      <td key={w} className="px-2 py-2 text-center">
                        <button onClick={handleCellClick} className="mx-auto flex flex-col items-center gap-1">
                          {badge ? (
                            <img
                              src={badge}
                              alt={pick.team}
                              title={`${pick.team} — click to override`}
                              className={cn("h-7 w-7 rounded", ring)}
                            />
                          ) : (
                            <span
                              title={`${pick.team} — click to override`}
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded bg-muted text-[10px] font-bold",
                                ring,
                              )}
                            >
                              {pick.team.slice(0, 3).toUpperCase()}
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Green ring = won · red = lost · grey = draw. Empty cells mean no pick made yet.
      </p>
    </div>
  );
}

function Picks({ data, compId, pin, onChange }: { data: Data; compId: string; pin: string; onChange: () => void }) {
  const overrideP = useServerFn(overridePick);
  const qc = useQueryClient();
  const weeks = Array.from(new Set(data.picks.map((p) => p.week))).sort();
  const [week, setWeek] = useState<number>(weeks[weeks.length - 1] ?? data.competition.current_week);

  const weekPicks = data.picks.filter((p) => p.week === week);
  const counts = weekPicks.reduce<Record<string, number>>((acc, p) => {
    acc[p.team] = (acc[p.team] ?? 0) + 1;
    return acc;
  }, {});
  const chart = Object.entries(counts).map(([team, n]) => ({ team, n }));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(weeks.length ? weeks : [data.competition.current_week]).map((w) => (
          <button
            key={w}
            onClick={() => setWeek(w)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest",
              week === w
                ? "bg-primary text-primary-foreground"
                : "border border-[color:var(--border)] text-muted-foreground",
            )}
          >
            W{w}
          </button>
        ))}
      </div>

      <Card className="mt-4">
        {chart.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No picks yet for W{week}.</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ top: 10, right: 8, bottom: 8, left: -16 }}>
                <XAxis dataKey="team" tick={{ fontSize: 10, fill: "#cdbf9a" }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: "#cdbf9a" }} allowDecimals={false} />
                <Bar dataKey="n">
                  {chart.map((_, i) => (<Cell key={i} fill="#c9a84c" />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="mt-4 space-y-2">
        {weekPicks.map((p) => {
          const player = data.players.find((pl) => pl.id === p.player_id);
          return (
            <Card key={p.id} className="flex items-center justify-between p-3">
              <span className="text-sm">{player?.full_name ?? "?"}</span>
              <div className="flex items-center gap-3">
                <span className="display text-lg text-primary">{p.team}</span>
                <button
                  className="rounded-md border border-[color:var(--border)] px-2 py-1 text-[10px] uppercase tracking-widest"
                  onClick={async () => {
                    const next = window.prompt(`Override pick for ${player?.full_name} — GW${week}`, p.team);
                    if (!next) return;
                    await overrideP({
                      data: { competitionId: compId, pin, playerId: p.player_id, week, team: next.trim() },
                    });
                    await qc.invalidateQueries({ queryKey: ["admin", compId, pin] });
                    onChange();
                  }}
                >
                  Override
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---- Gameweeks (tabbed fixtures + winner picker) ----

const GW_TABS = Object.keys(FIXTURES_BY_WEEK)
  .map((n) => Number(n))
  .sort((a, b) => a - b);

function Gameweeks({ compId, pin }: { compId: string; pin: string }) {
  const fetchGws = useServerFn(listGameweeks);
  const seed = useServerFn(seedGameweek);
  const setWinner = useServerFn(setFixtureWinner);
  const fetchResults = useServerFn(listResults);
  const processGw = useServerFn(processGameweekResults);
  const unlockGw = useServerFn(unlockGameweek);

  const qc = useQueryClient();

  const [activeWeek, setActiveWeek] = useState<number>(GW_TABS[0] ?? 1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: gws = [] } = useQuery({
    queryKey: ["gws", compId, pin],
    queryFn: () => fetchGws({ data: { competitionId: compId, pin } }),
  });

  const activeGw = (gws as any[]).find((g) => g.week_number === activeWeek) ?? null;

  // Auto-seed gameweek + fixtures when tab opens and they don't exist
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErr(null);
        await seed({ data: { competitionId: compId, pin, weekNumber: activeWeek } });
        if (!cancelled) {
          await qc.invalidateQueries({ queryKey: ["gws", compId, pin] });
          await qc.invalidateQueries({ queryKey: ["results", "gw", activeWeek] });
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Failed to load gameweek");
      }
    })();
    return () => { cancelled = true; };
  }, [activeWeek, compId, pin]);

  const { data: results = [] } = useQuery({
    queryKey: ["results", "gw", activeWeek, activeGw?.id],
    queryFn: () => fetchResults({ data: { competitionId: compId, pin, gameweekId: activeGw!.id } }),
    enabled: !!activeGw,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-[color:var(--border)] bg-card p-1">
        {GW_TABS.map((w) => (
          <button
            key={w}
            onClick={() => setActiveWeek(w)}
            className={cn(
              "min-w-[3.5rem] rounded-md px-3 py-2 text-[11px] font-semibold uppercase tracking-widest",
              activeWeek === w ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            GW{w}
          </button>
        ))}
      </div>

      {err && <p className="text-xs text-destructive">{err}</p>}

      {!activeGw ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading GW{activeWeek}…</p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <div className="display text-lg text-primary">{activeGw.week_label}</div>
              {activeGw.results_locked && (
                <div className="text-xs text-success">Results locked ✓</div>
              )}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {(results as any[]).filter((r) => r.winner).length} / {(results as any[]).length} set
            </div>
          </div>

          <div className="space-y-2">
            {(results as any[]).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No fixtures for GW{activeWeek}.
              </p>
            )}
            {(results as any[]).map((r) => (
              <Card key={r.id} className="space-y-2 p-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="flex-1">{r.home_team}</span>
                  <span className="px-2 text-muted-foreground">vs</span>
                  <span className="flex-1 text-right">{r.away_team}</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(["home", "draw", "away"] as const).map((w) => {
                    const label = w === "home" ? r.home_team : w === "away" ? r.away_team : "Draw";
                    const active = r.winner === w;
                    return (
                      <button
                        key={w}
                        disabled={activeGw.results_locked || busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await setWinner({ data: { competitionId: compId, pin, resultId: r.id, winner: w } });
                            await qc.invalidateQueries({ queryKey: ["results", "gw", activeWeek, activeGw.id] });
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className={cn(
                          "rounded-md px-2 py-2 text-xs font-semibold uppercase tracking-widest",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "border border-[color:var(--border)] text-muted-foreground hover:bg-muted",
                          (activeGw.results_locked || busy) && "opacity-60",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Btn
              variant="danger"
              disabled={
                activeGw.results_locked ||
                (results as any[]).length === 0 ||
                (results as any[]).some((r) => !r.winner) ||
                busy
              }
              onClick={async () => {
                if (!confirm(`Lock ${activeGw.week_label}, eliminate losers, and email all alive players?`)) return;
                setBusy(true);
                try {
                  const out = await processGw({ data: { competitionId: compId, pin, gameweekId: activeGw.id } });
                  alert(`Locked. ${out.eliminated} eliminated · ${out.progressed} progressed.`);
                  await qc.invalidateQueries();
                  const next = GW_TABS.find((w) => w > activeWeek);
                  if (next) setActiveWeek(next);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {activeGw.results_locked ? "Locked ✓" : "Lock gameweek & move on →"}
            </Btn>
            {activeGw.results_locked && (
              <Btn
                disabled={busy}
                onClick={async () => {
                  if (!confirm(
                    `Unlock ${activeGw.week_label}? Eliminated players will be revived and you can re-edit winners. ` +
                    `Emails already sent cannot be recalled.`,
                  )) return;
                  setBusy(true);
                  try {
                    const out = await unlockGw({ data: { competitionId: compId, pin, gameweekId: activeGw.id } });
                    alert(`Unlocked. ${out.revived} player(s) revived.`);
                    await qc.invalidateQueries();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Unlock & re-edit
              </Btn>
            )}
          </div>

        </>
      )}
    </div>
  );
}



// ---- Teams ----

function Teams({ compId, pin }: { compId: string; pin: string }) {
  const fetchTeams = useServerFn(listTeams);
  const upsert = useServerFn(upsertTeam);
  const del = useServerFn(deleteTeam);
  const qc = useQueryClient();
  const { data: teams = [] } = useQuery({
    queryKey: ["teams", compId, pin],
    queryFn: () => fetchTeams({ data: { competitionId: compId, pin } }),
  });

  const [name, setName] = useState("");
  const [badgeUrl, setBadgeUrl] = useState("");

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Add team</p>
        <Field label="Team name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Badge URL (optional)" placeholder="https://…" value={badgeUrl} onChange={(e) => setBadgeUrl(e.target.value)} />
        <Btn
          disabled={!name}
          onClick={async () => {
            await upsert({ data: { competitionId: compId, pin, name, badgeUrl: badgeUrl || null } });
            setName(""); setBadgeUrl("");
            await qc.invalidateQueries({ queryKey: ["teams", compId, pin] });
          }}
        >
          Save team
        </Btn>
        <p className="text-[11px] text-muted-foreground">
          Tip: Premier League crests are at{" "}
          <span className="text-foreground">resources.premierleague.com/premierleague/badges/t&lt;id&gt;.png</span>
        </p>
      </Card>

      <div className="space-y-2">
        {teams.map((t: any) => (
          <Card key={t.id} className="flex items-center justify-between p-3 text-sm">
            <div className="flex items-center gap-2">
              {t.badge_url ? (
                <img src={t.badge_url} alt="" className="h-6 w-6 rounded" />
              ) : (
                <span className="h-6 w-6 rounded bg-muted" />
              )}
              <span>{t.name}</span>
            </div>
            <button
              className="text-xs text-destructive"
              onClick={async () => {
                await del({ data: { competitionId: compId, pin, id: t.id } });
                await qc.invalidateQueries({ queryKey: ["teams", compId, pin] });
              }}
            >
              Delete
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}


function Stats({ data }: { data: Data }) {
  const alive = data.players.filter((p) => p.alive);
  const out = data.players.length - alive.length;

  const byWeek = data.picks.reduce<Record<number, number>>((acc, p) => {
    acc[p.week] = (acc[p.week] ?? 0) + 1;
    return acc;
  }, {});
  const chart = Object.entries(byWeek).map(([w, n]) => ({ week: `W${w}`, n }));

  const survivors = alive.map((p) => ({
    name: p.full_name,
    weeks: data.picks.filter((pk) => pk.player_id === p.id).length,
    last: [...data.picks.filter((pk) => pk.player_id === p.id)].sort((a, b) => b.week - a.week)[0]?.team ?? "—",
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Alive</div>
          <div className="display mt-1 text-3xl text-primary">{alive.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Eliminated</div>
          <div className="display mt-1 text-3xl">{out}</div>
        </Card>
      </div>

      <Card>
        <Eyebrow>Picks per week</Eyebrow>
        <div className="mt-3 h-48">
          {chart.length ? (
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ top: 10, right: 8, bottom: 8, left: -16 }}>
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#cdbf9a" }} />
                <YAxis tick={{ fontSize: 10, fill: "#cdbf9a" }} allowDecimals={false} />
                <Bar dataKey="n" fill="#c9a84c" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="pt-12 text-center text-sm text-muted-foreground">No data yet.</p>
          )}
        </div>
      </Card>

      <Card>
        <Eyebrow>Survivors</Eyebrow>
        <div className="mt-3 divide-y divide-[color:var(--border)]">
          {survivors.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Nobody yet.</p>
          )}
          {survivors.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm">
              <span>{s.name}</span>
              <span className="text-muted-foreground">
                {s.weeks}w · last: <span className="text-primary">{s.last}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---- Entries (manual add + payments) ----

const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: "cash", label: "Cash" },
  { value: "online_revolut", label: "Revolut" },
  { value: "online_stripe", label: "Stripe" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "online_other", label: "Online (other)" },
  { value: "manual_other", label: "Manual (other)" },
];

function Entries({ compId, pin, onChange }: { compId: string; pin: string; onChange: () => void }) {
  const fetchEntries = useServerFn(listEntries);
  const addEntrant = useServerFn(addManualEntrant);
  const recordPay = useServerFn(recordPayment);
  const setPaid = useServerFn(setEntryPaid);
  const qc = useQueryClient();

  const { data: entries = [], refetch } = useQuery({
    queryKey: ["entries", compId, pin],
    queryFn: () => fetchEntries({ data: { competitionId: compId, pin } }),
  });

  const refresh = async () => {
    await refetch();
    await qc.invalidateQueries({ queryKey: ["admin", compId, pin] });
    onChange();
  };

  // Manual add form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paid, setPaidForm] = useState(true);
  const [method, setMethod] = useState<string>("cash");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Per-row record payment state
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [rowMethod, setRowMethod] = useState("cash");
  const [rowAmount, setRowAmount] = useState("");
  const [rowNote, setRowNote] = useState("");

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <Eyebrow>Add entrant manually</Eyebrow>
        <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Field label="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={paid} onChange={(e) => setPaidForm(e.target.checked)} />
          <span>Mark as paid</span>
        </label>

        {paid && (
          <div className="space-y-3 rounded-md border border-[color:var(--border)] p-3">
            <label className="block text-xs uppercase tracking-widest text-muted-foreground">
              Payment method
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-1 block w-full rounded-md border border-[color:var(--border)] bg-background px-3 py-2 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <Field label="Amount (EUR)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Field label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}

        {err && <p className="text-xs text-destructive">{err}</p>}

        <Btn
          disabled={!fullName || busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              await addEntrant({
                data: {
                  competitionId: compId,
                  pin,
                  fullName,
                  email: email || null,
                  phone: phone || null,
                  paid,
                  paymentMethod: paid ? (method as never) : null,
                  paymentAmount: paid && amount ? Number(amount) : null,
                  paymentNote: paid ? (note || null) : null,
                },
              });
              setFullName(""); setEmail(""); setPhone("");
              setAmount(""); setNote(""); setPaidForm(true); setMethod("cash");
              await refresh();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Failed to add entrant");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Adding…" : "Add entrant"}
        </Btn>
      </Card>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Eyebrow>All entries ({entries.length})</Eyebrow>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {entries.filter((e: any) => e.paid).length} paid · {entries.filter((e: any) => !e.paid).length} unpaid
          </div>
        </div>

        {entries.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">No entries yet.</p>
        )}

        {entries.map((e: any) => (
          <Card key={e.id} className="space-y-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold">{e.entrant?.full_name ?? "—"}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {e.entrant?.email ?? e.entrant?.phone ?? "no contact"} · {e.entrant?.source ?? "—"}
                </div>
                {e.payments.length > 0 && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    last: €{Number(e.payments[0].amount).toFixed(2)} · {e.payments[0].method}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                    e.paid ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive",
                  )}
                >
                  {e.paid ? "Paid" : "Unpaid"}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest",
                    e.alive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                  )}
                >
                  {e.alive ? "Alive" : "Out"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!e.paid && (
                <button
                  className="rounded-md border border-[color:var(--border)] px-2 py-1 text-[11px] uppercase tracking-widest"
                  onClick={() => {
                    setOpenRow(openRow === e.id ? null : e.id);
                    setRowMethod("cash"); setRowAmount(""); setRowNote("");
                  }}
                >
                  {openRow === e.id ? "Cancel" : "Record payment"}
                </button>
              )}
              <button
                className="rounded-md border border-[color:var(--border)] px-2 py-1 text-[11px] uppercase tracking-widest"
                onClick={async () => {
                  await setPaid({ data: { competitionId: compId, pin, entryId: e.id, paid: !e.paid } });
                  await refresh();
                }}
              >
                Mark {e.paid ? "unpaid" : "paid"}
              </button>
            </div>

            {openRow === e.id && (
              <div className="space-y-2 rounded-md border border-[color:var(--border)] p-3">
                <label className="block text-xs uppercase tracking-widest text-muted-foreground">
                  Method
                  <select
                    value={rowMethod}
                    onChange={(ev) => setRowMethod(ev.target.value)}
                    className="mt-1 block w-full rounded-md border border-[color:var(--border)] bg-background px-3 py-2 text-sm"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </label>
                <Field label="Amount (EUR)" type="number" value={rowAmount} onChange={(ev) => setRowAmount(ev.target.value)} />
                <Field label="Note (optional)" value={rowNote} onChange={(ev) => setRowNote(ev.target.value)} />
                <Btn
                  onClick={async () => {
                    await recordPay({
                      data: {
                        competitionId: compId,
                        pin,
                        entryId: e.id,
                        method: rowMethod as never,
                        amount: Number(rowAmount || 0),
                        note: rowNote || null,
                      },
                    });
                    setOpenRow(null);
                    await refresh();
                  }}
                >
                  Save payment
                </Btn>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---- Audit log ----

function Audit({ compId, pin }: { compId: string; pin: string }) {
  const fetchActions = useServerFn(listAdminActions);
  const { data: rows = [] } = useQuery({
    queryKey: ["audit", compId, pin],
    queryFn: () => fetchActions({ data: { competitionId: compId, pin, limit: 200 } }),
    refetchInterval: 10_000,
  });

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No admin actions yet.</p>;
  }

  return (
    <div className="space-y-2">
      <Eyebrow>Recent admin actions</Eyebrow>
      {rows.map((r: any) => (
        <Card key={r.id} className="space-y-1 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="display text-sm text-primary">{r.action}</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(r.created_at).toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            by {r.actor_label ?? "—"}
            {r.target_type ? ` · ${r.target_type}` : ""}
          </div>
          {r.payload && Object.keys(r.payload).length > 0 && (
            <pre className="overflow-x-auto rounded bg-muted/30 p-2 text-[10px] text-muted-foreground">
              {JSON.stringify(r.payload, null, 2)}
            </pre>
          )}
        </Card>
      ))}
    </div>
  );
}

function Tools({ compId, pin }: { compId: string; pin: string }) {
  const importFn = useServerFn(importEntrants);
  const broadcastFn = useServerFn(broadcastMessage);
  const listMsgs = useServerFn(listMessages);

  const [csv, setCsv] = useState("");
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number; errors: Array<{ row: number; reason: string }> } | null>(null);
  const [importing, setImporting] = useState(false);

  const [audience, setAudience] = useState<"all" | "alive" | "eliminated" | "paid" | "unpaid">("alive");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);

  const { data: messages, refetch: refetchMsgs } = useQuery({
    queryKey: ["admin-messages", compId],
    queryFn: () => listMsgs({ data: { competitionId: compId, pin } }),
  });

  function parseCsv(text: string): Array<{ fullName: string; email: string; phone?: string; paid?: boolean }> {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    // Detect header
    const first = lines[0].toLowerCase();
    const hasHeader = first.includes("name") || first.includes("email");
    const rows = hasHeader ? lines.slice(1) : lines;

    // Determine column order from header if present
    let cols = ["name", "email", "phone", "paid"];
    if (hasHeader) {
      cols = lines[0].split(",").map((c) => c.trim().toLowerCase());
    }

    return rows.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      const get = (key: string) => {
        const idx = cols.indexOf(key);
        return idx >= 0 ? parts[idx] : undefined;
      };
      const nameIdx = cols.findIndex((c) => c === "name" || c === "fullname" || c === "full_name");
      return {
        fullName: nameIdx >= 0 ? parts[nameIdx] ?? "" : parts[0] ?? "",
        email: get("email") ?? parts[1] ?? "",
        phone: get("phone") || undefined,
        paid: /^(1|true|yes|y|paid)$/i.test(get("paid") ?? ""),
      };
    });
  }

  async function handleImport() {
    const rows = parseCsv(csv);
    if (rows.length === 0) {
      setImportResult({ inserted: 0, skipped: 0, errors: [{ row: 0, reason: "no rows parsed" }] });
      return;
    }
    setImporting(true);
    try {
      const res = await importFn({ data: { competitionId: compId, pin, rows } });
      setImportResult({ inserted: res.inserted, skipped: res.skipped, errors: res.errors });
    } catch (e: unknown) {
      setImportResult({ inserted: 0, skipped: 0, errors: [{ row: 0, reason: (e as Error).message }] });
    } finally {
      setImporting(false);
    }
  }

  async function handleBroadcast() {
    if (!subject.trim() || !body.trim()) {
      setSendResult("Subject and body are required.");
      return;
    }
    if (!confirm(`Send broadcast to "${audience}" players?`)) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await broadcastFn({ data: { competitionId: compId, pin, audience, subject, body } });
      setSendResult(`Queued ${res.queued} of ${res.targeted} emails.`);
      setSubject("");
      setBody("");
      refetchMsgs();
    } catch (e: unknown) {
      setSendResult(`Error: ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <Eyebrow>Bulk CSV import</Eyebrow>
        <h2 className="display mt-1 text-xl">IMPORT ENTRANTS</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste CSV with columns: <code>name, email, phone, paid</code>. Header row optional.
          Duplicates (matching email in this competition) are skipped. Defaults to unpaid.
        </p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={"name,email,phone,paid\nTom Murphy,tom@example.com,0851234567,true\nMary Byrne,mary@example.com,,"}
          className="mt-3 h-40 w-full rounded-md border border-[color:var(--border)] bg-background p-3 font-mono text-xs"
        />
        <div className="mt-3 flex items-center gap-3">
          <Btn onClick={handleImport} disabled={importing || !csv.trim()}>
            {importing ? "Importing…" : "Import rows"}
          </Btn>
          {importResult && (
            <span className="text-xs text-muted-foreground">
              Inserted {importResult.inserted} · Skipped {importResult.skipped}
              {importResult.errors.length > 0 ? ` · ${importResult.errors.length} errors` : ""}
            </span>
          )}
        </div>
        {importResult && importResult.errors.length > 0 && (
          <ul className="mt-2 max-h-32 overflow-auto text-xs text-destructive">
            {importResult.errors.slice(0, 20).map((e, i) => (
              <li key={i}>Row {e.row}: {e.reason}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <Eyebrow>Broadcast</Eyebrow>
        <h2 className="display mt-1 text-xl">SEND MESSAGE</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Audience">
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as typeof audience)}
              className="w-full rounded-md border border-[color:var(--border)] bg-background p-2 text-sm"
            >
              <option value="alive">Alive players</option>
              <option value="eliminated">Eliminated players</option>
              <option value="paid">Paid players</option>
              <option value="unpaid">Unpaid players</option>
              <option value="all">All players</option>
            </select>
          </Field>
          <Field label="Subject">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              className="w-full rounded-md border border-[color:var(--border)] bg-background p-2 text-sm"
            />
          </Field>
        </div>
        <Field label="Body">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            className="h-40 w-full rounded-md border border-[color:var(--border)] bg-background p-2 text-sm"
            placeholder="Use blank lines to separate paragraphs."
          />
        </Field>
        <div className="mt-3 flex items-center gap-3">
          <Btn onClick={handleBroadcast} disabled={sending}>
            {sending ? "Sending…" : "Send broadcast"}
          </Btn>
          {sendResult && <span className="text-xs text-muted-foreground">{sendResult}</span>}
        </div>
      </Card>

      <Card>
        <Eyebrow>Recent broadcasts</Eyebrow>
        <ul className="mt-3 divide-y divide-[color:var(--border)] text-sm">
          {(messages ?? []).map((m) => (
            <li key={m.id} className="py-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{m.subject}</span>
                <span className="text-xs text-muted-foreground">
                  {m.audience} · {m.recipient_count ?? 0} sent
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(m.sent_at).toLocaleString()}
              </div>
            </li>
          ))}
          {(!messages || messages.length === 0) && (
            <li className="py-4 text-xs text-muted-foreground">No broadcasts yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
