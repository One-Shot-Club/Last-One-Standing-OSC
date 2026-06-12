// Live preview of the public entry page that the wizard's brand step uses.
// Mirrors the real TenantEntry layout (logo, prize hero, fixtures with team
// selection, CTA, How it works) and applies the operator's in-progress
// branding via scoped CSS variables — so every colour they pick is visible
// in context before saving.
import { useState } from "react";
import { brandingCssVars } from "@/lib/tenant/branding";
import { getFixtures } from "@/lib/fixtures";

const RULES = [
  "Pick one Premier League team each gameweek.",
  "Win = survive. Lose/Draw = out.",
  "Can't reuse a team.",
  "Forget to pick = auto-assigned A-Z.",
  "Last one standing wins the pot.",
];

export interface BrandPreviewProps {
  clubName: string;
  primary: string;
  accent: string;
  panelText: string;
  metaText: string;
  logoUrl: string;
  backgroundUrl: string;
  cardLogoUrl: string;
  intro: string;
  entryFee: string | number;
  prizePool: string | number;
}

export function BrandPreview(p: BrandPreviewProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const fixtures = getFixtures(1).slice(0, 3);
  const prize = Number(p.prizePool) || 3000;
  const fee = Number(p.entryFee) || 10;

  const vars = brandingCssVars({
    primary_color: p.primary,
    accent_color: p.accent,
    panel_text_color: p.panelText,
    meta_text_color: p.metaText,
  });

  return (
    <div className="sticky top-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Live preview
        </span>
        <span className="text-[10px] text-muted-foreground">Entry page</span>
      </div>

      {/* Phone frame */}
      <div
        className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-[28px] border-4 border-neutral-800 shadow-2xl"
        style={vars as React.CSSProperties}
      >
        {/* Scrollable inner page */}
        <div
          className="relative aspect-[9/16] w-full overflow-y-auto bg-background text-foreground"
        >
          {/* Background image layer */}
          {p.backgroundUrl && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage: `url(${p.backgroundUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(4px)",
              }}
            />
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, color-mix(in oklab, var(--background) 30%, transparent) 0%, color-mix(in oklab, var(--background) 80%, transparent) 100%)",
            }}
          />

          {/* Content */}
          <div className="relative flex flex-col gap-3 p-3">
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              {p.logoUrl ? (
                <img src={p.logoUrl} alt="" className="h-12 w-12 object-contain" />
              ) : (
                <div className="h-12 w-12 rounded-full border border-dashed border-current/40" />
              )}
              <h2 className="mt-1 text-[12px] font-bold uppercase tracking-wide">
                {p.clubName || "Your club"}
              </h2>
              <p className="text-[7px] uppercase tracking-[0.25em] text-muted-foreground">
                Powered by <span className="text-primary">OneShotClub</span>
              </p>
            </div>

            {/* Prize hero card */}
            <div className="rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-primary">
                Winner Takes All
              </p>
              <div
                className="mt-1 text-3xl font-extrabold leading-none text-primary"
                style={{ fontFamily: "var(--font-display)" }}
              >
                €{prize.toLocaleString()}
              </div>
              <p className="mt-1 text-[8px] text-muted-foreground">
                Entry <span className="font-semibold text-foreground">€{fee}</span> · Last Man Standing
              </p>
            </div>

            {/* Fixtures */}
            <div>
              <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-primary">
                Gameweek 1 fixtures
              </p>
              <h3 className="mt-0.5 text-[11px] font-bold uppercase">Make your pick</h3>
              <div className="mt-1.5 space-y-1">
                {fixtures.map((f, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-border bg-card p-1"
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                      <MiniTeam
                        name={f.home}
                        badge={f.homeBadge}
                        selected={picked === f.home}
                        onClick={() => setPicked(f.home)}
                      />
                      <span className="text-[7px] font-bold text-primary">vs</span>
                      <MiniTeam
                        name={f.away}
                        badge={f.awayBadge}
                        selected={picked === f.away}
                        onClick={() => setPicked(f.away)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <button
              type="button"
              className="mt-1 w-full rounded-lg bg-primary py-2 text-[10px] font-bold uppercase tracking-wider text-primary-foreground"
            >
              {picked ? `Continue with ${picked}` : "Select a team"}
            </button>

            {/* How it works */}
            <div>
              <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-primary">
                How it works
              </p>
              <ol className="mt-1 space-y-0.5">
                {RULES.map((r, i) => (
                  <li key={i} className="text-[8px] leading-snug text-muted-foreground">
                    <span className="text-primary">{i + 1}.</span> {r}
                  </li>
                ))}
              </ol>
              {p.intro && (
                <p className="mt-1.5 text-[8px] leading-snug text-muted-foreground">
                  {p.intro}
                </p>
              )}
            </div>

            {p.cardLogoUrl && p.cardLogoUrl !== p.logoUrl && (
              <div className="flex items-center justify-center pt-1">
                <img
                  src={p.cardLogoUrl}
                  alt=""
                  className="h-6 w-6 object-contain opacity-80"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-1 text-[10px] text-muted-foreground">
        <Legend swatch={p.primary || "#0e3a25"} label="Primary — page + cards" />
        <Legend swatch={p.accent || "#c9a84c"} label="Accent — CTA, eyebrow, prize" />
        <Legend swatch={p.panelText || "#f8f3e3"} label="On-primary text" />
        <Legend swatch={p.metaText || "#cdbf9a"} label="Muted / meta text" />
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        These colours also theme the admin screens for this tenant.
      </p>
    </div>
  );
}

function MiniTeam({
  name,
  badge,
  selected,
  onClick,
}: {
  name: string;
  badge: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded border px-1 py-0.5 text-left transition ${
        selected
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-primary/60"
      }`}
      style={{
        background: "color-mix(in oklab, var(--background) 70%, var(--card) 30%)",
      }}
    >
      <img src={badge} alt="" className="h-3 w-3 object-contain" />
      <span className="truncate text-[7px] font-semibold">{name}</span>
    </button>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-3 w-3 rounded border border-border"
        style={{ background: swatch }}
      />
      <span>{label}</span>
    </div>
  );
}
