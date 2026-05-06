type MarkupCategory = "game" | "digital";

export function markup(price: number, category: MarkupCategory = "game"): number {
  return category === "digital" ? markupDigital(price) : markupGame(price);
}

function markupGame(price: number) {
  return applyPercentageMarkup(price, 0.04, 400, 3000);
}

function markupDigital(price: number) {
  return applyPercentageMarkup(price, 0.025, 300, 1800);
}

function applyPercentageMarkup(price: number, percentage: number, minimum: number, maximum: number) {
  const margin = Math.min(Math.max(price * percentage, minimum), maximum);
  return roundToHundred(price + margin);
}

function roundToHundred(value: number) {
  return Math.ceil(value / 100) * 100;
}
