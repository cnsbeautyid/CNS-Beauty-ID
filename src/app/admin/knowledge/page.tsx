import { BookOpen } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { ActionButton } from "@/features/admin/action-button";
import { decideKnowledgeAction } from "@/features/admin/actions";
import { AdminPageHeader } from "@/features/admin/page-header";
import { ContentStatusBadge } from "@/features/admin/status-badge";
import { formatDateTime } from "@/lib/utils/format";
import { requireStaff } from "@/services/admin/auth";
import { listKnowledge } from "@/services/admin/knowledge";

export const metadata = { title: "Knowledge" };

export default async function AdminKnowledgePage() {
  await requireStaff(ROUTES.admin.knowledge);
  const docs = await listKnowledge();

  return (
    <>
      <AdminPageHeader
        title="Knowledge Beauty AI"
        description="Beauty AI hanya menjawab dari dokumen yang disetujui. Baca isi dokumen sebelum menyetujui; perubahan isi dokumen yang sudah disetujui mengembalikannya ke review."
      />
      {docs === null ? (
        <ErrorState
          description="Dokumen belum dapat dimuat."
          action={
            <ButtonLink href={ROUTES.admin.knowledge} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      ) : docs.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-8" strokeWidth={1.25} />} title="Belum ada dokumen" />
      ) : (
        <ul className="flex flex-col gap-4">
          {docs.map((doc) => (
            <Card as="li" key={doc.id} padding="lg" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-h4">{doc.title}</h2>
                <ContentStatusBadge status={doc.status} />
              </div>
              <p className="text-caption text-text-secondary">
                Kategori {doc.category} · {doc.chunks} potongan · diperbarui {formatDateTime(doc.updatedAt)}
                {doc.approvedAt && ` · disetujui ${formatDateTime(doc.approvedAt)}`}
              </p>
              <details className="text-body-s">
                <summary className="min-h-11 cursor-pointer content-center text-text-secondary">Baca isi dokumen</summary>
                <p className="mt-2 whitespace-pre-line">{doc.body}</p>
              </details>
              <div className="flex flex-wrap gap-4">
                {doc.status !== "approved" && (
                  <ActionButton action={decideKnowledgeAction} payload={{ id: doc.id, decision: "approve" }} label="Setujui" confirmLabel="Ya, isi sudah saya periksa" variant="primary" />
                )}
                {doc.status !== "draft" && <ActionButton action={decideKnowledgeAction} payload={{ id: doc.id, decision: "draft" }} label="Kembalikan ke draft" />}
                {doc.status !== "archived" && (
                  <ActionButton action={decideKnowledgeAction} payload={{ id: doc.id, decision: "archive" }} label="Arsipkan" confirmLabel="Ya, arsipkan" variant="ghost" />
                )}
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
