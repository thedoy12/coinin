import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useSEO } from "@/hooks/useSEO";
import { useJsonLd } from "@/hooks/useJsonLd";
import { apiPostJson } from "@/lib/api-client";
import { getTargetCopy } from "@/lib/target-copy";
import { ArrowLeft, Gamepad2, User, Hash, ShoppingCart, Sparkles, Coins } from "lucide-react";
import { toast } from "sonner";

export default function GameDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [activeProductTab, setActiveProductTab] = useState<ProductTabValue>("general");
  const [userId, setUserId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const { data: game, isLoading: gameLoading } = trpc.game.bySlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  const { data: products, isLoading: productsLoading } = trpc.product.byGameSlug.useQuery(
    { slug: slug || "" },
    { enabled: !!slug }
  );

  useSEO({
    title: game
      ? `Top Up ${game.name} Murah dan Cepat | CoinIn`
      : "Top Up Game Online | CoinIn",
    description: game
      ? `Top up ${game.name} di CoinIn dengan pembayaran QRIS, proses otomatis, dan status transaksi real-time. Pilih nominal top up ${game.name} favoritmu.`
      : "Top up game online cepat, aman, dan otomatis di CoinIn.",
    canonicalPath: slug ? `/game/${slug}` : "/",
    keywords: game
      ? `top up ${game.name}, top up ${game.slug}, top up game, qris game`
      : "top up game, qris game",
  });

  useJsonLd("coinin-game-detail-schema", {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: window.location.origin },
          { "@type": "ListItem", position: 2, name: "Games", item: `${window.location.origin}/games` },
          {
            "@type": "ListItem",
            position: 3,
            name: game?.name ?? "Top Up Game",
            item: slug ? `${window.location.origin}/game/${slug}` : window.location.href,
          },
        ],
      },
      {
        "@type": "Service",
        name: game ? `Top Up ${game.name}` : "Top Up Game Online",
        serviceType: "Top up game online",
        provider: {
          "@type": "Organization",
          name: "CoinIn",
          url: window.location.origin,
        },
        areaServed: {
          "@type": "Country",
          name: "Indonesia",
        },
        url: slug ? `${window.location.origin}/game/${slug}` : window.location.href,
        description: game
          ? `Layanan top up ${game.name} di CoinIn dengan pembayaran online dan status transaksi real-time.`
          : "Layanan top up game online di CoinIn.",
        offers: (products ?? []).slice(0, 12).map((product) => ({
          "@type": "Offer",
          name: product.name,
          price: product.priceSell,
          priceCurrency: "IDR",
          availability: product.isActive === 1 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: slug ? `${window.location.origin}/game/${slug}` : window.location.href,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: game ? `Bagaimana cara top up ${game.name} di CoinIn?` : "Bagaimana cara top up game di CoinIn?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Pilih produk, masukkan data tujuan, lanjut ke checkout, selesaikan pembayaran, lalu cek status transaksi dengan Reference ID.",
            },
          },
          {
            "@type": "Question",
            name: "Apakah status order bisa dicek?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Ya, setiap order memiliki Reference ID yang bisa digunakan untuk mengecek status pembayaran dan proses top up.",
            },
          },
        ],
      },
    ],
  });

  const handleSubmit = async () => {
    const cleanedUserId = userId.trim();
    const cleanedZoneId = zoneId.trim();
    if (!selectedProduct || !cleanedUserId || !game || isCreatingOrder) return;
    if (game.requiresZoneId === 1 && !cleanedZoneId) {
      toast.error("Zone ID / Server wajib diisi untuk game ini");
      return;
    }
    const product = products?.find((p) => p.id === selectedProduct);
    if (!product) return;

    setIsCreatingOrder(true);
    try {
      const data = await apiPostJson<{ referenceId: string; status: string; price: number }>("/api/order/create", {
        productId: product.id,
        userIdGame: cleanedUserId,
        zoneId: cleanedZoneId || undefined,
      });
      toast.success("Order berhasil dibuat!");
      navigate(`/checkout/${data.referenceId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat order");
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (gameLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-64 w-full rounded-xl bg-slate-800" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-slate-600" />
        <h2 className="text-2xl font-bold text-slate-300 mb-2">Game tidak ditemukan</h2>
        <Link to="/">
          <Button variant="outline" className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    );
  }

  const targetCopy = getTargetCopy(game.name, game.category);
  const indonesiaProducts = products?.filter((product) =>
    product.productType !== "membership" && /\bindonesia\b/i.test(product.name)
  ) ?? [];
  const generalProducts = products?.filter((product) =>
    product.productType !== "membership" && !/\bindonesia\b/i.test(product.name)
  ) ?? [];
  const membershipProducts = products?.filter((product) => product.productType === "membership") ?? [];
  const productTabs = [
    { value: "general" as const, label: "General", products: generalProducts },
    { value: "indonesia" as const, label: "Indonesia", products: indonesiaProducts },
    { value: "membership" as const, label: "Membership", products: membershipProducts },
  ].filter((tab) => tab.products.length > 0);
  const visibleProductTab = productTabs.some((tab) => tab.value === activeProductTab)
    ? activeProductTab
    : productTabs[0]?.value ?? "general";
  const visibleProducts = productTabs.find((tab) => tab.value === visibleProductTab)?.products ?? products ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-4 rounded-none text-slate-400 hover:text-white hover:bg-cyan-300/10">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </Link>

      {/* Game Header */}
      <div className="hud-frame relative mb-8 overflow-hidden border border-cyan-300/20 bg-slate-950/80 p-4 sm:p-5">
        <div className="absolute right-5 top-5 hidden text-cyan-200 sm:block">
          <Coins className="h-8 w-8" />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="angle-card h-24 w-24 flex-shrink-0 overflow-hidden bg-slate-800 shadow-lg shadow-cyan-500/10 sm:h-32 sm:w-32">
            {game.thumbnail ? (
              <img
                src={game.thumbnail}
                alt={game.name}
                className="h-full w-full object-cover"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Gamepad2 className="h-12 w-12 text-slate-600" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <Badge className="mb-2 border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
              {game.category}
            </Badge>
            <h1 className="section-title-gaming mb-2 break-words text-2xl font-black uppercase italic text-white sm:text-3xl">
              {game.name}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
              {game.instructions || targetCopy.instructions}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <h2 className="section-title-gaming mb-4 text-xl font-black uppercase italic text-slate-100">Pilih Nominal</h2>
          {productsLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 bg-slate-800" />
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <div className="space-y-5">
              {productTabs.length > 1 && (
                <div className="grid grid-cols-1 gap-2 border border-cyan-300/10 bg-slate-950/70 p-2 sm:grid-cols-3">
                  {productTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveProductTab(tab.value)}
                      className={`min-h-11 px-4 text-sm font-black uppercase transition-colors ${
                        visibleProductTab === tab.value
                          ? "bg-cyan-300 text-slate-950"
                          : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
              <ProductGrid products={visibleProducts} selectedProduct={selectedProduct} onSelect={setSelectedProduct} />
            </div>
          ) : (
            <p className="text-slate-500">Produk tidak tersedia</p>
          )}
        </div>

        {/* Order Form */}
        <div className="min-w-0">
          <Card className="hud-frame sticky top-20 rounded-none border-cyan-300/20 bg-slate-950/80">
            <CardHeader>
              <CardTitle className="text-white text-lg">Form Top Up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-1.5 block">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {targetCopy.label}
                  </div>
                </Label>
                <Input
                  placeholder={targetCopy.placeholder}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  autoComplete="off"
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
                />
                {userId && !userId.trim() && (
                  <p className="mt-1 text-xs text-red-300">{targetCopy.label} tidak boleh kosong</p>
                )}
              </div>

              {targetCopy.showZone && (
                <div>
                  <Label className="mb-1.5 block text-slate-300">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Zone ID / Server
                    </div>
                  </Label>
                  <Input
                    placeholder={game.requiresZoneId ? "Masukkan Zone ID / Server" : "Contoh: 1234 (opsional)"}
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    autoComplete="off"
                    className="border-slate-700 bg-slate-950 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {game.requiresZoneId ? "Wajib diisi untuk game ini" : "Diperlukan untuk beberapa game seperti MLBB"}
                  </p>
                </div>
              )}

              {selectedProduct && products && (
                <div className="border border-slate-800 bg-slate-950 p-3">
                  <div className="mb-2 grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:items-start sm:gap-3">
                    <span className="text-slate-400">Produk</span>
                    <span className="break-words text-left font-medium text-white sm:text-right">
                      {products.find((p) => p.id === selectedProduct)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-slate-400">Total</span>
                    <span className="font-bold text-amber-400">
                      Rp{" "}
                      {products
                        .find((p) => p.id === selectedProduct)
                        ?.priceSell.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!selectedProduct || !userId.trim() || (targetCopy.showZone && game.requiresZoneId === 1 && !zoneId.trim()) || isCreatingOrder}
                className="angle-card w-full rounded-none bg-cyan-300 hover:bg-cyan-200 text-slate-950 font-black h-12 shadow-lg shadow-cyan-500/20"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {isCreatingOrder ? "Memproses..." : "Beli Sekarang"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type ProductGridItem = {
  id: number;
  name: string;
  priceSell: number;
};

type ProductTabValue = "general" | "indonesia" | "membership";

function ProductGrid({
  products,
  selectedProduct,
  onSelect,
}: {
  products: ProductGridItem[];
  selectedProduct: number | null;
  onSelect: (productId: number) => void;
}) {
  if (!products.length) {
    return <p className="text-slate-500">Produk tidak tersedia</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onSelect(product.id)}
          className={`angle-card min-h-28 border p-4 text-left transition-colors ${
            selectedProduct === product.id
              ? "border-cyan-300 bg-cyan-300/15 shadow-lg shadow-cyan-500/10"
              : "border-slate-700 bg-slate-950/70 hover:border-cyan-300/50"
          }`}
        >
          <Sparkles className={`mb-2 h-4 w-4 ${selectedProduct === product.id ? "text-cyan-200" : "text-slate-600"}`} />
          <p className="mb-2 line-clamp-2 text-sm font-semibold leading-5 text-white">{product.name}</p>
          <p className="text-sm font-bold text-cyan-200">
            Rp {product.priceSell.toLocaleString("id-ID")}
          </p>
        </button>
      ))}
    </div>
  );
}
