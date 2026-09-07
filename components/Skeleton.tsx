/**
 * One loading pattern for the whole app: a page-level skeleton so screens
 * never flash blank while Supabase answers.
 */
export function Skeleton({ cards = 2, heading = true }: { cards?: number; heading?: boolean }) {
  return (
    <div className="skeleton" aria-busy="true" aria-live="polite">
      <span className="sr-only">…</span>
      {heading && <div className="skel title" />}
      {Array.from({ length: cards }).map((_, i) => (
        <div className="skel card" key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton({ cards = 2, wide = false }: { cards?: number; wide?: boolean }) {
  return (
    <main className={`container${wide ? " wide" : ""}`}>
      <Skeleton cards={cards} />
    </main>
  );
}

export default PageSkeleton;
