import { providerApiLogs } from "../../db/schema";

export async function writeProviderApiLog(params: {
  provider: string;
  referenceId?: string | null;
  method: string;
  endpoint: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  statusCode?: number | null;
  success: boolean;
  error?: string | null;
  durationMs: number;
}) {
  const { getDb } = await import("../queries/connection");
  await getDb().insert(providerApiLogs).values({
    provider: params.provider,
    referenceId: params.referenceId ?? null,
    method: params.method,
    endpoint: params.endpoint,
    requestPayload: stringifyPayload(params.requestPayload),
    responsePayload: stringifyPayload(params.responsePayload),
    statusCode: params.statusCode ?? null,
    success: params.success ? 1 : 0,
    error: params.error ?? null,
    durationMs: params.durationMs,
  });
}

function stringifyPayload(value: unknown) {
  if (value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: "Payload tidak bisa di-serialize" });
  }
}
