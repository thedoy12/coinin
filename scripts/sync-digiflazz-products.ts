import { and, inArray, notInArray, sql } from "drizzle-orm";
import { games, products, providerApiLogs, transactions } from "../db/schema";
import { markup } from "../api/lib/markup";
import { getTopupServices } from "../api/lib/topup";
import { getDb } from "../api/queries/connection";
import { getPublicCatalogThumbnail, isSensitiveCatalogText } from "../api/lib/catalog-safety";

type DigiflazzPriceListItem = {
  product_name: string;
  category: string;
  brand: string;
  type: string;
  seller_name?: string;
  price: number | string;
  buyer_sku_code: string;
  buyer_product_status: boolean;
  seller_product_status: boolean;
  unlimited_stock?: boolean;
  stock?: number | string;
  multi?: boolean;
  start_cut_off?: string;
  end_cut_off?: string;
  desc?: string;
};

type NormalizedService = {
  gameName: string;
  gameSlug: string;
  category: string;
  thumbnail: string;
  providerCode: string;
  productName: string;
  productType: "general" | "membership";
  priceModal: number;
  priceSell: number;
  isActive: number;
  requiresZoneId: number;
  instructions: string;
};

const shouldApply = process.argv.includes("--apply");
const onlyActive = !process.argv.includes("--include-inactive");
const shouldPrune = !process.argv.includes("--no-prune");
const maxGameCatalogSize = 35;
const priorityGameSlugs = [
  "mobile-legends",
  "free-fire",
  "pubg-mobile",
  "genshin-impact",
  "honkai-star-rail",
  "honor-of-kings",
  "call-of-duty-mobile",
  "valorant",
  "roblox",
  "arena-of-valor",
  "league-of-legends-wild-rift",
  "efootball",
  "fc-mobile",
  "blood-strike",
  "delta-force",
  "wuthering-waves",
  "zenless-zone-zero",
  "point-blank",
  "point-blank-via-id",
];

