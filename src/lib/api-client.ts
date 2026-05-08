export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.toLowerCase().includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const message =
      getPayloadMessage(payload) ||
      `Server API mengembalikan error ${response.status}.`;
    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Server API mengembalikan respons tidak valid.");
  }

  return payload as T;
}

function getPayloadMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  return typeof record.error === "string"
    ? record.error
    : typeof record.message === "string"
      ? record.message
      : "";
}
