import axios from "axios";
import { createHash } from "node:crypto";
import { env } from "./env";
import { writeProviderApiLog } from "./provider-api-log";

const topupApi = axios.create({
  baseURL: env.topupApiUrl,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
});

export async function placeTopupOrder(params: {
  providerCode: string;
  userIdGame: string;
  zoneId?: string;
  referenceId: string;
}) {
  const endpoint = "/order";
  const startedAt = Date.now();
  const payload = buildPayload({
    order_id: params.referenceId,
    service_id: params.providerCode,
    target_id: params.userIdGame,
    ...(params.zoneId ? { target_server: params.zoneId } : {}),
  });

  try {
    const response = await topupApi.post(endpoint, payload);
    await writeProviderApiLog({
      provider: "hatamarket",
      referenceId: params.referenceId,
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(Object.fromEntries(payload)),
      responsePayload: response.data,
      statusCode: response.status,
      success: isProviderSuccess(response.data),
      durationMs: Date.now() - startedAt,
    });
    if (!isProviderSuccess(response.data)) {
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
      provider: "hatamarket",
      referenceId: params.referenceId,
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(Object.fromEntries(payload)),
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

export async function checkTopupStatus(referenceId: string) {
  const endpoint = "/status";
  const startedAt = Date.now();
  const payload = buildPayload({ order_id: referenceId });

  try {
    const response = await topupApi.post(endpoint, payload);
    await writeProviderApiLog({
      provider: "hatamarket",
      referenceId,
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(Object.fromEntries(payload)),
      responsePayload: response.data,
      statusCode: response.status,
      success: isProviderSuccess(response.data),
      durationMs: Date.now() - startedAt,
    });
    if (!isProviderSuccess(response.data)) {
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
      provider: "hatamarket",
      referenceId,
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(Object.fromEntries(payload)),
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

export async function getTopupProfile() {
  const endpoint = "/profile";
  const startedAt = Date.now();
  const payload = buildPayload();

  try {
    const response = await topupApi.post(endpoint, payload);
    await writeProviderApiLog({
      provider: "hatamarket",
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(Object.fromEntries(payload)),
      responsePayload: response.data,
      statusCode: response.status,
      success: isProviderSuccess(response.data),
      durationMs: Date.now() - startedAt,
    });
    if (!isProviderSuccess(response.data)) {
      return {
        success: false,
        error: getProviderMessage(response.data),
        data: response.data,
      };
    }
    return { success: true, data: response.data };
  } catch (error: unknown) {
    await writeProviderApiLog({
      provider: "hatamarket",
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(Object.fromEntries(payload)),
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
  const endpoint = "/service";
  const startedAt = Date.now();
  const payload = buildPayload();

  try {
    const response = await topupApi.post(endpoint, payload);
    await writeProviderApiLog({
      provider: "hatamarket",
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(Object.fromEntries(payload)),
      responsePayload: response.data,
      statusCode: response.status,
      success: isProviderSuccess(response.data),
      durationMs: Date.now() - startedAt,
    });
    if (!isProviderSuccess(response.data)) {
      return {
        success: false,
        error: getProviderMessage(response.data),
        data: response.data,
      };
    }
    return { success: true, data: response.data };
  } catch (error: unknown) {
    await writeProviderApiLog({
      provider: "hatamarket",
      method: "POST",
      endpoint,
      requestPayload: redactCredentials(Object.fromEntries(payload)),
      responsePayload: getAxiosResponseData(error),
      statusCode: getAxiosStatus(error),
      success: false,
      error: getErrorMessage(error),
      durationMs: Date.now() - startedAt,
    });
    return { success: false, error: getErrorMessage(error) };
  }
}

function buildPayload(values: Record<string, string | undefined> = {}) {
  return new URLSearchParams({
    api_id: env.topupApiKey,
    api_key: env.topupApiSecret,
    signature: createSignature(),
    ...values,
  });
}

function createSignature() {
  return createHash("md5")
    .update(`${env.topupApiKey}${env.topupApiSecret}`)
    .digest("hex");
}

function redactCredentials(payload: Record<string, unknown>) {
  return {
    ...payload,
    api_key: payload.api_key ? "[REDACTED]" : payload.api_key,
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
    return getProviderMessage(error.response?.data) || error.message;
  }
  return error instanceof Error ? error.message : "Unknown error";
}

function isProviderSuccess(data: unknown) {
  if (typeof data !== "object" || data === null) return false;
  const root = data as { result?: unknown; status?: unknown };
  if (root.result !== undefined) return root.result !== false;
  if (root.status !== undefined) return root.status !== false;
  return true;
}

function getProviderMessage(data: unknown) {
  if (typeof data !== "object" || data === null) return "";
  const root = data as { msg?: unknown; message?: unknown };
  return typeof root.msg === "string"
    ? root.msg
    : typeof root.message === "string"
      ? root.message
      : "";
}
