type MarkupCategory = "game" | "digital";

export function markup(price: number, category: MarkupCategory = "game"): number {
  return category === "digital" ? markupDigital(price) : markupGame(price);
}

export function catalogMarkup(price: number, category: MarkupCategory = "game", gameName?: string | null): number {
  if (category === "game" && /point\s*blank/i.test(gameName ?? "")) {
    return markupPointBlank(price);
  }
  return markup(price, category);
}

function markupGame(price: number) {
  if (price <= 20000) return applyPercentageMarkup(price, 0.025, 300);
  if (price <= 100000) return applyPercentageMarkup(price, 0.02, 500);
  if (price <= 300000) return applyPercentageMarkup(price, 0.012, 0);
  if (price <= 1000000) return applyPercentageMarkup(price, 0.008, 0, 6000);
  return applyPercentageMarkup(price, 0.005, 0, 10000);
}

function markupPointBlank(price: number) {
  if (price <= 20000) return applyPercentageMarkup(price, 0.04, 500);
  if (price <= 100000) return applyPercentageMarkup(price, 0.03, 1000);
  if (price <= 300000) return applyPercentageMarkup(price, 0.02, 0);
  if (price <= 1000000) return applyPercentageMarkup(price, 0.012, 0, 8000);
  return applyPercentageMarkup(price, 0.008, 0, 12000);
}

function markupDigital(price: number) {
  if (price <= 20000) return applyPercentageMarkup(price, 0.015, 200);
  if (price <= 100000) return applyPercentageMarkup(price, 0.0125, 0);
  return applyPercentageMarkup(price, 0.004, 0, 3000);
}

function applyPercentageMarkup(price: number, percentage: number, minimum: number, maximum = Number.POSITIVE_INFINITY) {
  const margin = Math.min(Math.max(price * percentage, minimum), maximum);
  return roundToHundred(price + margin);
}

function roundToHundred(value: number) {
  return Math.ceil(value / 100) * 100;
}
