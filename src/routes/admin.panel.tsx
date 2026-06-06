import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  adminGetData,
  lockWeek,
  setPickResult,
} from "@/lib/oneshot.functions";
import { Btn, Card, Eyebrow, Logo, Shell } from "@/components/oneshot/ui";
import { cn } from "@/lib/utils";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

export const Route = createFileRoute("/admin/panel")({ component: Panel });

type Tab = "players" | "picks" | "results" | "stats";

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
        <h1 className="display mt-1 text-3xl">
          Week {data.competition.current_week}
        </h1>
      </div>

      <nav className="mt-5 grid grid-cols-4 rounded-lg border border-[color:var(--border)] bg-card p-1 text-xs uppercase tracking-widest">
        {(["players", "picks", "results", "stats"] as Tab[]).map((t) => (
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
                  {chart.map((_, i) => (
                    <Cell key={i} fill="#c9a84c" />
                  ))}
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

function Results({
  data,
  pin,
  compId,
  onChange,
}: {
  data: Data;
  pin: string;
  compId: string;
  onChange: () => void;
}) {
  const setRes = useServerFn(setPickResult);
  const lock = useServerFn(lockWeek);
  const week = data.competition.current_week;
  const weekPicks = data.picks.filter((p) => p.week === week);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Set the result of each pick in Week {week}. Then lock the week to eliminate losers.
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
                      await setRes({
                        data: { competitionId: compId, pin, pickId: p.id, result: r },
                      });
                      onChange();
                    }}
                    className={cn(
                      "h-8 w-8 rounded text-xs font-bold",
                      p.result === r
                        ? r === "W"
                          ? "bg-success text-background"
                          : r === "L"
                            ? "bg-destructive text-destructive-foreground"
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
          const r = await lock({
            data: { competitionId: compId, pin, week },
          });
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

  // Weeks survived per alive player = number of picks they have
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
