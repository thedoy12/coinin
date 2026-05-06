import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { popupSettings } from "@db/schema";
import { eq } from "drizzle-orm";

export const popupRouter = createRouter({
  active: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(popupSettings)
      .where(eq(popupSettings.id, 1))
      .limit(1);

    const popup = rows[0];
    if (!popup || popup.isActive !== 1 || !popup.title.trim()) return null;

    return {
      title: popup.title,
      description: popup.description,
      imageUrl: popup.imageUrl,
      buttonText: popup.buttonText,
      buttonUrl: popup.buttonUrl,
      displayDelayMs: popup.displayDelayMs,
      updatedAt: popup.updatedAt,
    };
  }),
});
