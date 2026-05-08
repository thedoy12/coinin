import { useEffect, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GameCard } from "@/components/GameCard";
import { useSEO } from "@/hooks/useSEO";
import {
  BadgeCheck,
  Cpu,
  ChevronRight,
  Clock,
  Gamepad2,
  Headphones,
  Radar,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Zap,
} from "lucide-react";

export default function Home() {
  useSEO({
    title: "CoinIn - Top Up Game, Pulsa, dan Token PLN Cepat 24 Jam",
    description:
      "Top up game, pulsa, dan token PLN di CoinIn. Pembayaran QRIS, VA, e-wallet, proses otomatis, dan status real-time.",
    canonicalPath: "/",
    keywords:
      "top up game online, pulsa online, token pln, qris, virtual account",
  });
  useHomeStructuredData();

  const [search, setSearch] = useState("");
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const { data: games, isLoading } = trpc.game.list.useQuery();
  const { data: popup } = trpc.popup.active.useQuery();

  useEffect(() => {
    if (!popup) return;
    const key = `coinin-popup:${new Date(popup.updatedAt).getTime()}`;
    if (sessionStorage.getItem(key)) return;

    const timeout = window.setTimeout(() => {
      setIsPopupOpen(true);
      sessionStorage.setItem(key, "shown");
    }, popup.displayDelayMs);

    return () => window.clearTimeout(timeout);
  }, [popup]);

  const closePopup = () => setIsPopupOpen(false);

  const filteredGames = games?.filter((game) => {
    const value = search.toLowerCase();
    return (
      game.name.toLowerCase().includes(value) ||
      (game.category ?? "").toLowerCase().includes(value)
    );
  });
  const categories = Array.from(
    new Set(games?.map((game) => game.category).filter(Boolean)),
  ).slice(0, 6);
  const featuredGames = filteredGames?.slice(0, 3) ?? [];
  const quickGames = (games ?? []).slice(0, 6);
  const operatorGames = games?.slice(0, 4) ?? [];
  const liveFeed = [
    "Live feed // QRIS aktif 24 jam",
    "Status real-time untuk setiap order",
    "Top up game, pulsa, token PLN dalam satu lane",
    "Checkout singkat, konfirmasi cepat, progress jelas",
  ];
  const commandStats = [
    { value: "3 lane", label: "checkout flow" },
    { value: "< 1 min", label: "status update" },
    { value: "24 jam", label: "ops online" },
  ];
  const arenaSignals = [
    { icon: Radar, title: "Signal Locked", text: "Order bergerak dari bayar sampai finish tanpa perlu pindah layar." },
    { icon: Trophy, title: "Featured Arena", text: "Hero cards, live motion, dan katalog populer dibuat lebih menonjol." },
    { icon: Cpu, title: "Fast Pipeline", text: "Route cepat untuk game favorit, pulsa, dan token PLN harian." },
  ];
  const gameSpotlights =
    (games ?? []).slice(0, 8).map((game) => game.name).filter(Boolean) ||
    [];
  const marqueeGames = gameSpotlights.length
    ? gameSpotlights
    : ["Mobile Legends", "Free Fire", "HOK", "Valorant", "Pulsa", "Token PLN"];

  return (
    <div className="pb-20">
      {popup && (
        <Dialog open={isPopupOpen} onOpenChange={setIsPopupOpen}>
          <DialogContent className="overflow-hidden border-cyan-300/30 bg-slate-950 p-0 text-white sm:max-w-xl">
            {popup.imageUrl && (
              <div className="relative aspect-[16/9] bg-slate-900">
                <img
                  src={popup.imageUrl}
                  alt={popup.title}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
              </div>
            )}
            <div className="p-6 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">CoinIn Update</p>
              <DialogTitle className="mt-3 text-2xl font-black uppercase italic text-white sm:text-3xl">
                {popup.title}
              </DialogTitle>
              {popup.description && (
                <DialogDescription className="mt-3 text-sm leading-7 text-slate-300">
                  {popup.description}
                </DialogDescription>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={popup.buttonUrl} onClick={closePopup}>
                  <Button className="rounded-none bg-cyan-300 font-black uppercase text-slate-950 hover:bg-cyan-200">
                    {popup.buttonText}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                <Button
                  variant="outline"
                  className="rounded-none border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-900"
                  onClick={closePopup}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="hud-frame overflow-hidden border border-cyan-300/15 bg-slate-950/75 px-4 py-3">
          <div className="marquee-track">
            {[...liveFeed, ...liveFeed].map((item, index) => (
              <div key={`${item}-${index}`} className="marquee-item">
                <span className="h-2 w-2 bg-cyan-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="hud-frame cinematic-stage min-h-[620px] overflow-hidden bg-slate-950 p-5 sm:p-8 lg:p-10">
          <div className="hero-violet-aura" />
          <div className="hero-energy-ring" />
          <div className="hero-energy-beam" />
          <div className="hero-wave-plane hidden lg:block" />
          <div className="relative z-10 flex min-h-[560px] flex-col">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.28em] text-cyan-100/80">
              <span>CoinIn Arcade</span>
              <span className="hidden sm:inline">QRIS // VA // E-Wallet // 24H</span>
            </div>

            <div className="grid flex-1 items-center gap-8 lg:grid-cols-[1fr_410px]">
              <div className="max-w-3xl">
                <div className="mb-5 inline-flex items-center gap-2 border border-violet-300/40 bg-violet-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-violet-100 shadow-[0_0_28px_rgba(168,85,247,0.18)]">
                  <Sparkles className="h-4 w-4 text-violet-200" />
                  Top Up Game, Pulsa, Token PLN
                </div>
                <h1 className="section-title-gaming text-5xl font-black uppercase italic leading-[0.92] text-white sm:text-6xl lg:text-8xl">
                  Top Up
                  <span className="block bg-gradient-to-r from-cyan-200 via-white via-45% to-violet-300 bg-clip-text text-transparent">
                    Game Cepat
                  </span>
                </h1>
                <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-200 sm:text-lg">
                  Pilih game favorit, bayar pakai QRIS/VA/e-wallet, lalu pantau status order secara real-time. Cepat, jelas, dan siap dipakai di device mana pun.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href="#game-store">
                    <Button className="hero-cta h-14 w-full rounded-none bg-gradient-to-r from-cyan-300 to-violet-300 px-8 font-black uppercase text-slate-950 shadow-[0_0_34px_rgba(168,85,247,0.28)] hover:from-cyan-200 hover:to-violet-200 sm:w-auto">
                      Mulai Top Up
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                  <Link to="/status">
                    <Button variant="outline" className="h-14 w-full rounded-none border-violet-300/40 bg-slate-950/50 px-8 font-black uppercase text-violet-100 hover:bg-violet-400/10 sm:w-auto">
                      Cek Order
                    </Button>
                  </Link>
                </div>

                <div className="mt-8 max-w-2xl rounded-none border border-violet-300/25 bg-slate-950/70 p-3 shadow-[0_0_42px_rgba(124,58,237,0.16)] backdrop-blur">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-200/80" />
                    <Input
                      placeholder="Cari Mobile Legends, Free Fire, DANA..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="h-12 rounded-none border-violet-300/25 bg-slate-950/80 pl-10 font-semibold text-white placeholder:text-slate-500 focus-visible:ring-violet-300/50"
                    />
                  </div>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {quickGames.slice(0, 5).map((game) => (
                      <Link
                        key={game.id}
                        to={`/game/${game.slug}`}
                        className="shrink-0 border border-cyan-300/20 bg-slate-900/80 px-3 py-2 text-xs font-black uppercase text-cyan-100 hover:border-violet-300/50 hover:text-violet-100"
                      >
                        {game.name}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
                  {[
                    ["24/7", "online"],
                    ["QRIS", "payment"],
                    ["Live", "status"],
                  ].map(([value, label]) => (
                    <div key={value} className="angle-card border border-cyan-300/25 bg-slate-950/70 p-4">
                      <p className="text-2xl font-black text-white">{value}</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200/70">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {commandStats.map((item) => (
                    <div key={item.label} className="signal-chip">
                      <span className="signal-chip-value">{item.value}</span>
                      <span className="signal-chip-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative hidden min-h-[390px] lg:block">
                {operatorGames.map((game, index) => (
                  <Link
                    key={game.id}
                    to={`/game/${game.slug}`}
                    className={`angle-card poster-glow poster-stack-card absolute w-48 overflow-hidden border border-cyan-300/30 bg-slate-950 transition-transform hover:-translate-y-2 ${
                      index === 0
                        ? "left-8 top-10"
                        : index === 1
                        ? "right-4 top-0"
                        : index === 2
                        ? "left-0 bottom-8"
                        : "right-8 bottom-2"
                    }`}
                    style={{
                      animationDelay: `${index * 0.45}s`,
                      ["--poster-rotate" as string]:
                        index === 0 ? "-7deg" : index === 1 ? "5deg" : index === 2 ? "4deg" : "-5deg",
                    }}
                  >
                    <div className="relative h-60">
                      {game.thumbnail ? (
                        <img src={game.thumbnail} alt={game.name} className="h-full w-full object-cover opacity-85" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-slate-800">
                          <Gamepad2 className="h-16 w-16 text-slate-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">{game.category}</p>
                        <h2 className="mt-1 text-base font-black uppercase italic text-white">{game.name}</h2>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-violet-200">Quick Store</p>
            <h2 className="section-title-gaming mt-2 text-3xl font-black uppercase italic text-white sm:text-4xl">
              Game Populer Siap Top Up
            </h2>
          </div>
          <a href="#game-store" className="text-sm font-black uppercase tracking-[0.18em] text-cyan-200 hover:text-violet-200">
            Lihat katalog
          </a>
        </div>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-52 bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {quickGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-200">About</p>
          <h2 className="section-title-gaming mt-3 text-3xl font-black uppercase italic text-white sm:text-4xl">
            The Magic of Fast Top Up
          </h2>
          <p className="mt-5 text-sm leading-8 text-slate-400">
            CoinIn dibuat untuk transaksi digital harian yang butuh alur singkat dan jelas.
            Pilih layanan, masukkan tujuan, bayar, lalu pantau order sampai selesai.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { icon: Zap, title: "Otomatis" },
              { icon: Shield, title: "Aman" },
              { icon: Clock, title: "24 Jam" },
              { icon: Headphones, title: "Support" },
            ].map((item) => (
              <div key={item.title} className="angle-card border border-cyan-300/20 bg-slate-950/70 p-4">
                <item.icon className="mb-3 h-5 w-5 text-cyan-200" />
                <p className="font-black uppercase text-white">{item.title}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {featuredGames.map((game, index) => (
            <Link key={game.id} to={`/game/${game.slug}`} className="group">
              <article className={`angle-card poster-glow min-h-64 overflow-hidden border border-cyan-300/30 bg-slate-950 transition-transform group-hover:-translate-y-2 ${index === 1 ? "sm:mt-8" : ""}`}>
                <div className="relative h-64">
                  {game.thumbnail ? (
                    <img src={game.thumbnail} alt={game.name} className="h-full w-full object-cover opacity-85 transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-slate-800">
                      <Gamepad2 className="h-16 w-16 text-slate-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="bg-cyan-300 px-3 py-1 text-[10px] font-black uppercase text-slate-950">
                      Top {index + 1}
                    </span>
                    <h3 className="mt-3 text-lg font-black uppercase italic text-white">{game.name}</h3>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="hud-frame overflow-hidden border border-cyan-300/15 bg-slate-950/75 px-4 py-5">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-cyan-200">Arena Pulse</p>
              <h2 className="section-title-gaming mt-2 text-2xl font-black uppercase italic text-white sm:text-3xl">
                Motion Layer For The Storefront
              </h2>
            </div>
            <div className="hidden text-right text-xs font-black uppercase tracking-[0.2em] text-slate-500 sm:block">
              idle glow // hover lift // moving ticker
            </div>
          </div>
          <div className="spotlight-marquee">
            {[...marqueeGames, ...marqueeGames].map((name, index) => (
              <div key={`${name}-${index}`} className="spotlight-pill">
                <span className="text-cyan-200">//</span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="game-store" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-200">Games Play</p>
          <h2 className="section-title-gaming mt-3 text-4xl font-black uppercase italic text-white">Choose Your Game</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
            Pilihan populer untuk akses cepat. Katalog lengkap tersedia di halaman Games.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setSearch("")} className="shrink-0 border border-cyan-300 bg-cyan-300 px-4 py-2 text-xs font-black uppercase text-slate-950">
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSearch(category || "")}
                className="shrink-0 border border-cyan-300/25 bg-slate-950/70 px-4 py-2 text-xs font-black uppercase text-cyan-100 hover:bg-cyan-300/10"
              >
                {category}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-200/70" />
            <Input
              placeholder="Search layanan..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-12 rounded-none border-cyan-300/25 bg-slate-950/80 pl-10 font-semibold text-white placeholder:text-slate-500 focus-visible:ring-cyan-300/50"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-52 bg-slate-800" />
            ))}
          </div>
        ) : filteredGames && filteredGames.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="border border-cyan-300/20 bg-slate-950/70 py-16 text-center text-slate-500">
            <Gamepad2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>Game tidak ditemukan</p>
          </div>
        )}
        <div className="mt-8 text-center">
          <Link to="/games">
            <Button className="angle-card h-12 rounded-none bg-cyan-300 px-7 font-black uppercase text-slate-950 hover:bg-cyan-200">
              Lihat Semua Game
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="hud-frame border border-cyan-300/20 bg-slate-950/80 p-6">
          <h2 className="section-title-gaming text-3xl font-black uppercase italic text-white">Mission Briefing</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Pilih Layanan", "Cari game, pulsa, atau token PLN."],
              ["02", "Isi Tujuan", "Masukkan ID pemain, nomor HP, atau ID pelanggan sesuai jenis produk."],
              ["03", "Bayar", "Selesaikan pembayaran dan cek status transaksi secara real-time."],
            ].map(([step, title, text]) => (
              <article key={step} className="angle-card border border-cyan-300/20 bg-slate-900/70 p-5">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">{step}</p>
                <h3 className="mt-3 text-xl font-black uppercase text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {arenaSignals.map((item) => (
            <article key={item.title} className="angle-card mission-panel border border-cyan-300/20 bg-slate-950/70 p-5 md:col-span-1 lg:col-span-2">
              <item.icon className="mb-4 h-7 w-7 text-cyan-200" />
              <h2 className="text-lg font-black uppercase text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{item.text}</p>
            </article>
          ))}
          {[
            {
              icon: BadgeCheck,
              title: "Order Traceable",
              text: "Setiap transaksi punya Reference ID untuk cek status.",
            },
            {
              icon: Swords,
              title: "Katalog Lengkap",
              text: "Katalog mendukung 35 game teratas, pulsa, dan token PLN.",
            },
            {
              icon: Headphones,
              title: "Admin Console",
              text: "Data pembeli dan order bisa ditelusuri kalau butuh bantuan.",
            },
          ].map((item) => (
            <article key={item.title} className="angle-card mission-panel border border-cyan-300/20 bg-slate-950/70 p-5 md:col-span-1 lg:col-span-2">
              <item.icon className="mb-4 h-7 w-7 text-cyan-200" />
              <h2 className="text-lg font-black uppercase text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function useHomeStructuredData() {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "CoinIn",
          url: window.location.origin,
          logo: "/favicon.svg",
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Apakah CoinIn bisa top up game 24 jam?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "CoinIn dirancang untuk memproses top up game secara otomatis 24 jam dengan status transaksi real-time.",
              },
            },
            {
              "@type": "Question",
              name: "Metode pembayaran apa yang tersedia?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "CoinIn mendukung pembayaran QRIS, virtual account, dan e-wallet melalui sistem pembayaran yang terintegrasi.",
              },
            },
            {
              "@type": "Question",
              name: "Bagaimana cara cek status transaksi?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Pengguna dapat mengecek status transaksi dengan Reference ID pada halaman cek status CoinIn.",
              },
            },
          ],
        },
      ],
    };
    const id = "coinin-home-schema";
    document.getElementById(id)?.remove();
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => {
      document.getElementById(id)?.remove();
    };
  }, []);
}
