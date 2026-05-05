import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Gamepad2 } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

export default function NotFound() {
  useSEO({
    title: "Halaman Tidak Ditemukan | CoinIn",
    description: "Halaman CoinIn yang Anda cari tidak ditemukan.",
    canonicalPath: "/404",
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="text-center px-4">
        <Gamepad2 className="w-16 h-16 mx-auto mb-6 text-slate-600" />
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-xl font-semibold text-slate-300 mb-2">Halaman tidak ditemukan</h2>
        <p className="text-slate-500 mb-8">Halaman yang Anda cari mungkin telah dipindahkan atau dihapus.</p>
        <Link to="/">
          <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}
