import { Link } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Gamepad2, Swords } from "lucide-react";

type GameCardProps = {
  game: {
    id: number;
    name: string;
    slug: string;
    thumbnail?: string | null;
    category?: string | null;
  };
};

export function GameCard({ game }: GameCardProps) {
  return (
    <Link to={`/game/${game.slug}`} className="group">
      <Card className="cyber-panel game-card-cyber overflow-hidden transition-transform group-hover:-translate-y-2">
        <CardContent className="p-0">
          <div className="relative h-52">
            {game.thumbnail ? (
              <div className="game-card-art absolute inset-0 flex items-center justify-center">
                <img
                  src={game.thumbnail}
                  alt={game.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain p-4 opacity-95 drop-shadow-[0_0_22px_rgba(168,85,247,0.22)] transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center bg-slate-800">
                <Gamepad2 className="h-16 w-16 text-slate-600" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
            {game.category && (
              <div className="absolute left-4 top-4 border border-violet-300/30 bg-slate-950/80 px-3 py-1 text-[10px] font-black uppercase text-violet-100">
                {game.category}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-200 bg-violet-300/20 shadow-[0_0_28px_rgba(168,85,247,0.34)] backdrop-blur">
                <Swords className="h-5 w-5 text-violet-100" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="line-clamp-1 text-sm font-black uppercase italic text-white">
                {game.name}
              </h3>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Siap dipesan
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
