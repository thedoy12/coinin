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
  "efootball",
  "eggy-party",
  "era-of-celestial",
  "eternal-city",
  "farlight-84",
  "fc-mobile",
  "football-master-2",
  "free-fire",
  "genshin-impact",
  "harry-potter-magic-awakened",
  "honkai-impact-3",
  "honkai-star-rail",
  "honor-of-kings",
  "laplace-m",
  "league-of-legends-pc",
  "league-of-legends-wild-rift",
  "lineage2m",
  "lords-mobile",
  "love-and-deepspace",
  "mobile-legends",
  "point-blank",
  "point-blank-via-id",
  "pubg-mobile",
  "revelation-infinite-journey",
  "undawn",
  "valorant",
  "wuthering-waves",
  "zenless-zone-zero",
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

export const publicCatalogThumbnails: Record<string, string> = {
  "asphalt-9": "https://hatamarket.com/public/img/games/category_master_20240515224743.png",
  "au2-mobile": "https://hatamarket.com/public/img/games/au2_mobile.png",
  "call-of-duty-mobile": "https://hatamarket.com/public/img/games/1771013296_41ca04f1f14dcea2da85.jpg",
  "crystal-of-atlan": "https://hatamarket.com/public/img/games/1771057034_8c9e7a725e91bcbb38ff.jpg",
  "delta-force": "https://hatamarket.com/public/img/games/1771056801_617f238b37ee8b1b0f32.jpg",
  "draconia-saga": "https://hatamarket.com/public/img/games/draconia-saga.png",
  "dragon-raja-sea": "https://hatamarket.com/public/img/games/dragon_raja.png",
  "efootball": "https://hatamarket.com/public/img/games/category_master_20240515231207.png",
  "eggy-party": "https://hatamarket.com/public/img/games/category_master_20240627134102.png",
  "era-of-celestial": "https://hatamarket.com/public/img/games/category_master_20240515225526.png",
  "eternal-city": "https://hatamarket.com/public/img/games/eternalcity.png",
  "farlight-84": "https://hatamarket.com/public/img/games/category_master_20240515225649.png",
  "fc-mobile": "https://hatamarket.com/public/img/games/1771013487_83eb67de530adc476a12.jpg",
  "football-master-2": "https://hatamarket.com/public/img/games/football-master-2-fmp-murah.jpg",
  "free-fire": "https://hatamarket.com/public/img/games/1771057034_8c9e7a725e91bcbb38ff.jpg",
  "genshin-impact": "https://hatamarket.com/public/img/games/1771056749_b75d51a648569615bfd9.jpg",
  "harry-potter-magic-awakened": "https://hatamarket.com/public/img/games/20251123_122742.jpg",
  "honkai-impact-3": "https://hatamarket.com/public/img/games/1771056655_ce48eeab2cbb79689d41.jpg",
  "honkai-star-rail": "https://hatamarket.com/public/img/games/category_master_20240515230625.png",
  "honor-of-kings": "https://hatamarket.com/public/img/games/1771056846_ac38748a7f221e82eb7e.jpg",
  "laplace-m": "https://hatamarket.com/public/img/games/laplace_m.png",
  "league-of-legends-pc": "https://hatamarket.com/public/img/games/category_master_20240515231207.png",
  "league-of-legends-wild-rift": "https://hatamarket.com/public/img/games/lolwild.png",
  "lineage2m": "https://hatamarket.com/public/img/games/lifeafter.png",
  "lords-mobile": "https://hatamarket.com/public/img/games/lords_mobile.png",
  "love-and-deepspace": "https://hatamarket.com/public/img/games/20251123_122742.jpg",
  "mobile-legends": "https://hatamarket.com/public/img/games/1771057005_64f2c8db0cbd1e98daa2.jpg",
  "point-blank": "https://hatamarket.com/public/img/games/1771013044_ff2ed61c38db711a5362.jpg",
  "point-blank-via-id": "https://hatamarket.com/public/img/games/1771013044_ff2ed61c38db711a5362.jpg",
  "pubg-mobile": "https://hatamarket.com/public/img/games/1771056982_1ac36e0545f6676314fd.jpg",
  "revelation-infinite-journey": "https://hatamarket.com/public/img/games/category_master_20240627125124.png",
  "undawn": "https://hatamarket.com/public/img/games/20251123_121914.jpg",
  "valorant": "https://hatamarket.com/public/img/games/valorant-ef103-original.webp",
  "wuthering-waves": "https://hatamarket.com/public/img/games/20251123_120542.jpg",
  "zenless-zone-zero": "https://hatamarket.com/public/img/games/20251123_121232.jpg",
  "pln": "https://hatamarket.com/public/img/games/076321100_1629812250-Logo_PLN.webp",
  "token-pln": "https://hatamarket.com/public/img/games/076321100_1629812250-Logo_PLN.webp",
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
