"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="panel panel-pad">
      <div className="eyebrow">Error</div>
      <h2 className="page-title">Something broke</h2>
      <p className="page-subtitle">{error.message}</p>
      <button type="button" className="btn mt-4" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
