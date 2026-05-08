type MarkupCategory = "game" | "digital";

export function markup(price: number, category: MarkupCategory = "game"): number {
  return category === "digital" ? markupDigital(price) : markupGame(price);
}

function markupGame(price: number) {
  if (price <= 20000) return applyPercentageMarkup(price, 0.025, 300);
  if (price <= 100000) return applyPercentageMarkup(price, 0.02, 500);
  if (price <= 300000) return applyPercentageMarkup(price, 0.015, 0);
  return applyPercentageMarkup(price, 0.012, 0, 20000);
}

function markupDigital(price: number) {
  if (price <= 20000) return applyPercentageMarkup(price, 0.015, 200);
  if (price <= 100000) return applyPercentageMarkup(price, 0.0125, 0);
  return applyPercentageMarkup(price, 0.008, 0, 5000);
}

function applyPercentageMarkup(price: number, percentage: number, minimum: number, maximum = Number.POSITIVE_INFINITY) {
  const margin = Math.min(Math.max(price * percentage, minimum), maximum);
  return roundToHundred(price + margin);
}

function roundToHundred(value: number) {
  return Math.ceil(value / 100) * 100;
}
