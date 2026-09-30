import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { InsightError } from "@/features/admin/insight-error";
import { AdminPageHeader } from "@/features/admin/page-header";
import { formatDateTime } from "@/lib/utils/format";
import { requireStaff } from "@/services/admin/auth";
import { listAuditLog } from "@/services/admin/insights";

export const metadata = { title: "Audit log" };

export default async function AdminAuditLogPage() {
  await requireStaff(ROUTES.admin.auditLog);
  const entries = await listAuditLog(100);

  return (
    <>
      <AdminPageHeader title="Audit log" description="100 aksi admin terbaru. Log ini hanya bisa ditambah; tidak bisa diubah atau dihapus." />
      {entries === null ? (
        <InsightError href={ROUTES.admin.auditLog} />
      ) : entries.length === 0 ? (
        <EmptyState icon={<ScrollText className="size-8" strokeWidth={1.25} />} title="Belum ada aksi admin" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-background text-body-s">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex flex-wrap justify-between gap-2">
                <span>
                  <span className="font-mono text-caption">{entry.action}</span>
                  <span className="text-text-secondary">
                    {" "}
                    · {entry.entityType}
                    {entry.entityId && ` ${entry.entityId.slice(0, 8)}`}
                  </span>
                </span>
                <span className="text-caption text-text-secondary">
                  {entry.actor} · {formatDateTime(entry.createdAt)}
                </span>
              </div>
              <details>
                <summary className="cursor-pointer text-caption text-text-secondary">Detail</summary>
                <pre className="mt-1 overflow-x-auto rounded-sm bg-surface p-2 text-caption">{JSON.stringify(entry.summary, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
