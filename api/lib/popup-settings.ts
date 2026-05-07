import { popupSettings } from "@db/schema";
import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";

export const defaultPopupSettings = {
  id: 1,
  isActive: 0,
  title: "Promo CoinIn",
  description: "Top up game favorit kamu lebih cepat dengan pembayaran praktis.",
  imageUrl: null,
  buttonText: "Top Up Sekarang",
  buttonUrl: "#game-store",
  displayDelayMs: 1200,
  updatedAt: new Date(),
};

export async function getPopupSettingsOrDefault() {
  try {
    const rows = await getDb()
      .select()
      .from(popupSettings)
      .where(eq(popupSettings.id, 1))
      .limit(1);

    return rows[0] ?? { ...defaultPopupSettings };
  } catch (error) {
    if (isMissingPopupSettingsTable(error)) {
      return { ...defaultPopupSettings };
    }
    throw error;
  }
}

export function isMissingPopupSettingsTable(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /popup_settings/i.test(error.message) && (
    /does not exist/i.test(error.message) ||
    /relation/i.test(error.message) ||
    /no such table/i.test(error.message)
  );
}
