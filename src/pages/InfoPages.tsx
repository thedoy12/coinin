import { Mail, MessageCircle, ShieldCheck, Store, FileText, Headphones } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const supportEmail = "putradadoy@gmail.com";
const supportWhatsapp = "+62 895-3930-6153-6";

export function AboutPage() {
  useSEO({
    title: "Tentang Kami | CoinIn",
    description: "Tentang CoinIn, layanan top up game, pulsa, dan token PLN dengan pembayaran online dan status transaksi real-time.",
    canonicalPath: "/tentang-kami",
  });

  return (
    <InfoShell
      eyebrow="Tentang Kami"
      title="CoinIn membantu transaksi digital jadi lebih ringkas."
      description="CoinIn adalah platform top up game, pulsa, dan token PLN yang dirancang untuk pembeli yang ingin proses cepat, instruksi jelas, dan status order yang mudah dipantau."
      icon={<Store className="h-6 w-6" />}
    >
      <InfoSection title="Apa Yang Kami Sediakan">
        <p>
          CoinIn menyediakan layanan top up untuk 20 game teratas, pulsa, dan token PLN melalui integrasi penyedia layanan resmi. Pengguna dapat memilih produk, memasukkan data tujuan, melakukan pembayaran, lalu memantau status transaksi secara real-time.
        </p>
      </InfoSection>
      <InfoSection title="Komitmen Layanan">
        <ul>
          <li>Informasi produk, harga, dan instruksi ditampilkan sebelum checkout.</li>
          <li>Status order dapat dicek melalui halaman status transaksi.</li>
          <li>Tim support membantu pengecekan kendala pembayaran atau pengiriman produk.</li>
        </ul>
      </InfoSection>
    </InfoShell>
  );
}

export function ContactPage() {
  useSEO({
    title: "Kontak Support | CoinIn",
    description: "Hubungi support CoinIn untuk bantuan order, pembayaran, status transaksi, atau kendala top up.",
    canonicalPath: "/kontak",
  });

  return (
    <InfoShell
      eyebrow="Kontak Support"
      title="Butuh bantuan order? Hubungi support CoinIn."
      description="Sertakan reference ID transaksi agar pengecekan bisa dilakukan lebih cepat."
      icon={<Headphones className="h-6 w-6" />}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ContactCard
          icon={<Mail className="h-5 w-5" />}
          title="Email"
          value={supportEmail}
          href={`mailto:${supportEmail}`}
        />
        <ContactCard
          icon={<MessageCircle className="h-5 w-5" />}
          title="WhatsApp"
          value={supportWhatsapp}
          href={`https://wa.me/${supportWhatsapp.replace(/\D/g, "")}`}
        />
      </div>
      <InfoSection title="Jam Operasional">
        <p>
          Support menerima laporan setiap hari. Respon diprioritaskan untuk transaksi yang sudah memiliki reference ID dan bukti pembayaran.
        </p>
      </InfoSection>
      <InfoSection title="Data Yang Perlu Disiapkan">
        <ul>
          <li>Reference ID transaksi.</li>
          <li>Nama game, pulsa, atau token PLN yang dibeli.</li>
          <li>Nomor/email pembayaran jika diminta untuk verifikasi.</li>
          <li>Screenshot pembayaran jika pembayaran sudah berhasil namun status belum berubah.</li>
        </ul>
      </InfoSection>
    </InfoShell>
  );
}

export function PrivacyPolicyPage() {
  useSEO({
    title: "Kebijakan Privasi | CoinIn",
    description: "Kebijakan privasi CoinIn terkait pengumpulan, penggunaan, perlindungan, dan penyimpanan data pengguna.",
    canonicalPath: "/kebijakan-privasi",
  });

  return (
    <InfoShell
      eyebrow="Kebijakan Privasi"
      title="Kami menjaga data transaksi dan akun pengguna dengan serius."
      description="Halaman ini menjelaskan data yang dikumpulkan, tujuan penggunaan, serta pilihan pengguna terkait data pribadi."
      icon={<ShieldCheck className="h-6 w-6" />}
    >
      <InfoSection title="Data Yang Dikumpulkan">
        <ul>
          <li>Data akun seperti nama, email, username, dan informasi login.</li>
          <li>Data transaksi seperti produk, nominal, reference ID, status pembayaran, dan status top up.</li>
          <li>Data tujuan top up seperti user ID game, zone ID/server, nomor handphone, atau identitas tujuan lain sesuai produk.</li>
          <li>Data teknis seperti log akses, log API provider, dan informasi keamanan untuk mencegah penyalahgunaan.</li>
        </ul>
      </InfoSection>
      <InfoSection title="Penggunaan Data">
        <p>
          Data digunakan untuk memproses order, mengirim layanan top up, memverifikasi pembayaran, menyediakan support pelanggan, menjaga keamanan layanan, dan memenuhi kebutuhan operasional serta pencatatan transaksi.
        </p>
      </InfoSection>
      <InfoSection title="Berbagi Data">
        <p>
          CoinIn dapat membagikan data yang diperlukan kepada payment gateway, penyedia layanan top up, atau pihak pendukung teknis hanya sejauh dibutuhkan untuk memproses transaksi dan menjaga layanan tetap berjalan.
        </p>
      </InfoSection>
      <InfoSection title="Keamanan Dan Penyimpanan">
        <p>
          Kami menerapkan pembatasan akses, autentikasi, dan pencatatan aktivitas internal. Data transaksi disimpan selama diperlukan untuk layanan, audit, penyelesaian kendala, dan kepatuhan hukum yang berlaku.
        </p>
      </InfoSection>
      <InfoSection title="Permintaan Pengguna">
        <p>
          Pengguna dapat menghubungi support untuk meminta koreksi data akun, pengecekan transaksi, atau pertanyaan terkait penggunaan data pribadi.
        </p>
      </InfoSection>
    </InfoShell>
  );
}

