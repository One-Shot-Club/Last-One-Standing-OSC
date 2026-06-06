import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Shell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <div className="mx-auto max-w-md px-5 pb-32 pt-6">{children}</div>
    </div>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-7 w-7 rounded-full bg-primary" />
      <span className="display text-xl tracking-wide">
        OneShot<span className="text-primary">Club</span>
      </span>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[color:var(--border)] bg-card p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Btn({ variant = "primary", className, children, ...rest }: BtnProps) {
  const styles: Record<string, string> = {
    primary:
      "bg-primary text-primary-foreground hover:brightness-95 disabled:opacity-50",
    ghost:
      "bg-transparent text-foreground border border-[color:var(--border)] hover:bg-card",
    danger: "bg-destructive text-destructive-foreground hover:brightness-95",
  };
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center rounded-lg px-5 text-sm font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        {...rest}
        className="h-12 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--input)] px-4 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
    </label>
  );
}

export function StickyCTA({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[color:var(--border)] bg-background/95 px-5 py-4 backdrop-blur">
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  );
}
