import { useEffect } from "react";
import type { TenantBranding } from "@/lib/tenant.functions";

/**
 * Apply tenant branding to CSS variables on <html>.
 * Accepts hex/HSL/CSS color strings; written to --primary and --accent.
 * Restores previous values on unmount.
 */
export function useTenantBranding(branding: TenantBranding | null) {
  useEffect(() => {
    if (!branding) return;
    const root = document.documentElement;
    const prev: Record<string, string> = {};
    if (branding.primary_color) {
      prev["--primary"] = root.style.getPropertyValue("--primary");
      root.style.setProperty("--primary", branding.primary_color);
    }
    if (branding.accent_color) {
      prev["--accent"] = root.style.getPropertyValue("--accent");
      root.style.setProperty("--accent", branding.accent_color);
    }
    return () => {
      for (const [k, v] of Object.entries(prev)) {
        if (v) root.style.setProperty(k, v);
        else root.style.removeProperty(k);
      }
    };
  }, [branding]);
}
