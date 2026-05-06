import axios from "axios";
import http from "node:http";
import https from "node:https";
import { createHash } from "node:crypto";
import { env } from "./env";
import { writeProviderApiLog } from "./provider-api-log";

const topupApi = axios.create({
  baseURL: env.topupApiUrl,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  httpAgent: new http.Agent({ family: 4 }),
  httpsAgent: new https.Agent({ family: 4 }),
  timeout: 20_000,
  validateStatus: (status) => status < 500,
});

type TopupProviderResponse = {
  data?: {
    ref_id?: string;
    customer_no?: string;
    buyer_sku_code?: string;
    message?: string;
    status?: string;
    rc?: string;
    sn?: string;
    buyer_last_saldo?: number;
    price?: number;
    wa?: string;
    tele?: string;
  };
};

export async function placeTopupOrder(params: {
  providerCode: string;
  userIdGame: string;
  zoneId?: string;
  referenceId: string;
}) {
  const endpoint = "/transaction";
  const startedAt = Date.now();
  const payload = buildTransactionPayload(params);

  try {
    const response = await topupApi.post<TopupProviderResponse>(endpoint, payload);
    const success = isProviderSuccess(response.data);
    await writeProviderApiLog({
      provider: "topup_provider",
      referenceId: params.referenceId,
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(payload),
      responsePayload: response.data,
      statusCode: response.status,
      success,
      error: success ? undefined : getProviderMessage(response.data),
      durationMs: Date.now() - startedAt,
    });
    if (!success) {
      return {
        success: false,
        error: getProviderMessage(response.data),
        data: response.data,
      };
    }
    return {
      success: true,
      data: response.data,
    };
  } catch (error: unknown) {
    await writeProviderApiLog({
      provider: "topup_provider",
      referenceId: params.referenceId,
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(payload),
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

export async function checkTopupStatus(params: {
  providerCode: string;
  userIdGame: string;
  zoneId?: string;
  referenceId: string;
}) {
  return placeTopupOrder(params);
}

export async function getTopupProfile() {
  const endpoint = "/cek-saldo";
  const startedAt = Date.now();
  const payload = {
    cmd: "deposit",
    username: env.topupApiUsername,
    sign: createProfileSignature(),
  };

  try {
    const response = await topupApi.post(endpoint, payload);
    const success = response.status >= 200 && response.status < 300 && typeof response.data === "object" && response.data !== null;
    await writeProviderApiLog({
      provider: "topup_provider",
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(payload),
      responsePayload: response.data,
      statusCode: response.status,
      success,
      error: success ? undefined : getProviderMessage(response.data),
      durationMs: Date.now() - startedAt,
    });
    if (!success) {
      return {
        success: false,
        error: getProviderMessage(response.data),
        data: response.data,
      };
    }
    return { success: true, data: response.data };
  } catch (error: unknown) {
    await writeProviderApiLog({
      provider: "topup_provider",
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(payload),
      responsePayload: getAxiosResponseData(error),
      statusCode: getAxiosStatus(error),
      success: false,
      error: getErrorMessage(error),
      durationMs: Date.now() - startedAt,
    });
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getTopupServices() {
  const endpoint = "/price-list";
  const startedAt = Date.now();
  const payload = {
    cmd: "prepaid",
    username: env.topupApiUsername,
    sign: createPriceListSignature(),
  };

  try {
    const response = await topupApi.post(endpoint, payload);
    const success = response.status >= 200 && response.status < 300 && Array.isArray((response.data as { data?: unknown })?.data);
    await writeProviderApiLog({
      provider: "topup_provider",
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(payload),
      responsePayload: response.data,
      statusCode: response.status,
      success,
      error: success ? undefined : getProviderMessage(response.data),
      durationMs: Date.now() - startedAt,
    });
    if (!success) {
      return {
        success: false,
        error: getProviderMessage(response.data),
        data: response.data,
      };
    }
    return { success: true, data: response.data };
  } catch (error: unknown) {
    await writeProviderApiLog({
      provider: "topup_provider",
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(payload),
      responsePayload: getAxiosResponseData(error),
      statusCode: getAxiosStatus(error),
      success: false,
      error: getErrorMessage(error),
      durationMs: Date.now() - startedAt,
    });
    return { success: false, error: getErrorMessage(error) };
  }
}

export function buildCustomerNumber(params: { userIdGame: string; zoneId?: string }) {
  const userId = params.userIdGame.trim();
  const zoneId = params.zoneId?.trim();
  if (!zoneId) return userId;
  return `${userId}${env.topupZoneSeparator}${zoneId}`;
}

function buildTransactionPayload(params: {
  providerCode: string;
  userIdGame: string;
  zoneId?: string;
  referenceId: string;
}) {
  const payload: Record<string, unknown> = {
    username: env.topupApiUsername,
    buyer_sku_code: params.providerCode,
    customer_no: buildCustomerNumber(params),
    ref_id: params.referenceId,
    sign: createTransactionSignature(params.referenceId),
    max_price: env.topupUseBuyerPriceLimit ? env.topupPriceCeiling : undefined,
    cb_url: env.topupWebhookUrl || undefined,
  };
  if (env.topupUseTestingMode) {
    payload.testing = true;
  }
  return payload;
}

function createTransactionSignature(referenceId: string) {
  return createHash("md5")
    .update(`${env.topupApiUsername}${env.topupApiSecret}${referenceId}`)
    .digest("hex");
}

function createPriceListSignature() {
  return createHash("md5")
    .update(`${env.topupApiUsername}${env.topupApiSecret}pricelist`)
    .digest("hex");
}

function createProfileSignature() {
  return createHash("md5")
    .update(`${env.topupApiUsername}${env.topupApiSecret}depo`)
    .digest("hex");
}

function redactCredentials(payload: Record<string, unknown>) {
  return {
    ...payload,
    username: payload.username ? "[REDACTED]" : payload.username,
    sign: payload.sign ? "[REDACTED]" : payload.sign,
  };
}

function getAxiosStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status ?? null : null;
}

function getAxiosResponseData(error: unknown) {
  if (!axios.isAxiosError(error)) return undefined;
  return error.response?.data ?? {
    message: error.message,
    code: error.code,
    name: error.name,
  };
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return getProviderMessage(error.response?.data) || error.message || error.code || "Top-up provider request failed";
  }
  return error instanceof Error ? error.message : "Unknown error";
}

function isProviderSuccess(data: unknown) {
  if (typeof data !== "object" || data === null) return false;
  const root = data as { data?: { status?: unknown; rc?: unknown } };
  const status = typeof root.data?.status === "string" ? root.data.status.toLowerCase() : "";
  const rc = typeof root.data?.rc === "string" ? root.data.rc : "";
  if (status === "sukses" || status === "success") return true;
  if (status === "pending") return true;
  if (rc === "00" || rc === "03") return true;
  return false;
}

function getProviderMessage(data: unknown) {
  if (typeof data === "string") return data;
  if (typeof data !== "object" || data === null) return "";
  const root = data as {
    message?: unknown;
    error?: unknown;
    data?: { message?: unknown };
  };
  return typeof root.data?.message === "string"
    ? root.data.message
    : typeof root.message === "string"
      ? root.message
      : typeof root.error === "string"
        ? root.error
        : "";
}
