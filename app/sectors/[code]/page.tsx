export default async function SectorPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Sector</div>
          <h1 className="page-title">Sector {code}</h1>
          <p className="page-subtitle">Sector detail lands in M6.</p>
        </div>
      </div>
    </div>
  );
}
