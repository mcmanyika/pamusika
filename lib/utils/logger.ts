type LogLevel = "info" | "warn" | "error";

type LogFields = {
  operation: string;
  result?: string;
  durationMs?: number;
  correlationId?: string;
  externalMessageId?: string;
  userId?: string;
  error?: string;
  [key: string]: string | number | boolean | undefined;
};

const REDACTED_KEYS = [
  "access_token",
  "accesstoken",
  "authorization",
  "api_key",
  "apikey",
  "secret",
  "service_role",
  "password",
  "refresh_token",
];

function shouldRedact(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
  return REDACTED_KEYS.some((item) => normalized.includes(item.replace(/_/g, "")));
}

function sanitize(fields: LogFields): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }

    sanitized[key] = shouldRedact(key) ? "[redacted]" : value;
  }

  return sanitized;
}

function write(level: LogLevel, fields: LogFields) {
  const payload = {
    level,
    service: "paysell",
    ts: new Date().toISOString(),
    ...sanitize(fields),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export const logger = {
  info(fields: LogFields) {
    write("info", fields);
  },
  warn(fields: LogFields) {
    write("warn", fields);
  },
  error(fields: LogFields) {
    write("error", fields);
  },
};

export function createCorrelationId(): string {
  return crypto.randomUUID();
}
