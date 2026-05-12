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
      <Card className="cyber-panel game-card-cyber overflow-hidden transition-transform group-hover:-translate-y-1">
        <CardContent className="p-0">
          <div className="relative aspect-[0.84] min-h-28 sm:aspect-[4/5] sm:min-h-48">
            {game.thumbnail ? (
              <div className="game-card-art absolute inset-0 flex items-center justify-center">
                <img
                  src={game.thumbnail}
                  alt={game.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain p-2 opacity-95 drop-shadow-[0_0_18px_rgba(168,85,247,0.2)] transition-transform duration-300 group-hover:scale-105 sm:p-4 sm:drop-shadow-[0_0_22px_rgba(168,85,247,0.22)]"
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center bg-slate-800">
                <Gamepad2 className="h-10 w-10 text-slate-600 sm:h-16 sm:w-16" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
            {game.category && (
              <div className="absolute left-2 top-2 border border-violet-300/30 bg-slate-950/80 px-2 py-1 text-[9px] font-black uppercase text-violet-100 sm:left-4 sm:top-4 sm:px-3 sm:text-[10px]">
                {game.category}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-200 bg-violet-300/20 shadow-[0_0_28px_rgba(168,85,247,0.34)] backdrop-blur sm:h-12 sm:w-12">
                <Swords className="h-5 w-5 text-violet-100" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4">
              <h3 className="line-clamp-2 text-xs font-black uppercase italic leading-tight text-white sm:line-clamp-1 sm:text-sm">
                {game.name}
              </h3>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[10px] sm:tracking-[0.18em]">
                Siap dipesan
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
