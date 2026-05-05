import type { Context, Next } from "hono";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
let lastCleanupAt = 0;

export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}) {
  return async (c: Context, next: Next) => {
    const forwardedFor = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = forwardedFor || c.req.header("cf-connecting-ip") || "local";
    const key = `${options.keyPrefix ?? "rl"}:${ip}:${c.req.path}`;
    const now = Date.now();
    cleanupExpiredBuckets(now);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      await next();
      return;
    }

    current.count += 1;
    if (current.count > options.max) {
      return c.json({ error: "Too many requests" }, 429);
    }

    await next();
  };
}

function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanupAt < 60_000) return;
  lastCleanupAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
