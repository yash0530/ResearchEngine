export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Ticker</div>
          <h1 className="page-title">{symbol.toUpperCase()}</h1>
          <p className="page-subtitle">Ticker detail lands in M6.</p>
        </div>
      </div>
    </div>
  );
}