async function main() {
  console.log(`Sync Digiflazz products (${shouldApply ? "apply" : "dry-run"})...`);

  const priceListData = await loadPriceListData();
  const services = extractServices(priceListData)
    .map(normalizeService)
    .filter((service) => (onlyActive ? service.isActive === 1 : true));
  const rows = filterCatalogRows(services);

  const uniqueGames = new Set(rows.filter(isGameCatalogService).map((row) => row.gameSlug));
  const utilityGroups = new Set(rows.filter(isAllowedUtilityService).map((row) => row.gameSlug));
  console.log(
    `Fetched ${services.length} services. Keeping ${rows.length} services from ${uniqueGames.size} games and ${utilityGroups.size} utility groups.`
  );

  if (!shouldApply) {
    console.log("Dry-run only. Run with --apply to write to database.");
    console.table(rows.slice(0, 10).map((row) => ({
      game: row.gameName,
      code: row.providerCode,
      name: row.productName,
      type: row.productType,
      modal: row.priceModal,
      sell: row.priceSell,
      active: row.isActive === 1,
    })));
    return;
  }

  const db = getDb();
  const existingGames = await db.select().from(games);
  const existingGameSlugs = new Set(existingGames.map((game) => game.slug));
  const uniqueRowsByGame = new Map<string, NormalizedService>();
  for (const row of rows) {
    if (!uniqueRowsByGame.has(row.gameSlug)) {
      uniqueRowsByGame.set(row.gameSlug, row);
    }
  }

  const gameValues = Array.from(uniqueRowsByGame.values()).map((row) => ({
    name: row.gameName,
    slug: row.gameSlug,
    category: row.category,
    thumbnail: row.thumbnail,
    requiresZoneId: row.requiresZoneId,
    isActive: 1,
    instructions: row.instructions,
  }));

  await db
    .insert(games)
    .values(gameValues)
    .onConflictDoUpdate({
      target: games.slug,
      set: {
        name: sql`excluded."name"`,
        category: sql`excluded."category"`,
        thumbnail: sql`excluded."thumbnail"`,
        requiresZoneId: sql`excluded."requiresZoneId"`,
        instructions: sql`excluded."instructions"`,
        isActive: 1,
        updatedAt: new Date(),
      },
    });

  const syncedGames = await db.select().from(games);
  const gameBySlug = new Map(syncedGames.map((game) => [game.slug, game]));

  const existingProducts = await db.select().from(products);
  const existingProductKeys = new Set(existingProducts.map((product) => `${product.gameId}:${product.providerCode}`));
  const productValues = rows.map((row) => {
    const game = gameBySlug.get(row.gameSlug);
    if (!game) {
      throw new Error(`Game not found after sync: ${row.gameSlug}`);
    }
    return {
      gameId: game.id,
      providerCode: row.providerCode,
      name: row.productName,
      productType: row.productType,
      priceModal: row.priceModal,
      priceSell: row.priceSell,
      isActive: row.isActive,
    };
  });

  for (const chunk of chunks(productValues, 500)) {
    await db
      .insert(products)
      .values(chunk)
      .onConflictDoUpdate({
        target: [products.gameId, products.providerCode],
        set: {
          name: sql`excluded."name"`,
          productType: sql`excluded."productType"`,
          priceModal: sql`excluded."priceModal"`,
          priceSell: sql`excluded."priceSell"`,
          isActive: sql`excluded."isActive"`,
          updatedAt: new Date(),
        },
      });
  }

  const productKeys = productValues.map((product) => `${product.gameId}:${product.providerCode}`);
  let productsDeleted = 0;
  let productsDeactivated = 0;
  let gamesDeleted = 0;
  let gamesDeactivated = 0;

  if (shouldPrune) {
    const pruneResult = await pruneCatalog(
      db,
      productValues.map((product) => `${product.gameId}:${product.providerCode}`),
      Array.from(uniqueRowsByGame.keys())
    );
    productsDeleted = pruneResult.productsDeleted;
    productsDeactivated = pruneResult.productsDeactivated;
    gamesDeleted = pruneResult.gamesDeleted;
    gamesDeactivated = pruneResult.gamesDeactivated;
  }

  const gamesCreated = Array.from(uniqueRowsByGame.keys()).filter((slug) => !existingGameSlugs.has(slug)).length;
  const productsCreated = productKeys.filter((key) => !existingProductKeys.has(key)).length;
  const productsUpdated = productKeys.length - productsCreated;

  console.log("Sync complete:");
  console.table({
    gamesCreated,
    productsCreated,
    productsUpdated,
    productsDeleted,
    productsDeactivated,
    gamesDeleted,
    gamesDeactivated,
    totalServices: rows.length,
  });
}

async function loadPriceListData() {
  const response = await getTopupServices();
  if (response.success) {
    return response.data;
  }

  const fallback = await getCachedPriceListData();
  if (fallback) {
    console.log("Digiflazz pricelist is rate limited. Using last successful cached response from provider_api_logs.");
    return fallback;
  }

  throw new Error(response.error || "Failed to fetch Digiflazz price list");
}

async function getCachedPriceListData() {
  const db = getDb();
  const rows = await db
    .select({ responsePayload: providerApiLogs.responsePayload })
    .from(providerApiLogs)
    .where(and(sql`${providerApiLogs.success} = 1`, sql`${providerApiLogs.provider} = 'digiflazz'`, sql`${providerApiLogs.endpoint} = '/price-list'`))
    .orderBy(sql`${providerApiLogs.createdAt} desc`)
    .limit(1);

  const payload = rows[0]?.responsePayload;
  if (!payload) return null;
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return null;
  }
}

