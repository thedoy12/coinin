import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAction } from "@/lib/admin-actions";
import { ImageUp, Link as LinkIcon, Search, Upload } from "lucide-react";
import { toast } from "sonner";

export default function GameThumbnails() {
  const [search, setSearch] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const utils = trpc.useUtils();
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const isAdmin = user?.role === "admin";
  const { data: games, isLoading } = trpc.admin.games.useQuery(undefined, {
    enabled: isAdmin,
    retry: false,
  });

  useSEO({
    title: "Kelola Thumbnail Game | CoinIn",
    description: "Admin CoinIn untuk mengatur gambar thumbnail game.",
    canonicalPath: "/admin/thumbnails",
    noindex: true,
  });

  const selectedGame = games?.find((game) => game.id === selectedGameId) ?? null;
  const filteredGames = useMemo(() => {
    const value = search.toLowerCase();
    return games?.filter((game) =>
      game.name.toLowerCase().includes(value) ||
      game.slug.toLowerCase().includes(value) ||
      (game.category ?? "").toLowerCase().includes(value),
    ) ?? [];
  }, [games, search]);

  const updateGame = useAdminAction<{ gameId: number; thumbnail: string }>({
    action: "updateGame",
    onSuccess: async () => {
      toast.success("Thumbnail berhasil diperbarui");
      await Promise.all([
        utils.admin.games.invalidate(),
        utils.game.list.invalidate(),
        utils.game.featured.invalidate(),
      ]);
      setThumbnailUrl("");
    },
    onError: (error) => toast.error(error.message || "Gagal update thumbnail"),
  });

  const handleSelectGame = (gameId: number) => {
    const game = games?.find((item) => item.id === gameId);
    setSelectedGameId(gameId);
    setThumbnailUrl(game?.thumbnail ?? "");
    setFile(null);
  };

  const handleSaveUrl = () => {
    if (!selectedGame || !thumbnailUrl.trim()) {
      toast.error("Pilih game dan isi URL thumbnail");
      return;
    }
    updateGame.mutate({
      gameId: selectedGame.id,
      thumbnail: thumbnailUrl.trim(),
    });
  };

  const handleUpload = async () => {
    if (!selectedGame || !file) {
      toast.error("Pilih game dan file gambar");
      return;
    }
    const formData = new FormData();
    formData.append("gameId", String(selectedGame.id));
    formData.append("file", file);
    setIsUploading(true);
    try {
      const response = await fetch("/api/admin/game-thumbnail", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const contentType = response.headers.get("content-type") ?? "";
      const result = contentType.toLowerCase().includes("application/json")
        ? await response.json().catch(() => null) as { success?: boolean; thumbnail?: string; error?: string } | null
        : null;
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || `Gagal upload thumbnail (${response.status})`);
      }
      toast.success("Gambar berhasil diupload");
      await Promise.all([
        utils.admin.games.invalidate(),
        utils.game.list.invalidate(),
        utils.game.featured.invalidate(),
      ]);
      setThumbnailUrl(result.thumbnail ?? "");
      setFile(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal upload thumbnail");
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-96 bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-200">
          Admin Assets
        </p>
        <h1 className="section-title-gaming mt-3 text-4xl font-black uppercase italic text-white">
          Thumbnail Game
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
          Pilih game, paste URL gambar atau upload file, lalu thumbnail akan langsung diperbarui di katalog.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="hud-frame rounded-none border-cyan-300/20 bg-slate-950/80">
          <CardHeader>
            <CardTitle className="text-white">Pilih Game</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-200/70" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari game..."
                className="h-12 rounded-none border-cyan-300/25 bg-slate-950/80 pl-10 font-semibold text-white placeholder:text-slate-500"
              />
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 bg-slate-800" />
                ))}
              </div>
            ) : (
              <div className="max-h-[590px] space-y-2 overflow-y-auto pr-2">
                {filteredGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleSelectGame(game.id)}
                    className={`flex w-full items-center gap-3 border p-2 text-left transition-colors ${
                      selectedGameId === game.id
                        ? "border-cyan-300 bg-cyan-300/10"
                        : "border-slate-800 bg-slate-950/70 hover:border-cyan-300/40"
                    }`}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden bg-slate-800">
                      {game.thumbnail ? (
                        <img src={game.thumbnail} alt={game.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageUp className="m-3 h-6 w-6 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black uppercase text-white">{game.name}</p>
                      <p className="truncate text-xs text-slate-500">{game.category || game.slug}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hud-frame rounded-none border-cyan-300/20 bg-slate-950/80">
          <CardHeader>
            <CardTitle className="text-white">Update Thumbnail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="aspect-square max-w-sm overflow-hidden border border-cyan-300/20 bg-slate-900">
              {selectedGame?.thumbnail ? (
                <img src={selectedGame.thumbnail} alt={selectedGame.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-500">
                  <ImageUp className="h-16 w-16" />
                </div>
              )}
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-2 text-slate-300">
                <LinkIcon className="h-4 w-4" />
                Thumbnail URL
              </Label>
              <div className="flex gap-2">
                <Input
                  value={thumbnailUrl}
                  onChange={(event) => setThumbnailUrl(event.target.value)}
                  placeholder="https://..."
                  disabled={!selectedGame}
                  className="rounded-none border-slate-700 bg-slate-950 text-white"
                />
                <Button
                  onClick={handleSaveUrl}
                  disabled={!selectedGame || updateGame.isPending}
                  className="rounded-none bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200"
                >
                  Simpan URL
                </Button>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-5">
              <Label className="mb-2 flex items-center gap-2 text-slate-300">
                <Upload className="h-4 w-4" />
                Upload Gambar
              </Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                disabled={!selectedGame}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="rounded-none border-slate-700 bg-slate-950 text-white"
              />
              <p className="mt-2 text-xs text-slate-500">
                Maksimal 2MB. Format: JPG, PNG, WebP, GIF.
              </p>
              <Button
                onClick={handleUpload}
                disabled={!selectedGame || !file || isUploading}
                className="mt-4 rounded-none bg-amber-400 font-black text-slate-950 hover:bg-amber-300"
              >
                {isUploading ? "Mengupload..." : "Upload & Perbarui"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
