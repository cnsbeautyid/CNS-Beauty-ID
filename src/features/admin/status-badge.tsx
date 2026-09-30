import { Badge, type BadgeTone } from "@/components/ui/badge";
import { CONTENT_STATUS_LABELS, PUBLISH_STATUS_LABELS } from "@/services/admin/model";

const CONTENT_TONES: Record<string, BadgeTone> = { approved: "success", pending_review: "brand", draft: "neutral", archived: "neutral" };
const PUBLISH_TONES: Record<string, BadgeTone> = { active: "success", draft: "neutral", archived: "neutral" };

export function ContentStatusBadge({ status }: { status: string }) {
  return <Badge tone={CONTENT_TONES[status] ?? "neutral"}>{CONTENT_STATUS_LABELS[status] ?? status}</Badge>;
}

export function PublishStatusBadge({ status }: { status: string }) {
  return <Badge tone={PUBLISH_TONES[status] ?? "neutral"}>{PUBLISH_STATUS_LABELS[status] ?? status}</Badge>;
}
