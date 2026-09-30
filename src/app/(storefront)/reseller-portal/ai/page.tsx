import { Card } from "@/components/ui/card";
import { AskAIButton, AskAIChip } from "@/components/ai/ask-ai-button";
import { ROUTES } from "@/constants/routes";
import { PartnerGateNotice } from "@/features/reseller/partner-gate-notice";
import { requirePartner } from "@/services/reseller/reseller";

export const metadata = { title: "Asisten AI Partner" };

const QUICK_ACTIONS = [
  { label: "Harga partner saya", prompt: "Berapa harga partner dan minimal pembelian untuk levelku?" },
  { label: "Ringkasan pesanan", prompt: "Tolong ringkas pesanan partnerku 6 bulan terakhir." },
  { label: "Ide caption Instagram", prompt: "Buatkan ide caption Instagram untuk salah satu produk CNS Beauty berdasarkan informasi resminya." },
  { label: "Jawab pertanyaan pembeli", prompt: "Bagaimana cara menjelaskan cara pakai produk CNS Beauty kepada pembeliku?" },
] as const;

export default async function ResellerAIPage() {
  const gate = await requirePartner(ROUTES.resellerPortal.ai);
  if (gate.status !== "ok") return <PartnerGateNotice status={gate.status} retryHref={ROUTES.resellerPortal.ai} />;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-h1 text-brand-cocoa-dark">Asisten AI Partner</h1>
        <p className="mt-2 max-w-2xl text-body-s text-text-secondary">
          Tanyakan harga partner, ringkasan pesanan, atau minta bantuan menyusun materi jualan. Jawaban tentang produk hanya memakai informasi resmi CNS Beauty.
        </p>
      </div>
      <Card tone="ai" padding="lg" className="flex flex-col gap-5">
        <div>
          <AskAIButton>Mulai percakapan</AskAIButton>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-body-s font-medium">Coba tanyakan:</p>
          <ul className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <li key={action.label}>
                <AskAIChip prefill={action.prompt}>{action.label}</AskAIChip>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-caption text-text-secondary">
          Periksa kembali setiap materi sebelum dibagikan. Asisten tidak menghitung komisi karena program partner memakai harga partner.
        </p>
      </Card>
    </div>
  );
}
