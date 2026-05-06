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
  "free-fire": "https://placehold.co/400x400/111827/f97316?text=FF",
  "mobile-legends": "https://placehold.co/400x400/172554/93c5fd?text=ML",
  "pln": "https://placehold.co/400x400/0f172a/f8fafc?text=PLN",
  "token-pln": "https://placehold.co/400x400/0f172a/f8fafc?text=PLN",
  "saldo-dana": "https://placehold.co/400x400/0f172a/5eead4?text=DANA",
  "saldo-gopay": "https://placehold.co/400x400/082f49/7dd3fc?text=GOPAY",
  "saldo-ovo": "https://placehold.co/400x400/2e1065/c4b5fd?text=OVO",
  "saldo-shopeepay": "https://placehold.co/400x400/7c2d12/fed7aa?text=SPAY",
  "pulsa-axis": "https://placehold.co/400x400/1e293b/67e8f9?text=AXIS",
  "pulsa-by-u": "https://placehold.co/400x400/0f172a/fbbf24?text=BYU",
  "pulsa-indosat": "https://placehold.co/400x400/7c2d12/fde68a?text=ISAT",
  "pulsa-smartfren": "https://placehold.co/400x400/3f3f46/f472b6?text=SF",
  "pulsa-telkomsel": "https://placehold.co/400x400/7f1d1d/fca5a5?text=TSEL",
  "pulsa-tri": "https://placehold.co/400x400/312e81/c4b5fd?text=TRI",
  "pulsa-xl": "https://placehold.co/400x400/164e63/7dd3fc?text=XL",
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
