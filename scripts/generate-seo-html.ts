import fs from "fs";
import path from "path";

type SeoPage = {
  path: string;
  title: string;
  description: string;
  keywords: string;
};

const distDir = path.resolve("dist/public");
const indexPath = path.join(distDir, "index.html");
const baseUrl = "https://coinin.store";

const pages: SeoPage[] = [
  {
    path: "/top-up-game",
    title: "Top Up Game Online Cepat 24 Jam QRIS & E-Wallet | CoinIn",
    description:
      "Top up game online di CoinIn untuk Mobile Legends, Free Fire, PUBG Mobile, Honor of Kings, dan game populer lain. Bayar QRIS, VA, e-wallet, status real-time.",
    keywords:
      "top up game, top up game online, top up mobile legends, top up free fire, top up pubg mobile, top up qris",
  },
  {
    path: "/games",
    title: "Katalog Top Up Game, Pulsa, dan Token PLN | CoinIn",
    description:
      "Cari katalog top up game online, pulsa, e-wallet, dan token PLN di CoinIn. Pilih Mobile Legends, Free Fire, PUBG Mobile, Honor of Kings, dan layanan populer lain.",
    keywords:
      "katalog top up game, top up mobile legends, top up free fire, pulsa online, token pln",
  },
  ...[
    ["mobile-legends", "Mobile Legends"],
    ["free-fire", "Free Fire"],
    ["pubg-mobile", "PUBG Mobile"],
    ["honor-of-kings", "Honor of Kings"],
    ["call-of-duty-mobile", "Call of Duty Mobile"],
  ].map(([slug, name]) => ({
    path: `/game/${slug}`,
    title: `Top Up ${name} Murah dan Cepat | CoinIn`,
    description: `Top up ${name} di CoinIn dengan pembayaran QRIS, VA, e-wallet, proses cepat, dan status transaksi real-time.`,
    keywords: `top up ${name}, top up ${slug}, top up game, qris game, CoinIn`,
  })),
];

const source = fs.readFileSync(indexPath, "utf-8");

for (const page of pages) {
  const html = withSeo(source, page);
  const outputDir = path.join(distDir, page.path.replace(/^\//, ""));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), html);
}

function withSeo(html: string, page: SeoPage) {
  const url = `${baseUrl}${page.path}`;
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const keywords = escapeHtml(page.keywords);

  return html
    .replace(/<title>.*?<\/title>/s, `<title>${title}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, `<meta name="description" content="${description}" />`)
    .replace(/<meta\s+name="keywords"\s+content="[^"]*"\s*\/>/, `<meta name="keywords" content="${keywords}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/, `<meta property="og:title" content="${title}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/, `<meta property="og:description" content="${description}" />`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/, `<meta property="og:url" content="${url}" />`)
    .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${title}" />`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${description}" />`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/, `<link rel="canonical" href="${url}" />`);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
