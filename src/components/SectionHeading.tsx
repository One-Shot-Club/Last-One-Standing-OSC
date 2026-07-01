import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  children,
  center,
}: {
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && (
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          <span className="h-px w-6 bg-accent" />
          {eyebrow}
        </div>
      )}
      <h2 className="text-balance font-display text-4xl uppercase tracking-wide text-primary md:text-5xl">
        {title}
      </h2>
      {children && (
        <p className="mt-4 text-base text-muted-foreground md:text-lg">
          {children}
        </p>
      )}
    </div>
  );
}
