import { useState } from "react";
import { useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/useSEO";
import { getTargetCopy } from "@/lib/target-copy";
import { buildInvoiceMessage, buildWhatsAppUrl } from "@/lib/whatsapp-invoice";
import { ArrowLeft, Search, Copy, Check, RefreshCw, Clock, CheckCircle2, XCircle, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function Status() {
  const { referenceId: urlRef } = useParams<{ referenceId: string }>();

  useSEO({
    title: "Cek Status Transaksi Top Up Game | CoinIn",
    description:
      "Cek status pembayaran dan top up game CoinIn secara real-time menggunakan Reference ID transaksi.",
    canonicalPath: "/status",
    keywords: "cek status top up, status transaksi game, cek qris game",
    noindex: Boolean(urlRef),
  });

  const [searchRef, setSearchRef] = useState(urlRef || "");
  const [activeRef, setActiveRef] = useState(urlRef || "");
  const [copied, setCopied] = useState(false);

  const { data: transaction, isLoading, refetch } = trpc.order.byReference.useQuery(
    { referenceId: activeRef },
    { enabled: !!activeRef, refetchInterval: activeRef ? 5000 : false }
  );
  const invoiceUrl = transaction
    ? buildWhatsAppUrl(
        transaction.customerPhone,
        buildInvoiceMessage({
          referenceId: transaction.referenceId,
          gameName: transaction.gameName,
          productName: transaction.productName,
          userIdGame: transaction.userIdGame,
          zoneId: transaction.zoneId,
          price: transaction.price,
          status: transaction.status,
          paymentStatus: transaction.paymentStatus,
          customerName: transaction.customerName,
          checkoutUrl: `${window.location.origin}/checkout/${transaction.referenceId}`,
          statusUrl: `${window.location.origin}/status/${transaction.referenceId}`,
        }),
      )
    : "";
  const targetCopy = transaction ? getTargetCopy(transaction.gameName, transaction.category) : null;

  const handleSearch = () => {
    if (!searchRef.trim()) {
      toast.error("Masukkan Reference ID");
      return;
    }
    setActiveRef(searchRef.trim());
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("ID disalin!");
    } catch {
      toast.error("Browser menolak akses clipboard. Salin ID secara manual.");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "processing":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-4 rounded-none text-slate-400 hover:text-white hover:bg-cyan-300/10">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </Link>

      <div className="hud-frame mb-6 overflow-hidden border border-cyan-300/20 bg-slate-950/80 p-6">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Order Tracker</p>
        <h1 className="section-title-gaming mt-3 text-3xl font-black uppercase italic text-white">Cek Status Transaksi</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Masukkan Reference ID untuk memantau pembayaran dan proses top up secara real-time.
        </p>
      </div>

      {/* Search */}
      <Card className="hud-frame bg-slate-950/80 border-cyan-300/20 mb-6 rounded-none">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Masukkan Reference ID (contoh: TRX-ABC123XYZ)"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-12 rounded-none bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-cyan-300/50"
            />
            <Button onClick={handleSearch} className="h-12 rounded-none bg-cyan-300 hover:bg-cyan-200 text-slate-950 font-black px-6">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl bg-slate-800" />
        </div>
      ) : transaction ? (
        <div className="space-y-4">
          <Card className="hud-frame bg-slate-950/80 border-cyan-300/20 rounded-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-base">Informasi Transaksi</CardTitle>
                <button
                  onClick={() => refetch()}
                  className="text-slate-500 hover:text-amber-400 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="angle-card flex items-center gap-3 border border-cyan-300/20 bg-slate-950 p-4">
                {getStatusIcon(transaction.status)}
                <div>
                  <p className="text-white font-medium capitalize">{transaction.status}</p>
                  <p className="text-xs text-slate-500">Status Transaksi</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Reference ID</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">{transaction.referenceId}</span>
                    <button
                      onClick={() => handleCopy(transaction.referenceId)}
                      className="text-slate-500 hover:text-amber-400 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Game</span>
                  <span className="text-white">{transaction.gameName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Produk</span>
                  <span className="text-white">{transaction.productName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{targetCopy?.label ?? "ID Pemain"}</span>
                  <span className="text-white">{transaction.userIdGame}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total</span>
                  <span className="text-amber-400 font-bold">
                    Rp {transaction.price.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Payment Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs border capitalize ${getStatusColor(transaction.paymentStatus)}`}>
                    {transaction.paymentStatus}
                  </span>
                </div>
                {transaction.topupStatus && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Top-up Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border capitalize ${getStatusColor(transaction.topupStatus)}`}>
                      {transaction.topupStatus}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500">
                <p>Dibuat: {new Date(transaction.createdAt).toLocaleString("id-ID")}</p>
                <p>Diperbarui: {new Date(transaction.updatedAt).toLocaleString("id-ID")}</p>
              </div>

              <a href={invoiceUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full rounded-none border-green-500/30 bg-green-500/10 text-green-200 hover:bg-green-500/20">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Kirim Invoice ke WhatsApp
                </Button>
              </a>
            </CardContent>
          </Card>

          {transaction.status === "pending" && transaction.paymentStatus === "unpaid" && (
            <Link to={`/checkout/${transaction.referenceId}`}>
                <Button className="angle-card w-full rounded-none bg-cyan-300 hover:bg-cyan-200 text-slate-950 font-black h-12">
                Lanjutkan Pembayaran
              </Button>
            </Link>
          )}
        </div>
      ) : activeRef ? (
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">Transaksi tidak ditemukan</h3>
          <p className="text-slate-500">Pastikan Reference ID yang dimasukkan benar</p>
        </div>
      ) : null}
    </div>
  );
}
