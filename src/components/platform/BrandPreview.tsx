// Mini live preview of the entry page that re-renders as the operator edits
// brand fields in the activation wizard. Pure presentational — no data
// loading, no router. Colours fall back to the OneShotClub house palette
// when a slot is empty so the preview is always representative.

const DEFAULTS = {
  primary: "#0e3a25",
  accent: "#c9a84c",
  panelText: "#f8f3e3",
  metaText: "#cdbf9a",
};

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const ok = (v: string | null | undefined, fb: string) =>
  v && HEX_RE.test(v.trim()) ? v.trim() : fb;

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
}

export function BrandPreview(p: BrandPreviewProps) {
  const primary = ok(p.primary, DEFAULTS.primary);
  const accent = ok(p.accent, DEFAULTS.accent);
  const panelText = ok(p.panelText, DEFAULTS.panelText);
  const metaText = ok(p.metaText, DEFAULTS.metaText);
  const cardLogo = p.cardLogoUrl || p.logoUrl;

  return (
    <div className="sticky top-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          Live preview
        </span>
        <span className="text-[10px] text-muted-foreground">Entry page</span>
      </div>

      {/* Phone frame */}
      <div className="relative mx-auto w-full max-w-[260px] overflow-hidden rounded-[28px] border-4 border-neutral-800 bg-neutral-900 shadow-2xl">
        {/* Background image layer */}
        <div
          className="relative aspect-[9/16] w-full"
          style={{
            backgroundColor: primary,
            backgroundImage: p.backgroundUrl ? `url(${p.backgroundUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Tint over background so primary stays dominant */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${primary}cc 0%, ${primary}f0 100%)`,
            }}
          />

          {/* Content */}
          <div className="relative flex h-full flex-col p-3">
            {/* Header logo */}
            <div className="flex items-center justify-center pt-1">
              {p.logoUrl ? (
                <img
                  src={p.logoUrl}
                  alt=""
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div
                  className="rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-widest"
                  style={{ color: panelText, border: `1px dashed ${panelText}66` }}
                >
                  Club logo
                </div>
              )}
            </div>

            {/* Eyebrow */}
            <div
              className="mt-3 text-center text-[8px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: accent }}
            >
              Last One Standing
            </div>

            {/* Club name */}
            <h2
              className="mt-1 text-center text-[15px] font-semibold leading-tight"
              style={{ color: panelText }}
            >
              {p.clubName || "Your club"}
            </h2>

            {/* Card */}
            <div
              className="mt-3 rounded-xl p-3"
              style={{
                background: `${panelText}10`,
                border: `1px solid ${panelText}22`,
              }}
            >
              <div className="flex items-center gap-2">
                {cardLogo ? (
                  <img
                    src={cardLogo}
                    alt=""
                    className="h-8 w-8 rounded object-contain"
                  />
                ) : (
                  <div
                    className="h-8 w-8 rounded border border-dashed"
                    style={{ borderColor: `${panelText}55` }}
                  />
                )}
                <div className="min-w-0">
                  <div
                    className="truncate text-[10px] font-semibold"
                    style={{ color: panelText }}
                  >
                    Gameweek 1
                  </div>
                  <div
                    className="truncate text-[9px]"
                    style={{ color: metaText }}
                  >
                    Pick one team to win
                  </div>
                </div>
              </div>

              <p
                className="mt-2 line-clamp-3 text-[9px] leading-snug"
                style={{ color: metaText }}
              >
                {p.intro ||
                  "Enter once. One pick per gameweek. Last one standing wins the pot."}
              </p>
            </div>

            <div className="flex-1" />

            {/* CTA */}
            <button
              type="button"
              className="mt-3 w-full rounded-full py-2 text-[11px] font-semibold"
              style={{ background: accent, color: pickOnAccent(accent) }}
            >
              Enter now
            </button>
            <div
              className="mt-1.5 text-center text-[8px]"
              style={{ color: metaText }}
            >
              Powered by OneShotClub
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 space-y-1 text-[10px] text-muted-foreground">
        <Legend swatch={primary} label="Primary — page background & panels" />
        <Legend swatch={accent} label="Accent — CTA + eyebrow" />
        <Legend swatch={panelText} label="On-primary text — headings" />
        <Legend swatch={metaText} label="Muted text — meta & body" />
      </div>
    </div>
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

// Pick black/white text for an accent button based on luminance.
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
