import { sql } from "drizzle-orm";
import { games, products } from "../db/schema";
import { markup } from "../api/lib/markup";
import { getTopupServices } from "../api/lib/topup";
import { getDb } from "../api/queries/connection";

type HataMarketService = {
  id: string;
  game: string;
  nama_layanan: string;
  harga: string;
  kode: string;
  type: string;
  status: string;
};

type NormalizedService = {
  gameName: string;
  gameSlug: string;
  category: string;
  thumbnail: string;
  providerCode: string;
  productName: string;
  priceModal: number;
  priceSell: number;
  isActive: number;
  requiresZoneId: number;
};

const shouldApply = process.argv.includes("--apply");
const onlyActive = !process.argv.includes("--include-inactive");

async function main() {
  console.log(`Sync HataMarket products (${shouldApply ? "apply" : "dry-run"})...`);

  const response = await getTopupServices();
  if (!response.success) {
    throw new Error(response.error || "Failed to fetch HataMarket services");
  }

  const rows = extractServices(response.data)
    .map(normalizeService)
    .filter((service) => (onlyActive ? service.isActive === 1 : true));

  const uniqueGames = new Set(rows.map((row) => row.gameSlug));
  console.log(`Fetched ${rows.length} services from ${uniqueGames.size} games`);

  if (!shouldApply) {
    console.log("Dry-run only. Run with --apply to write to database.");
    console.log("Sample:");
    console.table(rows.slice(0, 10).map((row) => ({
      game: row.gameName,
      code: row.providerCode,
      name: row.productName,
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
    instructions: buildInstructions(row),
  }));

  await db
    .insert(games)
    .values(gameValues)
    .onConflictDoUpdate({
      target: games.slug,
      set: {
        name: sql`excluded."name"`,
        category: sql`excluded."category"`,
        thumbnail: sql`COALESCE(${games.thumbnail}, excluded."thumbnail")`,
        requiresZoneId: sql`excluded."requiresZoneId"`,
        instructions: sql`excluded."instructions"`,
        isActive: 1,
        updatedAt: new Date(),
      },
    });

  const syncedGames = await db.select().from(games);
  const gameBySlug = new Map(syncedGames.map((game) => [game.slug, game]));

  const existingProducts = await db.select().from(products);
  const existingProductKeys = new Set(
    existingProducts.map((product) => `${product.gameId}:${product.providerCode}`)
  );
  const productValues = rows.map((row) => {
    const game = gameBySlug.get(row.gameSlug);
    if (!game) {
      throw new Error(`Game not found after sync: ${row.gameSlug}`);
    }
    return {
      gameId: game.id,
      providerCode: row.providerCode,
      name: row.productName,
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
          priceModal: sql`excluded."priceModal"`,
          priceSell: sql`excluded."priceSell"`,
          isActive: sql`excluded."isActive"`,
          updatedAt: new Date(),
        },
      });
  }

  const productKeys = productValues.map((product) => `${product.gameId}:${product.providerCode}`);
  const gamesCreated = Array.from(uniqueRowsByGame.keys()).filter((slug) => !existingGameSlugs.has(slug)).length;
  const productsCreated = productKeys.filter((key) => !existingProductKeys.has(key)).length;
  const productsUpdated = productKeys.length - productsCreated;

  console.log("Sync complete:");
  console.table({
    gamesCreated,
    productsCreated,
    productsUpdated,
    totalServices: rows.length,
  });
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function extractServices(data: unknown): HataMarketService[] {
  const items = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : [];

  return items
    .map((item) => {
      if (isService(item)) return item;
      if (
        typeof item === "object" &&
        item !== null &&
        isService((item as { data?: unknown }).data)
      ) {
        return (item as { data: HataMarketService }).data;
      }
      return null;
    })
    .filter((item): item is HataMarketService => item !== null);
}

function isService(value: unknown): value is HataMarketService {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Partial<HataMarketService>;
  return Boolean(row.game && row.nama_layanan && row.harga && row.kode);
}

function normalizeService(row: HataMarketService): NormalizedService {
  const gameName = normalizeName(row.game);
  const priceModal = Number.parseInt(row.harga, 10);
  if (!Number.isFinite(priceModal) || priceModal <= 0) {
    throw new Error(`Invalid price for service ${row.kode}`);
  }

  return {
    gameName,
    gameSlug: normalizeSlug(gameName),
    category: inferCategory(gameName, row.type),
    thumbnail: buildThumbnailUrl(gameName),
    providerCode: row.kode.trim(),
    productName: normalizeName(row.nama_layanan),
    priceModal,
    priceSell: markup(priceModal),
    isActive: row.status.toLowerCase() === "aktif" ? 1 : 0,
    requiresZoneId: requiresZoneId(gameName) ? 1 : 0,
  };
}

function buildThumbnailUrl(gameName: string) {
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

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferCategory(gameName: string, type: string) {
  const text = `${gameName} ${type}`.toLowerCase();
  if (/voucher|wallet|google play|steam|garena|netflix|spotify|vidio|viu/.test(text)) {
    return "Voucher";
  }
  if (/pulsa|paket data|\bdata\b|token pln|pln/.test(text)) {
    return "Digital";
  }
  if (/mobile legends|arena of valor|wild rift|honor of kings/.test(text)) {
    return "MOBA";
  }
  if (/free fire|pubg|blood strike|farlight|sausage/.test(text)) {
    return "Battle Royale";
  }
  if (/valorant|call of duty|point blank/.test(text)) {
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

function buildInstructions(row: NormalizedService) {
  if (isPlnService(row.gameName)) {
    return `Masukkan nomor meter / ID pelanggan ${row.gameName} dengan benar.`;
  }
  if (isPhoneService(row.gameName)) {
    return `Masukkan nomor handphone tujuan ${row.gameName} dengan benar.`;
  }
  if (isVoucherService(row.gameName, row.category)) {
    return `Masukkan nomor handphone / email penerima jika diminta untuk ${row.gameName}.`;
  }
  if (row.requiresZoneId === 1) {
    return `Masukkan User ID dan Zone ID / Server ${row.gameName} dengan benar.`;
  }
  return `Masukkan User ID ${row.gameName} dengan benar.`;
}

function isPhoneService(gameName: string) {
  return /pulsa|paket data|\bdata\b|by\.?u|axis|xl|telkomsel|indosat|tri|three|smartfren/i.test(gameName);
}

function isPlnService(gameName: string) {
  return /pln|token listrik/i.test(gameName);
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
