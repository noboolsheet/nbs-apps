import type { ReactNode } from "react";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-surface">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: "var(--gradient-italia)" }}
        aria-hidden="true"
      />
      <div
        aria-hidden="true"
        className="absolute -top-32 -right-32 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--gradient-italia)" }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-24">
        {eyebrow && (
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium uppercase tracking-widest text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {eyebrow}
          </div>
        )}
        <h1 className="mt-5 max-w-4xl text-display font-bold text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-5 max-w-2xl text-base text-muted-foreground lg:text-lg">{description}</p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}