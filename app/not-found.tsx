import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel panel-pad">
      <div className="eyebrow">404</div>
      <h2 className="page-title">Not found</h2>
      <p className="page-subtitle">That page does not exist.</p>
      <Link href="/" className="btn mt-4 inline-flex">
        Back to board
      </Link>
    </div>
  );
}
