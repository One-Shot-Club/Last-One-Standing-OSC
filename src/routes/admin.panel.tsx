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
  processGameweekResults,
  seedGameweek,
  setFixtureWinner,
  unlockGameweek,
} from "@/lib/gameweeks.functions";
import { FIXTURES_BY_WEEK } from "@/lib/fixtures";


import { Btn, Card, Eyebrow, Field, Logo, Shell } from "@/components/oneshot/ui";

import { cn } from "@/lib/utils";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Cell,
} from "recharts";

export const Route = createFileRoute("/admin/panel")({ component: Panel });

type Tab = "players" | "picks" | "gameweeks" | "teams" | "results" | "stats";

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

  const tabs: Tab[] = ["players", "picks", "gameweeks", "teams", "results", "stats"];

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
        <h1 className="display mt-1 text-3xl">Week {data.competition.current_week}</h1>
      </div>

      <nav className="mt-5 grid grid-cols-3 gap-1 rounded-lg border border-[color:var(--border)] bg-card p-1 text-[10px] uppercase tracking-widest sm:grid-cols-6">
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
        {tab === "players" && <Players data={data} />}
        {tab === "picks" && <Picks data={data} />}
        {tab === "gameweeks" && <Gameweeks compId={compId!} pin={pin!} />}
        {tab === "teams" && <Teams compId={compId!} pin={pin!} />}
        {tab === "results" && (
          <Results data={data} pin={pin!} compId={compId!} onChange={refetch} />
        )}
        {tab === "stats" && <Stats data={data} />}
      </div>
    </Shell>
  );
}

type Data = Awaited<ReturnType<typeof adminGetData>>;

const WINDOW_SIZE = 8;

