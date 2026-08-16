export function Spinner({ full = false }: { full?: boolean }) {
  const el = (
    <div
      className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent"
      role="status"
      aria-label="Cargando"
    />
  );
  if (!full) return el;
  return <div className="flex min-h-screen items-center justify-center">{el}</div>;
}
