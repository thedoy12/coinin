import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  Clock,
  Download,
  Gamepad2,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldAlert,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

type StatusTone = "success" | "failed" | "processing" | "pending";
type ProductType = "general" | "membership";

const emptyGameForm = {
  name: "",
  slug: "",
  category: "",
  thumbnail: "",
  instructions: "",
  requiresZoneId: false,
  isActive: true,
};

const emptyProductForm = {
  gameId: "",
  name: "",
  providerCode: "",
  productType: "general",
  priceModal: "",
  priceSell: "",
  isActive: true,
};

export default function AdminDashboard() {
  useSEO({
    title: "Owner Console | CoinIn",
    description: "Panel internal CoinIn untuk mengelola transaksi, game, produk, pelanggan, dan log API.",
    canonicalPath: "/admin",
    noindex: true,
  });

  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [gameForm, setGameForm] = useState(emptyGameForm);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [productImportFile, setProductImportFile] = useState<File | null>(null);
  const [productImportCount, setProductImportCount] = useState<number | null>(null);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [apiLogSearch, setApiLogSearch] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      toast.error("Akses ditolak. Halaman ini hanya untuk admin.");
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const enabled = !!user && user.role === "admin";
  const statsQuery = trpc.admin.stats.useQuery(undefined, { enabled });
  const transactionsQuery = trpc.admin.allTransactions.useQuery(undefined, { enabled });
  const customersQuery = trpc.admin.customers.useQuery(undefined, { enabled });
  const usersQuery = trpc.admin.users.useQuery(undefined, { enabled });
  const catalogQuery = trpc.admin.catalog.useQuery(undefined, { enabled });
  const gamesQuery = trpc.admin.games.useQuery(undefined, { enabled });
  const auditQuery = trpc.admin.auditLogs.useQuery(undefined, { enabled });
  const providerApiLogsQuery = trpc.admin.providerApiLogs.useQuery(undefined, { enabled });

  const refreshAll = () => {
    statsQuery.refetch();
    transactionsQuery.refetch();
    customersQuery.refetch();
    usersQuery.refetch();
    catalogQuery.refetch();
    gamesQuery.refetch();
    auditQuery.refetch();
    providerApiLogsQuery.refetch();
  };

  const updateStatus = trpc.admin.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status transaksi diperbarui");
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const syncPayment = trpc.admin.syncPayment.useMutation({
    onSuccess: () => {
      toast.success("Status payment disinkronkan");
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const retryTopup = trpc.admin.retryTopup.useMutation({
    onSuccess: () => {
      toast.success("Top-up diproses ulang");
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const expireOld = trpc.admin.expireOld.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.count} transaksi kadaluarsa diperbarui`);
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const syncTopups = trpc.admin.syncTopups.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.count} top-up processing disinkronkan`);
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const syncCatalog = trpc.admin.syncCatalog.useMutation({
    onSuccess: (result) => {
      toast.success(`Katalog provider disinkronkan: ${result.totalRows} produk aktif`);
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateUserRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role akun diperbarui");
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetUserPassword = trpc.admin.resetUserPassword.useMutation({
    onSuccess: () => {
      toast.success("Password akun berhasil direset");
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      toast.success("Produk diperbarui");
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const createProduct = trpc.admin.createProduct.useMutation({
    onSuccess: () => {
      toast.success("Produk baru ditambahkan");
      setProductForm(emptyProductForm);
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const importProducts = trpc.admin.importProducts.useMutation({
    onSuccess: (result) => {
      const skippedText = result.skipped.length ? `, ${result.skipped.length} dilewati` : "";
      const gamesText = result.gamesCreated ? `, ${result.gamesCreated} game baru` : "";
      toast.success(`Import selesai: ${result.created} produk baru, ${result.updated} diperbarui${gamesText}${skippedText}`);
      setProductImportFile(null);
      setProductImportCount(null);
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const createGame = trpc.admin.createGame.useMutation({
    onSuccess: () => {
      toast.success("Game baru ditambahkan");
      setGameForm(emptyGameForm);
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateGame = trpc.admin.updateGame.useMutation({
    onSuccess: () => {
      toast.success("Game diperbarui");
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const totals = useMemo(() => {
    const txs = transactionsQuery.data ?? [];
    return {
      unpaid: txs.filter((tx) => tx.paymentStatus === "unpaid").length,
      failedTopup: txs.filter((tx) => tx.topupStatus === "failed").length,
      customers: customersQuery.data?.length ?? 0,
      accounts: usersQuery.data?.length ?? 0,
    };
  }, [customersQuery.data, transactionsQuery.data, usersQuery.data]);

  const filteredTransactions = useMemo(() => {
    const keyword = transactionSearch.trim().toLowerCase();
    if (!keyword) return transactionsQuery.data ?? [];
    return (transactionsQuery.data ?? []).filter((tx) =>
      [
        tx.referenceId,
        tx.gameName,
        tx.productName,
        tx.customerName,
        tx.customerEmail,
        tx.customerPhone,
        tx.paymentStatus,
        tx.status,
        tx.topupStatus,
      ].some((value) => String(value ?? "").toLowerCase().includes(keyword))
    );
  }, [transactionSearch, transactionsQuery.data]);

  const filteredCatalog = useMemo(() => {
    const keyword = productSearch.trim().toLowerCase();
    if (!keyword) return catalogQuery.data ?? [];
    return (catalogQuery.data ?? []).filter((product) =>
      [
        product.gameName,
        product.name,
        product.providerCode,
        product.productType,
        product.gameSlug,
        product.isActive ? "aktif" : "nonaktif",
      ].some((value) => String(value ?? "").toLowerCase().includes(keyword))
    );
  }, [catalogQuery.data, productSearch]);

  const filteredApiLogs = useMemo(() => {
    const keyword = apiLogSearch.trim().toLowerCase();
    if (!keyword) return providerApiLogsQuery.data ?? [];
    return (providerApiLogsQuery.data ?? []).filter((log) =>
      [
        log.provider,
        log.referenceId,
        log.method,
        log.endpoint,
        log.statusCode,
        log.success ? "success" : "failed",
        log.error,
      ].some((value) => String(value ?? "").toLowerCase().includes(keyword))
    );
  }, [apiLogSearch, providerApiLogsQuery.data]);

  if (authLoading || statsQuery.isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        <Skeleton className="h-32 w-full rounded-xl bg-slate-800" />
        <Skeleton className="h-96 w-full rounded-xl bg-slate-800" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-500" />
        <h2 className="text-2xl font-bold text-slate-300">Akses Ditolak</h2>
        <p className="text-slate-500 mt-2">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        <Link to="/">
          <Button className="mt-6 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    );
  }

  const stats = statsQuery.data;
  const transactions = transactionsQuery.data ?? [];
  const customers = customersQuery.data ?? [];
  const accounts = usersQuery.data ?? [];
  const catalog = catalogQuery.data ?? [];
  const games = gamesQuery.data ?? [];
  const auditLogs = auditQuery.data ?? [];
  const providerApiLogs = providerApiLogsQuery.data ?? [];

  const createProductSubmit = () => {
    if (!productForm.gameId || !productForm.name || !productForm.providerCode) {
      toast.error("Lengkapi game, nama produk, dan provider code");
      return;
    }
    createProduct.mutate({
      gameId: Number(productForm.gameId),
      name: productForm.name,
      providerCode: productForm.providerCode,
      productType: productForm.productType as ProductType,
      priceModal: Number(productForm.priceModal),
      priceSell: Number(productForm.priceSell),
      isActive: productForm.isActive,
    });
  };

  const importProductsSubmit = async () => {
    if (!productImportFile) {
      toast.error("Pilih file produk dulu");
      return;
    }

    try {
      const rows = await parseProductImportFile(productImportFile);
      if (!rows.length) {
        toast.error("Tidak ada produk valid di file");
        return;
      }
      importProducts.mutate({ rows });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "File produk tidak bisa dibaca");
    }
  };

  const handleProductImportFile = async (file: File | null) => {
    setProductImportFile(file);
    setProductImportCount(null);
    if (!file) return;

    try {
      const rows = await parseProductImportFile(file);
      setProductImportCount(rows.length);
      if (!rows.length) {
        toast.error("Tidak ada produk valid di file");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "File produk tidak bisa dibaca");
    }
  };

  const createGameSubmit = () => {
    if (!gameForm.name || !gameForm.slug) {
      toast.error("Nama dan slug game wajib diisi");
      return;
    }
    createGame.mutate(gameForm);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Owner Console</h1>
            <p className="text-sm text-slate-500">CoinIn operations, buyer data, game catalog, and transaction control.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => expireOld.mutate()} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Clock className="w-4 h-4 mr-2" />
            Expire Lama
          </Button>
          <Button variant="outline" size="sm" onClick={() => syncTopups.mutate()} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <RotateCcw className="w-4 h-4 mr-2" />
            Sync Top-up
          </Button>
          <Button variant="outline" size="sm" onClick={() => syncCatalog.mutate()} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync Catalog
          </Button>
          <Button variant="outline" size="sm" onClick={refreshAll} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="gap-6">
        <TabsList className="bg-slate-900 border border-slate-800 text-slate-400 overflow-x-auto h-auto justify-start p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transaksi</TabsTrigger>
          <TabsTrigger value="customers">Pembeli</TabsTrigger>
          <TabsTrigger value="accounts">Akun</TabsTrigger>
          <TabsTrigger value="games">Game</TabsTrigger>
          <TabsTrigger value="products">Produk</TabsTrigger>
          <TabsTrigger value="api-logs">API Log</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Revenue Paid" value={rupiah(stats?.totalRevenue ?? 0)} icon={<Wallet />} tone="success" />
            <MetricCard title="Estimasi Profit" value={rupiah(stats?.totalProfit ?? 0)} icon={<Wallet />} tone="processing" />
            <MetricCard title="Total Transaksi" value={(stats?.totalTransactions ?? 0).toString()} icon={<Package />} tone="pending" />
            <MetricCard title="Pembeli Tercatat" value={totals.customers.toString()} icon={<Users />} tone="processing" />
            <MetricCard title="Akun Terdaftar" value={totals.accounts.toString()} icon={<Users />} tone="success" />
            <MetricCard title="Paid Orders" value={(stats?.paidTransactions ?? 0).toString()} icon={<Package />} tone="success" />
            <MetricCard title="Unpaid Orders" value={totals.unpaid.toString()} icon={<Clock />} tone="pending" />
            <MetricCard title="Top-up Failed" value={totals.failedTopup.toString()} icon={<RotateCcw />} tone="failed" />
            <MetricCard title="Game Aktif" value={(stats?.activeGames ?? 0).toString()} icon={<Gamepad2 />} tone="success" />
          </div>
          <TransactionTable
            rows={stats?.recentTransactions ?? []}
            onSync={(referenceId) => syncPayment.mutate({ referenceId })}
            onRetry={(referenceId) => retryTopup.mutate({ referenceId })}
            onStatus={(referenceId, status) => updateStatus.mutate({ referenceId, status })}
          />
        </TabsContent>

        <TabsContent value="transactions">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Semua Transaksi</CardTitle>
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" onClick={() => downloadCsv("transactions.csv", transactions)}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={transactionSearch}
                onChange={(event) => setTransactionSearch(event.target.value)}
                placeholder="Cari reference, game, pembeli, status..."
                className="max-w-xl bg-slate-950 border-slate-700 text-white"
              />
              <TransactionTable
                rows={filteredTransactions}
                onSync={(referenceId) => syncPayment.mutate({ referenceId })}
                onRetry={(referenceId) => retryTopup.mutate({ referenceId })}
                onStatus={(referenceId, status) => updateStatus.mutate({ referenceId, status })}
                showCustomer
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Data Pembeli</CardTitle>
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" onClick={() => downloadCsv("customers.csv", customers)}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Nama</TableHead>
                      <TableHead className="text-slate-400">Email</TableHead>
                      <TableHead className="text-slate-400">WhatsApp</TableHead>
                      <TableHead className="text-slate-400">Order</TableHead>
                      <TableHead className="text-slate-400">Total Paid</TableHead>
                      <TableHead className="text-slate-400">Order Terakhir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer, index) => (
                      <TableRow key={`${customer.customerEmail}-${customer.customerPhone}-${index}`} className="border-slate-800">
                        <TableCell className="text-white">{customer.customerName || "-"}</TableCell>
                        <TableCell className="text-slate-300">{customer.customerEmail || "-"}</TableCell>
                        <TableCell className="text-slate-300">{customer.customerPhone || "-"}</TableCell>
                        <TableCell className="text-slate-300">{customer.totalOrders}</TableCell>
                        <TableCell className="text-amber-400">{rupiah(customer.totalSpent)}</TableCell>
                        <TableCell className="text-slate-500">{formatDate(customer.lastOrderAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Akun Terdaftar</CardTitle>
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" onClick={() => downloadCsv("accounts.csv", accounts)}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <UserTable
                rows={accounts}
                onRole={(userId, role) => updateUserRole.mutate({ userId, role })}
                onResetPassword={(userId, password) => resetUserPassword.mutate({ userId, password })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Tambah Game</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Nama Game"><Input value={gameForm.name} onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })} className="bg-slate-950 border-slate-700 text-white" /></Field>
              <Field label="Slug"><Input value={gameForm.slug} onChange={(e) => setGameForm({ ...gameForm, slug: e.target.value })} className="bg-slate-950 border-slate-700 text-white" /></Field>
              <Field label="Kategori"><Input value={gameForm.category} onChange={(e) => setGameForm({ ...gameForm, category: e.target.value })} className="bg-slate-950 border-slate-700 text-white" /></Field>
              <Field label="Thumbnail URL"><Input value={gameForm.thumbnail} onChange={(e) => setGameForm({ ...gameForm, thumbnail: e.target.value })} className="bg-slate-950 border-slate-700 text-white" /></Field>
              <div className="md:col-span-2">
                <Field label="Instruksi">
                  <Textarea value={gameForm.instructions} onChange={(e) => setGameForm({ ...gameForm, instructions: e.target.value })} className="bg-slate-950 border-slate-700 text-white" />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button variant={gameForm.requiresZoneId ? "default" : "outline"} onClick={() => setGameForm({ ...gameForm, requiresZoneId: !gameForm.requiresZoneId })}>Zone ID Wajib</Button>
                <Button variant={gameForm.isActive ? "default" : "outline"} onClick={() => setGameForm({ ...gameForm, isActive: !gameForm.isActive })}>Aktif</Button>
                <Button className="bg-amber-500 text-slate-950 hover:bg-amber-600" onClick={createGameSubmit}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Game
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader><CardTitle className="text-white">Daftar Game</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Game</TableHead>
                      <TableHead className="text-slate-400">Slug</TableHead>
                      <TableHead className="text-slate-400">Kategori</TableHead>
                      <TableHead className="text-slate-400">Zone</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {games.map((game) => (
                      <TableRow key={game.id} className="border-slate-800">
                        <TableCell className="text-white">{game.name}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">{game.slug}</TableCell>
                        <TableCell className="text-slate-300">{game.category || "-"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-7 text-slate-300" onClick={() => updateGame.mutate({ gameId: game.id, requiresZoneId: game.requiresZoneId !== 1 })}>
                            {game.requiresZoneId ? "Wajib" : "Opsional"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className={game.isActive ? "h-7 text-green-400" : "h-7 text-red-400"} onClick={() => updateGame.mutate({ gameId: game.id, isActive: game.isActive !== 1 })}>
                            {game.isActive ? "Aktif" : "Nonaktif"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Import Katalog Game + Produk</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <Field label="File Excel / HTML">
                <Input
                  type="file"
                  accept=".xls,.html,.htm"
                  onChange={(event) => handleProductImportFile(event.target.files?.[0] ?? null)}
                  className="bg-slate-950 border-slate-700 text-white file:mr-4 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-slate-950 hover:file:bg-cyan-400"
                />
              </Field>
              <Button
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                disabled={importProducts.isPending}
                onClick={importProductsSubmit}
              >
                <Upload className="w-4 h-4 mr-2" />
                {importProducts.isPending ? "Mengimport..." : "Import"}
              </Button>
              <p className="text-xs text-slate-500 lg:col-span-2">
                {productImportCount === null
                  ? "Kolom wajib: code, name, harga_rupiah. Kolom game didukung: game/game_name/nama_game, category/kategori, thumbnail, instructions/instruksi, requires_zone_id."
                  : `${productImportCount.toLocaleString("id-ID")} produk valid siap diimport. Game baru akan dibuat otomatis, game lama ikut diperbarui jika file memuat metadata game.`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader><CardTitle className="text-white">Tambah Produk</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Field label="Game">
                <Select value={productForm.gameId} onValueChange={(value) => setProductForm({ ...productForm, gameId: value })}>
                  <SelectTrigger className="w-full bg-slate-950 border-slate-700 text-white"><SelectValue placeholder="Pilih game" /></SelectTrigger>
                  <SelectContent>
                    {games.map((game) => <SelectItem key={game.id} value={game.id.toString()}>{game.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Nama Produk"><Input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="bg-slate-950 border-slate-700 text-white" /></Field>
              <Field label="Provider Code"><Input value={productForm.providerCode} onChange={(e) => setProductForm({ ...productForm, providerCode: e.target.value })} className="bg-slate-950 border-slate-700 text-white" /></Field>
              <Field label="Tipe Produk">
                <Select value={productForm.productType} onValueChange={(value) => setProductForm({ ...productForm, productType: value })}>
                  <SelectTrigger className="w-full bg-slate-950 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="membership">Membership</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Harga Modal"><Input type="number" value={productForm.priceModal} onChange={(e) => setProductForm({ ...productForm, priceModal: e.target.value })} className="bg-slate-950 border-slate-700 text-white" /></Field>
              <Field label="Harga Jual"><Input type="number" value={productForm.priceSell} onChange={(e) => setProductForm({ ...productForm, priceSell: e.target.value })} className="bg-slate-950 border-slate-700 text-white" /></Field>
              <div className="flex items-end gap-2">
                <Button variant={productForm.isActive ? "default" : "outline"} onClick={() => setProductForm({ ...productForm, isActive: !productForm.isActive })}>Aktif</Button>
                <Button className="bg-amber-500 text-slate-950 hover:bg-amber-600" onClick={createProductSubmit}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Katalog Produk</CardTitle>
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" onClick={() => downloadCsv("products.csv", catalog)}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Cari game, produk, provider code, status..."
                className="max-w-xl bg-slate-950 border-slate-700 text-white"
              />
              <ProductTable rows={filteredCatalog} onUpdate={updateProduct.mutate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader><CardTitle className="text-white">Audit Log</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
                  <div>
                    <p className="text-white">{log.action}</p>
                    <p className="text-xs text-slate-500">{log.entityType} #{log.entityId}</p>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                </div>
              ))}
              {!auditLogs.length && <p className="text-center text-slate-500 py-6">Belum ada audit log</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-logs">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-cyan-300" />
                Log API Provider
              </CardTitle>
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" onClick={() => downloadCsv("provider-api-logs.csv", providerApiLogs)}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={apiLogSearch}
                onChange={(event) => setApiLogSearch(event.target.value)}
                placeholder="Cari provider, reference, endpoint, status..."
                className="max-w-xl bg-slate-950 border-slate-700 text-white"
              />
              <ProviderApiLogTable rows={filteredApiLogs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, icon, tone }: { title: string; value: string; icon: React.ReactNode; tone: StatusTone }) {
  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${toneClasses(tone, "soft")}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

type TransactionRow = {
  referenceId: string;
  gameName: string;
  productName: string;
  userIdGame: string;
  zoneId: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  price: number;
  profit?: number;
  status: string;
  paymentStatus: string;
  topupStatus?: string | null;
  retryCount: number;
  createdAt: Date;
};

function TransactionTable({
  rows,
  onSync,
  onRetry,
  onStatus,
  showCustomer = false,
}: {
  rows: TransactionRow[];
  onSync: (referenceId: string) => void;
  onRetry: (referenceId: string) => void;
  onStatus: (referenceId: string, status: "success" | "failed") => void;
  showCustomer?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-400">Reference</TableHead>
            {showCustomer && <TableHead className="text-slate-400">Pembeli</TableHead>}
            <TableHead className="text-slate-400">Game</TableHead>
            <TableHead className="text-slate-400">Produk</TableHead>
            <TableHead className="text-slate-400">Tujuan</TableHead>
            <TableHead className="text-slate-400">Total</TableHead>
            {showCustomer && <TableHead className="text-slate-400">Profit</TableHead>}
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-slate-400">Payment</TableHead>
            <TableHead className="text-slate-400">Top-up</TableHead>
            <TableHead className="text-slate-400">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((tx) => (
            <TableRow key={tx.referenceId} className="border-slate-800 hover:bg-slate-800/50">
              <TableCell className="font-mono text-xs text-slate-300">{tx.referenceId}</TableCell>
              {showCustomer && (
                <TableCell className="text-sm">
                  <p className="text-white">{tx.customerName || "-"}</p>
                  <p className="text-xs text-slate-500">{tx.customerEmail || tx.customerPhone || "-"}</p>
                </TableCell>
              )}
              <TableCell className="text-white text-sm">{tx.gameName}</TableCell>
              <TableCell className="text-slate-300 text-sm">{tx.productName}</TableCell>
              <TableCell className="text-slate-400 text-sm">{tx.zoneId ? `${tx.userIdGame} (${tx.zoneId})` : tx.userIdGame}</TableCell>
              <TableCell className="text-amber-400 text-sm">{rupiah(tx.price)}</TableCell>
              {showCustomer && <TableCell className="text-green-400 text-sm">{rupiah(tx.profit ?? 0)}</TableCell>}
              <TableCell><StatusBadge status={tx.status} /></TableCell>
              <TableCell><StatusBadge status={tx.paymentStatus} /></TableCell>
              <TableCell><StatusBadge status={tx.topupStatus || "-"} /></TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-400" onClick={() => onSync(tx.referenceId)}>Sync</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-400" onClick={() => onRetry(tx.referenceId)}>Retry</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-green-400" onClick={() => onStatus(tx.referenceId, "success")}>Success</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => onStatus(tx.referenceId, "failed")}>Failed</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={showCustomer ? 11 : 9} className="text-center text-slate-500 py-8">Belum ada transaksi</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

type ProductRow = {
  id: number;
  gameName: string;
  name: string;
  providerCode: string;
  productType: string;
  priceModal: number;
  priceSell: number;
  isActive: number;
};

type UserRow = {
  id: number;
  username: string | null;
  name: string | null;
  email: string | null;
  authProvider: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignInAt: Date;
};

type ProviderApiLogRow = {
  id: number;
  provider: string;
  referenceId: string | null;
  method: string;
  endpoint: string;
  requestPayload: string | null;
  responsePayload: string | null;
  statusCode: number | null;
  success: number;
  error: string | null;
  durationMs: number;
  createdAt: Date;
};

function ProviderApiLogTable({ rows }: { rows: ProviderApiLogRow[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-400">Waktu</TableHead>
            <TableHead className="text-slate-400">Ref</TableHead>
            <TableHead className="text-slate-400">Request</TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-slate-400">Durasi</TableHead>
            <TableHead className="text-slate-400">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((log) => (
            <TableRow key={log.id} className="border-slate-800 align-top">
              <TableCell className="text-xs text-slate-400">{formatDate(log.createdAt)}</TableCell>
              <TableCell className="font-mono text-xs text-slate-300">{log.referenceId || "-"}</TableCell>
              <TableCell>
                <div className="text-sm text-white">{log.method} {log.endpoint}</div>
                <div className="text-xs text-slate-500">{log.provider}</div>
              </TableCell>
              <TableCell>
                <StatusBadge status={log.success ? "success" : "failed"} />
                {log.statusCode && <p className="mt-1 text-xs text-slate-500">HTTP {log.statusCode}</p>}
              </TableCell>
              <TableCell className="text-sm text-slate-300">{log.durationMs}ms</TableCell>
              <TableCell className="min-w-80">
                <Button size="sm" variant="ghost" className="h-7 text-xs text-cyan-300" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                  {expandedId === log.id ? "Tutup" : "Lihat"}
                </Button>
                {expandedId === log.id && (
                  <div className="mt-3 grid gap-3 text-xs">
                    <PayloadBlock title="Request" value={log.requestPayload} />
                    <PayloadBlock title={log.success ? "Response" : "Error Response"} value={log.responsePayload || log.error} />
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                Belum ada log API provider. Log akan muncul setelah order paid dikirim ke Digiflazz.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function UserTable({
  rows,
  onRole,
  onResetPassword,
}: {
  rows: UserRow[];
  onRole: (userId: number, role: "user" | "admin") => void;
  onResetPassword: (userId: number, password: string) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [password, setPassword] = useState("");

  const submitPassword = (userId: number) => {
    if (password.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }
    onResetPassword(userId, password);
    setEditingId(null);
    setPassword("");
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-400">Akun</TableHead>
            <TableHead className="text-slate-400">Email</TableHead>
            <TableHead className="text-slate-400">Provider</TableHead>
            <TableHead className="text-slate-400">Role</TableHead>
            <TableHead className="text-slate-400">Daftar</TableHead>
            <TableHead className="text-slate-400">Login Terakhir</TableHead>
            <TableHead className="text-slate-400">Reset Password</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((account) => (
            <TableRow key={account.id} className="border-slate-800 align-top">
              <TableCell>
                <p className="font-bold text-white">{account.name || account.username || `User #${account.id}`}</p>
                <p className="text-xs text-slate-500">{account.username || "-"}</p>
              </TableCell>
              <TableCell className="text-slate-300">{account.email || "-"}</TableCell>
              <TableCell>
                <Badge className="border-slate-700 bg-slate-950 text-slate-300">{account.authProvider}</Badge>
              </TableCell>
              <TableCell>
                <Select value={account.role} onValueChange={(value) => onRole(account.id, value as "user" | "admin")}>
                  <SelectTrigger className="h-8 min-w-28 bg-slate-950 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-sm text-slate-400">{formatDate(account.createdAt)}</TableCell>
              <TableCell className="text-sm text-slate-400">{formatDate(account.lastSignInAt)}</TableCell>
              <TableCell className="min-w-72">
                {editingId === account.id ? (
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password baru"
                      className="h-8 bg-slate-950 border-slate-700 text-white"
                    />
                    <Button size="sm" className="h-8 bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200" onClick={() => submitPassword(account.id)}>
                      Simpan
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-slate-400" onClick={() => { setEditingId(null); setPassword(""); }}>
                      Batal
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="h-8 text-amber-400" onClick={() => setEditingId(account.id)}>
                    Reset
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-slate-500">
                Belum ada akun terdaftar
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function PayloadBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div>
      <p className="mb-1 font-bold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-slate-800 bg-slate-950 p-3 text-slate-300">
        {formatJsonText(value)}
      </pre>
    </div>
  );
}

function ProductTable({ rows, onUpdate }: { rows: ProductRow[]; onUpdate: (input: { productId: number; priceModal?: number; priceSell?: number; providerCode?: string; productType?: ProductType; isActive?: boolean }) => void }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState({
    providerCode: "",
    productType: "general" as ProductType,
    priceModal: "",
    priceSell: "",
  });

  const startEdit = (product: ProductRow) => {
    setEditingId(product.id);
    setDraft({
      providerCode: product.providerCode,
      productType: normalizeProductType(product.productType),
      priceModal: product.priceModal.toString(),
      priceSell: product.priceSell.toString(),
    });
  };

  const saveEdit = (product: ProductRow) => {
    const priceModal = Number(draft.priceModal);
    const priceSell = Number(draft.priceSell);
    if (!draft.providerCode.trim() || !Number.isFinite(priceModal) || !Number.isFinite(priceSell)) {
      toast.error("Provider code dan harga wajib valid");
      return;
    }
    onUpdate({
      productId: product.id,
      providerCode: draft.providerCode.trim(),
      productType: draft.productType,
      priceModal,
      priceSell,
    });
    setEditingId(null);
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-800 hover:bg-transparent">
            <TableHead className="text-slate-400">Game</TableHead>
            <TableHead className="text-slate-400">Produk</TableHead>
            <TableHead className="text-slate-400">Provider</TableHead>
            <TableHead className="text-slate-400">Tipe</TableHead>
            <TableHead className="text-slate-400">Modal</TableHead>
            <TableHead className="text-slate-400">Jual</TableHead>
            <TableHead className="text-slate-400">Margin</TableHead>
            <TableHead className="text-slate-400">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((product) => (
            <TableRow key={product.id} className="border-slate-800">
              <TableCell className="text-white">{product.gameName}</TableCell>
              <TableCell className="text-slate-300">{product.name}</TableCell>
              <TableCell className="font-mono text-xs text-slate-400">
                {editingId === product.id ? (
                  <Input value={draft.providerCode} onChange={(event) => setDraft({ ...draft, providerCode: event.target.value })} className="h-8 min-w-28 bg-slate-950 border-slate-700 text-white" />
                ) : product.providerCode}
              </TableCell>
              <TableCell>
                {editingId === product.id ? (
                  <Select value={draft.productType} onValueChange={(value) => setDraft({ ...draft, productType: value as ProductType })}>
                    <SelectTrigger className="h-8 min-w-32 bg-slate-950 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="membership">Membership</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className="border-slate-700 bg-slate-950 text-slate-300 capitalize">{product.productType}</Badge>
                )}
              </TableCell>
              <TableCell className="text-slate-300">
                {editingId === product.id ? (
                  <Input type="number" value={draft.priceModal} onChange={(event) => setDraft({ ...draft, priceModal: event.target.value })} className="h-8 min-w-28 bg-slate-950 border-slate-700 text-white" />
                ) : rupiah(product.priceModal)}
              </TableCell>
              <TableCell className="text-amber-400">
                {editingId === product.id ? (
                  <Input type="number" value={draft.priceSell} onChange={(event) => setDraft({ ...draft, priceSell: event.target.value })} className="h-8 min-w-28 bg-slate-950 border-slate-700 text-white" />
                ) : rupiah(product.priceSell)}
              </TableCell>
              <TableCell className="text-green-400">{rupiah(product.priceSell - product.priceModal)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" className={product.isActive ? "h-7 text-green-400" : "h-7 text-red-400"} onClick={() => onUpdate({ productId: product.id, isActive: product.isActive !== 1 })}>
                    {product.isActive ? "Aktif" : "Nonaktif"}
                  </Button>
                  {editingId === product.id ? (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-cyan-300" onClick={() => saveEdit(product)}>Simpan</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400" onClick={() => setEditingId(null)}>Batal</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-400" onClick={() => startEdit(product)}>
                      Edit
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-300">{label}</Label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <Badge className={`${toneClasses(statusToTone(status), "badge")} text-xs capitalize`}>{status}</Badge>;
}

function normalizeProductType(value: string): ProductType {
  return value === "membership" ? "membership" : "general";
}

function statusToTone(status: string): StatusTone {
  if (status === "success" || status === "paid") return "success";
  if (status === "failed" || status === "expired") return "failed";
  if (status === "processing" || status === "pending") return "processing";
  return "pending";
}

function toneClasses(tone: StatusTone, variant: "badge" | "soft") {
  const classes = {
    success: variant === "badge" ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-green-500/10 text-green-500",
    failed: variant === "badge" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-red-500/10 text-red-500",
    processing: variant === "badge" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-blue-500/10 text-blue-500",
    pending: variant === "badge" ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-amber-500/10 text-amber-500",
  };
  return classes[tone];
}

function rupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDate(value: Date | string | null) {
  return value ? new Date(value).toLocaleString("id-ID") : "-";
}

function formatJsonText(value: string | null) {
  if (!value) return "-";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

type ProductImportRow = {
  code: string;
  name: string;
  hargaRupiah: number;
  priceUnit?: string;
  gameName?: string;
  category?: string;
  thumbnail?: string;
  instructions?: string;
  requiresZoneId?: boolean;
  productType?: "general" | "membership";
};

async function parseProductImportFile(file: File): Promise<ProductImportRow[]> {
  const text = await file.text();
  const doc = new DOMParser().parseFromString(text, "text/html");
  const rows = Array.from(doc.querySelectorAll("table tr"));

  if (!rows.length) {
    throw new Error("Format file tidak terbaca. Pastikan file berisi tabel produk.");
  }

  const headerCells = Array.from(rows[0].querySelectorAll("th,td")).map((cell) =>
    normalizeHeader(cell.textContent ?? "")
  );
  const indexes = {
    code: headerCells.indexOf("code"),
    name: headerCells.indexOf("name"),
    hargaRupiah: headerCells.indexOf("harga_rupiah"),
    priceUnit: headerCells.indexOf("price_unit"),
    gameName: findHeaderIndex(headerCells, ["game", "game_name", "nama_game"]),
    category: findHeaderIndex(headerCells, ["category", "kategori", "game_category", "jenis_game"]),
    thumbnail: findHeaderIndex(headerCells, ["thumbnail", "thumbnail_url", "image", "image_url", "icon", "icon_url"]),
    instructions: findHeaderIndex(headerCells, ["instructions", "instruksi", "cara_order", "guide"]),
    requiresZoneId: findHeaderIndex(headerCells, ["requires_zone_id", "require_zone_id", "zone_id_required", "wajib_zone_id"]),
    productType: findHeaderIndex(headerCells, ["product_type", "producttype", "type", "tipe", "jenis_produk"]),
  };

  if (indexes.code < 0 || indexes.name < 0 || indexes.hargaRupiah < 0) {
    throw new Error("Kolom wajib code, name, dan harga_rupiah tidak ditemukan.");
  }

  return rows
    .slice(1)
    .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => cleanCell(cell.textContent ?? "")))
    .map((cells) => ({
      code: cells[indexes.code] ?? "",
      name: cells[indexes.name] ?? "",
      hargaRupiah: parseImportNumber(cells[indexes.hargaRupiah] ?? ""),
      priceUnit: indexes.priceUnit >= 0 ? cells[indexes.priceUnit] : undefined,
      gameName: indexes.gameName >= 0 ? cells[indexes.gameName] : undefined,
      category: indexes.category >= 0 ? cells[indexes.category] : undefined,
      thumbnail: indexes.thumbnail >= 0 ? cells[indexes.thumbnail] : undefined,
      instructions: indexes.instructions >= 0 ? cells[indexes.instructions] : undefined,
      requiresZoneId: indexes.requiresZoneId >= 0 ? parseImportBoolean(cells[indexes.requiresZoneId]) : undefined,
      productType: indexes.productType >= 0 ? parseProductType(cells[indexes.productType]) : undefined,
    }))
    .filter((row) => row.code && row.name && Number.isFinite(row.hargaRupiah) && row.hargaRupiah > 0);
}

function parseProductType(value: string | undefined): "general" | "membership" | undefined {
  if (!value) return undefined;
  const normalized = cleanCell(value).toLowerCase();
  if (["membership", "member", "langganan"].includes(normalized)) return "membership";
  if (["general", "umum", "topup", "top up"].includes(normalized)) return "general";
  return undefined;
}

function normalizeHeader(value: string) {
  return cleanCell(value).toLowerCase().replace(/\s+/g, "_");
}

function findHeaderIndex(headers: string[], names: string[]) {
  return headers.findIndex((header) => names.includes(header));
}

function cleanCell(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseImportNumber(value: string) {
  const cleaned = cleanCell(value).replace(/[^\d,.-]/g, "");
  if (!cleaned) return Number.NaN;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }
  if (cleaned.includes(",")) {
    return Number(cleaned.replace(",", "."));
  }
  return Number(cleaned);
}

function parseImportBoolean(value: string | undefined) {
  if (!value) return undefined;
  const normalized = cleanCell(value).toLowerCase();
  if (["1", "true", "yes", "ya", "y", "wajib", "required"].includes(normalized)) return true;
  if (["0", "false", "no", "tidak", "n", "optional", "opsional"].includes(normalized)) return false;
  return undefined;
}

function downloadCsv(filename: string, rows: unknown[]) {
  if (!rows.length) {
    toast.error("Tidak ada data untuk diexport");
    return;
  }
  const objects = rows as Record<string, unknown>[];
  const headers = Object.keys(objects[0]);
  const csv = [
    headers.join(","),
    ...objects.map((row) =>
      headers
        .map((header) => JSON.stringify(row[header] ?? ""))
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
