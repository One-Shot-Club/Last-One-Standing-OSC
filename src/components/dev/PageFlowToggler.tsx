import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

const FLOW: { path: string; label: string }[] = [
  { path: "/", label: "Home" },
  { path: "/welcome", label: "Welcome" },
  { path: "/how-it-works", label: "How it works" },
  { path: "/pick", label: "Pick" },
  { path: "/pay", label: "Pay" },
  { path: "/gw2", label: "GW2" },
  { path: "/unsubscribe", label: "Unsubscribe" },
  { path: "/dashboard", label: "Dashboard" },
  { path: "/admin/panel", label: "Admin panel" },
  { path: "/platform/admin", label: "Platform admin" },
];

export function PageFlowToggler() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  // Only show when ?dev is present in URL
  if (typeof window !== "undefined" && !window.location.search.includes("dev")) {
    return null;
  }

  const idx = FLOW.findIndex((p) => p.path === pathname);
  const prev = idx > 0 ? FLOW[idx - 1] : FLOW[FLOW.length - 1];
  const next = idx >= 0 && idx < FLOW.length - 1 ? FLOW[idx + 1] : FLOW[0];
  const current = idx >= 0 ? FLOW[idx] : { label: pathname, path: pathname };

  return (
    <div className="fixed bottom-3 right-3 z-[100] flex flex-col items-end gap-2 font-mono text-xs">
      {open && (
        <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-white/20 bg-black/85 p-2 text-white shadow-2xl backdrop-blur">
          <div className="mb-1 px-2 pt-1 text-[10px] uppercase tracking-widest opacity-60">
            Page flow
          </div>
          {FLOW.map((p) => (
            <Link
              key={p.path}
              to={p.path}
              search={{ dev: "" } as never}
              onClick={() => setOpen(false)}
              className={`block rounded px-2 py-1.5 hover:bg-white/15 ${
                p.path === pathname ? "bg-white/20 font-bold" : ""
              }`}
            >
              <span className="opacity-50">{p.path}</span>{" "}
              <span className="ml-1">{p.label}</span>
            </Link>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/85 px-1 py-1 text-white shadow-2xl backdrop-blur">
        <Link
          to={prev.path}
          search={{ dev: "" } as never}
          title={`Prev: ${prev.label}`}
          className="rounded-full px-2 py-1 hover:bg-white/15"
        >
          ←
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-full px-3 py-1 hover:bg-white/15"
          title="Toggle page list"
        >
          {current.label}
        </button>
        <Link
          to={next.path}
          search={{ dev: "" } as never}
          title={`Next: ${next.label}`}
          className="rounded-full px-2 py-1 hover:bg-white/15"
        >
          →
        </Link>
      </div>
    </div>
  );
}