function Players({ data }: { data: Data }) {
  const compId = data.competition.id;
  const fetchTeams = useServerFn(listTeams);
  // pin is stored in sessionStorage; pull from there to avoid prop plumbing
  const pin = typeof window !== "undefined" ? sessionStorage.getItem("osc_pin") ?? "" : "";
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
                <tr key={p.id} className="border-b border-[color:var(--border)] last:border-0">
                  <td className="sticky left-0 z-10 bg-background/95 px-3 py-2 align-middle">
                    <div className="font-semibold leading-tight">{p.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{p.email}</div>
                  </td>
                  {weeks.map((w) => {
                    const pick = picks?.get(w);
                    if (!pick) {
                      return (
                        <td key={w} className="px-2 py-2 text-center text-muted-foreground/40">
                          —
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
                        <div className="mx-auto flex flex-col items-center gap-1">
                          {badge ? (
                            <img
                              src={badge}
                              alt={pick.team}
                              title={pick.team}
                              className={cn("h-7 w-7 rounded", ring)}
                            />
                          ) : (
                            <span
                              title={pick.team}
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded bg-muted text-[10px] font-bold",
                                ring,
                              )}
                            >
                              {pick.team.slice(0, 3).toUpperCase()}
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
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Green ring = won · red = lost · grey = draw. Empty cells mean no pick made yet.
      </p>
    </div>
  );
}

function Picks({ data }: { data: Data }) {
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
              <span className="display text-lg text-primary">{p.team}</span>
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

// ---- Results ----

function Results({
  data, pin, compId, onChange,
}: {
  data: Data; pin: string; compId: string; onChange: () => void;
}) {
  const fetchGws = useServerFn(listGameweeks);
  const fetchResults = useServerFn(listResults);
  const upsertRes = useServerFn(upsertResult);
  const delRes = useServerFn(deleteResult);
  const processGw = useServerFn(processGameweekResults);
  const fetchTeams = useServerFn(listTeams);
  const qc = useQueryClient();

  const { data: gws = [] } = useQuery({
    queryKey: ["gws", compId, pin],
    queryFn: () => fetchGws({ data: { competitionId: compId, pin } }),
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["teams", compId, pin],
    queryFn: () => fetchTeams({ data: { competitionId: compId, pin } }),
  });

  const upcoming = useMemo(() => {
    const now = Date.now();
    return gws.find((g: any) => !g.results_locked && new Date(g.last_match_ends_at).getTime() < now)
      ?? gws.find((g: any) => !g.results_locked)
      ?? gws[gws.length - 1]
      ?? null;
  }, [gws]);

  const [selectedGwId, setSelectedGwId] = useState<string | null>(null);
  const activeGw = gws.find((g: any) => g.id === (selectedGwId ?? upcoming?.id)) ?? null;

  const { data: results = [] } = useQuery({
    queryKey: ["results", activeGw?.id, pin],
    queryFn: () => fetchResults({ data: { competitionId: compId, pin, gameweekId: activeGw!.id } }),
    enabled: !!activeGw,
  });

  const [home, setHome] = useState("");
  const [away, setAway] = useState("");

  // Fallback to legacy week-based "set result + lock" if there are no gameweek rows yet.
  if (gws.length === 0) {
    return <LegacyResults data={data} pin={pin} compId={compId} onChange={onChange} />;
  }

  if (!activeGw) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No gameweeks.</p>;
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <label className="block text-xs uppercase tracking-widest text-muted-foreground">
          Gameweek
        </label>
        <select
          value={activeGw.id}
          onChange={(e) => setSelectedGwId(e.target.value)}
          className="h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-3"
        >
          {gws.map((g: any) => (
            <option key={g.id} value={g.id}>
              {g.week_label} {g.results_locked ? " (locked)" : ""}
            </option>
          ))}
        </select>
      </Card>

      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Add fixture</p>
        <div className="grid grid-cols-2 gap-2">
          <TeamSelect label="Home" teams={teams} value={home} onChange={setHome} />
          <TeamSelect label="Away" teams={teams} value={away} onChange={setAway} />
        </div>
        <Btn
          disabled={!home || !away || home === away}
          onClick={async () => {
            await upsertRes({
              data: {
                competitionId: compId, pin, gameweekId: activeGw.id,
                homeTeam: home, awayTeam: away,
              },
            });
            setHome(""); setAway("");
            await qc.invalidateQueries({ queryKey: ["results", activeGw.id, pin] });
          }}
        >
          Add fixture
        </Btn>
      </Card>

      <div className="space-y-2">
        {results.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No fixtures yet.</p>
        )}
        {results.map((r: any) => (
          <Card key={r.id} className="space-y-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex-1 text-sm font-semibold">{r.home_team}</span>
              <ScoreInput
                value={r.home_score}
                onSave={(v) =>
                  upsertRes({
                    data: {
                      competitionId: compId, pin, id: r.id, gameweekId: activeGw.id,
                      homeTeam: r.home_team, awayTeam: r.away_team,
                      homeScore: v, awayScore: r.away_score ?? null,
                    },
                  }).then(() => qc.invalidateQueries({ queryKey: ["results", activeGw.id, pin] }))
                }
              />
              <span className="text-muted-foreground">-</span>
              <ScoreInput
                value={r.away_score}
                onSave={(v) =>
                  upsertRes({
                    data: {
                      competitionId: compId, pin, id: r.id, gameweekId: activeGw.id,
                      homeTeam: r.home_team, awayTeam: r.away_team,
                      homeScore: r.home_score ?? null, awayScore: v,
                    },
                  }).then(() => qc.invalidateQueries({ queryKey: ["results", activeGw.id, pin] }))
                }
              />
              <span className="flex-1 text-right text-sm font-semibold">{r.away_team}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {r.winner ? `Winner: ${r.winner === "draw" ? "Draw" : r.winner === "home" ? r.home_team : r.away_team}` : "Pending"}
              </span>
              <button
                className="text-destructive"
                onClick={async () => {
                  await delRes({ data: { competitionId: compId, pin, id: r.id } });
                  await qc.invalidateQueries({ queryKey: ["results", activeGw.id, pin] });
                }}
              >
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Btn
        variant="danger"
        disabled={activeGw.results_locked}
        onClick={async () => {
          if (!confirm(`Lock ${activeGw.week_label} and email all alive players?`)) return;
          const r = await processGw({ data: { competitionId: compId, pin, gameweekId: activeGw.id } });
          alert(`Locked. ${r.eliminated} eliminated · ${r.progressed} progressed.`);
          await qc.invalidateQueries();
          onChange();
        }}
      >
        {activeGw.results_locked ? "Already locked" : "Lock & email players →"}
      </Btn>
    </div>
  );
}

function TeamSelect({
  label, teams, value, onChange,
}: { label: string; teams: any[]; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-3"
      >
        <option value="">—</option>
        {teams.map((t) => (
          <option key={t.id} value={t.name}>{t.name}</option>
        ))}
      </select>
    </label>
  );
}

function ScoreInput({ value, onSave }: { value: number | null; onSave: (v: number | null) => Promise<unknown> }) {
  const [v, setV] = useState<string>(value == null ? "" : String(value));
  useEffect(() => { setV(value == null ? "" : String(value)); }, [value]);
  return (
    <input
      type="number"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const num = v === "" ? null : Number(v);
        if (num !== value) onSave(num);
      }}
      className="h-9 w-12 rounded border border-[color:var(--border)] bg-[color:var(--input)] text-center"
    />
  );
}

// Legacy: pre-gameweek world (per-pick W/D/L + lockWeek). Kept for back-compat.
function LegacyResults({
  data, pin, compId, onChange,
}: {
  data: Data; pin: string; compId: string; onChange: () => void;
}) {
  const setRes = useServerFn(setPickResult);
  const lock = useServerFn(lockWeek);
  const week = data.competition.current_week;
  const weekPicks = data.picks.filter((p) => p.week === week);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        No gameweeks yet — using legacy per-pick mode for Week {week}.
        Add a gameweek in the <strong>Gameweeks</strong> tab to enable the new flow with emails.
      </p>
      {weekPicks.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">No picks this week.</p>
      )}
      {weekPicks.map((p) => {
        const player = data.players.find((pl) => pl.id === p.player_id);
        return (
          <Card key={p.id} className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{player?.full_name}</div>
                <div className="text-xs text-primary">{p.team}</div>
              </div>
              <div className="flex gap-1">
                {(["W", "D", "L"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={async () => {
                      await setRes({ data: { competitionId: compId, pin, pickId: p.id, result: r } });
                      onChange();
                    }}
                    className={cn(
                      "h-8 w-8 rounded text-xs font-bold",
                      p.result === r
                        ? r === "W" ? "bg-success text-background"
                          : r === "L" ? "bg-destructive text-destructive-foreground"
                          : "bg-primary text-primary-foreground"
                        : "border border-[color:var(--border)] text-muted-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        );
      })}

      <Btn
        variant="danger"
        onClick={async () => {
          if (!confirm(`Lock Week ${week} and eliminate non-winners?`)) return;
          const r = await lock({ data: { competitionId: compId, pin, week } });
          alert(`Locked. ${r.eliminated} eliminated.`);
          onChange();
        }}
      >
        Lock Week & Eliminate →
      </Btn>
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
