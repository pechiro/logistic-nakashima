export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
        {icon}
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
