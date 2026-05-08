import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/GameCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useJsonLd } from "@/hooks/useJsonLd";
import { useSEO } from "@/hooks/useSEO";
import { BadgeCheck, ChevronRight, Clock, CreditCard, Gamepad2, Search, ShieldCheck, Zap } from "lucide-react";

export default function TopUpGameLanding() {
  const { data: games, isLoading } = trpc.game.list.useQuery();
  const featuredGames = games?.slice(0, 12) ?? [];

  useSEO({
    title: "Top Up Game Online Cepat 24 Jam QRIS & E-Wallet | CoinIn",
    description:
      "Top up game online di CoinIn untuk Mobile Legends, Free Fire, PUBG Mobile, Honor of Kings, dan game populer lain. Bayar QRIS, VA, e-wallet, status real-time.",
    canonicalPath: "/top-up-game",
    keywords:
      "top up game, top up game online, top up mobile legends, top up free fire, top up pubg mobile, top up qris, top up game 24 jam",
  });

  useJsonLd("coinin-topup-game-schema", {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Top Up Game Online Cepat 24 Jam | CoinIn",
        url: `${window.location.origin}/top-up-game`,
        description:
          "Landing page CoinIn untuk layanan top up game online, pulsa, dan produk digital dengan pembayaran QRIS, VA, dan e-wallet.",
        isPartOf: {
          "@type": "WebSite",
          name: "CoinIn",
          url: window.location.origin,
        },
      },
      {
        "@type": "ItemList",
        name: "Game populer untuk top up di CoinIn",
        itemListElement: featuredGames.map((game, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: game.name,
          url: `${window.location.origin}/game/${game.slug}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Apakah CoinIn bisa top up game 24 jam?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "CoinIn dirancang untuk membantu proses top up game online dengan pembayaran digital dan status transaksi real-time.",
            },
          },
          {
            "@type": "Question",
            name: "Metode pembayaran apa yang tersedia di CoinIn?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "CoinIn mendukung pembayaran online seperti QRIS, virtual account, dan e-wallet melalui sistem pembayaran yang tersedia di checkout.",
            },
          },
          {
            "@type": "Question",
            name: "Bagaimana cara cek status order?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Status order dapat dicek memakai Reference ID di halaman cek status CoinIn.",
            },
          },
        ],
      },
    ],
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="cyber-panel p-6 sm:p-8">
        <p className="cyber-eyebrow text-xs font-black uppercase tracking-[0.32em]">SEO Landing</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <h1 className="section-title-gaming text-4xl font-black uppercase italic text-white sm:text-6xl">
              Top Up Game Online Cepat 24 Jam
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-8 text-slate-300 sm:text-base">
              CoinIn menyediakan layanan top up game online untuk Mobile Legends, Free Fire, PUBG Mobile,
              Honor of Kings, Call of Duty Mobile, dan produk digital populer lain. Pilih produk, masukkan
              data tujuan, bayar dengan QRIS/VA/e-wallet, lalu pantau status order secara real-time.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/games">
                <Button className="angle-card h-12 rounded-none bg-gradient-to-r from-cyan-300 to-violet-300 px-7 font-black uppercase text-slate-950 hover:from-cyan-200 hover:to-violet-200">
                  Pilih Game
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/status">
                <Button variant="outline" className="h-12 rounded-none border-violet-300/40 bg-slate-950/40 px-7 font-black uppercase text-violet-100 hover:bg-violet-400/10">
                  Cek Status
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Zap, title: "Proses Cepat", text: "Alur order singkat dan status jelas." },
              { icon: CreditCard, title: "QRIS & E-Wallet", text: "Pembayaran online praktis." },
              { icon: Clock, title: "24 Jam", text: "Layanan siap dipakai kapan pun." },
              { icon: ShieldCheck, title: "Traceable", text: "Order punya Reference ID." },
            ].map((item) => (
              <article key={item.title} className="cyber-panel cyber-panel-soft p-4">
                <item.icon className="mb-3 h-5 w-5 text-violet-200" />
                <h2 className="font-black uppercase text-white">{item.title}</h2>
                <p className="mt-2 text-xs leading-6 text-slate-400">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cyber-section-shell py-12">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="cyber-eyebrow text-xs font-black uppercase tracking-[0.32em]">Katalog Top Up</p>
            <h2 className="section-title-gaming mt-2 text-3xl font-black uppercase italic text-white">
              Game Populer Di CoinIn
            </h2>
          </div>
          <Link to="/games" className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200 hover:text-violet-200">
            Lihat Semua
          </Link>
        </div>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-52 bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {featuredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 pb-16 md:grid-cols-3">
        {[
          {
            icon: Search,
            title: "Cara Top Up Game Di CoinIn",
            text: "Cari game, pilih nominal, isi ID pemain atau data tujuan, lalu lanjut ke checkout.",
          },
          {
            icon: BadgeCheck,
            title: "Cek Status Real-Time",
            text: "Gunakan Reference ID untuk memantau status pembayaran dan proses top up.",
          },
          {
            icon: Gamepad2,
            title: "Keyword Game Populer",
            text: "Mobile Legends, Free Fire, PUBG Mobile, Honor of Kings, Call of Duty Mobile, dan produk digital lain.",
          },
        ].map((item) => (
          <article key={item.title} className="cyber-panel p-5">
            <item.icon className="mb-4 h-7 w-7 text-violet-200" />
            <h2 className="text-lg font-black uppercase text-white">{item.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">{item.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
