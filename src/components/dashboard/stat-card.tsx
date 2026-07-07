import type { ComponentType } from "react";

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

/** A single headline metric: label, big tabular value, and a tinted icon.
 * `tone` picks the accent used for the icon chip; defaults to the indigo accent. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "accent",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconType;
  tone?: "accent" | "ok" | "low" | "out";
}) {
  const chip = {
    accent: "bg-accent-weak text-accent",
    ok: "bg-ok-weak text-ok-ink",
    low: "bg-low-weak text-low",
    out: "bg-out-weak text-out",
  }[tone];

  return (
    <div className="card flex items-start gap-4 p-5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${chip}`}>
        <Icon size={19} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">
          {label}
        </p>
        <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink tabular-nums">
          {value}
        </p>
        {hint ? <p className="mt-0.5 text-[13px] text-ink-muted">{hint}</p> : null}
      </div>
    </div>
  );
}
