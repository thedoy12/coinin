import { getDb } from "../api/queries/connection";
import { games, products } from "./schema";
import { inArray } from "drizzle-orm";
import { markup } from "../api/lib/markup";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  const gamesData = [
    { name: "Mobile Legends", slug: "mobile-legends", category: "MOBA", thumbnail: "https://placehold.co/400x400/1a1a2e/FFF?text=ML", requiresZoneId: 1, instructions: "Masukkan User ID dan Zone ID Mobile Legends dengan benar." },
    { name: "Free Fire", slug: "free-fire", category: "Battle Royale", thumbnail: "https://placehold.co/400x400/ff4757/FFF?text=FF" },
    { name: "PUBG Mobile", slug: "pubg-mobile", category: "Battle Royale", thumbnail: "https://placehold.co/400x400/fbc531/FFF?text=PUBG" },
    { name: "Genshin Impact", slug: "genshin-impact", category: "RPG", thumbnail: "https://placehold.co/400x400/535c68/FFF?text=GI", requiresZoneId: 1, instructions: "Masukkan UID dan pilih server sesuai akun Genshin Impact." },
    { name: "Call of Duty Mobile", slug: "call-of-duty-mobile", category: "FPS", thumbnail: "https://placehold.co/400x400/2f3542/FFF?text=CODM" },
    { name: "Honkai Star Rail", slug: "honkai-star-rail", category: "RPG", thumbnail: "https://placehold.co/400x400/5f27cd/FFF?text=HSR" },
    { name: "Valorant", slug: "valorant", category: "FPS", thumbnail: "https://placehold.co/400x400/ff6b6b/FFF?text=VAL" },
    { name: "Wild Rift", slug: "wild-rift", category: "MOBA", thumbnail: "https://placehold.co/400x400/00d2d3/FFF?text=WR" },
    { name: "Clash of Clans", slug: "clash-of-clans", category: "Strategy", thumbnail: "https://placehold.co/400x400/feca57/FFF?text=COC" },
    { name: "Clash Royale", slug: "clash-royale", category: "Strategy", thumbnail: "https://placehold.co/400x400/ff9ff3/FFF?text=CR" },
    { name: "Arena of Valor", slug: "arena-of-valor", category: "MOBA", thumbnail: "https://placehold.co/400x400/48dbfb/FFF?text=AOV" },
    { name: "Rise of Kingdoms", slug: "rise-of-kingdoms", category: "Strategy", thumbnail: "https://placehold.co/400x400/f368e0/FFF?text=ROK" },
    { name: "State of Survival", slug: "state-of-survival", category: "Strategy", thumbnail: "https://placehold.co/400x400/ee5253/FFF?text=SOS" },
    { name: "Lords Mobile", slug: "lords-mobile", category: "Strategy", thumbnail: "https://placehold.co/400x400/0abde3/FFF?text=LM" },
    { name: "Dragon Raja", slug: "dragon-raja", category: "RPG", thumbnail: "https://placehold.co/400x400/10ac84/FFF?text=DR" },
    { name: "Roblox", slug: "roblox", category: "Platform", thumbnail: "https://placehold.co/400x400/1dd1a1/FFF?text=RBX" },
    { name: "Minecraft", slug: "minecraft", category: "Sandbox", thumbnail: "https://placehold.co/400x400/5f27cd/FFF?text=MC" },
    { name: "Fortnite", slug: "fortnite", category: "Battle Royale", thumbnail: "https://placehold.co/400x400/feca57/FFF?text=FN" },
    { name: "FC Mobile", slug: "fc-mobile", category: "Sports", thumbnail: "https://placehold.co/400x400/ff9f43/FFF?text=FCM" },
    { name: "eFootball", slug: "efootball", category: "Sports", thumbnail: "https://placehold.co/400x400/222f3e/FFF?text=EFB" },
  ];

  await db.insert(games).values(gamesData).onConflictDoNothing();
  console.log(`Inserted ${gamesData.length} games`);

  // Create sample products for each game
  const productTemplates = [
    { name: "60 Diamonds", providerCode: "DM60", priceModal: 10000 },
    { name: "120 Diamonds", providerCode: "DM120", priceModal: 19000 },
    { name: "250 Diamonds", providerCode: "DM250", priceModal: 38000 },
    { name: "500 Diamonds", providerCode: "DM500", priceModal: 72000 },
    { name: "1000 Diamonds", providerCode: "DM1000", priceModal: 135000 },
  ];

  const persistedGames = await db
    .select()
    .from(games)
    .where(inArray(games.slug, gamesData.map((game) => game.slug)));

  const allProducts = [];
  for (const game of persistedGames) {
    for (const template of productTemplates) {
      allProducts.push({
        gameId: game.id,
        providerCode: `${template.providerCode}_G${game.id}`,
        name: template.name,
        priceModal: template.priceModal,
        priceSell: markup(template.priceModal),
      });
    }
  }

  await db.insert(products).values(allProducts).onConflictDoNothing();
  console.log(`Inserted ${allProducts.length} products`);

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
