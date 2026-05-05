import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GameCard } from "@/components/GameCard";
import { useSEO } from "@/hooks/useSEO";
import { Gamepad2, Search } from "lucide-react";

export default function Games() {
  const [search, setSearch] = useState("");
  const { data: games, isLoading } = trpc.game.list.useQuery();

  useSEO({
    title: "Katalog Game Top Up | CoinIn",
    description: "Lihat semua katalog game dan voucher digital yang tersedia di CoinIn.",
    canonicalPath: "/games",
    keywords: "katalog top up game, semua game top up, voucher digital",
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
          Cari game, voucher, atau layanan digital yang ingin kamu top up.
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
            placeholder="Search game title..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-12 rounded-none border-cyan-300/25 bg-slate-950/80 pl-10 font-semibold text-white placeholder:text-slate-500 focus-visible:ring-cyan-300/50"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, index) => (
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
    </div>
  );
}
