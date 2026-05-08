type InvoiceMessageInput = {
  referenceId: string;
  gameName: string;
  productName: string;
  userIdGame: string;
  zoneId?: string | null;
  price: number;
  status?: string | null;
  paymentStatus?: string | null;
  customerName?: string | null;
  checkoutUrl?: string;
  statusUrl?: string;
};

export function buildInvoiceMessage(input: InvoiceMessageInput) {
  const target = input.zoneId ? `${input.userIdGame} (${input.zoneId})` : input.userIdGame;
  const lines = [
    "*Invoice CoinIn*",
    "",
    `Ref: ${input.referenceId}`,
    `Produk: ${input.gameName} - ${input.productName}`,
    `Tujuan: ${target}`,
    `Total: ${formatRupiah(input.price)}`,
  ];

  if (input.customerName) lines.push(`Nama: ${input.customerName}`);
  if (input.paymentStatus) lines.push(`Payment: ${input.paymentStatus}`);
  if (input.status) lines.push(`Status: ${input.status}`);
  if (input.checkoutUrl) lines.push("", `Link bayar: ${input.checkoutUrl}`);
  if (input.statusUrl) lines.push(`Cek status: ${input.statusUrl}`);

  lines.push("", "Terima kasih sudah order di CoinIn.");
  return lines.join("\n");
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  if (!normalizedPhone) return `https://wa.me/?text=${encodedMessage}`;
  return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
}

export function normalizeWhatsAppPhone(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}
