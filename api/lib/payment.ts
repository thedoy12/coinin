import axios from "axios";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "./env";
import { writeProviderApiLog } from "./provider-api-log";

const paymentApi = axios.create({
  baseURL: env.paymentApiUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.paymentApiKey}`,
  },
  validateStatus: (status) => status < 500,
});

export type PaymentNotification = {
  referenceId: string;
  providerReference?: string;
  status: "PAID" | "PENDING" | "EXPIRED" | "FAILED";
};

type PaymentProviderResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

type PaymentProviderTransaction = {
  reference: string;
  merchant_ref: string;
  payment_method?: string;
  payment_name?: string;
  checkout_url?: string;
  qr_url?: string | null;
  pay_url?: string | null;
  status?: string;
  expired_time?: number;
};

export async function createQrisPayment(params: {
  referenceId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}) {
  if (!isPaymentConfigured()) {
    return {
      success: false,
      error: "Sistem pembayaran belum dikonfigurasi.",
    };
  }

  const endpoint = "/transaction/create";
  const startedAt = Date.now();
  const amount = Math.round(params.amount);
  const expiredTime = Math.floor(Date.now() / 1000) + 60 * 60;
  const payload = {
    method: env.paymentMethod,
    merchant_ref: params.referenceId,
    amount,
    customer_name: params.customerName,
    customer_email: params.customerEmail,
    customer_phone: params.customerPhone,
    order_items: params.items.map((item) => ({
      sku: item.name.slice(0, 32),
      name: item.name.slice(0, 50),
      price: Math.round(item.price),
      quantity: item.quantity,
    })),
    callback_url: `${env.appUrl}/api/callback`,
    return_url: `${env.appUrl}/status/${params.referenceId}`,
    expired_time: expiredTime,
    signature: createTransactionSignature(params.referenceId, amount),
  };

  try {
    const response = await paymentApi.post<PaymentProviderResponse<PaymentProviderTransaction>>(endpoint, payload);
    const success = response.status >= 200 && response.status < 300 && response.data.success && response.data.data;
    await writeProviderApiLog({
      provider: "payment_provider",
      referenceId: params.referenceId,
      method: "POST",
      endpoint,
      requestPayload: redactPaymentPayload(payload),
      responsePayload: response.data,
      statusCode: response.status,
      success: Boolean(success),
      error: success ? undefined : response.data.message || "Payment request failed",
      durationMs: Date.now() - startedAt,
    });

    if (!success || !response.data.data) {
      return {
        success: false,
        error: response.data.message || "Gagal membuat pembayaran",
      };
    }

    return {
      success: true,
      data: {
        ...response.data.data,
        reference: response.data.data.reference,
        merchant_ref: response.data.data.merchant_ref,
        checkout_url: response.data.data.checkout_url || response.data.data.pay_url || response.data.data.qr_url,
      },
    };
  } catch (error: unknown) {
    await writeProviderApiLog({
      provider: "payment_provider",
      referenceId: params.referenceId,
      method: "POST",
      endpoint,
      requestPayload: redactPaymentPayload(payload),
      responsePayload: getAxiosResponseData(error),
      statusCode: getAxiosStatus(error),
      success: false,
      error: getErrorMessage(error),
      durationMs: Date.now() - startedAt,
    });
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}

export function verifyPaymentCallback(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const expectedSignature = createCallbackSignature(rawBody);
  try {
    const actual = Buffer.from(signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function parsePaymentNotification(rawBody: string): PaymentNotification | null {
  const body = parseNotificationBody(rawBody);
  if (!body?.merchant_ref || !body.status) return null;
  return {
    referenceId: body.merchant_ref,
    providerReference: body.reference,
    status: normalizePaymentProviderStatus(body.status),
  };
}

export async function checkPaymentStatus(providerReference: string) {
  if (!isPaymentConfigured()) {
    return {
      success: false,
      error: "Sistem pembayaran belum dikonfigurasi.",
    };
  }

  const endpoint = "/transaction/check-status";
  const startedAt = Date.now();
  try {
    const response = await paymentApi.get<PaymentProviderResponse<PaymentProviderTransaction>>(endpoint, {
      params: { reference: providerReference },
    });
    const success = response.status >= 200 && response.status < 300 && response.data.success;
    await writeProviderApiLog({
      provider: "payment_provider",
      referenceId: providerReference,
      method: "GET",
      endpoint,
      requestPayload: { reference: providerReference },
      responsePayload: response.data,
      statusCode: response.status,
      success,
      error: success ? undefined : response.data.message || "Payment status check failed",
      durationMs: Date.now() - startedAt,
    });
    return success
      ? { success: true, data: response.data.data ?? response.data }
      : { success: false, error: response.data.message || "Gagal mengecek status pembayaran" };
  } catch (error: unknown) {
    await writeProviderApiLog({
      provider: "payment_provider",
      referenceId: providerReference,
      method: "GET",
      endpoint,
      requestPayload: { reference: providerReference },
      responsePayload: getAxiosResponseData(error),
      statusCode: getAxiosStatus(error),
      success: false,
      error: getErrorMessage(error),
      durationMs: Date.now() - startedAt,
    });
    return {
      success: false,
      error: getErrorMessage(error),
    };
  }
}

function createTransactionSignature(referenceId: string, amount: number) {
  return createHmac("sha256", env.paymentSecretKey)
    .update(`${env.paymentMerchantId}${referenceId}${amount}`)
    .digest("hex");
}

function createCallbackSignature(rawBody: string) {
  return createHmac("sha256", env.paymentSecretKey).update(rawBody).digest("hex");
}

function parseNotificationBody(rawBody: string) {
  try {
    return JSON.parse(rawBody) as {
      reference?: string;
      merchant_ref?: string;
      status?: string;
    };
  } catch {
    return null;
  }
}

function normalizePaymentProviderStatus(status: string) {
  const value = status.toUpperCase();
  if (value === "PAID") return "PAID";
  if (value === "UNPAID") return "PENDING";
  if (value === "EXPIRED") return "EXPIRED";
  return "FAILED";
}

function isPaymentConfigured() {
  return Boolean(
    env.paymentApiUrl &&
    env.paymentMerchantId &&
    env.paymentApiKey &&
    env.paymentSecretKey &&
    env.paymentMethod
  );
}

function redactPaymentPayload<T extends Record<string, unknown>>(payload: T) {
  return {
    ...payload,
    signature: payload.signature ? "[REDACTED]" : payload.signature,
  };
}

function getAxiosStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status ?? null : null;
}

function getAxiosResponseData(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.data : undefined;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return data?.message || data?.error || error.message;
  }
  return error instanceof Error ? error.message : "Unknown error";
}
