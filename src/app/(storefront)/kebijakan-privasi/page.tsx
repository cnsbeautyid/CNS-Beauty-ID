import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { BRAND } from "@/config/site";
import { ROUTES } from "@/constants/routes";
import { getPublicContact } from "@/services/content/contact";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: `Data apa yang dikumpulkan ${BRAND.legalName}, untuk apa, dan bagaimana kamu mengaturnya.`,
  alternates: { canonical: ROUTES.privacy },
};

// Contact details come from the settings table; refresh hourly.
export const revalidate = 3600;

const UPDATED = "30 September 2026";

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-h3 text-brand-cocoa-dark">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-body text-text-secondary">{children}</div>
    </section>
  );
}

export default async function PrivacyPage() {
  const contact = await getPublicContact();

  return (
    <main id="main-content">
      <Container className="py-section">
        <article className="mx-auto flex max-w-3xl flex-col gap-10">
          <header className="flex flex-col gap-3">
            <p className="text-caption tracking-eyebrow text-brand-cocoa uppercase">Bantuan</p>
            <h1 className="text-display-l text-brand-cocoa-dark">Kebijakan Privasi</h1>
            <p className="text-body-s text-text-secondary">Terakhir diperbarui {UPDATED}</p>
          </header>

          <Section id="data" title="Data yang kami simpan">
            <p>Kami hanya menyimpan data yang diperlukan untuk melayanimu:</p>
            <ul className="list-disc pl-5">
              <li>Akun: nama, email, dan nomor telepon yang kamu isi.</li>
              <li>Pesanan: produk, alamat pengiriman, dan bukti transfer yang kamu unggah (tersimpan privat, hanya untuk tim kami).</li>
              <li>Profil kulit dan rutinitas, bila kamu menyimpannya dari Skin Quiz.</li>
              <li>Percakapan dengan CNS Beauty AI, untuk menjaga kualitas dan keamanan jawaban.</li>
            </ul>
          </Section>

          <Section id="analytics" title="Analytics">
            <p>
              Untuk memahami cara situs dipakai (misalnya berapa pengunjung yang melihat produk, memakai Beauty AI, atau menyelesaikan pesanan), kami mencatat
              kejadian seperti &ldquo;melihat halaman&rdquo; atau &ldquo;menambah ke keranjang&rdquo;. Pencatatan ini:
            </p>
            <ul className="list-disc pl-5">
              <li>dilakukan sendiri oleh {BRAND.name}, tanpa layanan iklan atau pelacak pihak ketiga;</li>
              <li>memakai ID acak di cookie <code>cns_aid</code> (berlaku 1 tahun), bukan nama, email, atau nomor telepon;</li>
              <li>menyimpan alamat halaman tanpa parameter dan tanpa nomor pesanan, serta hanya nama domain situs asal kunjungan;</li>
              <li>
                tidak berjalan sama sekali bila browsermu mengirim sinyal <span lang="en">Do Not Track</span> atau <span lang="en">Global Privacy Control</span>.
              </li>
            </ul>
            <p>Bila kamu masuk ke akun, kejadian tersebut juga dikaitkan dengan akunmu agar kami bisa melayani pesanan dan poin dengan benar.</p>
          </Section>

          <Section id="cookies" title="Cookie">
            <ul className="list-disc pl-5">
              <li>Sesi masuk (Supabase Auth): agar kamu tetap masuk.</li>
              <li>
                <code>cns_cart</code>: isi keranjang tamu, 30 hari.
              </li>
              <li>
                <code>cns_aid</code>: ID acak untuk analytics dan percakapan Beauty AI, 1 tahun.
              </li>
            </ul>
            <p>Kami tidak memakai cookie iklan.</p>
          </Section>

          <Section id="use" title="Penggunaan dan berbagi data">
            <p>
              Data dipakai untuk memproses pesanan, pengiriman, poin CNS Rewards, dan memperbaiki layanan. Kami tidak menjual data pribadimu. Data hanya dibagikan
              kepada penyedia yang membantu kami menjalankan layanan (penyimpanan data dan pengiriman) sebatas yang diperlukan.
            </p>
          </Section>

          <Section id="rights" title="Hakmu">
            <p>
              Kamu bisa melihat dan memperbarui data akun di halaman Akun. Untuk meminta salinan atau penghapusan data, hubungi kami
              {contact?.email ? (
                <>
                  {" "}
                  di{" "}
                  <a href={`mailto:${contact.email}`} className="text-text-primary underline underline-offset-4">
                    {contact.email}
                  </a>
                </>
              ) : null}
              {contact?.whatsapp_display ? ` atau WhatsApp ${contact.whatsapp_display}` : ""}.
            </p>
          </Section>
        </article>
      </Container>
    </main>
  );
}
