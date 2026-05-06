import { sql } from "drizzle-orm";
import { games, products } from "@db/schema";

export const publicCatalogSlugs = [
  "free-fire",
  "mobile-legends",
  "pln",
  "token-pln",
  "saldo-dana",
  "saldo-gopay",
  "saldo-ovo",
  "saldo-shopeepay",
  "pulsa-axis",
  "pulsa-by-u",
  "pulsa-indosat",
  "pulsa-smartfren",
  "pulsa-telkomsel",
  "pulsa-tri",
  "pulsa-xl",
] as const;

export const publicCatalogThumbnails: Record<string, string> = {
  "free-fire": "https://hatamarket.com/public/img/games/1771057034_8c9e7a725e91bcbb38ff.jpg",
  "mobile-legends": "https://hatamarket.com/public/img/games/1771057005_64f2c8db0cbd1e98daa2.jpg",
  "pln": "https://hatamarket.com/public/img/games/076321100_1629812250-Logo_PLN.webp",
  "token-pln": "https://hatamarket.com/public/img/games/076321100_1629812250-Logo_PLN.webp",
  "saldo-dana": "https://placehold.co/400x400/0f172a/5eead4?text=DANA",
  "saldo-gopay": "https://placehold.co/400x400/082f49/7dd3fc?text=GOPAY",
  "saldo-ovo": "https://placehold.co/400x400/2e1065/c4b5fd?text=OVO",
  "saldo-shopeepay": "https://placehold.co/400x400/7c2d12/fed7aa?text=SPAY",
  "pulsa-axis": "https://hatamarket.com/public/img/games/axis.png",
  "pulsa-by-u": "https://hatamarket.com/public/img/games/byu.png",
  "pulsa-indosat": "https://hatamarket.com/public/img/games/untitled-1_64.png",
  "pulsa-smartfren": "https://hatamarket.com/public/img/games/9a509491c6b29643993d851b11a3482c.jpg",
  "pulsa-telkomsel": "https://hatamarket.com/public/img/games/telkomsel.png",
  "pulsa-tri": "https://hatamarket.com/public/img/games/cart-icon-03_1.jpg",
  "pulsa-xl": "https://hatamarket.com/public/img/games/xl.png",
};

export function getPublicCatalogThumbnail(slug: string, fallback?: string | null) {
  return publicCatalogThumbnails[slug] ?? fallback ?? null;
}

const sensitiveCatalogTerms = [
  "judi",
  "slot",
  "casino",
  "poker",
  "togel",
  "bet",
  "betting",
  "domino",
  "higgs",
  "gaple",
  "capsa",
  "qiu",
  "qq",
  "8\\s*ball",
  "billiard",
  "sex",
  "sexy",
  "porn",
  "porno",
  "dewasa",
  "crypto",
  "kripto",
  "bitcoin",
  "binance",
  "usdt",
  "trading",
  "forex",
  "bigo",
  "live",
];

export const sensitiveCatalogPattern = sensitiveCatalogTerms
  .map((term) => {
    if (term === "bet" || term === "qq") return `\\m${term}\\M`;
    return term;
  })
  .join("|");

const sensitiveCatalogTextPattern = sensitiveCatalogTerms
  .map((term) => {
    if (term === "bet" || term === "qq") return `\\b${term}\\b`;
    return term;
  })
  .join("|");

export function publicSafeGameFilter() {
  return sql`
    ${games.name} !~* ${sensitiveCatalogPattern}
    and ${games.slug} !~* ${sensitiveCatalogPattern}
  `;
}

export function publicSafeProductFilter() {
  return sql`
    ${products.name} !~* ${sensitiveCatalogPattern}
    and ${products.providerCode} !~* ${sensitiveCatalogPattern}
  `;
}

export function isSensitiveCatalogText(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ");
  return new RegExp(sensitiveCatalogTextPattern, "i").test(text);
}
