import { sql } from "drizzle-orm";
import { games, products } from "@db/schema";

export const publicCatalogSlugs = [
  "asphalt-9",
  "au2-mobile",
  "call-of-duty-mobile",
  "crystal-of-atlan",
  "delta-force",
  "draconia-saga",
  "dragon-raja-sea",
  "eggy-party",
  "era-of-celestial",
  "eternal-city",
  "farlight-84",
  "fc-mobile",
  "football-master-2",
  "free-fire",
  "genshin-impact",
  "honor-of-kings",
  "mobile-legends",
  "point-blank-via-id",
  "revelation-infinite-journey",
  "undawn",
  "pln",
  "token-pln",
  "pulsa-axis",
  "pulsa-by-u",
  "pulsa-indosat",
  "pulsa-smartfren",
  "pulsa-telkomsel",
  "pulsa-tri",
  "pulsa-xl",
] as const;

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
