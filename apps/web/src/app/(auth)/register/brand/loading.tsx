export default function BrandRegisterLoading() {
  return (
    <div className="animate-pulse" role="status" aria-label="Loading">
      <div className="h-7 w-2/3 rounded bg-muted" />
      <div className="mt-3 h-4 w-4/5 rounded bg-muted" />
      <div className="mt-6 h-16 rounded-lg bg-muted" />
      <div className="mt-6 space-y-4">
        <div className="h-11 rounded-lg bg-muted" />
        <div className="h-11 rounded-lg bg-muted" />
        <div className="h-11 rounded-lg bg-muted" />
        <div className="h-11 rounded-lg bg-muted" />
      </div>
      <div className="mt-6 h-11 rounded-full bg-muted" />
    </div>
  );
}
