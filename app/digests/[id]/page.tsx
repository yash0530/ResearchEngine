import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { loadDigestById } from "@/lib/digests";
import { DigestView } from "@/components/digest-view";

export const dynamic = "force-dynamic";

export default async function DigestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  const digest = Number.isFinite(numId) ? await loadDigestById(numId) : null;
  if (!digest) notFound();

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <div className="eyebrow">Engine · digest #{digest.id}</div>
          <h1 className="page-title">Digest · {digest.data.asOf ?? "—"}</h1>
          <p className="page-subtitle">
            Built {digest.createdAt.toLocaleString()}. Research, not advice.
          </p>
        </div>
        <Link
          href="/digests"
          className="muted flex items-center gap-1 text-xs hover:text-[var(--text)]"
        >
          all digests <ArrowUpRight size={12} />
        </Link>
      </div>

      <DigestView
        data={digest.data}
        llmMd={digest.llmMd}
        llmProvider={digest.llmProvider}
        llmModel={digest.llmModel}
      />
    </div>
  );
}
