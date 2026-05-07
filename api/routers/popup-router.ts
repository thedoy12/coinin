import { createRouter, publicQuery } from "../middleware";
import { getPopupSettingsOrDefault } from "../lib/popup-settings";

export const popupRouter = createRouter({
  active: publicQuery.query(async () => {
    const popup = await getPopupSettingsOrDefault();
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
