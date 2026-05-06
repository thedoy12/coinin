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
    process.env.TOPUP_API_URL ?? "",
  topupApiUsername:
    process.env.TOPUP_API_USERNAME ?? "",
  topupApiSecret:
    process.env.TOPUP_API_SECRET ?? "",
  topupWebhookSecret: process.env.TOPUP_WEBHOOK_SECRET ?? "",
  topupWebhookUrl: process.env.TOPUP_WEBHOOK_URL ?? "",
  topupUseTestingMode: process.env.TOPUP_TESTING === "true",
  topupZoneSeparator: process.env.TOPUP_ZONE_SEPARATOR ?? "",
  topupUseBuyerPriceLimit: process.env.TOPUP_MAX_PRICE !== "false",
  topupPriceCeiling: Number(process.env.TOPUP_PRICE_CEILING ?? 0) || undefined,
  // Payment config
  paymentMerchantId:
    process.env.PAYMENT_MERCHANT_ID ?? "",
  paymentApiKey:
    process.env.PAYMENT_API_KEY ?? "",
  paymentSecretKey:
    process.env.PAYMENT_SECRET_KEY ?? "",
  paymentMethod: process.env.PAYMENT_METHOD ?? "QRIS",
  paymentApiUrl: process.env.PAYMENT_API_URL ?? "",
};
