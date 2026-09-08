export default function WorkspaceLoading() {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">Loading workspace…</span>
      <div className="h-10 w-56 rounded bg-muted" />
      <div className="grid gap-5 md:grid-cols-3">
        {[1, 2, 3].map((id) => (
          <div key={id} className="h-56 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
