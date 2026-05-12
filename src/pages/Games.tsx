import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GameCard } from "@/components/GameCard";
import { useJsonLd } from "@/hooks/useJsonLd";
import { useSEO } from "@/hooks/useSEO";
import { Gamepad2, Search } from "lucide-react";

export default function Games() {
  const [search, setSearch] = useState("");
  const { data: games, isLoading } = trpc.game.list.useQuery();

  useSEO({
    title: "Katalog Top Up Game, Pulsa, dan Token PLN | CoinIn",
    description: "Cari katalog top up game online, pulsa, e-wallet, dan token PLN di CoinIn. Pilih Mobile Legends, Free Fire, PUBG Mobile, Honor of Kings, dan layanan populer lain.",
    canonicalPath: "/games",
    keywords: "katalog top up game, top up mobile legends, top up free fire, pulsa online, token pln",
  });

  useJsonLd("coinin-games-schema", {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Katalog Top Up Game CoinIn",
    url: `${window.location.origin}/games`,
    description: "Katalog layanan top up game online, pulsa, dan token PLN di CoinIn.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: (games ?? []).slice(0, 24).map((game, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: game.name,
        url: `${window.location.origin}/game/${game.slug}`,
      })),
    },
  });

  const categories = useMemo(
    () => Array.from(new Set(games?.map((game) => game.category).filter(Boolean))).slice(0, 12),
    [games],
  );
  const filteredGames = games?.filter((game) => {
    const value = search.toLowerCase();
    return (
      game.name.toLowerCase().includes(value) ||
      (game.category ?? "").toLowerCase().includes(value)
    );
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-200">
          Service Library
        </p>
        <h1 className="section-title-gaming mt-3 text-4xl font-black uppercase italic text-white">
          Semua Layanan
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
          Cari game, pulsa, atau token PLN yang ingin kamu top up.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSearch("")}
            className="shrink-0 border border-cyan-300 bg-cyan-300 px-4 py-2 text-xs font-black uppercase text-slate-950"
          >
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
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, index) => (
            <Skeleton key={index} className="h-40 bg-slate-800 sm:h-52" />
          ))}
        </div>
      ) : filteredGames && filteredGames.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
    </div>
  );
}
