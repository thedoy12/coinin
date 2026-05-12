import app from "../dist/boot.js";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

export default async function handler(req, res) {
  try {
    const request = await toFetchRequest(req);
    const response = await app.fetch(request);
    await sendFetchResponse(response, res);
  } catch (error) {
    console.error("Vercel API handler error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

async function toFetchRequest(req) {
  const method = req.method || "GET";
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, String(value));
    }
  }

  const url = new URL(req.url || "/", `https://${req.headers.host || "localhost"}`);
  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") {
    init.body = await readRequestBody(req);
  }
  return new Request(url, init);
}

async function readRequestBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody;
  if (Buffer.isBuffer(req.body) || typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return Buffer.from(JSON.stringify(req.body));

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function sendFetchResponse(response, res) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const setCookie = getSetCookieHeaders(response.headers);
  if (setCookie.length) {
    res.setHeader("set-cookie", setCookie);
  }

  if (!response.body) {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}
