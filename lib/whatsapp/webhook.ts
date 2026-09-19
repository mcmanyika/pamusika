import { createHmac, timingSafeEqual } from "crypto";

function digest(value: string): Buffer {
  return createHmac("sha256", "paysell-compare").update(value).digest();
}

export function safeStringEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) {
    return false;
  }

  const [scheme, hash] = signatureHeader.split("=");
  if (scheme !== "sha256" || !hash) {
    return false;
  }

  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function verifyWebhookSubscription(input: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  expectedToken: string;
}): { ok: true; challenge: string } | { ok: false } {
  if (
    input.mode === "subscribe" &&
    input.token &&
    input.challenge &&
    input.expectedToken &&
    safeStringEqual(input.token, input.expectedToken)
  ) {
    return { ok: true, challenge: input.challenge };
  }

  return { ok: false };
}
