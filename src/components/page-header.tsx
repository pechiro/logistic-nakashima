/** Sticky page header shared across the app. `children` renders as the trailing
 * action slot. top-14 clears the mobile top bar; resets to 0 once the sidebar shows. */
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-14 z-20 border-b border-line bg-canvas/80 backdrop-blur-md lg:top-0">
      <div className="flex items-center justify-between gap-4 px-5 py-4 lg:px-8">
        {/* min-w-0 + break-words: a long, unspaced project name is a single
            word at text-2xl, which would otherwise widen the page on mobile. */}
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            {eyebrow}
          </p>
          <h1 className="mt-0.5 break-words font-display text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
        </div>
        {children}
      </div>
    </header>
  );
}
