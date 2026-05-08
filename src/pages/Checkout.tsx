import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSEO } from "@/hooks/useSEO";
import { apiGetWithHeaders } from "@/lib/api-client";
import { getTargetCopy } from "@/lib/target-copy";
import { ArrowLeft, Copy, Check, QrCode, User, Mail, Phone, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Checkout() {
  const { referenceId } = useParams<{ referenceId: string }>();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  useSEO({
    title: "Checkout Transaksi Digital | CoinIn",
    description: "Selesaikan pembayaran QRIS, VA, atau e-wallet dan pantau status transaksi CoinIn secara real-time.",
    canonicalPath: referenceId ? `/checkout/${referenceId}` : "/checkout",
    keywords: "checkout top up, pembayaran qris, pembayaran va, pembayaran e-wallet, coinin checkout",
    noindex: true,
  });

  const { data: transaction, isLoading } = trpc.order.byReference.useQuery(
    { referenceId: referenceId || "" },
    { enabled: !!referenceId, refetchInterval: 5000 }
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

  const handlePay = async () => {
    if (!referenceId || !customerName || !customerEmail || !customerPhone) {
      toast.error("Lengkapi data pelanggan terlebih dahulu");
      return;
    }
    if (!isValidEmail(customerEmail)) {
      toast.error("Format email belum valid");
      return;
    }
    if (!isValidPhone(customerPhone)) {
      toast.error("Nomor WhatsApp belum valid");
      return;
    }
    if (isCreatingPayment) return;

    setIsCreatingPayment(true);
    try {
      const result = await apiGetWithHeaders<PaymentCreateResponse>("/api/payment/create-qris", {
        "x-coinin-reference-id": referenceId,
        "x-coinin-customer-name": customerName.trim(),
        "x-coinin-customer-email": customerEmail.trim(),
        "x-coinin-customer-phone": customerPhone.trim(),
      });
      if (result.success && result.data?.checkout_url) {
        toast.success("Halaman pembayaran berhasil dibuat!");
        window.location.href = result.data.checkout_url;
      } else {
        toast.error(result.error || "Gagal membuat pembayaran");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat pembayaran");
    } finally {
      setIsCreatingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-96 w-full rounded-xl bg-slate-800" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-bold text-slate-300 mb-4">Transaksi tidak ditemukan</h2>
        <Link to="/">
          <Button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    );
  }

  const isPaid = transaction.paymentStatus === "paid";
  const targetCopy = getTargetCopy(transaction.gameName, transaction.category);
  const expiresAt = transaction.expiresAt ? new Date(transaction.expiresAt) : null;
  const isExpired = transaction.paymentStatus === "expired" || Boolean(expiresAt && expiresAt.getTime() < now);
  const timeLeft = expiresAt ? formatDuration(expiresAt.getTime() - now) : "-";
  const canPay =
    Boolean(customerName.trim()) &&
    isValidEmail(customerEmail) &&
    isValidPhone(customerPhone) &&
    !isCreatingPayment;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to={`/game/${transaction.gameSlug}`}>
        <Button variant="ghost" size="sm" className="mb-4 rounded-none text-slate-400 hover:text-white hover:bg-cyan-300/10">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </Button>
      </Link>

      <h1 className="section-title-gaming text-2xl font-black uppercase italic text-white mb-6 flex items-center gap-2">
        Checkout
        <Sparkles className="h-5 w-5 text-amber-300 coin-float" />
      </h1>

      <div className="space-y-4">
        {/* Transaction Info */}
        <Card className="hud-frame bg-slate-950/80 border-cyan-300/20 rounded-none">
          <CardHeader>
            <CardTitle className="text-white text-base">Detail Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
              <span className="text-slate-400">{targetCopy.label}</span>
              <span className="text-white">{transaction.userIdGame}</span>
            </div>
            <div className="border-t border-slate-800 pt-3 flex justify-between">
              <span className="text-slate-400">Total Pembayaran</span>
              <span className="text-amber-400 font-bold text-lg">
                Rp {transaction.price.toLocaleString("id-ID")}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="bg-slate-950/80 border-cyan-300/20 rounded-none">
          <CardHeader>
            <CardTitle className="text-white text-base">Status Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isPaid
                    ? "bg-green-500"
                    : transaction.paymentStatus === "failed" || isExpired
                    ? "bg-red-500"
                    : "bg-amber-500 animate-pulse"
                }`}
              />
              <span className="text-white font-medium capitalize">
                {isPaid ? "Pembayaran Berhasil" : isExpired ? "Transaksi Kadaluarsa" : transaction.paymentStatus === "unpaid" ? "Menunggu Pembayaran" : transaction.paymentStatus}
              </span>
              </div>
              {!isPaid && !isExpired && (
                <span className="border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">
                  {timeLeft}
                </span>
              )}
            </div>
            {transaction.topupStatus && (
              <div className="mt-2 text-sm text-slate-400">
                Top-up Status: <span className="text-white capitalize">{transaction.topupStatus}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Form */}
        {!isPaid && !isExpired && ["unpaid", "pending"].includes(transaction.paymentStatus) && (
          <Card className="hud-frame bg-slate-950/80 border-cyan-300/20 rounded-none">
            <CardHeader>
              <CardTitle className="text-white text-base">Data Pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-1.5 block">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nama Lengkap
                  </div>
                </Label>
                <Input
                  placeholder="Nama lengkap Anda"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
                />
              </div>
              <div>
                <Label className="text-slate-300 mb-1.5 block">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </div>
                </Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
                />
                {customerEmail && !isValidEmail(customerEmail) && (
                  <p className="mt-1 text-xs text-red-300">Format email belum valid</p>
                )}
              </div>
              <div>
                <Label className="text-slate-300 mb-1.5 block">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    No. WhatsApp
                  </div>
                </Label>
                <Input
                  placeholder="081234567890"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50"
                />
                {customerPhone && !isValidPhone(customerPhone) && (
                  <p className="mt-1 text-xs text-red-300">Gunakan nomor WhatsApp 8-20 digit</p>
                )}
              </div>

              <Button
                onClick={handlePay}
                disabled={!canPay}
                className="angle-card w-full rounded-none bg-cyan-300 hover:bg-cyan-200 text-slate-950 font-black h-12 shadow-lg shadow-cyan-500/20"
              >
                <QrCode className="w-4 h-4 mr-2" />
                {isCreatingPayment ? "Memproses..." : "Bayar Sekarang"}
              </Button>
              <p className="text-xs text-center text-slate-500">
                Pembayaran aman melalui sistem pembayaran CoinIn
              </p>
            </CardContent>
          </Card>
        )}

        {isExpired && (
          <Card className="bg-red-950/20 border-red-800/50">
            <CardContent className="py-6 text-center">
              <h3 className="text-white font-bold mb-1">Transaksi Kadaluarsa</h3>
              <p className="text-slate-400 text-sm mb-4">
                Buat order baru supaya harga dan stok produk tetap sesuai.
              </p>
              <Link to={`/game/${transaction.gameSlug}`}>
                <Button className="bg-cyan-300 hover:bg-cyan-200 text-slate-950 font-black">
                  Buat Order Baru
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Success Actions */}
        {isPaid && (
          <Card className="bg-green-950/20 border-green-800/50">
            <CardContent className="py-6 text-center">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="text-white font-bold mb-1">Pembayaran Berhasil!</h3>
              <p className="text-slate-400 text-sm mb-4">
                Top-up sedang diproses. Silakan cek status secara berkala.
              </p>
              <Link to={`/status/${transaction.referenceId}`}>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Cek Status Top Up
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function formatDuration(ms: number) {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string) {
  return /^\+?[0-9][0-9\s-]{6,18}[0-9]$/.test(value.trim());
}

type PaymentCreateResponse = {
  success: boolean;
  error?: string;
  data?: {
    checkout_url?: string | null;
  };
};
