import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { runAdminAction, useAdminAction } from "@/lib/admin-actions";
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
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

type StatusTone = "success" | "failed" | "processing" | "pending";
type ProductType = "general" | "membership";
type CleanupTarget = "staleTransactions" | "providerApiLogs" | "auditLogs" | "inactiveUsers";

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

const emptyPopupForm = {
  isActive: false,
  title: "Promo CoinIn",
  description: "Top up game favorit kamu lebih cepat dengan pembayaran praktis.",
  imageUrl: "",
  buttonText: "Top Up Sekarang",
  buttonUrl: "#game-store",
  displayDelayMs: "1200",
};

const cleanupTargets: Array<{
  value: CleanupTarget;
  label: string;
  detail: string;
}> = [
  {
    value: "staleTransactions",
    label: "Transaksi gagal/kadaluarsa",
    detail: "Menghapus transaksi lama yang failed, expired, failed payment, atau unpaid.",
  },
  {
    value: "providerApiLogs",
    label: "Log API provider",
    detail: "Menghapus log request/response provider pembayaran dan top-up yang sudah lama.",
  },
  {
    value: "auditLogs",
    label: "Audit log",
    detail: "Menghapus audit log lama, lalu menyimpan log baru untuk aksi cleanup ini.",
  },
  {
    value: "inactiveUsers",
    label: "User non-admin tidak aktif",
    detail: "Menghapus akun user biasa yang lama tidak login. Admin tidak ikut dihapus.",
  },
];

type AdminTab = "overview" | "transactions" | "products" | "games" | "accounts" | "customers" | "popup" | "system";

const adminTabs: Array<{ value: AdminTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "transactions", label: "Transaksi" },
  { value: "products", label: "Produk" },
  { value: "games", label: "Game" },
  { value: "accounts", label: "Akun" },
  { value: "customers", label: "Pembeli" },
  { value: "popup", label: "Popup" },
  { value: "system", label: "Sistem" },
];

