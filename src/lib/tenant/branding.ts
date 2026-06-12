import { useEffect } from "react";

export type BrandingInput = {
  primary_color?: string | null; // page background / panels
  accent_color?: string | null;  // CTA + eyebrow
  panel_text_color?: string | null; // text on primary surfaces
  meta_text_color?: string | null;  // muted/meta text
};

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Best-contrast text colour for a swatch. */
function readableOn(hex: string): string {
  return luminance(hex) > 0.55 ? "#0a0a0a" : "#ffffff";
}

function ok(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return HEX_RE.test(t) || t.startsWith("oklch") || t.startsWith("hsl") || t.startsWith("rgb")
    ? t
    : null;
}

/**
 * Build the CSS variable map for a branding set. Exposed so callers (preview
 * frame, full-page hook) can apply the same theming to either a scoped
 * container or the document root.
 */
export function brandingCssVars(b: BrandingInput): Record<string, string> {
  const primary = ok(b.primary_color);
  const accent = ok(b.accent_color);
  const panelText = ok(b.panel_text_color);
  const metaText = ok(b.meta_text_color);

  const vars: Record<string, string> = {};

  if (primary) {
    vars["--background"] = primary;
    vars["--card"] = `color-mix(in oklab, ${primary} 88%, ${panelText ?? "#ffffff"} 12%)`;
    vars["--popover"] = vars["--card"];
    vars["--surface-elevated"] = `color-mix(in oklab, ${primary} 78%, ${panelText ?? "#ffffff"} 22%)`;
    vars["--secondary"] = vars["--surface-elevated"];
    vars["--muted"] = vars["--card"];
    vars["--input"] = vars["--surface-elevated"];
  }

  if (panelText) {
    vars["--foreground"] = panelText;
    vars["--card-foreground"] = panelText;
    vars["--popover-foreground"] = panelText;
    vars["--secondary-foreground"] = panelText;
  }

  if (metaText) {
    vars["--muted-foreground"] = metaText;
  }

  if (accent) {
    vars["--primary"] = accent;
    vars["--accent"] = accent;
    vars["--ring"] = accent;
    vars["--border"] = `color-mix(in oklab, ${accent} 32%, transparent)`;
    // Text that sits on top of accent buttons.
    if (HEX_RE.test(accent)) {
      const onAccent = readableOn(accent);
      vars["--primary-foreground"] = onAccent;
      vars["--accent-foreground"] = onAccent;
    }
  }

  return vars;
}

/**
 * Apply tenant branding to CSS variables on <html>. Restores prior values on
 * unmount. Use anywhere the whole page should reflect a tenant's palette —
 * entry page, admin login, admin panel, etc.
 */
export function useTenantBranding(branding: BrandingInput | null | undefined) {
  useEffect(() => {
    if (!branding) return;
    const vars = brandingCssVars(branding);
    const root = document.documentElement;
    const prev: Record<string, string> = {};
    for (const [k, v] of Object.entries(vars)) {
      prev[k] = root.style.getPropertyValue(k);
      root.style.setProperty(k, v);
    }
    return () => {
      for (const [k, v] of Object.entries(prev)) {
        if (v) root.style.setProperty(k, v);
        else root.style.removeProperty(k);
      }
    };
  }, [branding?.primary_color, branding?.accent_color, branding?.panel_text_color, branding?.meta_text_color]);
}
