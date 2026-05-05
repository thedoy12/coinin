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
    process.env.TOPUP_API_URL ?? "https://hatamarket.com/api",
  topupApiKey:
    process.env.NODE_ENV === "production"
      ? process.env.HATAMARKET_API_ID ?? required("TOPUP_API_KEY")
      : process.env.HATAMARKET_API_ID ?? process.env.TOPUP_API_KEY ?? "",
  topupApiSecret:
    process.env.NODE_ENV === "production"
      ? process.env.HATAMARKET_API_KEY ?? required("TOPUP_API_SECRET")
      : process.env.HATAMARKET_API_KEY ?? process.env.TOPUP_API_SECRET ?? "",
  // Payment gateway config
  paymentMerchantId: process.env.NODE_ENV === "production" ? required("PAYMENT_MERCHANT_ID") : process.env.PAYMENT_MERCHANT_ID ?? "",
  paymentSecretKey: process.env.NODE_ENV === "production" ? requiredSecret("PAYMENT_SECRET_KEY", 16) : process.env.PAYMENT_SECRET_KEY ?? "",
  paymentClientKey: process.env.MIDTRANS_CLIENT_KEY ?? "",
  paymentApiUrl: process.env.PAYMENT_API_URL ?? "https://app.sandbox.midtrans.com",
};
