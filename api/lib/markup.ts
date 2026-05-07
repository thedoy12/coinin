type MarkupCategory = "game" | "digital";

export function markup(price: number, category: MarkupCategory = "game"): number {
  return category === "digital" ? markupDigital(price) : markupGame(price);
}

function markupGame(price: number) {
  if (price <= 20000) return applyPercentageMarkup(price, 0.04, 600);
  if (price <= 100000) return applyPercentageMarkup(price, 0.035, 900);
  if (price <= 300000) return applyPercentageMarkup(price, 0.03, 0);
  return applyPercentageMarkup(price, 0.025, 0, 40000);
}

function markupDigital(price: number) {
  if (price <= 20000) return applyPercentageMarkup(price, 0.025, 400);
  if (price <= 100000) return applyPercentageMarkup(price, 0.0225, 0);
  return applyPercentageMarkup(price, 0.0175, 0, 8000);
}

function applyPercentageMarkup(price: number, percentage: number, minimum: number, maximum = Number.POSITIVE_INFINITY) {
  const margin = Math.min(Math.max(price * percentage, minimum), maximum);
  return roundToHundred(price + margin);
}

function roundToHundred(value: number) {
  return Math.ceil(value / 100) * 100;
}
