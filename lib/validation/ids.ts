import { z } from "zod";

export const uuidSchema = z.string().uuid();

export function parseUuid(value: unknown): string | null {
  const parsed = uuidSchema.safeParse(typeof value === "string" ? value.trim() : value);
  return parsed.success ? parsed.data : null;
}