async function pruneCatalog(
  db: ReturnType<typeof getDb>,
  allowedProductKeys: string[],
  allowedGameSlugs: string[]
) {
  const productRows = await db.select().from(products);
  const transactionRows = await db
    .select({
      productId: transactions.productId,
      gameId: transactions.gameId,
    })
    .from(transactions);
  const referencedProductIds = new Set(transactionRows.map((row) => row.productId));
  const referencedGameIds = new Set(transactionRows.map((row) => row.gameId));
  const allowedProducts = new Set(allowedProductKeys);
  const staleProductIds = productRows
    .filter((product) => !allowedProducts.has(`${product.gameId}:${product.providerCode}`))
    .map((product) => product.id);
  const staleReferencedProductIds = staleProductIds.filter((id) => referencedProductIds.has(id));
  const staleUnreferencedProductIds = staleProductIds.filter((id) => !referencedProductIds.has(id));

  if (staleReferencedProductIds.length > 0) {
    await db
      .update(products)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(inArray(products.id, staleReferencedProductIds));
  }
  if (staleUnreferencedProductIds.length > 0) {
    await db.delete(products).where(inArray(products.id, staleUnreferencedProductIds));
  }

  const gameRows = await db.select().from(games);
  const staleGameIds = gameRows
    .filter((game) => !allowedGameSlugs.includes(game.slug))
    .map((game) => game.id);
  const staleReferencedGameIds = staleGameIds.filter((id) => referencedGameIds.has(id));
  const staleUnreferencedGameIds = staleGameIds.filter((id) => !referencedGameIds.has(id));

  if (staleReferencedGameIds.length > 0) {
    await db
      .update(games)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(inArray(games.id, staleReferencedGameIds));
  }
  if (staleUnreferencedGameIds.length > 0) {
    await db.delete(games).where(inArray(games.id, staleUnreferencedGameIds));
  }

  if (allowedGameSlugs.length > 0) {
    await db
      .update(games)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(and(sql`${games.isActive} = 1`, notInArray(games.slug, allowedGameSlugs)));
  }

  return {
    productsDeleted: staleUnreferencedProductIds.length,
    productsDeactivated: staleReferencedProductIds.length,
    gamesDeleted: staleUnreferencedGameIds.length,
    gamesDeactivated: staleReferencedGameIds.length,
  };
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function extractServices(data: unknown): DigiflazzPriceListItem[] {
  const items = typeof data === "object" && data !== null && Array.isArray((data as { data?: unknown }).data)
    ? (data as { data: unknown[] }).data
    : [];
  return items.filter(isService);
}

function isService(value: unknown): value is DigiflazzPriceListItem {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Partial<DigiflazzPriceListItem>;
  return Boolean(row.product_name && row.brand && row.buyer_sku_code && row.price !== undefined);
}

function normalizeService(row: DigiflazzPriceListItem): NormalizedService {
  const gameName = normalizeGameName(row.brand, row.product_name, row.category);
  const gameSlug = normalizeSlug(gameName);
  const priceModal = Number.parseInt(String(row.price), 10);
  if (!Number.isFinite(priceModal) || priceModal <= 0) {
    throw new Error(`Invalid price for service ${row.buyer_sku_code}`);
  }

  return {
    gameName,
    gameSlug,
    category: inferCategory(gameName, row.category, row.type),
    thumbnail: buildThumbnailUrl(gameName, gameSlug),
    providerCode: row.buyer_sku_code.trim(),
    productName: normalizeName(row.product_name),
    productType: inferProductType(row),
    priceModal,
    priceSell: markup(priceModal),
    isActive: row.buyer_product_status && row.seller_product_status ? 1 : 0,
    requiresZoneId: requiresZoneId(gameName) ? 1 : 0,
    instructions: buildInstructions(gameName, inferCategory(gameName, row.category, row.type), requiresZoneId(gameName)),
  };
}

function filterCatalogRows(rows: NormalizedService[]) {
  const selectedGameSlugs = selectGameSlugs(rows);
  return rows.filter(
    (row) =>
      !isSensitiveCatalogService(row) &&
      (selectedGameSlugs.has(row.gameSlug) || isAllowedUtilityService(row))
  );
}

function selectGameSlugs(rows: NormalizedService[]) {
  const selectedSlugs: string[] = [];
  const availableGameSlugs = new Set<string>();
  const requiredGameSlugs = new Set<string>();
  const addSlug = (slug: string) => {
    if (!availableGameSlugs.has(slug) || selectedSlugs.includes(slug)) return;
    if (selectedSlugs.length >= maxGameCatalogSize) return;
    selectedSlugs.push(slug);
  };

  for (const row of rows) {
    if (!isGameCatalogService(row)) continue;
    availableGameSlugs.add(row.gameSlug);
    if (isRequiredGame(row.gameName)) {
      requiredGameSlugs.add(row.gameSlug);
    }
  }

  for (const slug of priorityGameSlugs) {
    addSlug(slug);
  }

  for (const slug of requiredGameSlugs) {
    if (selectedSlugs.includes(slug)) continue;
    if (selectedSlugs.length >= maxGameCatalogSize) {
      selectedSlugs.pop();
    }
    selectedSlugs.push(slug);
  }

  for (const row of rows) {
    if (!isGameCatalogService(row)) continue;
    addSlug(row.gameSlug);
  }

  return new Set(selectedSlugs.filter((slug) => availableGameSlugs.has(slug)));
}

function isRequiredGame(gameName: string) {
  return /point\s*blank|pointblank/i.test(gameName);
}

function isGameCatalogService(row: NormalizedService) {
  return !isSensitiveCatalogService(row) && !isAllowedUtilityService(row) && isKnownGameService(row);
}

function isAllowedUtilityService(row: NormalizedService) {
  return isPulsaService(row.gameName, row.productName) || isPlnService(row.gameName) || isWalletService(row.gameName, row.productName);
}

function isPulsaService(gameName: string, productName: string) {
  const text = `${gameName} ${productName}`;
  if (/paket data|\bdata\b|internet|kuota/i.test(text)) return false;
  return /pulsa|telkomsel|indosat|im3|xl|axis|tri|three|smartfren|by\.?u/i.test(text);
}

function isKnownGameService(row: NormalizedService) {
  if (row.category === "Voucher" || row.category === "Digital") return false;
  const text = `${row.gameName} ${row.productName}`.toLowerCase();
  if (/google play|steam|spotify|netflix|vidio|viu|token listrik|pulsa|ewallet|e-money|ovo|dana|gopay|shopeepay|voucher/.test(text)) {
    return false;
  }
  return true;
}

function isSensitiveCatalogService(row: NormalizedService) {
  return isSensitiveCatalogText(row.gameName, row.gameSlug, row.productName, row.providerCode);
}

function inferProductType(row: DigiflazzPriceListItem): "general" | "membership" {
  const text = `${row.type} ${row.product_name} ${row.desc ?? ""}`.toLowerCase();
  if (
    /membership|member|weekly|monthly|pass|subscription|langganan|welkin|battle pass|season pass|starlight|twilight|growth plan/.test(text)
  ) {
    return "membership";
  }
  return "general";
}

function buildThumbnailUrl(gameName: string, gameSlug: string) {
  const publicThumbnail = getPublicCatalogThumbnail(gameSlug);
  if (publicThumbnail) return publicThumbnail;

  const initials = gameName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  const palette = pickPalette(gameName);
  const label = encodeURIComponent(initials || gameName.slice(0, 3).toUpperCase());
  return `https://placehold.co/400x400/${palette.bg}/${palette.fg}?text=${label}`;
}

function pickPalette(value: string) {
  const palettes = [
    { bg: "0f172a", fg: "67e8f9" },
    { bg: "111827", fg: "fbbf24" },
    { bg: "18181b", fg: "f472b6" },
    { bg: "052e2b", fg: "5eead4" },
    { bg: "2e1065", fg: "c4b5fd" },
    { bg: "3b0764", fg: "f0abfc" },
    { bg: "082f49", fg: "7dd3fc" },
    { bg: "1f2937", fg: "fde68a" },
  ];
  const hash = Array.from(value).reduce((total, char) => total + char.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
}

function normalizeName(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(second|2nd)\b/gi, "")
    .replace(/\s+powered by google play\b/gi, "")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bMlbb\b/g, "MLBB")
    .replace(/\bPubg\b/g, "PUBG")
    .replace(/\bCodm\b/g, "CODM")
    .replace(/\bFf\b/g, "FF")
    .replace(/\bPln\b/g, "PLN");
}