const PAGE_SIZE = 25;

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
  const [popupDraft, setPopupDraft] = useState<typeof emptyPopupForm | null>(null);
  const [productImportFile, setProductImportFile] = useState<File | null>(null);
  const [productImportCount, setProductImportCount] = useState<number | null>(null);
  const [isImportingProducts, setIsImportingProducts] = useState(false);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [apiLogSearch, setApiLogSearch] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [transactionPage, setTransactionPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);
  const [accountPage, setAccountPage] = useState(1);
  const [gamePage, setGamePage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [apiLogPage, setApiLogPage] = useState(1);
  const [cleanupForm, setCleanupForm] = useState({
    target: "staleTransactions" as CleanupTarget,
    olderThanDays: "30",
    password: "",
    confirmation: "",
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      toast.error("Akses ditolak. Halaman ini hanya untuk admin.");
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const enabled = !authLoading && !!user && user.role === "admin";
  const statsQuery = trpc.admin.stats.useQuery(undefined, { enabled });
  const transactionsQuery = trpc.admin.allTransactions.useQuery(
    { page: transactionPage, pageSize: PAGE_SIZE, search: transactionSearch },
    { enabled: enabled && ["overview", "transactions"].includes(activeTab) }
  );
  const customersQuery = trpc.admin.customers.useQuery(
    { page: customerPage, pageSize: PAGE_SIZE },
    { enabled: enabled && ["overview", "customers"].includes(activeTab) }
  );
  const usersQuery = trpc.admin.users.useQuery(
    { page: accountPage, pageSize: PAGE_SIZE },
    { enabled: enabled && ["overview", "accounts"].includes(activeTab) }
  );
  const catalogQuery = trpc.admin.catalog.useQuery(
    { page: productPage, pageSize: PAGE_SIZE, search: productSearch },
    { enabled: enabled && activeTab === "products" }
  );
  const gamesQuery = trpc.admin.games.useQuery(
    { page: gamePage, pageSize: PAGE_SIZE },
    { enabled: enabled && ["games", "products"].includes(activeTab) }
  );
  const gameOptionsQuery = trpc.admin.games.useQuery(
    { page: 1, pageSize: 500 },
    { enabled: enabled && activeTab === "products" }
  );
  const auditQuery = trpc.admin.auditLogs.useQuery(
    { page: auditPage, pageSize: PAGE_SIZE },
    { enabled: enabled && activeTab === "system" }
  );
  const providerApiLogsQuery = trpc.admin.providerApiLogs.useQuery(
    { page: apiLogPage, pageSize: PAGE_SIZE, search: apiLogSearch },
    { enabled: enabled && activeTab === "system" }
  );
  const popupSettingsQuery = trpc.admin.popupSettings.useQuery(undefined, {
    enabled: enabled && activeTab === "popup",
    refetchOnWindowFocus: false,
  });

  const popupSettings = popupSettingsQuery.data;
  const popupForm =
    popupDraft ??
    (popupSettings
    ? {
      isActive: popupSettings.isActive === 1,
      title: popupSettings.title,
      description: popupSettings.description,
      imageUrl: popupSettings.imageUrl ?? "",
      buttonText: popupSettings.buttonText,
      buttonUrl: popupSettings.buttonUrl,
      displayDelayMs: popupSettings.displayDelayMs.toString(),
    }
    : emptyPopupForm);

  const refreshAll = () => {
    statsQuery.refetch();
    transactionsQuery.refetch();
    customersQuery.refetch();
    usersQuery.refetch();
    catalogQuery.refetch();
    gamesQuery.refetch();
    auditQuery.refetch();
    providerApiLogsQuery.refetch();
    popupSettingsQuery.refetch();
  };

  const onAdminActionError = (error: Error) => toast.error(error.message);

  const updateStatus = useAdminAction<{ referenceId: string; status: "success" | "failed" }>({
    action: "updateStatus",
    onSuccess: () => {
      toast.success("Status transaksi diperbarui");
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const syncPayment = useAdminAction<{ referenceId: string }>({
    action: "syncPayment",
    onSuccess: () => {
      toast.success("Status payment disinkronkan");
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const retryTopup = useAdminAction<{ referenceId: string }>({
    action: "retryTopup",
    onSuccess: () => {
      toast.success("Top-up diproses ulang");
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const expireOld = useAdminAction<void, { count: number }>({
    action: "expireOld",
    onSuccess: (result) => {
      toast.success(`${result.count} transaksi kadaluarsa diperbarui`);
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const syncTopups = useAdminAction<void, { count: number }>({
    action: "syncTopups",
    onSuccess: (result) => {
      toast.success(`${result.count} top-up processing disinkronkan`);
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const syncCatalog = useAdminAction<void, { totalRows: number }>({
    action: "syncCatalog",
    onSuccess: (result) => {
      toast.success(`Katalog provider disinkronkan: ${result.totalRows} produk aktif`);
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const updateUserRole = useAdminAction<{ userId: number; role: "admin" | "user" }>({
    action: "updateUserRole",
    onSuccess: () => {
      toast.success("Role akun diperbarui");
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const resetUserPassword = useAdminAction<{ userId: number; password: string }>({
    action: "resetUserPassword",
    onSuccess: () => {
      toast.success("Password akun berhasil direset");
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const updateProduct = useAdminAction<{
    productId: number;
    priceModal?: number;
    priceSell?: number;
    providerCode?: string;
    productType?: ProductType;
    isActive?: boolean;
  }>({
    action: "updateProduct",
    onSuccess: () => {
      toast.success("Produk diperbarui");
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const createProduct = useAdminAction<{
    gameId: number;
    name: string;
    providerCode: string;
    productType: ProductType;
    priceModal: number;
    priceSell: number;
    isActive: boolean;
  }>({
    action: "createProduct",
    onSuccess: () => {
      toast.success("Produk baru ditambahkan");
      setProductForm(emptyProductForm);
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const createGame = useAdminAction<typeof emptyGameForm>({
    action: "createGame",
    onSuccess: () => {
      toast.success("Game baru ditambahkan");
      setGameForm(emptyGameForm);
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const updateGame = useAdminAction<{
    gameId: number;
    name?: string;
    slug?: string;
    thumbnail?: string;
    category?: string;
    instructions?: string;
    requiresZoneId?: boolean;
    isActive?: boolean;
  }>({
    action: "updateGame",
    onSuccess: () => {
      toast.success("Game diperbarui");
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const updatePopupSettings = useAdminAction<{
    isActive: boolean;
    title: string;
    description: string;
    imageUrl?: string;
    buttonText: string;
    buttonUrl: string;
    displayDelayMs: number;
  }>({
    action: "updatePopupSettings",
    onSuccess: () => {
      setPopupDraft(null);
      toast.success("Setting popup disimpan");
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const cleanupDatabase = useAdminAction<{ target: CleanupTarget; olderThanDays: number; password: string; confirmation: string }, { deleted: number }>({
    action: "cleanupDatabase",
    onSuccess: (result) => {
      toast.success(`${result.deleted} data berhasil dihapus`);
      setCleanupForm((current) => ({
        ...current,
        password: "",
        confirmation: "",
      }));
      refreshAll();
    },
    onError: onAdminActionError,
  });

  const totals = useMemo(() => {
    const txs = transactionsQuery.data?.rows ?? [];
    return {
      unpaid: txs.filter((tx) => tx.paymentStatus === "unpaid").length,
      failedTopup: txs.filter((tx) => tx.topupStatus === "failed").length,
      customers: customersQuery.data?.total ?? 0,
      accounts: usersQuery.data?.total ?? 0,
    };
  }, [customersQuery.data, transactionsQuery.data, usersQuery.data]);

  useEffect(() => setTransactionPage(1), [transactionSearch]);
  useEffect(() => setProductPage(1), [productSearch]);
  useEffect(() => setApiLogPage(1), [apiLogSearch]);

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
  const transactions = transactionsQuery.data?.rows ?? [];
  const customers = customersQuery.data?.rows ?? [];
  const accounts = usersQuery.data?.rows ?? [];
  const catalog = catalogQuery.data?.rows ?? [];
  const games = gamesQuery.data?.rows ?? [];
  const gameOptions = gameOptionsQuery.data?.rows ?? [];
  const auditLogs = auditQuery.data?.rows ?? [];
  const providerApiLogs = providerApiLogsQuery.data?.rows ?? [];
  const transactionTotal = transactionsQuery.data?.total ?? 0;
  const customerTotal = customersQuery.data?.total ?? 0;
  const accountTotal = usersQuery.data?.total ?? 0;
  const gameTotal = gamesQuery.data?.total ?? 0;
  const catalogTotal = catalogQuery.data?.total ?? 0;
  const auditTotal = auditQuery.data?.total ?? 0;
  const apiLogTotal = providerApiLogsQuery.data?.total ?? 0;
  const transactionPages = Math.max(1, Math.ceil(transactionTotal / PAGE_SIZE));
  const customerPages = Math.max(1, Math.ceil(customerTotal / PAGE_SIZE));
  const accountPages = Math.max(1, Math.ceil(accountTotal / PAGE_SIZE));
  const gamePages = Math.max(1, Math.ceil(gameTotal / PAGE_SIZE));
  const catalogPages = Math.max(1, Math.ceil(catalogTotal / PAGE_SIZE));
  const auditPages = Math.max(1, Math.ceil(auditTotal / PAGE_SIZE));
  const apiLogPages = Math.max(1, Math.ceil(apiLogTotal / PAGE_SIZE));

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
      setIsImportingProducts(true);
      const total: ImportProductsResult = { created: 0, updated: 0, skipped: [], gamesCreated: 0 };
      const chunks = chunkProductImportRows(rows);

      for (const chunk of chunks) {
        const result = await runAdminAction<{ rows: ProductImportRow[] }, ImportProductsResult>("importProducts", { rows: chunk });
        total.created += result.created;
        total.updated += result.updated;
        total.skipped.push(...result.skipped);
        total.gamesCreated += result.gamesCreated ?? 0;
      }

      const skippedText = total.skipped.length ? `, ${total.skipped.length} dilewati` : "";
      const gamesText = total.gamesCreated ? `, ${total.gamesCreated} game baru` : "";
      toast.success(`Import selesai: ${total.created} produk baru, ${total.updated} diperbarui${gamesText}${skippedText}`);
      setProductImportFile(null);
      setProductImportCount(null);
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "File produk tidak bisa dibaca");
    } finally {
      setIsImportingProducts(false);
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

  const cleanupSubmit = () => {
    const olderThanDays = Number(cleanupForm.olderThanDays);
    if (!Number.isInteger(olderThanDays) || olderThanDays < 1 || olderThanDays > 3650) {
      toast.error("Umur data harus 1 sampai 3650 hari");
      return;
    }
    if (!cleanupForm.password) {
      toast.error("Masukkan password admin");
      return;
    }
    if (cleanupForm.confirmation !== "HAPUS") {
      toast.error("Ketik HAPUS untuk konfirmasi");
      return;
    }

    cleanupDatabase.mutate({
      target: cleanupForm.target,
      olderThanDays,
      password: cleanupForm.password,
      confirmation: cleanupForm.confirmation,
    });
  };

  const savePopupSettings = () => {
    const displayDelayMs = Number(popupForm.displayDelayMs);
    if (!Number.isInteger(displayDelayMs) || displayDelayMs < 0 || displayDelayMs > 10000) {
      toast.error("Delay popup harus 0 sampai 10000 ms");
      return;
    }
    if (!popupForm.title.trim()) {
      toast.error("Judul popup wajib diisi");
      return;
    }

    updatePopupSettings.mutate({
      isActive: popupForm.isActive,
      title: popupForm.title,
      description: popupForm.description,
      imageUrl: popupForm.imageUrl || undefined,
      buttonText: popupForm.buttonText,
      buttonUrl: popupForm.buttonUrl,
      displayDelayMs,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <Link to="/">
            <Button variant="ghost" size="sm" className="shrink-0 text-slate-400 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white sm:text-2xl">Owner Console</h1>
            <p className="text-sm leading-6 text-slate-500">CoinIn operations, buyer data, game catalog, and transaction control.</p>
          </div>
        </div>
        <div className="flex justify-start lg:justify-end">
          <Button variant="outline" size="sm" onClick={refreshAll} className="justify-center border-slate-700 text-slate-300 hover:bg-slate-800">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)} className="gap-6">
        <div className="grid grid-cols-3 gap-2 md:hidden">
          {(["overview", "transactions", "games"] as AdminTab[]).map((tab) => (
            <Button
              key={tab}
              type="button"
              variant={activeTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "justify-center bg-cyan-300 text-slate-950 hover:bg-cyan-200" : "justify-center border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"}
            >
              {adminTabs.find((item) => item.value === tab)?.label}
            </Button>
          ))}
        </div>
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)}>
            <SelectTrigger className="w-full border-slate-800 bg-slate-900 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {adminTabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="hidden md:block">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-slate-900 border border-slate-800 p-1">
            {adminTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="shrink-0 text-slate-200 data-[state=inactive]:text-slate-200 data-[state=inactive]:hover:text-white"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

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
                rows={transactions}
                onSync={(referenceId) => syncPayment.mutate({ referenceId })}
                onRetry={(referenceId) => retryTopup.mutate({ referenceId })}
                onStatus={(referenceId, status) => updateStatus.mutate({ referenceId, status })}
                showCustomer
              />
              <PaginationControls page={transactionPage} totalPages={transactionPages} totalRows={transactionTotal} onPageChange={setTransactionPage} />
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
              <div className="grid gap-3 md:hidden">
                {customers.map((customer, index) => (
                  <div key={`${customer.customerEmail}-${customer.customerPhone}-${index}`} className="rounded-md border border-slate-800 bg-slate-950 p-4">
                    <p className="font-bold text-white">{customer.customerName || "Pembeli"}</p>
                    <p className="mt-1 break-all text-sm text-slate-400">{customer.customerEmail || "-"}</p>
                    <p className="text-sm text-slate-400">{customer.customerPhone || "-"}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <InfoLine label="Order" value={customer.totalOrders.toString()} />
                      <InfoLine label="Total Paid" value={rupiah(customer.totalSpent)} tone="money" />
                      <InfoLine label="Order Terakhir" value={formatDate(customer.lastOrderAt)} wide />
                    </div>
                  </div>
                ))}
                {!customers.length && <p className="py-6 text-center text-slate-500">Belum ada pembeli</p>}
              </div>
              <div className="hidden overflow-x-auto md:block">
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
              <PaginationControls page={customerPage} totalPages={customerPages} totalRows={customerTotal} onPageChange={setCustomerPage} />
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
              <PaginationControls page={accountPage} totalPages={accountPages} totalRows={accountTotal} onPageChange={setAccountPage} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="games" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-white">Tambah Game</CardTitle>
              <Link to="/admin/thumbnails">
                <Button size="sm" variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 sm:w-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  Thumbnail
                </Button>
              </Link>
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
              <div className="grid gap-3 md:hidden">
                {games.map((game) => (
                  <div key={game.id} className="rounded-md border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-white">{game.name}</p>
                        <p className="break-all font-mono text-xs text-slate-500">{game.slug}</p>
                        <p className="mt-1 text-sm text-slate-400">{game.category || "-"}</p>
                      </div>
                      <StatusBadge status={game.isActive ? "success" : "failed"} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" className="border-slate-700 text-slate-300" onClick={() => updateGame.mutate({ gameId: game.id, requiresZoneId: game.requiresZoneId !== 1 })}>
                        {game.requiresZoneId ? "Zone Wajib" : "Zone Opsional"}
                      </Button>
                      <Button size="sm" variant="outline" className={game.isActive ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"} onClick={() => updateGame.mutate({ gameId: game.id, isActive: game.isActive !== 1 })}>
                        {game.isActive ? "Aktif" : "Nonaktif"}
                      </Button>
                    </div>
                  </div>
                ))}
                {!games.length && <p className="py-6 text-center text-slate-500">Belum ada game</p>}
              </div>
              <div className="hidden overflow-x-auto md:block">
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
              <PaginationControls page={gamePage} totalPages={gamePages} totalRows={gameTotal} onPageChange={setGamePage} />
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
                disabled={isImportingProducts}
                onClick={importProductsSubmit}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isImportingProducts ? "Mengimport..." : "Import"}
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
                    {gameOptions.map((game) => <SelectItem key={game.id} value={game.id.toString()}>{game.name}</SelectItem>)}
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
              <ProductTable rows={catalog} onUpdate={updateProduct.mutate} />
              <PaginationControls page={productPage} totalPages={catalogPages} totalRows={catalogTotal} onPageChange={setProductPage} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="popup">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-300" />
                Popup Landing Page
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={popupForm.isActive ? "default" : "outline"}
                  onClick={() => setPopupDraft({ ...popupForm, isActive: !popupForm.isActive })}
                >
                  {popupForm.isActive ? "Popup Aktif" : "Popup Nonaktif"}
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Judul">
                  <Input
                    value={popupForm.title}
                    onChange={(event) => setPopupDraft({ ...popupForm, title: event.target.value })}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </Field>
                <Field label="Delay tampil (ms)">
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    value={popupForm.displayDelayMs}
                    onChange={(event) => setPopupDraft({ ...popupForm, displayDelayMs: event.target.value })}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Deskripsi">
                    <Textarea
                      value={popupForm.description}
                      onChange={(event) => setPopupDraft({ ...popupForm, description: event.target.value })}
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="URL Gambar">
                    <Input
                      value={popupForm.imageUrl}
                      onChange={(event) => setPopupDraft({ ...popupForm, imageUrl: event.target.value })}
                      placeholder="/promo.jpg atau https://..."
                      className="bg-slate-950 border-slate-700 text-white"
                    />
                  </Field>
                </div>
                <Field label="Teks Tombol">
                  <Input
                    value={popupForm.buttonText}
                    onChange={(event) => setPopupDraft({ ...popupForm, buttonText: event.target.value })}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </Field>
                <Field label="URL Tombol">
                  <Input
                    value={popupForm.buttonUrl}
                    onChange={(event) => setPopupDraft({ ...popupForm, buttonUrl: event.target.value })}
                    placeholder="#game-store atau /games"
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </Field>
              </div>

              <div className="overflow-hidden rounded-md border border-cyan-300/20 bg-slate-950">
                {popupForm.imageUrl && (
                  <div className="aspect-[16/9] bg-slate-900">
                    <img src={popupForm.imageUrl} alt={popupForm.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-200">Preview</p>
                  <h3 className="mt-2 text-2xl font-black uppercase italic text-white">{popupForm.title || "Judul Popup"}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{popupForm.description || "Deskripsi popup akan tampil di sini."}</p>
                  <Button className="mt-4 rounded-none bg-cyan-300 font-black uppercase text-slate-950 hover:bg-cyan-200">
                    {popupForm.buttonText || "Tombol"}
                  </Button>
                </div>
              </div>

              <Button
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                disabled={updatePopupSettings.isPending}
                onClick={savePopupSettings}
              >
                {updatePopupSettings.isPending ? "Menyimpan..." : "Simpan Popup"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Operasi Rutin</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" onClick={() => expireOld.mutate()} className="justify-center border-slate-700 text-slate-300 hover:bg-slate-800">
                <Clock className="w-4 h-4 mr-2" />
                Expire Lama
              </Button>
              <Button variant="outline" onClick={() => syncTopups.mutate()} className="justify-center border-slate-700 text-slate-300 hover:bg-slate-800">
                <RotateCcw className="w-4 h-4 mr-2" />
                Sync Top-up
              </Button>
              <Button variant="outline" onClick={() => syncCatalog.mutate()} className="justify-center border-slate-700 text-slate-300 hover:bg-slate-800">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Catalog
              </Button>
              <Button variant="outline" onClick={refreshAll} className="justify-center border-slate-700 text-slate-300 hover:bg-slate-800">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardContent>
          </Card>

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
              <PaginationControls page={auditPage} totalPages={auditPages} totalRows={auditTotal} onPageChange={setAuditPage} />
            </CardContent>
          </Card>

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
              <ProviderApiLogTable rows={providerApiLogs} />
              <PaginationControls page={apiLogPage} totalPages={apiLogPages} totalRows={apiLogTotal} onPageChange={setApiLogPage} />
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                Cleanup Database
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Data yang dihapus">
                  <Select
                    value={cleanupForm.target}
                    onValueChange={(value) => setCleanupForm({ ...cleanupForm, target: value as CleanupTarget })}
                  >
                    <SelectTrigger className="w-full bg-slate-950 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cleanupTargets.map((target) => (
                        <SelectItem key={target.value} value={target.value}>
                          {target.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Lebih lama dari">
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={cleanupForm.olderThanDays}
                    onChange={(event) => setCleanupForm({ ...cleanupForm, olderThanDays: event.target.value })}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </Field>
                <Field label="Password admin">
                  <Input
                    type="password"
                    value={cleanupForm.password}
                    onChange={(event) => setCleanupForm({ ...cleanupForm, password: event.target.value })}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </Field>
              </div>

              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4">
                <p className="text-sm text-red-200">
                  {cleanupTargets.find((target) => target.value === cleanupForm.target)?.detail}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <Field label="Konfirmasi">
                    <Input
                      value={cleanupForm.confirmation}
                      onChange={(event) => setCleanupForm({ ...cleanupForm, confirmation: event.target.value })}
                      placeholder="Ketik HAPUS"
                      className="bg-slate-950 border-red-500/30 text-white"
                    />
                  </Field>
                  <Button
                    className="bg-red-500 text-white hover:bg-red-600"
                    disabled={cleanupDatabase.isPending}
                    onClick={cleanupSubmit}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {cleanupDatabase.isPending ? "Menghapus..." : "Hapus Data"}
                  </Button>
                </div>
              </div>
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

type OperationStatus = {
  label: string;
  tone: StatusTone;
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
    <div>
      <div className="grid gap-3 lg:hidden">
        {rows.map((tx) => (
          <div key={tx.referenceId} className="rounded-md border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs text-cyan-200">{tx.referenceId}</p>
                <p className="mt-1 font-bold text-white">{tx.gameName}</p>
                <p className="text-sm text-slate-400">{tx.productName}</p>
              </div>
              <OperationBadge status={resolveOperationStatus(tx)} />
            </div>
            {showCustomer && (
              <div className="mt-3 rounded-md border border-slate-800 bg-slate-900/60 p-3 text-sm">
                <p className="text-white">{tx.customerName || "-"}</p>
                <p className="break-all text-xs text-slate-500">{tx.customerEmail || tx.customerPhone || "-"}</p>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <InfoLine label="Tujuan" value={tx.zoneId ? `${tx.userIdGame} (${tx.zoneId})` : tx.userIdGame} />
              <InfoLine label="Total" value={rupiah(tx.price)} tone="money" />
              {showCustomer && <InfoLine label="Profit" value={rupiah(tx.profit ?? 0)} tone="success" />}
              <InfoLine label="Status" value={<StatusBadge status={tx.status} />} />
              <InfoLine label="Payment" value={<StatusBadge status={tx.paymentStatus} />} />
              <InfoLine label="Top-up" value={<StatusBadge status={tx.topupStatus || "-"} />} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-300" onClick={() => onSync(tx.referenceId)}>Sync</Button>
              <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300" onClick={() => onRetry(tx.referenceId)}>Retry</Button>
              <Button size="sm" variant="outline" className="border-green-500/30 text-green-300" onClick={() => onStatus(tx.referenceId, "success")}>Success</Button>
              <Button size="sm" variant="outline" className="border-red-500/30 text-red-300" onClick={() => onStatus(tx.referenceId, "failed")}>Failed</Button>
            </div>
          </div>
        ))}
        {!rows.length && <p className="py-8 text-center text-slate-500">Belum ada transaksi</p>}
      </div>
      <div className="hidden overflow-x-auto lg:block">
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
            <TableHead className="text-slate-400">Alur</TableHead>
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
              <TableCell><OperationBadge status={resolveOperationStatus(tx)} /></TableCell>
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
              <TableCell colSpan={showCustomer ? 12 : 10} className="text-center text-slate-500 py-8">Belum ada transaksi</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
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
    <div>
      <div className="grid gap-3 lg:hidden">
        {rows.map((log) => (
          <div key={log.id} className="rounded-md border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{log.method} {log.endpoint}</p>
                <p className="break-all font-mono text-xs text-slate-500">{log.referenceId || "-"}</p>
                <p className="text-xs text-slate-500">{formatDate(log.createdAt)}</p>
              </div>
              <StatusBadge status={log.success ? "success" : "failed"} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <InfoLine label="Provider" value={log.provider} />
              <InfoLine label="Durasi" value={`${log.durationMs}ms`} />
              <InfoLine label="HTTP" value={log.statusCode?.toString() || "-"} />
            </div>
            <div className="mt-4">
              <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-300" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                {expandedId === log.id ? "Tutup Detail" : "Lihat Detail"}
              </Button>
              {expandedId === log.id && (
                <div className="mt-3 grid gap-3 text-xs">
                  <PayloadBlock title="Request" value={log.requestPayload} />
                  <PayloadBlock title={log.success ? "Response" : "Error Response"} value={log.responsePayload || log.error} />
                </div>
              )}
            </div>
          </div>
        ))}
        {!rows.length && <p className="py-8 text-center text-slate-500">Belum ada log API provider</p>}
      </div>
      <div className="hidden overflow-x-auto lg:block">
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
                Belum ada log API provider. Log akan muncul setelah order paid dikirim ke provider top-up.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
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
    <div>
      <div className="grid gap-3 lg:hidden">
        {rows.map((account) => (
          <div key={account.id} className="rounded-md border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-white">{account.name || account.username || `User #${account.id}`}</p>
                <p className="break-all text-xs text-slate-500">{account.username || "-"}</p>
                <p className="break-all text-sm text-slate-400">{account.email || "-"}</p>
              </div>
              <Badge className="border-slate-700 bg-slate-950 text-slate-300">{account.authProvider}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <InfoLine label="Daftar" value={formatDate(account.createdAt)} />
              <InfoLine label="Login Terakhir" value={formatDate(account.lastSignInAt)} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr]">
              <Select value={account.role} onValueChange={(value) => onRole(account.id, value as "user" | "admin")}>
                <SelectTrigger className="h-9 bg-slate-950 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {editingId === account.id ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password baru"
                    className="h-9 bg-slate-950 border-slate-700 text-white"
                  />
                  <Button size="sm" className="h-9 bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200" onClick={() => submitPassword(account.id)}>
                    Simpan
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 text-slate-400" onClick={() => { setEditingId(null); setPassword(""); }}>
                    Batal
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="h-9 border-amber-500/30 text-amber-300" onClick={() => setEditingId(account.id)}>
                  Reset Password
                </Button>
              )}
            </div>
          </div>
        ))}
        {!rows.length && <p className="py-8 text-center text-slate-500">Belum ada akun terdaftar</p>}
      </div>
      <div className="hidden overflow-x-auto lg:block">
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
    <div>
      <div className="grid gap-3 lg:hidden">
        {rows.map((product) => (
          <div key={product.id} className="rounded-md border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-cyan-200">{product.gameName}</p>
                <p className="mt-1 font-bold text-white">{product.name}</p>
              </div>
              <StatusBadge status={product.isActive ? "success" : "failed"} />
            </div>
            {editingId === product.id ? (
              <div className="mt-4 grid gap-3">
                <Field label="Provider">
                  <Input value={draft.providerCode} onChange={(event) => setDraft({ ...draft, providerCode: event.target.value })} className="bg-slate-950 border-slate-700 text-white" />
                </Field>
                <Field label="Tipe">
                  <Select value={draft.productType} onValueChange={(value) => setDraft({ ...draft, productType: value as ProductType })}>
                    <SelectTrigger className="bg-slate-950 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="membership">Membership</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Modal">
                    <Input type="number" value={draft.priceModal} onChange={(event) => setDraft({ ...draft, priceModal: event.target.value })} className="bg-slate-950 border-slate-700 text-white" />
                  </Field>
                  <Field label="Jual">
                    <Input type="number" value={draft.priceSell} onChange={(event) => setDraft({ ...draft, priceSell: event.target.value })} className="bg-slate-950 border-slate-700 text-white" />
                  </Field>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <InfoLine label="Provider" value={product.providerCode} />
                <InfoLine label="Tipe" value={product.productType} />
                <InfoLine label="Modal" value={rupiah(product.priceModal)} />
                <InfoLine label="Jual" value={rupiah(product.priceSell)} tone="money" />
                <InfoLine label="Margin" value={rupiah(product.priceSell - product.priceModal)} tone="success" />
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Button size="sm" variant="outline" className={product.isActive ? "border-green-500/30 text-green-300" : "border-red-500/30 text-red-300"} onClick={() => onUpdate({ productId: product.id, isActive: product.isActive !== 1 })}>
                {product.isActive ? "Aktif" : "Nonaktif"}
              </Button>
              {editingId === product.id ? (
                <>
                  <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-300" onClick={() => saveEdit(product)}>Simpan</Button>
                  <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setEditingId(null)}>Batal</Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300" onClick={() => startEdit(product)}>
                  Edit
                </Button>
              )}
            </div>
          </div>
        ))}
        {!rows.length && <p className="py-8 text-center text-slate-500">Belum ada produk</p>}
      </div>
      <div className="hidden overflow-x-auto lg:block">
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

function InfoLine({
  label,
  value,
  tone,
  wide = false,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "money" | "success";
  wide?: boolean;
}) {
  const valueClass = tone === "money" ? "text-amber-300" : tone === "success" ? "text-green-300" : "text-slate-200";
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <div className={`mt-1 break-words text-sm font-medium ${valueClass}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <Badge className={`${toneClasses(statusToTone(status), "badge")} text-xs capitalize`}>{status}</Badge>;
}

function OperationBadge({ status }: { status: OperationStatus }) {
  return <Badge className={`${toneClasses(status.tone, "badge")} text-xs`}>{status.label}</Badge>;
}

function normalizeProductType(value: string): ProductType {
  return value === "membership" ? "membership" : "general";
}

function resolveOperationStatus(tx: TransactionRow): OperationStatus {
  if (tx.status === "success" || tx.topupStatus === "success") {
    return { label: "Sukses", tone: "success" };
  }

  if (tx.paymentStatus === "failed") {
    return { label: "Gagal Payment", tone: "failed" };
  }

  if (tx.paymentStatus === "expired") {
    return { label: "Payment Expired", tone: "failed" };
  }

  if (tx.paymentStatus === "unpaid") {
    return { label: "Belum Bayar", tone: "pending" };
  }

  if (tx.paymentStatus === "pending") {
    return { label: "Menunggu Payment", tone: "processing" };
  }

  if (tx.paymentStatus === "paid" && tx.topupStatus === "processing") {
    return { label: "Diproses Provider", tone: "processing" };
  }

  if (tx.paymentStatus === "paid" && tx.status === "failed") {
    return { label: "Gagal Top-up", tone: "failed" };
  }

  if (tx.paymentStatus === "paid" && (!tx.topupStatus || tx.topupStatus === "pending")) {
    return { label: "Siap Kirim", tone: "pending" };
  }

  if (tx.paymentStatus === "paid") {
    return { label: "Payment Masuk", tone: "success" };
  }

  if (tx.status === "processing") {
    return { label: "Order Diproses", tone: "processing" };
  }

  if (tx.status === "failed") {
    return { label: "Order Gagal", tone: "failed" };
  }

  return { label: "Menunggu", tone: "pending" };
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

function PaginationControls({
  page,
  totalPages,
  totalRows,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalRows: number;
  onPageChange: (page: number) => void;
}) {
  if (totalRows <= PAGE_SIZE) return null;
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, totalRows);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Menampilkan {start}-{end} dari {totalRows}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-slate-700 text-slate-300"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Sebelumnya
        </Button>
        <span className="min-w-20 text-center text-xs font-semibold text-slate-500">
          {safePage}/{totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-700 text-slate-300"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
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

type ImportProductsResult = {
  created: number;
  updated: number;
  skipped: unknown[];
  gamesCreated: number;
};

const importHeaderBudget = 6_000;

function chunkProductImportRows(rows: ProductImportRow[]) {
  const chunks: ProductImportRow[][] = [];
  let current: ProductImportRow[] = [];

  for (const row of rows) {
    const next = [...current, row];
    const encodedLength = encodeURIComponent(JSON.stringify({ rows: next })).length;
    if (current.length && encodedLength > importHeaderBudget) {
      chunks.push(current);
      current = [row];
    } else {
      current = next;
    }
  }

  if (current.length) chunks.push(current);
  return chunks;
}

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
