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

function firstDefined(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: requiredSecret("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  appUrl: process.env.VITE_APP_URL ?? "http://localhost:3000",
  // Top-up API config
  topupApiUrl: firstDefined("TOPUP_API_URL"),
  topupApiUsername: firstDefined("TOPUP_API_USERNAME", "DIGIFLAZZ_USERNAME"),
  topupApiSecret: firstDefined("TOPUP_API_SECRET", "DIGIFLAZZ_API_KEY"),
  topupWebhookSecret: firstDefined("TOPUP_WEBHOOK_SECRET", "DIGIFLAZZ_WEBHOOK_SECRET"),
  topupWebhookUrl: firstDefined("TOPUP_WEBHOOK_URL", "DIGIFLAZZ_WEBHOOK_URL"),
  topupUseTestingMode: firstDefined("TOPUP_TESTING", "DIGIFLAZZ_TESTING") === "true",
  topupZoneSeparator: process.env.TOPUP_ZONE_SEPARATOR ?? "",
  topupUseBuyerPriceLimit: process.env.TOPUP_MAX_PRICE !== "false",
  topupPriceCeiling: Number(process.env.TOPUP_PRICE_CEILING ?? 0) || undefined,
  // Payment config
  paymentMerchantId: firstDefined("PAYMENT_MERCHANT_ID", "TRIPAY_MERCHANT_CODE"),
  paymentApiKey: firstDefined("PAYMENT_API_KEY", "TRIPAY_API_KEY"),
  paymentSecretKey: firstDefined("PAYMENT_SECRET_KEY", "TRIPAY_PRIVATE_KEY"),
  paymentMethod: firstDefined("PAYMENT_METHOD", "TRIPAY_PAYMENT_METHOD") || "QRIS",
  paymentApiUrl: firstDefined("PAYMENT_API_URL"),
};
