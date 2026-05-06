import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function requiredSecret(name: string, minLength = 32): string {
  const value = required(name);
  if (process.env.NODE_ENV === "production" && value.length < minLength) {
    throw new Error(`${name} must be at least ${minLength} characters in production`);
  }
  return value;
}

export const env = {
  appId: required("APP_ID"),
  appSecret: requiredSecret("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  appUrl: process.env.VITE_APP_URL ?? "http://localhost:3000",
  // Top-up API config
  topupApiUrl:
    process.env.TOPUP_API_URL ?? "https://api.digiflazz.com/v1",
  topupApiUsername:
    process.env.NODE_ENV === "production"
      ? process.env.DIGIFLAZZ_USERNAME ?? required("TOPUP_API_USERNAME")
      : process.env.DIGIFLAZZ_USERNAME ?? process.env.TOPUP_API_USERNAME ?? "",
  topupApiSecret:
    process.env.NODE_ENV === "production"
      ? process.env.DIGIFLAZZ_API_KEY ?? required("TOPUP_API_SECRET")
      : process.env.DIGIFLAZZ_API_KEY ?? process.env.TOPUP_API_SECRET ?? "",
  topupWebhookSecret: process.env.DIGIFLAZZ_WEBHOOK_SECRET ?? process.env.TOPUP_WEBHOOK_SECRET ?? "",
  topupWebhookUrl: process.env.DIGIFLAZZ_WEBHOOK_URL ?? process.env.TOPUP_WEBHOOK_URL ?? "",
  topupUseTestingMode: process.env.DIGIFLAZZ_TESTING === "true",
  topupZoneSeparator: process.env.DIGIFLAZZ_ZONE_SEPARATOR ?? process.env.TOPUP_ZONE_SEPARATOR ?? "",
  topupUseBuyerPriceLimit: process.env.DIGIFLAZZ_MAX_PRICE !== "false",
  topupPriceCeiling: Number(process.env.DIGIFLAZZ_PRICE_CEILING ?? process.env.TOPUP_PRICE_CEILING ?? 0) || undefined,
  // Payment gateway config
  paymentMerchantId:
    process.env.NODE_ENV === "production"
      ? required("TRIPAY_MERCHANT_CODE")
      : process.env.TRIPAY_MERCHANT_CODE ?? process.env.PAYMENT_MERCHANT_ID ?? "",
  paymentApiKey:
    process.env.NODE_ENV === "production"
      ? requiredSecret("TRIPAY_API_KEY", 16)
      : process.env.TRIPAY_API_KEY ?? process.env.PAYMENT_API_KEY ?? "",
  paymentSecretKey:
    process.env.NODE_ENV === "production"
      ? requiredSecret("TRIPAY_PRIVATE_KEY", 16)
      : process.env.TRIPAY_PRIVATE_KEY ?? process.env.PAYMENT_SECRET_KEY ?? "",
  paymentMethod: process.env.TRIPAY_PAYMENT_METHOD ?? "QRIS2",
  paymentApiUrl: process.env.PAYMENT_API_URL ?? "https://tripay.co.id/api",
};
