import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  adminGetData,
  lockWeek,
  setPickResult,
} from "@/lib/oneshot.functions";
import {
  listGameweeks,
  upsertGameweek,
  deleteGameweek,
  listTeams,
  upsertTeam,
  deleteTeam,
  listResults,
  upsertResult,
  deleteResult,
  processGameweekResults,
} from "@/lib/gameweeks.functions";
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

function Players({ data }: { data: Data }) {
  const [filter, setFilter] = useState<"all" | "alive" | "out">("all");
  const players = data.players.filter((p) =>
    filter === "all" ? true : filter === "alive" ? p.alive : !p.alive,
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 rounded-lg border border-[color:var(--border)] bg-card p-1 text-xs uppercase tracking-widest">
        {(["all", "alive", "out"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md py-2 font-semibold",
              filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      {players.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No players yet.</p>
      ) : (
        players.map((p) => (
          <Card key={p.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-semibold">{p.full_name}</div>
              <div className="text-xs text-muted-foreground">{p.email}</div>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-1 text-[10px] uppercase tracking-wider",
                p.alive ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive",
              )}
            >
              {p.alive ? "Alive" : "Out"}
            </span>
          </Card>
        ))
      )}
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

// ---- Gameweeks ----

function Gameweeks({ compId, pin }: { compId: string; pin: string }) {
  const fetchGws = useServerFn(listGameweeks);
  const upsert = useServerFn(upsertGameweek);
  const del = useServerFn(deleteGameweek);
  const qc = useQueryClient();
  const { data: gws = [] } = useQuery({
    queryKey: ["gws", compId, pin],
    queryFn: () => fetchGws({ data: { competitionId: compId, pin } }),
  });

  const [weekNumber, setWeekNumber] = useState("");
  const [weekLabel, setWeekLabel] = useState("");
  const [firstKickoff, setFirstKickoff] = useState("");
  const [lastEnds, setLastEnds] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true); setErr(null);
    try {
      await upsert({
        data: {
          competitionId: compId, pin,
          weekNumber: Number(weekNumber),
          weekLabel: weekLabel || `GW${weekNumber}`,
          firstKickoffAt: new Date(firstKickoff).toISOString(),
          lastMatchEndsAt: new Date(lastEnds).toISOString(),
        },
      });
      setWeekNumber(""); setWeekLabel(""); setFirstKickoff(""); setLastEnds("");
      await qc.invalidateQueries({ queryKey: ["gws", compId, pin] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <Card className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Add gameweek</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Week # (e.g. 1)" value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)} />
          <Field label="Label" placeholder="GW1" value={weekLabel} onChange={(e) => setWeekLabel(e.target.value)} />
        </div>
        <Field label="First kickoff (local time)" type="datetime-local" value={firstKickoff} onChange={(e) => setFirstKickoff(e.target.value)} />
        <Field label="Last match ends (local time)" type="datetime-local" value={lastEnds} onChange={(e) => setLastEnds(e.target.value)} />
        <Btn disabled={!weekNumber || !firstKickoff || !lastEnds || busy} onClick={save}>
          {busy ? "Saving…" : "Add gameweek"}
        </Btn>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <p className="text-[11px] text-muted-foreground">Deadline is automatically set to 2 hours before first kickoff.</p>
      </Card>

      {gws.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No gameweeks yet.</p>
      ) : (
        gws.map((g: any) => (
          <Card key={g.id} className="space-y-1 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="display text-lg text-primary">{g.week_label}</div>
              <button
                className="text-xs text-destructive"
                onClick={async () => {
                  if (!confirm(`Delete ${g.week_label}?`)) return;
                  await del({ data: { competitionId: compId, pin, id: g.id } });
                  await qc.invalidateQueries({ queryKey: ["gws", compId, pin] });
                }}
              >
                Delete
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Deadline: {new Date(g.deadline_at).toLocaleString("en-IE", { timeZone: "Europe/Dublin" })}
            </div>
            <div className="text-xs text-muted-foreground">
              Last match ends: {new Date(g.last_match_ends_at).toLocaleString("en-IE", { timeZone: "Europe/Dublin" })}
            </div>
            {g.results_locked && <div className="text-xs text-success">Results locked ✓</div>}
          </Card>
        ))
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
