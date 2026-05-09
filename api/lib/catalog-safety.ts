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
  "call-of-duty-mobile": "https://images.weserv.nl/?url=i.ibb.co/RGJm0KHs/call-of-duty-mobile-logo.jpg",
  "delta-force": "https://images.weserv.nl/?url=i.ibb.co/F4r4F19P/Delta-Force-Logo.png",
  "free-fire": "https://images.weserv.nl/?url=i.ibb.co/R4VmdLFC/Free-Fire-Logo.png",
  "honor-of-kings": "https://images.weserv.nl/?url=i.ibb.co/HDM65rWZ/honor-of-kings-logo.png",
  "k-vision-dan-gol": "https://images.weserv.nl/?url=i.ibb.co/M55kxSDN/K-VISION-Logo.png",
  "league-of-legends-wild-rift": "https://images.weserv.nl/?url=i.ibb.co/4nYG0zdF/League-Of-Legend-Logo.png",
  "magic-chess": "https://images.weserv.nl/?url=i.ibb.co/5XFFGgsm/magic-chess-logo.png",
  "mobile-legends": "https://images.weserv.nl/?url=i.ibb.co/DDX1Rntw/mobile-legends-logo.png",
  "pertamina-gas": "https://images.weserv.nl/?url=i.ibb.co/TX1Js99/pertamina-gas-negara-logo.png",
  "pln": "https://images.weserv.nl/?url=i.ibb.co/5HXzjRY/pln-logo.png",
  "point-blank": "https://images.weserv.nl/?url=i.ibb.co/SDCzWSZn/Point-Blank-Logo.png",
  "pubg-mobile": "https://images.weserv.nl/?url=i.ibb.co/1t74JMh9/pubg-mobile-logo.png",
  "pulsa-axis": "https://images.weserv.nl/?url=i.ibb.co/p62xbCn3/axis-logo.png",
  "pulsa-by-u": "https://images.weserv.nl/?url=i.ibb.co/VYXhQhd0/by-u-logo.png",
  "pulsa-indosat": "https://images.weserv.nl/?url=i.ibb.co/HTFkj52G/indosat-ooredoo-hutchison-logo.png",
  "pulsa-smartfren": "https://images.weserv.nl/?url=i.ibb.co/mVg88qPW/smartfren-logo.png",
  "pulsa-telkomsel": "https://images.weserv.nl/?url=i.ibb.co/rKKWMncq/telkomsel-logo.png",
  "pulsa-tri": "https://images.weserv.nl/?url=i.ibb.co/G4KNqhM3/tri-3-logo.png",
  "pulsa-xl": "https://images.weserv.nl/?url=i.ibb.co/G4dk2199/xl-axiata-logo.png",
  "ragnarok-m-eternal-love": "https://images.weserv.nl/?url=i.ibb.co/hJMwj71B/Raganarok-M-Eternal-Love.png",
  "saldo-dana": "https://images.weserv.nl/?url=i.ibb.co/TMHnkbf8/dana-logo.jpg",
  "saldo-gopay": "https://images.weserv.nl/?url=i.ibb.co/fdzy0Fxg/gopay-logo.png",
  "saldo-ovo": "https://images.weserv.nl/?url=i.ibb.co/tpq5G19R/ovo-logo.png",
  "saldo-shopeepay": "https://images.weserv.nl/?url=i.ibb.co/S4gv0MSn/shopeepay-logo.png",
  "token-pln": "https://images.weserv.nl/?url=i.ibb.co/5HXzjRY/pln-logo.png",
  "valorant-mobile": "https://images.weserv.nl/?url=i.ibb.co/2sZzLh8s/Valorant-Mobile-Logo.png",
};

export function getPublicCatalogThumbnail(slug: string, fallback?: string | null) {
  return fallback ?? publicCatalogThumbnails[slug] ?? null;
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
