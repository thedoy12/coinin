import axios from "axios";
import { createHash, timingSafeEqual } from "crypto";
import { env } from "./env";
import { writeProviderApiLog } from "./provider-api-log";

const paymentApi = axios.create({
  baseURL: env.paymentApiUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(`${env.paymentSecretKey}:`).toString("base64")}`,
  },
});

const paymentStatusApi = axios.create({
  baseURL: getMidtransStatusApiUrl(env.paymentApiUrl),
  headers: {
    Accept: "application/json",
    Authorization: `Basic ${Buffer.from(`${env.paymentSecretKey}:`).toString("base64")}`,
  },
});

export type PaymentNotification = {
  referenceId: string;
  status: "PAID" | "PENDING" | "EXPIRED" | "FAILED";
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
  const endpoint = "/snap/v1/transactions";
  const startedAt = Date.now();
  const [firstName, ...lastNameParts] = params.customerName.trim().split(/\s+/);
  const payload = {
    transaction_details: {
      order_id: params.referenceId,
      gross_amount: params.amount,
    },
    customer_details: {
      first_name: firstName || params.customerName,
      last_name: lastNameParts.join(" ") || undefined,
      email: params.customerEmail,
      phone: params.customerPhone,
    },
    item_details: params.items.map((item) => ({
      id: item.name.slice(0, 50),
      name: item.name.slice(0, 50),
      price: item.price,
      quantity: item.quantity,
    })),
    enabled_payments: [
      "gopay",
      "shopeepay",
      "bca_va",
      "bni_va",
      "bri_va",
      "permata_va",
      "echannel",
      "other_va",
    ],
    callbacks: {
      finish: `${env.appUrl}/status/${params.referenceId}`,
    },
    expiry: {
      unit: "minutes",
      duration: 60,
    },
  };

  try {
    const response = await paymentApi.post(endpoint, payload);
    await writeProviderApiLog({
      provider: "midtrans",
      referenceId: params.referenceId,
      method: "POST",
      endpoint,
      requestPayload: payload,
      responsePayload: response.data,
      statusCode: response.status,
      success: true,
      durationMs: Date.now() - startedAt,
    });
    return {
      success: true,
      data: {
        ...response.data,
        reference: params.referenceId,
        checkout_url: response.data.redirect_url,
      },
    };
  } catch (error: unknown) {
    await writeProviderApiLog({
      provider: "midtrans",
      referenceId: params.referenceId,
      method: "POST",
      endpoint,
      requestPayload: payload,
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
  const body = parseNotificationBody(rawBody);
  if (!body?.order_id || !body.status_code || !body.gross_amount) return false;

  const expectedSignature = createHash("sha512")
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${env.paymentSecretKey}`)
    .digest("hex");
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
  if (!body?.order_id || !body.transaction_status) return null;
  return {
    referenceId: body.order_id,
    status: normalizeMidtransStatus(body.transaction_status, body.fraud_status),
  };
}

export async function checkPaymentStatus(referenceId: string) {
  const endpoint = `/v2/${encodeURIComponent(referenceId)}/status`;
  const startedAt = Date.now();
  try {
    const response = await paymentStatusApi.get(endpoint);
    await writeProviderApiLog({
      provider: "midtrans",
      referenceId,
      method: "GET",
      endpoint,
      requestPayload: { order_id: referenceId },
      responsePayload: response.data,
      statusCode: response.status,
      success: true,
      durationMs: Date.now() - startedAt,
    });
    return {
      success: true,
      data: response.data,
    };
  } catch (error: unknown) {
    await writeProviderApiLog({
      provider: "midtrans",
      referenceId,
      method: "GET",
      endpoint,
      requestPayload: { order_id: referenceId },
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

function getMidtransStatusApiUrl(snapApiUrl: string) {
  if (snapApiUrl.includes("app.sandbox.midtrans.com")) {
    return "https://api.sandbox.midtrans.com";
  }
  if (snapApiUrl.includes("app.midtrans.com")) {
    return "https://api.midtrans.com";
  }
  return snapApiUrl;
}

function parseNotificationBody(rawBody: string) {
  try {
    return JSON.parse(rawBody) as {
      order_id?: string;
      transaction_status?: string;
      fraud_status?: string;
      status_code?: string;
      gross_amount?: string;
    };
  } catch {
    return null;
  }
}

function normalizeMidtransStatus(transactionStatus: string, fraudStatus?: string) {
  const status = transactionStatus.toLowerCase();
  const fraud = fraudStatus?.toLowerCase();
  if (status === "settlement" || (status === "capture" && fraud === "accept")) {
    return "PAID";
  }
  if (status === "pending") return "PENDING";
  if (status === "expire") return "EXPIRED";
  return "FAILED";
}

function getAxiosStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status ?? null : null;
}

function getAxiosResponseData(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.data : undefined;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error_messages?: string[]; message?: string } | undefined;
    return data?.error_messages?.join(", ") || data?.message || error.message;
  }
  return error instanceof Error ? error.message : "Unknown error";
}
