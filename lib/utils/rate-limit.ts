type RateBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateBucket>();
const MAX_KEYS = 10_000;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  if (buckets.size > MAX_KEYS) {
    for (const [id, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(id);
      }
    }
    if (buckets.size > MAX_KEYS) {
      buckets.clear();
    }
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true };
}

export function clientIp(headersList: Headers): string {
  const forwarded = headersList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headersList.get("x-real-ip") || "unknown";
}

export function resetRateLimitForTests() {
  buckets.clear();
}
