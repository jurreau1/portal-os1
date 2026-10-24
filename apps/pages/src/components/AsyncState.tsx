export function AsyncState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error?: string;
  retry: () => void;
}) {
  if (error)
    return (
      <div className="notice error" role="alert">
        <strong>Unable to load this view</strong>
        <p>{error}</p>
        <button onClick={retry}>Try again</button>
      </div>
    );
  if (loading)
    return (
      <p className="notice" role="status">
        Loading portal data…
      </p>
    );
  return null;
}
export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="notice">{children}</p>;
}
