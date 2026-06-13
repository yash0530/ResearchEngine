export default async function BriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Brief</div>
          <h1 className="page-title">Brief #{id}</h1>
          <p className="page-subtitle">Brief detail lands in M7.</p>
        </div>
      </div>
    </div>
  );
}
