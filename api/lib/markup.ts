export function markup(price: number): number {
  if (price <= 20000) return roundToHundred(price * 1.05);
  if (price <= 50000) return roundToHundred(price * 1.04);
  if (price <= 100000) return roundToHundred(price * 1.03);
  return roundToHundred(price * 1.02);
}

function roundToHundred(value: number) {
  return Math.ceil(value / 100) * 100;
}
