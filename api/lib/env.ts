import "dotenv/config";

function required(name: string): string {
  const value = readEnv(name);
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
    const value = readEnv(name);
    if (value) return value;
  }
  return "";
}

function readEnv(name: string): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function isTruthyEnv(name: string) {
  return readEnv(name) === "true";
}

function getDigiflazzApiKey() {
  const testing = isTruthyEnv("TOPUP_TESTING") || isTruthyEnv("DIGIFLAZZ_TESTING");
  if (testing) {
    return firstDefined("TOPUP_API_SECRET", "DIGIFLAZZ_DEVELOPMENT_KEY", "DIGIFLAZZ_API_KEY");
  }
  return firstDefined("TOPUP_API_SECRET", "DIGIFLAZZ_PRODUCTION_KEY", "DIGIFLAZZ_API_KEY");
}

export const env = {
  appId: required("APP_ID"),
  appSecret: requiredSecret("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  ownerUnionId: readEnv("OWNER_UNION_ID"),
  appUrl: readEnv("VITE_APP_URL") || "http://localhost:3000",
  // Top-up API config
  topupApiUrl: firstDefined("TOPUP_API_URL"),
  topupApiUsername: firstDefined("TOPUP_API_USERNAME", "DIGIFLAZZ_USERNAME"),
  topupApiSecret: getDigiflazzApiKey(),
  topupWebhookSecret: firstDefined("TOPUP_WEBHOOK_SECRET", "DIGIFLAZZ_WEBHOOK_SECRET"),
  topupWebhookUrl: firstDefined("TOPUP_WEBHOOK_URL", "DIGIFLAZZ_WEBHOOK_URL"),
  topupUseTestingMode: isTruthyEnv("TOPUP_TESTING") || isTruthyEnv("DIGIFLAZZ_TESTING"),
  topupZoneSeparator: firstDefined("TOPUP_ZONE_SEPARATOR", "DIGIFLAZZ_ZONE_SEPARATOR"),
  topupUseBuyerPriceLimit: readEnv("TOPUP_MAX_PRICE") !== "false",
  topupPriceCeiling: Number(readEnv("TOPUP_PRICE_CEILING") || 0) || undefined,
  // Payment config
  paymentMerchantId: firstDefined("PAYMENT_MERCHANT_ID", "TRIPAY_MERCHANT_CODE"),
  paymentApiKey: firstDefined("PAYMENT_API_KEY", "TRIPAY_API_KEY"),
  paymentSecretKey: firstDefined("PAYMENT_SECRET_KEY", "TRIPAY_PRIVATE_KEY"),
  paymentMethod: firstDefined("PAYMENT_METHOD", "TRIPAY_PAYMENT_METHOD") || "QRIS",
  paymentApiUrl: firstDefined("PAYMENT_API_URL"),
};