function normalizeGameName(brand: string, productName: string, category: string) {
  const normalizedBrand = normalizeName(brand);
  const normalizedProduct = normalizeName(productName);
  const text = `${brand} ${productName} ${category}`;

  if (isPlnService(text)) return /token/i.test(text) ? "Token PLN" : "PLN";
  if (isWalletService(normalizedBrand, normalizedProduct)) {
    if (/dana/i.test(text)) return "Saldo DANA";
    if (/go\s*pay|gopay/i.test(text)) return "Saldo GoPay";
    if (/ovo/i.test(text)) return "Saldo OVO";
    if (/shopee\s*pay|shopeepay/i.test(text)) return "Saldo ShopeePay";
    return normalizedBrand;
  }
  if (isPulsaService(normalizedBrand, normalizedProduct)) {
    if (/by\.?u/i.test(text)) return "Pulsa By.U";
    if (/axis/i.test(text)) return "Pulsa Axis";
    if (/\bxl\b/i.test(text)) return "Pulsa Xl";
    if (/telkomsel/i.test(text)) return "Pulsa Telkomsel";
    if (/indosat|im3/i.test(text)) return "Pulsa Indosat";
    if (/tri|three/i.test(text)) return "Pulsa Tri";
    if (/smartfren/i.test(text)) return "Pulsa Smartfren";
    return normalizedBrand.toLowerCase().includes("pulsa") ? normalizedBrand : `Pulsa ${normalizedBrand}`;
  }

  if (/mlbb|mobile legends/i.test(text)) return "Mobile Legends";
  if (/free fire/i.test(text)) return "Free Fire";
  if (/pubg/i.test(text)) return "PUBG Mobile";
  if (/codm|call of duty/i.test(text)) return "Call of Duty Mobile";
  if (/wild rift/i.test(text)) return "League of Legends Wild Rift";
  if (/hok|honor of kings/i.test(text)) return "Honor of Kings";
  if (/fc mobile/i.test(text)) return "FC Mobile";
  if (/efootball/i.test(text)) return "eFootball";
  if (/honkai star rail/i.test(text)) return "Honkai Star Rail";
  if (/point blank/i.test(text)) return /via/i.test(text) ? "Point Blank Via ID" : "Point Blank";

  return normalizedBrand || normalizedProduct;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferCategory(gameName: string, category: string, type: string) {
  const text = `${gameName} ${category} ${type}`.toLowerCase();
  if (/voucher|gift card|wallet|google play|steam|garena/.test(text)) {
    return "Voucher";
  }
  if (/pulsa|paket data|\bdata\b|token pln|pln|e-money|ewallet|go\s*pay|\bgopay\b|\bovo\b|\bdana\b|shopee\s*pay/.test(text)) {
    return "Digital";
  }
  if (/mobile legends|arena of valor|wild rift|honor of kings/.test(text)) {
    return "MOBA";
  }
  if (/free fire|pubg|blood strike|farlight|sausage/.test(text)) {
    return "Battle Royale";
  }
  if (/valorant|call of duty|point blank|delta force/.test(text)) {
    return "FPS";
  }
  if (/genshin|honkai|zenless|wuthering|ragnarok|dragon|tower of fantasy/.test(text)) {
    return "RPG";
  }
  return "Top Up";
}

function requiresZoneId(gameName: string) {
  return /mobile legends|genshin|honkai|wuthering|tower of fantasy/i.test(gameName);
}

function buildInstructions(gameName: string, category: string, zoneRequired: boolean) {
  if (isPlnService(gameName)) {
    return `Masukkan nomor meter / ID pelanggan ${gameName} dengan benar.`;
  }
  if (isPhoneService(gameName)) {
    return `Masukkan nomor handphone tujuan ${gameName} dengan benar.`;
  }
  if (isWalletService(gameName, gameName)) {
    return `Masukkan nomor handphone / akun tujuan ${gameName} dengan benar.`;
  }
  if (isVoucherService(gameName, category)) {
    return `Masukkan nomor handphone / email penerima jika diminta untuk ${gameName}.`;
  }
  if (zoneRequired) {
    return `Masukkan User ID dan Zone ID / Server ${gameName} dengan benar.`;
  }
  return `Masukkan User ID ${gameName} dengan benar.`;
}

function isPhoneService(gameName: string) {
  return /pulsa|paket data|\bdata\b|by\.?u|axis|xl|telkomsel|indosat|tri|three|smartfren/i.test(gameName);
}

function isPlnService(gameName: string) {
  return /pln|token listrik/i.test(gameName);
}

function isWalletService(gameName: string, productName: string) {
  return /\bdana\b|go\s*pay|\bgopay\b|\bovo\b|shopee\s*pay|shopeepay|e-money/i.test(`${gameName} ${productName}`);
}

function isVoucherService(gameName: string, category: string) {
  return category === "Voucher" || /voucher|wallet|steam|garena|google play/i.test(gameName);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
