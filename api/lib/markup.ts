type MarkupCategory = "game" | "digital";

export function markup(price: number, category: MarkupCategory = "game"): number {
  return category === "digital" ? markupDigital(price) : markupGame(price);
}

function markupGame(price: number) {
  if (price <= 5000) return roundToHundred(price + 300);
  if (price <= 20000) return roundToHundred(price + 700);
  if (price <= 50000) return roundToHundred(price + 1200);
  if (price <= 100000) return roundToHundred(price + 1800);
  return roundToHundred(price + 2500);
}

function markupDigital(price: number) {
  if (price <= 10000) return roundToHundred(price + 200);
  if (price <= 50000) return roundToHundred(price + 500);
  if (price <= 100000) return roundToHundred(price + 1000);
  return roundToHundred(price + 1500);
}

function roundToHundred(value: number) {
  return Math.ceil(value / 100) * 100;
}