export function TermsPage() {
  useSEO({
    title: "Ketentuan Layanan | CoinIn",
    description: "Ketentuan penggunaan layanan CoinIn untuk transaksi top up game, pulsa, dan token PLN.",
    canonicalPath: "/ketentuan-layanan",
  });

  return (
    <InfoShell
      eyebrow="Ketentuan Layanan"
      title="Gunakan CoinIn dengan data transaksi yang benar."
      description="Dengan menggunakan layanan CoinIn, pengguna dianggap memahami dan menyetujui ketentuan berikut."
      icon={<FileText className="h-6 w-6" />}
    >
      <InfoSection title="Ketentuan Transaksi">
        <ul>
          <li>Pengguna wajib memastikan user ID, zone ID/server, nomor handphone, email, atau data tujuan lain sudah benar sebelum membayar.</li>
          <li>Kesalahan input data tujuan dapat menyebabkan produk terkirim ke akun/nomor yang salah dan tidak selalu dapat dibatalkan.</li>
          <li>Harga dan ketersediaan produk dapat berubah mengikuti provider.</li>
          <li>Order akan diproses setelah pembayaran terverifikasi oleh sistem pembayaran.</li>
        </ul>
      </InfoSection>
      <InfoSection title="Pembayaran Dan Pengiriman">
        <p>
          Pembayaran dilakukan melalui metode yang tersedia di checkout. Setelah pembayaran berhasil, CoinIn akan meneruskan order ke provider. Estimasi proses dapat berbeda tergantung jenis produk, kondisi provider, dan validitas data tujuan.
        </p>
      </InfoSection>
      <InfoSection title="Refund Dan Pembatalan">
        <p>
          Refund dapat dipertimbangkan jika pembayaran berhasil namun order tidak dapat diproses oleh sistem atau provider. Refund tidak berlaku untuk transaksi yang sudah berhasil terkirim ke data tujuan yang dimasukkan pengguna.
        </p>
      </InfoSection>
      <InfoSection title="Penyalahgunaan Layanan">
        <p>
          CoinIn berhak membatasi transaksi, menolak order, atau menahan proses sementara jika ditemukan indikasi penyalahgunaan, aktivitas tidak wajar, pelanggaran hukum, atau permintaan verifikasi tambahan dari payment gateway/provider.
        </p>
      </InfoSection>
    </InfoShell>
  );
}

function InfoShell({
  eyebrow,
  title,
  description,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="hud-frame border border-cyan-300/20 bg-slate-950/80 p-6 sm:p-8">
        <div className="mb-8 flex items-start gap-4">
          <div className="angle-card bg-cyan-300 p-3 text-slate-950">{icon}</div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">{eyebrow}</p>
            <h1 className="section-title-gaming mt-3 text-3xl font-black uppercase italic text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">{description}</p>
          </div>
        </div>
        <div className="space-y-6 text-slate-300">{children}</div>
      </div>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="angle-card border border-cyan-300/15 bg-slate-950/70 p-5">
      <h2 className="mb-3 text-lg font-black uppercase italic text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-slate-400 [&_li]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

function ContactCard({
  icon,
  title,
  value,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  href: string;
}) {
  return (
    <a href={href} className="angle-card block border border-cyan-300/15 bg-slate-950/70 p-5 hover:border-cyan-300/40">
      <div className="mb-4 text-cyan-200">{icon}</div>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <p className="mt-2 font-bold text-white">{value}</p>
    </a>
  );
}

export const legalLinks = [
  { to: "/tentang-kami", label: "Tentang Kami" },
  { to: "/kontak", label: "Kontak Support" },
  { to: "/kebijakan-privasi", label: "Kebijakan Privasi" },
  { to: "/ketentuan-layanan", label: "Ketentuan Layanan" },
];
